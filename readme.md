# 🐱 喵点通 · Koishi HTTP Monetary 插件

[![npm](https://img.shields.io/npm/v/koishi-plugin-plugin-http-monetary?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-plugin-http-monetary)

✨ **给 Koishi 的 monetary 服务加上萌萌的 HTTP 小爪子～**  
主人可以通过 REST API 查询余额、增加/扣除点数，还能用暗号保护咱的小金库哦。

---

## 📦 安装

```bash
npm install koishi-plugin-plugin-http-monetary
# 或
yarn add koishi-plugin-plugin-http-monetary
```

> 🚨 **需要一起玩耍的小伙伴**：
> - [`koishi-plugin-monetary`](https://www.npmjs.com/package/koishi-plugin-monetary) —— 点数系统的家
> - [`@koishijs/plugin-server`](https://www.npmjs.com/package/@koishijs/plugin-server) —— 开门迎客的 HTTP 服务

---

## ⚙️ 配置项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `apiPrefix` | `string` | `'/monetary'` | API 路由前缀，不喜欢可以改喵 |
| `apiKey` | `string` | `''` | 访问密钥，留空就是公开访问（慎用哦） |
| `loggerinfo` | `boolean` | `false` | 调试模式，打开后咱会多说点话 |

**配置示例**（在 `koishi.config.yml` 里）：
```yaml
plugin-http-monetary:
  apiPrefix: '/money'          # 改成 /money 也认得
  apiKey: 'meow-secret-key'    # 只有知道暗号的人才能调用
  loggerinfo: true             # 想听咱碎碎念就打开吧
```

---

## 🛣️ API 路由

所有接口都返回 JSON。如果设置了 `apiKey`，请求头必须包含：

```
Authorization: Bearer <你的密钥>
```

---

### 🔍 查询余额

```
GET /monetary/balance/:uid?currency=<币种>
```

**路径参数**  
- `uid`：用户 ID（数字）

**查询参数**  
- `currency`：币种，默认 `'default'`

**示例**  
```bash
curl "http://localhost:8080/monetary/balance/12345?currency=gold"
```

**成功响应**  
```json
{
  "uid": 12345,
  "currency": "gold",
  "balance": 100
}
```

**错误响应**  
- `400`：uid 格式不对  
- `401`：未授权（密钥错误或缺失）  
- `500`：服务器内部错误

---

### ➕ 增加点数

```
POST /monetary/gain
Content-Type: application/json

{
  "uid": 12345,
  "amount": 50,
  "currency": "gold"   // 可选，默认为 default
}
```

**示例**  
```bash
curl -X POST http://localhost:8080/monetary/gain \
  -H "Authorization: Bearer meow-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"uid": 12345, "amount": 50}'
```

**成功响应**  
```json
{ "success": true }
```

**错误响应**  
- `400`：参数无效（如 amount ≤ 0）  
- `401`：未授权  
- `500`：内部错误

---

### ➖ 扣除点数

```
POST /monetary/cost
Content-Type: application/json

{
  "uid": 12345,
  "amount": 30,
  "currency": "gold"
}
```

**示例**  
```bash
curl -X POST http://localhost:8080/monetary/cost \
  -H "Authorization: Bearer meow-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"uid": 12345, "amount": 30}'
```

**成功响应**  
```json
{ "success": true }
```

**余额不足时**（HTTP 400）  
```json
{ "error": "insufficient balance" }
```

**其他错误**  
- `400`：参数无效  
- `401`：未授权  
- `500`：内部错误

---

## 🐾 调试模式

将 `loggerinfo` 设为 `true`，咱就会在控制台里轻声细语地记录每次请求，帮主人揪出捣蛋鬼。

---

## 💌 来自猫娘的叮嘱

- 如果 `apiKey` 留空，任何人都能调用 API，请务必在安全网络下使用哦。
- 记得先让 `@koishijs/plugin-server` 起床，不然咱开不了门。
- 数据库表由 `monetary` 自动创建，咱只负责跑腿。

---

## 📄 许可证

Apache-2.0 — 想怎么玩就怎么玩，不过要是把咱弄哭了，可是要负责的哦 (,,•́ . •̀,,)