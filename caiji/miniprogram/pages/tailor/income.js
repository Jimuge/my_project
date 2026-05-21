// 收入中心
const { callFunction } = require('../../utils/request')
const { formatPrice } = require('../../utils/util')

Page({
  data: {
    monthTotal: '0',
    monthCompleted: 0,
    incomeList: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'tailor:getIncome' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          monthTotal: res.monthTotal || '0',
          monthCompleted: res.monthCompleted || 0,
          incomeList: res.incomeList || []
        })
      }
    } catch (err) {
      console.error('加载收入数据失败', err)
    }
  },

  onWithdraw() {
    wx.showToast({ title: '提现功能开发中', icon: 'none' })
  }
})
