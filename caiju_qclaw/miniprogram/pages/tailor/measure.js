// 量体数据录入
const { callFunction } = require('../../utils/request')

Page({
  data: {
    orderId: '',
    measureItems: [
      { field: 'height', label: '身高', unit: 'cm', placeholder: '165-195' },
      { field: 'weight', label: '体重', unit: 'kg', placeholder: '50-120' },
      { field: 'neck', label: '颈围', unit: 'cm', placeholder: '35-50' },
      { field: 'shoulder', label: '肩宽', unit: 'cm', placeholder: '36-55' },
      { field: 'chest', label: '胸围', unit: 'cm', placeholder: '80-130' },
      { field: 'waist', label: '腰围', unit: 'cm', placeholder: '65-120' },
      { field: 'hip', label: '臀围', unit: 'cm', placeholder: '80-130' },
      { field: 'armLength', label: '臂长', unit: 'cm', placeholder: '50-75' },
      { field: 'upperArm', label: '上臂围', unit: 'cm', placeholder: '22-45' },
      { field: 'cuff', label: '袖口围', unit: 'cm', placeholder: '18-30' },
      { field: 'frontLength', label: '前衣长', unit: 'cm', placeholder: '60-85' },
      { field: 'backLength', label: '后衣长', unit: 'cm', placeholder: '60-85' },
      { field: 'backWidth', label: '背宽', unit: 'cm', placeholder: '32-48' },
      { field: 'chestWidth', label: '胸宽', unit: 'cm', placeholder: '30-45' },
      { field: 'pantsLength', label: '裤长', unit: 'cm', placeholder: '85-115' },
      { field: 'thigh', label: '大腿围', unit: 'cm', placeholder: '45-75' },
      { field: 'calf', label: '小腿围', unit: 'cm', placeholder: '30-50' },
      { field: 'rise', label: '立裆', unit: 'cm', placeholder: '22-35' },
      { field: 'crotchWidth', label: '横裆', unit: 'cm', placeholder: '45-70' }
    ],
    measureData: {},
    warnings: {},
    fitPreference: 'regular',
    scenes: ['面试', '答辩', '毕业照', '日常', '婚礼'],
    sceneSelected: {},
    specialNote: '',
    photoItems: [
      { field: 'front', label: '正面' },
      { field: 'side', label: '侧面' },
      { field: 'back', label: '背面' }
    ],
    photos: {}
  },

  onLoad(options) {
    if (options.order_id) {
      this.setData({ orderId: options.order_id })
    }
  },

  // 量体数据输入
  onMeasureInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`measureData.${field}`]: value })
    this.validateField(field, value)
  },

  // 实时校验
  validateField(field, value) {
    const num = parseFloat(value)
    const ranges = {
      height: [140, 210], weight: [40, 150], neck: [30, 55],
      shoulder: [30, 60], chest: [70, 150], waist: [55, 140],
      hip: [70, 150], armLength: [40, 85], upperArm: [18, 50],
      cuff: [15, 35], frontLength: [50, 95], backLength: [50, 95],
      backWidth: [25, 55], chestWidth: [25, 55], pantsLength: [75, 125],
      thigh: [35, 85], calf: [25, 55], rise: [18, 40], crotchWidth: [35, 80]
    }
    const range = ranges[field]
    if (range && num && (num < range[0] || num > range[1])) {
      this.setData({ [`warnings.${field}`]: `合理范围 ${range[0]}-${range[1]}` })
    } else {
      this.setData({ [`warnings.${field}`]: '' })
    }
  },

  // 合身偏好
  onFitPref(e) {
    this.setData({ fitPreference: e.currentTarget.dataset.value })
  },

  // 场景选择
  onSceneToggle(e) {
    const scene = e.currentTarget.dataset.scene
    this.setData({ [`sceneSelected.${scene}`]: !this.data.sceneSelected[scene] })
  },

  // 特殊需求
  onSpecialInput(e) {
    this.setData({ specialNote: e.detail.value })
  },

  // 拍照
  onTakePhoto(e) {
    const field = e.currentTarget.dataset.field
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        this.setData({ [`photos.${field}`]: res.tempFilePaths[0] })
      }
    })
  },

  // 保存草稿
  async onSaveDraft() {
    const { orderId, measureData, fitPreference, sceneSelected, specialNote, photos } = this.data
    wx.showLoading({ title: '保存中' })
    try {
      await callFunction('api', {
        action: 'tailor:saveDraft',
        orderId,
        measureData,
        fitPreference,
        sceneSelected,
        specialNote
      }, { showLoading: true, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '已保存草稿', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 提交方案
  async onSubmit() {
    const { measureData, warnings, fitPreference } = this.data
    // 检查是否有校验警告
    const hasWarning = Object.values(warnings).some(w => w)
    if (hasWarning) {
      wx.showToast({ title: '请修正异常数据', icon: 'none' })
      return
    }
    wx.showLoading({ title: '提交中' })
    try {
      await callFunction('api', {
        action: 'tailor:submitMeasure',
        orderId: this.data.orderId,
        measureData,
        fitPreference,
        sceneSelected: this.data.sceneSelected,
        specialNote: this.data.specialNote
      }, { showLoading: false, showError: true })
      wx.hideLoading()
      wx.showToast({ title: '方案已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  }
})
