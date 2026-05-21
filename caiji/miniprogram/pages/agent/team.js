// 团队管理
const { callFunction } = require('../../utils/request')

Page({
  data: {
    inviteCode: '',
    teamOrders: 0,
    teamCommission: '0',
    activeMembers: 0,
    members: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const res = await callFunction('api', { action: 'agent:getTeam' }, { loadingText: '加载中...' })
      if (res) {
        this.setData({
          inviteCode: res.inviteCode || '',
          teamOrders: res.teamOrders || 0,
          teamCommission: res.teamCommission || '0',
          activeMembers: res.activeMembers || 0,
          members: res.members || []
        })
      }
    } catch (err) {
      console.error('加载团队数据失败', err)
    }
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onShowQrCode() {
    wx.showToast({ title: '二维码功能开发中', icon: 'none' })
  },

  onMemberDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: '成员详情开发中', icon: 'none' })
  },

  onRemoveMember(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '移除中...' })
            await callFunction('api', { action: 'agent:removeMember', memberId: id }, { showLoading: true, showError: true })
            wx.showToast({ title: '已移除', icon: 'success' })
            this.loadData()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '移除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
