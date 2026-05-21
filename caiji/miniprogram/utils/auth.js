/**
 * 裁局小程序 - 认证工具
 * 处理用户登录、授权、角色检查
 */

const { CLOUD_ENV, USER_ROLES } = require('./config');

/**
 * 用户登录
 * 获取 openid 并创建/更新用户记录
 * @returns {Promise<Object>} 用户信息对象
 */
const login = () => {
  return new Promise((resolve, reject) => {
    // 调用云函数获取 openid
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: (res) => {
        console.log('登录成功', res);
        if (res.result && res.result.openid) {
          const openid = res.result.openid;
          
          // 更新或创建用户记录
          updateUserRecord(openid)
            .then((userInfo) => {
              resolve(userInfo);
            })
            .catch((err) => {
              // 即使更新失败，也返回基本登录信息
              resolve({
                openid: openid,
                roles: [USER_ROLES.CUSTOMER],
              });
            });
        } else {
          reject(new Error('获取 openid 失败'));
        }
      },
      fail: (err) => {
        console.error('登录失败', err);
        reject(err);
      },
    });
  });
};

/**
 * 更新用户记录
 * 在数据库中创建或更新用户信息
 * @param {string} openid - 用户唯一标识
 * @returns {Promise<Object>} 用户信息对象
 */
const updateUserRecord = (openid) => {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    const usersCollection = db.collection('users');
    
    // 查询用户是否存在
    usersCollection
      .where({
        _openid: openid,
      })
      .get()
      .then((res) => {
        const now = new Date();
        
        if (res.data.length > 0) {
          // 用户已存在，更新最后登录时间
          const userData = res.data[0];
          usersCollection
            .doc(userData._id)
            .update({
              data: {
                lastLoginTime: now,
                updateTime: now,
              },
            })
            .then(() => {
              resolve(userData);
            })
            .catch(reject);
        } else {
          // 新用户，创建记录
          usersCollection
            .add({
              data: {
                _openid: openid,
                roles: [USER_ROLES.CUSTOMER],  // 默认为客户角色
                createTime: now,
                updateTime: now,
                lastLoginTime: now,
                nickname: '',
                avatar: '',
                phone: '',
              },
            })
            .then((addRes) => {
              resolve({
                _id: addRes._id,
                _openid: openid,
                roles: [USER_ROLES.CUSTOMER],
              });
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
};

/**
 * 获取用户详细信息
 * 使用 wx.getUserProfile API（替代已废弃的 wx.getUserInfo）
 * @returns {Promise<Object>} 用户信息对象
 */
const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功', res);
        resolve(res.userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        reject(err);
      },
    });
  });
};

/**
 * 检查用户是否拥有某个角色
 * @param {string} role - 角色名称
 * @returns {Promise<boolean>} 是否拥有该角色
 */
const checkRole = (role) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    
    // 如果已有角色信息，直接检查
    if (app.globalData.roles && app.globalData.roles.length > 0) {
      resolve(app.globalData.roles.includes(role));
      return;
    }
    
    // 否则从数据库查询
    const openid = app.globalData.openid;
    if (!openid) {
      resolve(false);
      return;
    }
    
    const db = wx.cloud.database();
    db.collection('users')
      .where({
        _openid: openid,
      })
      .get()
      .then((res) => {
        if (res.data.length > 0) {
          const roles = res.data[0].roles || [USER_ROLES.CUSTOMER];
          app.globalData.roles = roles;
          resolve(roles.includes(role));
        } else {
          resolve(role === USER_ROLES.CUSTOMER);  // 新用户只有客户角色
        }
      })
      .catch((err) => {
        console.error('检查角色失败', err);
        reject(err);
      });
  });
};

/**
 * 获取当前用户的所有角色
 * @returns {Promise<Array<string>>} 角色列表
 */
const getUserRoles = () => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    
    if (app.globalData.roles && app.globalData.roles.length > 0) {
      resolve(app.globalData.roles);
      return;
    }
    
    const openid = app.globalData.openid;
    if (!openid) {
      resolve([USER_ROLES.CUSTOMER]);
      return;
    }
    
    const db = wx.cloud.database();
    db.collection('users')
      .where({
        _openid: openid,
      })
      .get()
      .then((res) => {
        if (res.data.length > 0) {
          const roles = res.data[0].roles || [USER_ROLES.CUSTOMER];
          app.globalData.roles = roles;
          resolve(roles);
        } else {
          resolve([USER_ROLES.CUSTOMER]);
        }
      })
      .catch(reject);
  });
};

/**
 * 绑定手机号
 * @param {string} code - 获取手机号的 code
 * @returns {Promise<Object>} 绑定结果
 */
const bindPhone = (code) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: {
        code: code,
      },
      success: (res) => {
        console.log('获取手机号成功', res);
        if (res.result && res.result.phoneNumber) {
          // 更新用户手机号
          const db = wx.cloud.database();
          const openid = getApp().globalData.openid;
          
          db.collection('users')
            .where({
              _openid: openid,
            })
            .update({
              data: {
                phone: res.result.phoneNumber,
                updateTime: new Date(),
              },
            })
            .then(() => {
              resolve({
                success: true,
                phoneNumber: res.result.phoneNumber,
              });
            })
            .catch(reject);
        } else {
          reject(new Error('获取手机号失败'));
        }
      },
      fail: reject,
    });
  });
};

module.exports = {
  login,
  getUserProfile,
  checkRole,
  getUserRoles,
  bindPhone,
};
