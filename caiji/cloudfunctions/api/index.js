// 云函数入口文件 - 单入口路由模式
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: 'cloudbase-d7g1pmyqy316370b1'
})

const db = cloud.database()
const _ = db.command

// 加载各模块
const common = require('./actions/common')
const order = require('./actions/order')
const tailor = require('./actions/tailor')
const agent = require('./actions/agent')
const style = require('./actions/style')
const commission = require('./actions/commission')
const admin = require('./actions/admin')
const init = require('./actions/init')

// action 路由表
const actionMap = {
  // 公共模块
  getOpenId: common.getOpenId,
  getUserInfo: common.getUserInfo,
  updateUserInfo: common.updateUserInfo,
  switchRole: common.switchRole,
  getSchoolList: common.getSchoolList,

  // 订单模块
  createOrder: order.createOrder,
  cancelOrder: order.cancelOrder,
  getOrderList: order.getOrderList,
  getOrderDetail: order.getOrderDetail,
  updateOrderStatus: order.updateOrderStatus,
  confirmScheme: order.confirmScheme,
  confirmReceive: order.confirmReceive,
  payDeposit: order.payDeposit,
  payBalance: order.payBalance,
  applyAfterSale: order.applyAfterSale,

  // 量体师模块
  applyTailor: tailor.applyTailor,
  acceptTailorOrder: tailor.acceptOrder,
  rejectTailorOrder: tailor.rejectOrder,
  checkIn: tailor.checkIn,
  saveMeasureData: tailor.saveMeasureData,
  submitMeasureData: tailor.submitMeasureData,
  uploadBodyPhoto: tailor.uploadBodyPhoto,
  uploadSignature: tailor.uploadSignature,
  setAcceptDesignated: tailor.setAcceptDesignated,
  getTailorList: tailor.getTailorList,
  getIncomeDetail: tailor.getIncomeDetail,

  // 代理模块
  applyAgent: agent.applyAgent,
  acceptAgentOrder: agent.acceptOrder,
  assignToTailor: agent.assignToTailor,
  selfMeasure: agent.selfMeasure,
  generatePromoCode: agent.generatePromoCode,
  getPromoStats: agent.getPromoStats,
  recruitSubAgent: agent.recruitSubAgent,
  removeSubAgent: agent.removeSubAgent,
  getTeamList: agent.getTeamList,
  getTeamPerformance: agent.getTeamPerformance,
  getOrderStats: agent.getOrderStats,
  getCommissionDetail: agent.getCommissionDetail,
  requestWithdraw: agent.requestWithdraw,

  // 款式模块
  getStyleList: style.getStyleList,
  getStyleDetail: style.getStyleDetail,
  getFabricList: style.getFabricList,
  getFabricDetail: style.getFabricDetail,

  // 佣金模块
  calculateCommission: commission.calculateCommission,
  settleCommission: commission.settleCommission,
  processWithdraw: commission.processWithdraw,

  // 管理后台模块
  getDashboard: admin.getDashboard,
  adminGetOrderList: admin.getOrderList,
  adminGetTailorList: admin.getTailorList,
  adminGetAgentList: admin.getAgentList,
  approveTailor: admin.approveTailor,
  approveAgent: admin.approveAgent,
  updateStyle: admin.updateStyle,
  updateFabric: admin.updateFabric,
  getFinanceStats: admin.getFinanceStats,
  manualAssignOrder: admin.manualAssignOrder,

  // 初始化模块
  initData: init.initData
}

// 无需鉴权的 action 白名单
const whiteList = ['getOpenId', 'initData', 'getStyleList', 'getStyleDetail', 'getFabricList', 'getFabricDetail']

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { action } = event

  // 统一响应格式
  const success = (data = {}, message = '') => ({ code: 0, data, message })
  const fail = (code = -1, message = '', data = {}) => ({ code, data, message })

  try {
    // 检查 action 是否存在
    if (!action) {
      return fail(-1, '缺少 action 参数')
    }

    const handler = actionMap[action]
    if (!handler) {
      return fail(-1, `未知的 action: ${action}`)
    }

    // 鉴权中间件：非白名单 action 需要检查 openid
    let OPENID = ''
    if (!whiteList.includes(action)) {
      const wxContext = cloud.getWXContext()
      OPENID = wxContext.OPENID
      if (!OPENID) {
        return fail(401, '用户未登录')
      }
    }

    // 传递 db、_、OPENID 给 action 处理函数
    const ctx = { db, _, OPENID, cloud }
    const result = await handler(event, ctx)

    return result

  } catch (err) {
    console.error(`[云函数错误] action=${action}`, err)
    return fail(-1, err.message || '服务器内部错误')
  }
}
