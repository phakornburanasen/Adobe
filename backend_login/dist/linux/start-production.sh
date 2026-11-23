#!/usr/bin/env bash
set -euo pipefail
cd "$$\(dirname "$$0"^)
chmod +x "./backend_login" 2>/dev/null || true
exec "./backend_login"
