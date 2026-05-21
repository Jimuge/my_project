// pages/style/list.js
// 款式列表页 - 展示所有可选款式

const { callFunction } = require('../../utils/request');

Page({
  data: {
    styles: [],
    loading: true,
    categoryId: null,
    keyword: ''
  },

  onLoad: function(options) {
    const { categoryId } = options;
    if (categoryId) {
      this.setData({ categoryId });
    }
    this.loadStyles();
  },

  loadStyles: async function() {
    try {
      const { categoryId, keyword } = this.data;
      const styles = await callFunction('api', {
        action: 'getStyleList',
        categoryId: categoryId || null,
        keyword: keyword || '',
        page: 1,
        pageSize: 50
      });

      this.setData({
        styles: styles || [],
        loading: false
      });
    } catch (err) {
      console.error('加载款式列表失败', err);
      this.setData({ styles: [], loading: false });
    }
  },

  onStyleTap: function(e) {
    const { style } = e.detail;
    wx.navigateTo({
      url: `/pages/style/detail?id=${style.id}`
    });
  },

  onPullDownRefresh: function() {
    this.loadStyles().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
