// 佣金结算
const { callFunction } = require('../../utils/request')
const { formatPrice } = require('../../utils/util')

Page({
  data: {
    availableBalance: '0',
    monthTotal: '0',
    pendingSettle: '0',
    withdrawAmount: '',
    bankCard: '',
    commissionList: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'agent:getCommission' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          availableBalance: res.availableBalance || '0',
          monthTotal: res.monthTotal || '0',
          pendingSettle: res.pendingSettle || '0',
          commissionList: res.commissionList || []
        })
      }
    } catch (err) {
      console.error('加载佣金数据失败', err)
    }
  },

  onAmountInput(e) {
    this.setData({ withdrawAmount: e.detail.value })
  },

  async onWithdraw() {
    const { withdrawAmount, availableBalance } = this.data
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 50) {
      wx.showToast({ title: '最低提现50元', icon: 'none' })
      return
    }
    if (amount > parseFloat(availableBalance)) {
      wx.showToast({ title: '余额不足', icon: 'none' })
      return
    }
    if (!this.data.bankCard) {
      wx.showToast({ title: '请选择银行卡', icon: 'none' })
      return
    }
    wx.showLoading({ title: '申请中' })
    try {
      await callFunction('api', { action: 'agent:withdraw', amount }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '申请已提交', icon: 'success' })
      this.setData({ withdrawAmount: '' })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
