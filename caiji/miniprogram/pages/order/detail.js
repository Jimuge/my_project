// pages/order/detail.js
// 订单详情页

const { ORDER_STATUS_TEXT } = require('../../utils/config');
const { formatDate } = require('../../utils/util');
const { callFunction } = require('../../utils/request');

Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) this.loadOrderDetail(options.id);
  },

  loadOrderDetail: async function(id) {
    try {
      const order = await callFunction('api', { action: 'getOrderDetail', orderId: id });
      this.setData({ order, loading: false });
    } catch (err) {
      console.error('加载订单详情失败', err);
      this.setData({ order: null, loading: false });
    }
  },

  onPay() {
    wx.navigateTo({ url: '/pages/order/pay' });
  }
});
