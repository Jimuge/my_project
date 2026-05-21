// 代理工作台
const { callFunction } = require('../../utils/request')
const { formatPrice } = require('../../utils/util')

Page({
  data: {
    schoolName: '',
    levelName: '',
    monthOrders: 0,
    monthCommission: '0',
    teamCount: 0,
    pendingAssign: 0,
    pendingAfterSale: 0,
    todayOrders: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'agent:getDashboard' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          schoolName: res.schoolName || '',
          levelName: res.levelName || '',
          monthOrders: res.monthOrders || 0,
          monthCommission: res.monthCommission || '0',
          teamCount: res.teamCount || 0,
          pendingAssign: res.pendingAssign || 0,
          pendingAfterSale: res.pendingAfterSale || 0,
          todayOrders: res.todayOrders || []
        })
      }
    } catch (err) {
      console.error('加载代理工作台数据失败', err)
    }
  },

  goToAssign() { wx.navigateTo({ url: '/pages/agent/assign/assign' }) },
  goToAfterSale() { wx.showToast({ title: '售后功能开发中', icon: 'none' }) },
  goToPromo() { wx.navigateTo({ url: '/pages/agent/promo/promo' }) },
  goToPlaceOrder() { wx.showToast({ title: '代客下单功能开发中', icon: 'none' }) },
  goToTeam() { wx.navigateTo({ url: '/pages/agent/team/team' }) },
  goToIncome() { wx.navigateTo({ url: '/pages/agent/income/income' }) }
})
