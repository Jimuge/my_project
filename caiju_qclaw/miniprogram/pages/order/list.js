// pages/order/list.js
// 订单列表页 - 展示用户所有订单

const { ORDER_STATUS } = require('../../utils/config');
const { callFunction } = require('../../utils/request');

Page({
  data: {
    orders: [],
    currentTab: 0,
    tabs: ['全部', '待付款', '待量体', '生产中', '已完成'],
    loading: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  loadOrders: async function() {
    try {
      const { currentTab } = this.data;
      // 状态映射: 0全部 1待付款 2待量体 3生产中 4已完成
      const statusMap = [null, ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.MEASURING, ORDER_STATUS.PRODUCING, ORDER_STATUS.COMPLETED];
      const status = statusMap[currentTab];

      const orders = await callFunction('api', {
        action: 'getOrderList',
        status: status,
        page: 1,
        pageSize: 50
      });

      this.setData({
        orders: orders || [],
        loading: false
      });
    } catch (err) {
      console.error('加载订单列表失败', err);
      this.setData({ orders: [], loading: false });
    }
  },

  onTabChange(e) {
    const index = e.detail.value || e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    this.loadOrders();
  },

  onOrderTap(e) {
    const { order } = e.detail;
    wx.navigateTo({ url: `/pages/order/detail?id=${order.id}` });
  },

  onOrderAction(e) {
    const { order, action } = e.detail;
    if (action === 'pay') {
      wx.navigateTo({ url: `/pages/order/pay?id=${order.id}` });
    } else if (action === 'cancel') {
      wx.showModal({
        title: '提示',
        content: '确定取消订单吗？',
        success: (res) => {
          if (res.confirm) {
            // 取消订单逻辑
          }
        }
      });
    }
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  }
});
