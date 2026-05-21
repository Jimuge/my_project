// 订单模块

/**
 * 生成订单号: CJ + YYYYMMDD + 6位随机数
 */
function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `CJ${y}${m}${d}${rand}`
}

/**
 * 订单状态机 - 合法的状态流转
 */
const STATE_TRANSITIONS = {
  pending_assign: ['agent_pending', 'cancelled'],           // 待分配 → 代理待接单 / 取消
  agent_pending: ['tailor_pending', 'pending_assign', 'cancelled'], // 代理待接单 → 量体师待接单 / 退回待分配 / 取消
  tailor_pending: ['pending_measure', 'cancelled'],          // 量体师待接单 → 待量体 / 取消
  pending_measure: ['measuring', 'cancelled'],               // 待量体 → 量体中 / 取消
  measuring: ['measure_done', 'cancelled'],                  // 量体中 → 量体完成 / 取消
  measure_done: ['in_production'],                           // 量体完成 → 生产中
  in_production: ['pending_ship'],                           // 生产中 → 待发货
  pending_ship: ['pending_receive'],                         // 待发货 → 待收货
  pending_receive: ['completed'],                            // 待收货 → 已完成
  completed: ['after_sale'],                                 // 已完成 → 售后
  cancelled: [],                                             // 终态
  after_sale: []                                             // 终态
}

/**
 * 校验状态流转是否合法
 */
function validateTransition(from, to) {
  const allowed = STATE_TRANSITIONS[from]
  return allowed && allowed.includes(to)
}

/**
 * 创建订单
 */
const createOrder = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { style_id, fabric_id, customer_remark, agent_id, promo_code } = event

  const now = Date.now()
  const orderNo = generateOrderNo()

  // 获取款式信息
  const styleRes = await db.collection('styles').doc(style_id).get()
  if (!styleRes.data) {
    return { code: -1, data: {}, message: '款式不存在' }
  }

  // 获取布料信息
  let fabricInfo = {}
  if (fabric_id) {
    const fabricRes = await db.collection('fabrics').doc(fabric_id).get()
    fabricInfo = fabricRes.data || {}
  }

  // 计算金额（单位：分）
  const totalAmount = (styleRes.data.price || 0) + (fabricInfo.price || 0)
  const depositAmount = Math.floor(totalAmount * 0.3) // 定金30%

  // 确定代理
  let assignedAgentId = agent_id || ''
  let matchedBySystem = false

  if (!assignedAgentId && promo_code) {
    // 通过推广码匹配代理
    const promoRes = await db.collection('promo_codes').where({ code: promo_code, status: 'active' }).get()
    if (promoRes.data && promoRes.data.length > 0) {
      assignedAgentId = promoRes.data[0].agent_openid
    }
  }

  // 构建订单
  const orderData = {
    order_no: orderNo,
    customer_openid: OPENID,
    agent_openid: assignedAgentId,
    tailor_openid: '',
    style_id,
    style_name: styleRes.data.name || '',
    style_image: styleRes.data.cover_image || '',
    fabric_id: fabric_id || '',
    fabric_name: fabricInfo.name || '',
    fabric_image: fabricInfo.image || '',
    total_amount: totalAmount,
    deposit_amount: depositAmount,
    deposit_paid: false,
    balance_paid: false,
    promo_code: promo_code || '',
    matched_by_system: matchedBySystem,
    status: 'pending_assign',
    customer_remark: customer_remark || '',
    // 量体相关
    measure_data: null,
    measure_photos: [],
    customer_signature: '',
    scheme_confirmed: false,
    // 售后相关
    after_sale_reason: '',
    after_sale_images: [],
    // 时间记录
    created_at: now,
    updated_at: now,
    assigned_at: 0,
    measure_started_at: 0,
    measure_done_at: 0,
    production_started_at: 0,
    shipped_at: 0,
    completed_at: 0,
    cancelled_at: 0
  }

  const addRes = await db.collection('orders').add({ data: orderData })

  return {
    code: 0,
    data: {
      _id: addRes._id,
      order_no: orderNo,
      status: orderData.status,
      total_amount: totalAmount,
      deposit_amount: depositAmount
    },
    message: '订单创建成功'
  }
}

/**
 * 取消订单
 */
const cancelOrder = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, reason } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  // 只有客户、代理或量体师可取消（在允许取消的状态下）
  const { status, customer_openid } = order.data
  const isCustomer = customer_openid === OPENID

  if (!validateTransition(status, 'cancelled')) {
    return { code: -1, data: {}, message: `当前状态 ${status} 不允许取消` }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      status: 'cancelled',
      cancel_reason: reason || '',
      cancelled_at: Date.now(),
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '订单已取消' }
}

/**
 * 获取订单列表
 */
const getOrderList = async (event, ctx) => {
  const { db, _, OPENID } = ctx
  const { status, role, page = 1, pageSize = 20 } = event

  let where = {}
  const currentRole = role || 'customer'

  switch (currentRole) {
    case 'customer':
      where.customer_openid = OPENID
      break
    case 'agent':
      where.agent_openid = OPENID
      break
    case 'tailor':
      where.tailor_openid = OPENID
      break
    default:
      where.customer_openid = OPENID
  }

  if (status) {
    where.status = status
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
    data: {
      list: res.data,
      total: countRes.total,
      page,
      pageSize
    },
    message: ''
  }
}

/**
 * 获取订单详情
 */
const getOrderDetail = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  return { code: 0, data: order.data, message: '' }
}

/**
 * 更新订单状态（状态机控制）
 */
const updateOrderStatus = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, new_status } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  const { status } = order.data
  if (!validateTransition(status, new_status)) {
    return { code: -1, data: {}, message: `不允许从 ${status} 转到 ${new_status}` }
  }

  const updateData = {
    status: new_status,
    updated_at: Date.now()
  }

  // 记录时间节点
  const now = Date.now()
  if (new_status === 'agent_pending') updateData.assigned_at = now
  if (new_status === 'tailor_pending') updateData.assigned_at = now
  if (new_status === 'measuring') updateData.measure_started_at = now
  if (new_status === 'measure_done') updateData.measure_done_at = now
  if (new_status === 'in_production') updateData.production_started_at = now
  if (new_status === 'pending_ship') updateData.shipped_at = now
  if (new_status === 'pending_receive') updateData.shipped_at = now
  if (new_status === 'completed') updateData.completed_at = now

  await db.collection('orders').doc(order_id).update({ data: updateData })

  return { code: 0, data: { status: new_status }, message: '状态更新成功' }
}

/**
 * 客户确认方案
 */
const confirmScheme = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'measure_done') {
    return { code: -1, data: {}, message: '当前状态无法确认方案' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      scheme_confirmed: true,
      status: 'in_production',
      production_started_at: Date.now(),
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '方案已确认' }
}

/**
 * 确认收货
 */
const confirmReceive = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'pending_receive') {
    return { code: -1, data: {}, message: '当前状态无法确认收货' }
  }

  const now = Date.now()
  await db.collection('orders').doc(order_id).update({
    data: {
      status: 'completed',
      completed_at: now,
      updated_at: now
    }
  })

  // 触发佣金计算（异步，不阻塞返回）
  try {
    const commission = require('./commission')
    commission.calculateCommission({ order_id }, { db, _, OPENID, cloud: ctx.cloud })
  } catch (e) {
    console.error('佣金计算触发失败', e)
  }

  return { code: 0, data: {}, message: '已确认收货' }
}

/**
 * 模拟支付定金
 */
const payDeposit = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.deposit_paid) {
    return { code: -1, data: {}, message: '定金已支付' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      deposit_paid: true,
      updated_at: Date.now()
    }
  })

  return { code: 0, data: { deposit_amount: order.data.deposit_amount }, message: '定金支付成功' }
}

/**
 * 模拟支付尾款
 */
const payBalance = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.balance_paid) {
    return { code: -1, data: {}, message: '尾款已支付' }
  }

  const balanceAmount = order.data.total_amount - order.data.deposit_amount

  await db.collection('orders').doc(order_id).update({
    data: {
      balance_paid: true,
      updated_at: Date.now()
    }
  })

  return { code: 0, data: { balance_amount: balanceAmount }, message: '尾款支付成功' }
}

/**
 * 申请售后
 */
const applyAfterSale = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, reason, images } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'completed') {
    return { code: -1, data: {}, message: '只有已完成的订单可以申请售后' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      status: 'after_sale',
      after_sale_reason: reason || '',
      after_sale_images: images || [],
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '售后申请已提交' }
}

module.exports = {
  createOrder,
  cancelOrder,
  getOrderList,
  getOrderDetail,
  updateOrderStatus,
  confirmScheme,
  confirmReceive,
  payDeposit,
  payBalance,
  applyAfterSale
}
