# 同城服务管理系统

基于论文《基于SpringBoot同城服务管理系统的设计与实现》整理并落地的一期演示工程，包含：

- `backend/`：Spring Boot 2.7 + MyBatis-Plus + JWT + MySQL/H2 profile
- `frontend/`：标准 Vue 2 工程，统一承载用户端、商家端、管理端
- 根目录论文与设计文档：产品、接口、数据库设计说明

## 目录结构

```text
backend/   后端 API、数据库初始化、鉴权与业务逻辑
frontend/  Vue 2 前端工程（npm run serve）
```

## 默认技术实现

- 后端：SpringBoot 2.7、MyBatis-Plus、JWT、MySQL 8.0
- 前端：Vue 2、Vue Router、Element UI、Axios、Vue CLI
- 预留能力：积分兑换、人员招募、服务沟通

## 启动方式

### 1. 启动后端

```bash
cd backend
mvn spring-boot:run
```

默认启动在 `http://127.0.0.1:8080`

说明：

- 默认数据源已切换为 MySQL
- 默认连接参数：
  - 主机：`127.0.0.1`
  - 端口：`3306`
  - 数据库：`tongcheng_service_system`
  - 用户名：`root`
  - 密码：`root`
- 程序会自动建库并执行 `schema.sql`、`data.sql`
- 如本机 MySQL 用户名或密码不同，可通过环境变量覆盖：
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_DATABASE`
  - `MYSQL_USERNAME`
  - `MYSQL_PASSWORD`
- 如需回退到 H2，可使用：

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run serve
```

默认启动在 `http://127.0.0.1:3000`

主入口与兼容入口：

- 门户首页：`http://127.0.0.1:3000`
- 用户端：`http://127.0.0.1:3000/#/user/home`
- 商家端：`http://127.0.0.1:3000/#/merchant/login`
- 管理端：`http://127.0.0.1:3000/#/admin/login`
- 兼容旧入口：`/user.html`、`/merchant.html`、`/admin.html`、`/staff.html`

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
- 员工账号登录、员工管理、订单分配、订单沟通

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
