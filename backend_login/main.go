package main

import (
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/go-ldap/ldap/v3"
)

const systemCode = "ADOBE-Management"

var (
	errAuthNotReady       = errors.New("ยังไม่ได้ตั้งค่าบริการเข้าสู่ระบบ")
	errInvalidCredentials = errors.New("username หรือ password ไม่ถูกต้อง")
	errInvalidAction      = errors.New("invalid login action")
	errNoPermission       = errors.New("บัญชี AD นี้ไม่มีสิทธิ์เข้าใช้งานระบบ")
)

type authConfig struct {
	mngLoginDSN string
	ldapURL     string
	ldapDomain  string
	baseDN      string
	bindPattern string
	userInfoAPI string
	allowedCORS string
	startTLS    bool
	insecureTLS bool
	tlsMin      uint16
	tlsMax      uint16
	timeout     time.Duration
}

type app struct {
	auth       authConfig
	mngLoginDB *sql.DB
}

type loginRequest struct {
	Username   string `json:"username"`
	SystemCode string `json:"SystemCode"`
	Password   string `json:"password"`
	Action     string `json:"action"`
}

type loginResponse struct {
	Success     bool   `json:"success"`
	Username    string `json:"username,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	Role        string `json:"role,omitempty"`
	Error       string `json:"error,omitempty"`
	Message     string `json:"message,omitempty"`
}

type logoutRequest struct {
	Username string `json:"username"`
}

type userInfoResponse struct {
	Success     bool   `json:"success"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

func main() {
	loadEnvFiles(".env", ".env.local")

	cfg := loadAuthConfig()
	var mngLoginDB *sql.DB
	if cfg.mngLoginDSN != "" {
		db, err := sql.Open("sqlserver", cfg.mngLoginDSN)
		if err != nil {
			log.Fatalf("open MNG login database: %v", err)
		}
		db.SetConnMaxLifetime(30 * time.Minute)
		db.SetMaxIdleConns(5)
		db.SetMaxOpenConns(10)
		if err := db.Ping(); err != nil {
			log.Fatalf("connect MNG login database: %v", err)
		}
		mngLoginDB = db
	} else {
		log.Print("MNG login database is not configured; login endpoint will return service unavailable")
	}

	a := &app{
		auth:       cfg,
		mngLoginDB: mngLoginDB,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.withCORS(a.health))
	mux.HandleFunc("/api/login", a.withCORS(a.login))
	mux.HandleFunc("/api/logout", a.withCORS(a.logout))

	addr := ":" + getenv("PORT", "5205")
	log.Printf("Adobe login backend listening on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func loadAuthConfig() authConfig {
	timeoutSec, err := strconv.Atoi(getenv("AUTH_TIMEOUT_SEC", getenv("AD_LDAP_TIMEOUT_SEC", "5")))
	if err != nil || timeoutSec <= 0 {
		timeoutSec = 5
	}

	ldapURL := strings.TrimSpace(firstNonEmpty(os.Getenv("AD_LDAP_URL"), os.Getenv("AD1_SERVER")))
	baseDN := strings.TrimSpace(firstNonEmpty(os.Getenv("AD2_BASE_DN"), os.Getenv("AD1_ROOT_DN"), os.Getenv("AD1_BASE_DN")))
	ldapDomain := strings.TrimSpace(os.Getenv("AD_LDAP_DOMAIN"))
	if ldapDomain == "" {
		ldapDomain = suffixFromDN(baseDN)
	}

	return authConfig{
		mngLoginDSN: buildMNGLoginDSN(),
		ldapURL:     ldapURL,
		ldapDomain:  ldapDomain,
		baseDN:      baseDN,
		bindPattern: strings.TrimSpace(os.Getenv("AD_LDAP_BIND_PATTERN")),
		userInfoAPI: strings.TrimSpace(getenv("USERINFO_API_BASE", "http://10.0.32.71:23007/api/userinfo")),
		allowedCORS: strings.TrimSpace(getenv("ALLOWED_CORS_ORIGIN", "*")),
		startTLS:    boolEnv("AD_LDAP_START_TLS", false),
		insecureTLS: boolEnv("AD_LDAP_INSECURE_TLS", boolEnv("AD_TLS_INSECURE", false)),
		tlsMin:      tlsVersionEnv("AD_TLS_MIN_VERSION", tls.VersionTLS12),
		tlsMax:      tlsVersionEnv("AD_TLS_MAX_VERSION", 0),
		timeout:     time.Duration(timeoutSec) * time.Second,
	}
}

func buildMNGLoginDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("MNG_LOGIN_DSN")); dsn != "" {
		return dsn
	}

	password := strings.TrimSpace(os.Getenv("MNG_LOGIN_PASSWORD"))
	if password == "" {
		return ""
	}

	q := url.Values{}
	q.Set("database", getenv("MNG_LOGIN_DATABASE", "MNG_login"))
	q.Set("encrypt", getenv("MNG_LOGIN_ENCRYPT", "disable"))
	q.Set("TrustServerCertificate", getenv("MNG_LOGIN_TRUST_SERVER_CERTIFICATE", "true"))

	u := &url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(getenv("MNG_LOGIN_USER", "iot"), password),
		Host:     net.JoinHostPort(getenv("MNG_LOGIN_SERVER", "10.0.32.165"), getenv("MNG_LOGIN_PORT", "1433")),
		RawQuery: q.Encode(),
	}
	return u.String()
}

func (a *app) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := a.auth.allowedCORS
		if allowed == "*" {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
		} else if origin != "" && origin == allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var in logoutRequest
	_ = json.NewDecoder(r.Body).Decode(&in)
	writeJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"username": strings.TrimSpace(in.Username),
	})
}

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var in loginRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, loginResponse{Success: false, Error: "Invalid JSON data"})
		return
	}

	code := strings.TrimSpace(firstNonEmpty(in.SystemCode, systemCode))
	if !strings.EqualFold(code, systemCode) {
		writeJSON(w, http.StatusBadRequest, loginResponse{Success: false, Error: "Invalid system code"})
		return
	}

	var username string
	var displayName string
	var err error

	if strings.TrimSpace(in.Action) != "" {
		username, displayName, err = a.loginFromAction(r.Context(), in.Action)
	} else {
		username = normalizeADUsername(in.Username)
		if username == "" || strings.TrimSpace(in.Password) == "" {
			writeJSON(w, http.StatusUnauthorized, loginResponse{Success: false, Error: errInvalidCredentials.Error()})
			return
		}
		if len(username) > 50 {
			writeJSON(w, http.StatusBadRequest, loginResponse{Success: false, Error: "Username is too long"})
			return
		}

		displayName, err = a.authenticateAD(r.Context(), username, in.Password)
		if err == nil {
			err = a.checkLoginPermission(r.Context(), username)
		}
	}

	if err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, errInvalidAction):
			status = http.StatusBadRequest
		case errors.Is(err, errInvalidCredentials):
			status = http.StatusUnauthorized
		case errors.Is(err, errNoPermission):
			status = http.StatusForbidden
		case errors.Is(err, errAuthNotReady):
			status = http.StatusServiceUnavailable
		}
		writeJSON(w, status, loginResponse{Success: false, Error: err.Error()})
		return
	}

	if displayName == "" {
		displayName = username
	}

	writeJSON(w, http.StatusOK, loginResponse{
		Success:     true,
		Username:    username,
		DisplayName: displayName,
		Role:        "user",
		Message:     "Login successful",
	})
}

func (a *app) loginFromAction(ctx context.Context, encoded string) (string, string, error) {
	payload, err := decodeLoginAction(encoded)
	if err != nil {
		return "", "", errInvalidAction
	}

	username := normalizeADUsername(payload["username"])
	if username == "" || len(username) > 50 || !strings.EqualFold(payload["systemcode"], systemCode) || payload["active"] != "1" {
		return "", "", errInvalidAction
	}

	if err := a.checkLoginPermission(ctx, username); err != nil {
		return "", "", err
	}

	displayName := strings.TrimSpace(firstNonEmpty(
		a.lookupDisplayNameFromUserInfo(ctx, username),
		payload["displayname"],
		payload["display_name"],
		payload["name"],
		payload["fullname"],
		payload["full_name"],
		payload["cn"],
	))
	if displayName == "" {
		displayName = a.lookupDisplayNameByUsername(ctx, username)
	}
	return username, displayName, nil
}

func decodeLoginAction(encoded string) (map[string]string, error) {
	var data []byte
	var err error
	for _, decoder := range []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	} {
		data, err = decoder.DecodeString(strings.TrimSpace(encoded))
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, err
	}

	values := make(map[string]string)
	for _, item := range strings.Split(string(data), ",") {
		parts := strings.SplitN(item, ":", 2)
		if len(parts) != 2 {
			return nil, errInvalidAction
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		if key == "" {
			return nil, errInvalidAction
		}
		values[key] = strings.TrimSpace(parts[1])
	}
	return values, nil
}

func (a *app) authenticateAD(ctx context.Context, username, password string) (string, error) {
	if strings.TrimSpace(a.auth.ldapURL) == "" {
		return "", fmt.Errorf("%w: AD_LDAP_URL or AD1_SERVER is required", errAuthNotReady)
	}

	bindUser, err := a.bindUsername(username)
	if err != nil {
		return "", err
	}

	tlsConfig := a.ldapTLSConfig()
	conn, err := ldap.DialURL(
		a.auth.ldapURL,
		ldap.DialWithDialer(&net.Dialer{Timeout: a.auth.timeout}),
		ldap.DialWithTLSConfig(tlsConfig),
	)
	if err != nil {
		return "", fmt.Errorf("ไม่สามารถเชื่อมต่อ AD/LDAP ได้: %w", err)
	}
	defer conn.Close()

	if deadline, ok := ctx.Deadline(); ok {
		conn.SetTimeout(time.Until(deadline))
	} else {
		conn.SetTimeout(a.auth.timeout)
	}

	if a.auth.startTLS {
		if err := conn.StartTLS(tlsConfig); err != nil {
			return "", fmt.Errorf("ไม่สามารถเริ่ม LDAP StartTLS ได้: %w", err)
		}
	}

	if err := conn.Bind(bindUser, password); err != nil {
		var ldapErr *ldap.Error
		if errors.As(err, &ldapErr) && ldapErr.ResultCode == ldap.LDAPResultInvalidCredentials {
			return "", errInvalidCredentials
		}
		return "", fmt.Errorf("ตรวจสอบ AD/LDAP ไม่สำเร็จ: %w", err)
	}

	displayName := strings.TrimSpace(firstNonEmpty(
		a.lookupDisplayNameFromUserInfo(ctx, username),
		a.lookupDisplayName(conn, username),
	))
	if displayName == "" {
		displayName = username
	}
	return displayName, nil
}

func (a *app) checkLoginPermission(ctx context.Context, username string) error {
	if a.mngLoginDB == nil || strings.TrimSpace(a.auth.mngLoginDSN) == "" {
		return fmt.Errorf("%w: ต้องกำหนดค่า MNG login database ก่อนใช้งานระบบ login", errAuthNotReady)
	}

	var active bool
	err := a.mngLoginDB.QueryRowContext(ctx, `
SELECT Active
FROM dbo.SystemUserPermissions
WHERE Username = @p1
  AND SystemCode = @p2
  AND Active = 1`, username, systemCode).Scan(&active)
	if errors.Is(err, sql.ErrNoRows) {
		return errNoPermission
	}
	if err != nil {
		return err
	}
	if !active {
		return errNoPermission
	}
	return nil
}

func (a *app) lookupDisplayNameFromUserInfo(ctx context.Context, username string) string {
	baseURL := strings.TrimRight(strings.TrimSpace(a.auth.userInfoAPI), "/")
	if baseURL == "" {
		return ""
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/"+url.PathEscape(username), nil)
	if err != nil {
		return ""
	}

	client := &http.Client{Timeout: a.auth.timeout}
	res, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return ""
	}

	var payload userInfoResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return ""
	}
	if !payload.Success {
		return ""
	}
	return strings.TrimSpace(payload.DisplayName)
}

func (a *app) lookupDisplayNameByUsername(ctx context.Context, username string) string {
	if strings.TrimSpace(a.auth.ldapURL) == "" || strings.TrimSpace(a.auth.baseDN) == "" {
		return username
	}

	conn, err := ldap.DialURL(
		a.auth.ldapURL,
		ldap.DialWithDialer(&net.Dialer{Timeout: a.auth.timeout}),
		ldap.DialWithTLSConfig(a.ldapTLSConfig()),
	)
	if err != nil {
		return username
	}
	defer conn.Close()

	if deadline, ok := ctx.Deadline(); ok {
		conn.SetTimeout(time.Until(deadline))
	} else {
		conn.SetTimeout(a.auth.timeout)
	}

	if a.auth.startTLS {
		if err := conn.StartTLS(a.ldapTLSConfig()); err != nil {
			return username
		}
	}

	return a.lookupDisplayName(conn, username)
}

func (a *app) lookupDisplayName(conn *ldap.Conn, username string) string {
	if strings.TrimSpace(a.auth.baseDN) == "" {
		return username
	}

	search := ldap.NewSearchRequest(
		a.auth.baseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		1,
		int(a.auth.timeout.Seconds()),
		false,
		fmt.Sprintf("(sAMAccountName=%s)", ldap.EscapeFilter(username)),
		[]string{"displayName", "cn"},
		nil,
	)

	result, err := conn.Search(search)
	if err != nil || len(result.Entries) == 0 {
		return username
	}

	displayName := strings.TrimSpace(result.Entries[0].GetAttributeValue("displayName"))
	if displayName == "" {
		displayName = strings.TrimSpace(result.Entries[0].GetAttributeValue("cn"))
	}
	if displayName == "" {
		return username
	}
	return displayName
}

func (a *app) bindUsername(username string) (string, error) {
	username = normalizeADUsername(username)
	if username == "" {
		return "", errInvalidCredentials
	}

	if a.auth.bindPattern != "" {
		if !strings.Contains(a.auth.bindPattern, "%s") {
			return "", fmt.Errorf("%w: AD_LDAP_BIND_PATTERN must contain %%s", errAuthNotReady)
		}
		return fmt.Sprintf(a.auth.bindPattern, username), nil
	}

	if a.auth.ldapDomain == "" {
		return "", fmt.Errorf("%w: AD_LDAP_DOMAIN or AD_LDAP_BIND_PATTERN is required", errAuthNotReady)
	}

	return username + "@" + a.auth.ldapDomain, nil
}

func (a *app) ldapTLSConfig() *tls.Config {
	cfg := &tls.Config{
		MinVersion:         a.auth.tlsMin,
		MaxVersion:         a.auth.tlsMax,
		InsecureSkipVerify: a.auth.insecureTLS,
	}
	if parsed, err := url.Parse(a.auth.ldapURL); err == nil {
		cfg.ServerName = parsed.Hostname()
	}
	return cfg
}

func tlsVersionEnv(key string, fallback uint16) uint16 {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	switch value {
	case "", "default":
		return fallback
	case "1.0", "tls1.0", "tls10":
		return tls.VersionTLS10
	case "1.1", "tls1.1", "tls11":
		return tls.VersionTLS11
	case "1.2", "tls1.2", "tls12":
		return tls.VersionTLS12
	case "1.3", "tls1.3", "tls13":
		return tls.VersionTLS13
	default:
		return fallback
	}
}

func normalizeADUsername(value string) string {
	value = strings.TrimSpace(value)
	if strings.Contains(value, `\`) {
		parts := strings.Split(value, `\`)
		value = parts[len(parts)-1]
	}
	if at := strings.Index(value, "@"); at >= 0 {
		value = value[:at]
	}
	return strings.ToUpper(strings.TrimSpace(value))
}

func suffixFromDN(baseDN string) string {
	if strings.TrimSpace(baseDN) == "" {
		return ""
	}

	var parts []string
	for _, item := range strings.Split(baseDN, ",") {
		item = strings.TrimSpace(item)
		if len(item) >= 3 && strings.EqualFold(item[:3], "dc=") {
			parts = append(parts, strings.TrimSpace(item[3:]))
		}
	}
	return strings.Join(parts, ".")
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func boolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	switch value {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func loadEnvFiles(paths ...string) {
	for _, path := range paths {
		loadEnvFile(path)
	}
}

func loadEnvFile(path string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}

	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		value = strings.Trim(value, `"'`)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		_ = os.Setenv(key, value)
	}
}
