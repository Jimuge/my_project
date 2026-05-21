/**
 * 裁局小程序 - 配置文件
 * 导出云环境ID、AppID等常量
 */

// 云环境ID
const CLOUD_ENV = 'cloudbase-d7g1pmyqy316370b1';

// 小程序 AppID
const APP_ID = 'wx6c0b0053bcd95ab2';

// 主题色
const COLORS = {
  primary: '#1B2A4A',    // 主色-深蓝
  accent: '#C9A96E',     // 强调色-金色
  background: '#F5F5F5', // 背景色
  success: '#52C41A',    // 成功色
  warning: '#FAAD14',    // 警告色
  error: '#F5222D',      // 错误色
};

/**
 * 订单状态常量
 * 状态流转：待付款 → 待量体 → 量体中 → 生产中 → 待取货 → 已完成
 */
const ORDER_STATUS = {
  PENDING_PAYMENT: 10,      // 待付款
  PENDING_MEASURE: 20,      // 待量体（已付款）
  MEASURING: 30,            // 量体中（量体师已接单）
  IN_PRODUCTION: 40,        // 生产中
  READY_FOR_PICKUP: 50,     // 待取货
  COMPLETED: 60,            // 已完成
  CANCELLED: -1,            // 已取消
  REFUNDING: -2,            // 退款中
  REFUNDED: -3,             // 已退款
};

// 订单状态文本映射
const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING_PAYMENT]: '待付款',
  [ORDER_STATUS.PENDING_MEASURE]: '待量体',
  [ORDER_STATUS.MEASURING]: '量体中',
  [ORDER_STATUS.IN_PRODUCTION]: '生产中',
  [ORDER_STATUS.READY_FOR_PICKUP]: '待取货',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDING]: '退款中',
  [ORDER_STATUS.REFUNDED]: '已退款',
};

/**
 * 佣金费率常量
 * 各角色分佣比例（基于订单总金额）
 */
const COMMISSION_RATE = {
  PLATFORM: 0.10,     // 平台抽成 10%
  AGENT: 0.15,        // 代理分佣 15%
  TAILOR: 0.25,       // 量体师分佣 25%
  // 供应商/工厂拿剩余 50%
};

// 用户角色常量
const USER_ROLES = {
  CUSTOMER: 'customer',   // 客户
  TAILOR: 'tailor',        // 量体师
  AGENT: 'agent',         // 代理
  ADMIN: 'admin',         // 管理员
};

// 角色名称映射
const ROLE_NAMES = {
  [USER_ROLES.CUSTOMER]: '客户',
  [USER_ROLES.TAILOR]: '量体师',
  [USER_ROLES.AGENT]: '代理',
  [USER_ROLES.ADMIN]: '管理员',
};

// 默认设置
const DEFAULT_SETTINGS = {
  measureTimeout: 7,      // 量体时效（天）
  productionTimeout: 14,  // 生产时效（天）
  pickupTimeout: 30,      // 取货时效（天）
};

module.exports = {
  CLOUD_ENV,
  APP_ID,
  COLORS,
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
  COMMISSION_RATE,
  USER_ROLES,
  ROLE_NAMES,
  DEFAULT_SETTINGS,
};
