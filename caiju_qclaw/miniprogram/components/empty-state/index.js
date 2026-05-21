// 空状态组件
// 用于显示列表无数据时的占位提示

Component({
  /**
   * 组件属性
   */
  properties: {
    // 提示文本
    text: {
      type: String,
      value: '暂无数据'
    },
    // 自定义图片URL
    imageSrc: {
      type: String,
      value: ''
    },
    // 图标（如果没有图片）
    icon: {
      type: String,
      value: '📭'
    },
    // 操作按钮文本（可选）
    actionText: {
      type: String,
      value: ''
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
     * 点击操作按钮
     */
    handleAction: function() {
      this.triggerEvent('action');
    }
  }
});
