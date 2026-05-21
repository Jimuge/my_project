// 加载状态组件
// 显示加载中的提示动画

Component({
  /**
   * 组件属性
   */
  properties: {
    // 是否显示加载状态
    loading: {
      type: Boolean,
      value: true
    },
    // 提示文本
    text: {
      type: String,
      value: '加载中...'
    }
  },

  /**
   * 组件数据
   */
  data: {},

  /**
   * 组件方法
   */
  methods: {}
});
