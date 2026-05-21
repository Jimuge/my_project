// pages/role/switch.js
// 身份切换页

const { callFunction } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    roles: [],
    currentRole: ''
  },

  onLoad() {
    this.initData();
  },

  initData() {
    // 如果已有角色数据，直接使用
    const roles = app.globalData.roles || []
    if (roles.length > 0) {
      this.updateRoles(roles)
      return
    }
    // 否则从云函数获取
    this.loadRoles()
  },

  // 从云函数加载角色
  async loadRoles() {
    try {
      const res = await callFunction('api', { action: 'user:getRoles' }, { loadingText: '加载中...' })
      if (res && res.roles) {
        app.globalData.roles = res.roles
        this.updateRoles(res.roles)
      }
    } catch (err) {
      console.error('加载角色信息失败', err)
      // 降级：默认客户角色
      this.updateRoles(['customer'])
    }
  },

  // 更新角色列表
  updateRoles(roles) {
    const roleNames = {
      customer: '客户',
      tailor: '量体师',
      agent: '代理'
    }
    this.setData({
      roles: roles.map(r => ({ value: r, name: roleNames[r] || r })),
      currentRole: roles[0] || 'customer'
    })
  },

  onRoleChange(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ currentRole: role });
  },

  onConfirm() {
    const role = this.data.currentRole
    // 切换角色到云函数
    callFunction('api', { action: 'user:switchRole', role }, { showLoading: false, showError: false })
      .then(() => {
        // 更新全局数据
        app.globalData.currentRole = role
        this.navigateByRole(role)
      })
      .catch(() => {
        // 即使失败也切换本地
        app.globalData.currentRole = role
        this.navigateByRole(role)
      })
  },

  navigateByRole(role) {
    if (role === 'customer') {
      wx.switchTab({ url: '/pages/index/index' })
    } else if (role === 'tailor') {
      wx.redirectTo({ url: '/pages/tailor/index/index' })
    } else if (role === 'agent') {
      wx.redirectTo({ url: '/pages/agent/index/index' })
    }
  }
});
