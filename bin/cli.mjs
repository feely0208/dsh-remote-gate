#!/usr/bin/env node
/**
 * 深鲸远程访问加固扫描
 *   dsh-remote-gate --root <目录> [--json] [--html 报告.html]
 *   dsh-remote-gate --demo
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scan } from '../lib/scan.mjs';

const args = process.argv.slice(2);
const get = (n, d = '') => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const has = (n) => args.includes(n);

if (has('--demo') || !args.length) {
  const tmp = '/tmp/dwh-remote-gate-demo';
  const { mkdirSync } = await import('node:fs');
  mkdirSync(tmp, { recursive: true });
  writeFileSync(`${tmp}/server.js`, `const port = 8080;\napp.listen(port, '0.0.0.0');\nconst auth = { skipAuth: true };\napp.use(cors({ origin: '*' }));\nconst debug = true;\nconst password = 'admin';\n`);
  const r = scan(tmp);
  console.log(`扫描 ${r.scannedFiles} 个文件，命中 ${r.findings.length} 项（高危 ${r.summary.high} / 中危 ${r.summary.medium}）`);
  for (const f of r.findings) console.log(`- [${f.severity}] ${f.ruleId} ${f.file}:${f.line}  ${f.evidence}`);
  process.exit(0);
}

const root = resolve(get('--root', '.'));
const r = scan(root);
if (has('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(r.findings.length ? 1 : 0); }

if (has('--html')) {
  const rows = r.findings.map((f) => `<tr><td>${f.severity}</td><td>${f.ruleId}</td><td>${f.file}:${f.line}</td><td>${f.evidence.replace(/</g, '&lt;')}</td><td>${f.advice}</td></tr>`).join('\n');
  writeFileSync(get('--html'), `<!doctype html><meta charset="utf-8"><title>深鲸远程访问加固报告</title><h1>远程访问加固报告</h1><p>扫描 ${r.scannedFiles} 个文件，命中 ${r.findings.length} 项（高危 ${r.summary.high} / 中危 ${r.summary.medium}）</p><table border="1" cellpadding="6"><tr><th>级别</th><th>规则</th><th>位置</th><th>证据</th><th>建议</th></tr>${rows}</table>`);
  console.log(`报告已写入 ${get('--html')}`);
  process.exit(0);
}

console.log(`扫描 ${r.scannedFiles} 个文件，命中 ${r.findings.length} 项（高危 ${r.summary.high} / 中危 ${r.summary.medium}）`);
for (const f of r.findings) console.log(`- [${f.severity}] ${f.ruleId} ${f.file}:${f.line}\n    ${f.evidence}\n    → ${f.advice}`);
process.exit(r.findings.length ? 1 : 0);
