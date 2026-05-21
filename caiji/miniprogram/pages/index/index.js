// pages/index/index.js
// 首页 - 展示热门款式、快速入口、活动Banner

const app = getApp();
const { callFunction } = require('../../utils/request');

Page({
  /**
   * 页面数据
   */
  data: {
    banners: [],           // 轮播图数据
    hotStyles: [],         // 热门款式
    categories: [],        // 款式分类
    loading: true,
    userInfo: null
  },

  /**
   * 生命周期函数 - 监听页面加载
   */
  onLoad: function(options) {
    this.initPage();
  },

  /**
   * 初始化页面数据
   */
  initPage: async function() {
    try {
      // 并行加载数据
      const [banners, hotStyles, categories] = await Promise.all([
        this.loadBanners(),
        this.loadHotStyles(),
        this.loadCategories()
      ]);

      this.setData({
        banners,
        hotStyles,
        categories,
        loading: false
      });
    } catch (err) {
      console.error('加载首页数据失败', err);
      this.setData({ loading: false });
    }
  },

  /**
   * 加载轮播图
   */
  loadBanners: function() {
    // 从云数据库获取轮播图数据
    const { queryDatabase } = require('../../utils/request');
    return queryDatabase('banners', { enabled: true }, { orderBy: { field: 'sort', order: 'asc' }, limit: 10 })
      .catch(() => []);
  },

  /**
   * 加载热门款式
   */
  loadHotStyles: function() {
    // 从云函数获取热门款式列表
    return callFunction('api', { action: 'getStyleList', isHot: true, limit: 6 })
      .catch(() => []);
  },

  /**
   * 加载款式分类
   */
  loadCategories: function() {
    // 从云函数获取款式分类列表
    return callFunction('api', { action: 'getCategoryList' })
      .catch(() => []);
  },

  /**
   * 点击轮播图
   */
  onBannerTap: function(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.navigateTo({ url });
    }
  },

  /**
   * 点击分类
   */
  onCategoryTap: function(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/style/list?categoryId=${id}`
    });
  },

  /**
   * 点击款式卡片
   */
  onStyleTap: function(e) {
    const { style } = e.detail;
    wx.navigateTo({
      url: `/pages/style/detail?id=${style.id}`
    });
  },

  /**
   * 查看更多款式
   */
  onViewMore: function() {
    wx.switchTab({
      url: '/pages/style/list'
    });
  },

  /**
   * 生命周期函数 - 监听页面显示
   */
  onShow: function() {
    // 刷新用户信息
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
  },

  /**
   * 页面相关事件处理函数 - 监听用户下拉动作
   */
  onPullDownRefresh: function() {
    this.initPage().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return {
      title: '裁局 - 专业正装定制',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    };
  }
});
