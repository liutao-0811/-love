const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get()

    if (userRes.data.length === 0) {
      const newUser = {
        _openid: openid,
        nickname: '',
        avatar: '',
        coupleId: null,
        points: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
      const addRes = await db.collection('users').add({ data: newUser })
      return { code: 0, data: { ...newUser, _id: addRes._id }, msg: '新用户创建成功' }
    }

    return { code: 0, data: userRes.data[0], msg: '登录成功' }
  } catch (err) {
    return { code: -1, data: null, msg: err.message || '登录失败' }
  }
}
