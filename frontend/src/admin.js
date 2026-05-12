(function () {
  const api = axios.create({ baseURL: 'http://127.0.0.1:8080' });

  new Vue({
    el: '#admin-app',
    template: `
      <div class="admin-shell">
        <template v-if="!token">
          <div class="auth-screen">
            <div class="auth-card">
              <div class="auth-brand">
                <div class="auth-logo" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);">A</div>
                <h1 style="color:#1d4ed8;">平台管理端</h1>
                <p>登录后进入论文样例风格后台，查看审核、内容管理与统计面板。</p>
              </div>
              <el-form :model="loginForm" label-position="top">
                <el-form-item label="用户名"><el-input v-model="loginForm.username" prefix-icon="el-icon-user-solid"></el-input></el-form-item>
                <el-form-item label="密码"><el-input v-model="loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
                <el-button class="auth-submit" type="primary" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);" @click="login">登录后台</el-button>
              </el-form>
              <div class="auth-footnote">演示账号：admin / 123456</div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="backoffice-header">
            <div class="backoffice-header-inner">
              <div class="backoffice-title">
                <div class="backoffice-kicker">Admin Console</div>
                <h1>同城服务系统后台</h1>
                <p>参考论文截图的管理后台布局，统一展示用户、商家、服务、订单与统计。</p>
              </div>
              <div class="backoffice-userbox">
                <div>
                  <strong>系统管理员</strong>
                  <span>今日订单 {{ stats.todayOrders || 0 }} · 待审核 {{ stats.pendingAudit || 0 }}</span>
                </div>
                <el-button type="text" @click="goHome">门户</el-button>
                <el-button type="text" @click="logout">退出</el-button>
              </div>
            </div>
          </div>

          <div class="backoffice-layout">
            <div class="backoffice-sidebar">
              <div class="account-card">
                <h3>后台概览</h3>
                <p>围绕论文一期范围，聚焦审核、内容维护、订单监管和统计展示。</p>
                <div class="metric-inline">
                  <el-tag size="mini" type="success">用户 {{ users.list.length }}</el-tag>
                  <el-tag size="mini" type="warning">商家 {{ merchants.list.length }}</el-tag>
                  <el-tag size="mini">订单 {{ orders.list.length }}</el-tag>
                </div>
              </div>

              <div class="backoffice-menu">
                <div class="backoffice-menu-title">功能导航</div>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'dashboard' }" @click="switchTab('dashboard')">统计面板</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'users' }" @click="switchTab('users')">用户管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'merchants' }" @click="switchTab('merchants')">商家审核</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'services' }" @click="switchTab('services')">服务审核</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'categories' }" @click="switchTab('categories')">分类管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'notices' }" @click="switchTab('notices')">公告管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'banners' }" @click="switchTab('banners')">轮播图管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'orders' }" @click="switchTab('orders')">订单监管</el-button>
              </div>
            </div>

            <div class="backoffice-panel">
              <template v-if="activeTab === 'dashboard'">
                <div class="panel-section-title">
                  <div>
                    <h3>统计面板</h3>
                    <p>使用近似论文截图的趋势图、分类环图和排行条形展示。</p>
                  </div>
                </div>

                <div class="stat-grid">
                  <div class="stat-card stat-blue"><span>今日订单量</span><strong>{{ stats.todayOrders || 0 }}</strong></div>
                  <div class="stat-card stat-orange"><span>今日成交额</span><strong>￥{{ stats.todayAmount || 0 }}</strong></div>
                  <div class="stat-card stat-green"><span>注册用户数</span><strong>{{ stats.totalUsers || 0 }}</strong></div>
                  <div class="stat-card stat-violet"><span>待审核数</span><strong>{{ stats.pendingAudit || 0 }}</strong></div>
                </div>

                <div class="dashboard-charts">
                  <div class="chart-card">
                    <h3>近 7 日订单趋势</h3>
                    <div class="line-chart-placeholder">
                      <div class="line-bar" v-for="item in orderTrend" :key="item.date" :style="{ height: trendHeight(item.count) }">
                        <span>{{ shortDate(item.date) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="chart-card">
                    <h3>服务分类订单占比</h3>
                    <div class="donut-wrap">
                      <div class="donut-chart" :style="{ background: donutStyle }"></div>
                      <ul class="donut-legend">
                        <li v-for="(item, index) in categoryRate" :key="item.categoryName">
                          <span class="legend-dot" :style="{ background: donutColors[index % donutColors.length] }"></span>
                          <span>{{ item.categoryName }} {{ item.count }}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div class="chart-card rank-card">
                  <h3>商家订单排行 TOP5</h3>
                  <div v-if="merchantRanks.length">
                    <div class="rank-row" v-for="item in merchantRanks" :key="item.name">
                      <span>{{ item.name }}</span>
                      <div class="rank-bar"><div class="rank-bar-inner" :style="{ width: rankWidth(item.count) }"></div></div>
                      <strong>{{ item.count }}</strong>
                    </div>
                  </div>
                  <div v-else class="mini-empty">暂无排行数据</div>
                </div>
              </template>

              <template v-if="activeTab === 'users'">
                <div class="panel-section-title">
                  <div>
                    <h3>用户管理</h3>
                    <p>参考论文中的用户列表页样式，支持按关键词、角色和状态筛选。</p>
                  </div>
                </div>

                <div class="list-toolbar">
                  <el-input v-model="userFilters.keyword" placeholder="搜索用户名/昵称/手机号"></el-input>
                  <el-select v-model="userFilters.role" clearable placeholder="全部角色">
                    <el-option label="用户" value="user"></el-option>
                    <el-option label="商家" value="merchant"></el-option>
                    <el-option label="管理员" value="admin"></el-option>
                    <el-option label="服务人员" value="staff"></el-option>
                  </el-select>
                  <el-select v-model="userFilters.status" clearable placeholder="全部状态">
                    <el-option label="正常" value="1"></el-option>
                    <el-option label="禁用" value="0"></el-option>
                  </el-select>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredUsers" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column label="用户信息" min-width="260">
                      <template slot-scope="scope">
                        <div class="row-title">
                          <span class="row-avatar">{{ avatarText(scope.row.nickname || scope.row.username) }}</span>
                          <div>
                            <div>{{ scope.row.nickname || scope.row.username }}</div>
                            <div class="row-subtext">{{ scope.row.username }}</div>
                          </div>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column prop="phone" label="手机号" width="150"></el-table-column>
                    <el-table-column label="角色" width="110">
                      <template slot-scope="scope"><el-tag size="mini" type="primary">{{ roleText(scope.row.role) }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.status === 1 ? '正常' : '禁用' }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="注册时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="120">
                      <template slot-scope="scope">
                        <span class="action-link" v-if="scope.row.status !== 1" @click="toggleUser(scope.row, 1)">启用</span>
                        <span class="action-link danger" v-else @click="toggleUser(scope.row, 0)">禁用</span>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'merchants'">
                <div class="panel-section-title">
                  <div>
                    <h3>商家审核</h3>
                    <p>按待审核、已通过、已驳回分组查看，风格贴近论文中的审核列表页。</p>
                  </div>
                </div>

                <div class="paper-toolbar-tabs">
                  <el-button size="mini" :type="merchantFilters.auditStatus === '0' ? 'primary' : 'default'" @click="merchantFilters.auditStatus = '0'">待审核</el-button>
                  <el-button size="mini" :type="merchantFilters.auditStatus === '2' ? 'primary' : 'default'" @click="merchantFilters.auditStatus = '2'">已通过</el-button>
                  <el-button size="mini" :type="merchantFilters.auditStatus === '1' ? 'primary' : 'default'" @click="merchantFilters.auditStatus = '1'">已驳回</el-button>
                  <el-button size="mini" :type="merchantFilters.auditStatus === '' ? 'primary' : 'default'" @click="merchantFilters.auditStatus = ''">全部</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredMerchants" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column prop="name" label="商家名称" min-width="180"></el-table-column>
                    <el-table-column prop="phone" label="联系电话" width="150"></el-table-column>
                    <el-table-column prop="address" label="地址" min-width="220"></el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="auditTagType(scope.row.auditStatus)">{{ auditText(scope.row.auditStatus) }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="申请时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="220">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="showMerchantDetail(scope.row.id)">查看详情</span>
                          <span class="action-link" @click="auditMerchant(scope.row, '2')">通过</span>
                          <span class="action-link danger" @click="auditMerchant(scope.row, '1')">驳回</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'services'">
                <div class="panel-section-title">
                  <div>
                    <h3>服务项目审核</h3>
                    <p>突出服务信息、分类、价格和审核动作，接近论文示例排版。</p>
                  </div>
                </div>

                <div class="paper-toolbar-tabs">
                  <el-button size="mini" :type="serviceFilters.auditStatus === '0' ? 'primary' : 'default'" @click="serviceFilters.auditStatus = '0'">待审核</el-button>
                  <el-button size="mini" :type="serviceFilters.auditStatus === '2' ? 'primary' : 'default'" @click="serviceFilters.auditStatus = '2'">已通过</el-button>
                  <el-button size="mini" :type="serviceFilters.auditStatus === '1' ? 'primary' : 'default'" @click="serviceFilters.auditStatus = '1'">已驳回</el-button>
                  <el-button size="mini" :type="serviceFilters.auditStatus === '' ? 'primary' : 'default'" @click="serviceFilters.auditStatus = ''">全部</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredServices" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column label="服务信息" min-width="300">
                      <template slot-scope="scope">
                        <div class="row-title">
                          <img class="row-thumb" :src="serviceCover(scope.row)" alt="service">
                          <div>
                            <div>{{ scope.row.name }}</div>
                            <div class="row-subtext">{{ serviceMerchantName(scope.row.merchantId) }}</div>
                          </div>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="分类" width="120">
                      <template slot-scope="scope">{{ categoryName(scope.row.categoryId) }}</template>
                    </el-table-column>
                    <el-table-column label="价格" width="110">
                      <template slot-scope="scope">￥{{ scope.row.price }}</template>
                    </el-table-column>
                    <el-table-column label="时长" width="110">
                      <template slot-scope="scope">{{ scope.row.duration || 60 }} 分钟</template>
                    </el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="auditTagType(scope.row.auditStatus)">{{ auditText(scope.row.auditStatus) }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="提交时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="220">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="showServiceDetail(scope.row.id)">查看详情</span>
                          <span class="action-link" @click="auditService(scope.row, '2')">通过</span>
                          <span class="action-link danger" @click="auditService(scope.row, '1')">驳回</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'categories'">
                <div class="panel-section-title">
                  <div>
                    <h3>分类管理</h3>
                    <p>维护前台服务分类，用于首页筛选和后台审核展示。</p>
                  </div>
                  <el-button type="primary" @click="openCategoryDialog()">新增分类</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="categories" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column prop="name" label="分类名称" min-width="180"></el-table-column>
                    <el-table-column prop="icon" label="图标" min-width="180"></el-table-column>
                    <el-table-column prop="sort" label="排序" width="100"></el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.status === 1 ? '启用' : '停用' }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="操作" width="180">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="openCategoryDialog(scope.row)">编辑</span>
                          <span class="action-link danger" @click="deleteCategory(scope.row.id)">删除</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'notices'">
                <div class="panel-section-title">
                  <div>
                    <h3>公告管理</h3>
                    <p>统一维护首页公告内容，支持新增、编辑和删除。</p>
                  </div>
                  <el-button type="primary" @click="openNoticeDialog()">新增公告</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="notices" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column prop="title" label="标题" min-width="220"></el-table-column>
                    <el-table-column prop="content" label="内容" min-width="320"></el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.status === 1 ? '发布中' : '已停用' }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="更新时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.updateTime || scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="180">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="openNoticeDialog(scope.row)">编辑</span>
                          <span class="action-link danger" @click="deleteNotice(scope.row.id)">删除</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'banners'">
                <div class="panel-section-title">
                  <div>
                    <h3>轮播图管理</h3>
                    <p>图片卡片和列表结合，接近论文中的轮播图维护页样式。</p>
                  </div>
                  <el-button type="primary" @click="openBannerDialog()">添加轮播图</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="banners" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column label="图片" width="180">
                      <template slot-scope="scope"><img class="row-thumb" style="width:150px;height:82px;" :src="scope.row.imageUrl" alt="banner"></template>
                    </el-table-column>
                    <el-table-column prop="title" label="标题" min-width="220"></el-table-column>
                    <el-table-column prop="sort" label="排序" width="100"></el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.status === 1 ? '启用' : '禁用' }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="操作" width="180">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="openBannerDialog(scope.row)">编辑</span>
                          <span class="action-link danger" @click="deleteBanner(scope.row.id)">删除</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'orders'">
                <div class="panel-section-title">
                  <div>
                    <h3>订单监管</h3>
                    <p>聚合订单编号、用户、商家、服务、金额与状态信息，便于答辩演示。</p>
                  </div>
                </div>

                <div class="list-toolbar">
                  <el-input v-model="orderFilters.keyword" placeholder="搜索订单编号"></el-input>
                  <el-select v-model="orderFilters.status" clearable placeholder="全部状态">
                    <el-option label="待支付" value="0"></el-option>
                    <el-option label="待接单" value="1"></el-option>
                    <el-option label="已接单" value="2"></el-option>
                    <el-option label="服务中" value="3"></el-option>
                    <el-option label="已完成" value="4"></el-option>
                    <el-option label="已取消" value="5"></el-option>
                  </el-select>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredOrders" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column prop="orderNo" label="订单编号" width="190"></el-table-column>
                    <el-table-column label="用户" width="140">
                      <template slot-scope="scope">{{ scope.row.user && (scope.row.user.nickname || scope.row.user.username) }}</template>
                    </el-table-column>
                    <el-table-column label="商家" width="180">
                      <template slot-scope="scope">{{ scope.row.merchant && scope.row.merchant.name }}</template>
                    </el-table-column>
                    <el-table-column label="服务" min-width="180">
                      <template slot-scope="scope">{{ scope.row.service && scope.row.service.name }}</template>
                    </el-table-column>
                    <el-table-column label="金额" width="110">
                      <template slot-scope="scope">￥{{ scope.row.totalPrice }}</template>
                    </el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope"><el-tag size="mini" :type="orderTagType(scope.row.status)">{{ orderStatusText(scope.row.status) }}</el-tag></template>
                    </el-table-column>
                    <el-table-column label="下单时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="100">
                      <template slot-scope="scope"><span class="action-link" @click="showOrderDetail(scope.row.id)">详情</span></template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>
            </div>
          </div>
        </template>

        <el-dialog title="分类编辑" :visible.sync="categoryDialogVisible" width="560px">
          <el-form :model="categoryForm" label-width="100px">
            <el-form-item label="名称"><el-input v-model="categoryForm.name"></el-input></el-form-item>
            <el-form-item label="图标"><el-input v-model="categoryForm.icon"></el-input></el-form-item>
            <el-form-item label="排序"><el-input v-model="categoryForm.sort"></el-input></el-form-item>
            <el-form-item label="状态">
              <el-select v-model="categoryForm.status" style="width:100%">
                <el-option label="启用" :value="1"></el-option>
                <el-option label="停用" :value="0"></el-option>
              </el-select>
            </el-form-item>
            <el-button type="primary" @click="saveCategory">保存</el-button>
          </el-form>
        </el-dialog>

        <el-dialog title="公告编辑" :visible.sync="noticeDialogVisible" width="620px">
          <el-form :model="noticeForm" label-width="100px">
            <el-form-item label="标题"><el-input v-model="noticeForm.title"></el-input></el-form-item>
            <el-form-item label="内容"><el-input type="textarea" :rows="6" v-model="noticeForm.content"></el-input></el-form-item>
            <el-form-item label="状态">
              <el-select v-model="noticeForm.status" style="width:100%">
                <el-option label="发布中" :value="1"></el-option>
                <el-option label="停用" :value="0"></el-option>
              </el-select>
            </el-form-item>
            <el-button type="primary" @click="saveNotice">保存</el-button>
          </el-form>
        </el-dialog>

        <el-dialog title="轮播图编辑" :visible.sync="bannerDialogVisible" width="620px">
          <el-form :model="bannerForm" label-width="100px">
            <el-form-item label="标题"><el-input v-model="bannerForm.title"></el-input></el-form-item>
            <el-form-item label="图片地址"><el-input v-model="bannerForm.imageUrl"></el-input></el-form-item>
            <el-form-item label="跳转链接"><el-input v-model="bannerForm.linkUrl"></el-input></el-form-item>
            <el-form-item label="排序"><el-input v-model="bannerForm.sort"></el-input></el-form-item>
            <el-form-item label="状态">
              <el-select v-model="bannerForm.status" style="width:100%">
                <el-option label="启用" :value="1"></el-option>
                <el-option label="禁用" :value="0"></el-option>
              </el-select>
            </el-form-item>
            <el-button type="primary" @click="saveBanner">保存</el-button>
          </el-form>
        </el-dialog>

        <el-dialog title="订单详情" :visible.sync="orderDialogVisible" width="720px">
          <pre class="soft-pre">{{ JSON.stringify(orderDetail, null, 2) }}</pre>
        </el-dialog>

        <el-dialog title="商家详情" :visible.sync="merchantDialogVisible" width="720px">
          <pre class="soft-pre">{{ JSON.stringify(currentMerchantDetail, null, 2) }}</pre>
        </el-dialog>

        <el-dialog title="服务详情" :visible.sync="serviceDialogVisible" width="720px">
          <pre class="soft-pre">{{ JSON.stringify(currentServiceDetail, null, 2) }}</pre>
        </el-dialog>
      </div>
    `,
    data() {
      return {
        token: localStorage.getItem('adminToken') || '',
        loginForm: { username: 'admin', password: '123456' },
        activeTab: 'dashboard',
        stats: {},
        orderTrend: [],
        categoryRate: [],
        users: { list: [] },
        merchants: { list: [] },
        services: { list: [] },
        categories: [],
        notices: [],
        banners: [],
        orders: { list: [] },
        userFilters: { keyword: '', role: '', status: '' },
        merchantFilters: { auditStatus: '0' },
        serviceFilters: { auditStatus: '0' },
        orderFilters: { keyword: '', status: '' },
        categoryDialogVisible: false,
        noticeDialogVisible: false,
        bannerDialogVisible: false,
        orderDialogVisible: false,
        merchantDialogVisible: false,
        serviceDialogVisible: false,
        orderDetail: null,
        currentMerchantDetail: null,
        currentServiceDetail: null,
        categoryForm: { id: null, name: '', icon: '', sort: 0, status: 1 },
        noticeForm: { id: null, title: '', content: '', status: 1 },
        bannerForm: { id: null, title: '', imageUrl: '', linkUrl: '', sort: 0, status: 1 },
        donutColors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
      };
    },
    computed: {
      filteredUsers() {
        return (this.users.list || []).filter(row => {
          const keyword = this.userFilters.keyword ? this.userFilters.keyword.trim().toLowerCase() : '';
          const matchKeyword = !keyword || [row.username, row.nickname, row.phone].some(item => String(item || '').toLowerCase().indexOf(keyword) > -1);
          const matchRole = !this.userFilters.role || row.role === this.userFilters.role;
          const matchStatus = this.userFilters.status === '' || String(row.status) === this.userFilters.status;
          return matchKeyword && matchRole && matchStatus;
        });
      },
      filteredMerchants() {
        return (this.merchants.list || []).filter(row => !this.merchantFilters.auditStatus || row.auditStatus === this.merchantFilters.auditStatus);
      },
      filteredServices() {
        return (this.services.list || []).filter(row => !this.serviceFilters.auditStatus || row.auditStatus === this.serviceFilters.auditStatus);
      },
      filteredOrders() {
        return (this.orders.list || []).filter(row => {
          const matchKeyword = !this.orderFilters.keyword || String(row.orderNo || '').indexOf(this.orderFilters.keyword.trim()) > -1;
          const matchStatus = this.orderFilters.status === '' || row.status === this.orderFilters.status;
          return matchKeyword && matchStatus;
        });
      },
      donutStyle() {
        const total = this.categoryRate.reduce((sum, item) => sum + Number(item.count || 0), 0);
        if (!total) {
          return 'conic-gradient(#e5edf9 0deg 360deg)';
        }
        let current = 0;
        const parts = this.categoryRate.map((item, index) => {
          const amount = Number(item.count || 0);
          const start = current;
          const end = current + (amount / total) * 360;
          current = end;
          const color = this.donutColors[index % this.donutColors.length];
          return color + ' ' + start + 'deg ' + end + 'deg';
        });
        return 'conic-gradient(' + parts.join(', ') + ')';
      },
      merchantRanks() {
        const counter = {};
        (this.orders.list || []).forEach(item => {
          const name = item.merchant && item.merchant.name ? item.merchant.name : '未知商家';
          counter[name] = (counter[name] || 0) + 1;
        });
        return Object.keys(counter).map(name => ({ name, count: counter[name] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
    },
    created() {
      if (this.token) {
        this.bootstrap();
      }
    },
    methods: {
      headers() {
        return { Authorization: 'Bearer ' + this.token };
      },
      request(method, url, data, auth = true) {
        return api({ method, url, data, headers: auth ? this.headers() : {} }).then(res => {
          if (res.data.code !== 200) throw new Error(res.data.message);
          return res.data.data;
        });
      },
      goHome() {
        window.location.href = './index.html';
      },
      login() {
        this.request('post', '/admin/auth/login', this.loginForm, false).then(data => {
          this.token = data.token;
          localStorage.setItem('adminToken', data.token);
          this.$message.success('登录成功');
          this.bootstrap();
        }).catch(err => this.$message.error(err.message));
      },
      logout() {
        this.token = '';
        localStorage.removeItem('adminToken');
        this.$message.success('已退出登录');
      },
      bootstrap() {
        this.fetchStats();
        this.fetchUsers();
        this.fetchMerchants();
        this.fetchServices();
        this.fetchCategories();
        this.fetchNotices();
        this.fetchBanners();
        this.fetchOrders();
      },
      switchTab(tab) {
        this.activeTab = tab;
        if (tab === 'dashboard') this.fetchStats();
        if (tab === 'users') this.fetchUsers();
        if (tab === 'merchants') this.fetchMerchants();
        if (tab === 'services') this.fetchServices();
        if (tab === 'categories') this.fetchCategories();
        if (tab === 'notices') this.fetchNotices();
        if (tab === 'banners') this.fetchBanners();
        if (tab === 'orders') this.fetchOrders();
      },
      fetchStats() {
        this.request('get', '/admin/statistics/overview').then(data => {
          this.stats = data;
        });
        this.request('get', '/admin/statistics/order-trend?days=7').then(data => {
          this.orderTrend = data;
        });
        this.request('get', '/admin/statistics/category-rate').then(data => {
          this.categoryRate = data;
        });
      },
      fetchUsers() {
        this.request('get', '/admin/user/list').then(data => {
          this.users = data;
        });
      },
      toggleUser(row, status) {
        const url = status === 1 ? '/admin/user/enable' : '/admin/user/disable';
        this.request('post', url, { userId: row.id }).then(() => {
          this.$message.success('操作成功');
          this.fetchUsers();
        }).catch(err => this.$message.error(err.message));
      },
      fetchMerchants() {
        this.request('get', '/admin/merchant/list').then(data => {
          this.merchants = data;
        });
      },
      showMerchantDetail(id) {
        this.request('get', '/admin/merchant/' + id).then(data => {
          this.currentMerchantDetail = data;
          this.merchantDialogVisible = true;
        }).catch(err => this.$message.error(err.message));
      },
      auditMerchant(row, status) {
        const title = status === '2' ? '通过审核' : '驳回审核';
        this.$prompt('请输入审核备注', title, {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          inputValue: status === '2' ? '审核通过' : '审核驳回'
        }).then(({ value }) => this.request('post', '/admin/merchant/audit', {
          id: row.id,
          status,
          remark: value
        })).then(() => {
          this.$message.success('审核完成');
          this.fetchMerchants();
          this.fetchUsers();
          this.fetchStats();
        }).catch(() => {});
      },
      fetchServices() {
        this.request('get', '/admin/service/list').then(data => {
          this.services = data;
        });
      },
      showServiceDetail(id) {
        this.request('get', '/admin/service/' + id).then(data => {
          this.currentServiceDetail = data;
          this.serviceDialogVisible = true;
        }).catch(err => this.$message.error(err.message));
      },
      auditService(row, status) {
        const title = status === '2' ? '通过审核' : '驳回审核';
        this.$prompt('请输入审核备注', title, {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          inputValue: status === '2' ? '审核通过' : '审核驳回'
        }).then(({ value }) => this.request('post', '/admin/service/audit', {
          id: row.id,
          status,
          remark: value
        })).then(() => {
          this.$message.success('审核完成');
          this.fetchServices();
          this.fetchStats();
        }).catch(() => {});
      },
      fetchCategories() {
        this.request('get', '/admin/category/list').then(data => {
          this.categories = data;
        });
      },
      openCategoryDialog(row) {
        this.categoryForm = row ? Object.assign({}, row) : { id: null, name: '', icon: '', sort: 0, status: 1 };
        this.categoryDialogVisible = true;
      },
      saveCategory() {
        const method = this.categoryForm.id ? 'put' : 'post';
        const url = this.categoryForm.id ? '/admin/category/update' : '/admin/category/create';
        this.request(method, url, this.categoryForm).then(() => {
          this.$message.success('保存成功');
          this.categoryDialogVisible = false;
          this.fetchCategories();
        }).catch(err => this.$message.error(err.message));
      },
      deleteCategory(id) {
        this.request('delete', '/admin/category/' + id).then(() => {
          this.$message.success('删除成功');
          this.fetchCategories();
        }).catch(err => this.$message.error(err.message));
      },
      fetchNotices() {
        this.request('get', '/admin/notice/list').then(data => {
          this.notices = data;
        });
      },
      openNoticeDialog(row) {
        this.noticeForm = row ? Object.assign({}, row) : { id: null, title: '', content: '', status: 1 };
        this.noticeDialogVisible = true;
      },
      saveNotice() {
        const method = this.noticeForm.id ? 'put' : 'post';
        const url = this.noticeForm.id ? '/admin/notice/update' : '/admin/notice/create';
        this.request(method, url, this.noticeForm).then(() => {
          this.$message.success('保存成功');
          this.noticeDialogVisible = false;
          this.fetchNotices();
        }).catch(err => this.$message.error(err.message));
      },
      deleteNotice(id) {
        this.request('delete', '/admin/notice/' + id).then(() => {
          this.$message.success('删除成功');
          this.fetchNotices();
        }).catch(err => this.$message.error(err.message));
      },
      fetchBanners() {
        this.request('get', '/admin/banner/list').then(data => {
          this.banners = data;
        });
      },
      openBannerDialog(row) {
        this.bannerForm = row ? Object.assign({}, row) : { id: null, title: '', imageUrl: '', linkUrl: '', sort: 0, status: 1 };
        this.bannerDialogVisible = true;
      },
      saveBanner() {
        const method = this.bannerForm.id ? 'put' : 'post';
        const url = this.bannerForm.id ? '/admin/banner/update' : '/admin/banner/create';
        this.request(method, url, this.bannerForm).then(() => {
          this.$message.success('保存成功');
          this.bannerDialogVisible = false;
          this.fetchBanners();
        }).catch(err => this.$message.error(err.message));
      },
      deleteBanner(id) {
        this.request('delete', '/admin/banner/' + id).then(() => {
          this.$message.success('删除成功');
          this.fetchBanners();
        }).catch(err => this.$message.error(err.message));
      },
      fetchOrders() {
        this.request('get', '/admin/order/list').then(data => {
          this.orders = data;
        });
      },
      showOrderDetail(id) {
        this.request('get', '/admin/order/' + id).then(data => {
          this.orderDetail = data;
          this.orderDialogVisible = true;
        }).catch(err => this.$message.error(err.message));
      },
      trendHeight(count) {
        const max = Math.max.apply(null, (this.orderTrend || []).map(item => Number(item.count || 0)).concat([1]));
        const height = Math.max(16, Math.round((Number(count || 0) / max) * 180));
        return height + 'px';
      },
      shortDate(value) {
        if (!value) return '';
        const parts = String(value).split('-');
        return parts[1] + '/' + parts[2];
      },
      rankWidth(count) {
        const max = Math.max.apply(null, this.merchantRanks.map(item => item.count).concat([1]));
        return Math.max(18, Math.round((count / max) * 100)) + '%';
      },
      avatarText(name) {
        const value = String(name || '?').trim();
        return value ? value.slice(0, 1) : '?';
      },
      roleText(role) {
        return { user: '用户', merchant: '商家', admin: '管理员', staff: '服务人员' }[role] || role;
      },
      auditText(status) {
        return { '0': '待审核', '1': '已驳回', '2': '已通过' }[status] || '未知';
      },
      auditTagType(status) {
        return { '0': 'warning', '1': 'danger', '2': 'success' }[status] || '';
      },
      orderStatusText(status) {
        return { '0': '待支付', '1': '待接单', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType(status) {
        return { '0': 'warning', '1': 'warning', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      formatDate(value) {
        if (!value) return '-';
        return String(value).replace('T', ' ').slice(0, 19);
      },
      serviceCover(row) {
        const images = String(row.images || '').split(',').map(item => item.trim()).filter(Boolean);
        return images[0] || ('https://picsum.photos/300/200?admin-service=' + row.id);
      },
      categoryName(categoryId) {
        const match = (this.categories || []).find(item => item.id === categoryId);
        return match ? match.name : '未分类';
      },
      serviceMerchantName(merchantId) {
        const match = (this.merchants.list || []).find(item => item.id === merchantId);
        return match ? match.name : '平台商家';
      }
    }
  });
})();
