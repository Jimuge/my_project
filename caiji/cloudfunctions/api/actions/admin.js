// 管理后台模块

/**
 * 获取管理后台数据看板
 */
const getDashboard = async (event, ctx) => {
  const { db, _ } = ctx

  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  // 今日订单数
  const todayOrders = await db.collection('orders')
    .where({ created_at: _.gte(todayTs) })
    .count()

  // 总订单数
  const totalOrders = await db.collection('orders').count()

  // 进行中订单
  const activeOrders = await db.collection('orders')
    .where({
      status: _.in(['agent_pending', 'tailor_pending', 'pending_measure', 'measuring', 'measure_done', 'in_production', 'pending_ship', 'pending_receive'])
    })
    .count()

  // 待审核代理
  const pendingAgents = await db.collection('agents').where({ status: 'pending' }).count()

  // 待审核量体师
  const pendingTailors = await db.collection('tailors').where({ status: 'pending' }).count()

  // 总交易额（分）
  const completedOrders = await db.collection('orders')
    .where({ status: 'completed' })
    .field({ total_amount: true })
    .limit(1000)
    .get()
  let totalRevenue = 0
  for (const o of completedOrders.data) {
    totalRevenue += o.total_amount || 0
  }

  return {
    code: 0,
    data: {
      today_orders: todayOrders.total,
      total_orders: totalOrders.total,
      active_orders: activeOrders.total,
      pending_agents: pendingAgents.total,
      pending_tailors: pendingTailors.total,
      total_revenue: totalRevenue
    },
    message: ''
  }
}

/**
 * 管理后台订单列表（全量）
 */
const getOrderList = async (event, ctx) => {
  const { db, _ } = ctx
  const { status, keyword, page = 1, pageSize = 20 } = event

  let where = {}
  if (status) where.status = status
  if (keyword) {
    where = _.or([
      { order_no: db.RegExp({ regexp: keyword, options: 'i' }) },
      { style_name: db.RegExp({ regexp: keyword, options: 'i' }) }
    ])
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('orders')
    .where(where)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countRes = await db.collection('orders').where(where).count()

  return {
    code: 0,
    data: { list: res.data, total: countRes.total, page, pageSize },
    message: ''
  }
}

/**
 * 管理后台量体师列表
 */
const getTailorList = async (event, ctx) => {
  const { db } = ctx
  const { status, page = 1, pageSize = 20 } = event

  let where = {}
  if (status) where.status = status

  const skip = (page - 1) * pageSize
  const res = await db.collection('tailors')
    .where(where)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return { code: 0, data: res.data, message: '' }
}

/**
 * 管理后台代理列表
 */
const getAgentList = async (event, ctx) => {
  const { db } = ctx
  const { status, page = 1, pageSize = 20 } = event

  let where = {}
  if (status) where.status = status

  const skip = (page - 1) * pageSize
  const res = await db.collection('agents')
    .where(where)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return { code: 0, data: res.data, message: '' }
}

/**
 * 审核量体师申请
 */
const approveTailor = async (event, ctx) => {
  const { db } = ctx
  const { tailor_openid, status, reason } = event // status: approved / rejected

  if (!tailor_openid || !status) {
    return { code: -1, data: {}, message: '缺少参数' }
  }

  const tailor = await db.collection('tailors').where({ _openid: tailor_openid }).get()
  if (!tailor.data || tailor.data.length === 0) {
    return { code: -1, data: {}, message: '量体师不存在' }
  }

  await db.collection('tailors').where({ _openid: tailor_openid }).update({
    data: {
      status,
      reject_reason: reason || '',
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: status === 'approved' ? '已通过审核' : '已驳回' }
}

/**
 * 审核代理申请
 */
const approveAgent = async (event, ctx) => {
  const { db } = ctx
  const { agent_openid, status, reason } = event

  if (!agent_openid || !status) {
    return { code: -1, data: {}, message: '缺少参数' }
  }

  const agent = await db.collection('agents').where({ _openid: agent_openid }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '代理不存在' }
  }

  await db.collection('agents').where({ _openid: agent_openid }).update({
    data: {
      status,
      reject_reason: reason || '',
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: status === 'approved' ? '已通过审核' : '已驳回' }
}

/**
 * 创建/更新款式
 */
const updateStyle = async (event, ctx) => {
  const { db } = ctx
  const { style_id, name, category, cover_image, images, description, price, sort } = event

  const now = Date.now()
  const data = { updated_at: now }
  if (name !== undefined) data.name = name
  if (category !== undefined) data.category = category
  if (cover_image !== undefined) data.cover_image = cover_image
  if (images !== undefined) data.images = images
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = price
  if (sort !== undefined) data.sort = sort

  if (style_id) {
    await db.collection('styles').doc(style_id).update({ data })
  } else {
    data.status = 'active'
    data.created_at = now
    await db.collection('styles').add({ data })
  }

  return { code: 0, data: {}, message: style_id ? '更新成功' : '创建成功' }
}

/**
 * 创建/更新布料
 */
const updateFabric = async (event, ctx) => {
  const { db } = ctx
  const { fabric_id, name, category, image, description, price, sort } = event

  const now = Date.now()
  const data = { updated_at: now }
  if (name !== undefined) data.name = name
  if (category !== undefined) data.category = category
  if (image !== undefined) data.image = image
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = price
  if (sort !== undefined) data.sort = sort

  if (fabric_id) {
    await db.collection('fabrics').doc(fabric_id).update({ data })
  } else {
    data.status = 'active'
    data.created_at = now
    await db.collection('fabrics').add({ data })
  }

  return { code: 0, data: {}, message: fabric_id ? '更新成功' : '创建成功' }
}

/**
 * 获取财务统计
 */
const getFinanceStats = async (event, ctx) => {
  const { db, _ } = ctx
  const { month } = event

  let dateFilter = {}
  if (month) {
    const start = new Date(month + '-01').getTime()
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + 1)
    dateFilter = { created_at: _.gte(start).and(_.lt(endDate.getTime())) }
  }

  // 总佣金支出
  const commissionRes = await db.collection('commission_records')
    .where(dateFilter)
    .field({ amount: true, status: true })
    .limit(1000)
    .get()

  let totalCommission = 0
  let settledCommission = 0
  for (const r of commissionRes.data) {
    totalCommission += r.amount || 0
    if (r.status === 'settled') settledCommission += r.amount || 0
  }

  // 提现统计
  const withdrawRes = await db.collection('withdraw_records')
    .where(dateFilter)
    .field({ amount: true, status: true })
    .limit(1000)
    .get()

  let totalWithdraw = 0
  let pendingWithdraw = 0
  for (const w of withdrawRes.data) {
    if (w.status === 'completed') totalWithdraw += w.amount || 0
    if (w.status === 'pending') pendingWithdraw += w.amount || 0
  }

  return {
    code: 0,
    data: {
      total_commission: totalCommission,
      settled_commission: settledCommission,
      total_withdraw: totalWithdraw,
      pending_withdraw: pendingWithdraw
    },
    message: ''
  }
}

/**
 * 手动分配订单
 */
const manualAssignOrder = async (event, ctx) => {
  const { db } = ctx
  const { order_id, agent_openid, tailor_openid } = event

  if (!order_id) {
    return { code: -1, data: {}, message: '缺少订单ID' }
  }

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  const updateData = { updated_at: Date.now() }
  if (agent_openid) updateData.agent_openid = agent_openid
  if (tailor_openid) {
    updateData.tailor_openid = tailor_openid
    updateData.status = 'pending_measure'
  }

  await db.collection('orders').doc(order_id).update({ data: updateData })

  return { code: 0, data: {}, message: '分配成功' }
}

module.exports = {
  getDashboard,
  getOrderList,
  getTailorList,
  getAgentList,
  approveTailor,
  approveAgent,
  updateStyle,
  updateFabric,
  getFinanceStats,
  manualAssignOrder
}
