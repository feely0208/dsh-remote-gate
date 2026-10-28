# 深鲸远程访问加固（@deepwhale-cn/dsh-remote-gate）

服务暴露到网络前，扫一遍典型远程风险：监听 0.0.0.0、鉴权被关、CORS 通配、明文管理端口、默认口令、调试模式。

## 安装

```bash
dsh plugin --profile web add @deepwhale-cn/dsh-remote-gate
```

## 用法

```bash
dsh-remote-gate --root ./api            # 文本报告
dsh-remote-gate --root ./api --json     # CI 用（有命中退出码 1）
dsh-remote-gate --root ./api --html report.html
```

面板：侧栏「深鲸远程访问加固」→ 填目录 → 扫描 → 按级别列出命中与建议。

纯本地文本扫描，不联网、不执行目标代码。
