// 数据库初始化模块
// 集合在首次 add 数据时自动创建，无需手动 createCollection

const initData = async (event, ctx) => {
  const { db } = ctx
  const { confirm_clear = false } = event
  const results = []

  // 辅助函数：安全插入种子数据
  const seedData = async (collName, items, idField = 'name') => {
    try {
      if (confirm_clear) {
        // 清空模式：先删后插
        const res = await db.collection(collName).limit(100).get()
        if (res.data && res.data.length > 0) {
          for (const doc of res.data) {
            await db.collection(collName).doc(doc._id).remove()
          }
        }
      } else {
        // 检查是否已有数据
        const count = await db.collection(collName).count()
        if (count.total > 0) {
          results.push({ name: collName, status: 'exists', count: count.total })
          return
        }
      }

      for (const item of items) {
        await db.collection(collName).add({ data: item })
      }
      results.push({ name: collName, status: confirm_clear ? 'reseeded' : 'seeded', count: items.length })
    } catch (err) {
      results.push({ name: collName, status: 'error', error: err.message })
    }
  }

  // ===== 学校数据 =====
  await seedData('schools', [
    { name: '清华大学', province: '北京', city: '北京', created_at: Date.now() },
    { name: '北京大学', province: '北京', city: '北京', created_at: Date.now() },
    { name: '复旦大学', province: '上海', city: '上海', created_at: Date.now() },
    { name: '浙江大学', province: '浙江', city: '杭州', created_at: Date.now() },
    { name: '中山大学', province: '广东', city: '广州', created_at: Date.now() },
    { name: '华南理工大学', province: '广东', city: '广州', created_at: Date.now() },
    { name: '武汉大学', province: '湖北', city: '武汉', created_at: Date.now() },
    { name: '南京大学', province: '江苏', city: '南京', created_at: Date.now() },
    { name: '四川大学', province: '四川', city: '成都', created_at: Date.now() },
    { name: '西安交通大学', province: '陕西', city: '西安', created_at: Date.now() }
  ])

  // ===== 款式数据 =====
  await seedData('styles', [
    {
      name: '经典商务西装',
      category: 'suit',
      description: '修身剪裁，商务正装首选，适合面试、会议等正式场合',
      minPrice: 2999,
      images: [],
      salesCount: 156,
      status: 'on_sale',
      fabrics: [],
      sort: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '修身款西裤',
      category: 'pants',
      description: '意大利面料，挺括有型，垂感出众',
      minPrice: 899,
      images: [],
      salesCount: 89,
      status: 'on_sale',
      fabrics: [],
      sort: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '定制衬衫',
      category: 'shirt',
      description: '免烫面料，合身版型，日常通勤必备',
      minPrice: 599,
      images: [],
      salesCount: 234,
      status: 'on_sale',
      fabrics: [],
      sort: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '休闲西装外套',
      category: 'blazer',
      description: '周末休闲，轻松有范，搭配牛仔裤即可出街',
      minPrice: 1999,
      images: [],
      salesCount: 67,
      status: 'on_sale',
      fabrics: [],
      sort: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '正装马甲',
      category: 'vest',
      description: '三件套必备，层次感拉满，秋冬穿搭利器',
      minPrice: 799,
      images: [],
      salesCount: 45,
      status: 'on_sale',
      fabrics: [],
      sort: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ])

  // ===== 面料数据 =====
  await seedData('fabrics', [
    {
      name: 'Super 120s 羊毛',
      brand: 'VBC',
      origin: '意大利',
      composition: '100%羊毛',
      weight: '260g',
      price: 599,
      category: 'suit',
      colors: ['藏青', '炭灰', '黑色'],
      stock: 100,
      status: 'on_sale',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Tencel 混纺',
      brand: 'Lenzing',
      origin: '奥地利',
      composition: '60%天丝40%棉',
      weight: '140g',
      price: 399,
      category: 'shirt',
      colors: ['白色', '浅蓝', '淡粉'],
      stock: 150,
      status: 'on_sale',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Cashmere 混纺',
      brand: 'Loro Piana',
      origin: '意大利',
      composition: '90%羊毛10%羊绒',
      weight: '280g',
      price: 899,
      category: 'suit',
      colors: ['深蓝', '灰色', '驼色'],
      stock: 60,
      status: 'on_sale',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ])

  return {
    code: 0,
    data: {
      results,
      message: confirm_clear ? '数据库已重新初始化' : '数据库初始化完成'
    },
    message: ''
  }
}

module.exports = { initData }
