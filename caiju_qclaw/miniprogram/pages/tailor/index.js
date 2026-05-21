// 量体师工作台
const { callFunction } = require('../../utils/request')
const { formatPrice } = require('../../utils/util')

Page({
  data: {
    tailorName: '',
    acceptAssigned: true,
    todayPending: 0,
    newOrderCount: 0,
    monthIncome: '',
    monthCompleted: 0,
    weekPending: 0,
    orders: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  async loadData() {
    try {
      const res = await callFunction('api', { action: 'tailor:getDashboard' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          tailorName: res.tailorName || '',
          acceptAssigned: res.acceptAssigned !== undefined ? res.acceptAssigned : true,
          todayPending: res.todayPending || 0,
          newOrderCount: res.newOrderCount || 0,
          monthIncome: res.monthIncome || '0',
          monthCompleted: res.monthCompleted || 0,
          weekPending: res.weekPending || 0,
          orders: res.orders || []
        })
      }
    } catch (err) {
      console.error('加载量体师工作台数据失败', err)
    }
  },

  // 切换接受客户指定
  async onSwitchAccept(e) {
    const acceptAssigned = e.detail.value
    this.setData({ acceptAssigned })
    try {
      await callFunction('api', { action: 'tailor:updateAcceptAssigned', acceptAssigned }, { showError: true })
    } catch (err) {
      console.error('更新接单设置失败', err)
    }
  },

  // 跳转接单列表
  goToAcceptList() {
    wx.navigateTo({ url: '/pages/tailor/accept/accept' })
  },

  // 跳转量体录入
  goToMeasure() {
    wx.navigateTo({ url: '/pages/tailor/measure/measure' })
  },

  // 跳转收入中心
  goToIncome() {
    wx.navigateTo({ url: '/pages/tailor/income/income' })
  },

  // 跳转历史记录
  goToHistory() {
    wx.navigateTo({ url: '/pages/tailor/history/history' })
  },

  // 跳转订单详情
  goToOrderDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/tailor/accept/accept?order_id=${id}` })
  },

  // 查看全部订单
  goToOrderList() {
    wx.navigateTo({ url: '/pages/tailor/history/history' })
  }
})
