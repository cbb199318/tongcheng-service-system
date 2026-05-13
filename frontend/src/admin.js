(function () {
  const API_BASE = 'http://127.0.0.1:8080';
  const LOCAL_SERVICE_PLACEHOLDER = './public/service-placeholder.svg';
  const api = axios.create({ baseURL: API_BASE });

  function defaultPageResult(pageSize) {
    return { list: [], total: 0, pageNum: 1, pageSize: pageSize || 10 };
  }

  function defaultCategoryForm() {
    return { id: null, name: '', icon: '', sort: 0, status: 1 };
  }

  function defaultNoticeForm() {
    return { id: null, title: '', content: '', status: 1 };
  }

  function defaultBannerForm() {
    return { id: null, title: '', imageUrl: '', linkUrl: '', sort: 0, status: 1 };
  }

  function defaultAuditDialog() {
    return { targetType: 'merchant', id: null, name: '', remark: '' };
  }

  function normalizeResourceUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || /^data:/.test(url)) return url;
    if (url.indexOf('/upload/') === 0) return API_BASE + url;
    return url;
  }

  function splitCsv(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function splitImages(value) {
    return splitCsv(value).map(normalizeResourceUrl);
  }

  function firstImage(value) {
    var images = splitImages(value);
    return images.length ? images[0] : '';
  }

  function parsePositiveInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizePageResult(data, pageSize) {
    if (data && Array.isArray(data.list)) return data;
    return defaultPageResult(pageSize);
  }

  function withApp() {
    return {
      computed: {
        app: function () {
          return this.$root;
        }
      }
    };
  }

  Vue.use(VueRouter);

  const LoginPage = {
    mixins: [withApp()],
    template: `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);">A</div>
            <h1 style="color:#1d4ed8;">同城服务平台管理端</h1>
            <p>登录后进入管理后台，统一查看审核、订单监管、内容维护与统计总览。</p>
          </div>
          <el-form :model="app.loginForm" label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="app.loginForm.username" prefix-icon="el-icon-user-solid"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="app.loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input>
            </el-form-item>
            <el-button class="auth-submit" type="primary" :loading="app.loading.login" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);" @click="app.login">
              登录后台
            </el-button>
          </el-form>
          <div class="auth-footnote">演示账号：admin / 123456</div>
        </div>
      </div>
    `
  };

  const DashboardPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>数据总览</h3>
            <p>统一查看审核、订单、用户与内容运营数据。</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card stat-blue"><span>今日订单量</span><strong>{{ app.stats.todayOrders || 0 }}</strong></div>
          <div class="stat-card stat-orange"><span>今日成交额</span><strong>￥{{ app.stats.todayAmount || 0 }}</strong></div>
          <div class="stat-card stat-green"><span>注册用户数</span><strong>{{ app.stats.totalUsers || 0 }}</strong></div>
          <div class="stat-card stat-violet"><span>待审核数</span><strong>{{ app.stats.pendingAudit || 0 }}</strong></div>
        </div>

        <div class="dashboard-charts">
          <div class="chart-card">
            <div class="section-title">
              <h3>近 7 日订单趋势</h3>
              <span class="demo-text">按订单创建时间统计</span>
            </div>
            <div class="line-chart-placeholder">
              <div class="line-bar" v-for="item in app.orderTrend" :key="item.date" :style="{ height: app.trendHeight(item.count) }">
                <strong class="admin-bar-value">{{ item.count }}</strong>
                <span>{{ app.shortDate(item.date) }}</span>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="section-title">
              <h3>服务分类占比</h3>
              <span class="demo-text">按当前可统计分类数据展示</span>
            </div>
            <div class="donut-wrap">
              <div class="donut-chart" :style="{ background: app.donutStyle }"></div>
              <ul class="donut-legend">
                <li v-for="(item, index) in app.categoryRate" :key="item.categoryId || item.categoryName">
                  <span class="legend-dot" :style="{ background: app.donutColors[index % app.donutColors.length] }"></span>
                  <span>{{ item.categoryName }} {{ item.count }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="chart-card rank-card">
          <div class="section-title">
            <h3>商家订单排行 TOP5</h3>
            <span class="demo-text">用于答辩演示平台经营概况</span>
          </div>
          <div v-if="app.merchantRanks.length">
            <div class="rank-row" v-for="item in app.merchantRanks" :key="item.name">
              <span>{{ item.name }}</span>
              <div class="rank-bar"><div class="rank-bar-inner" :style="{ width: app.rankWidth(item.count) }"></div></div>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
          <div v-else class="mini-empty">暂无排行数据</div>
        </div>
      </div>
    `
  };

  const UsersPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>用户管理</h3>
            <p>支持关键词、角色、状态筛选，并使用真实后端分页展示用户数据。</p>
          </div>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.userFilters.keyword" placeholder="搜索用户名/昵称/手机号" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.userFilters.role" clearable placeholder="全部角色" @change="applyFilters">
            <el-option label="用户" value="user"></el-option>
            <el-option label="商家" value="merchant"></el-option>
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="服务人员" value="staff"></el-option>
          </el-select>
          <el-select v-model="app.userFilters.status" clearable placeholder="全部状态" @change="applyFilters">
            <el-option label="正常" value="1"></el-option>
            <el-option label="禁用" value="0"></el-option>
          </el-select>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.users.list" border v-loading="app.loading.users">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="用户信息" min-width="260">
              <template slot-scope="scope">
                <div class="row-title">
                  <span class="row-avatar">{{ app.avatarText(scope.row.nickname || scope.row.username) }}</span>
                  <div>
                    <div>{{ scope.row.nickname || scope.row.username }}</div>
                    <div class="row-subtext">{{ scope.row.username }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" width="150"></el-table-column>
            <el-table-column label="角色" width="110">
              <template slot-scope="scope"><el-tag size="mini" type="primary">{{ app.roleText(scope.row.role) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="Number(scope.row.status) === 1 ? 'success' : 'info'">{{ Number(scope.row.status) === 1 ? '正常' : '禁用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="注册时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <span class="action-link" v-if="Number(scope.row.status) !== 1" @click="app.toggleUser(scope.row, 1)">启用</span>
                <span class="action-link danger" v-else @click="app.toggleUser(scope.row, 0)">禁用</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="admin-pagination">
          <el-pagination background layout="total, prev, pager, next" :total="app.users.total" :page-size="Number(app.userFilters.pageSize)" :current-page="Number(app.userFilters.pageNum)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    methods: {
      search: function () {
        this.app.pushUserRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushUserRouteQuery({ keyword: '', role: '', status: '', pageNum: 1 });
      },
      applyFilters: function () {
        this.app.pushUserRouteQuery({ pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushUserRouteQuery({ pageNum: page });
      }
    }
  };

  const MerchantsPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>商家审核</h3>
            <p>支持按审核状态筛选并查看商家详情。</p>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.merchantFilters.auditStatus === '0' ? 'primary' : 'default'" @click="tabStatus('0')">待审核</el-button>
          <el-button size="mini" :type="app.merchantFilters.auditStatus === '2' ? 'primary' : 'default'" @click="tabStatus('2')">已通过</el-button>
          <el-button size="mini" :type="app.merchantFilters.auditStatus === '1' ? 'primary' : 'default'" @click="tabStatus('1')">已驳回</el-button>
          <el-button size="mini" :type="app.merchantFilters.auditStatus === '' ? 'primary' : 'default'" @click="tabStatus('')">全部</el-button>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.merchantFilters.keyword" placeholder="搜索商家名称" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.merchantFilters.auditStatus" clearable placeholder="审核状态" @change="applyFilters">
            <el-option label="待审核" value="0"></el-option>
            <el-option label="已驳回" value="1"></el-option>
            <el-option label="已通过" value="2"></el-option>
          </el-select>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.merchants.list" border v-loading="app.loading.merchants">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="name" label="商家名称" min-width="180"></el-table-column>
            <el-table-column prop="phone" label="联系电话" width="150"></el-table-column>
            <el-table-column prop="address" label="商家地址" min-width="220"></el-table-column>
            <el-table-column label="审核状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="app.auditTagType(scope.row.auditStatus)">{{ app.auditText(scope.row.auditStatus) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="申请时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="审核备注" min-width="180">
              <template slot-scope="scope">{{ scope.row.auditRemark || '暂无' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.$router.push('/merchants/' + scope.row.id)">查看详情</span>
                  <span class="action-link" v-if="String(scope.row.auditStatus) !== '2'" @click="app.approveAudit('merchant', scope.row)">通过</span>
                  <span class="action-link danger" v-if="String(scope.row.auditStatus) !== '1'" @click="app.openRejectAudit('merchant', scope.row)">驳回</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="admin-pagination">
          <el-pagination background layout="total, prev, pager, next" :total="app.merchants.total" :page-size="Number(app.merchantFilters.pageSize)" :current-page="Number(app.merchantFilters.pageNum)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    methods: {
      tabStatus: function (status) {
        this.app.pushMerchantRouteQuery({ auditStatus: status, pageNum: 1 });
      },
      search: function () {
        this.app.pushMerchantRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushMerchantRouteQuery({ keyword: '', auditStatus: '', pageNum: 1 });
      },
      applyFilters: function () {
        this.app.pushMerchantRouteQuery({ pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushMerchantRouteQuery({ pageNum: page });
      }
    }
  };

  const MerchantDetailPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>商家详情</h3>
            <p>结构化展示 Logo、资质证书、联系信息和审核信息，不再使用 JSON 弹窗。</p>
          </div>
          <div class="admin-page-actions">
            <el-button @click="app.backToMerchants">返回列表</el-button>
            <el-button type="primary" v-if="app.merchantDetail && String(app.merchantDetail.auditStatus) !== '2'" @click="app.approveAudit('merchant', app.merchantDetail)">通过审核</el-button>
            <el-button type="danger" plain v-if="app.merchantDetail && String(app.merchantDetail.auditStatus) !== '1'" @click="app.openRejectAudit('merchant', app.merchantDetail)">驳回</el-button>
          </div>
        </div>

        <div v-loading="app.loading.merchantDetail">
          <div v-if="app.merchantDetail" class="admin-detail-grid">
            <div class="preview-stack">
              <div class="preview-card">
                <h4>商家 Logo</h4>
                <div class="preview-media">
                  <img v-if="app.merchantDetail.logo" :src="app.normalizeUrl(app.merchantDetail.logo)" alt="logo">
                  <span v-else>未上传 Logo</span>
                </div>
              </div>
              <div class="preview-card">
                <h4>资质证书</h4>
                <div class="preview-media tall">
                  <img v-if="app.merchantDetail.license" :src="app.normalizeUrl(app.merchantDetail.license)" alt="license">
                  <span v-else>未上传资质证书</span>
                </div>
              </div>
            </div>

            <div class="content-card admin-detail-card">
              <div class="summary-strip">
                <div class="summary-mini-card"><span>审核状态</span><strong>{{ app.auditText(app.merchantDetail.auditStatus) }}</strong></div>
                <div class="summary-mini-card"><span>申请时间</span><strong>{{ app.formatDate(app.merchantDetail.createTime) || '-' }}</strong></div>
                <div class="summary-mini-card"><span>更新时间</span><strong>{{ app.formatDate(app.merchantDetail.updateTime) || '-' }}</strong></div>
              </div>

              <div class="admin-kv-grid">
                <div class="admin-kv-item"><span>商家名称</span><strong>{{ app.merchantDetail.name || '-' }}</strong></div>
                <div class="admin-kv-item"><span>联系电话</span><strong>{{ app.merchantDetail.phone || '-' }}</strong></div>
                <div class="admin-kv-item"><span>商家地址</span><strong>{{ app.merchantDetail.address || '-' }}</strong></div>
                <div class="admin-kv-item"><span>用户 ID</span><strong>{{ app.merchantDetail.userId || '-' }}</strong></div>
              </div>

              <div class="admin-detail-section">
                <h4>商家简介</h4>
                <p>{{ app.merchantDetail.intro || '暂无简介。' }}</p>
              </div>

              <div class="admin-detail-section">
                <h4>审核备注</h4>
                <p>{{ app.merchantDetail.auditRemark || '暂无审核备注。' }}</p>
              </div>
            </div>
          </div>
          <div v-else class="mini-empty">暂无详情数据</div>
        </div>
      </div>
    `
  };

  const ServicesPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>服务审核</h3>
            <p>按服务名称与审核状态筛选，详情页单独展示图片、价格、时长与描述。</p>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.serviceFilters.auditStatus === '0' ? 'primary' : 'default'" @click="tabStatus('0')">待审核</el-button>
          <el-button size="mini" :type="app.serviceFilters.auditStatus === '2' ? 'primary' : 'default'" @click="tabStatus('2')">已通过</el-button>
          <el-button size="mini" :type="app.serviceFilters.auditStatus === '1' ? 'primary' : 'default'" @click="tabStatus('1')">已驳回</el-button>
          <el-button size="mini" :type="app.serviceFilters.auditStatus === '' ? 'primary' : 'default'" @click="tabStatus('')">全部</el-button>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.serviceFilters.keyword" placeholder="搜索服务名称" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.serviceFilters.auditStatus" clearable placeholder="审核状态" @change="applyFilters">
            <el-option label="待审核" value="0"></el-option>
            <el-option label="已驳回" value="1"></el-option>
            <el-option label="已通过" value="2"></el-option>
          </el-select>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.services.list" border v-loading="app.loading.services">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="服务信息" min-width="280">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.serviceCover(scope.row)" alt="service">
                  <div>
                    <div>{{ scope.row.name }}</div>
                    <div class="row-subtext">{{ app.merchantDisplayName(scope.row) }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="分类" width="120">
              <template slot-scope="scope">{{ app.categoryName(scope.row.categoryId) }}</template>
            </el-table-column>
            <el-table-column label="价格" width="110">
              <template slot-scope="scope">￥{{ scope.row.price }}</template>
            </el-table-column>
            <el-table-column label="时长" width="110">
              <template slot-scope="scope">{{ scope.row.duration || 60 }} 分钟</template>
            </el-table-column>
            <el-table-column label="审核状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="app.auditTagType(scope.row.auditStatus)">{{ app.auditText(scope.row.auditStatus) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="提交时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="审核备注" min-width="180">
              <template slot-scope="scope">{{ scope.row.auditRemark || '暂无' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.$router.push('/services/' + scope.row.id)">查看详情</span>
                  <span class="action-link" v-if="String(scope.row.auditStatus) !== '2'" @click="app.approveAudit('service', scope.row)">通过</span>
                  <span class="action-link danger" v-if="String(scope.row.auditStatus) !== '1'" @click="app.openRejectAudit('service', scope.row)">驳回</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="admin-pagination">
          <el-pagination background layout="total, prev, pager, next" :total="app.services.total" :page-size="Number(app.serviceFilters.pageSize)" :current-page="Number(app.serviceFilters.pageNum)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    methods: {
      tabStatus: function (status) {
        this.app.pushServiceRouteQuery({ auditStatus: status, pageNum: 1 });
      },
      search: function () {
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushServiceRouteQuery({ keyword: '', auditStatus: '', pageNum: 1 });
      },
      applyFilters: function () {
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushServiceRouteQuery({ pageNum: page });
      }
    }
  };

  const ServiceDetailPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>服务详情</h3>
            <p>展示服务图片、价格、分类、描述与审核备注，适合答辩现场逐项讲解。</p>
          </div>
          <div class="admin-page-actions">
            <el-button @click="app.backToServices">返回列表</el-button>
            <el-button type="primary" v-if="app.serviceDetail && String(app.serviceDetail.auditStatus) !== '2'" @click="app.approveAudit('service', app.serviceDetail)">通过审核</el-button>
            <el-button type="danger" plain v-if="app.serviceDetail && String(app.serviceDetail.auditStatus) !== '1'" @click="app.openRejectAudit('service', app.serviceDetail)">驳回</el-button>
          </div>
        </div>

        <div v-loading="app.loading.serviceDetail">
          <div v-if="app.serviceDetail" class="admin-detail-grid">
            <div class="preview-stack">
              <div class="preview-card">
                <h4>服务主图</h4>
                <div class="preview-media">
                  <img :src="app.serviceCover(app.serviceDetail)" alt="service">
                </div>
              </div>
              <div class="preview-card">
                <h4>服务图片</h4>
                <div class="admin-preview-grid">
                  <div class="admin-preview-tile" v-for="(image, index) in app.serviceImageList(app.serviceDetail)" :key="image + index">
                    <img :src="image" alt="service">
                  </div>
                  <div v-if="!app.serviceImageList(app.serviceDetail).length" class="mini-empty" style="padding:12px 0;">暂无图片</div>
                </div>
              </div>
            </div>

            <div class="content-card admin-detail-card">
              <div class="summary-strip">
                <div class="summary-mini-card"><span>审核状态</span><strong>{{ app.auditText(app.serviceDetail.auditStatus) }}</strong></div>
                <div class="summary-mini-card"><span>价格</span><strong>￥{{ app.serviceDetail.price || 0 }}</strong></div>
                <div class="summary-mini-card"><span>时长</span><strong>{{ app.serviceDetail.duration || 60 }} 分钟</strong></div>
              </div>

              <div class="admin-kv-grid">
                <div class="admin-kv-item"><span>服务名称</span><strong>{{ app.serviceDetail.name || '-' }}</strong></div>
                <div class="admin-kv-item"><span>所属分类</span><strong>{{ app.categoryName(app.serviceDetail.categoryId) }}</strong></div>
                <div class="admin-kv-item"><span>商家信息</span><strong>{{ app.merchantDisplayName(app.serviceDetail) }}</strong></div>
                <div class="admin-kv-item"><span>提交时间</span><strong>{{ app.formatDate(app.serviceDetail.createTime) || '-' }}</strong></div>
              </div>

              <div class="admin-detail-section">
                <h4>服务描述</h4>
                <p>{{ app.serviceDetail.description || '暂无服务描述。' }}</p>
              </div>

              <div class="admin-detail-section">
                <h4>审核备注</h4>
                <p>{{ app.serviceDetail.auditRemark || '暂无审核备注。' }}</p>
              </div>
            </div>
          </div>
          <div v-else class="mini-empty">暂无详情数据</div>
        </div>
      </div>
    `
  };

  const OrdersPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>订单监管</h3>
            <p>按订单号、状态和日期区间筛选平台订单，并进入结构化详情页查看状态流转。</p>
          </div>
        </div>

        <div class="list-toolbar admin-order-toolbar">
          <el-form inline label-position="top" class="admin-inline-filter-form">
            <el-form-item label="搜索订单编号">
              <el-input v-model="app.orderFilters.orderNo" placeholder="搜索订单编号" @keyup.enter.native="search"></el-input>
            </el-form-item>
            <el-form-item label="订单状态">
              <el-select v-model="app.orderFilters.status" clearable placeholder="全部状态" @change="applyFilters">
                <el-option label="待支付" value="0"></el-option>
                <el-option label="待接单" value="1"></el-option>
                <el-option label="已接单" value="2"></el-option>
                <el-option label="服务中" value="3"></el-option>
                <el-option label="已完成" value="4"></el-option>
                <el-option label="已取消" value="5"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围">
              <el-date-picker v-model="app.orderFilters.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd" @change="applyFilters"></el-date-picker>
            </el-form-item>
          </el-form>
          <div class="admin-page-actions">
            <el-button type="primary" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </div>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.orders.list" border v-loading="app.loading.orders">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="orderNo" label="订单编号" width="190"></el-table-column>
            <el-table-column label="服务信息" min-width="240">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.orderServiceImage(scope.row)" alt="service">
                  <div>
                    <div>{{ app.orderServiceName(scope.row) }}</div>
                    <div class="row-subtext">预约 {{ scope.row.appointDate || '-' }} {{ scope.row.appointSlot || '' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用户" width="140">
              <template slot-scope="scope">{{ app.orderUserName(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="商家" width="160">
              <template slot-scope="scope">{{ app.orderMerchantName(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="110">
              <template slot-scope="scope">￥{{ scope.row.totalPrice }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="app.orderTagType(scope.row.status)">{{ app.orderStatusText(scope.row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="创建时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="scope"><span class="action-link" @click="app.$router.push('/orders/' + scope.row.id)">详情</span></template>
            </el-table-column>
          </el-table>
        </div>

        <div class="admin-pagination">
          <el-pagination background layout="total, prev, pager, next" :total="app.orders.total" :page-size="Number(app.orderFilters.pageSize)" :current-page="Number(app.orderFilters.pageNum)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    methods: {
      search: function () {
        this.app.pushOrderRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushOrderRouteQuery({ orderNo: '', status: '', dateRange: [], pageNum: 1 });
      },
      applyFilters: function () {
        this.app.pushOrderRouteQuery({ pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushOrderRouteQuery({ pageNum: page });
      }
    }
  };

  const OrderDetailPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>订单详情</h3>
            <p>结构化展示订单、用户、商家、服务与关键时间点，便于讲解状态流转。</p>
          </div>
          <div class="admin-page-actions">
            <el-button @click="app.backToOrders">返回列表</el-button>
          </div>
        </div>

        <div v-loading="app.loading.orderDetail">
          <div v-if="app.orderDetail">
            <div class="summary-strip">
              <div class="summary-mini-card"><span>订单状态</span><strong>{{ app.orderStatusText(app.orderDetail.status) }}</strong></div>
              <div class="summary-mini-card"><span>订单金额</span><strong>￥{{ app.orderDetail.totalPrice || 0 }}</strong></div>
              <div class="summary-mini-card"><span>预约时间</span><strong>{{ app.orderDetail.appointDate || '-' }} {{ app.orderDetail.appointSlot || '' }}</strong></div>
            </div>

            <div class="admin-detail-grid">
              <div class="content-card admin-detail-card">
                <div class="admin-detail-section">
                  <h4>状态进度</h4>
                  <div class="admin-timeline">
                    <div class="admin-timeline-item" v-for="item in app.orderTimeline(app.orderDetail)" :key="item.label">
                      <span class="admin-timeline-dot"></span>
                      <div>
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.time || '待更新' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="admin-detail-section">
                  <h4>订单信息</h4>
                  <div class="admin-kv-grid">
                    <div class="admin-kv-item"><span>订单编号</span><strong>{{ app.orderDetail.orderNo || '-' }}</strong></div>
                    <div class="admin-kv-item"><span>创建时间</span><strong>{{ app.formatDate(app.orderDetail.createTime) || '-' }}</strong></div>
                    <div class="admin-kv-item"><span>服务地址</span><strong>{{ app.orderDetail.address || '-' }}</strong></div>
                    <div class="admin-kv-item"><span>取消原因</span><strong>{{ app.orderDetail.cancelReason || '-' }}</strong></div>
                  </div>
                </div>
              </div>

              <div class="preview-stack">
                <div class="preview-card">
                  <h4>服务信息</h4>
                  <div class="admin-order-service-card">
                    <img :src="app.orderServiceImage(app.orderDetail)" alt="service">
                    <div>
                      <strong>{{ app.orderServiceName(app.orderDetail) }}</strong>
                      <div class="demo-text">{{ app.orderMerchantName(app.orderDetail) }}</div>
                    </div>
                  </div>
                </div>
                <div class="preview-card">
                  <h4>用户信息</h4>
                  <div class="demo-text">{{ app.orderUserName(app.orderDetail) }}</div>
                  <div class="demo-text" style="margin-top:8px;">{{ app.orderUserPhone(app.orderDetail) || '暂无手机号' }}</div>
                </div>
                <div class="preview-card">
                  <h4>商家信息</h4>
                  <div class="demo-text">{{ app.orderMerchantName(app.orderDetail) }}</div>
                  <div class="demo-text" style="margin-top:8px;">{{ app.orderMerchantPhone(app.orderDetail) || '暂无联系电话' }}</div>
                </div>
                <div class="preview-card">
                  <h4>备注说明</h4>
                  <div class="demo-text">{{ app.orderDetail.remark || '当前接口暂无备注字段。' }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mini-empty">暂无详情数据</div>
        </div>
      </div>
    `
  };

  const CategoriesPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>分类管理</h3>
            <p>支持上传分类图标、状态控制与排序维护。</p>
          </div>
          <el-button type="primary" @click="app.openCategoryDialog()">新增分类</el-button>
        </div>

        <div class="table-card paper-table">
            <el-table :data="app.categories" border v-loading="app.loading.categories">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="图标" width="110">
              <template slot-scope="scope">
                <div class="admin-icon-preview" :class="{ 'is-font': app.isElementIcon(scope.row.icon) }">
                  <i v-if="app.isElementIcon(scope.row.icon)" :class="['admin-category-glyph', scope.row.icon]"></i>
                  <img v-else-if="scope.row.icon" :src="app.normalizeUrl(scope.row.icon)" alt="icon">
                  <span v-else>无</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="分类名称" min-width="180"></el-table-column>
            <el-table-column prop="sort" label="排序" width="100"></el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="Number(scope.row.status) === 1 ? 'success' : 'info'">{{ Number(scope.row.status) === 1 ? '启用' : '停用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.openCategoryDialog(scope.row)">编辑</span>
                  <span class="action-link danger" @click="app.deleteCategory(scope.row.id)">删除</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    `
  };

  const NoticesPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>公告管理</h3>
            <p>统一维护平台公告，采用结构化表单弹窗新增与编辑。</p>
          </div>
          <el-button type="primary" @click="app.openNoticeDialog()">新增公告</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.notices" border v-loading="app.loading.notices">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="title" label="标题" min-width="220"></el-table-column>
            <el-table-column prop="content" label="内容" min-width="320"></el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="Number(scope.row.status) === 1 ? 'success' : 'info'">{{ Number(scope.row.status) === 1 ? '发布中' : '已停用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="更新时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.updateTime || scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.openNoticeDialog(scope.row)">编辑</span>
                  <span class="action-link danger" @click="app.deleteNotice(scope.row.id)">删除</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    `
  };

  const BannersPage = {
    mixins: [withApp()],
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>轮播图管理</h3>
            <p>接入上传、图片预览和基础校验，用于维护首页运营位。</p>
          </div>
          <el-button type="primary" @click="app.openBannerDialog()">新增轮播图</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.banners" border v-loading="app.loading.banners">
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="图片" width="180">
              <template slot-scope="scope"><img class="row-thumb" style="width:150px;height:82px;" :src="app.normalizeUrl(scope.row.imageUrl)" alt="banner"></template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="220"></el-table-column>
            <el-table-column prop="linkUrl" label="跳转链接" min-width="220"></el-table-column>
            <el-table-column prop="sort" label="排序" width="100"></el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope"><el-tag size="mini" :type="Number(scope.row.status) === 1 ? 'success' : 'info'">{{ Number(scope.row.status) === 1 ? '启用' : '禁用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.openBannerDialog(scope.row)">编辑</span>
                  <span class="action-link danger" @click="app.deleteBanner(scope.row.id)">删除</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    `
  };

  const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true } },
    { path: '/users', name: 'users', component: UsersPage, meta: { requiresAuth: true } },
    { path: '/merchants', name: 'merchants', component: MerchantsPage, meta: { requiresAuth: true } },
    { path: '/merchants/:id', name: 'merchant-detail', component: MerchantDetailPage, meta: { requiresAuth: true } },
    { path: '/services', name: 'services', component: ServicesPage, meta: { requiresAuth: true } },
    { path: '/services/:id', name: 'service-detail', component: ServiceDetailPage, meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: OrdersPage, meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: OrderDetailPage, meta: { requiresAuth: true } },
    { path: '/categories', name: 'categories', component: CategoriesPage, meta: { requiresAuth: true } },
    { path: '/notices', name: 'notices', component: NoticesPage, meta: { requiresAuth: true } },
    { path: '/banners', name: 'banners', component: BannersPage, meta: { requiresAuth: true } }
  ];

  const router = new VueRouter({ routes: routes });

  router.beforeEach(function (to, from, next) {
    var token = localStorage.getItem('adminToken');
    if (to.meta && to.meta.requiresAuth && !token) {
      next({ path: '/login', query: { redirect: to.fullPath } });
      return;
    }
    if (to.path === '/login' && token) {
      next('/dashboard');
      return;
    }
    next();
  });

  router.afterEach(function () {
    window.scrollTo(0, 0);
  });

  new Vue({
    el: '#admin-app',
    router: router,
    template: `
      <div class="admin-shell">
        <template v-if="isLoginRoute">
          <router-view></router-view>
        </template>
        <template v-else>
          <div class="backoffice-header">
            <div class="backoffice-header-inner">
              <div class="backoffice-title">
                <div class="backoffice-kicker">Admin Console</div>
                <h1>同城服务平台管理后台</h1>
              </div>
              <div class="backoffice-userbox">
                <div>
                  <strong>{{ adminName }}</strong>
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
                <p>集中查看审核、监管、统计与运营能力。</p>
                <div class="metric-inline">
                  <el-tag size="mini" type="success">用户 {{ stats.totalUsers || 0 }}</el-tag>
                  <el-tag size="mini" type="warning">待审 {{ stats.pendingAudit || 0 }}</el-tag>
                  <el-tag size="mini">今日单 {{ stats.todayOrders || 0 }}</el-tag>
                </div>
              </div>

              <div class="backoffice-menu">
                <div class="backoffice-menu-title">功能导航</div>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/dashboard') }" @click="$router.push('/dashboard')">统计总览</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/users') }" @click="$router.push('/users')">用户管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/merchants') }" @click="$router.push('/merchants')">商家审核</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/services') }" @click="$router.push('/services')">服务审核</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/orders') }" @click="$router.push('/orders')">订单监管</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/categories') }" @click="$router.push('/categories')">分类管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/notices') }" @click="$router.push('/notices')">公告管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/banners') }" @click="$router.push('/banners')">轮播图管理</el-button>
              </div>
            </div>

            <div class="backoffice-panel">
              <router-view></router-view>
            </div>
          </div>

          <el-dialog title="驳回审核" :visible.sync="auditDialogVisible" width="560px">
            <el-form :model="auditDialog" label-position="top">
              <el-form-item label="审核对象">
                <el-input :value="auditDialog.name" disabled></el-input>
              </el-form-item>
              <el-form-item label="驳回原因">
                <el-input type="textarea" :rows="5" v-model="auditDialog.remark" placeholder="请输入驳回原因"></el-input>
              </el-form-item>
            </el-form>
            <span slot="footer">
              <el-button @click="auditDialogVisible = false">取消</el-button>
              <el-button type="danger" :loading="loading.audit" @click="submitRejectAudit">确认驳回</el-button>
            </span>
          </el-dialog>

          <el-dialog title="分类编辑" :visible.sync="categoryDialogVisible" width="640px" :close-on-click-modal="false">
            <div class="editor-layout admin-dialog-layout">
              <div>
                <el-form :model="categoryForm" label-width="92px">
                  <el-form-item label="名称"><el-input v-model="categoryForm.name"></el-input></el-form-item>
                  <el-form-item label="图标上传">
                    <div class="admin-upload-row">
                      <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadCategoryIcon">
                        <el-button icon="el-icon-upload2" :loading="loading.uploadCategory">上传图标</el-button>
                      </el-upload>
                      <span class="admin-upload-tip">仅支持图片，单张不超过 5MB。</span>
                    </div>
                  </el-form-item>
                  <el-form-item label="图标地址"><el-input v-model="categoryForm.icon" placeholder="上传后自动回填，也可手动输入"></el-input></el-form-item>
                  <el-form-item label="排序"><el-input v-model.number="categoryForm.sort"></el-input></el-form-item>
                  <el-form-item label="状态">
                    <el-select v-model="categoryForm.status" style="width:100%">
                      <el-option label="启用" :value="1"></el-option>
                      <el-option label="停用" :value="0"></el-option>
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
              <div class="preview-stack">
                <div class="preview-card">
                  <h4>图标预览</h4>
                  <div class="preview-media admin-icon-stage">
                    <i v-if="isElementIcon(categoryForm.icon)" :class="['admin-category-glyph', 'admin-category-glyph-large', categoryForm.icon]"></i>
                    <img v-else-if="categoryForm.icon" :src="normalizeUrl(categoryForm.icon)" alt="category icon">
                    <span v-else>暂无图标</span>
                  </div>
                </div>
              </div>
            </div>
            <span slot="footer">
              <el-button @click="categoryDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.saveCategory" @click="saveCategory">保存</el-button>
            </span>
          </el-dialog>

          <el-dialog title="公告编辑" :visible.sync="noticeDialogVisible" width="640px" :close-on-click-modal="false">
            <el-form :model="noticeForm" label-width="92px">
              <el-form-item label="标题"><el-input v-model="noticeForm.title"></el-input></el-form-item>
              <el-form-item label="内容"><el-input type="textarea" :rows="6" v-model="noticeForm.content"></el-input></el-form-item>
              <el-form-item label="状态">
                <el-select v-model="noticeForm.status" style="width:100%">
                  <el-option label="发布中" :value="1"></el-option>
                  <el-option label="停用" :value="0"></el-option>
                </el-select>
              </el-form-item>
            </el-form>
            <span slot="footer">
              <el-button @click="noticeDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.saveNotice" @click="saveNotice">保存</el-button>
            </span>
          </el-dialog>

          <el-dialog title="轮播图编辑" :visible.sync="bannerDialogVisible" width="700px" :close-on-click-modal="false">
            <div class="editor-layout admin-dialog-layout">
              <div>
                <el-form :model="bannerForm" label-width="92px">
                  <el-form-item label="标题"><el-input v-model="bannerForm.title"></el-input></el-form-item>
                  <el-form-item label="图片上传">
                    <div class="admin-upload-row">
                      <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadBannerImage">
                        <el-button icon="el-icon-upload2" :loading="loading.uploadBanner">上传图片</el-button>
                      </el-upload>
                      <span class="admin-upload-tip">建议横向大图，单张不超过 5MB。</span>
                    </div>
                  </el-form-item>
                  <el-form-item label="图片地址"><el-input v-model="bannerForm.imageUrl" placeholder="上传后自动回填，也可手动输入"></el-input></el-form-item>
                  <el-form-item label="跳转链接"><el-input v-model="bannerForm.linkUrl"></el-input></el-form-item>
                  <el-form-item label="排序"><el-input v-model.number="bannerForm.sort"></el-input></el-form-item>
                  <el-form-item label="状态">
                    <el-select v-model="bannerForm.status" style="width:100%">
                      <el-option label="启用" :value="1"></el-option>
                      <el-option label="禁用" :value="0"></el-option>
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
              <div class="preview-stack">
                <div class="preview-card">
                  <h4>图片预览</h4>
                  <div class="preview-media tall">
                    <img v-if="bannerForm.imageUrl" :src="normalizeUrl(bannerForm.imageUrl)" alt="banner">
                    <span v-else>暂无图片</span>
                  </div>
                </div>
              </div>
            </div>
            <span slot="footer">
              <el-button @click="bannerDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.saveBanner" @click="saveBanner">保存</el-button>
            </span>
          </el-dialog>
        </template>
      </div>
    `,
    data: function () {
      return {
        token: localStorage.getItem('adminToken') || '',
        loginForm: { username: 'admin', password: '123456' },
        authInfo: {},
        stats: {},
        orderTrend: [],
        categoryRate: [],
        merchantRanks: [],
        users: defaultPageResult(10),
        userFilters: { keyword: '', role: '', status: '', pageNum: 1, pageSize: 10 },
        merchants: defaultPageResult(10),
        merchantFilters: { keyword: '', auditStatus: '0', pageNum: 1, pageSize: 10 },
        merchantDetail: null,
        services: defaultPageResult(10),
        serviceFilters: { keyword: '', auditStatus: '0', pageNum: 1, pageSize: 10 },
        serviceDetail: null,
        orders: defaultPageResult(10),
        orderFilters: { orderNo: '', status: '', dateRange: [], pageNum: 1, pageSize: 10 },
        orderDetail: null,
        categories: [],
        notices: [],
        banners: [],
        categoryDialogVisible: false,
        noticeDialogVisible: false,
        bannerDialogVisible: false,
        auditDialogVisible: false,
        categoryForm: defaultCategoryForm(),
        noticeForm: defaultNoticeForm(),
        bannerForm: defaultBannerForm(),
        auditDialog: defaultAuditDialog(),
        donutColors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
        loading: {
          login: false,
          dashboard: false,
          users: false,
          merchants: false,
          merchantDetail: false,
          services: false,
          serviceDetail: false,
          orders: false,
          orderDetail: false,
          categories: false,
          notices: false,
          banners: false,
          audit: false,
          saveCategory: false,
          saveNotice: false,
          saveBanner: false,
          uploadCategory: false,
          uploadBanner: false
        }
      };
    },
    computed: {
      isLoginRoute: function () {
        return this.$route.path === '/login';
      },
      adminName: function () {
        return this.authInfo.nickname || this.authInfo.username || this.authInfo.name || '系统管理员';
      },
      donutStyle: function () {
        var total = (this.categoryRate || []).reduce(function (sum, item) {
          return sum + Number(item.count || 0);
        }, 0);
        if (!total) {
          return 'conic-gradient(#e5edf9 0deg 360deg)';
        }
        var current = 0;
        var colors = this.donutColors;
        var parts = this.categoryRate.map(function (item, index) {
          var amount = Number(item.count || 0);
          var start = current;
          var end = current + (amount / total) * 360;
          current = end;
          return colors[index % colors.length] + ' ' + start + 'deg ' + end + 'deg';
        });
        return 'conic-gradient(' + parts.join(', ') + ')';
      }
    },
    watch: {
      '$route': function (to) {
        if (this.token) {
          this.handleRouteChange(to);
        }
      }
    },
    mounted: function () {
      var root = document.querySelector('#admin-app');
      if (root) {
        root.__vue__ = this;
      }
      window.__adminApp = this;
    },
    created: function () {
      if (this.token) {
        this.bootstrap();
      }
    },
    methods: {
      headers: function (extra) {
        return Object.assign({}, extra || {}, this.token ? { Authorization: 'Bearer ' + this.token } : {});
      },
      request: function (config, auth) {
        var vm = this;
        var needAuth = auth !== false;
        var finalConfig = Object.assign({}, config, {
          headers: needAuth ? this.headers(config.headers || {}) : (config.headers || {})
        });
        return api(finalConfig).then(function (res) {
          if (res.data.code === 401) {
            vm.handleAuthExpired();
            throw new Error(res.data.message || '登录已失效');
          }
          if (res.data.code !== 200) {
            throw new Error(res.data.message || '请求失败');
          }
          return res.data.data;
        }).catch(function (err) {
          if (err.response && err.response.status === 401) {
            vm.handleAuthExpired();
            throw new Error('登录已失效');
          }
          throw err;
        });
      },
      setToken: function (token) {
        this.token = token;
        localStorage.setItem('adminToken', token);
      },
      handleAuthExpired: function () {
        this.token = '';
        localStorage.removeItem('adminToken');
        this.authInfo = {};
        if (this.$route.path !== '/login') {
          this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } });
        }
      },
      bootstrap: function () {
        this.fetchAuthInfo();
        if (this.$route.path === '/login') {
          this.$router.replace('/dashboard');
          return;
        }
        this.handleRouteChange(this.$route);
      },
      goHome: function () {
        window.location.href = './index.html';
      },
      login: function () {
        var vm = this;
        this.loading.login = true;
        return this.request({ method: 'post', url: '/admin/auth/login', data: this.loginForm }, false).then(function (data) {
          vm.setToken(data.token);
          vm.$message.success('登录成功');
          vm.fetchAuthInfo();
          vm.$router.replace(vm.$route.query.redirect || '/dashboard');
        }).catch(function (err) {
          vm.$message.error(err.message || '登录失败');
        }).finally(function () {
          vm.loading.login = false;
        });
      },
      logout: function () {
        this.token = '';
        localStorage.removeItem('adminToken');
        this.authInfo = {};
        this.$router.push('/login');
      },
      isRoute: function (prefix) {
        return this.$route.path === prefix || this.$route.path.indexOf(prefix + '/') === 0;
      },
      handleRouteChange: function (route) {
        if (!route || !route.name) return;
        if (route.name !== 'login' && route.name !== 'dashboard') {
          this.fetchOverview(false);
        }
        if (route.name === 'dashboard') {
          this.fetchDashboard();
        } else if (route.name === 'users') {
          this.userFilters = this.readUserQuery(route.query || {});
          this.fetchUsers();
        } else if (route.name === 'merchants') {
          this.merchantFilters = this.readMerchantQuery(route.query || {});
          this.fetchMerchants();
        } else if (route.name === 'merchant-detail') {
          this.fetchMerchantDetail(route.params.id);
        } else if (route.name === 'services') {
          this.serviceFilters = this.readServiceQuery(route.query || {});
          this.fetchCategories(false);
          this.fetchServices();
        } else if (route.name === 'service-detail') {
          this.fetchCategories(false);
          this.fetchServiceDetail(route.params.id);
        } else if (route.name === 'orders') {
          this.orderFilters = this.readOrderQuery(route.query || {});
          this.fetchOrders();
        } else if (route.name === 'order-detail') {
          this.fetchOrderDetail(route.params.id);
        } else if (route.name === 'categories') {
          this.fetchCategories();
        } else if (route.name === 'notices') {
          this.fetchNotices();
        } else if (route.name === 'banners') {
          this.fetchBanners();
        }
      },
      fetchAuthInfo: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/admin/auth/info' }).then(function (data) {
          vm.authInfo = data.admin || data.user || data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchOverview: function (showError) {
        var vm = this;
        return this.request({ method: 'get', url: '/admin/statistics/overview' }).then(function (data) {
          vm.stats = data || {};
          return vm.stats;
        }).catch(function (err) {
          if (showError) vm.$message.error(err.message || '获取统计概览失败');
          return vm.stats || {};
        });
      },
      fetchDashboard: function () {
        var vm = this;
        this.loading.dashboard = true;
        return Promise.all([
          this.fetchOverview(false),
          this.request({ method: 'get', url: '/admin/statistics/order-trend', params: { days: 7 } }).catch(function () { return []; }),
          this.request({ method: 'get', url: '/admin/statistics/category-rate' }).catch(function () { return []; }),
          this.fetchMerchantRanks().catch(function () { return []; })
        ]).then(function (results) {
          vm.stats = results[0] || {};
          vm.orderTrend = results[1] || [];
          vm.categoryRate = results[2] || [];
          vm.merchantRanks = results[3] || [];
        }).finally(function () {
          vm.loading.dashboard = false;
        });
      },
      fetchMerchantRanks: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/admin/statistics/merchant-rank' }).then(function (data) {
          return vm.normalizeMerchantRanks(data);
        }).catch(function () {
          return vm.request({ method: 'get', url: '/admin/order/list', params: { pageNum: 1, pageSize: 200 } }).then(function (data) {
            return vm.aggregateMerchantRanks((data && data.list) || []);
          });
        });
      },
      normalizeMerchantRanks: function (data) {
        return (data || []).map(function (item) {
          return {
            name: item.merchantName || item.name || item.label || '平台商家',
            count: Number(item.orderCount != null ? item.orderCount : item.count || 0)
          };
        }).sort(function (a, b) {
          return b.count - a.count;
        }).slice(0, 5);
      },
      aggregateMerchantRanks: function (list) {
        var counter = {};
        (list || []).forEach(function (item) {
          var name = (item.merchant && item.merchant.name) || item.merchantName || '平台商家';
          counter[name] = (counter[name] || 0) + 1;
        });
        return Object.keys(counter).map(function (name) {
          return { name: name, count: counter[name] };
        }).sort(function (a, b) {
          return b.count - a.count;
        }).slice(0, 5);
      },
      readUserQuery: function (query) {
        return { keyword: query.keyword || '', role: query.role || '', status: query.status || '', pageNum: parsePositiveInt(query.pageNum, 1), pageSize: 10 };
      },
      serializeUserQuery: function (state) {
        var query = {};
        if (state.keyword) query.keyword = state.keyword;
        if (state.role) query.role = state.role;
        if (state.status !== '') query.status = String(state.status);
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      pushUserRouteQuery: function (overrides) {
        var next = Object.assign({}, this.userFilters, overrides || {});
        this.$router.push({ path: '/users', query: this.serializeUserQuery(next) });
      },
      fetchUsers: function () {
        var vm = this;
        this.loading.users = true;
        return this.request({
          method: 'get',
          url: '/admin/user/list',
          params: {
            keyword: this.userFilters.keyword || undefined,
            role: this.userFilters.role || undefined,
            status: this.userFilters.status === '' ? undefined : Number(this.userFilters.status),
            pageNum: this.userFilters.pageNum,
            pageSize: this.userFilters.pageSize
          }
        }).then(function (data) {
          vm.users = normalizePageResult(data, vm.userFilters.pageSize);
        }).catch(function (err) {
          vm.$message.error(err.message || '获取用户失败');
        }).finally(function () {
          vm.loading.users = false;
        });
      },
      toggleUser: function (row, status) {
        var vm = this;
        var url = Number(status) === 1 ? '/admin/user/enable' : '/admin/user/disable';
        return this.request({ method: 'post', url: url, data: { userId: row.id } }).then(function () {
          vm.$message.success('操作成功');
          vm.fetchUsers();
          vm.fetchDashboard();
        }).catch(function (err) {
          vm.$message.error(err.message || '操作失败');
        });
      },
      readMerchantQuery: function (query) {
        return { keyword: query.keyword || '', auditStatus: query.auditStatus != null ? query.auditStatus : '0', pageNum: parsePositiveInt(query.pageNum, 1), pageSize: 10 };
      },
      serializeMerchantQuery: function (state) {
        var query = {};
        if (state.keyword) query.keyword = state.keyword;
        if (state.auditStatus !== '') query.auditStatus = state.auditStatus;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      pushMerchantRouteQuery: function (overrides) {
        var next = Object.assign({}, this.merchantFilters, overrides || {});
        this.$router.push({ path: '/merchants', query: this.serializeMerchantQuery(next) });
      },
      fetchMerchants: function () {
        var vm = this;
        this.loading.merchants = true;
        return this.request({
          method: 'get',
          url: '/admin/merchant/list',
          params: {
            keyword: this.merchantFilters.keyword || undefined,
            auditStatus: this.merchantFilters.auditStatus || undefined,
            pageNum: this.merchantFilters.pageNum,
            pageSize: this.merchantFilters.pageSize
          }
        }).then(function (data) {
          vm.merchants = normalizePageResult(data, vm.merchantFilters.pageSize);
        }).catch(function (err) {
          vm.$message.error(err.message || '获取商家失败');
        }).finally(function () {
          vm.loading.merchants = false;
        });
      },
      fetchMerchantDetail: function (merchantId) {
        var vm = this;
        this.loading.merchantDetail = true;
        this.merchantDetail = null;
        return this.request({ method: 'get', url: '/admin/merchant/' + merchantId }).then(function (data) {
          vm.merchantDetail = data || null;
        }).catch(function (err) {
          vm.$message.error(err.message || '获取商家详情失败');
          vm.backToMerchants();
        }).finally(function () {
          vm.loading.merchantDetail = false;
        });
      },
      backToMerchants: function () {
        this.$router.push({ path: '/merchants', query: this.serializeMerchantQuery(this.merchantFilters) });
      },
      readServiceQuery: function (query) {
        return { keyword: query.keyword || '', auditStatus: query.auditStatus != null ? query.auditStatus : '0', pageNum: parsePositiveInt(query.pageNum, 1), pageSize: 10 };
      },
      serializeServiceQuery: function (state) {
        var query = {};
        if (state.keyword) query.keyword = state.keyword;
        if (state.auditStatus !== '') query.auditStatus = state.auditStatus;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      pushServiceRouteQuery: function (overrides) {
        var next = Object.assign({}, this.serviceFilters, overrides || {});
        this.$router.push({ path: '/services', query: this.serializeServiceQuery(next) });
      },
      fetchServices: function () {
        var vm = this;
        this.loading.services = true;
        return this.request({
          method: 'get',
          url: '/admin/service/list',
          params: {
            keyword: this.serviceFilters.keyword || undefined,
            auditStatus: this.serviceFilters.auditStatus || undefined,
            pageNum: this.serviceFilters.pageNum,
            pageSize: this.serviceFilters.pageSize
          }
        }).then(function (data) {
          vm.services = normalizePageResult(data, vm.serviceFilters.pageSize);
        }).catch(function (err) {
          vm.$message.error(err.message || '获取服务失败');
        }).finally(function () {
          vm.loading.services = false;
        });
      },
      fetchServiceDetail: function (serviceId) {
        var vm = this;
        this.loading.serviceDetail = true;
        this.serviceDetail = null;
        return this.request({ method: 'get', url: '/admin/service/' + serviceId }).then(function (data) {
          vm.serviceDetail = data || null;
        }).catch(function (err) {
          vm.$message.error(err.message || '获取服务详情失败');
          vm.backToServices();
        }).finally(function () {
          vm.loading.serviceDetail = false;
        });
      },
      backToServices: function () {
        this.$router.push({ path: '/services', query: this.serializeServiceQuery(this.serviceFilters) });
      },
      readOrderQuery: function (query) {
        var startDate = query.startDate || '';
        var endDate = query.endDate || '';
        return {
          orderNo: query.orderNo || '',
          status: query.status || '',
          dateRange: startDate && endDate ? [startDate, endDate] : [],
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 10
        };
      },
      serializeOrderQuery: function (state) {
        var query = {};
        if (state.orderNo) query.orderNo = state.orderNo;
        if (state.status !== '') query.status = state.status;
        if (state.dateRange && state.dateRange.length === 2) {
          query.startDate = state.dateRange[0];
          query.endDate = state.dateRange[1];
        }
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      pushOrderRouteQuery: function (overrides) {
        var next = Object.assign({}, this.orderFilters, overrides || {});
        this.$router.push({ path: '/orders', query: this.serializeOrderQuery(next) });
      },
      fetchOrders: function () {
        var vm = this;
        this.loading.orders = true;
        return this.request({
          method: 'get',
          url: '/admin/order/list',
          params: {
            orderNo: this.orderFilters.orderNo || undefined,
            status: this.orderFilters.status || undefined,
            startDate: this.orderFilters.dateRange && this.orderFilters.dateRange[0] ? this.orderFilters.dateRange[0] : undefined,
            endDate: this.orderFilters.dateRange && this.orderFilters.dateRange[1] ? this.orderFilters.dateRange[1] : undefined,
            pageNum: this.orderFilters.pageNum,
            pageSize: this.orderFilters.pageSize
          }
        }).then(function (data) {
          vm.orders = normalizePageResult(data, vm.orderFilters.pageSize);
        }).catch(function (err) {
          vm.$message.error(err.message || '获取订单失败');
        }).finally(function () {
          vm.loading.orders = false;
        });
      },
      fetchOrderDetail: function (orderId) {
        var vm = this;
        this.loading.orderDetail = true;
        this.orderDetail = null;
        return this.request({ method: 'get', url: '/admin/order/' + orderId }).then(function (data) {
          vm.orderDetail = data || null;
        }).catch(function (err) {
          vm.$message.error(err.message || '获取订单详情失败');
          vm.backToOrders();
        }).finally(function () {
          vm.loading.orderDetail = false;
        });
      },
      backToOrders: function () {
        this.$router.push({ path: '/orders', query: this.serializeOrderQuery(this.orderFilters) });
      },
      fetchCategories: function (showError) {
        var vm = this;
        this.loading.categories = true;
        return this.request({ method: 'get', url: '/admin/category/list' }).then(function (data) {
          vm.categories = data || [];
        }).catch(function (err) {
          if (showError !== false) vm.$message.error(err.message || '获取分类失败');
        }).finally(function () {
          vm.loading.categories = false;
        });
      },
      openCategoryDialog: function (row) {
        this.categoryForm = row ? Object.assign(defaultCategoryForm(), row) : defaultCategoryForm();
        this.categoryDialogVisible = true;
      },
      saveCategory: function () {
        var vm = this;
        if (!this.categoryForm.name) {
          this.$message.warning('请输入分类名称');
          return;
        }
        this.loading.saveCategory = true;
        return this.request({
          method: this.categoryForm.id ? 'put' : 'post',
          url: this.categoryForm.id ? '/admin/category/update' : '/admin/category/create',
          data: this.categoryForm
        }).then(function () {
          vm.$message.success('保存成功');
          vm.categoryDialogVisible = false;
          vm.fetchCategories();
        }).catch(function (err) {
          vm.$message.error(err.message || '保存失败');
        }).finally(function () {
          vm.loading.saveCategory = false;
        });
      },
      deleteCategory: function (id) {
        var vm = this;
        this.$confirm('确认删除该分类吗？', '提示', { type: 'warning' }).then(function () {
          return vm.request({ method: 'delete', url: '/admin/category/' + id });
        }).then(function () {
          vm.$message.success('删除成功');
          vm.fetchCategories();
        }).catch(function (err) {
          if (err && err.message) vm.$message.error(err.message);
        });
      },
      fetchNotices: function () {
        var vm = this;
        this.loading.notices = true;
        return this.request({ method: 'get', url: '/admin/notice/list' }).then(function (data) {
          vm.notices = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message || '获取公告失败');
        }).finally(function () {
          vm.loading.notices = false;
        });
      },
      openNoticeDialog: function (row) {
        this.noticeForm = row ? Object.assign(defaultNoticeForm(), row) : defaultNoticeForm();
        this.noticeDialogVisible = true;
      },
      saveNotice: function () {
        var vm = this;
        if (!this.noticeForm.title || !this.noticeForm.content) {
          this.$message.warning('请完整填写公告标题和内容');
          return;
        }
        this.loading.saveNotice = true;
        return this.request({
          method: this.noticeForm.id ? 'put' : 'post',
          url: this.noticeForm.id ? '/admin/notice/update' : '/admin/notice/create',
          data: this.noticeForm
        }).then(function () {
          vm.$message.success('保存成功');
          vm.noticeDialogVisible = false;
          vm.fetchNotices();
        }).catch(function (err) {
          vm.$message.error(err.message || '保存失败');
        }).finally(function () {
          vm.loading.saveNotice = false;
        });
      },
      deleteNotice: function (id) {
        var vm = this;
        this.$confirm('确认删除该公告吗？', '提示', { type: 'warning' }).then(function () {
          return vm.request({ method: 'delete', url: '/admin/notice/' + id });
        }).then(function () {
          vm.$message.success('删除成功');
          vm.fetchNotices();
        }).catch(function (err) {
          if (err && err.message) vm.$message.error(err.message);
        });
      },
      fetchBanners: function () {
        var vm = this;
        this.loading.banners = true;
        return this.request({ method: 'get', url: '/admin/banner/list' }).then(function (data) {
          vm.banners = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message || '获取轮播图失败');
        }).finally(function () {
          vm.loading.banners = false;
        });
      },
      openBannerDialog: function (row) {
        this.bannerForm = row ? Object.assign(defaultBannerForm(), row) : defaultBannerForm();
        this.bannerDialogVisible = true;
      },
      saveBanner: function () {
        var vm = this;
        if (!this.bannerForm.imageUrl) {
          this.$message.warning('请先上传轮播图');
          return;
        }
        this.loading.saveBanner = true;
        return this.request({
          method: this.bannerForm.id ? 'put' : 'post',
          url: this.bannerForm.id ? '/admin/banner/update' : '/admin/banner/create',
          data: this.bannerForm
        }).then(function () {
          vm.$message.success('保存成功');
          vm.bannerDialogVisible = false;
          vm.fetchBanners();
        }).catch(function (err) {
          vm.$message.error(err.message || '保存失败');
        }).finally(function () {
          vm.loading.saveBanner = false;
        });
      },
      deleteBanner: function (id) {
        var vm = this;
        this.$confirm('确认删除该轮播图吗？', '提示', { type: 'warning' }).then(function () {
          return vm.request({ method: 'delete', url: '/admin/banner/' + id });
        }).then(function () {
          vm.$message.success('删除成功');
          vm.fetchBanners();
        }).catch(function (err) {
          if (err && err.message) vm.$message.error(err.message);
        });
      },
      approveAudit: function (targetType, row) {
        var vm = this;
        this.$confirm('确认通过该' + (targetType === 'merchant' ? '商家' : '服务') + '审核吗？', '提示', { type: 'warning' }).then(function () {
          return vm.request({ method: 'post', url: '/admin/' + targetType + '/audit', data: { id: row.id, status: '2', remark: '审核通过' } });
        }).then(function () {
          vm.$message.success('审核完成');
          vm.afterAuditSuccess(targetType, row.id);
        }).catch(function (err) {
          if (err && err.message) vm.$message.error(err.message);
        });
      },
      openRejectAudit: function (targetType, row) {
        this.auditDialog = {
          targetType: targetType,
          id: row.id,
          name: row.name || (targetType === 'merchant' ? '商家资料' : '服务项目'),
          remark: ''
        };
        this.auditDialogVisible = true;
      },
      submitRejectAudit: function () {
        var vm = this;
        if (!this.auditDialog.remark || !this.auditDialog.remark.trim()) {
          this.$message.warning('请输入驳回原因');
          return;
        }
        this.loading.audit = true;
        return this.request({
          method: 'post',
          url: '/admin/' + this.auditDialog.targetType + '/audit',
          data: { id: this.auditDialog.id, status: '1', remark: this.auditDialog.remark.trim() }
        }).then(function () {
          vm.$message.success('驳回成功');
          vm.auditDialogVisible = false;
          vm.afterAuditSuccess(vm.auditDialog.targetType, vm.auditDialog.id);
        }).catch(function (err) {
          vm.$message.error(err.message || '驳回失败');
        }).finally(function () {
          vm.loading.audit = false;
        });
      },
      afterAuditSuccess: function (targetType, id) {
        this.fetchDashboard();
        if (targetType === 'merchant') {
          if (this.$route.name === 'merchant-detail' && String(this.$route.params.id) === String(id)) {
            this.fetchMerchantDetail(id);
          } else {
            this.fetchMerchants();
          }
          this.fetchUsers();
        } else {
          if (this.$route.name === 'service-detail' && String(this.$route.params.id) === String(id)) {
            this.fetchServiceDetail(id);
          } else {
            this.fetchServices();
          }
        }
      },
      validateImageUpload: function (file, label) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) {
          this.$message.warning(label + '仅支持图片格式');
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          this.$message.warning(label + '不能超过 5MB');
          return false;
        }
        return true;
      },
      uploadFile: function (file) {
        var vm = this;
        var formData = new FormData();
        formData.append('file', file);
        return api.post('/common/upload', formData, {
          headers: this.headers({ 'Content-Type': 'multipart/form-data' })
        }).then(function (res) {
          if (res.data.code === 401) {
            vm.handleAuthExpired();
            throw new Error(res.data.message || '登录已失效');
          }
          if (res.data.code !== 200) {
            throw new Error(res.data.message || '上传失败');
          }
          return res.data.data.url;
        });
      },
      uploadCategoryIcon: function (request) {
        var vm = this;
        if (!this.validateImageUpload(request.file, '分类图标')) {
          request.onError(new Error('invalid file'));
          return;
        }
        this.loading.uploadCategory = true;
        this.uploadFile(request.file).then(function (url) {
          vm.categoryForm.icon = url;
          vm.$message.success('图标上传成功');
          request.onSuccess({ url: url });
        }).catch(function (err) {
          vm.$message.error(err.message || '上传失败');
          request.onError(err);
        }).finally(function () {
          vm.loading.uploadCategory = false;
        });
      },
      uploadBannerImage: function (request) {
        var vm = this;
        if (!this.validateImageUpload(request.file, '轮播图')) {
          request.onError(new Error('invalid file'));
          return;
        }
        this.loading.uploadBanner = true;
        this.uploadFile(request.file).then(function (url) {
          vm.bannerForm.imageUrl = url;
          vm.$message.success('图片上传成功');
          request.onSuccess({ url: url });
        }).catch(function (err) {
          vm.$message.error(err.message || '上传失败');
          request.onError(err);
        }).finally(function () {
          vm.loading.uploadBanner = false;
        });
      },
      normalizeUrl: function (url) {
        return normalizeResourceUrl(url);
      },
      isElementIcon: function (icon) {
        return typeof icon === 'string' && /^el-icon-/.test(icon.trim());
      },
      avatarText: function (name) {
        var value = String(name || '?').trim();
        return value ? value.slice(0, 1) : '?';
      },
      roleText: function (role) {
        return { user: '用户', merchant: '商家', admin: '管理员', staff: '服务人员' }[role] || role;
      },
      auditText: function (status) {
        return { '0': '待审核', '1': '已驳回', '2': '已通过' }[status] || '未知';
      },
      auditTagType: function (status) {
        return { '0': 'warning', '1': 'danger', '2': 'success' }[status] || '';
      },
      orderStatusText: function (status) {
        return { '0': '待支付', '1': '待接单', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType: function (status) {
        return { '0': 'warning', '1': 'warning', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      formatDate: function (value) {
        if (!value) return '-';
        return String(value).replace('T', ' ').slice(0, 19);
      },
      shortDate: function (value) {
        if (!value) return '';
        var parts = String(value).split('-');
        return parts[1] + '/' + parts[2];
      },
      trendHeight: function (count) {
        var max = Math.max.apply(null, (this.orderTrend || []).map(function (item) {
          return Number(item.count || 0);
        }).concat([1]));
        return Math.max(20, Math.round((Number(count || 0) / max) * 180)) + 'px';
      },
      rankWidth: function (count) {
        var max = Math.max.apply(null, (this.merchantRanks || []).map(function (item) {
          return Number(item.count || 0);
        }).concat([1]));
        return Math.max(18, Math.round((Number(count || 0) / max) * 100)) + '%';
      },
      categoryName: function (categoryId) {
        var match = (this.categories || []).find(function (item) { return String(item.id) === String(categoryId); });
        return match ? match.name : '未分类';
      },
      merchantDisplayName: function (row) {
        if (!row) return '平台商家';
        if (row.merchantName) return row.merchantName;
        if (row.merchant && row.merchant.name) return row.merchant.name;
        if (row.merchantId) {
          var match = (this.merchants.list || []).find(function (item) { return String(item.id) === String(row.merchantId); });
          if (match) return match.name;
          return '商家 #' + row.merchantId;
        }
        return '平台商家';
      },
      serviceCover: function (row) {
        return normalizeResourceUrl(firstImage(row && (row.images || row.imageList)) || LOCAL_SERVICE_PLACEHOLDER);
      },
      serviceImageList: function (row) {
        return splitImages(row && (row.images || row.imageList));
      },
      orderServiceImage: function (row) {
        return normalizeResourceUrl((row && (row.serviceImage || (row.service && (row.service.imageUrl || row.service.images || row.service.imageList)))) || firstImage(row && row.images) || LOCAL_SERVICE_PLACEHOLDER);
      },
      orderServiceName: function (row) {
        return (row && row.service && row.service.name) || row.serviceName || '服务项目';
      },
      orderMerchantName: function (row) {
        return (row && row.merchant && row.merchant.name) || row.merchantName || '平台商家';
      },
      orderMerchantPhone: function (row) {
        return (row && row.merchant && row.merchant.phone) || row.merchantPhone || '';
      },
      orderUserName: function (row) {
        return (row && row.user && (row.user.nickname || row.user.username)) || row.userName || '用户';
      },
      orderUserPhone: function (row) {
        return (row && row.user && row.user.phone) || row.userPhone || '';
      },
      orderTimeline: function (row) {
        if (!row) return [];
        var steps = [
          { label: '创建订单', time: this.formatDate(row.createTime) },
          { label: '完成支付', time: this.formatDate(row.payTime) },
          { label: '商家接单', time: this.formatDate(row.acceptTime) },
          { label: '开始服务', time: this.formatDate(row.startTime) }
        ];
        steps.push(String(row.status) === '5'
          ? { label: '订单取消', time: this.formatDate(row.cancelTime) }
          : { label: '服务完成', time: this.formatDate(row.completeTime) });
        return steps;
      }
    }
  });
})();
