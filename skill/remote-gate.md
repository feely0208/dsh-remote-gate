# 深鲸远程访问加固（dsh-remote-gate）

**什么时候用**：服务/面板要暴露到网络前，或做上线前安全自查。用户会说「上线前检查一下暴露面」「有没有把 0.0.0.0 开出去」「CORS 是不是太宽」。

## 怎么用

```bash
<cli 路径> --root <目录>            # 文本扫描
<cli 路径> --root <目录> --json     # 机器可读（命中即退出码 1）
<cli 路径> --root <目录> --html report.html
```

## 检查项

| 规则 | 查什么 |
|---|---|
| RG-BIND-ALL | 监听 0.0.0.0 / ::（对全网卡开放） |
| RG-AUTH-OFF | skipAuth / auth:false / DISABLE_AUTH |
| RG-CORS-ANY | Allow-Origin * 或 origin: '*'（尤其带凭据） |
| RG-ADMIN-PLAIN | 管理/调试端口走明文 http |
| RG-DEBUG-ON | 生产默认开 debug / development |
| RG-DEFAULT-PASS | password/secret 为 admin、123456 等默认值 |

## 规则

- 纯本地文本扫描，不联网、不执行目标代码；
- 建议只是加固方向，具体以部署环境为准（反向代理、WAF、内网 ACL 也算加固手段）。
