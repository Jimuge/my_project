/**
 * 裁局小程序 - 云函数请求封装
 * 统一处理云函数调用、错误处理、loading 管理
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递的数据
 * @param {Object} options - 选项配置
 * @param {boolean} options.showLoading - 是否显示加载提示，默认 true
 * @param {string} options.loadingText - 加载提示文字，默认 '加载中...'
 * @param {boolean} options.showError - 是否显示错误提示，默认 true
 * @returns {Promise<Object>} 云函数返回结果
 */
const callFunction = (name, data = {}, options = {}) => {
  const {
    showLoading = true,
    loadingText = '加载中...',
    showError = true,
  } = options;

  return new Promise((resolve, reject) => {
    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingText,
        mask: true,
      });
    }

    // 调用云函数
    wx.cloud.callFunction({
      name: name,
      data: data,
      success: (res) => {
        console.log(`云函数 ${name} 调用成功:`, res);
        
        if (res.result && res.result.code === 0) {
          // 业务成功
          resolve(res.result.data);
        } else if (res.result && (res.result.code || res.result.errCode)) {
          // 业务失败
          const errMsg = res.result.message || res.result.errMsg || '操作失败';
          if (showError) {
            wx.showToast({
              title: errMsg,
              icon: 'none',
              duration: 2000,
            });
          }
          reject(new Error(errMsg));
        } else {
          // 直接返回结果（兼容旧格式）
          resolve(res.result);
        }
      },
      fail: (err) => {
        console.error(`云函数 ${name} 调用失败:`, err);
        
        const errMsg = err.errMsg || '网络请求失败，请稍后重试';
        if (showError) {
          wx.showToast({
            title: errMsg,
            icon: 'none',
            duration: 2000,
          });
        }
        reject(err);
      },
      complete: () => {
        // 隐藏加载提示
        if (showLoading) {
          wx.hideLoading();
        }
      },
    });
  });
};

/**
 * 批量调用云函数（并发）
 * @param {Array<Object>} tasks - 任务列表 [{name, data, options}]
 * @returns {Promise<Array>} 所有结果
 */
const batchCallFunction = async (tasks) => {
  const promises = tasks.map((task) =>
    callFunction(task.name, task.data, task.options)
  );
  return Promise.all(promises);
};

/**
 * 调用云函数（带重试）
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递的数据
 * @param {number} retryCount - 重试次数，默认 3 次
 * @param {number} retryDelay - 重试间隔（毫秒），默认 1000ms
 * @returns {Promise<Object>} 云函数返回结果
 */
const callFunctionWithRetry = async (
  name,
  data = {},
  retryCount = 3,
  retryDelay = 1000
) => {
  let lastError = null;

  for (let i = 0; i < retryCount; i++) {
    try {
      const result = await callFunction(name, data, {
        showLoading: false,
        showError: false,
      });
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`云函数 ${name} 第 ${i + 1} 次调用失败:`, err.message);
      
      if (i < retryCount - 1) {
        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有重试都失败
  wx.showToast({
    title: lastError.message || '网络请求失败',
    icon: 'none',
  });
  throw lastError;
};

/**
 * 云数据库查询封装
 * @param {string} collection - 集合名称
 * @param {Object} where - 查询条件
 * @param {Object} options - 其他选项（field, orderBy, limit, skip）
 * @returns {Promise<Array>} 查询结果数组
 */
const queryDatabase = (collection, where = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    const collectionRef = db.collection(collection);
    
    let query = collectionRef.where(where);
    
    // 字段筛选
    if (options.field) {
      query = query.field(options.field);
    }
    
    // 排序
    if (options.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.order || 'desc');
    }
    
    // 分页
    if (options.skip) {
      query = query.skip(options.skip);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    query
      .get()
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        console.error(`数据库查询 ${collection} 失败:`, err);
        reject(err);
      });
  });
};

/**
 * 云数据库更新封装
 * @param {string} collection - 集合名称
 * @param {string} docId - 文档ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>} 更新结果
 */
const updateDatabase = (collection, docId, data) => {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    db.collection(collection)
      .doc(docId)
      .update({
        data: {
          ...data,
          updateTime: new Date(),
        },
      })
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error(`数据库更新 ${collection}/${docId} 失败:`, err);
        reject(err);
      });
  });
};

/**
 * 云数据库添加封装
 * @param {string} collection - 集合名称
 * @param {Object} data - 添加数据
 * @returns {Promise<string>} 新记录ID
 */
const addToDatabase = (collection, data) => {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    const now = new Date();
    
    db.collection(collection)
      .add({
        data: {
          ...data,
          createTime: now,
          updateTime: now,
        },
      })
      .then((res) => {
        resolve(res._id);
      })
      .catch((err) => {
        console.error(`数据库添加 ${collection} 失败:`, err);
        reject(err);
      });
  });
};

/**
 * 云数据库删除封装
 * @param {string} collection - 集合名称
 * @param {string} docId - 文档ID
 * @returns {Promise<Object>} 删除结果
 */
const deleteFromDatabase = (collection, docId) => {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    db.collection(collection)
      .doc(docId)
      .remove()
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error(`数据库删除 ${collection}/${docId} 失败:`, err);
        reject(err);
      });
  });
};

module.exports = {
  callFunction,
  batchCallFunction,
  callFunctionWithRetry,
  queryDatabase,
  updateDatabase,
  addToDatabase,
  deleteFromDatabase,
};
