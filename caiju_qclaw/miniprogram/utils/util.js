/**
 * 裁局小程序 - 通用工具函数
 * 包含价格格式化、订单号生成、日期处理等
 */

/**
 * 价格格式化：分转元
 * @param {number} price - 价格（单位：分）
 * @param {boolean} showSymbol - 是否显示货币符号，默认 true
 * @returns {string} 格式化后的价格字符串
 */
const formatPrice = (price, showSymbol = true) => {
  if (typeof price !== 'number') {
    price = parseInt(price, 10) || 0;
  }
  const yuan = (price / 100).toFixed(2);
  return showSymbol ? `¥${yuan}` : yuan;
};

/**
 * 价格格式化：元转分
 * @param {number|string} yuan - 价格（单位：元）
 * @returns {number} 价格（单位：分）
 */
const yuanToFen = (yuan) => {
  if (typeof yuan === 'string') {
    yuan = parseFloat(yuan);
  }
  return Math.round(yuan * 100);
};

/**
 * 生成订单号
 * 格式：CJ + 年月日时分秒 + 4位随机数
 * @returns {string} 订单号
 */
const generateOrderNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return `CJ${year}${month}${day}${hour}${minute}${second}${random}`;
};

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期对象/字符串/时间戳
 * @param {string} format - 格式字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) {
    return '';
  }
  
  // 转换为 Date 对象
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
};

/**
 * 格式化相对时间
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间描述
 */
const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }
  
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 30) {
    return `${days}天前`;
  } else {
    return formatDate(date, 'YYYY-MM-DD');
  }
};

/**
 * 根据位置获取学校信息
 * 从地理位置逆解析获取学校名称（预留接口）
 * @param {Object} location - 位置信息 {latitude, longitude}
 * @returns {Promise<string>} 学校名称
 */
const getSchoolFromLocation = (location) => {
  return new Promise((resolve, reject) => {
    if (!location || !location.latitude || !location.longitude) {
      reject(new Error('位置信息不完整'));
      return;
    }
    
    // 调用云函数获取学校信息（需要实现对应的云函数）
    wx.cloud.callFunction({
      name: 'getLocationInfo',
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      success: (res) => {
        if (res.result && res.result.school) {
          resolve(res.result.school);
        } else {
          resolve('未知学校');
        }
      },
      fail: (err) => {
        console.error('获取学校信息失败', err);
        reject(err);
      },
    });
  });
};

/**
 * 验证量体数据
 * 检查量体数据是否完整有效
 * @param {Object} measureData - 量体数据对象
 * @returns {Object} {valid: boolean, errors: string[]}
 */
const validateMeasureData = (measureData) => {
  const errors = [];
  
  // 必填字段
  const requiredFields = [
    { key: 'height', name: '身高' },
    { key: 'weight', name: '体重' },
    { key: 'chest', name: '胸围' },
    { key: 'waist', name: '腰围' },
    { key: 'hip', name: '臀围' },
    { key: 'shoulder', name: '肩宽' },
    { key: 'sleeve', name: '袖长' },
    { key: 'neck', name: '领围' },
  ];
  
  requiredFields.forEach((field) => {
    const value = measureData[field.key];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field.name}不能为空`);
    } else if (typeof value === 'number' && value <= 0) {
      errors.push(`${field.name}必须大于0`);
    }
  });
  
  // 数值范围校验
  const validateRange = (value, min, max, name) => {
    if (value !== undefined && value !== null) {
      if (value < min || value > max) {
        errors.push(`${name}应在${min}-${max}之间`);
      }
    }
  };
  
  validateRange(measureData.height, 100, 250, '身高(cm)');
  validateRange(measureData.weight, 30, 200, '体重(kg)');
  validateRange(measureData.chest, 50, 150, '胸围(cm)');
  validateRange(measureData.waist, 40, 130, '腰围(cm)');
  validateRange(measureData.hip, 50, 150, '臀围(cm)');
  validateRange(measureData.shoulder, 30, 60, '肩宽(cm)');
  validateRange(measureData.sleeve, 40, 80, '袖长(cm)');
  validateRange(measureData.neck, 30, 50, '领围(cm)');
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
const throttle = (fn, limit = 300) => {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * 手机号脱敏
 * @param {string} phone - 手机号
 * @returns {string} 脱敏后的手机号
 */
const maskPhone = (phone) => {
  if (!phone || phone.length !== 11) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
};

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

module.exports = {
  formatPrice,
  yuanToFen,
  generateOrderNo,
  formatDate,
  formatRelativeTime,
  getSchoolFromLocation,
  validateMeasureData,
  debounce,
  throttle,
  deepClone,
  maskPhone,
  isValidPhone,
};
