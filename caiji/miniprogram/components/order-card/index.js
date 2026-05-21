// 订单卡片组件
// 显示订单概要信息，支持操作按钮

const { formatRelativeTime } = require('../../utils/util');
const { ORDER_STATUS_TEXT } = require('../../utils/config');

Component({
  /**
   * 组件属性
   */
  properties: {
    // 订单数据
    order: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.processOrderData(newVal);
      }
    }
  },

  /**
   * 组件数据
   */
  data: {
    order: {}
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      this.processOrderData(this.properties.order);
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 处理订单数据，添加显示字段
     */
    processOrderData: function(order) {
      if (!order || !order.orderNo) return;
      
      const processed = { ...order };
      
      // 状态文本
      processed.statusText = ORDER_STATUS_TEXT[order.status] || '未知状态';
      
      // 状态样式类
      if (order.status >= 50) {
        processed.statusClass = 'completed';
      } else if (order.status >= 20) {
        processed.statusClass = 'processing';
      } else if (order.status === 10) {
        processed.statusClass = 'pending';
      } else {
        processed.statusClass = 'cancelled';
      }
      
      // 创建时间文本
      processed.createTimeText = formatRelativeTime(order.createTime);
      
      // 默认图片
      if (!processed.imageUrl) {
        processed.imageUrl = '/images/default-style.png';
      }
      
      // 尺码文本
      processed.sizeText = order.measureData ? '已量体' : '待量体';
      
      // 操作按钮（根据状态动态生成）
      processed.actions = this.getActions(order.status);
      
      this.setData({ order: processed });
    },

    /**
     * 根据订单状态获取可用操作
     */
    getActions: function(status) {
      const actions = [];
      
      if (status === 10) {
        // 待付款：去支付、取消订单
        actions.push({ text: '取消订单', action: 'cancel', type: 'default' });
        actions.push({ text: '去支付', action: 'pay', type: 'primary' });
      } else if (status >= 20 && status < 60) {
        // 进行中：查看详情
        actions.push({ text: '查看详情', action: 'detail', type: 'default' });
      } else if (status === 60) {
        // 已完成：再次购买
        actions.push({ text: '再次购买', action: 'reorder', type: 'primary' });
      }
      
      return actions;
    },

    /**
     * 点击卡片
     */
    handleTap: function() {
      this.triggerEvent('tap', { order: this.data.order });
    },

    /**
     * 点击操作按钮
     */
    handleAction: function(e) {
      const action = e.currentTarget.dataset.action;
      this.triggerEvent('action', {
        order: this.data.order,
        action: action
      });
    },

    /**
     * 阻止事件冒泡
     */
    stopPropagation: function() {}
  }
});
