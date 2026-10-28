#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }
T=$(mktemp -d); mkdir -p "$T/app"
cat > "$T/app/server.js" <<'JS'
app.listen(8080, '0.0.0.0');
const auth = { skipAuth: true };
app.use(cors({ origin: '*' }));
const debug = true;
const password = 'admin';
const adminUrl = 'http://admin.example.com';
JS
cat > "$T/app/clean.js" <<'JS'
app.listen(8080, '127.0.0.1');
const auth = { required: true };
app.use(cors({ origin: 'https://app.example.com' }));
const debug = process.env.DEBUG === '1';
const password = process.env.ADMIN_PASSWORD;
JS
echo ""; echo "  深鲸远程访问加固 · 回归"
J=$(node bin/cli.mjs --root "$T/app" --json 2>&1)
cnt(){ echo "$J" | python3 -c "import json,sys;print(len([f for f in json.load(sys.stdin)['findings'] if f['ruleId']=='$1' and f['file']=='server.js']))" 2>/dev/null; }
[ "$(cnt RG-BIND-ALL)" -gt 0 ] && ok "检出 0.0.0.0 绑定" || bad "漏报 RG-BIND-ALL"
[ "$(cnt RG-AUTH-OFF)" -gt 0 ] && ok "检出鉴权关闭" || bad "漏报 RG-AUTH-OFF"
[ "$(cnt RG-CORS-ANY)" -gt 0 ] && ok "检出 CORS 通配" || bad "漏报 RG-CORS-ANY"
[ "$(cnt RG-DEBUG-ON)" -gt 0 ] && ok "检出调试模式" || bad "漏报 RG-DEBUG-ON"
[ "$(cnt RG-DEFAULT-PASS)" -gt 0 ] && ok "检出默认口令" || bad "漏报 RG-DEFAULT-PASS"
[ "$(cnt RG-ADMIN-PLAIN)" -gt 0 ] && ok "检出明文管理地址" || bad "漏报 RG-ADMIN-PLAIN"
C=$(echo "$J" | python3 -c "import json,sys;print(len([f for f in json.load(sys.stdin)['findings'] if f['file']=='clean.js']))" 2>/dev/null)
[ "${C:-1}" = "0" ] && ok "干净样本 0 误报" || bad "干净样本误报 $C"
node bin/cli.mjs --root "$T/app" >/dev/null 2>&1; [ $? -eq 1 ] && ok "有命中时退出码 1（便于 CI）" || bad "退出码不对"
echo "  ────────────────────────────────────────"; echo "  通过 $PASS · 失败 $FAIL"; rm -rf "$T"; [ "$FAIL" -eq 0 ]
