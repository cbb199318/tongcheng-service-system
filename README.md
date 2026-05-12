# 同城服务管理系统

基于论文《基于SpringBoot同城服务管理系统的设计与实现》整理并落地的一期演示工程，包含：

- `backend/`：Spring Boot 2.7 + MyBatis-Plus + JWT + H2/MySQL profile
- `frontend/`：轻量三门户前端页面（用户端、商家端、管理端）
- 根目录论文与设计文档：产品、接口、数据库设计说明

## 目录结构

```text
backend/   后端 API、数据库初始化、鉴权与业务逻辑
frontend/  三门户静态前端页面
```

## 默认技术实现

- 后端：SpringBoot 2.7、MyBatis-Plus、JWT、H2(MySQL 模式)
- 前端：Vue 2、Element UI、Axios（CDN 方式加载）
- 预留能力：积分兑换、人员招募、服务沟通

## 启动方式

### 1. 启动后端

```bash
cd backend
mvn spring-boot:run
```

默认启动在 `http://127.0.0.1:8080`

说明：

- 默认 profile 使用 H2 文件库，便于本地直接演示
- H2 控制台：`http://127.0.0.1:8080/h2-console`
- 如需切换到 MySQL，可自行补充数据库并使用 `application-mysql.yml`

### 2. 打开前端

可直接打开以下页面，或通过任意静态文件服务器访问：

- `frontend/index.html`
- `frontend/user.html`
- `frontend/merchant.html`
- `frontend/admin.html`

如果你希望通过本地静态服务访问，可在 `frontend/` 目录下执行：

```bash
python3 -m http.server 3000
```

然后访问 `http://127.0.0.1:3000`

## 演示账号

- 用户端：`user01 / 123456`
- 商家端：`merchant01 / 123456`
- 管理端：`admin / 123456`

## 已实现核心能力

### 用户端

- 注册、登录
- 首页数据、分类列表、服务列表、服务详情
- 预约下单、模拟支付、取消订单
- 订单列表/详情、服务评价
- 商家入驻申请
- 积分能力预留接口

### 商家端

- 商家登录
- 商家资料查看与更新
- 服务新增、编辑、上下架、删除
- 订单接单、拒单、开始服务、完成服务
- 评价回复
- 招募/沟通扩展入口

### 管理端

- 管理员登录
- 用户管理
- 商家审核、服务审核
- 分类管理、公告管理、轮播图管理
- 订单监管
- 统计面板、订单趋势、分类占比

## 测试

```bash
cd backend
mvn test
```
