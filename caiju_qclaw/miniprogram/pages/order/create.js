// pages/order/create.js
// 下单页 - 选择款式、布料、填写收货信息

const { callFunction } = require('../../utils/request');

Page({
  data: {
    styleId: null,
    style: null,
    selectedFabric: null,
    recipientInfo: {},
    remarks: '',
    totalPrice: 0,
    loading: true
  },

  onLoad(options) {
    const { styleId } = options;
    if (styleId) {
      this.setData({ styleId });
      this.loadStyleInfo(styleId);
    }
  },

  loadStyleInfo: async function(styleId) {
    try {
      const style = await callFunction('api', { action: 'getStyleDetail', styleId: styleId });

      this.setData({
        style,
        selectedFabric: style.fabrics && style.fabrics[0] || null,
        totalPrice: (style.minPrice || 0) + ((style.fabrics && style.fabrics[0]) ? (style.fabrics[0].priceAdd || 0) : 0),
        loading: false
      });
    } catch (err) {
      console.error('加载款式信息失败', err);
      this.setData({ style: null, loading: false });
    }
  },

  onFabricChange(e) {
    const index = e.detail.value;
    const fabric = this.data.style.fabrics[index];
    this.setData({
      selectedFabric: fabric,
      totalPrice: this.data.style.minPrice + fabric.priceAdd
    });
  },

  onSubmit() {
    wx.navigateTo({ url: '/pages/order/pay' });
  }
});
