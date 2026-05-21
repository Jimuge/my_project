// app.js
// 裁局小程序 - 应用入口
// 负责云开发初始化、用户身份获取、角色检查

App({
  onLaunch: function () {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,      // 用户信息
      openid: null,       // 用户唯一标识
      roles: [],          // 用户角色列表 ['customer', 'tailor', 'agent']
      cloudEnv: 'cloudbase-d7g1pmyqy316370b1',  // 云环境ID
      hasLogin: false     // 登录状态
    };

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true,
      });
      
      // 云开发初始化完成后，获取用户 openid
      this.getOpenid();
    }
  },

  /**
   * 获取用户 openid
   * 通过 api 云函数获取用户唯一标识
   */
  getOpenid: function() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getOpenId' },
      success: res => {
        console.log('获取 openid 成功', res);
        const result = res.result || {};
        if (result.code === 0 && result.data) {
          this.globalData.openid = result.data.openid;
          this.globalData.hasLogin = true;
          // 检查用户角色
          this.checkUserRole();
        }
      },
      fail: err => {
        console.error('获取 openid 失败', err);
      }
    });
  },

  /**
   * 检查用户角色
   * 从数据库查询用户绑定的角色信息
   */
  checkUserRole: function() {
    if (!this.globalData.openid) {
      return;
    }
    
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: this.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const userData = res.data[0];
        this.globalData.userInfo = userData;
        this.globalData.roles = userData.roles || ['customer'];
        console.log('用户角色:', this.globalData.roles);
      } else {
        // 新用户，默认为客户角色
        this.globalData.roles = ['customer'];
      }
    }).catch(err => {
      console.error('查询用户角色失败', err);
    });
  },

  /**
   * 检查用户是否拥有某个角色
   * @param {string} role - 角色名称 'customer' | 'tailor' | 'agent'
   * @returns {boolean}
   */
  hasRole: function(role) {
    return this.globalData.roles.includes(role);
  },

  /**
   * 更新用户信息
   * @param {Object} userInfo - 用户信息对象
   */
  updateUserInfo: function(userInfo) {
    this.globalData.userInfo = {
      ...this.globalData.userInfo,
      ...userInfo
    };
  }
});
