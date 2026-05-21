// 签名确认
const { callFunction } = require('../../utils/request')

Page({
  data: {
    orderId: '',
    orderInfo: {
      styleName: '经典商务套装',
      fabricName: '藏青精纺羊毛',
      fitPreference: '合身'
    },
    summaryList: [],
    hasSigned: false,
    drawing: false,
    lastX: 0,
    lastY: 0
  },

  onLoad(options) {
    if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data))
        this.setData({ orderId: data.orderId })
        this.buildSummary(data.measureData || {})
      } catch (e) { }
    }
    this.ctx = wx.createCanvasContext('signCanvas')
    this.ctx.setStrokeStyle('#1B2A4A')
    this.ctx.setLineWidth(3)
    this.ctx.setLineCap('round')
    this.ctx.setLineJoin('round')
  },

  // 构建汇总列表
  buildSummary(measureData) {
    const labels = {
      height: '身高', weight: '体重', neck: '颈围', shoulder: '肩宽',
      chest: '胸围', waist: '腰围', hip: '臀围', armLength: '臂长',
      upperArm: '上臂围', cuff: '袖口围', frontLength: '前衣长', backLength: '后衣长',
      backWidth: '背宽', chestWidth: '胸宽', pantsLength: '裤长', thigh: '大腿围',
      calf: '小腿围', rise: '立裆', crotchWidth: '横裆'
    }
    const units = { height: 'cm', weight: 'kg' }
    const summaryList = Object.keys(labels).filter(k => measureData[k]).map(k => ({
      label: labels[k],
      value: measureData[k],
      unit: units[k] || 'cm'
    }))
    this.setData({ summaryList })
  },

  // 签名触摸事件
  onTouchStart(e) {
    this.setData({ drawing: true })
    const { x, y } = e.touches[0]
    this.setData({ lastX: x, lastY: y })
  },

  onTouchMove(e) {
    if (!this.data.drawing) return
    const { x, y } = e.touches[0]
    this.ctx.moveTo(this.data.lastX, this.data.lastY)
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.ctx.draw(true)
    this.setData({ lastX: x, lastY: y, hasSigned: true })
  },

  onTouchEnd() {
    this.setData({ drawing: false })
  },

  // 清除签名
  onClearSign() {
    this.ctx.draw()
    this.setData({ hasSigned: false })
  },

  // 返回修改
  onGoBack() {
    wx.navigateBack()
  },

  // 提交签名
  async onSubmitSign() {
    if (!this.data.hasSigned) {
      wx.showToast({ title: '请先签名', icon: 'none' })
      return
    }
    wx.showLoading({ title: '提交中' })
    try {
      // 导出签名图片
      const tempFilePath = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvasId: 'signCanvas',
          success: resolve,
          fail: reject
        })
      })
      // 上传签名图片
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: `signatures/${this.data.orderId}_${Date.now()}.png`,
          filePath: tempFilePath.tempFilePath,
          success: resolve,
          fail: reject
        })
      })
      await callFunction('api', {
        action: 'tailor:submitPlan',
        orderId: this.data.orderId,
        signImage: uploadRes.fileID
      }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '方案已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack({ delta: 2 }), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  }
})
