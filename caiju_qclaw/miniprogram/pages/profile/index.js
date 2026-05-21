// pages/profile/index.js
// 个人中心页

const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    hasLogin: false,
    roles: [],
    menuItems: [
      { id: 'order', name: '我的订单', icon: '📋', url: '/pages/order/list' },
      { id: 'measure', name: '我的量体数据', icon: '📏', url: '/pages/profile/measure' },
      { id: 'address', name: '收货地址', icon: '📍', url: '/pages/profile/address' },
      { id: 'coupon', name: '优惠券', icon: '🎫', url: '/pages/profile/coupon' },
      { id: 'feedback', name: '意见反馈', icon: '💬', url: '/pages/profile/feedback' },
      { id: 'about', name: '关于我们', icon: 'ℹ️', url: '/pages/profile/about' }
    ]
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.initPage();
  },

  initPage: async function() {
    try {
      const userInfo = await callFunction('api', { action: 'getUserInfo' });
      const hasLogin = !!(userInfo && userInfo._id);
      const roles = userInfo && userInfo.roles ? userInfo.roles : ['customer'];

      // 同步到全局
      app.globalData.hasLogin = hasLogin;
      app.globalData.userInfo = userInfo;

      this.setData({ hasLogin, userInfo, roles });
    } catch (err) {
      console.error('初始化个人中心失败', err);
      const hasLogin = app.globalData.hasLogin || false;
      const userInfo = app.globalData.userInfo || null;
      const roles = app.globalData.roles || ['customer'];
      this.setData({ hasLogin, userInfo, roles });
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/auth/index' });
  },

  onSwitchRole() {
    wx.navigateTo({ url: '/pages/role/switch' });
  },

  onMenuTap(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.navigateTo({ url });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择的头像：', avatarUrl);
    // 这里应该上传头像到云存储并更新用户信息
  }
});
