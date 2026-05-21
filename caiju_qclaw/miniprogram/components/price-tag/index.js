// 价格标签组件
// 用于统一显示价格格式，自动将分转换为元

const { formatPrice } = require('../../utils/util');

Component({
  /**
   * 组件属性
   */
  properties: {
    // 价格（单位：分）
    price: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.setData({
          displayPrice: formatPrice(newVal, false)
        });
      }
    },
    // 尺寸：sm(小) | base(默认) | lg(大)
    size: {
      type: String,
      value: 'base'
    },
    // 主题：default(红色) | white(白色)
    theme: {
      type: String,
      value: 'default'
    }
  },

  /**
   * 组件数据
   */
  data: {
    displayPrice: '0.00'
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      this.setData({
        displayPrice: formatPrice(this.properties.price, false)
      });
    }
  },

  /**
   * 组件方法
   */
  methods: {
    // 暂无方法
  }
});
