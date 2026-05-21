// 佣金模块

// 佣金比例配置
const COMMISSION_RATES = {
  bronze: { direct: 0.05, indirect: 0.02 },
  silver: { direct: 0.08, indirect: 0.025 },
  gold:   { direct: 0.10, indirect: 0.03 }
}

// 量体服务费区间（分）
const MEASURE_FEE_MIN = 5000   // 50元
const MEASURE_FEE_MAX = 8000   // 80元

/**
 * 根据订单金额和代理等级计算佣金
 */
function calcOrderCommission(orderAmount, agentLevel, isDirect) {
  const rate = COMMISSION_RATES[agentLevel] || COMMISSION_RATES.bronze
  const rateValue = isDirect ? rate.direct : rate.indirect
  return Math.floor(orderAmount * rateValue)
}

/**
 * 计算佣金（订单完成后自动触发）
 * 计算直推代理佣金、间推代理佣金、量体师服务费
 */
const calculateCommission = async (event, ctx) => {
  const { db, _, cloud } = ctx
  const { order_id } = event

  if (!order_id) return { code: -1, data: {}, message: '缺少订单ID' }

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  const { agent_openid, tailor_openid, total_amount } = order.data
  const now = Date.now()

  // 1. 计算代理佣金（直推）
  if (agent_openid) {
    const agent = await db.collection('agents').where({ _openid: agent_openid }).get()
    if (agent.data && agent.data.length > 0) {
      const agentData = agent.data[0]
      const directCommission = calcOrderCommission(total_amount, agentData.level, true)

      // 创建佣金记录
      await db.collection('commission_records').add({
        data: {
          order_id,
          agent_openid,
          tailor_openid,
          type: 'order_commission',
          level: 'direct',
          amount: directCommission,
          order_amount: total_amount,
          status: 'pending', // 待结算
          created_at: now
        }
      })

      // 更新代理累计佣金
      await db.collection('agents').where({ _openid: agent_openid }).update({
        data: {
          total_commission: _.inc(directCommission),
          total_orders: _.inc(1),
          updated_at: now
        }
      })

      // 2. 计算间推佣金（上级代理）
      if (agentData.parent_openid) {
        const parentAgent = await db.collection('agents').where({ _openid: agentData.parent_openid }).get()
        if (parentAgent.data && parentAgent.data.length > 0) {
          const parentData = parentAgent.data[0]
          const indirectCommission = calcOrderCommission(total_amount, parentData.level, false)

          await db.collection('commission_records').add({
            data: {
              order_id,
              agent_openid: agentData.parent_openid,
              tailor_openid,
              type: 'order_commission',
              level: 'indirect',
              amount: indirectCommission,
              order_amount: total_amount,
              status: 'pending',
              created_at: now
            }
          })

          await db.collection('agents').where({ _openid: agentData.parent_openid }).update({
            data: {
              total_commission: _.inc(indirectCommission),
              updated_at: now
            }
          })
        }
      }
    }
  }

  // 3. 计算量体师服务费
  if (tailor_openid) {
    const measureFee = MEASURE_FEE_MIN + Math.floor(Math.random() * (MEASURE_FEE_MAX - MEASURE_FEE_MIN))

    await db.collection('commission_records').add({
      data: {
        order_id,
        tailor_openid,
        type: 'measure_fee',
        level: '',
        amount: measureFee,
        order_amount: total_amount,
        status: 'pending',
        created_at: now
      }
    })
  }

  return { code: 0, data: {}, message: '佣金计算完成' }
}

/**
 * 月结佣金
 * 将上月 pending 状态的佣金结算为 settled
 */
const settleCommission = async (event, ctx) => {
  const { db, _ } = ctx
  const { month } = event // 格式 "2026-05"

  if (!month) {
    return { code: -1, data: {}, message: '缺少月份参数' }
  }

  const start = new Date(month + '-01').getTime()
  const endDate = new Date(start)
  endDate.setMonth(endDate.getMonth() + 1)
  const end = endDate.getTime()

  // 查询该月待结算佣金
  const pendingRecords = await db.collection('commission_records')
    .where({
      status: 'pending',
      created_at: _.gte(start).and(_.lt(end))
    })
    .limit(100)
    .get()

  const now = Date.now()

  // 按代理/量体师汇总
  const summary = {}
  for (const record of pendingRecords.data) {
    const key = record.agent_openid || record.tailor_openid
    if (!summary[key]) {
      summary[key] = 0
    }
    summary[key] += record.amount || 0
  }

  // 更新每人的余额和记录状态
  for (const [openid, totalFee] of Object.entries(summary)) {
    // 检查是否是代理
    const agent = await db.collection('agents').where({ _openid: openid }).get()
    if (agent.data && agent.data.length > 0) {
      await db.collection('agents').where({ _openid: openid }).update({
        data: { balance: _.inc(totalFee), updated_at: now }
      })
    }

    // 更新记录状态
    const ids = pendingRecords.data
      .filter(r => (r.agent_openid === openid || r.tailor_openid === openid))
      .map(r => r._id)

    for (const id of ids) {
      await db.collection('commission_records').doc(id).update({
        data: { status: 'settled', settled_at: now }
      })
    }
  }

  return {
    code: 0,
    data: {
      settled_count: pendingRecords.data.length,
      summary
    },
    message: '月结完成'
  }
}

/**
 * 处理提现
 */
const processWithdraw = async (event, ctx) => {
  const { db } = ctx
  const { withdraw_id, status } = event // status: approved / rejected

  if (!withdraw_id || !status) {
    return { code: -1, data: {}, message: '缺少参数' }
  }

  const withdraw = await db.collection('withdraw_records').doc(withdraw_id).get()
  if (!withdraw.data) {
    return { code: -1, data: {}, message: '提现记录不存在' }
  }

  if (withdraw.data.status !== 'pending') {
    return { code: -1, data: {}, message: '该提现记录已处理' }
  }

  const now = Date.now()

  if (status === 'rejected') {
    // 退回余额
    await db.collection('agents').where({ _openid: withdraw.data.agent_openid }).update({
      data: { balance: _.inc(withdraw.data.amount), updated_at: now }
    })
  }

  await db.collection('withdraw_records').doc(withdraw_id).update({
    data: { status, updated_at: now }
  })

  return { code: 0, data: {}, message: status === 'approved' ? '提现已通过' : '提现已驳回' }
}

module.exports = {
  calculateCommission,
  settleCommission,
  processWithdraw
}
