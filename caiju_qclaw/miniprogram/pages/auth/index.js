// pages/auth/index.js
// 登录授权页

const { callFunction } = require('../../utils/request')
const { login } = require('../../utils/auth')

Page({
  data: {
    loading: false,
    canUseGetUserProfile: true
  },

  onLoad() {
    // 检查是否支持 getUserProfile
    if (wx.getUserProfile) {
      this.setData({ canUseGetUserProfile: true });
    }
  },

  async onGetUserProfile() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    try {
      // 1. 获取用户信息
      const profileRes = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        });
      });

      // 2. 调用登录函数获取 openid
      const userInfo = await login();

      // 3. 更新用户信息到云函数
      const res = await callFunction('api', {
        action: 'user:updateUserInfo',
        openid: userInfo.openid,
        nickname: profileRes.userInfo.nickName,
        avatar: profileRes.userInfo.avatarUrl
      }, { showLoading: false, showError: false })

      // 4. 更新全局数据
      const app = getApp()
      app.globalData.userInfo = {
        ...app.globalData.userInfo,
        openid: userInfo.openid,
        nickname: profileRes.userInfo.nickName,
        avatar: profileRes.userInfo.avatarUrl,
        ...res
      }
      app.globalData.hasLogin = true;

      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });

      // 5. 返回上一页或跳转首页
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 1000);

    } catch (err) {
      console.error('登录失败', err);
      wx.hideLoading();
      if (err.errMsg && err.errMsg.includes('getUserProfile:fail auth deny')) {
        wx.showToast({ title: '请授权登录', icon: 'none' });
      } else {
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      wx.showLoading({ title: '绑定中...' })
      // 获取手机号成功，调用云函数解密
      callFunction('api', {
        action: 'user:bindPhone',
        code: e.detail.code
      }, { showLoading: false, showError: true }).then((res) => {
        wx.hideLoading()
        wx.showToast({ title: '绑定成功', icon: 'success' })
      }).catch((err) => {
        wx.hideLoading()
        console.error('手机号解密失败', err)
      })
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
