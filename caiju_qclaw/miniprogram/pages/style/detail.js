// pages/style/detail.js
// 款式详情页 - 展示款式详细信息

const { callFunction } = require('../../utils/request');

Page({
  data: {
    style: null,
    loading: true
  },

  onLoad: function(options) {
    const { id } = options;
    if (id) {
      this.loadStyleDetail(id);
    }
  },

  loadStyleDetail: async function(id) {
    try {
      const style = await callFunction('api', { action: 'getStyleDetail', styleId: id });

      this.setData({
        style,
        loading: false
      });
    } catch (err) {
      console.error('加载款式详情失败', err);
      this.setData({ style: null, loading: false });
    }
  },

  onCreateOrder: function() {
    wx.navigateTo({
      url: `/pages/order/create?styleId=${this.data.style.id}`
    });
  },

  onShareAppMessage: function() {
    return {
      title: this.data.style?.name || '款式详情',
      path: `/pages/style/detail?id=${this.data.style?.id}`
    };
  }
});
