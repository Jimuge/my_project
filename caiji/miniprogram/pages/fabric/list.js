// pages/fabric/list.js

const { callFunction } = require('../../utils/request');

Page({
  data: { fabrics: [], loading: true },
  onLoad() { this.loadFabrics(); },
  loadFabrics: async function() {
    try {
      const fabrics = await callFunction('api', { action: 'getFabricList', page: 1, pageSize: 50 });
      this.setData({ fabrics: fabrics || [], loading: false });
    } catch (err) {
      console.error('加载面料列表失败', err);
      this.setData({ fabrics: [], loading: false });
    }
  },
  onFabricTap(e) {
    const { fabric } = e.detail;
    wx.navigateTo({ url: `/pages/fabric/detail?id=${fabric.id}` });
  }
});
