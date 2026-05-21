// pages/order/pay.js
// 支付页

const { callFunction } = require('../../utils/request');

Page({
  data: {
    order: null,
    payMethods: ['微信支付'],
    payMethodIndex: 0
  },

  onLoad(options) {
    this.loadOrderInfo(options.id);
  },

  loadOrderInfo: async function(id) {
    try {
      const order = await callFunction('api', { action: 'getOrderDetail', orderId: id });
      this.setData({ order, loading: false });
    } catch (err) {
      console.error('加载订单信息失败', err);
      this.setData({ order: null, loading: false });
    }
  },

  onPayMethodChange(e) {
    this.setData({ payMethodIndex: e.detail.value });
  },

  onConfirmPay() {
    wx.showLoading({ title: '支付中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/order/list' });
      }, 1500);
    }, 2000);
  }
});
