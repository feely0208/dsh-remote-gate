import { createPlugin, pkgRootFrom } from '@deepwhale-cn/dsh-guard-core/plugin';
import { registerRemoteGateApi } from './api.js';

const base = createPlugin({
  name: 'remote-gate',
  pkgRoot: pkgRootFrom(import.meta.url),
  skillFile: 'skill/remote-gate.md',
  binFile: 'bin/cli.mjs',
  description: '深鲸远程访问加固：上线前扫描监听地址、鉴权开关、CORS、默认口令等远程暴露风险',
  whenToUse: '当用户要把服务/面板暴露到网络、或做上线前安全自查时使用：扫描 bind 0.0.0.0、skipAuth、CORS *、默认口令、明文管理端口、调试开关，并给出加固建议。',
});
export const name = base.name;
export const inject = [...base.inject, 'webServer'];
export function apply(ctx) {
  base.apply(ctx);
  try { if (ctx.webServer?.register) registerRemoteGateApi(ctx); } catch (e) { ctx.logger?.warn?.('[remote-gate] 面板出口注册失败: ' + (e?.message || e)); }
}
