# 裁局 - 整体架构与分步开发计划

> 本文档是开发的"总施工图"，请先确认整体方案，再逐步推进每一模块。

---

## 一、系统整体架构

### 1.1 前台：微信小程序（统一入口，一套代码）

**核心理念**：客户端、量体师端、校园代理端共用同一个小程序，通过用户角色权限控制显示不同界面。

| 维度 | 说明 |
|------|------|
| 技术栈 | 微信小程序原生开发（WXML / WXSS / JS / JSON） |
| AppID | wx6c0b0053bcd95ab2 |
| 云环境ID | cloudbase-d7g1pmyqy316370b1 |
| 主色 | 深蓝 #1B2A4A，金色 #C9A96E |
| 主题色体系 | 深蓝用于头部/按钮/强调，金色用于价格/标签/点缀，白色背景 |
| 角色切换 | 个人中心有"身份切换"入口，切换后 tabBar 和页面权限变化 |

**小程序目录结构规划**：

```
miniprogram/
├── app.js                    # 小程序入口，初始化云开发、全局登录
├── app.json                  # 全局配置：页面路由、tabBar、权限声明
├── app.wxss                  # 全局样式：主题色变量、通用class
├── sitemap.json              # 微信搜索配置
│
├── config/                   # 配置文件
│   └── index.js              # 云环境ID、API域名、业务参数集中管理
│
├── utils/                    # 工具函数
│   ├── request.js            # 云函数统一调用封装（含鉴权、错误处理）
│   ├── auth.js               # 登录、角色判断、权限校验
│   ├── util.js               # 通用工具：日期格式化、金额转换（分↔元）等
│   └── constants.js          # 常量定义：订单状态、角色枚举等
│
├── components/               # 公共组件
│   ├── loading/              # 加载状态组件
│   ├── empty/                # 空状态组件
│   ├── price/                # 价格显示组件（分→元，带货币符号）
│   ├── order-card/           # 订单卡片组件
│   ├── status-tag/           # 订单状态标签组件
│   ├── image-upload/         # 图片上传组件（选图→压缩→上传云存储）
│   ├── signature/            # 电子签名Canvas组件
│   └── navigation/           # 导航栏自定义组件
│
├── pages/                    # 客户端页面
│   ├── index/                # 首页（Banner + 分类入口 + 热门款式）
│   ├── style-list/           # 款式列表页（筛选 + 卡片列表）
│   ├── style-detail/         # 款式详情页（轮播 + 选项 + 布料选择入口）
│   ├── fabric-list/          # 布料列表页（分类Tab + 布料卡片）
│   ├── order-create/         # 下单页（地址/预约/量体师/价格/支付）
│   ├── order-list/           # 订单列表页（状态Tab筛选）
│   ├── order-detail/         # 订单详情页（时间轴 + 信息 + 操作按钮）
│   ├── measure-confirm/      # 量体方案确认页（查看数据 + 签名）
│   └── profile/              # 个人中心（头像/订单入口/身材档案/设置）
│
├── tailor/                   # 量体师端页面
│   ├── index/                # 量体师工作台首页
│   ├── order-accept/         # 接单详情页（接受/拒绝）
│   ├── navigate/             # 导航+签到页
│   ├── measure-input/        # 量体数据录入页（19项数据表单）
│   ├── measure-submit/       # 量体提交+客户签名页
│   └── income/               # 收入中心
│
├── agent/                    # 校园代理端页面
│   ├── index/                # 代理工作台首页
│   ├── order-dispatch/       # 订单分派页（自己量/分派量体师）
│   ├── promo-code/           # 推广码生成页
│   ├── team/                 # 团队管理页
│   ├── team-recruit/         # 招募下级代理页
│   ├── performance/          # 业绩看板
│   ├── commission/           # 佣金结算页
│   ├── customer-list/        # 客户列表页
│   └── order-proxy/          # 代客下单页
│
├── role-switch/              # 身份切换页（选择客户/量体师/代理角色）
│
├── static/                   # 静态资源（占位图、图标）
│   ├── images/
│   └── icons/
│
└── subpackages/              # 分包（控制主包体积 < 2MB）
    └── (后期按需拆分)
```

### 1.2 后台：Web管理端（Vue3 + Element Plus）

| 维度 | 说明 |
|------|------|
| 技术栈 | Vue3 + Vite + Element Plus + Pinia |
| 数据访问 | 通过云函数 HTTP 触发器调用，与小程序共用同一套云函数 |
| 部署方式 | 独立Web项目，后期可部署到腾讯云 EdgeOne Pages |

**管理后台功能模块**：
- 订单管理：全量订单列表、详情、状态干预、导出
- 角色管理：量体师审核/列表、校园代理审核/列表/等级管理
- 商品管理：款式CRUD、布料CRUD、分类管理
- 财务统计：收入/支出/利润报表、结算审核
- 数据看板：核心指标、趋势图、用户分析
- 系统设置：管理员账号、全局参数、消息模板

### 1.3 后端：微信云开发（免运维）

| 服务 | 说明 |
|------|------|
| 云函数 | Node.js，单入口路由模式（api → action分发），约8个action模块 |
| 云数据库 | 类MongoDB，13张集合表，无固定Schema |
| 云存储 | 图片/文件存储，CDN加速，用于款式图、体型照片、签名、证件等 |

**云函数目录结构**：

```
cloudfunctions/
└── api/                          # 主入口云函数
    ├── index.js                  # 统一入口：鉴权 + action路由分发
    ├── package.json
    └── actions/                  # 按业务模块拆分
        ├── order.js              # 订单：create, cancel, list, detail, updateStatus...
        ├── payment.js            # 支付：payDeposit, payBalance, refund...
        ├── tailor.js             # 量体师：apply, accept, reject, update...
        ├── measure.js            # 量体：save, submit, get...
        ├── agent.js              # 代理：apply, acceptOrder, dispatch, recruit...
        ├── commission.js         # 佣金：calculate, settle, withdraw...
        ├── admin.js              # 管理后台：dashboard, manage, export...
        └── common.js             # 公共工具：日期处理、金额计算、权限校验
```

### 1.4 数据库设计（13张表）

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| users | 用户表 | openid, roles[], school, source_agent_id |
| orders | 订单表 | order_no, user_id, status, total_price, deposit, agent_id, tailor_id |
| tailors | 量体师表 | user_id, school, status, accept_designated, rating, order_count |
| agents | 代理表 | user_id, school, level, parent_agent_id, has_tailor_cert, commission_rate |
| agent_teams | 代理团队关系 | parent_agent_id, sub_agent_id, status |
| styles | 款式表 | name, category, images[], base_price, options[], is_active |
| fabrics | 布料表 | name, category, images[], extra_price, stock |
| measure_records | 量体数据表 | order_id, 19项数据, body_photos[], customer_sign |
| factories | 工厂表 | name, capacity, lead_time, processing_prices |
| settlements | 结算记录表 | type, target_id, order_id, amount, status |
| after_sales | 售后记录表 | order_id, type, description, solution, status |
| promo_codes | 推广码表 | agent_id, code, channel, scan_count, order_count |
| operation_logs | 操作日志表 | operator_id, action, target_type, detail |

---

## 二、功能分布：前台 vs 后台

### 哪些功能在小程序（前台）

| 角色 | 功能 | 使用场景 |
|------|------|----------|
| **客户** | 浏览款式布料、选款下单、指定量体师、查看订单进度、确认方案签名、确认收货、申请售后 | 学生日常使用 |
| **量体师** | 接单/拒单、导航上门、GPS签到、录入19项量体数据、拍照记录、提交方案 | 量体师上门服务 |
| **校园代理** | 代理工作台、分派订单、推广码、代客下单、客户管理、团队招募/管理、业绩看板、佣金结算 | 代理日常运营 |

### 哪些功能在管理后台（Web端）

| 模块 | 功能 | 使用者 |
|------|------|--------|
| 订单管理 | 全量查看、手动分配、状态干预、导出 | 老板 |
| 角色管理 | 审核/停用量体师和代理、等级调整 | 老板 |
| 商品管理 | 款式/布料的增删改查、上下架、排序 | 老板 |
| 财务统计 | 收入/支出/利润报表、结算审核 | 老板 |
| 数据看板 | 核心指标、趋势、各维度分析 | 老板 |
| 系统设置 | 全局参数（定金比例/佣金费率等） | 老板 |

**简单理解**：小程序给"干活的人"用（客户买、量体师量、代理管），后台给"看全局的人"用（老板统筹一切）。

---

## 三、分步开发计划（10步渐进式）

### 原则
- 每步只做一个模块，做完你能在微信开发者工具里测试验证
- 前期用静态假数据，界面先跑通，云函数后面逐步对接
- 支付先用模拟支付，图片先用占位图

---

### Step 1：项目骨架搭建
**做什么**：清理现有模板代码，搭建项目基础框架
**涉及文件**：
- 重写 app.js（云开发初始化、全局登录）
- 重写 app.json（页面路由、tabBar配置、权限声明）
- 重写 app.wxss（主题色CSS变量、全局样式reset）
- 新建 config/index.js（云环境ID等配置集中管理）
- 新建 utils/ 目录（request.js、auth.js、util.js、constants.js）

**做完效果**：小程序能正常启动，显示底部tabBar，能调用云函数获取openid

---

### Step 2：首页 + 款式列表
**做什么**：客户端首页和款式浏览页
**涉及页面**：
- pages/index/（首页：Banner轮播 + 4个分类入口 + 热门款式卡片 + 信任板块）
- pages/style-list/（款式列表：分类筛选 + 款式卡片网格列表）
- components/order-card/（款式卡片组件复用）

**做完效果**：能看到一个有品牌感的首页，点击分类或款式卡片能进入列表页

---

### Step 3：款式详情 + 布料选择
**做什么**：款式详情页和布料选择页
**涉及页面**：
- pages/style-detail/（图片轮播 + 款式信息 + 领型/扣数等选项 + 布料选择入口）
- pages/fabric-list/（布料分类Tab + 布料卡片 + 详情弹窗）
- components/price/（价格显示组件）

**做完效果**：能浏览款式详情，选择款式选项和布料，价格实时更新

---

### Step 4：下单页 + 模拟支付
**做什么**：完整下单流程，连接云函数
**涉及页面**：
- pages/order-create/（地址填写 + 预约时间 + 指定量体师 + 价格明细 + 定金支付）
- pages/order-list/（订单列表基础版）
- pages/order-detail/（订单详情基础版）

**涉及云函数**：
- api/actions/order.js（create, list, detail）
- api/actions/payment.js（模拟支付逻辑）

**做完效果**：能完成"选款 → 选布料 → 下单 → 支付定金 → 看到订单"全流程

---

### Step 5：量体师工作台
**做什么**：量体师端首页和接单流程
**涉及页面**：
- tailor/index/（工作台：待服务数、新订单提醒、近期订单、收入概览）
- tailor/order-accept/（接单详情：客户信息 + 地址 + 接受/拒绝）
- tailor/navigate/（一键导航 + GPS签到）
- role-switch/（身份切换页）

**做完效果**：量体师能看到待办订单，能接单/拒单，能导航到客户地址

---

### Step 6：量体数据录入 + 客户签名
**做什么**：量体核心功能
**涉及页面**：
- tailor/measure-input/（19项数据表单，每项有示意图 + 范围校验）
- tailor/measure-submit/（数据汇总展示 + 客户Canvas签名）
- components/image-upload/（拍照上传组件）
- components/signature/（电子签名Canvas组件）
- pages/measure-confirm/（客户端查看量体数据 + 签名确认）

**做完效果**：量体师能录入完整量体数据，客户能查看并电子签名确认

---

### Step 7：代理工作台 + 订单分派
**做什么**：校园代理核心运营功能
**涉及页面**：
- agent/index/（工作台：数据卡片 + 待处理 + 快捷入口）
- agent/order-dispatch/（待分派列表 + 自己量/分派量体师选择）
- agent/promo-code/（专属推广码生成 + 分享）
- agent/customer-list/（客户列表管理）
- agent/order-proxy/（代客下单流程）

**做完效果**：代理能看本校订单，能决定自己量或分派给量体师，能生成推广码

---

### Step 8：代理团队管理 + 佣金
**做什么**：代理的团队和收入功能
**涉及页面**：
- agent/team/（团队成员列表）
- agent/team-recruit/（招募下级代理 + 审核申请）
- agent/performance/（业绩看板：个人 + 团队数据）
- agent/commission/（佣金明细 + 提现）

**做完效果**：代理能招募管理下级，能查看业绩和佣金收入

---

### Step 9：订单全流程 + 个人中心 + 身份切换
**做什么**：把客户端的订单全生命周期补齐，完善个人中心
**涉及页面**：
- pages/order-detail/ 完善（状态时间轴 + 各状态对应操作按钮）
- pages/profile/ 完善（身材档案、地址管理、帮助中心、联系客服）
- role-switch/ 完善（支持客户↔量体师↔代理三种角色切换）
- tailors/income/ 完善（量体师收入中心）

**做完效果**：订单从下单到完成的全流程在小程序内可追踪，三种角色可切换使用

---

### Step 10：Web管理后台
**做什么**：Vue3 + Element Plus 搭建管理后台
**涉及模块**：
- 登录页 + 布局框架（侧边栏 + 顶栏 + 内容区）
- 订单管理（列表 + 详情 + 状态干预）
- 量体师管理（列表 + 审核）
- 代理管理（列表 + 审核 + 团队层级 + 佣金费率）
- 款式/布料管理（CRUD）
- 财务统计 + 数据看板（Chart.js 图表）
- 系统设置（全局参数配置）

**做完效果**：老板能在Web端管理全量数据，看到财务统计和业务看板

---

## 四、关键设计决策

| 决策点 | 方案 | 为什么 |
|--------|------|--------|
| 多角色方案 | 一套小程序 + 角色权限控制 | 降低开发成本，用户不需要下载多个小程序 |
| 云函数架构 | 单入口路由模式 | 减少部署数量，统一鉴权，降低冷启动 |
| 金额存储 | 统一用"分"（整数） | 避免浮点精度问题，显示时转为元 |
| 支付方案 | 先模拟，后接微信支付 | 微信支付需要商户号资质，前期不阻塞开发 |
| 代理层级 | 仅一层下级 | 管理简单，避免传销风险，够用 |
| 图片方案 | 先占位图，后替换 | 前期专注功能逻辑，不影响界面开发 |
| TabBar方案 | 客户端4Tab + 量体师3Tab + 代理4Tab | 通过角色切换动态设置 tabBar |

---

## 五、每个角色怎么用

### 客户（学生）
1. 扫代理推广码或直接搜索进入小程序
2. 首页浏览款式 → 点击感兴趣的衣服
3. 款式详情页选领型/扣数 → 选布料
4. 填写地址、预约时间 → 支付定金（30%）
5. 等待量体师上门 → 查看量体数据 → 电子签名确认
6. 查看订单进度 → 收到货 → 确认收货 → 支付尾款
7. 如有不合身 → 申请售后

### 量体师（兼职学生）
1. 进入小程序 → 切换到量体师身份
2. 工作台看到新订单 → 接单
3. 导航到客户地址 → GPS签到
4. 录入19项量体数据 → 拍照 → 提交
5. 客户签名确认 → 完成
6. 月底查看收入 → 提现

### 校园代理（校园创业者）
1. 进入小程序 → 切换到代理身份（或申请成为代理）
2. 生成推广码 → 分享到朋友圈/社团群
3. 收到新订单 → 决定自己量 or 分派给量体师
4. 管理下级代理 → 查看团队业绩
5. 月底查看佣金 → 提现

### 老板（你）
1. 打开Web管理后台
2. 审核量体师和代理入驻申请
3. 上架新款式和布料
4. 查看全量订单进度，异常时人工干预
5. 查看财务报表，管理结算
6. 调整佣金费率等全局参数

---

> **下一步**：确认这个整体方案没有问题后，我们就从 **Step 1：项目骨架搭建** 开始。
