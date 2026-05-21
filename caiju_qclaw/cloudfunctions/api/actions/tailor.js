// 量体师模块

/**
 * 申请成为量体师
 */
const applyTailor = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { real_name, phone, school_id, school_name, skills, experience, id_images } = event

  // 检查是否已申请
  const existing = await db.collection('tailors').where({ _openid: OPENID }).get()
  if (existing.data && existing.data.length > 0) {
    return { code: -1, data: {}, message: '已提交过申请' }
  }

  const now = Date.now()
  await db.collection('tailors').add({
    data: {
      _openid: OPENID,
      real_name: real_name || '',
      phone: phone || '',
      school_id: school_id || '',
      school_name: school_name || '',
      skills: skills || [],
      experience: experience || '',
      id_images: id_images || [],
      status: 'pending', // pending / approved / rejected
      rating: 0,
      order_count: 0,
      accept_designated: false,
      created_at: now,
      updated_at: now
    }
  })

  // 更新用户角色
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      roles: _.addToSet('tailor'),
      updated_at: now
    }
  })

  return { code: 0, data: {}, message: '申请已提交，请等待审核' }
}

/**
 * 接单
 */
const acceptOrder = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'tailor_pending') {
    return { code: -1, data: {}, message: '当前订单状态无法接单' }
  }

  const now = Date.now()
  await db.collection('orders').doc(order_id).update({
    data: {
      tailor_openid: OPENID,
      status: 'pending_measure',
      assigned_at: now,
      updated_at: now
    }
  })

  return { code: 0, data: {}, message: '接单成功' }
}

/**
 * 拒单（含原因）
 */
const rejectOrder = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, reason } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'tailor_pending') {
    return { code: -1, data: {}, message: '当前订单状态无法拒单' }
  }

  // 拒单后回退到代理待处理
  await db.collection('orders').doc(order_id).update({
    data: {
      status: 'agent_pending',
      reject_reason: reason || '',
      reject_by: 'tailor',
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '已拒绝订单' }
}

/**
 * GPS签到
 */
const checkIn = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, latitude, longitude, address } = event

  if (!latitude || !longitude) {
    return { code: -1, data: {}, message: '缺少位置信息' }
  }

  const now = Date.now()
  await db.collection('check_in_records').add({
    data: {
      _openid: OPENID,
      order_id: order_id || '',
      latitude,
      longitude,
      address: address || '',
      created_at: now
    }
  })

  return { code: 0, data: {}, message: '签到成功' }
}

/**
 * 保存量体数据（支持草稿）
 */
const saveMeasureData = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, measure_data, is_draft = true } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  const updateData = {
    measure_data: measure_data,
    updated_at: Date.now()
  }

  if (!is_draft) {
    updateData.status = 'measuring'
    updateData.measure_started_at = Date.now()
  }

  await db.collection('orders').doc(order_id).update({ data: updateData })

  return { code: 0, data: { is_draft }, message: is_draft ? '草稿已保存' : '量体数据已提交' }
}

/**
 * 提交量体数据
 */
const submitMeasureData = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, measure_data } = event

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  if (order.data.status !== 'measuring') {
    return { code: -1, data: {}, message: '当前状态无法提交量体数据' }
  }

  const now = Date.now()
  await db.collection('orders').doc(order_id).update({
    data: {
      measure_data: measure_data || order.data.measure_data,
      status: 'measure_done',
      measure_done_at: now,
      updated_at: now
    }
  })

  return { code: 0, data: {}, message: '量体数据提交成功' }
}

/**
 * 上传体型照片
 */
const uploadBodyPhoto = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, file_id } = event

  if (!file_id) {
    return { code: -1, data: {}, message: '缺少文件ID' }
  }

  const order = await db.collection('orders').doc(order_id).get()
  if (!order.data) {
    return { code: -1, data: {}, message: '订单不存在' }
  }

  const photos = order.data.measure_photos || []
  photos.push({ file_id, uploaded_at: Date.now() })

  await db.collection('orders').doc(order_id).update({
    data: {
      measure_photos: photos,
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '照片上传成功' }
}

/**
 * 上传客户签名
 */
const uploadSignature = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { order_id, file_id } = event

  if (!file_id) {
    return { code: -1, data: {}, message: '缺少签名文件' }
  }

  await db.collection('orders').doc(order_id).update({
    data: {
      customer_signature: file_id,
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '签名上传成功' }
}

/**
 * 设置是否接受指定
 */
const setAcceptDesignated = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { accept } = event

  await db.collection('tailors').where({ _openid: OPENID }).update({
    data: {
      accept_designated: !!accept,
      updated_at: Date.now()
    }
  })

  return { code: 0, data: {}, message: '设置成功' }
}

/**
 * 获取可用量体师列表
 */
const getTailorList = async (event, ctx) => {
  const { db } = ctx
  const { school_id, page = 1, pageSize = 20 } = event

  let where = { status: 'approved' }
  if (school_id) {
    where.school_id = school_id
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('tailors')
    .where(where)
    .orderBy('rating', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return { code: 0, data: res.data, message: '' }
}

/**
 * 获取收入明细
 */
const getIncomeDetail = async (event, ctx) => {
  const { db, OPENID } = ctx
  const { month, page = 1, pageSize = 20 } = event

  let where = { tailor_openid: OPENID, type: 'measure_fee' }
  if (month) {
    // 按月筛选: month 格式 "2026-05"
    const start = new Date(month + '-01').getTime()
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + 1)
    where.created_at = _.gte(start).and(_.lt(endDate.getTime()))
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('commission_records')
    .where(where)
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return { code: 0, data: res.data, message: '' }
}

module.exports = {
  applyTailor,
  acceptOrder,
  rejectOrder,
  checkIn,
  saveMeasureData,
  submitMeasureData,
  uploadBodyPhoto,
  uploadSignature,
  setAcceptDesignated,
  getTailorList,
  getIncomeDetail
}
