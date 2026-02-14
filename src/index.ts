import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-monetary'
import { } from '@koishijs/plugin-server'
import { $ } from 'koishi'
import { Logger } from 'koishi'
import { Config } from './config';
import { logger_status } from './utils';

export * from './config';

export const name = 'plugin-http-monetary'

export const inject = ['monetary', 'server', 'logger', 'database']

export const usage = `
<hr>
<h2>浅浅的用http封装一下www（带鉴权版）</h2>
<hr>
`

const logger = new Logger('plugin-http-monetary')

export function apply(ctx: Context, config: Config) {
  const prefix = config.apiPrefix
  const apiKey = config.apiKey  // 从配置中读取 apiKey

  // 鉴权中间件函数：如果配置了 apiKey，则验证请求头
  const checkAuth = (koaCtx: any): boolean => {
    if (!apiKey) return true // 未配置 apiKey 则不启用鉴权
    const authHeader = koaCtx.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false
    }
    const token = authHeader.substring(7) // 去掉 'Bearer ' 前缀
    return token === apiKey
  }

  // 统一处理鉴权失败响应
  const handleUnauthorized = (koaCtx: any) => {
    koaCtx.status = 401
    koaCtx.body = { error: 'unauthorized' }
    logger_status(logger, config.loggerinfo)?.warn(`鉴权失败: IP=${koaCtx.ip} 路径=${koaCtx.path}`)
  }

  // 查询用户的所有货币余额
  ctx.server.get(prefix + '/currencies/:uid', async (koaCtx) => {
    if (!checkAuth(koaCtx)) {
      handleUnauthorized(koaCtx)
      return
    }


    const uid = parseInt(koaCtx.params.uid)
    if (isNaN(uid)) {
      koaCtx.status = 400
      koaCtx.body = { error: 'invalid uid' }
      return
    }

    try {
      const records = await ctx.database.get('monetary', { uid }, ['currency', 'value'])
      koaCtx.body = {
        uid,
        currencies: records.map(r => ({
          currency: r.currency,
          balance: r.value
        }))
      }
      logger_status(logger, config.loggerinfo)?.info(`查询用户货币成功: uid=${uid} count=${records.length}`)
    } catch (e) {
      koaCtx.status = 500
      koaCtx.body = { error: e.message }
      logger_status(logger, config.loggerinfo)?.error(`查询货币失败: ${e.message}`)
    }
  })
  // 查询 binding 信息
  ctx.server.get(prefix + '/binding/:pid', async (koaCtx) => {
    // 鉴权（沿用之前的 checkAuth）
    if (!checkAuth(koaCtx)) {
      handleUnauthorized(koaCtx)
      return
    }


    const pid = parseInt(koaCtx.params.pid) as number
    if (isNaN(pid)) {
      koaCtx.status = 400
      koaCtx.body = { error: 'invalid pid' }
      return
    }

    const platform = koaCtx.query.platform as string
    if (!platform) {
      koaCtx.status = 400
      koaCtx.body = { error: 'platform query parameter is required' }
      return
    }

    try {
      const [record] = await ctx.database.get('binding', {
        pid: String(pid),
        platform
      }, ['aid', 'bid'])

      if (!record) {
        koaCtx.status = 404
        koaCtx.body = { error: 'binding not found' }
        return
      }

      koaCtx.body = {
        pid,
        platform,
        aid: record.aid,
        bid: record.bid
      }
      logger_status(logger, config.loggerinfo)?.info(`查询 binding 成功: pid=${pid} platform=${platform}`)
    } catch (e) {
      koaCtx.status = 500
      koaCtx.body = { error: e.message }
      logger_status(logger, config.loggerinfo)?.error(`查询 binding 失败: ${e.message}`)
    }
  })

  ctx.server.get(prefix + '/balance/:uid', async (koaCtx) => {
    // 鉴权检查
    if (!checkAuth(koaCtx)) {
      handleUnauthorized(koaCtx)
      return
    }

    const uid = parseInt(koaCtx.params.uid)
    if (isNaN(uid)) {
      koaCtx.status = 400
      koaCtx.body = { error: 'invalid uid' }
      logger_status(logger, config.loggerinfo)?.warn(`参数错误: uid=${koaCtx.params.uid} IP=${koaCtx.ip}`)
      return
    }

    const currency = (koaCtx.query.currency as string) || 'default'

    try {
      const [data] = await ctx.database.get('monetary', { uid, currency }, ['value'])
      koaCtx.body = {
        uid,
        currency,
        balance: data?.value ?? 0,
      }
      logger_status(logger, config.loggerinfo)?.info(`查询余额成功: uid=${uid} currency=${currency} balance=${data?.value ?? 0}`)
    } catch (e) {
      koaCtx.status = 500
      koaCtx.body = { error: e.message }
      logger_status(logger, config.loggerinfo)?.error(`查询余额失败: uid=${uid} error=${e.message}`)
    }
  })

  ctx.server.post(prefix + '/gain', async (koaCtx) => {
    if (!checkAuth(koaCtx)) {
      handleUnauthorized(koaCtx)
      return
    }

    const { uid, amount, currency } = (koaCtx.request as any).body as any

    if (typeof uid !== 'number' || typeof amount !== 'number' || amount <= 0) {
      koaCtx.status = 400
      koaCtx.body = { error: 'invalid parameters: uid and amount must be positive numbers' }
      logger_status(logger, config.loggerinfo)?.warn(`增加点数参数错误: body=${JSON.stringify((koaCtx.request as any).body)} IP=${koaCtx.ip}`)
      return
    }

    try {
      await ctx.monetary.gain(uid, amount, currency || 'default')
      koaCtx.body = { success: true }
      logger_status(logger, config.loggerinfo)?.info(`增加点数成功: uid=${uid} amount=${amount} currency=${currency || 'default'}`)
    } catch (e) {
      koaCtx.status = 500
      koaCtx.body = { error: e.message }
      logger_status(logger, config.loggerinfo)?.error(`增加点数失败: uid=${uid} error=${e.message}`)
    }
  })

  ctx.server.post(prefix + '/cost', async (koaCtx) => {
    if (!checkAuth(koaCtx)) {
      handleUnauthorized(koaCtx)
      return
    }

    const koishiCtx = koaCtx.ctx
    const { uid, amount, currency } = (koaCtx.request as any).body as any

    if (typeof uid !== 'number' || typeof amount !== 'number' || amount <= 0) {
      koaCtx.status = 400
      koaCtx.body = { error: 'invalid parameters: uid and amount must be positive numbers' }
      logger_status(logger, config.loggerinfo)?.warn(`扣除点数参数错误: body=${JSON.stringify((koaCtx.request as any).body)} IP=${koaCtx.ip}`)
      return
    }

    try {
      await ctx.monetary.cost(uid, amount, currency || 'default')
      koaCtx.body = { success: true }
      logger_status(logger, config.loggerinfo)?.info(`扣除点数成功: uid=${uid} amount=${amount} currency=${currency || 'default'}`)
    } catch (e) {
      if (e.message === 'insufficient balance.') {
        koaCtx.status = 400
        koaCtx.body = { error: 'insufficient balance' }
        logger_status(logger, config.loggerinfo)?.warn(`扣除点数余额不足: uid=${uid} amount=${amount}`)
      } else {
        koaCtx.status = 500
        koaCtx.body = { error: e.message }
        logger_status(logger, config.loggerinfo)?.error(`扣除点数失败: uid=${uid} error=${e.message}`)
      }
    }
  })
  logger_status(logger, config.loggerinfo)?.info(`HTTP API 已挂载在 ${prefix}，鉴权状态：${apiKey ? '已启用' : '未启用'}`)
}