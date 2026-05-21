// 公共模块 - 通用接口

/**
 * 获取用户 openid
 */
const getOpenId = async (event, ctx) => {
  const wxContext = ctx.cloud.getWXContext()
  const openid = wxContext.OPENID
  return { code: 0, data: { openid }, message: '' }
}

/**
 * 获取用户完整信息
 */
const getUserInfo = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { OPENID: targetOpenid } = event

  const openid = targetOpenid || OPENID
  let user = await db.collection('users').where({ _openid: openid }).get()

  if (!user.data || user.data.length === 0) {
    // 新用户自动创建
    const now = Date.now()
    await db.collection('users').add({
      data: {
        _openid: openid,
        current_role: 'customer',
        roles: ['customer'],
        nickname: '',
        avatar: '',
        phone: '',
        real_name: '',
        school_id: '',
        school_name: '',
        student_id: '',
        created_at: now,
        updated_at: now
      }
    })
    user = await db.collection('users').where({ _openid: openid }).get()
  }

  return { code: 0, data: user.data[0], message: '' }
}

/**
 * 更新用户信息
 */
const updateUserInfo = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { nickname, avatar, phone, real_name, school_id, school_name, student_id } = event

  const updateData = { updated_at: Date.now() }
  if (nickname !== undefined) updateData.nickname = nickname
  if (avatar !== undefined) updateData.avatar = avatar
  if (phone !== undefined) updateData.phone = phone
  if (real_name !== undefined) updateData.real_name = real_name
  if (school_id !== undefined) updateData.school_id = school_id
  if (school_name !== undefined) updateData.school_name = school_name
  if (student_id !== undefined) updateData.student_id = student_id

  await db.collection('users').where({ _openid: OPENID }).update({ data: updateData })

  return { code: 0, data: {}, message: '更新成功' }
}

/**
 * 切换当前角色
 */
const switchRole = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { role } = event

  // 检查用户是否拥有该角色
  const user = await db.collection('users').where({ _openid: OPENID }).get()
  if (!user.data || user.data.length === 0) {
    return { code: -1, data: {}, message: '用户不存在' }
  }

  if (!user.data[0].roles.includes(role)) {
    return { code: -1, data: {}, message: '用户无此角色权限' }
  }

  await db.collection('users').where({ _openid: OPENID }).update({
    data: { current_role: role, updated_at: Date.now() }
  })

  return { code: 0, data: { current_role: role }, message: '' }
}

/**
 * 获取学校列表
 */
const getSchoolList = async (event, ctx) => {
  const { db } = ctx

  const res = await db.collection('schools')
    .orderBy('name', 'asc')
    .limit(200)
    .get()

  return { code: 0, data: res.data, message: '' }
}

module.exports = {
  getOpenId,
  getUserInfo,
  updateUserInfo,
  switchRole,
  getSchoolList
}
