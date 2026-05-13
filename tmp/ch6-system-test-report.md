# 第六章系统测试报告（落地版）

## 6.1 测试目的
本轮测试严格按论文第六章口径执行，目标是验证同城服务管理系统三端核心业务是否满足论文定义的功能需求、界面要求和兼容性要求，并给出可直接用于答辩的证据材料。

本轮重点验证三类内容：

- 功能测试：覆盖论文 `TC001–TC018` 的三端核心用例。
- 界面测试：覆盖用户端、商家端、管理端核心页面的可访问性、布局完整性和交互可用性。
- 兼容性测试：以 Chrome 为主执行器完成自动化回归，并如实记录 Firefox、Edge 的本机验证限制。

## 6.2 测试环境
### 论文原始环境说明
- 服务端：`JDK 1.8`、`MySQL 8.0`、`Redis 6.x`
- 部署方式：后端 Spring Boot 部署于 `Tomcat`，前端通过 `npm run serve` 启动
- 客户端：`Chrome / Firefox / Edge`
- 分辨率：`1920 × 1080`

### 本地复测环境
- 测试日期：`2026-05-13`
- 操作系统：`macOS`
- 后端：本地 `Spring Boot` 进程，端口 `8080`
- 数据库：项目当前默认本地文件数据库（启动日志显示 `jdbc:h2:file:./data/tongcheng`）
- 前端：本地静态页面服务，端口 `3000`
- 自动化执行器：`Google Chrome` CDP，调试端口 `9223`
- 数据基线：依赖 `DemoDataRepairRunner` 在后端重启后恢复答辩演示数据

说明：本地复测环境与论文原始环境存在差异，但测试目标、功能口径和通过判定标准保持一致。

### 测试账号与数据说明
- 用户端登录账号：`user01 / 123456`
- 商家端登录账号：`merchant01 / 123456`
- 管理端登录账号：`admin / 123456`
- 论文 `TC013` 示例输入写为 `admin / admin123`，但当前项目种子数据实际可用密码为 `123456`
- 论文 `TC001` 示例用户名写为 `zhangsan`，为保证多轮回归可重复执行，本轮使用带时间后缀的唯一用户名

## 6.3 测试方法
### 6.3.1 功能测试
- 采用黑盒测试方法。
- 用户端、商家端、管理端分别执行真实业务流程。
- 自动化脚本负责流程操作、关键断言和截图留档。
- 论文缺失覆盖项由专项补测脚本补齐。

本轮使用的主要脚本与日志：

- 用户端自动化脚本：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/user_portal_cdp_test.py`
- 商家端自动化脚本：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant_portal_cdp_test.py`
- 管理端自动化脚本：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/admin_portal_cdp_test.py`
- 第六章专项补测脚本：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6_supplemental_tc_checks.py`

执行策略：

- 按 `用户端 -> 重启后端恢复基线 -> 商家端 -> 重启后端恢复基线 -> 管理端 -> 补充 TC` 顺序执行
- 避免前一轮下单、接单、审核等操作污染后一轮测试数据

### 6.3.2 界面测试
- 对三端核心页面执行逐页检查。
- 重点确认页面无白屏、无明显错位、关键按钮可见可点击、表单/表格/分页/弹窗显示正常。
- 结果主要来自三端自动化截图目录。

### 6.3.3 兼容性测试
- Chrome：执行完整自动化回归。
- Firefox / Edge：论文要求人工冒烟验证，但本机未安装对应浏览器，无法完成真实复测。

本机浏览器可用性检查结果：

- `Google Chrome`：已安装，可执行
- `Firefox`：未安装
- `Microsoft Edge`：未安装

因此，本报告中的兼容性结论仅能确认 Chrome 环境通过，Firefox / Edge 需后续在具备浏览器环境的机器上补测。

## 6.4 测试用例与执行结果
### 6.4.1 论文功能测试结果汇总
论文定义的功能用例共 `18` 条，本轮实际执行 `18` 条，通过 `18` 条，失败 `0` 条，通过率 `100%`。

详细执行表见：

- `/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-tc-execution-table.md`

### 6.4.2 补充验证结果
除论文 `TC001–TC018` 外，本轮还对答辩演示所需但论文表格未单列的页面和功能做了补充验证。

用户端补充验证通过项：

- 商家入驻页可访问，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/12_merchant_apply.png`
- 积分页可访问，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/13_points_page.png`
- 订单详情页结构完整，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts/screenshots/10_order_detail.png`

商家端补充验证通过项：

- 控制台核心指标可见，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/03_dashboard_full.png`
- 商家信息页结构完整，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/04_merchant_info.png`
- 订单详情页结构化展示，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts/screenshots/12_order_detail.png`

管理端补充验证通过项：

- 统计页核心区块完整，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/03_dashboard_full.png`
- 服务审核驳回校验与提交可用，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/10_service_reject_validation.png`、`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/11_service_rejected_after_submit.png`
- 订单监管筛选与详情可用，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/13_orders_filter_by_no.png`、`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/15_orders_filter_by_date.png`、`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/16_order_detail.png`
- 轮播图表单校验可用，证据：`/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/screenshots/23_banner_validation.png`

### 6.4.3 后端服务层回归结果
作为界面自动化之外的接口级补充验证，本轮读取了现有后端测试报告：

- `AdminPortalServiceTests`：`3/3` 通过
- `MerchantPortalServiceTests`：`3/3` 通过
- `DemoDataRepairRunnerTests`：`2/2` 通过

测试报告来源：

- `/Users/caobingbing/workspace/tongcheng-service-system/backend/target/surefire-reports/TEST-com.tongcheng.system.AdminPortalServiceTests.xml`
- `/Users/caobingbing/workspace/tongcheng-service-system/backend/target/surefire-reports/TEST-com.tongcheng.system.MerchantPortalServiceTests.xml`
- `/Users/caobingbing/workspace/tongcheng-service-system/backend/target/surefire-reports/TEST-com.tongcheng.system.DemoDataRepairRunnerTests.xml`

## 6.5 测试结论
### 功能结论
- 论文 `TC001–TC018` 共 `18` 条功能用例全部通过。
- 用户端的注册、登录、搜索、预约、支付、评价主流程可稳定跑通。
- 商家端的登录、服务新增、接单、拒单、开始服务、评价回复主流程可稳定跑通。
- 管理端的登录、用户禁用、商家审核通过、商家审核驳回、分类新增、公告发布主流程可稳定跑通。

### 界面结论
- 三端核心页面均可独立访问，无白屏。
- 页面主模块、表单区、表格区、分页区和状态反馈均可正常展示。
- 当前页面已达到答辩演示可用水平。

### 兼容性结论
- Chrome 环境已完成完整自动化回归并通过。
- Firefox、Edge 因本机未安装浏览器，未能完成论文要求的真实兼容性复测。
- 因此，本轮只能确认“Chrome 兼容通过，Firefox / Edge 待补人工冒烟验证”，不能直接复述论文原文中的“三浏览器均已验证通过”。

### 最终判断
- 若以论文功能测试 `TC001–TC018` 为验收基准：当前项目测试通过率为 `100%`。
- 若以论文第六章完整口径为验收基准：功能测试与界面测试已满足答辩演示要求，兼容性测试尚缺 Firefox / Edge 的环境级复测。
- 综合判断：当前版本 **满足答辩演示与本地上线演示要求**；若要完全复刻论文 6.5 中“三主流浏览器均验证通过”的结论，还需补充 Firefox 和 Edge 的人工兼容性测试。
