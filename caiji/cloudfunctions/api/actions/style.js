// 款式模块

/**
 * 获取款式列表（分类筛选、分页）
 */
const getStyleList = async (event, ctx) => {
  const { db } = ctx
  const { category, page = 1, pageSize = 20 } = event

  let where = { status: 'active' }
  if (category) {
    where.category = category
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('styles')
    .where(where)
    .orderBy('sort', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countRes = await db.collection('styles').where(where).count()

  return {
    code: 0,
    data: {
      list: res.data,
      total: countRes.total,
      page,
      pageSize
    },
    message: ''
  }
}

/**
 * 获取款式详情
 */
const getStyleDetail = async (event, ctx) => {
  const { db } = ctx
  const { style_id } = event

  const style = await db.collection('styles').doc(style_id).get()
  if (!style.data) {
    return { code: -1, data: {}, message: '款式不存在' }
  }

  return { code: 0, data: style.data, message: '' }
}

/**
 * 获取布料列表
 */
const getFabricList = async (event, ctx) => {
  const { db } = ctx
  const { category, page = 1, pageSize = 20 } = event

  let where = { status: 'active' }
  if (category) {
    where.category = category
  }

  const skip = (page - 1) * pageSize
  const res = await db.collection('fabrics')
    .where(where)
    .orderBy('sort', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const countRes = await db.collection('fabrics').where(where).count()

  return {
    code: 0,
    data: {
      list: res.data,
      total: countRes.total,
      page,
      pageSize
    },
    message: ''
  }
}

/**
 * 获取布料详情
 */
const getFabricDetail = async (event, ctx) => {
  const { db } = ctx
  const { fabric_id } = event

  const fabric = await db.collection('fabrics').doc(fabric_id).get()
  if (!fabric.data) {
    return { code: -1, data: {}, message: '布料不存在' }
  }

  return { code: 0, data: fabric.data, message: '' }
}

module.exports = {
  getStyleList,
  getStyleDetail,
  getFabricList,
  getFabricDetail
}
