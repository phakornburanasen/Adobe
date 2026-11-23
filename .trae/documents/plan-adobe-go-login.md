# แผนปรับระบบ Login เป็น Go + AD/SQL Server Permission

## Summary
- ย้ายเฉพาะส่วน `login/logout` ออกจาก Flask (`backend/app.py`) ไปเป็น Go service ใหม่ใน `backend_login` ที่รันบนพอร์ต `5205`
- เปลี่ยนการยืนยันตัวตนจาก PostgreSQL `users_login` ไปเป็น:
  1. ตรวจ `username/password` กับ AD/LDAP โดยอ้างอิงวิธีจาก `C:\Dev\SSO_Check\backend\main.go`
  2. ตรวจสิทธิ์เข้าใช้งานระบบจาก SQL Server `MNG_login.dbo.SystemUserPermissions` ด้วย `SystemCode = 'ADOBE-Management'`
- เพิ่มการ login ผ่านลิงก์ `.../ADOBE/login?action=...` โดย decode token แล้วตรวจสิทธิ์ใน SQL Server ซ้ำก่อนอนุญาตเข้า
- navbar ทุกหน้าจะยังใช้ข้อมูล `user.display` ฝั่ง frontend เหมือนเดิม แต่จะเปลี่ยนแหล่งข้อมูลให้มาจาก `displayName` ของ API `http://10.0.32.71:23007/api/userinfo/{username}` ที่ Go service ดึงมาให้

## Current State Analysis

### โค้ดปัจจุบัน
- `frontend/src/App.jsx`
  - จัดการ auth state ทั้งหมดใน client (`isLoggedIn`, `user`, `o365_user`)
  - login ปัจจุบันยิง `POST ${API_BASE}/api/login`
  - logout ปัจจุบันยิง `POST ${API_BASE}/api/logout`
  - ยังไม่มี logic รองรับ `?action=...`
- `frontend/src/components/Login.jsx`
  - มีฟอร์ม username/password ปกติ
  - ส่ง `{ username, password, remember }` ผ่าน `onSubmit`
- `frontend/src/config.js`
  - มี `API_BASE` เพียงตัวเดียว ใช้ร่วมทั้งข้อมูลธุรกิจและ auth
- `backend/app.py`
  - `POST /api/login` ยังตรวจจากตาราง PostgreSQL `users_login`
  - `POST /api/logout` มีไว้ log logout
- `backend_login`
  - โฟลเดอร์มีอยู่แล้ว แต่ยังว่าง

### Reference implementation ที่พบ
- `C:\Dev\SSO_Check\backend\main.go`
  - มีตัวอย่างครบสำหรับ:
    - LDAP bind เพื่อตรวจ AD
    - SQL Server permission check ที่ `dbo.SystemUserPermissions`
    - decode `action` login
    - lookup `displayName` จาก `USERINFO_API_BASE`
  - logic สำคัญอยู่ช่วง:
    - `loadAuthConfig()` ประมาณบรรทัด 268-302
    - `login()` ประมาณบรรทัด 326-383
    - `loginFromAction()` / `decodeLoginAction()` / `authenticateAD()` / `checkLoginPermission()` ประมาณบรรทัด 1353-1627

## Assumptions & Decisions
- ใช้แนวทาง AD auth ตามโปรเจกต์อ้างอิง `C:\Dev\SSO_Check\backend`
- link login จะ `decode action` แล้ว `เช็กสิทธิ์ SQL Server ซ้ำ` ทุกครั้ง
- frontend จะยิง auth ไปที่ Go service ตรง `:5205`
- ระบบหลักอื่น ๆ (licenses, reports, settings, uploads ฯลฯ) ยังคงใช้ Flask/backend เดิมต่อไป
- ฝั่ง frontend จะยังเก็บ `user.display` ใน localStorage เหมือนเดิม เพื่อให้คอมโพเนนต์ navbar เดิมไม่ต้องแก้ทุกไฟล์
- Go service จะมี `POST /api/logout` แบบ lightweight เพื่อคงสัญญาเดิมกับ frontend (ไม่ต้องย้อนกลับไปพึ่ง Flask เฉพาะ logout)
- ค่าจริงของ AD/LDAP (เช่น `AD_LDAP_URL`, `AD_LDAP_DOMAIN`, `AD_LDAP_BIND_PATTERN`, `BASE_DN`) จะอ่านจาก environment/config ของเครื่อง deploy ไม่ hardcode ในโค้ด

## Proposed Changes

### 1. สร้าง Go auth service ใหม่ใน `backend_login`

#### Files
- `backend_login/go.mod`
- `backend_login/main.go`
- `backend_login/.env.example` หรือ `backend_login/README.md` สำหรับ config ที่ต้องใช้

#### What / Why / How
- สร้าง service ใหม่บนพอร์ต `5205`
- expose endpoint อย่างน้อย:
  - `GET /health`
  - `POST /api/login`
  - `POST /api/logout`
- request หลักของ `POST /api/login`

```json
{
  "username": "T9058",
  "SystemCode": "ADOBE-Management",
  "password": "AD password",
  "action": "optional-base64-token"
}
```

- response หลักให้คืนรูปแบบที่ frontend ใช้งานต่อได้ง่าย:

```json
{
  "success": true,
  "username": "T9058",
  "displayName": "Phakorn Buranasen",
  "role": "user"
}
```

- Flow แบบ password login:
  1. normalize username (รองรับ `DOMAIN\user`, `user@domain`)
  2. validate `SystemCode` ให้เป็น `ADOBE-Management`
  3. bind LDAP ด้วย username/password ตามแพทเทิร์นจาก reference
  4. ถ้า AD ผ่าน ให้ query SQL Server:

```sql
SELECT Active
FROM dbo.SystemUserPermissions
WHERE Username = @Username
  AND SystemCode = @SystemCode
  AND Active = 1;
```

  5. ถ้าผ่านสิทธิ์ ให้เรียก `http://10.0.32.71:23007/api/userinfo/{username}` แล้วใช้ `displayName`
  6. ถ้า userinfo ใช้ไม่ได้ ให้ fallback เป็นค่า username หรือค่าจาก LDAP search (`displayName`/`cn`) ตาม reference

- Flow แบบ link login (`action`):
  1. decode base64 รองรับ `StdEncoding` / `RawStdEncoding` / URL-safe ตาม reference
  2. parse ค่ารูป `key:value,key:value`
  3. บังคับเงื่อนไข:
     - `username` ต้องมีค่า
     - `SystemCode` ต้องเท่ากับ `ADOBE-Management`
     - `active` ใน token ต้องเป็น `1`
  4. query SQL Server ซ้ำด้วย username/system code
  5. ดึง `displayName` จาก userinfo API แล้วคืนผล login สำเร็จโดยไม่ต้องใช้ password

- Error mapping ที่ควรรักษา:
  - 400: รูปแบบ request/token ไม่ถูกต้อง
  - 401: username/password AD ไม่ถูกต้อง
  - 403: ไม่มีสิทธิ์เข้าใช้งานระบบ
  - 503: config AD/SQL Server ยังไม่ครบ
  - 500: system error อื่น

### 2. แยก auth base ออกจาก data API ใน frontend

#### Files
- `frontend/src/config.js`

#### What / Why / How
- ปัจจุบันมีแค่ `API_BASE` ตัวเดียว
- เพิ่ม `AUTH_API_BASE` แยกจาก `API_BASE`
  - `API_BASE` คงไว้สำหรับ Flask เดิม (`:5105`)
  - `AUTH_API_BASE` ใหม่สำหรับ Go login (`:5205`)
- เหตุผล: ผู้ใช้ต้องการย้ายเฉพาะ login ไป Go ส่วน API อื่นต้องเหมือนเดิม

### 3. ปรับ auth flow ฝั่ง React ให้ใช้ Go service

#### Files
- `frontend/src/App.jsx`

#### What / Why / How
- เปลี่ยน `handleLogin()` ให้ยิง `POST ${AUTH_API_BASE}/api/login`
- body ที่ส่งจาก password login:

```json
{
  "username": "<input>",
  "SystemCode": "ADOBE-Management",
  "password": "<input>"
}
```

- map response เป็น user object ใน localStorage แบบเข้ากับ UI เดิม:

```json
{
  "username": "T9058",
  "display": "<displayName จาก backend_login>",
  "role": "user",
  "remember": true
}
```

- เปลี่ยน `handleLogout()` ให้ยิง `POST ${AUTH_API_BASE}/api/logout` แบบ best-effort แล้ว clear localStorage เหมือนเดิม
- เพิ่ม effect รองรับ auto-login เมื่ออยู่ที่ route `/ADOBE/login?action=...`
  - ถ้ายังไม่ได้ login และมี query `action`
  - เรียก `POST ${AUTH_API_BASE}/api/login` ด้วย body:

```json
{
  "action": "<query action>",
  "SystemCode": "ADOBE-Management"
}
```

  - ถ้าสำเร็จ ให้ set session แล้ว redirect ไป `#Dashboard`
  - ถ้าล้มเหลว ให้คงอยู่หน้า login และแสดง error

### 4. ปรับหน้า Login ให้รองรับสถานะ auto-login จากลิงก์

#### Files
- `frontend/src/components/Login.jsx`

#### What / Why / How
- คงฟอร์มเดิมไว้สำหรับกรอก username/password
- เพิ่มความสามารถแสดง loading/error สำหรับกรณี auto-login จาก `action`
- ไม่ให้หน้า form พังเมื่อเข้ามาพร้อม `?action=...`
- ถ้า implementation เลือกให้ `App.jsx` เป็นผู้ยิง request อยู่แล้ว `Login.jsx` จะรับแค่ props เพิ่ม เช่น:
  - `externalError`
  - `externalLoading`

### 5. รักษาการแสดงชื่อบน navbar โดยไม่แก้หลายคอมโพเนนต์

#### Files
- `frontend/src/App.jsx`
- (คอมโพเนนต์ navbar เดิม เช่น `Dashboard.jsx`, `Homepage.jsx`, `Reports.jsx`, `ReportFileManager.jsx`, `Settings.jsx` จะไม่ต้องเปลี่ยน logic ถ้าเก็บ `user.display` เหมือนเดิม)

#### What / Why / How
- เพราะคอมโพเนนต์หลายหน้าปัจจุบันใช้ pattern เดียวกัน:
  - `user?.display || user?.username`
- ดังนั้นให้แปลง `displayName` จาก Go response ไปเก็บเป็น `display` ตอน set user ใน `App.jsx`
- วิธีนี้ลด scope ของการแก้ UI และทำให้ navbar ทุกหน้ารับผลพร้อมกัน

### 6. คง Flask backend เดิมไว้สำหรับ business API

#### Files
- `backend/app.py` (ไม่น่าต้องแก้ ถ้า frontend เลิกเรียก `/api/login` และ `/api/logout` ของ Flask)

#### What / Why / How
- ไม่แตะ endpoints ธุรกิจเดิม
- login เดิมใน Flask จะกลายเป็น legacy path ที่ไม่ได้ถูกเรียกจาก frontend แล้ว
- ถ้าต้องการ cleanup ภายหลังค่อยทำแยก ไม่รวมในงานนี้

## Verification Steps

### Backend_login
1. รัน Go service ที่ `backend_login` บนพอร์ต `5205`
2. ทดสอบ `GET /health` ต้องได้ 200
3. ทดสอบ password login:
   - AD ถูก + มีสิทธิ์ใน `SystemUserPermissions` => 200
   - AD ผิด => 401
   - AD ถูกแต่ไม่มีสิทธิ์ => 403
4. ทดสอบ link login:
   - token ถูก format + active=1 + มีสิทธิ์ SQL => 200
   - token format ผิด => 400
   - token ถูกแต่ไม่มีสิทธิ์ SQL => 403
5. ทดสอบ response ว่ามี `displayName` จาก userinfo API

### Frontend
1. login ปกติจากหน้า `/ADOBE/login` สำเร็จ
2. login ผ่านลิงก์ `/ADOBE/login?action=...` สำเร็จโดยไม่ต้องกรอกรหัสผ่าน
3. เมื่อ login สำเร็จ:
   - redirect ไป Dashboard
   - localStorage `o365_user` มี `username`, `display`, `role`
4. navbar ทุกหน้าขึ้นชื่อจาก `displayName` แทน username
5. logout แล้วย้อนกลับหน้า login ได้ตามเดิม

### Regression
1. หน้า Licenses / Reports / Price & Renew History / Renewal Summary / Settings ยังเรียก Flask API เดิมได้
2. การเปิดหน้าเดิมด้วย session ที่มีอยู่ใน localStorage ยังทำงานได้
3. build frontend ผ่าน
4. build Go service ผ่าน
