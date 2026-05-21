// 代理模块

/**
 * 生成推广码
 */
function generatePromoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 申请成为校园代理
 */
const applyAgent = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { real_name, phone, school_id, school_name, reason } = event

  // 检查是否已申请
  const existing = await db.collection('agents').where({ _openid: OPENID }).get()
  if (existing.data && existing.data.length > 0) {
    return { code: -1, data: {}, message: '已提交过申请' }
  }

  const now = Date.now()
  const promoCode = generatePromoCode()

  await db.collection('agents').add({
    data: {
      _openid: OPENID,
      real_name: real_name || '',
      phone: phone || '',
      school_id: school_id || '',
      school_name: school_name || '',
      reason: reason || '',
      status: 'pending', // pending / approved / rejected
      level: 'bronze',   // bronze / silver / gold
      parent_openid: '',  // 上级代理
      sub_agents: [],     // 下级代理列表
      promo_code: promoCode,
      total_orders: 0,
      total_commission: 0, // 累计佣金（分）
      balance: 0,          // 可提现余额（分）
      total_withdrawn: 0,  // 已提现金额（分）
      created_at: now,
      updated_at: now
    }
  })

  // 同步创建推广码记录
  await db.collection('promo_codes').add({
    data: {
      code: promoCode,
      agent_openid: OPENID,
      status: 'active',
      use_count: 0,
      created_at: now
    }
  })

  // 更新用户角色
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      roles: _.addToSet('agent'),
      updated_at: now
    }
  })

  return { code: 0, data: { promo_code: promoCode }, message: '申请已提交，请等待审核' }
}

/**
 * 代理接单
 */
const acceptOrder = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, assign_to_tailor } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'agent_pending') {
    return { code: -1, data: {}, message: '当前订单状态无法接单' }
  }

  const now = Date.now()

  if (assign_to_tailor) {
    // 分派给指定量体师
    await db.collection('orders').doc(order_id).update({
      data: {
        agent_openid: OPENID,
        tailor_openid: assign_to_tailor,
        status: 'pending_measure',
        assigned_at: now,
        updated_at: now
      }
    })
  } else {
    // 代理自己处理，进入量体师待接单池
    await db.collection('orders').doc(order_id).update({
      data: {
        agent_openid: OPENID,
        status: 'tailor_pending',
        assigned_at: now,
        updated_at: now
      }
    })
  }

  return { code: 0, data: {}, message: '接单成功' }
}

/**
 * 分派给量体师
 */
const assignToTailor = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, tailor_openid } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.agent_openid !== OPENID) {
    return { code: -1, data: {}, message: '无权操作此订单' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      tailor_openid,
      status: 'pending_measure',
      assigned_at: Date.now(),
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '分派成功' }
}

/**
 * 自己量体（代理兼量体师）
 */
const selfMeasure = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      agent_openid: OPENID,
      tailor_openid: OPENID,
      status: 'pending_measure',
      assigned_at: Date.now(),
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '已设为自己量体' }
}

/**
 * 生成推广码
 */
const generatePromoCode = async (event, ctx) => {
  const { db, OPENID } = ctx

  const agent = await db.collection('agents').where({ _openid: OPENID }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '您还不是代理' }
  }

  return { code: 0, data: { promo_code: agent.data[0].promo_code }, message: '' }
}

/**
 * 获取推广码数据
 */
const getPromoStats = async (event, ctx) => {
  const { db, OPENID } = ctx

  const agent = await db.collection('agents').where({ _openid: OPENID }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '您还不是代理' }
  }

  const promoCode = agent.data[0].promo_code

  // 统计推广码使用次数
  const orders = await db.collection('orders')
    .where({ promo_code: promoCode })
    .count()

  return {
    code: 0,
    data: {
      promo_code: promoCode,
      use_count: orders.total,
      level: agent.data[0].level
    },
    message: ''
  }
}

/**
 * 招募下级代理
 */
const recruitSubAgent = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { sub_openid } = event

  if (!sub_openid) {
    return { code: -1, data: {}, message: '缺少下级代理openid' }
  }

  // 更新下级代理的 parent
  await db.collection('agents').where({ _openid: sub_openid }).update({
    data: {
      parent_openid: OPENID,
      updated_at: Date.now()
    }
  })

  // 更新上级的 sub_agents 列表
  await db.collection('agents').where({ _openid: OPENID }).update({
    data: {
      sub_agents: _.addToSet(sub_openid),
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '招募成功' }
}

/**
 * 移除下级代理
 */
const removeSubAgent = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { sub_openid } = event

  if (!sub_openid) {
    return { code: -1, data: {}, message: '缺少下级代理openid' }
  }

  // 清除下级代理的 parent
  await db.collection('agents').where({ _openid: sub_openid }).update({
    data: {
      parent_openid: '',
      updated_at: Date.now()
    }
  })

  // 从上级列表移除
  const agent = await db.collection('agents').where({ _openid: OPENID }).get()
  if (agent.data && agent.data.length > 0) {
    const subAgents = (agent.data[0].sub_agents || []).filter(id => id !== sub_openid)
    await db.collection('agents').where({ _openid: OPENID }).update({
      data: {
        sub_agents: subAgents,
        updated_at: Date.now()
      }
    })
  }

  return { code: 0, data: {}, message: '已移除下级代理' }
}

/**
 * 获取团队成员列表
 */
const getTeamList = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { page = 1, pageSize = 20 } = event

  // 获取直接下级
  const agent = await db.collection('agents').where({ _openid: OPENID }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '您还不是代理' }
  }

  const subAgents = agent.data[0].sub_agents || []
  if (subAgents.length === 0) {
    return { code: 0, data: { list: [], total: 0 }, message: '' }
  }

  // 分页查询下级代理信息
  const skip = (page - 1) * pageSize
  const subList = subAgents.slice(skip, skip + pageSize)

  // 获取下级代理详情
  const members = []
  for (const subId of subList) {
    const subRes = await db.collection('agents').where({ _openid: subId }).get()
    if (subRes.data && subRes.data.length > 0) {
      members.push(subRes.data[0])
    }
  }

  return {
    code: 0,
    data: { list: members, total: subAgents.length },
    message: ''
  }
}

/**
 * 获取团队业绩
 */
const getTeamPerformance = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { month } = event

  const agent = await db.collection('agents').where({ _openid: OPENID }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '您还不是代理' }
  }

  const subAgents = [OPENID, ...(agent.data[0].sub_agents || [])]

  let where = { agent_openid: _.in(subAgents), status: 'completed' }
  if (month) {
    const start = new Date(month + '-01').getTime()
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + 1)
    where.completed_at = _.gte(start).and(_.lt(endDate.getTime()))
  }

  const orders = await db.collection('orders')
    .where(where)
    .field({ total_amount: true, agent_openid: true })
    .get()

  // 统计
  let totalAmount = 0
  let orderCount = orders.data.length
  for (const o of orders.data) {
    totalAmount += o.total_amount || 0
  }

  return {
    code: 0,
    data: {
      total_amount: totalAmount,
      order_count: orderCount,
      member_count: subAgents.length
    },
    message: ''
  }
}

/**
 * 获取订单统计数据
 */
const getOrderStats = async (event, ctx) => {
  const { db } = ctx

  const statuses = ['agent_pending', 'tailor_pending', 'pending_measure', 'measuring', 'measure_done', 'in_production', 'pending_ship', 'pending_receive', 'completed', 'cancelled']
  const stats = {}

  for (const status of statuses) {
    const res = await db.collection('orders').where({ agent_openid: ctx.OPENID, status }).count()
    stats[status] = res.total
  }

  return { code: 0, data: stats, message: '' }
}

/**
 * 获取佣金明细
 */
const getCommissionDetail = async (event, ctx) => {
  const { db } = ctx
  const { month, page = 1, pageSize = 20 } = event

  let where = { agent_openid: ctx.OPENID }
  if (month) {
    const start = new Date(month + '-01').getTime()
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + 1)
    where.created_at = _.gte(start).and(_.lt(endDate.getTime()))
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('commission_records')
    .where(where)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return { code: 0, data: res.data, message: '' }
}

/**
 * 申请提现
 */
const requestWithdraw = async (event, ctx) => {
  const { db } = ctx
  const { amount } = event // 单位：分

  if (!amount || amount <= 0) {
    return { code: -1, data: {}, message: '提现金额无效' }
  }

  const agent = await db.collection('agents').where({ _openid: ctx.OPENID }).get()
  if (!agent.data || agent.data.length === 0) {
    return { code: -1, data: {}, message: '您还不是代理' }
  }

  const agentData = agent.data[0]
  if (agentData.balance < amount) {
    return { code: -1, data: {}, message: '余额不足' }
  }

  // 创建提现记录
  const now = Date.now()
  await db.collection('withdraw_records').add({
    data: {
      agent_openid: ctx.OPENID,
      amount,
      status: 'pending', // pending / approved / rejected / completed
      created_at: now,
      updated_at: now
    }
  })

  // 扣减余额
  await db.collection('agents').where({ _openid: ctx.OPENID }).update({
    data: {
      balance: _.inc(-amount),
      updated_at: now
    }
  })

  return { code: 0, data: { amount }, message: '提现申请已提交' }
}

module.exports = {
  applyAgent,
  acceptOrder,
  assignToTailor,
  selfMeasure,
  generatePromoCode,
  getPromoStats,
  recruitSubAgent,
  removeSubAgent,
  getTeamList,
  getTeamPerformance,
  getOrderStats,
  getCommissionDetail,
  requestWithdraw
}
