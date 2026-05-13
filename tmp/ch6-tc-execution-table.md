# 论文 TC001–TC018 执行表

## 用户端
| 编号 | 功能模块 | 前置条件 | 输入数据 | 预期结果 | 实际结果 | 结论 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC001 | 用户注册 | 进入用户注册页，未登录 | 用户名 `zhangsan_665469`、密码 `123456` | 注册成功，跳转至登录页 | 注册成功并跳转登录页，随后接口登录验证成功 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-test-artifacts/screenshots/tc001_register_success.png` |
| TC002 | 用户登录 | 用户账号存在 | 用户名 `user01`、密码 `123456` | 登录成功，进入首页 | 登录成功，进入首页推荐区 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/03_home_after_login.png` |
| TC003 | 服务搜索 | 已登录用户端 | 关键词 `保洁` | 显示保洁相关服务列表 | 搜索后展示 1 条保洁相关服务卡片 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/05_services_list.png` |
| TC004 | 服务预约 | 已登录，存在可预约服务 | 日期 `2026-05-14`、时段 `下午 (14:00-18:00)`、地址 `济南市历下区测试街道 88 号` | 创建订单成功，跳转支付页 | 订单创建成功，跳转支付页 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/08_order_pay.png` |
| TC005 | 订单支付 | 已创建待支付订单 | 点击确认支付 | 支付成功，订单状态更新为待接单 | 支付成功，订单列表定位到待接单页签 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/09_orders_list.png` |
| TC006 | 服务评价 | 存在已完成订单 | 评分 `5` 星、评价内容 `服务很好` | 评价提交成功，页面显示评价信息 | 评价成功，订单评价流程闭环完成 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/11_review_page.png` |

说明：论文 `TC004` 示例使用 `2026.04.15 / 上午 / 北京市朝阳区`，本轮为保证当前本地演示数据可重复执行，使用了等价有效的本地测试日期与地址。

## 商家端
| 编号 | 功能模块 | 前置条件 | 输入数据 | 预期结果 | 实际结果 | 结论 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC007 | 商家登录 | 商家账号存在 | 用户名 `merchant01`、密码 `123456` | 登录成功，进入商家后台 | 登录成功，进入控制台 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/02_dashboard_after_login.png` |
| TC008 | 服务添加 | 已登录商家端 | 服务名 `日常保洁`、价格 `99` 元 | 服务添加成功，待审核状态 | 新增服务成功，提示“服务已提交” | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/06_service_editor.png` |
| TC009 | 订单接单 | 存在待接单订单 | 选择待接单订单，点击接单 | 订单状态更新为已接单 | 接单成功，状态进入已接单 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/08_order_accept.png` |
| TC010 | 订单拒单 | 存在待接单订单 | 点击拒单并填写原因 | 订单状态更新为已取消 | 拒单成功；空原因校验也已生效 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/11_order_reject.png` |
| TC011 | 开始服务 | 存在已接单订单 | 选择已接单订单，点击开始服务 | 订单状态更新为服务中 | 提示“已开始服务”，状态流转为服务中 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/09_order_start.png` |
| TC012 | 评价回复 | 存在待回复评价 | 选择未回复评价，填写回复内容 | 回复提交成功，显示在评价列表 | 回复成功，评价管理列表刷新 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/14_review_reply_dialog.png` |

## 管理端
| 编号 | 功能模块 | 前置条件 | 输入数据 | 预期结果 | 实际结果 | 结论 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC013 | 管理员登录 | 管理员账号存在 | 用户名 `admin`、密码 `123456` | 登录成功，进入管理后台 | 登录成功并进入统计页 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/02_dashboard_after_login.png` |
| TC014 | 用户禁用 | 用户列表存在可操作用户 | 选择用户，点击禁用 | 用户状态更新为禁用 | 禁用成功，列表状态刷新 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/18_user_disabled.png` |
| TC015 | 商家审核通过 | 存在待审核商家 | 选择待审核商家，点击通过 | 商家审核状态更新为已通过 | 商家详情页审核状态更新为已通过 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-test-artifacts/screenshots/tc015_merchant_approve_success.png` |
| TC016 | 商家审核驳回 | 存在待审核商家 | 选择待审核商家，点击驳回并填写原因 | 商家审核状态更新为已驳回 | 驳回成功；空原因校验也已生效 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/07_merchant_rejected_after_submit.png` |
| TC017 | 服务分类添加 | 已登录管理端 | 分类名 `搬家服务-665470`、排序 `1` | 分类添加成功，列表显示新分类 | 分类保存成功，列表出现新增记录 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-test-artifacts/screenshots/tc017_category_create_success.png` |
| TC018 | 公告发布 | 已登录管理端 | 标题 `系统升级通知-665470`、内容 `将于今晚维护` | 公告发布成功，用户端首页显示 | 公告保存成功，管理端列表新增且用户首页接口同步返回 | 通过 | `/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-test-artifacts/screenshots/tc018_notice_create_success.png` |

说明：论文 `TC013` 示例密码写为 `admin123`，但当前项目实际种子账号密码为 `123456`，因此本轮按真实可登录数据执行并记录。
