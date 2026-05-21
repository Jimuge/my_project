// 推广码
const { callFunction } = require('../../utils/request')

Page({
  data: {
    totalScans: 0,
    totalOrders: 0,
    conversionRate: 0,
    promoList: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'agent:getPromoData' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          totalScans: res.totalScans || 0,
          totalOrders: res.totalOrders || 0,
          conversionRate: res.conversionRate || 0,
          promoList: res.promoList || []
        })
      }
    } catch (err) {
      console.error('加载推广数据失败', err)
    }
  },

  onSaveImage() {
    wx.showToast({ title: '保存功能开发中', icon: 'none' })
  },

  onShareAppMessage() {
    return {
      title: '校园定制西装，专业量体师上门服务',
      path: '/pages/client/index/index?from=agent_promo'
    }
  }
})
