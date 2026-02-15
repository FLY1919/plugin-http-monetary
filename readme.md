> # Koishi HTTP Monetary 插件

[![npm](https://img.shields.io/npm/v/koishi-plugin-http-monetary?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-plugin-http-monetary)

✨ 给 Koishi 的 monetary 服务装上毛茸茸的 HTTP 小爪子～
主人可以通过 REST API 查询余额、增加/扣除点数、查看货币种类，还能获取全服货币发行总量。用暗号保护咱的小金库哦。

---

📦 安装

```bash
npm install koishi-plugin-plugin-http-monetary
# 或
yarn add koishi-plugin-plugin-http-monetary
```

🚨 需要一起玩耍的小伙伴：

· koishi-plugin-monetary —— 点数系统的家
· @koishijs/plugin-server —— 开门迎客的 HTTP 服务
· 数据库插件（如 @koishijs/plugin-database-sqlite）—— 存小钱钱的地方

---

⚙️ 配置项

参数 类型 默认值 说明
apiPrefix string '/monetary' API 路由前缀，不喜欢可以改喵
apiKey string '' 访问密钥，留空就是公开访问（慎用哦）
loggerinfo boolean false 调试模式，打开后咱会多说点话

配置示例（在 koishi.config.yml 里）：

```yaml
plugin-http-monetary:
  apiPrefix: '/money'          # 改成 /money 也认得
  apiKey: 'meow-secret-key'    # 只有知道暗号的人才能调用
  loggerinfo: true             # 想听咱碎碎念就打开吧
```

---

🆔 ID 说明

在 Koishi 中，用户身份有以下几种 ID，别搞混哦：

字段 名称 说明
pid 平台用户 ID 用户在具体平台上的原始 ID，比如 QQ 号、Discord ID（可能是数字或字符串）
platform 平台名 如 'onebot'、'qq'、'discord'
aid 内部用户 ID Koishi 内部统一分配的数字 ID，用于跨平台关联同一用户（即 monetary 表中的 uid）
uid 内部用户 ID 在 monetary 表中使用的字段，就是 aid，所有操作点数的接口都使用这个 ID

所以：

· 如果你只有 pid（比如 QQ 号）和 platform，需要先通过 /binding 接口查询对应的 aid（内部 ID）。
· 拿到 aid 后，就可以用它来调用所有点数相关接口（参数中叫 uid）。
· 如果你已经有了内部 aid，直接操作即可。

---

🛣️ API 路由

所有接口都返回 JSON。如果设置了 apiKey，请求头必须包含：

```
Authorization: Bearer <你的密钥>
```

---

🔗 根据平台信息查询内部 ID（aid）

```
GET /monetary/binding/:pid?platform=<平台>
```

路径参数

· pid：平台用户 ID（如 QQ 号），根据数据库类型可能是数字或字符串

查询参数

· platform：平台名称（如 onebot、qq、discord），必填

示例

```bash
curl "http://localhost:8080/monetary/binding/3568242357?platform=onebot"
```

成功响应

```json
{
  "pid": 3568242357,
  "platform": "onebot",
  "aid": 42,          // 内部 ID，用于后续操作
  "bid": "bot123"
}
```

错误响应

· 400：缺少参数或格式错误
· 401：未授权
· 404：绑定信息不存在
· 500：内部错误

---

🔍 查询余额（使用内部 ID）

```
GET /monetary/balance/:uid?currency=<币种>
```

路径参数

· uid：内部用户 ID（即上面返回的 aid，数字）

查询参数

· currency：币种，默认 'default'

示例

```bash
curl "http://localhost:8080/monetary/balance/42?currency=gold"
```

成功响应

```json
{
  "uid": 42,
  "currency": "gold",
  "balance": 100
}
```

---

🪙 查询用户所有货币种类（使用内部 ID）

```
GET /monetary/currencies/:uid
```

路径参数

· uid：内部用户 ID

示例

```bash
curl "http://localhost:8080/monetary/currencies/42"
```

成功响应

```json
{
  "uid": 42,
  "currencies": [
    { "currency": "default", "balance": 100 },
    { "currency": "gold", "balance": 50 }
  ]
}
```

---

📊 查询全服货币发行总量

```
GET /monetary/total-supply
```

说明
本接口会筛选出所有余额 大于 0 的货币记录，然后按货币种类汇总，返回每种货币的总发行量。余额为 0 的货币种类不会出现在结果中。

实现方式：先查询符合条件的记录，然后在内存中聚合计算（稳妥可靠，避免复杂的数据库聚合查询类型问题）。

示例

```bash
curl "http://localhost:8080/monetary/total-supply"
```

成功响应

```json
{
  "supplies": [
    { "currency": "default", "total": 12500 },
    { "currency": "gold", "total": 3450 },
    { "currency": "喵币", "total": 789 }
  ]
}
```

无数据时：{ "supplies": [] }

---

➕ 增加点数（使用内部 ID）

```
POST /monetary/gain
Content-Type: application/json

{
  "uid": 42,
  "amount": 50,
  "currency": "gold"   // 可选，默认为 default
}
```

示例

```bash
curl -X POST http://localhost:8080/monetary/gain \
  -H "Authorization: Bearer meow-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"uid": 42, "amount": 50}'
```

成功响应

```json
{ "success": true }
```

错误响应

· 400：参数无效（如 amount ≤ 0）
· 401：未授权
· 500：内部错误

---

➖ 扣除点数（使用内部 ID）

```
POST /monetary/cost
Content-Type: application/json

{
  "uid": 42,
  "amount": 30,
  "currency": "gold"
}
```

示例

```bash
curl -X POST http://localhost:8080/monetary/cost \
  -H "Authorization: Bearer meow-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"uid": 42, "amount": 30}'
```

成功响应

```json
{ "success": true }
```

余额不足时（HTTP 400）

```json
{ "error": "insufficient balance" }
```

其他错误

· 400：参数无效
· 401：未授权
· 500：内部错误

---

🐾 调试模式

将 loggerinfo 设为 true，咱就会在控制台里轻声细语地记录每次请求，帮主人揪出捣蛋鬼。

---

💌 来自猫娘的叮嘱

· 如果 apiKey 留空，任何人都能调用 API，请务必在安全网络下使用哦。
· 记得先让 @koishijs/plugin-server 起床，不然咱开不了门。
· 数据库表由 monetary 自动创建，但 binding 表需要你自己定义（如果要用绑定查询接口的话）。
· 绑定查询接口中的 pid 类型必须与数据库一致（数字或字符串），如果出现查询不到的情况，请检查类型是否匹配。
· 所有操作点数的接口都使用内部用户 ID（aid），不要直接用平台 ID。
· 全服发行总量接口只统计余额大于 0 的记录，余额为 0 的货币种类不会出现在结果中。

---

📄 许可证

Apache-2.0 — 想怎么玩就怎么玩，不过要是把咱弄哭了，可是要负责的哦 (,,•́ . •̀,,)