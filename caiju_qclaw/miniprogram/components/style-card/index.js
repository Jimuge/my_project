// 款式卡片组件
// 显示款式概要信息，点击跳转详情

Component({
  /**
   * 组件属性
   */
  properties: {
    // 款式数据
    style: {
      type: Object,
      value: {}
    }
  },

  /**
   * 组件数据
   */
  data: {},

  /**
   * 组件方法
   */
  methods: {
    /**
     * 点击卡片
     */
    handleTap: function() {
      this.triggerEvent('tap', { style: this.properties.style });
    }
  }
});
