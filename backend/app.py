import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv("PGHOST", "10.0.32.71"),
        port=int(os.getenv("PGPORT", "5432")),
        user=os.getenv("PGUSER", "pguser"),
        password=os.getenv("PGPASSWORD", "pgpass123"),
        dbname=os.getenv("PGDATABASE", "postgres"),
    )
    return conn

app = Flask(__name__)
# ปรับ origins ตามที่คุณรัน frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

def get_client_ip(req: request) -> str:
    """Return best-effort client IP, considering proxy headers."""
    xff = req.headers.get('X-Forwarded-For', '')
    if xff:
        # X-Forwarded-For can be a comma-separated list. Take the first hop (original client)
        return xff.split(',')[0].strip()
    return req.headers.get('X-Real-IP') or req.remote_addr or 'unknown'

def log_auth_event(username: str, action: str, ip: str):
    """Insert a login/logout event into login_logs table.
    Table schema expected:
      id SERIAL PK,
      username VARCHAR NOT NULL,
      action   VARCHAR NOT NULL,  -- 'login' | 'logout'
      ip       VARCHAR NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO login_logs (username, action, ip)
                VALUES (%s, %s, %s)
                """,
                (username, action, ip),
            )
            conn.commit()
        conn.close()
    except Exception:
        # Do not fail the main request if logging fails.
        pass

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

@app.route("/api/db/health", methods=["GET"])
def db_health():
    """Quick DB connectivity check: returns 200 if SELECT 1 succeeds."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            row = cur.fetchone()
        conn.close()
        return jsonify({"db": "ok", "result": row[0]}), 200
    except Exception as e:
        # For troubleshooting, you may log e to console or a logger
        return jsonify({"db": "down", "error": str(e)}), 500

@app.route("/api/licenses", methods=["GET"])
def get_licenses():
    """Return license records from listLicense_adobe.
    Query params:
      - q: optional search text (matches several columns ILIKE)
      - limit: default 500
      - offset: default 0
    """
    q = request.args.get('q', '', type=str).strip()
    limit = request.args.get('limit', 500, type=int)
    offset = request.args.get('offset', 0, type=int)

    limit = max(1, min(limit, 5000))  # protect server
    offset = max(0, offset)

    # Joined view to include department and license names for DataTable
    base_sql = (
        "FROM listLicense_adobe l "
        "LEFT JOIN departments d ON l.depart_id = d.depart_id "
        "LEFT JOIN license_type_adobe t ON l.license_id = t.license_id"
    )
    select_cols = (
        "SELECT "
        " l.emp_id, "
        " l.name_email, "
        " t.license_name, "
        " l.full_name, "
        " l.disp_name, "
        " l.nick_name, "
        " d.depart_name, "
        " l.cost_center, "
        " l.depart_id, "
        " l.license_id "
    )
    where_sql = ""
    search_params = []

    if q:
        where_sql = (
            " WHERE "
            " l.emp_id::text ILIKE %s OR "
            " l.full_name ILIKE %s OR "
            " l.disp_name ILIKE %s OR "
            " l.name_email ILIKE %s OR "
            " d.depart_name ILIKE %s OR "
            " t.license_name ILIKE %s OR "
            " l.cost_center ILIKE %s OR "
            " l.nick_name ILIKE %s OR "
            " l.depart_id::text ILIKE %s OR "
            " l.license_id::text ILIKE %s"
        )
        pattern = f"%{q}%"
        search_params = [pattern] * 10

    order_paging_sql = " ORDER BY l.emp_id LIMIT %s OFFSET %s"
    params_rows = [*search_params, limit, offset]

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch page of rows
            cur.execute(select_cols + base_sql + where_sql + order_paging_sql, params_rows)
            rows = cur.fetchall()
            # Fetch total count under same filter
            cur.execute("SELECT COUNT(*) " + base_sql + where_sql, search_params)
            count_row = cur.fetchone()
            # count_row can be a dict (RealDictCursor) or tuple depending on cursor
            total = count_row.get("count") if isinstance(count_row, dict) else (count_row[0] if count_row else 0)
        conn.close()
        return jsonify({"items": rows, "total": int(total) if total is not None else len(rows)}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูลไลเซนส์ได้", "detail": str(e)}), 500

@app.route("/api/licenses/update", methods=["POST"])
def update_license():
    """Update a record in listLicense_adobe by emp_id.
    Expected JSON body keys:
      emp_id (required), full_name, disp_name, name_email, depart_id, cost_center, license_id, nick_name
    """
    data = request.get_json(silent=True) or {}
    emp_id = data.get('emp_id')
    if emp_id in (None, ""):
        return jsonify({"error": "ต้องระบุ emp_id"}), 400

    fields = [
        ('full_name', data.get('full_name')),
        ('disp_name', data.get('disp_name')),
        ('name_email', data.get('name_email')),
        ('depart_id', data.get('depart_id')),
        ('cost_center', data.get('cost_center')),
        ('license_id', data.get('license_id')),
        ('nick_name', data.get('nick_name')),
    ]
    # Build dynamic SET clause for only provided fields
    set_clauses = []
    params = []
    for col, val in fields:
        if val is not None:
            set_clauses.append(f"{col} = %s")
            params.append(val)

    if not set_clauses:
        return jsonify({"error": "ไม่มีข้อมูลสำหรับอัปเดต"}), 400

    params.append(emp_id)
    sql = f"UPDATE listLicense_adobe SET {', '.join(set_clauses)} WHERE emp_id = %s"

    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(sql, params)
            updated = cur.rowcount
            conn.commit()
        conn.close()

        if updated == 0:
            return jsonify({"error": "ไม่พบ emp_id ที่ต้องการอัปเดต"}), 404

        return jsonify({"message": "อัปเดตสำเร็จ", "updated": int(updated)}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถอัปเดตข้อมูลได้", "detail": str(e)}), 500

@app.route("/api/licenses/create", methods=["POST"])
def create_license():
    """Create a new record in listLicense_adobe.
    Expected JSON body keys:
      emp_id (required), name_email (required), full_name, disp_name, depart_id, cost_center, license_id, nick_name
    """
    data = request.get_json(silent=True) or {}
    emp_id = data.get('emp_id')
    name_email = data.get('name_email')
    if emp_id in (None, ""):
        return jsonify({"error": "ต้องระบุ emp_id"}), 400
    if name_email in (None, ""):
        return jsonify({"error": "ต้องระบุอีเมล"}), 400

    fields = []
    values = []
    params = []

    def add_field(col, val):
        if val is not None:
            fields.append(col)
            values.append('%s')
            params.append(val)

    add_field('emp_id', emp_id)
    add_field('name_email', name_email)
    add_field('full_name', data.get('full_name'))
    add_field('disp_name', data.get('disp_name'))
    add_field('depart_id', data.get('depart_id'))
    add_field('cost_center', data.get('cost_center'))
    add_field('license_id', data.get('license_id'))
    add_field('nick_name', data.get('nick_name'))

    if not fields:
        return jsonify({"error": "ไม่มีข้อมูลสำหรับบันทึก"}), 400

    sql = f"INSERT INTO listLicense_adobe ({', '.join(fields)}) VALUES ({', '.join(values)})"

    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
        conn.close()
        return jsonify({"message": "บันทึกสำเร็จ"}), 201
    except Exception as e:
        return jsonify({"error": "บันทึกไม่สำเร็จ", "detail": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"}), 400

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # หมายเหตุ: ตัวอย่างนี้เปรียบเทียบรหัสผ่านแบบ plain text
            # ในงานจริงควรเก็บและตรวจสอบรหัสผ่านแบบแฮช (เช่น bcrypt)
            cur.execute(
                """
                SELECT username, password, display, role
                FROM users_login
                WHERE UPPER(username) = UPPER(%s)
                LIMIT 1
                """,
                (username,),
            )
            row = cur.fetchone()

        conn.close()

        if not row or row["password"] != password:
            return jsonify({"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}), 401

        # Log successful login
        client_ip = get_client_ip(request)
        log_auth_event(row["username"], "login", client_ip)

        return jsonify({
            "username": row["username"],
            "display": row["display"],
            "role": row["role"],
        }), 200

    except Exception as e:
        # สำหรับ debug: สามารถพิมพ์ e ลง log ได้
        return jsonify({"error": "เกิดข้อผิดพลาดของระบบ"}), 500


@app.route("/api/departments", methods=["GET"])
def get_departments():
    """List departments with optional search and pagination.
    Backward compatible with prior `q` and `limit` params.

    Query params:
      - search or q: filter by depart_id or depart_name (ILIKE)
      - page: page number starting at 1 (default 1)
      - pageSize: items per page (default 1000 if limit provided or 50)
      - limit: legacy single-limit without paging
    """
    search = request.args.get('search', '', type=str).strip()
    if not search:
        search = request.args.get('q', '', type=str).strip()

    page = request.args.get('page', type=int)
    page_size = request.args.get('pageSize', type=int)
    legacy_limit = request.args.get('limit', type=int)

    where_sql = ""
    params = []
    if search:
        where_sql = " WHERE depart_id::text ILIKE %s OR depart_name ILIKE %s"
        pattern = f"%{search}%"
        params = [pattern, pattern]

    base_sql = "FROM departments"

    # Legacy mode: only limit, no total
    if page is None and page_size is None and legacy_limit is not None:
        limit = max(1, min(legacy_limit, 5000))
        sql = "SELECT depart_id, depart_name " + base_sql + where_sql + " ORDER BY depart_name LIMIT %s"
        params_l = [*params, limit]
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params_l)
                rows = cur.fetchall()
            conn.close()
            return jsonify({"items": rows}), 200
        except Exception as e:
            return jsonify({"error": "ไม่สามารถดึงข้อมูลแผนกได้", "detail": str(e)}), 500

    # Paged mode
    page = page or 1
    page_size = page_size or 50
    page = max(1, page)
    page_size = max(1, min(page_size, 500))
    offset = (page - 1) * page_size

    select_sql = "SELECT depart_id, depart_name " + base_sql + where_sql + " ORDER BY depart_name LIMIT %s OFFSET %s"
    params_rows = [*params, page_size, offset]

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(select_sql, params_rows)
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) " + base_sql + where_sql, params)
            count_row = cur.fetchone()
            total = count_row.get("count") if isinstance(count_row, dict) else (count_row[0] if count_row else 0)
        conn.close()
        return jsonify({"items": rows, "total": int(total), "page": page, "pageSize": page_size}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูลแผนกได้", "detail": str(e)}), 500


@app.route("/api/departments", methods=["POST"])
def create_department():
    data = request.get_json(silent=True) or {}
    depart_id = (str(data.get('depart_id') or '')).strip()
    depart_name = (data.get('depart_name') or '').strip()
    if not depart_id:
        return jsonify({"error": "ต้องระบุ depart_id"}), 400
    if not depart_name:
        return jsonify({"error": "ต้องระบุ depart_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO departments (depart_id, depart_name) VALUES (%s, %s)", (depart_id, depart_name))
            conn.commit()
        conn.close()
        return jsonify({"item": {"depart_id": depart_id, "depart_name": depart_name}}), 201
    except Exception as e:
        return jsonify({"error": "บันทึกไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/departments/<depart_id>", methods=["PUT"])
def update_department(depart_id):
    data = request.get_json(silent=True) or {}
    depart_name = (data.get('depart_name') or '').strip()
    if not depart_name:
        return jsonify({"error": "ต้องระบุ depart_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE departments SET depart_name = %s WHERE depart_id = %s", (depart_name, depart_id))
            updated = cur.rowcount
            conn.commit()
        conn.close()
        if updated == 0:
            return jsonify({"error": "ไม่พบแผนกที่ต้องการอัปเดต"}), 404
        return jsonify({"item": {"depart_id": depart_id, "depart_name": depart_name}}), 200
    except Exception as e:
        return jsonify({"error": "อัปเดตไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/departments/<depart_id>", methods=["DELETE"])
def delete_department(depart_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM departments WHERE depart_id = %s", (depart_id,))
            deleted = cur.rowcount
            conn.commit()
        conn.close()
        if deleted == 0:
            return jsonify({"error": "ไม่พบแผนกที่ต้องการลบ"}), 404
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": "ลบไม่สำเร็จ", "detail": str(e)}), 500


# Reports: Licenses with joins, optional department filter
@app.route("/api/reports/licenses", methods=["GET"])
def report_licenses():
    """Return license list from listLicense_adobe joined with departments and license_type_adobe.
    Optional filters:
      - depart_id: exact match
      - depart_name: ILIKE match
      - q: search across emp_id, name_email, full_name, disp_name, nick_name, cost_center
      - limit, offset
    """
    depart_id = request.args.get('depart_id', type=str)
    depart_name = request.args.get('depart_name', type=str)
    q = request.args.get('q', '', type=str).strip()
    limit = max(1, min(request.args.get('limit', 5000, type=int), 20000))
    offset = max(0, request.args.get('offset', 0, type=int))

    where = []
    params = []
    if depart_id:
        where.append("l.depart_id = %s")
        params.append(depart_id)
    if depart_name:
        where.append("d.depart_name ILIKE %s")
        params.append(f"%{depart_name}%")
    if q:
        pattern = f"%{q}%"
        where.append("(l.emp_id::text ILIKE %s OR l.name_email ILIKE %s OR l.full_name ILIKE %s OR l.disp_name ILIKE %s OR l.nick_name ILIKE %s OR l.cost_center ILIKE %s)")
        params.extend([pattern, pattern, pattern, pattern, pattern, pattern])

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    sql = (
        "SELECT l.emp_id, l.name_email, t.license_name, l.full_name, l.disp_name, l.nick_name, d.depart_name, l.cost_center "
        "FROM listLicense_adobe l "
        "LEFT JOIN departments d ON l.depart_id = d.depart_id "
        "LEFT JOIN license_type_adobe t ON l.license_id = t.license_id "
        + where_sql +
        " ORDER BY d.depart_name NULLS LAST, l.emp_id LIMIT %s OFFSET %s"
    )

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, [*params, limit, offset])
            rows = cur.fetchall()
        conn.close()
        return jsonify({"items": rows, "limit": limit, "offset": offset, "count": len(rows)}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูลรายงานได้", "detail": str(e)}), 500


@app.route("/api/costcenters", methods=["GET"])
def get_costcenters():
    """List cost centers with optional search and pagination."""
    search = request.args.get('search', '', type=str).strip()
    page = max(1, request.args.get('page', 1, type=int))
    page_size = max(1, min(request.args.get('pageSize', 50, type=int), 500))
    offset = (page - 1) * page_size

    where_sql = ""
    params = []
    if search:
        where_sql = " WHERE cost_id::text ILIKE %s OR cost_name ILIKE %s"
        pattern = f"%{search}%"
        params = [pattern, pattern]

    base_sql = "FROM costcenter"
    select_sql = "SELECT cost_id, cost_name " + base_sql + where_sql + " ORDER BY cost_name LIMIT %s OFFSET %s"
    params_rows = [*params, page_size, offset]

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(select_sql, params_rows)
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) " + base_sql + where_sql, params)
            count_row = cur.fetchone()
            total = count_row.get("count") if isinstance(count_row, dict) else (count_row[0] if count_row else 0)
        conn.close()
        return jsonify({"items": rows, "total": int(total), "page": page, "pageSize": page_size}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูล Cost Center ได้", "detail": str(e)}), 500


@app.route("/api/costcenters", methods=["POST"])
def create_costcenter():
    data = request.get_json(silent=True) or {}
    cost_id = (str(data.get('cost_id') or '')).strip()
    cost_name = (data.get('cost_name') or '').strip()
    if not cost_id:
        return jsonify({"error": "ต้องระบุ cost_id"}), 400
    if not cost_name:
        return jsonify({"error": "ต้องระบุ cost_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO costcenter (cost_id, cost_name) VALUES (%s, %s)", (cost_id, cost_name))
            conn.commit()
        conn.close()
        return jsonify({"item": {"cost_id": cost_id, "cost_name": cost_name}}), 201
    except Exception as e:
        return jsonify({"error": "บันทึกไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/costcenters/<cost_id>", methods=["PUT"])
def update_costcenter(cost_id):
    data = request.get_json(silent=True) or {}
    cost_name = (data.get('cost_name') or '').strip()
    if not cost_name:
        return jsonify({"error": "ต้องระบุ cost_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE costcenter SET cost_name = %s WHERE cost_id = %s", (cost_name, cost_id))
            updated = cur.rowcount
            conn.commit()
        conn.close()
        if updated == 0:
            return jsonify({"error": "ไม่พบ Cost Center ที่ต้องการอัปเดต"}), 404
        return jsonify({"item": {"cost_id": cost_id, "cost_name": cost_name}}), 200
    except Exception as e:
        return jsonify({"error": "อัปเดตไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/costcenters/<cost_id>", methods=["DELETE"])
def delete_costcenter(cost_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM costcenter WHERE cost_id = %s", (cost_id,))
            deleted = cur.rowcount
            conn.commit()
        conn.close()
        if deleted == 0:
            return jsonify({"error": "ไม่พบ Cost Center ที่ต้องการลบ"}), 404
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": "ลบไม่สำเร็จ", "detail": str(e)}), 500
@app.route("/api/users_login", methods=["GET"])
def list_users_login():
    """List users with search and pagination."""
    search = request.args.get('search', '', type=str).strip()
    page = max(1, request.args.get('page', 1, type=int))
    page_size = max(1, min(request.args.get('pageSize', 50, type=int), 500))
    offset = (page - 1) * page_size

    where_sql = ""
    params = []
    if search:
        where_sql = " WHERE username ILIKE %s OR display ILIKE %s OR role ILIKE %s"
        pattern = f"%{search}%"
        params = [pattern, pattern, pattern]

    base_sql = "FROM users_login"
    select_sql = "SELECT username, display, role " + base_sql + where_sql + " ORDER BY username LIMIT %s OFFSET %s"
    params_rows = [*params, page_size, offset]

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(select_sql, params_rows)
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) " + base_sql + where_sql, params)
            count_row = cur.fetchone()
            total = count_row.get("count") if isinstance(count_row, dict) else (count_row[0] if count_row else 0)
        conn.close()
        return jsonify({"items": rows, "total": int(total), "page": page, "pageSize": page_size}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูลผู้ใช้ได้", "detail": str(e)}), 500


@app.route("/api/users_login", methods=["POST"])
def create_user_login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    display = (data.get('display') or '').strip()
    role = (data.get('role') or 'viewer').strip()
    if not username:
        return jsonify({"error": "ต้องระบุ username"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"}), 400
    if not role:
        role = 'viewer'
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users_login (username, password, display, role) VALUES (%s, %s, %s, %s)",
                (username, password, display, role)
            )
            conn.commit()
        conn.close()
        return jsonify({"item": {"username": username, "display": display, "role": role}}), 201
    except Exception as e:
        return jsonify({"error": "บันทึกไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/users_login/<username>", methods=["PUT"])
def update_user_login(username):
    data = request.get_json(silent=True) or {}
    display = (data.get('display') or '').strip()
    role = (data.get('role') or '').strip()
    password = (data.get('password') or '').strip()

    if not display and not role and not password:
        return jsonify({"error": "ไม่มีข้อมูลสำหรับอัปเดต"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            set_parts = []
            params = []
            if display:
                set_parts.append("display = %s")
                params.append(display)
            if role:
                set_parts.append("role = %s")
                params.append(role)
            if password:
                set_parts.append("password = %s")
                params.append(password)
            params.append(username)
            sql = f"UPDATE users_login SET {', '.join(set_parts)} WHERE username = %s"
            cur.execute(sql, params)
            updated = cur.rowcount
            conn.commit()
        conn.close()
        if updated == 0:
            return jsonify({"error": "ไม่พบผู้ใช้ที่ต้องการอัปเดต"}), 404
        return jsonify({"item": {"username": username, "display": display or None, "role": role or None}}), 200
    except Exception as e:
        return jsonify({"error": "อัปเดตไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/users_login/<username>", methods=["DELETE"])
def delete_user_login(username):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users_login WHERE username = %s", (username,))
            deleted = cur.rowcount
            conn.commit()
        conn.close()
        if deleted == 0:
            return jsonify({"error": "ไม่พบผู้ใช้ที่ต้องการลบ"}), 404
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": "ลบไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/license_types", methods=["GET"])
def get_license_types():
    """List license types with optional search and pagination.
    Query params: search, page, pageSize
    """
    search = request.args.get('search', '', type=str).strip()
    page = max(1, request.args.get('page', 1, type=int))
    page_size = max(1, min(request.args.get('pageSize', 50, type=int), 500))
    offset = (page - 1) * page_size

    where_sql = ""
    params = []
    if search:
        where_sql = " WHERE license_id::text ILIKE %s OR license_name ILIKE %s"
        pattern = f"%{search}%"
        params = [pattern, pattern]

    base_sql = "FROM license_type_adobe"
    select_sql = "SELECT license_id, license_name " + base_sql + where_sql + " ORDER BY license_name LIMIT %s OFFSET %s"
    params_rows = [*params, page_size, offset]

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(select_sql, params_rows)
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) " + base_sql + where_sql, params)
            count_row = cur.fetchone()
            total = count_row.get("count") if isinstance(count_row, dict) else (count_row[0] if count_row else 0)
        conn.close()
        return jsonify({"items": rows, "total": int(total), "page": page, "pageSize": page_size}), 200
    except Exception as e:
        return jsonify({"error": "ไม่สามารถดึงข้อมูลประเภทไลเซนส์ได้", "detail": str(e)}), 500


@app.route("/api/license_types", methods=["POST"])
def create_license_type():
    data = request.get_json(silent=True) or {}
    license_id = (str(data.get('license_id') or '')).strip()
    license_name = (data.get('license_name') or '').strip()
    if not license_id:
        return jsonify({"error": "ต้องระบุ license_id"}), 400
    if not license_name:
        return jsonify({"error": "ต้องระบุ license_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO license_type_adobe (license_id, license_name) VALUES (%s, %s)", (license_id, license_name))
            conn.commit()
        conn.close()
        return jsonify({"item": {"license_id": license_id, "license_name": license_name}}), 201
    except Exception as e:
        return jsonify({"error": "บันทึกไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/license_types/<license_id>", methods=["PUT"])
def update_license_type(license_id):
    data = request.get_json(silent=True) or {}
    license_name = (data.get('license_name') or '').strip()
    if not license_name:
        return jsonify({"error": "ต้องระบุ license_name"}), 400
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE license_type_adobe SET license_name = %s WHERE license_id = %s", (license_name, license_id))
            updated = cur.rowcount
            conn.commit()
        conn.close()
        if updated == 0:
            return jsonify({"error": "ไม่พบประเภทไลเซนส์ที่ต้องการอัปเดต"}), 404
        return jsonify({"item": {"license_id": license_id, "license_name": license_name}}), 200
    except Exception as e:
        return jsonify({"error": "อัปเดตไม่สำเร็จ", "detail": str(e)}), 500


@app.route("/api/license_types/<license_id>", methods=["DELETE"])
def delete_license_type(license_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM license_type_adobe WHERE license_id = %s", (license_id,))
            deleted = cur.rowcount
            conn.commit()
        conn.close()
        if deleted == 0:
            return jsonify({"error": "ไม่พบประเภทไลเซนส์ที่ต้องการลบ"}), 404
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": "ลบไม่สำเร็จ", "detail": str(e)}), 500

@app.route("/api/licenses/delete", methods=["POST"])
def delete_license():
    """Delete a record from listLicense_adobe by emp_id and email.
    Expected JSON body keys:
    - emp_id: Employee ID (required)
    - email: Email address (required)
    """
    data = request.get_json(silent=True) or {}
    emp_id = (data.get("emp_id") or "").strip()
    email = (data.get("email") or "").strip()
    
    if not emp_id or not email:
        return jsonify({"error": "ต้องระบุรหัสพนักงานและอีเมล"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if record exists
        cursor.execute(
            "SELECT emp_id, name_email FROM listLicense_adobe WHERE emp_id = %s AND name_email = %s",
            (emp_id, email)
        )
        record = cursor.fetchone()
        
        if not record:
            return jsonify({"error": "ไม่พบข้อมูลที่ต้องการลบ"}), 404
            
        # Delete the record
        cursor.execute(
            "DELETE FROM listLicense_adobe WHERE emp_id = %s AND name_email = %s",
            (emp_id, email)
        )
        
        if cursor.rowcount == 0:
            return jsonify({"error": "ไม่สามารถลบข้อมูลได้"}), 500
            
        conn.commit()
        return jsonify({"message": "ลบข้อมูลเรียบร้อยแล้ว"}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": "ไม่สามารถลบข้อมูลได้", "detail": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route("/api/logout", methods=["POST"])
def logout():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()

    if not username:
        return jsonify({"error": "กรุณากรอกชื่อผู้ใช้"}), 400

    try:
        # Log logout event
        client_ip = get_client_ip(request)
        log_auth_event(username, "logout", client_ip)

        return jsonify({"message": "Logged out successfully"}), 200

    except Exception as e:
        # สำหรับ debug: สามารถพิมพ์ e ลง log ได้
        return jsonify({"error": "เกิดข้อผิดพลาดของระบบ"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5105"))
    app.run(host="0.0.0.0", port=port, debug=True)