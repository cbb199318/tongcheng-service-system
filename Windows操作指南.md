# 同城服务管理系统 Windows 操作指南

本文档面向 Windows 环境，说明当前项目需要什么环境、如何配置环境、以及如何把项目成功启动起来。

## 1. 项目实际技术栈

当前仓库的实际运行方式如下：

- 后端：`Spring Boot 2.7.18`
- JDK：`17`
- 构建工具：`Maven`
- 数据库：默认使用 `H2 文件数据库（MySQL 兼容模式）`
- 前端：`Vue 2 + Element UI + Axios`，采用静态页面方式运行
- 前端启动方式：本地静态文件服务
- 默认端口：
  - 后端：`8080`
  - 前端：`3000`

## 2. Windows 需要准备的环境

建议安装以下环境：

1. `Git`
2. `JDK 17`
3. `Maven 3.8+` 或 `3.9+`
4. `Python 3.10+`
5. `Chrome` 浏览器

说明：

- 当前项目默认使用 `H2`，所以本地演示时不需要先装 MySQL。
- 当前项目虽然配置了 `Redis`，但现版本默认演示流程不依赖 Redis 才能启动，所以 Windows 首次运行时可以先不装 Redis。
- 如果你只是运行项目，不需要安装 Node.js。

## 3. 环境安装建议

### 3.1 安装 Git

下载并安装：

- [Git for Windows](https://git-scm.com/download/win)

安装完成后，在 `PowerShell` 或 `CMD` 里执行：

```powershell
git --version
```

如果能看到版本号，说明 Git 安装成功。

### 3.2 安装 JDK 17

推荐安装：

- [Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17)

安装完成后执行：

```powershell
java -version
javac -version
```

应看到 `17` 相关版本信息。

如果没有生效，检查环境变量：

- `JAVA_HOME` 指向 JDK 安装目录
- `Path` 中包含 `%JAVA_HOME%\bin`

### 3.3 安装 Maven

下载：

- [Apache Maven](https://maven.apache.org/download.cgi)

推荐下载 zip 包后解压，例如：

```text
C:\dev\apache-maven-3.9.9
```

然后配置环境变量：

- `MAVEN_HOME=C:\dev\apache-maven-3.9.9`
- `Path` 增加 `%MAVEN_HOME%\bin`

验证：

```powershell
mvn -version
```

如果输出中能看到 `Java version: 17`，说明 Maven 和 JDK 配置都正常。

### 3.4 安装 Python

下载：

- [Python for Windows](https://www.python.org/downloads/windows/)

安装时勾选：

- `Add python.exe to PATH`

验证：

```powershell
python --version
```

如果你的系统命令是 `py`，也可以执行：

```powershell
py --version
```

## 4. 获取项目

如果你已经拿到了项目目录，可以跳过这一步。

如果需要从 Git 拉取：

```powershell
git clone <你的仓库地址>
cd tongcheng-service-system
```

## 5. 首次启动前需要知道的事情

当前项目默认配置在：

- 后端配置文件：
  [backend/src/main/resources/application.yml](/Users/caobingbing/workspace/tongcheng-service-system/backend/src/main/resources/application.yml)

其中关键配置是：

- 服务端口：`8080`
- 数据源：`jdbc:h2:file:./data/tongcheng`
- H2 控制台：`/h2-console`
- 上传目录：`uploads`

这意味着：

1. 首次运行后端时，会自动初始化数据库表和演示数据。
2. 本地不需要单独创建数据库。
3. 数据文件会写到项目运行目录下的 `data/`。

## 6. Windows 启动项目

建议按“先后端、再前端”的顺序启动。

### 6.1 启动后端

打开 `PowerShell`，进入后端目录：

```powershell
cd 你的项目路径\backend
mvn spring-boot:run
```

例如：

```powershell
cd D:\workspace\tongcheng-service-system\backend
mvn spring-boot:run
```

启动成功后，你会看到类似信息：

```text
Tomcat started on port(s): 8080
Started TongchengServiceApplication
```

说明后端已经成功运行。

后端访问地址：

- 首页接口基地址：`http://127.0.0.1:8080`
- H2 控制台：`http://127.0.0.1:8080/h2-console`

### 6.2 启动前端

新开一个 `PowerShell` 窗口，进入前端目录：

```powershell
cd 你的项目路径\frontend
python -m http.server 3000
```

如果你本机命令是 `py`，可以用：

```powershell
py -m http.server 3000
```

启动成功后，访问：

- 门户首页：`http://127.0.0.1:3000`

## 7. 系统入口

前端启动后，可以使用以下地址进入系统：

- 门户首页：`http://127.0.0.1:3000/index.html`
- 用户端：`http://127.0.0.1:3000/user.html#/login`
- 商家工作台：`http://127.0.0.1:3000/merchant.html#/login`
- 管理端：`http://127.0.0.1:3000/admin.html#/login`

说明：

- 服务人员不再使用独立门户。
- 服务人员从商家工作台登录页进入，切换到“员工登录”即可。

## 8. 演示账号

当前默认演示账号如下：

- 用户：`user01 / 123456`
- 商家：`merchant01 / 123456`
- 员工：`staff1_1 / 123456`
- 管理员：`admin / 123456`

说明：

- 员工账号请从 `merchant.html#/login` 页面切换“员工登录”后使用。

## 9. 推荐启动顺序

每次演示建议按下面顺序：

1. 启动后端
2. 确认 `http://127.0.0.1:8080` 可访问
3. 启动前端静态服务
4. 打开 `http://127.0.0.1:3000/index.html`
5. 分别进入用户端、商家端、管理端验证

## 10. 常见问题

### 10.1 `mvn` 不是内部或外部命令

说明 Maven 没配好。

解决：

1. 确认 Maven 已安装
2. 确认 `MAVEN_HOME` 正确
3. 确认 `Path` 包含 `%MAVEN_HOME%\bin`
4. 重新打开终端再试

### 10.2 `java -version` 不是 17

说明 JDK 版本不对，或者 `JAVA_HOME` 没指向 JDK 17。

解决：

1. 安装 JDK 17
2. 修改 `JAVA_HOME`
3. 让 `Path` 优先使用 `%JAVA_HOME%\bin`

### 10.3 8080 端口被占用

执行：

```powershell
netstat -ano | findstr :8080
```

找到 PID 后结束进程：

```powershell
taskkill /PID 进程号 /F
```

然后重新启动后端。

### 10.4 3000 端口被占用

执行：

```powershell
netstat -ano | findstr :3000
```

找到 PID 后结束进程：

```powershell
taskkill /PID 进程号 /F
```

然后重新启动前端。

### 10.5 前端打开后一片空白

优先检查：

1. 后端是否真的启动成功
2. 前端是否通过 `http.server` 打开的，而不是直接双击 html
3. 浏览器控制台是否有接口报错
4. `http://127.0.0.1:8080` 是否可访问

建议不要直接双击本地 html 文件运行，优先使用静态服务器方式。

### 10.6 H2 控制台连不上

确认后端已启动，然后访问：

- `http://127.0.0.1:8080/h2-console`

默认连接信息按 `application.yml` 填：

- Driver Class：`org.h2.Driver`
- JDBC URL：`jdbc:h2:file:./data/tongcheng;MODE=MySQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE`
- User Name：`sa`
- Password：留空

## 11. 可选操作

### 11.1 运行后端测试

进入后端目录：

```powershell
cd 你的项目路径\backend
mvn test
```

### 11.2 查看自动化测试脚本

当前仓库里已经有一些测试脚本，位于：

- [tmp/user_portal_cdp_test.py](/Users/caobingbing/workspace/tongcheng-service-system/tmp/user_portal_cdp_test.py)
- [tmp/merchant_portal_cdp_test.py](/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant_portal_cdp_test.py)
- [tmp/staff_merged_portal_test.py](/Users/caobingbing/workspace/tongcheng-service-system/tmp/staff_merged_portal_test.py)
- [tmp/admin-test-artifacts/admin_portal_cdp_test.py](/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts/admin_portal_cdp_test.py)

这些脚本主要用于开发和回归测试，不是项目启动的前置条件。

## 12. 最简启动方案

如果你只想最快把项目跑起来，照这 4 步做：

1. 安装 `JDK 17`
2. 安装 `Maven`
3. 安装 `Python`
4. 执行下面两组命令

后端：

```powershell
cd 你的项目路径\backend
mvn spring-boot:run
```

前端：

```powershell
cd 你的项目路径\frontend
python -m http.server 3000
```

然后打开：

```text
http://127.0.0.1:3000/index.html
```

如果你愿意，我下一步可以继续帮你补一版：

- “Windows 一键启动说明”
- 或者 “给老师/评审用的傻瓜式启动手册”
