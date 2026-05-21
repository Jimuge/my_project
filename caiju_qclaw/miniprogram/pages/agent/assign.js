// 订单分派
const { callFunction } = require('../../utils/request')

Page({
  data: {
    activeTab: 'pending',
    pendingCount: 0,
    pendingOrders: [],
    assignedOrders: [],
    showTailorModal: false,
    currentOrderId: '',
    selectedTailor: '',
    tailors: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'agent:getAssignList' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          pendingOrders: res.pendingOrders || [],
          assignedOrders: res.assignedOrders || [],
          pendingCount: res.pendingCount || 0,
          tailors: res.tailors || []
        })
      }
    } catch (err) {
      console.error('加载分派列表失败', err)
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  // 自己量
  onSelfMeasure(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/tailor/measure/measure?order_id=${id}` })
  },

  // 显示量体师选择
  onShowTailors(e) {
    this.setData({ showTailorModal: true, currentOrderId: e.currentTarget.dataset.id, selectedTailor: '' })
  },

  onSelectTailor(e) {
    this.setData({ selectedTailor: e.currentTarget.dataset.id })
  },

  // 确认分派
  async onConfirmAssign() {
    if (!this.data.selectedTailor) {
      wx.showToast({ title: '请选择量体师', icon: 'none' })
      return
    }
    wx.showLoading({ title: '分派中' })
    try {
      await callFunction('api', {
        action: 'agent:assignOrder',
        orderId: this.data.currentOrderId,
        tailorId: this.data.selectedTailor
      }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '分派成功', icon: 'success' })
      this.closeTailorModal()
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '分派失败', icon: 'none' })
    }
  },

  closeTailorModal() {
    this.setData({ showTailorModal: false, selectedTailor: '' })
  }
})
