// 接单详情
const { callFunction } = require('../../utils/request')
const { formatPrice } = require('../../utils/util')

Page({
  data: {
    orderId: '',
    order: {
      customerName: '',
      customerAvatar: '',
      isAssigned: false,
      appointmentTime: '',
      address: '',
      distance: '',
      styleName: '',
      fabricName: '',
      fabricImage: '',
      totalPrice: '',
      remark: ''
    },
    showRejectModal: false,
    rejectReason: '',
    rejectReasons: ['时间冲突', '距离太远', '已接满单', '其他原因']
  },

  onLoad(options) {
    if (options.order_id) {
      this.setData({ orderId: options.order_id })
      this.loadOrder(options.order_id)
    }
  },

  // 加载订单详情
  async loadOrder(orderId) {
    try {
      const res = await callFunction('api', { action: 'order:getDetail', orderId }, { loadingText: '加载订单...' })
      if (res) {
        this.setData({ order: res })
      }
    } catch (err) {
      console.error('加载订单详情失败', err)
    }
  },

  // 接受订单
  async onAccept() {
    wx.showLoading({ title: '处理中' })
    try {
      await callFunction('api', { action: 'tailor:acceptOrder', orderId: this.data.orderId }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '接单成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  // 拒绝订单
  onReject() {
    this.setData({ showRejectModal: true })
  },

  // 选择拒绝原因
  selectReason(e) {
    this.setData({ rejectReason: e.currentTarget.dataset.reason })
  },

  // 确认拒绝
  async confirmReject() {
    if (!this.data.rejectReason) {
      wx.showToast({ title: '请选择拒绝原因', icon: 'none' })
      return
    }
    wx.showLoading({ title: '处理中' })
    try {
      await callFunction('api', { action: 'tailor:rejectOrder', orderId: this.data.orderId, reason: this.data.rejectReason }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '已拒绝', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  // 关闭弹窗
  closeRejectModal() {
    this.setData({ showRejectModal: false, rejectReason: '' })
  }
})
