/** 深鲸远程访问加固 · 宿主出口 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { scan } from './scan.mjs';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTE = '/dsh-remote-gate';
const VERSION = (() => { try { return JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version || ''; } catch { return ''; } })();
const 回 = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(b) }); res.end(b); };
const 读体 = async (req) => { const c = []; for await (const x of req) c.push(x); const t = Buffer.concat(c).toString('utf8'); if (!t) return {}; try { return JSON.parse(t); } catch { return {}; } };

export function registerRemoteGateApi(ctx) {
  const handler = async (req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      if (u.pathname === `${ROUTE}/api/info`) return 回(res, 200, { ok: true, version: VERSION });
      if (u.pathname === `${ROUTE}/api/run` && req.method === 'POST') {
        const b = await 读体(req);
        const root = String(b.root || '').trim();
        if (!root) return 回(res, 400, { ok: false, error: '请填写要扫描的目录' });
        return 回(res, 200, scan(root));
      }
      return 回(res, 404, { ok: false, error: 'not found' });
    } catch (e) { return 回(res, 500, { ok: false, error: e?.message || String(e) }); }
  };
  ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler });
}
