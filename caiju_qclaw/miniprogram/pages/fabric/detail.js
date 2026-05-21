// pages/fabric/detail.js

const { callFunction } = require('../../utils/request');

Page({
  data: { fabric: null, loading: true },
  onLoad(options) {
    if (options.id) this.loadFabric(options.id);
  },
  loadFabric: async function(id) {
    try {
      const fabric = await callFunction('api', { action: 'getFabricDetail', fabricId: id });
      this.setData({ fabric, loading: false });
    } catch (err) {
      console.error('加载面料详情失败', err);
      this.setData({ fabric: null, loading: false });
    }
  }
});
