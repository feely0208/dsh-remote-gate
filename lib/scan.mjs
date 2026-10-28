/**
 * 深鲸远程访问加固扫描（remote-gate 内核）
 *
 * 目的：上线前检查「把服务暴露到网络」时的典型风险，给出可执行的加固建议。
 * 纯本地文本扫描，不联网、不执行目标代码。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'coverage']);
const EXTS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.yml', '.yaml', '.json', '.toml', '.ini', '.conf', '.env', '.sh', '.ps1', '.md', '.txt', '.dockerfile', '.properties'];
const MAX_FILES = 4000;
const MAX_BYTES = 512 * 1024;

export const RULES = [
  {
    id: 'RG-BIND-ALL', title: '服务监听 0.0.0.0 / ::（对全网卡开放）', severity: 'high',
    advice: '监听地址改为 127.0.0.1，或放到反向代理/内网之后；确需公网时必须在前置层加鉴权与限流。',
    re: /(?:listen\s*\([^)\n]{0,80}?['"](?:0\.0\.0\.0|::)['"]|(?:bind|host|listen|address)[^\n]{0,30}?[:=]\s*['"]?(?:0\.0\.0\.0|::)(?:['"]|$))/gim,
  },
  {
    id: 'RG-AUTH-OFF', title: '鉴权被关闭或可被关闭', severity: 'high',
    advice: '移除 skipAuth / auth: false / DISABLE_AUTH 这类开关；鉴权只能由服务端强制，不能交给客户端或环境变量一键关掉。',
    re: /(?:skipAuth|no[_-]?auth|disable[_-]?auth|AUTH[_-]?DISABLED)\s*[:=]\s*(?:true|1)|\bauth\s*[:=]\s*(?:false|none|null)/gim,
  },
  {
    id: 'RG-CORS-ANY', title: 'CORS 允许任意来源并带凭据', severity: 'medium',
    advice: '限制 Access-Control-Allow-Origin 为白名单；带凭据（credentials）时禁止使用 *。',
    re: /Access-Control-Allow-Origin['"]?\s*[:=]\s*['"]\*['"]|\bcors\s*[:=]\s*['"]\*['"]|\borigin\s*:\s*(?:true|['"]\*['"])/gim,
  },
  {
    id: 'RG-ADMIN-PLAIN', title: '管理/调试端口暴露在明文 HTTP', severity: 'high',
    advice: '管理端口只走内网或 HTTPS；至少加 IP 白名单 + 独立强口令，并关闭默认路由。',
    re: /(?:admin|management|dashboard|debug)[^\n]{0,40}?https?:\/\/[^\s'"]+/gim,
  },
  {
    id: 'RG-DEBUG-ON', title: '生产代码里调试模式/开发环境默认开启', severity: 'medium',
    advice: '调试开关必须默认关闭，由显式环境变量开启，并在启动日志里打印最终生效值，避免线上误开。',
    re: /(?:debug|DEBUG)\s*[:=]\s*(?:true|1)|NODE_ENV\s*[:=]\s*['"]?development|FLASK_DEBUG\s*[:=]\s*(?:1|true)/gim,
  },
  {
    id: 'RG-DEFAULT-PASS', title: '默认口令 / 弱口令出现在配置里', severity: 'high',
    advice: '删除默认口令，首次启动强制设置；口令加盐哈希存储，禁止明文写进配置或镜像。',
    re: /(?:password|passwd|pwd|secret)\s*[:=]\s*['"]?(?:admin|123456|password|changeme|root)['"]?/gim,
  },
];

function walk(root, out) {
  let n = 0;
  const go = (dir) => {
    if (out.length >= MAX_FILES) return;
    let entries = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const p = join(dir, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { if (!SKIP.has(name)) go(p); continue; }
      if (!st.isFile() || st.size > MAX_BYTES) continue;
      const lower = name.toLowerCase();
      if (EXTS.some((e) => lower.endsWith(e))) out.push(p);
      if (++n > MAX_FILES) return;
    }
  };
  go(root);
}

export function scan(root) {
  const files = [];
  walk(root, files);
  const findings = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text)) !== null) {
        const line = text.slice(0, m.index).split('\n').length;
        findings.push({
          ruleId: rule.id, title: rule.title, severity: rule.severity, advice: rule.advice,
          file: relative(root, f).split(sep).join('/'), line,
          evidence: m[0].replace(/\s+/g, ' ').slice(0, 120),
        });
        if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
        if (findings.length >= 500) break;
      }
      if (findings.length >= 500) break;
    }
    if (findings.length >= 500) break;
  }
  const bySev = { high: 0, medium: 0, low: 0 };
  for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;
  return { ok: true, root, scannedFiles: files.length, findings, summary: bySev };
}
