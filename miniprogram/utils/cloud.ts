let _db: any = null
let _cmd: any = null

export function initCloud() {
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    return
  }

  wx.cloud.init({
    traceUser: true,
  })

  _db = wx.cloud.database()
  _cmd = _db.command
}

export function getDb() {
  if (!_db) {
    throw new Error('请先调用 initCloud() 初始化云开发')
  }
  return _db
}

export function getCmd() {
  if (!_cmd) {
    throw new Error('请先调用 initCloud() 初始化云开发')
  }
  return _cmd
}

export async function callFunction<T = any>(name: string, data?: any): Promise<T> {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    return res.result as T
  } catch (err) {
    console.error(`[Cloud] ${name} failed:`, err)
    throw err
  }
}

interface ApiResult<T = any> {
  code: number
  data: T
  msg?: string
}

export async function api<T = any>(action: string, params?: Record<string, any>): Promise<ApiResult<T>> {
  const result = await callFunction<ApiResult<T>>('api', { action, ...params })
  if (result.code !== 0) {
    wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
  }
  return result
}
