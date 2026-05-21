// 状态徽标组件
// 用于显示订单状态、商品状态等

Component({
  /**
   * 组件属性
   */
  properties: {
    // 状态文本
    text: {
      type: String,
      value: ''
    },
    // 状态类型：default | success | warning | error | info | primary | accent
    type: {
      type: String,
      value: 'default'
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
