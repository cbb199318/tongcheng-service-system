import Vue from 'vue';
import VueRouter from 'vue-router';
import axios from 'axios';
import { createPortalRouter } from '../../utils/portalRouter';

const API_BASE = '';
const RESOURCE_BASE = 'http://127.0.0.1:8080';
const LOCAL_SERVICE_PLACEHOLDER = '/service-placeholder.svg';
const api = axios.create({ baseURL: API_BASE });

function createMerchantPortal(el) {

  function defaultServiceForm() {
    return {
      id: null,
      categoryId: '',
      name: '',
      price: '',
      duration: '',
      description: '',
      tagText: '',
      imageList: []
    };
  }

  function defaultReplyForm() {
    return { reviewId: null, reply: '' };
  }

  function defaultRejectForm() {
    return { orderId: null, reason: '' };
  }

  function defaultStaffForm() {
    return { id: null, name: '', phone: '', specialty: '' };
  }

  function defaultMessageForm() {
    return { orderId: null, content: '' };
  }

  function normalizeResourceUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || /^data:/.test(url)) return url;
    if (url.indexOf('/upload/') === 0) return RESOURCE_BASE + url;
    return url;
  }

  function splitCsv(value, mapper) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(function (item) { return mapper ? mapper(item) : item; });
    return String(value).split(',').map(function (item) { return item.trim(); }).filter(Boolean).map(function (item) {
      return mapper ? mapper(item) : item;
    });
  }

  function splitImages(value) {
    return splitCsv(value, normalizeResourceUrl);
  }

  function splitTags(value) {
    return splitCsv(value);
  }

  function firstImage(value) {
    var images = splitImages(value);
    return images.length ? images[0] : '';
  }

  function parsePositiveInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  const PORTAL_TOKEN_KEY = 'merchantPortalToken';
  const PORTAL_ROLE_KEY = 'merchantPortalRole';
  const LEGACY_MERCHANT_TOKEN_KEY = 'merchantToken';
  const LEGACY_STAFF_TOKEN_KEY = 'staffToken';

  function readStoredPortalRole() {
    return localStorage.getItem(PORTAL_ROLE_KEY)
      || (localStorage.getItem(LEGACY_STAFF_TOKEN_KEY) ? 'staff' : '')
      || (localStorage.getItem(LEGACY_MERCHANT_TOKEN_KEY) ? 'merchant' : '');
  }

  function readStoredPortalToken() {
    return localStorage.getItem(PORTAL_TOKEN_KEY)
      || localStorage.getItem(LEGACY_STAFF_TOKEN_KEY)
      || localStorage.getItem(LEGACY_MERCHANT_TOKEN_KEY)
      || '';
  }

  function defaultPathForRole(role) {
    return role === 'staff' ? '/staff/dashboard' : '/dashboard';
  }

  Vue.use(VueRouter);

  const LoginPage = {
    template: `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo" :style="{ background: app.loginMode === 'staff' ? 'linear-gradient(135deg,#10b981,#0f766e)' : 'linear-gradient(135deg,#fb923c,#ea580c)' }">{{ app.loginMode === 'staff' ? 'S' : 'M' }}</div>
            <h1 :style="{ color: app.loginMode === 'staff' ? '#0f766e' : '#ea580c' }">同城服务平台商家工作台</h1>
            <p>{{ app.loginMode === 'staff' ? '服务人员登录后仅处理分配给自己的订单与沟通。' : '商家登录后进入后台，完成资料维护、服务管理、订单处理与评价回复。' }}</p>
          </div>
          <div class="auth-actions">
            <el-button :type="app.loginMode === 'merchant' ? 'primary' : 'default'" @click="app.switchLoginMode('merchant')">商家登录</el-button>
            <el-button :type="app.loginMode === 'staff' ? 'primary' : 'default'" @click="app.switchLoginMode('staff')">员工登录</el-button>
          </div>
          <el-form :model="app.loginForm" label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="app.loginForm.username" prefix-icon="el-icon-user-solid"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="app.loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input>
            </el-form-item>
            <el-button class="auth-submit" type="primary" :loading="app.loading.login" :style="{ background: app.loginMode === 'staff' ? 'linear-gradient(135deg,#10b981,#0f766e)' : 'linear-gradient(135deg,#fb923c,#ea580c)' }" @click="app.login">
              {{ app.loginMode === 'staff' ? '登录员工视图' : '登录商家端' }}
            </el-button>
          </el-form>
          <div class="auth-footnote">{{ app.loginMode === 'staff' ? '演示员工：staff1_1 / 123456' : '演示商家：merchant01 / 123456' }}</div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    }
  };

  const DashboardPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>控制台</h3>
            <p>查看资料、服务、订单和评价处理情况。</p>
          </div>
          <el-button type="primary" @click="$router.push('/services/new')">新增服务</el-button>
        </div>

        <div class="stat-grid">
          <div class="stat-card stat-orange"><span>审核状态</span><strong>{{ app.auditText(app.dashboardSummary.auditStatus || app.authInfo.auditStatus) }}</strong></div>
          <div class="stat-card stat-blue"><span>服务总数</span><strong>{{ app.dashboardSummary.serviceCount || 0 }}</strong></div>
          <div class="stat-card stat-green"><span>待接单</span><strong>{{ app.dashboardSummary.pendingOrderCount || 0 }}</strong></div>
          <div class="stat-card stat-violet"><span>待回复评价</span><strong>{{ app.dashboardSummary.pendingReplyReviewCount || 0 }}</strong></div>
        </div>

        <div class="summary-strip">
          <div class="summary-mini-card"><span>待审核服务</span><strong>{{ app.dashboardSummary.pendingAuditServiceCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>已上架服务</span><strong>{{ app.dashboardSummary.onShelfServiceCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>已接单</span><strong>{{ app.dashboardSummary.acceptedOrderCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>服务中</span><strong>{{ app.dashboardSummary.inServiceOrderCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>员工人数</span><strong>{{ app.dashboardSummary.staffCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>累计订单</span><strong>{{ app.dashboardSummary.orderCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>商家评分</span><strong>{{ app.dashboardSummary.rating || app.merchantInfo.rating || '4.8' }}</strong></div>
        </div>

        <div class="editor-layout">
          <div class="content-card">
            <div class="section-title"><h3>快捷操作</h3></div>
            <div class="account-actions">
              <el-button type="primary" @click="$router.push('/info')">完善资料</el-button>
              <el-button @click="$router.push('/services')">查看服务</el-button>
              <el-button @click="$router.push({ path: '/orders', query: { status: '1' } })">处理待接单</el-button>
              <el-button @click="$router.push({ path: '/reviews', query: { hasReply: '0' } })">回复评价</el-button>
            </div>
          </div>

          <div class="preview-stack">
            <div class="preview-card">
              <h4>当前商家</h4>
              <div class="demo-text">{{ app.merchantInfo.name || app.authInfo.name || '商家账号' }}</div>
              <div class="demo-text" style="margin-top:8px;">{{ app.merchantInfo.address || '请先补充商家地址' }}</div>
            </div>
            <div class="preview-card">
              <h4>审核备注</h4>
              <div class="demo-text">{{ app.merchantInfo.auditRemark || '当前暂无审核备注。' }}</div>
            </div>
            <div class="preview-card">
              <h4>扩展预留</h4>
              <div class="demo-text">人员招募与服务沟通继续保留二期接口边界，当前版本聚焦核心业务流程。</div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.fetchDashboardSummary();
      this.app.fetchMerchantInfo();
    }
  };

  const InfoPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>商家信息</h3>
            <p>资料更新后会重新进入审核流程。</p>
          </div>
          <el-button type="primary" :loading="app.loading.saveMerchant" @click="app.saveMerchantInfo">保存资料</el-button>
        </div>

        <div class="summary-strip">
          <div class="summary-mini-card"><span>审核状态</span><strong>{{ app.auditText(app.merchantInfo.auditStatus || app.authInfo.auditStatus) }}</strong></div>
          <div class="summary-mini-card"><span>审核备注</span><strong>{{ app.merchantInfo.auditRemark || '暂无审核备注' }}</strong></div>
          <div class="summary-mini-card"><span>累计订单</span><strong>{{ app.merchantInfo.orderCount || 0 }}</strong></div>
        </div>

        <div class="editor-layout">
          <div class="content-card">
            <el-form :model="app.merchantInfo" label-width="110px">
              <el-form-item label="商家名称"><el-input v-model="app.merchantInfo.name"></el-input></el-form-item>
              <el-form-item label="联系电话"><el-input v-model="app.merchantInfo.phone"></el-input></el-form-item>
              <el-form-item label="商家地址"><el-input type="textarea" :rows="2" v-model="app.merchantInfo.address"></el-input></el-form-item>
              <el-form-item label="商家简介"><el-input type="textarea" :rows="5" v-model="app.merchantInfo.intro"></el-input></el-form-item>
              <el-form-item label="商家 Logo">
                <div class="upload-row">
                  <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadLogo">
                    <el-button icon="el-icon-upload2" :loading="app.loading.uploadLogo">上传 Logo</el-button>
                  </el-upload>
                  <span class="upload-tip">建议上传方形图片，单张不超过 5MB。</span>
                </div>
              </el-form-item>
              <el-form-item label="资质证书">
                <div class="upload-row">
                  <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadLicense">
                    <el-button type="primary" icon="el-icon-upload" :loading="app.loading.uploadLicense">上传资质证书</el-button>
                  </el-upload>
                  <span class="upload-tip">上传清晰可见的资质照片，保存后将重新进入审核。</span>
                </div>
              </el-form-item>
            </el-form>
          </div>

          <div class="preview-stack">
            <div class="preview-card">
              <h4>商家 Logo 预览</h4>
              <div class="preview-media">
                <img v-if="app.merchantInfo.logo" :src="app.normalizeUrl(app.merchantInfo.logo)" alt="logo">
                <span v-else>未上传 Logo</span>
              </div>
            </div>
            <div class="preview-card">
              <h4>资质证书预览</h4>
              <div class="preview-media tall">
                <img v-if="app.merchantInfo.license" :src="app.normalizeUrl(app.merchantInfo.license)" alt="license">
                <span v-else>未上传资质证书</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.fetchMerchantInfo();
    },
    methods: {
      uploadLogo: function (request) {
        this.app.handleMerchantAssetUpload(request, 'logo');
      },
      uploadLicense: function (request) {
        this.app.handleMerchantAssetUpload(request, 'license');
      }
    }
  };

  const ServicesPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>服务管理</h3>
            <p>支持关键词、审核状态、上下架状态筛选，并使用真实分页展示服务列表。</p>
          </div>
          <el-button type="primary" @click="$router.push('/services/new')">新增服务</el-button>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.serviceFilters.keyword" placeholder="搜索服务名称" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.serviceFilters.auditStatus" clearable placeholder="审核状态" @change="applyFilters">
            <el-option label="待审核" value="0"></el-option>
            <el-option label="已驳回" value="1"></el-option>
            <el-option label="已通过" value="2"></el-option>
          </el-select>
          <el-select v-model="app.serviceFilters.status" clearable placeholder="上下架状态" @change="applyFilters">
            <el-option label="已上架" value="1"></el-option>
            <el-option label="已下架" value="0"></el-option>
          </el-select>
          <el-button @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="summary-strip">
          <div class="summary-mini-card"><span>服务总数</span><strong>{{ app.serviceList.total || 0 }}</strong></div>
          <div class="summary-mini-card"><span>待审核</span><strong>{{ app.dashboardSummary.pendingAuditServiceCount || 0 }}</strong></div>
          <div class="summary-mini-card"><span>已上架</span><strong>{{ app.dashboardSummary.onShelfServiceCount || 0 }}</strong></div>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.serviceList.list || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="服务信息" min-width="320">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.serviceCover(scope.row)" alt="service">
                  <div>
                    <div>{{ scope.row.name }}</div>
                    <div class="row-subtext">{{ scope.row.categoryName || app.categoryName(scope.row.categoryId) }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="价格/时长" width="150">
              <template slot-scope="scope">
                <div>￥{{ scope.row.price }}</div>
                <div class="row-subtext">{{ scope.row.duration || 60 }} 分钟</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="190">
              <template slot-scope="scope">
                <el-tag size="mini" :type="app.auditTagType(scope.row.auditStatus)">{{ app.auditText(scope.row.auditStatus) }}</el-tag>
                <el-tag size="mini" style="margin-left:8px;">{{ app.shelfText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="auditRemark" label="审核备注" min-width="160"></el-table-column>
            <el-table-column label="更新时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.updateTime || scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="$router.push('/services/' + scope.row.id + '/edit')">编辑</span>
                  <span class="action-link warning" @click="app.toggleServiceStatus(scope.row)">{{ scope.row.status === 1 ? '下架' : '上架' }}</span>
                  <span class="action-link danger" @click="app.deleteService(scope.row.id)">删除</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="user-pagination" v-if="Number(app.serviceList.total || 0) > 0">
          <el-pagination background layout="prev, pager, next" :current-page="app.serviceFilters.pageNum" :page-size="app.serviceFilters.pageSize" :total="Number(app.serviceList.total || 0)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.handleServiceRoute(this.$route.query);
    },
    watch: {
      '$route.query': function (query) {
        this.app.handleServiceRoute(query);
      }
    },
    methods: {
      search: function () {
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushServiceRouteQuery({ keyword: '', auditStatus: '', status: '', pageNum: 1 });
      },
      applyFilters: function () {
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushServiceRouteQuery({ pageNum: page });
      }
    }
  };

  const ServiceEditorPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>{{ isEdit ? '编辑服务' : '新增服务' }}</h3>
            <p>填写服务名称、分类、价格、时长、描述和图片，提交后进入待审核状态。</p>
          </div>
          <div class="account-actions">
            <el-button @click="$router.push('/services')">返回列表</el-button>
            <el-button type="primary" :loading="app.loading.saveService" @click="app.saveService">提交服务</el-button>
          </div>
        </div>

        <div class="editor-layout">
          <div class="content-card">
            <el-form :model="app.serviceForm" label-width="100px">
              <el-form-item label="服务分类">
                <el-select v-model="app.serviceForm.categoryId" placeholder="选择分类" style="width:100%">
                  <el-option v-for="item in app.categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="服务名称"><el-input v-model="app.serviceForm.name"></el-input></el-form-item>
              <el-form-item label="服务价格"><el-input v-model="app.serviceForm.price"></el-input></el-form-item>
              <el-form-item label="服务时长"><el-input v-model="app.serviceForm.duration" placeholder="分钟"></el-input></el-form-item>
              <el-form-item label="服务标签"><el-input v-model="app.serviceForm.tagText" placeholder="多个标签用英文逗号分隔"></el-input></el-form-item>
              <el-form-item label="服务描述"><el-input type="textarea" :rows="6" v-model="app.serviceForm.description"></el-input></el-form-item>
              <el-form-item label="服务图片">
                <div class="upload-row">
                  <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadServiceImage">
                    <el-button icon="el-icon-upload" :loading="app.loading.uploadServiceImage">上传服务图片</el-button>
                  </el-upload>
                  <span class="upload-tip">支持多图上传，最多保留 5 张图片。</span>
                </div>
                <div class="review-image-strip" v-if="app.serviceForm.imageList.length">
                  <div v-for="(url, index) in app.serviceForm.imageList" :key="url + index" style="position:relative;">
                    <img :src="app.normalizeUrl(url)" alt="service">
                    <el-button type="text" style="display:block;margin-top:4px;" @click="app.removeServiceImage(index)">移除</el-button>
                  </div>
                </div>
                <div v-else class="mini-empty">尚未上传服务图片</div>
              </el-form-item>
            </el-form>
          </div>

          <div class="preview-stack">
            <div class="preview-card">
              <h4>主图预览</h4>
              <div class="preview-media">
                <img :src="app.servicePrimaryImage" alt="cover">
              </div>
            </div>
            <div class="preview-card">
              <h4>标签预览</h4>
              <div class="metric-inline" v-if="app.serviceTagList.length">
                <el-tag v-for="item in app.serviceTagList" :key="item" size="mini">{{ item }}</el-tag>
              </div>
              <div v-else class="mini-empty">暂无标签</div>
            </div>
            <div class="preview-card">
              <h4>审核结果</h4>
              <div class="demo-text">保存后服务将进入待审核状态，审核通过后才会在用户端展示。</div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      },
      isEdit: function () {
        return !!this.$route.params.id;
      }
    },
    created: function () {
      this.app.prepareServiceEditor(this.$route.params.id);
    },
    watch: {
      '$route.params.id': function (id) {
        this.app.prepareServiceEditor(id);
      }
    },
    methods: {
      uploadServiceImage: function (request) {
        this.app.handleServiceImageUpload(request);
      }
    }
  };

  const OrdersPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>订单处理</h3>
            <p>按订单状态处理和跟进服务进度。</p>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.orderFilters.status === '' ? 'primary' : 'default'" @click="changeStatus('')">全部</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '1' ? 'primary' : 'default'" @click="changeStatus('1')">待接单</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '2' ? 'primary' : 'default'" @click="changeStatus('2')">已接单</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '3' ? 'primary' : 'default'" @click="changeStatus('3')">服务中</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '4' ? 'primary' : 'default'" @click="changeStatus('4')">已完成</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '5' ? 'primary' : 'default'" @click="changeStatus('5')">已取消</el-button>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.orderFilters.orderNo" placeholder="输入订单号查询" @keyup.enter.native="search"></el-input>
          <el-button @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.orderList.list || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="orderNo" label="订单编号" width="210"></el-table-column>
            <el-table-column label="服务信息" min-width="240">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.orderServiceImage(scope.row)" alt="service">
                  <div>
                    <div>{{ scope.row.serviceName }}</div>
                    <div class="row-subtext">{{ scope.row.categoryName || '服务类目' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用户/预约" min-width="200">
              <template slot-scope="scope">
                <div>{{ scope.row.userName || '用户' }}</div>
                <div class="row-subtext">{{ scope.row.appointDate }} · {{ scope.row.appointSlot }}</div>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="110">
              <template slot-scope="scope">￥{{ scope.row.totalPrice }}</template>
            </el-table-column>
            <el-table-column label="履约员工" min-width="180">
              <template slot-scope="scope">
                <div>{{ scope.row.staff ? scope.row.staff.name : '暂未分配' }}</div>
                <div class="row-subtext">{{ scope.row.staff ? (scope.row.staff.phone || '无联系电话') : '接单后可分配' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope">
                <el-tag size="mini" :type="app.orderTagType(scope.row.status)">{{ app.orderStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="$router.push('/orders/' + scope.row.id)">详情</span>
                  <span v-if="scope.row.status === '1'" class="action-link" @click="app.acceptOrder(scope.row.id)">接单</span>
                  <span v-if="scope.row.status === '1'" class="action-link danger" @click="app.openRejectDialog(scope.row)">拒单</span>
                  <span v-if="scope.row.status === '2'" class="action-link warning" @click="app.startOrder(scope.row.id)">开始服务</span>
                  <span v-if="scope.row.status === '3'" class="action-link" @click="app.completeOrder(scope.row.id)">完成服务</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="user-pagination" v-if="Number(app.orderList.total || 0) > 0">
          <el-pagination background layout="prev, pager, next" :current-page="app.orderFilters.pageNum" :page-size="app.orderFilters.pageSize" :total="Number(app.orderList.total || 0)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.handleOrderRoute(this.$route.query);
    },
    watch: {
      '$route.query': function (query) {
        this.app.handleOrderRoute(query);
      }
    },
    methods: {
      changeStatus: function (status) {
        this.app.pushOrderRouteQuery({ status: status, pageNum: 1 });
      },
      search: function () {
        this.app.pushOrderRouteQuery({ pageNum: 1 });
      },
      reset: function () {
        this.app.pushOrderRouteQuery({ status: '', orderNo: '', pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushOrderRouteQuery({ pageNum: page });
      }
    }
  };

  const StaffManagementPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>员工管理</h3>
            <p>商家可新增、维护、启停员工账号，并把订单分配给在职服务人员。</p>
          </div>
          <el-button type="primary" @click="app.openStaffDialog()">新增员工</el-button>
        </div>

        <div class="list-toolbar">
          <el-input v-model="app.staffFilters.keyword" placeholder="搜索姓名或电话" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.staffFilters.status" clearable placeholder="员工状态" @change="search">
            <el-option label="在职" :value="1"></el-option>
            <el-option label="停用" :value="0"></el-option>
          </el-select>
          <el-button @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.staffList || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="账号信息" min-width="220">
              <template slot-scope="scope">
                <div>{{ scope.row.name }}</div>
                <div class="row-subtext">{{ scope.row.username }} · {{ scope.row.phone }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="specialty" label="擅长标签" min-width="200"></el-table-column>
            <el-table-column label="状态" width="100">
              <template slot-scope="scope">
                <el-tag size="mini" :type="scope.row.status === 1 ? 'success' : 'info'">{{ scope.row.statusText }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="app.openStaffDialog(scope.row)">编辑</span>
                  <span class="action-link warning" @click="app.toggleStaffStatus(scope.row)">{{ scope.row.status === 1 ? '停用' : '启用' }}</span>
                  <span class="action-link" @click="app.resetStaffPassword(scope.row)">重置密码</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="summary-strip" style="margin-top:18px;">
          <div class="summary-mini-card"><span>员工总数</span><strong>{{ app.staffList.length }}</strong></div>
          <div class="summary-mini-card"><span>在职员工</span><strong>{{ app.staffStatusCount(1) }}</strong></div>
          <div class="summary-mini-card"><span>停用员工</span><strong>{{ app.staffStatusCount(0) }}</strong></div>
        </div>

        <div class="editor-layout" style="margin-top:18px;">
          <div class="preview-card">
            <h4>账号生成规则</h4>
            <div class="demo-text">新增员工后系统会自动创建 staff 账号，用户名按 staff{merchantId}_{序号} 生成，初始密码统一为 123456。</div>
          </div>
          <div class="preview-card">
            <h4>分配说明</h4>
            <div class="demo-text">只有在职员工可被分配到已接单或服务中的订单。停用员工不会再接收新订单，但历史分配记录仍会保留。</div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.fetchStaffList();
    },
    methods: {
      search: function () {
        this.app.fetchStaffList();
      },
      reset: function () {
        this.app.staffFilters = { keyword: '', status: '' };
        this.app.fetchStaffList();
      }
    }
  };

  const StaffDashboardPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>我的工作台</h3>
            <p>仅处理分配给自己的订单，不展示全店运营与管理能力。</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card stat-blue"><span>待服务</span><strong>{{ app.staffDashboard.pendingServiceCount || 0 }}</strong></div>
          <div class="stat-card stat-green"><span>服务中</span><strong>{{ app.staffDashboard.inServiceCount || 0 }}</strong></div>
          <div class="stat-card stat-violet"><span>已完成</span><strong>{{ app.staffDashboard.completedCount || 0 }}</strong></div>
          <div class="stat-card stat-orange"><span>累计分配</span><strong>{{ app.staffDashboard.totalAssignedCount || 0 }}</strong></div>
        </div>

        <div class="editor-layout">
          <div class="content-card">
            <div class="section-title"><h3>当前账号</h3></div>
            <div class="staff-profile-grid">
              <div><span>姓名</span><strong>{{ app.staffProfile.name || '-' }}</strong></div>
              <div><span>账号</span><strong>{{ app.staffProfile.username || '-' }}</strong></div>
              <div><span>联系电话</span><strong>{{ app.staffProfile.phone || '-' }}</strong></div>
              <div><span>所属商家</span><strong>{{ app.staffProfile.merchantName || '-' }}</strong></div>
              <div><span>商家电话</span><strong>{{ app.staffProfile.merchantPhone || '-' }}</strong></div>
              <div><span>擅长标签</span><strong>{{ app.staffProfile.specialty || '暂无' }}</strong></div>
              <div><span>状态</span><strong>{{ app.staffProfile.status === 1 ? '在职' : '停用' }}</strong></div>
              <div><span>商家地址</span><strong>{{ app.staffProfile.merchantAddress || '-' }}</strong></div>
            </div>
          </div>
          <div class="preview-stack">
            <div class="preview-card">
              <h4>工作说明</h4>
              <div class="demo-text">你只能查看和处理分配给自己的订单，不能管理服务、审核或查看全店订单。</div>
            </div>
            <div class="preview-card">
              <h4>快捷入口</h4>
              <div class="account-actions">
                <el-button type="primary" @click="$router.push({ path: '/staff/orders', query: { status: '2' } })">处理待服务</el-button>
                <el-button @click="$router.push('/staff/orders')">查看我的订单</el-button>
              </div>
            </div>
            <div class="preview-card">
              <h4>当前分配概况</h4>
              <div class="demo-text">待服务：{{ app.staffDashboard.pendingServiceCount || 0 }}</div>
              <div class="demo-text">服务中：{{ app.staffDashboard.inServiceCount || 0 }}</div>
              <div class="demo-text">已完成：{{ app.staffDashboard.completedCount || 0 }}</div>
              <div class="demo-text">已取消：{{ app.staffDashboard.cancelledCount || 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.bootstrap();
    }
  };

  const StaffOrdersPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>我的订单</h3>
            <p>仅展示分配给当前服务人员的订单。</p>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.staffOrderFilters.status === '' ? 'primary' : 'default'" @click="changeStatus('')">全部</el-button>
          <el-button size="mini" :type="app.staffOrderFilters.status === '2' ? 'primary' : 'default'" @click="changeStatus('2')">待服务</el-button>
          <el-button size="mini" :type="app.staffOrderFilters.status === '3' ? 'primary' : 'default'" @click="changeStatus('3')">服务中</el-button>
          <el-button size="mini" :type="app.staffOrderFilters.status === '4' ? 'primary' : 'default'" @click="changeStatus('4')">已完成</el-button>
          <el-button size="mini" :type="app.staffOrderFilters.status === '5' ? 'primary' : 'default'" @click="changeStatus('5')">已取消</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.staffOrderList.list || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="orderNo" label="订单号" width="210"></el-table-column>
            <el-table-column label="服务信息" min-width="220">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.orderServiceImage(scope.row)" alt="service">
                  <div>
                    <div>{{ scope.row.serviceName }}</div>
                    <div class="row-subtext">{{ scope.row.categoryName || '服务类目' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用户/预约" min-width="220">
              <template slot-scope="scope">
                <div>{{ scope.row.userName }}</div>
                <div class="row-subtext">{{ scope.row.appointDate }} · {{ scope.row.appointSlot }}</div>
              </template>
            </el-table-column>
            <el-table-column label="服务地址" min-width="220">
              <template slot-scope="scope">
                <div>{{ scope.row.address || '-' }}</div>
                <div class="row-subtext">分配时间 {{ app.formatDate(scope.row.assignTime) || '-' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template slot-scope="scope">
                <el-tag size="mini" :type="app.orderTagType(scope.row.status)">{{ app.orderStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="$router.push('/staff/orders/' + scope.row.id)">详情</span>
                  <span v-if="scope.row.status === '2'" class="action-link warning" @click="app.startStaffOrder(scope.row.id)">开始服务</span>
                  <span v-if="scope.row.status === '3'" class="action-link" @click="app.completeStaffOrder(scope.row.id)">完成服务</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="user-pagination" v-if="Number(app.staffOrderList.total || 0) > 0">
          <el-pagination background layout="prev, pager, next" :current-page="app.staffOrderFilters.pageNum" :page-size="app.staffOrderFilters.pageSize" :total="Number(app.staffOrderList.total || 0)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.handleStaffOrderRoute(this.$route.query);
    },
    watch: {
      '$route.query': function (query) {
        this.app.handleStaffOrderRoute(query);
      }
    },
    methods: {
      changeStatus: function (status) {
        this.app.pushStaffOrderRouteQuery({ status: status, pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushStaffOrderRouteQuery({ pageNum: page });
      }
    }
  };

  const StaffOrderDetailPage = {
    template: `
      <div v-if="app.staffCurrentOrderDetail">
        <div class="panel-section-title">
          <div>
            <h3>订单详情</h3>
            <p>围绕分配给自己的订单查看预约信息、沟通记录并推进履约。</p>
          </div>
          <div class="account-actions">
            <el-button @click="$router.push('/staff/orders')">返回订单列表</el-button>
            <el-button v-if="app.staffCurrentOrderDetail.status === '2'" type="warning" @click="app.startStaffOrder(app.staffCurrentOrderDetail.id)">开始服务</el-button>
            <el-button v-if="app.staffCurrentOrderDetail.status === '3'" type="success" @click="app.completeStaffOrder(app.staffCurrentOrderDetail.id)">完成服务</el-button>
          </div>
        </div>

        <div class="summary-strip">
          <div class="summary-mini-card"><span>订单编号</span><strong>{{ app.staffCurrentOrderDetail.orderNo }}</strong></div>
          <div class="summary-mini-card"><span>当前状态</span><strong>{{ app.orderStatusText(app.staffCurrentOrderDetail.status) }}</strong></div>
          <div class="summary-mini-card"><span>预约时间</span><strong>{{ app.staffCurrentOrderDetail.appointDate }} {{ app.staffCurrentOrderDetail.appointSlot }}</strong></div>
          <div class="summary-mini-card"><span>分配时间</span><strong>{{ app.formatDate(app.staffCurrentOrderDetail.assignTime) }}</strong></div>
        </div>

        <div class="content-card">
          <div class="order-progress-strip">
            <div class="order-progress-step" v-for="(step, index) in app.orderProgressSteps(app.staffCurrentOrderDetail)" :key="step.key" :class="{ done: step.done, current: step.current }">
              <div class="step-dot"></div>
              <strong>{{ step.label }}</strong>
              <span>{{ step.time || '待处理' }}</span>
              <div class="step-line" v-if="index < app.orderProgressSteps(app.staffCurrentOrderDetail).length - 1"></div>
            </div>
          </div>

          <div class="order-detail-grid">
            <div><span>服务名称</span><strong>{{ app.staffCurrentOrderDetail.serviceName || '-' }}</strong></div>
            <div><span>服务分类</span><strong>{{ app.staffCurrentOrderDetail.categoryName || '-' }}</strong></div>
            <div><span>用户姓名</span><strong>{{ app.staffCurrentOrderDetail.userName || '-' }}</strong></div>
            <div><span>联系电话</span><strong>{{ app.staffCurrentOrderDetail.userPhone || '-' }}</strong></div>
            <div><span>所属商家</span><strong>{{ app.staffCurrentOrderDetail.merchantName || '-' }}</strong></div>
            <div><span>商家电话</span><strong>{{ app.staffCurrentOrderDetail.merchantPhone || '-' }}</strong></div>
            <div><span>服务地址</span><strong>{{ app.staffCurrentOrderDetail.address || '-' }}</strong></div>
            <div><span>用户备注</span><strong>{{ app.staffCurrentOrderDetail.remark || '无' }}</strong></div>
            <div><span>服务时长</span><strong>{{ app.staffCurrentOrderDetail.serviceDuration || '-' }} 分钟</strong></div>
            <div><span>订单金额</span><strong>￥{{ app.staffCurrentOrderDetail.totalPrice || '-' }}</strong></div>
          </div>

          <div class="message-panel">
            <div class="section-title"><h3>订单沟通</h3></div>
            <div class="message-thread" v-if="app.staffOrderMessages.length">
              <div v-for="item in app.staffOrderMessages" :key="item.id" class="message-bubble" :class="{ 'is-self': item.senderRole === 'staff' }">
                <div class="message-head">
                  <strong>{{ item.senderName }} · {{ item.senderRole === 'merchant' ? '商家' : (item.senderRole === 'staff' ? '服务人员' : '用户') }}</strong>
                  <span>{{ app.formatDate(item.createTime) }}</span>
                </div>
                <div class="message-content">{{ item.content }}</div>
              </div>
            </div>
            <div v-else class="mini-empty">暂无沟通记录。</div>
            <div class="message-composer">
              <el-input type="textarea" :rows="3" v-model="app.staffOrderMessageForm.content" placeholder="请输入沟通内容"></el-input>
              <el-button type="primary" @click="app.sendStaffOrderMessage">发送</el-button>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.loadStaffOrderDetail(this.$route.params.id);
    },
    watch: {
      '$route.params.id': function (id) {
        this.app.loadStaffOrderDetail(id);
      }
    }
  };

  const StaffProfilePage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>个人信息</h3>
            <p>展示服务人员基础资料和所属商家，不提供自主改密或运营能力。</p>
          </div>
        </div>

        <div class="content-card">
          <div class="staff-profile-grid">
            <div><span>姓名</span><strong>{{ app.staffProfile.name || '-' }}</strong></div>
            <div><span>账号</span><strong>{{ app.staffProfile.username || '-' }}</strong></div>
            <div><span>联系电话</span><strong>{{ app.staffProfile.phone || '-' }}</strong></div>
            <div><span>所属商家</span><strong>{{ app.staffProfile.merchantName || '-' }}</strong></div>
            <div><span>商家电话</span><strong>{{ app.staffProfile.merchantPhone || '-' }}</strong></div>
            <div><span>商家地址</span><strong>{{ app.staffProfile.merchantAddress || '-' }}</strong></div>
            <div><span>擅长标签</span><strong>{{ app.staffProfile.specialty || '暂无' }}</strong></div>
            <div><span>账号状态</span><strong>{{ app.staffProfile.status === 1 ? '在职' : '停用' }}</strong></div>
            <div><span>创建时间</span><strong>{{ app.formatDate(app.staffProfile.createTime) || '-' }}</strong></div>
            <div><span>更新时间</span><strong>{{ app.formatDate(app.staffProfile.updateTime) || '-' }}</strong></div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.fetchStaffProfile();
    }
  };

  const OrderDetailPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>订单详情</h3>
            <p>查看订单状态进度、用户信息、预约信息和服务摘要。</p>
          </div>
          <div class="account-actions">
            <el-button @click="$router.push('/orders')">返回订单列表</el-button>
            <el-button v-if="app.currentOrderDetail && app.currentOrderDetail.status === '1'" type="primary" @click="app.acceptOrder(app.currentOrderDetail.id)">接单</el-button>
            <el-button v-if="app.currentOrderDetail && app.currentOrderDetail.status === '2'" type="warning" @click="app.startOrder(app.currentOrderDetail.id)">开始服务</el-button>
            <el-button v-if="app.currentOrderDetail && app.currentOrderDetail.status === '3'" type="success" @click="app.completeOrder(app.currentOrderDetail.id)">完成服务</el-button>
          </div>
        </div>

        <div v-if="app.currentOrderDetail">
          <div class="summary-strip">
            <div class="summary-mini-card"><span>订单编号</span><strong>{{ app.currentOrderDetail.orderNo }}</strong></div>
            <div class="summary-mini-card"><span>当前状态</span><strong>{{ app.orderStatusText(app.currentOrderDetail.status) }}</strong></div>
            <div class="summary-mini-card"><span>预约时间</span><strong>{{ app.currentOrderDetail.appointDate }} {{ app.currentOrderDetail.appointSlot }}</strong></div>
            <div class="summary-mini-card"><span>订单金额</span><strong>￥{{ app.currentOrderDetail.totalPrice }}</strong></div>
            <div class="summary-mini-card"><span>当前履约人</span><strong>{{ app.currentOrderDetail.staff ? app.currentOrderDetail.staff.name : '暂未分配' }}</strong></div>
          </div>

          <div class="content-card">
            <div class="order-progress-strip">
              <div class="order-progress-step" v-for="(step, index) in app.orderProgressSteps(app.currentOrderDetail)" :key="step.key" :class="{ done: step.done, current: step.current }">
                <div class="step-dot"></div>
                <strong>{{ step.label }}</strong>
                <span>{{ step.time || '待处理' }}</span>
                <div class="step-line" v-if="index < app.orderProgressSteps(app.currentOrderDetail).length - 1"></div>
              </div>
            </div>
          </div>

          <div class="editor-layout" style="margin-top:18px;">
            <div class="content-card">
              <div class="section-title"><h3>服务与用户信息</h3></div>
              <div class="order-detail-grid">
                <div><span>服务名称</span><strong>{{ app.currentOrderDetail.serviceName || '-' }}</strong></div>
                <div><span>服务分类</span><strong>{{ app.currentOrderDetail.categoryName || '-' }}</strong></div>
                <div><span>用户名</span><strong>{{ app.currentOrderDetail.userName || '-' }}</strong></div>
                <div><span>联系电话</span><strong>{{ app.currentOrderDetail.userPhone || '-' }}</strong></div>
                <div><span>服务地址</span><strong>{{ app.currentOrderDetail.address || '-' }}</strong></div>
                <div><span>用户备注</span><strong>{{ app.currentOrderDetail.remark || '无' }}</strong></div>
                <div><span>已分配员工</span><strong>{{ app.currentOrderDetail.staff ? app.currentOrderDetail.staff.name : '暂未分配' }}</strong></div>
                <div><span>员工账号</span><strong>{{ app.currentOrderDetail.staff ? (app.currentOrderDetail.staff.username || '-') : '-' }}</strong></div>
                <div><span>员工电话</span><strong>{{ app.currentOrderDetail.staff ? (app.currentOrderDetail.staff.phone || '-') : '-' }}</strong></div>
                <div><span>员工擅长</span><strong>{{ app.currentOrderDetail.staff ? (app.currentOrderDetail.staff.specialty || '暂无') : '暂未分配' }}</strong></div>
                <div><span>分配时间</span><strong>{{ app.formatDate(app.currentOrderDetail.assignTime) || '-' }}</strong></div>
              </div>

              <div class="staff-assign-box" v-if="app.currentOrderDetail.status === '2' || app.currentOrderDetail.status === '3'">
                <div class="section-title"><h3>分配服务人员</h3></div>
                <div class="list-toolbar" style="margin-bottom:0;padding:0;border:none;background:transparent;">
                  <el-select v-model="app.orderAssignForm.staffId" placeholder="选择在职员工">
                    <el-option v-for="item in app.assignableStaffOptions" :key="item.id" :label="item.name + ' / ' + item.phone" :value="item.id"></el-option>
                  </el-select>
                  <el-button type="primary" @click="app.assignStaffToCurrentOrder">确认分配</el-button>
                </div>
              </div>

              <div class="message-panel">
                <div class="section-title"><h3>订单沟通</h3></div>
                <div class="message-thread" v-if="app.orderMessages.length">
                  <div v-for="item in app.orderMessages" :key="item.id" class="message-bubble" :class="{ 'is-self': item.senderRole === 'merchant' }">
                    <div class="message-head">
                      <strong>{{ item.senderName }} · {{ item.senderRole === 'merchant' ? '商家' : (item.senderRole === 'staff' ? '服务人员' : '用户') }}</strong>
                      <span>{{ app.formatDate(item.createTime) }}</span>
                    </div>
                    <div class="message-content">{{ item.content }}</div>
                  </div>
                </div>
                <div v-else class="mini-empty">暂无沟通记录，可在此与用户或服务人员沟通订单安排。</div>
                <div class="message-composer">
                  <el-input type="textarea" :rows="3" v-model="app.orderMessageForm.content" placeholder="请输入订单沟通内容"></el-input>
                  <el-button type="primary" @click="app.sendMerchantOrderMessage">发送</el-button>
                </div>
              </div>
            </div>

            <div class="preview-stack">
              <div class="preview-card">
                <h4>服务主图</h4>
                <div class="preview-media">
                  <img :src="app.orderServiceImage(app.currentOrderDetail)" alt="service">
                </div>
              </div>
              <div class="preview-card">
                <h4>关键时间点</h4>
                <div class="demo-text">创建：{{ app.formatDate(app.currentOrderDetail.createTime) || '-' }}</div>
                <div class="demo-text">支付：{{ app.formatDate(app.currentOrderDetail.payTime) || '-' }}</div>
                <div class="demo-text">接单：{{ app.formatDate(app.currentOrderDetail.acceptTime) || '-' }}</div>
                <div class="demo-text">开始：{{ app.formatDate(app.currentOrderDetail.startTime) || '-' }}</div>
                <div class="demo-text">完成：{{ app.formatDate(app.currentOrderDetail.completeTime) || '-' }}</div>
                <div class="demo-text" v-if="app.currentOrderDetail.cancelReason">取消原因：{{ app.currentOrderDetail.cancelReason }}</div>
              </div>
              <div class="preview-card">
                <h4>当前履约人员</h4>
                <div class="demo-text">姓名：{{ app.currentOrderDetail.staff ? app.currentOrderDetail.staff.name : '暂未分配' }}</div>
                <div class="demo-text">电话：{{ app.currentOrderDetail.staff ? (app.currentOrderDetail.staff.phone || '-') : '-' }}</div>
                <div class="demo-text">擅长：{{ app.currentOrderDetail.staff ? (app.currentOrderDetail.staff.specialty || '暂无') : '-' }}</div>
              </div>
              <div class="preview-card" v-if="app.currentOrderDetail.status === '1'">
                <h4>待处理动作</h4>
                <div class="account-actions">
                  <el-button size="mini" type="primary" @click="app.acceptOrder(app.currentOrderDetail.id)">接单</el-button>
                  <el-button size="mini" @click="app.openRejectDialog(app.currentOrderDetail)">拒单</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="content-card">订单详情加载中...</div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.loadOrderDetail(this.$route.params.id);
    },
    watch: {
      '$route.params.id': function (id) {
        this.app.loadOrderDetail(id);
      }
    }
  };

  const ReviewsPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>评价管理</h3>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.reviewFilters.hasReply === '' ? 'primary' : 'default'" @click="changeFilter('')">全部</el-button>
          <el-button size="mini" :type="app.reviewFilters.hasReply === '0' ? 'primary' : 'default'" @click="changeFilter('0')">待回复</el-button>
          <el-button size="mini" :type="app.reviewFilters.hasReply === '1' ? 'primary' : 'default'" @click="changeFilter('1')">已回复</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.reviewList.list || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column label="服务/用户" min-width="240">
              <template slot-scope="scope">
                <div>{{ scope.row.serviceName || '服务评价' }}</div>
                <div class="row-subtext">{{ scope.row.userName || '用户' }} · 订单号 {{ scope.row.orderNo || scope.row.orderId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="评分" width="100">
              <template slot-scope="scope">{{ scope.row.rating }} 星</template>
            </el-table-column>
            <el-table-column label="评价内容" min-width="260">
              <template slot-scope="scope">
                <div>{{ scope.row.content || '用户未填写文字评价' }}</div>
                <div class="review-image-strip" v-if="scope.row.images && scope.row.images.length">
                  <img v-for="(image, index) in scope.row.images" :key="image + index" :src="app.normalizeUrl(image)" alt="review">
                </div>
              </template>
            </el-table-column>
            <el-table-column label="回复状态" width="120">
              <template slot-scope="scope">
                <el-tag size="mini" :type="scope.row.pendingReply ? 'warning' : 'success'">{{ scope.row.pendingReply ? '待回复' : '已回复' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="回复内容" min-width="220">
              <template slot-scope="scope">{{ scope.row.reply || '暂无回复内容' }}</template>
            </el-table-column>
            <el-table-column label="回复时间" width="180">
              <template slot-scope="scope">{{ app.formatDate(scope.row.replyTime) || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <span class="action-link" @click="app.openReplyDialog(scope.row)">{{ scope.row.pendingReply ? '回复' : '修改回复' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="user-pagination" v-if="Number(app.reviewList.total || 0) > 0">
          <el-pagination background layout="prev, pager, next" :current-page="app.reviewFilters.pageNum" :page-size="app.reviewFilters.pageSize" :total="Number(app.reviewList.total || 0)" @current-change="changePage"></el-pagination>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.handleReviewRoute(this.$route.query);
    },
    watch: {
      '$route.query': function (query) {
        this.app.handleReviewRoute(query);
      }
    },
    methods: {
      changeFilter: function (hasReply) {
        this.app.pushReviewRouteQuery({ hasReply: hasReply, pageNum: 1 });
      },
      changePage: function (page) {
        this.app.pushReviewRouteQuery({ pageNum: page });
      }
    }
  };

  const ExtensionsPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>扩展能力预留</h3>
            <p>人员招募与服务沟通当前保留接口和展示边界。</p>
          </div>
          <el-button type="warning" @click="app.loadRecruitOverview">刷新预留接口</el-button>
        </div>

        <div class="editor-layout">
          <div class="preview-card">
            <h4>人员招募接口预览</h4>
            <pre class="soft-pre">{{ JSON.stringify(app.recruitOverview, null, 2) }}</pre>
          </div>
          <div class="preview-stack">
            <div class="preview-card">
              <h4>服务沟通说明</h4>
              <div class="demo-text">/merchant/order/communication/* 预留给订单沟通记录，本轮只说明接入边界，不落地消息系统。</div>
            </div>
            <div class="preview-card">
              <h4>二期方向</h4>
              <div class="demo-text">后续可继续补充人员招募、服务套餐、员工协同和沟通记录页面。</div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app: function () {
        return this.$root;
      }
    },
    created: function () {
      this.app.loadRecruitOverview();
    }
  };

  const routes = [
    { path: '/', redirect: function () { return defaultPathForRole(readStoredPortalRole()); } },
    { path: '/login', component: LoginPage },
    { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/info', component: InfoPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/services', component: ServicesPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/services/new', component: ServiceEditorPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/services/:id/edit', component: ServiceEditorPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/staff-members', component: StaffManagementPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/orders', component: OrdersPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/orders/:id', component: OrderDetailPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/reviews', component: ReviewsPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/extensions', component: ExtensionsPage, meta: { requiresAuth: true, roles: ['merchant'] } },
    { path: '/staff/dashboard', component: StaffDashboardPage, meta: { requiresAuth: true, roles: ['staff'] } },
    { path: '/staff/orders', component: StaffOrdersPage, meta: { requiresAuth: true, roles: ['staff'] } },
    { path: '/staff/orders/:id', component: StaffOrderDetailPage, meta: { requiresAuth: true, roles: ['staff'] } },
    { path: '/staff/profile', component: StaffProfilePage, meta: { requiresAuth: true, roles: ['staff'] } }
  ];

  const portalRouter = createPortalRouter(VueRouter, '/merchant', routes);
  const router = portalRouter.router;

  router.beforeEach(function (to, from, next) {
    var token = readStoredPortalToken();
    var role = readStoredPortalRole();
    var routeRoles = to.meta && to.meta.roles ? to.meta.roles : null;

    if (to.meta && to.meta.requiresAuth && !token) {
      next({
        path: '/login',
        query: Object.assign(
          { redirect: to.fullPath },
          routeRoles && routeRoles[0] ? { mode: routeRoles[0] } : {}
        )
      });
      return;
    }

    if (to.path === '/login' && token && role) {
      next(defaultPathForRole(role));
      return;
    }

    if (routeRoles && routeRoles.length && role && routeRoles.indexOf(role) === -1) {
      next(defaultPathForRole(role));
      return;
    }

    next();
  });

  router.afterEach(function () {
    window.scrollTo(0, 0);
  });

  const app = new Vue({
    router: router,
    template: `
      <div class="merchant-shell">
        <template v-if="isLoginRoute">
          <router-view></router-view>
        </template>
        <template v-else>
          <div class="backoffice-header">
            <div class="backoffice-header-inner">
              <div class="backoffice-title">
                <div class="backoffice-kicker">{{ isStaffRole ? 'Staff Workspace' : 'Merchant Workspace' }}</div>
                <h1>{{ isStaffRole ? '服务人员工作台' : '商家后台管理' }}</h1>
                <p v-if="isStaffRole">只处理被分配的订单，聚焦订单沟通与履约推进。</p>
              </div>
              <div class="backoffice-userbox">
                <div v-if="isStaffRole">
                  <strong>{{ staffProfile.name || authInfo.name || '服务人员账号' }}</strong>
                  <span>{{ staffProfile.merchantName || '-' }} · {{ staffProfile.status === 1 ? '在职' : '停用' }}</span>
                </div>
                <div v-else>
                  <strong>{{ merchantInfo.name || authInfo.name || '商家账号' }}</strong>
                  <span>审核状态 {{ auditText(merchantInfo.auditStatus || authInfo.auditStatus) }} · 累计订单 {{ dashboardSummary.orderCount || merchantInfo.orderCount || 0 }}</span>
                </div>
                <el-button type="text" @click="goHome">门户</el-button>
                <el-button type="text" @click="logout">退出</el-button>
              </div>
            </div>
          </div>

          <div class="backoffice-layout">
            <div class="backoffice-sidebar">
              <template v-if="isStaffRole">
                <div class="account-card">
                  <h3>{{ staffProfile.name || authInfo.name || '服务人员账号' }}</h3>
                  <p>{{ staffProfile.merchantName || '所属商家' }}</p>
                  <div class="metric-inline">
                    <el-tag size="mini" type="success">待服务 {{ staffDashboard.pendingServiceCount || 0 }}</el-tag>
                    <el-tag size="mini">服务中 {{ staffDashboard.inServiceCount || 0 }}</el-tag>
                  </div>
                </div>

                <div class="backoffice-menu">
                  <div class="backoffice-menu-title">功能导航</div>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/staff/dashboard') }" @click="$router.push('/staff/dashboard')">工作台</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/staff/orders') }" @click="$router.push('/staff/orders')">我的订单</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/staff/profile') }" @click="$router.push('/staff/profile')">个人信息</el-button>
                </div>
              </template>

              <template v-else>
                <div class="account-card">
                  <h3>{{ merchantInfo.name || authInfo.name || '商家账号' }}</h3>
                  <p>{{ merchantInfo.address || '请先补充商家地址与简介信息。' }}</p>
                  <div class="metric-inline">
                    <el-tag size="mini" type="warning">{{ auditText(merchantInfo.auditStatus || authInfo.auditStatus) }}</el-tag>
                    <el-tag size="mini" type="success">评分 {{ dashboardSummary.rating || merchantInfo.rating || '4.8' }}</el-tag>
                    <el-tag size="mini">订单 {{ dashboardSummary.orderCount || merchantInfo.orderCount || 0 }}</el-tag>
                  </div>
                </div>

                <div class="backoffice-menu">
                  <div class="backoffice-menu-title">功能导航</div>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/dashboard') }" @click="$router.push('/dashboard')">控制台</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/info') }" @click="$router.push('/info')">商家信息</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/services') }" @click="$router.push('/services')">服务管理</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/staff-members') }" @click="$router.push('/staff-members')">员工管理</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/orders') }" @click="$router.push('/orders')">订单处理</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/reviews') }" @click="$router.push('/reviews')">评价管理</el-button>
                  <el-button class="menu-button" :class="{ 'is-active': isRoute('/extensions') }" @click="$router.push('/extensions')">扩展预留</el-button>
                </div>
              </template>
            </div>

            <div class="backoffice-panel">
              <router-view></router-view>
            </div>
          </div>

          <el-dialog title="拒单原因" :visible.sync="rejectDialogVisible" width="520px">
            <el-form :model="rejectForm" label-position="top">
              <el-form-item label="请输入拒单原因">
                <el-input type="textarea" :rows="4" v-model="rejectForm.reason" placeholder="请输入拒单原因"></el-input>
              </el-form-item>
            </el-form>
            <span slot="footer">
              <el-button @click="rejectDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.rejectOrder" @click="submitRejectOrder">确认拒单</el-button>
            </span>
          </el-dialog>

          <el-dialog title="回复评价" :visible.sync="replyDialogVisible" width="720px">
            <div v-if="currentReplyReview" class="content-card" style="padding:0;border:none;box-shadow:none;">
              <div class="demo-text">服务：{{ currentReplyReview.serviceName || '服务评价' }}</div>
              <div class="demo-text">用户：{{ currentReplyReview.userName || '用户' }} · 订单号 {{ currentReplyReview.orderNo || currentReplyReview.orderId }}</div>
              <div style="margin-top:12px;">{{ currentReplyReview.content || '用户未填写文字评价。' }}</div>
              <div class="review-image-strip" v-if="currentReplyReview.images && currentReplyReview.images.length">
                <img v-for="(image, index) in currentReplyReview.images" :key="image + index" :src="normalizeUrl(image)" alt="review">
              </div>
            </div>
            <el-form :model="replyForm" label-position="top" style="margin-top:16px;">
              <el-form-item label="回复内容">
                <el-input type="textarea" :rows="5" v-model="replyForm.reply" placeholder="请输入回复内容"></el-input>
              </el-form-item>
            </el-form>
            <span slot="footer">
              <el-button @click="replyDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.replyReview" @click="submitReplyReview">提交回复</el-button>
            </span>
          </el-dialog>

          <el-dialog :title="staffForm.id ? '编辑员工' : '新增员工'" :visible.sync="staffDialogVisible" width="620px">
            <el-form :model="staffForm" label-position="top">
              <el-form-item label="员工姓名">
                <el-input v-model="staffForm.name"></el-input>
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="staffForm.phone"></el-input>
              </el-form-item>
              <el-form-item label="擅长标签">
                <el-input v-model="staffForm.specialty" placeholder="如：深度保洁,家电清洗"></el-input>
              </el-form-item>
            </el-form>
            <span slot="footer">
              <el-button @click="staffDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="loading.saveStaff" @click="saveStaffMember">保存</el-button>
            </span>
          </el-dialog>
        </template>
      </div>
    `,
    mounted: function () {
      var root = document.querySelector('#merchant-app');
      if (root) root.__vue__ = this;
      window.__merchantApp = this;
    },
    data: function () {
      return {
        token: readStoredPortalToken(),
        portalRole: readStoredPortalRole() || 'merchant',
        loginMode: 'merchant',
        loginForm: { username: 'merchant01', password: '123456' },
        authInfo: {},
        merchantInfo: {},
        dashboardSummary: {},
        categories: [],
        serviceFilters: { keyword: '', auditStatus: '', status: '', pageNum: 1, pageSize: 8 },
        serviceList: { list: [], total: 0, pageNum: 1, pageSize: 8 },
        serviceForm: defaultServiceForm(),
        staffFilters: { keyword: '', status: '' },
        staffList: [],
        assignableStaffOptions: [],
        staffDialogVisible: false,
        staffForm: defaultStaffForm(),
        orderFilters: { status: '', orderNo: '', pageNum: 1, pageSize: 10 },
        orderList: { list: [], total: 0, pageNum: 1, pageSize: 10 },
        currentOrderDetail: null,
        orderMessages: [],
        orderMessageForm: defaultMessageForm(),
        orderAssignForm: { orderId: null, staffId: '' },
        reviewFilters: { hasReply: '', pageNum: 1, pageSize: 10 },
        reviewList: { list: [], total: 0, pageNum: 1, pageSize: 10 },
        currentReplyReview: null,
        replyForm: defaultReplyForm(),
        replyDialogVisible: false,
        rejectForm: defaultRejectForm(),
        rejectDialogVisible: false,
        recruitOverview: {},
        staffProfile: {},
        staffDashboard: {},
        staffOrderFilters: { status: '', pageNum: 1, pageSize: 10 },
        staffOrderList: { list: [], total: 0, pageNum: 1, pageSize: 10 },
        staffCurrentOrderDetail: null,
        staffOrderMessages: [],
        staffOrderMessageForm: defaultMessageForm(),
        loading: {
          login: false,
          saveMerchant: false,
          uploadLogo: false,
          uploadLicense: false,
          uploadServiceImage: false,
          saveService: false,
          saveStaff: false,
          rejectOrder: false,
          replyReview: false,
          orderMessage: false
        }
      };
    },
    computed: {
      isLoginRoute: function () {
        return this.$route.path === '/login';
      },
      isStaffRole: function () {
        return this.portalRole === 'staff';
      },
      isMerchantRole: function () {
        return this.portalRole === 'merchant';
      },
      servicePrimaryImage: function () {
        return this.serviceForm.imageList.length ? this.normalizeUrl(this.serviceForm.imageList[0]) : LOCAL_SERVICE_PLACEHOLDER;
      },
      serviceTagList: function () {
        return splitTags(this.serviceForm.tagText);
      }
    },
    created: function () {
      this.syncLoginModeFromRoute(this.$route.query.mode);
      this.fetchCategories();
      if (this.token) {
        this.bootstrap();
      }
    },
    methods: {
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
          }
          throw err;
        });
      },
      headers: function (extra) {
        return Object.assign({}, extra || {}, this.token ? { Authorization: 'Bearer ' + this.token } : {});
      },
      syncLoginModeFromRoute: function (mode) {
        if (mode === 'staff' || mode === 'merchant') {
          this.switchLoginMode(mode);
        } else if (!this.loginForm.username) {
          this.switchLoginMode(this.loginMode || 'merchant');
        }
      },
      switchLoginMode: function (mode) {
        this.loginMode = mode === 'staff' ? 'staff' : 'merchant';
        this.loginForm = this.loginMode === 'staff'
          ? { username: 'staff1_1', password: '123456' }
          : { username: 'merchant01', password: '123456' };
      },
      bootstrap: function () {
        if (this.isStaffRole) {
          this.fetchStaffAuthInfo();
          this.fetchStaffProfile();
          this.fetchStaffDashboard();
          return;
        }
        this.fetchAuthInfo();
        this.fetchMerchantInfo();
        this.fetchDashboardSummary();
      },
      clearPortalAuth: function () {
        this.token = '';
        this.portalRole = 'merchant';
        localStorage.removeItem(PORTAL_TOKEN_KEY);
        localStorage.removeItem(PORTAL_ROLE_KEY);
        localStorage.removeItem(LEGACY_MERCHANT_TOKEN_KEY);
        localStorage.removeItem(LEGACY_STAFF_TOKEN_KEY);
      },
      handleAuthExpired: function () {
        if (!this.token) return;
        var loginMode = this.portalRole === 'staff' ? 'staff' : 'merchant';
        this.clearPortalAuth();
        this.authInfo = {};
        this.merchantInfo = {};
        this.staffProfile = {};
        this.staffDashboard = {};
        if (this.$route.path !== '/login') {
          this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath, mode: loginMode } });
        }
      },
      setToken: function (token, role) {
        this.token = token;
        this.portalRole = role === 'staff' ? 'staff' : 'merchant';
        localStorage.setItem(PORTAL_TOKEN_KEY, token);
        localStorage.setItem(PORTAL_ROLE_KEY, this.portalRole);
        localStorage.removeItem(LEGACY_MERCHANT_TOKEN_KEY);
        localStorage.removeItem(LEGACY_STAFF_TOKEN_KEY);
        if (this.portalRole === 'staff') {
          localStorage.setItem(LEGACY_STAFF_TOKEN_KEY, token);
        } else {
          localStorage.setItem(LEGACY_MERCHANT_TOKEN_KEY, token);
        }
      },
      resolvePostLoginPath: function (role) {
        var redirect = this.$route.query.redirect;
        if (!redirect) return defaultPathForRole(role);
        if (role === 'staff' && redirect.indexOf('/staff/') !== 0) return defaultPathForRole(role);
        if (role === 'merchant' && redirect.indexOf('/staff/') === 0) return defaultPathForRole(role);
        return redirect;
      },
      login: function () {
        var vm = this;
        var role = this.loginMode === 'staff' ? 'staff' : 'merchant';
        var loginUrl = role === 'staff' ? '/staff/auth/login' : '/merchant/auth/login';
        this.loading.login = true;
        return this.request({
          method: 'post',
          url: loginUrl,
          data: this.loginForm
        }, false).then(function (data) {
          vm.setToken(data.token, role);
          vm.$message.success('登录成功');
          vm.bootstrap();
          vm.$router.push(vm.resolvePostLoginPath(role));
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.login = false;
        });
      },
      logout: function () {
        var loginMode = this.portalRole === 'staff' ? 'staff' : 'merchant';
        this.clearPortalAuth();
        this.authInfo = {};
        this.merchantInfo = {};
        this.staffProfile = {};
        this.staffDashboard = {};
        this.$router.push({ path: '/login', query: { mode: loginMode } });
      },
      goHome: function () {
        window.location.href = './';
      },
      isRoute: function (prefix) {
        return this.$route.path === prefix || this.$route.path.indexOf(prefix + '/') === 0;
      },
      normalizeUrl: function (url) {
        return normalizeResourceUrl(url);
      },
      formatDate: function (value) {
        if (!value) return '';
        return String(value).replace('T', ' ').slice(0, 19);
      },
      auditText: function (status) {
        return { '0': '待审核', '1': '已驳回', '2': '已通过' }[status] || '待完善';
      },
      auditTagType: function (status) {
        return { '0': 'warning', '1': 'danger', '2': 'success' }[status] || '';
      },
      shelfText: function (status) {
        return Number(status) === 1 ? '已上架' : '已下架';
      },
      orderStatusText: function (status) {
        return { '0': '待支付', '1': '待接单', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType: function (status) {
        return { '0': 'warning', '1': 'warning', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      staffStatusCount: function (status) {
        return (this.staffList || []).filter(function (item) {
          return item.status === status;
        }).length;
      },
      categoryName: function (categoryId) {
        var match = (this.categories || []).find(function (item) { return item.id === categoryId; });
        return match ? match.name : '未分类';
      },
      serviceCover: function (service) {
        return this.normalizeUrl(firstImage(service.imageList || service.images) || LOCAL_SERVICE_PLACEHOLDER);
      },
      orderServiceImage: function (order) {
        return this.normalizeUrl(order.serviceImage || firstImage(order.serviceImages) || LOCAL_SERVICE_PLACEHOLDER);
      },
      fetchAuthInfo: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/merchant/auth/info' }).then(function (data) {
          vm.authInfo = data.merchant || data;
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchMerchantInfo: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/merchant/info/detail' }).then(function (data) {
          vm.merchantInfo = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchDashboardSummary: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/merchant/dashboard/summary' }).then(function (data) {
          vm.dashboardSummary = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchStaffList: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/merchant/staff/list',
          params: {
            keyword: this.staffFilters.keyword || undefined,
            status: this.staffFilters.status === '' ? undefined : this.staffFilters.status
          }
        }).then(function (data) {
          vm.staffList = data || [];
          vm.assignableStaffOptions = (vm.staffList || []).filter(function (item) { return item.status === 1; });
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      openStaffDialog: function (row) {
        this.staffForm = row ? {
          id: row.id,
          name: row.name || '',
          phone: row.phone || '',
          specialty: row.specialty || ''
        } : defaultStaffForm();
        this.staffDialogVisible = true;
      },
      saveStaffMember: function () {
        var vm = this;
        this.loading.saveStaff = true;
        return this.request({
          method: this.staffForm.id ? 'put' : 'post',
          url: this.staffForm.id ? '/merchant/staff/update' : '/merchant/staff/create',
          data: this.staffForm
        }).then(function (data) {
          vm.staffDialogVisible = false;
          vm.$message.success(vm.staffForm.id ? '员工信息已更新' : ('员工创建成功，账号：' + data.username + '，初始密码：' + data.initialPassword));
          vm.staffForm = defaultStaffForm();
          vm.fetchStaffList();
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.saveStaff = false;
        });
      },
      toggleStaffStatus: function (row) {
        var vm = this;
        return this.request({
          method: 'post',
          url: '/merchant/staff/status',
          data: { staffId: row.id, status: row.status === 1 ? 0 : 1 }
        }).then(function () {
          vm.$message.success('员工状态已更新');
          vm.fetchStaffList();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      resetStaffPassword: function (row) {
        var vm = this;
        return this.request({
          method: 'post',
          url: '/merchant/staff/reset-password',
          data: { staffId: row.id }
        }).then(function (data) {
          vm.$alert('账号：' + data.username + '\n新密码：' + data.password, '密码已重置', { confirmButtonText: '知道了' });
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      fetchCategories: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/user/category/list' }, false).then(function (data) {
          vm.categories = data || [];
        }).catch(function () {});
      },
      saveMerchantInfo: function () {
        var vm = this;
        this.loading.saveMerchant = true;
        return this.request({
          method: 'put',
          url: '/merchant/info/update',
          data: {
            name: this.merchantInfo.name,
            phone: this.merchantInfo.phone,
            address: this.merchantInfo.address,
            intro: this.merchantInfo.intro,
            logo: this.merchantInfo.logo,
            license: this.merchantInfo.license
          }
        }).then(function () {
          vm.$message.success('资料已更新');
          vm.fetchMerchantInfo();
          vm.fetchAuthInfo();
          vm.fetchDashboardSummary();
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.saveMerchant = false;
        });
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
        var formData = new FormData();
        formData.append('file', file);
        return api.post('/common/upload', formData, {
          headers: this.headers({ 'Content-Type': 'multipart/form-data' })
        }).then(function (res) {
          if (res.data.code !== 200) {
            throw new Error(res.data.message || '上传失败');
          }
          return normalizeResourceUrl(res.data.data.url);
        });
      },
      handleMerchantAssetUpload: function (request, field) {
        var vm = this;
        var loadingKey = field === 'logo' ? 'uploadLogo' : 'uploadLicense';
        if (!this.validateImageUpload(request.file, field === 'logo' ? '商家 Logo' : '资质证书')) {
          request.onError(new Error('invalid file'));
          return;
        }
        this.loading[loadingKey] = true;
        this.uploadFile(request.file).then(function (url) {
          vm.$set(vm.merchantInfo, field, url);
          vm.$message.success('上传成功');
          request.onSuccess({ url: url });
        }).catch(function (err) {
          vm.$message.error(err.message);
          request.onError(err);
        }).finally(function () {
          vm.loading[loadingKey] = false;
        });
      },
      handleServiceImageUpload: function (request) {
        var vm = this;
        if (!this.validateImageUpload(request.file, '服务图片')) {
          request.onError(new Error('invalid file'));
          return;
        }
        if (this.serviceForm.imageList.length >= 5) {
          this.$message.warning('最多上传 5 张服务图片');
          request.onError(new Error('limit exceeded'));
          return;
        }
        this.loading.uploadServiceImage = true;
        this.uploadFile(request.file).then(function (url) {
          vm.serviceForm.imageList = vm.serviceForm.imageList.concat([url]);
          vm.$message.success('图片上传成功');
          request.onSuccess({ url: url });
        }).catch(function (err) {
          vm.$message.error(err.message);
          request.onError(err);
        }).finally(function () {
          vm.loading.uploadServiceImage = false;
        });
      },
      removeServiceImage: function (index) {
        this.serviceForm.imageList.splice(index, 1);
      },
      readServiceQuery: function (query) {
        return {
          keyword: query.keyword || '',
          auditStatus: query.auditStatus || '',
          status: query.status || '',
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 8
        };
      },
      serializeServiceQuery: function (state) {
        var query = {};
        if (state.keyword) query.keyword = state.keyword;
        if (state.auditStatus) query.auditStatus = state.auditStatus;
        if (state.status) query.status = state.status;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      handleServiceRoute: function (query) {
        this.serviceFilters = this.readServiceQuery(query || {});
        this.fetchServiceList();
      },
      pushServiceRouteQuery: function (overrides) {
        var next = Object.assign({}, this.serviceFilters, overrides || {});
        this.$router.push({ path: '/services', query: this.serializeServiceQuery(next) });
      },
      fetchServiceList: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/merchant/service/list',
          params: {
            name: this.serviceFilters.keyword || undefined,
            auditStatus: this.serviceFilters.auditStatus || undefined,
            status: this.serviceFilters.status || undefined,
            pageNum: this.serviceFilters.pageNum,
            pageSize: this.serviceFilters.pageSize
          }
        }).then(function (data) {
          vm.serviceList = data || { list: [], total: 0, pageNum: 1, pageSize: vm.serviceFilters.pageSize };
          vm.fetchDashboardSummary();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      prepareServiceEditor: function (serviceId) {
        var vm = this;
        this.serviceForm = defaultServiceForm();
        if (!serviceId) return;
        return this.request({ method: 'get', url: '/merchant/service/' + serviceId }).then(function (data) {
          vm.serviceForm = {
            id: data.id,
            categoryId: data.categoryId,
            name: data.name || '',
            price: data.price || '',
            duration: data.duration || '',
            description: data.description || '',
            tagText: splitTags(data.tagList || data.tags).join(','),
            imageList: splitImages(data.imageList || data.images)
          };
        }).catch(function (err) {
          vm.$message.error(err.message);
          vm.$router.push('/services');
        });
      },
      saveService: function () {
        var vm = this;
        this.loading.saveService = true;
        return this.request({
          method: this.serviceForm.id ? 'put' : 'post',
          url: this.serviceForm.id ? '/merchant/service/update' : '/merchant/service/create',
          data: {
            id: this.serviceForm.id,
            categoryId: this.serviceForm.categoryId,
            name: this.serviceForm.name,
            price: this.serviceForm.price,
            duration: this.serviceForm.duration,
            description: this.serviceForm.description,
            images: this.serviceForm.imageList.join(','),
            tags: splitTags(this.serviceForm.tagText).join(',')
          }
        }).then(function () {
          vm.$message.success('服务已提交');
          vm.fetchDashboardSummary();
          vm.$router.push('/services');
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.saveService = false;
        });
      },
      toggleServiceStatus: function (row) {
        var vm = this;
        return this.request({
          method: 'post',
          url: '/merchant/service/status',
          data: { serviceId: row.id, status: Number(row.status) === 1 ? 0 : 1 }
        }).then(function () {
          vm.$message.success('状态已更新');
          vm.fetchServiceList();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      deleteService: function (serviceId) {
        var vm = this;
        this.$confirm('确认删除该服务吗？', '删除服务', { type: 'warning' }).then(function () {
          return vm.request({ method: 'delete', url: '/merchant/service/' + serviceId });
        }).then(function () {
          vm.$message.success('删除成功');
          vm.fetchServiceList();
        }).catch(function (err) {
          if (err && err.message) vm.$message.error(err.message);
        });
      },
      readOrderQuery: function (query) {
        return {
          status: query.status || '',
          orderNo: query.orderNo || '',
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 10
        };
      },
      serializeOrderQuery: function (state) {
        var query = {};
        if (state.status) query.status = state.status;
        if (state.orderNo) query.orderNo = state.orderNo;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      handleOrderRoute: function (query) {
        this.orderFilters = this.readOrderQuery(query || {});
        this.fetchOrderList();
      },
      pushOrderRouteQuery: function (overrides) {
        var next = Object.assign({}, this.orderFilters, overrides || {});
        this.$router.push({ path: '/orders', query: this.serializeOrderQuery(next) });
      },
      fetchOrderList: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/merchant/order/list',
          params: {
            status: this.orderFilters.status || undefined,
            orderNo: this.orderFilters.orderNo || undefined,
            pageNum: this.orderFilters.pageNum,
            pageSize: this.orderFilters.pageSize
          }
        }).then(function (data) {
          vm.orderList = data || { list: [], total: 0, pageNum: 1, pageSize: vm.orderFilters.pageSize };
          vm.fetchDashboardSummary();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      loadOrderDetail: function (orderId) {
        var vm = this;
        return this.request({ method: 'get', url: '/merchant/order/' + orderId }).then(function (data) {
          vm.currentOrderDetail = data;
          vm.orderAssignForm = { orderId: data.id, staffId: data.staff ? data.staff.id : '' };
          vm.orderMessageForm = { orderId: data.id, content: '' };
          vm.fetchStaffList();
          vm.fetchOrderMessages(data.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
          vm.$router.push('/orders');
        });
      },
      assignStaffToCurrentOrder: function () {
        var vm = this;
        if (!this.orderAssignForm.orderId || !this.orderAssignForm.staffId) {
          this.$message.warning('请先选择服务人员');
          return;
        }
        return this.request({
          method: 'post',
          url: '/merchant/order/assign-staff',
          data: this.orderAssignForm
        }).then(function () {
          vm.$message.success('服务人员分配成功');
          vm.loadOrderDetail(vm.orderAssignForm.orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      fetchOrderMessages: function (orderId) {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/merchant/order/message/list',
          params: { orderId: orderId }
        }).then(function (data) {
          vm.orderMessages = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      sendMerchantOrderMessage: function () {
        var vm = this;
        if (!this.orderMessageForm.orderId || !this.orderMessageForm.content.trim()) {
          this.$message.warning('请输入沟通内容');
          return;
        }
        return this.request({
          method: 'post',
          url: '/merchant/order/message/send',
          data: this.orderMessageForm
        }).then(function () {
          vm.orderMessageForm.content = '';
          vm.fetchOrderMessages(vm.currentOrderDetail.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      acceptOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/merchant/order/accept', data: { orderId: orderId } }).then(function () {
          vm.$message.success('接单成功');
          vm.afterOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      openRejectDialog: function (order) {
        this.rejectForm = { orderId: order.id, reason: '' };
        this.rejectDialogVisible = true;
      },
      submitRejectOrder: function () {
        var vm = this;
        this.loading.rejectOrder = true;
        return this.request({
          method: 'post',
          url: '/merchant/order/reject',
          data: { orderId: this.rejectForm.orderId, reason: this.rejectForm.reason }
        }).then(function () {
          vm.$message.success('拒单成功');
          vm.rejectDialogVisible = false;
          vm.afterOrderAction(vm.rejectForm.orderId);
          vm.rejectForm = defaultRejectForm();
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.rejectOrder = false;
        });
      },
      startOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/merchant/order/start', data: { orderId: orderId } }).then(function () {
          vm.$message.success('已开始服务');
          vm.afterOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      completeOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/merchant/order/complete', data: { orderId: orderId } }).then(function () {
          vm.$message.success('服务已完成');
          vm.afterOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      afterOrderAction: function (orderId) {
        this.fetchOrderList();
        this.fetchDashboardSummary();
        if (this.$route.path === '/orders/' + orderId) {
          this.loadOrderDetail(orderId);
        }
      },
      readReviewQuery: function (query) {
        return {
          hasReply: query.hasReply || '',
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 10
        };
      },
      serializeReviewQuery: function (state) {
        var query = {};
        if (state.hasReply !== '') query.hasReply = String(state.hasReply);
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      handleReviewRoute: function (query) {
        this.reviewFilters = this.readReviewQuery(query || {});
        this.fetchReviewList();
      },
      pushReviewRouteQuery: function (overrides) {
        var next = Object.assign({}, this.reviewFilters, overrides || {});
        this.$router.push({ path: '/reviews', query: this.serializeReviewQuery(next) });
      },
      fetchReviewList: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/merchant/review/list',
          params: {
            hasReply: this.reviewFilters.hasReply === '' ? undefined : Number(this.reviewFilters.hasReply),
            pageNum: this.reviewFilters.pageNum,
            pageSize: this.reviewFilters.pageSize
          }
        }).then(function (data) {
          vm.reviewList = data || { list: [], total: 0, pageNum: 1, pageSize: vm.reviewFilters.pageSize };
          vm.fetchDashboardSummary();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      openReplyDialog: function (row) {
        this.currentReplyReview = row;
        this.replyForm = { reviewId: row.id, reply: row.reply || '' };
        this.replyDialogVisible = true;
      },
      submitReplyReview: function () {
        var vm = this;
        this.loading.replyReview = true;
        return this.request({
          method: 'post',
          url: '/merchant/review/reply',
          data: { reviewId: this.replyForm.reviewId, reply: this.replyForm.reply }
        }).then(function () {
          vm.$message.success('回复成功');
          vm.replyDialogVisible = false;
          vm.fetchReviewList();
          vm.fetchDashboardSummary();
          vm.replyForm = defaultReplyForm();
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.replyReview = false;
        });
      },
      loadRecruitOverview: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/merchant/staff/recruit/overview' }).then(function (data) {
          vm.recruitOverview = data || {};
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      fetchStaffAuthInfo: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/auth/info' }).then(function (data) {
          vm.authInfo = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchStaffProfile: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/profile/detail' }).then(function (data) {
          vm.staffProfile = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchStaffDashboard: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/dashboard/summary' }).then(function (data) {
          vm.staffDashboard = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      readStaffOrderQuery: function (query) {
        return {
          status: query.status || '',
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 10
        };
      },
      serializeStaffOrderQuery: function (state) {
        var query = {};
        if (state.status) query.status = state.status;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      handleStaffOrderRoute: function (query) {
        this.staffOrderFilters = this.readStaffOrderQuery(query || {});
        this.fetchStaffOrders();
      },
      pushStaffOrderRouteQuery: function (overrides) {
        var next = Object.assign({}, this.staffOrderFilters, overrides || {});
        this.$router.push({ path: '/staff/orders', query: this.serializeStaffOrderQuery(next) });
      },
      fetchStaffOrders: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/staff/order/list',
          params: {
            status: this.staffOrderFilters.status || undefined,
            pageNum: this.staffOrderFilters.pageNum,
            pageSize: this.staffOrderFilters.pageSize
          }
        }).then(function (data) {
          vm.staffOrderList = data || { list: [], total: 0, pageNum: 1, pageSize: vm.staffOrderFilters.pageSize };
          vm.fetchStaffDashboard();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      loadStaffOrderDetail: function (orderId) {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/order/' + orderId }).then(function (data) {
          vm.staffCurrentOrderDetail = data;
          vm.staffOrderMessageForm = { orderId: data.id, content: '' };
          vm.fetchStaffOrderMessages(data.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
          vm.$router.push('/staff/orders');
        });
      },
      fetchStaffOrderMessages: function (orderId) {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/staff/order/message/list',
          params: { orderId: orderId }
        }).then(function (data) {
          vm.staffOrderMessages = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      sendStaffOrderMessage: function () {
        var vm = this;
        if (!this.staffOrderMessageForm.orderId || !this.staffOrderMessageForm.content.trim()) {
          this.$message.warning('请输入沟通内容');
          return;
        }
        return this.request({
          method: 'post',
          url: '/staff/order/message/send',
          data: this.staffOrderMessageForm
        }).then(function () {
          vm.staffOrderMessageForm.content = '';
          vm.fetchStaffOrderMessages(vm.staffCurrentOrderDetail.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      startStaffOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/staff/order/start', data: { orderId: orderId } }).then(function () {
          vm.$message.success('已开始服务');
          vm.afterStaffOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      completeStaffOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/staff/order/complete', data: { orderId: orderId } }).then(function () {
          vm.$message.success('服务已完成');
          vm.afterStaffOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      afterStaffOrderAction: function (orderId) {
        this.fetchStaffOrders();
        this.fetchStaffDashboard();
        if (this.$route.path === '/staff/orders/' + orderId) {
          this.loadStaffOrderDetail(orderId);
        }
      },
      orderProgressSteps: function (order) {
        if (!order) return [];
        var status = String(order.status || '');
        var cancelled = status === '5';
        return [
          { key: 'create', label: '创建', time: this.formatDate(order.createTime), done: true, current: status === '0' },
          { key: 'pay', label: '支付', time: this.formatDate(order.payTime), done: ['1', '2', '3', '4'].indexOf(status) > -1 || !!order.payTime, current: status === '1' },
          { key: 'accept', label: '接单', time: this.formatDate(order.acceptTime), done: ['2', '3', '4'].indexOf(status) > -1 || !!order.acceptTime, current: status === '2' },
          { key: 'start', label: '服务开始', time: this.formatDate(order.startTime), done: ['3', '4'].indexOf(status) > -1 || !!order.startTime, current: status === '3' },
          { key: cancelled ? 'cancel' : 'complete', label: cancelled ? '已取消' : '已完成', time: this.formatDate(cancelled ? order.cancelTime : order.completeTime), done: ['4', '5'].indexOf(status) > -1, current: ['4', '5'].indexOf(status) > -1 }
        ];
      }
    }
  });

  app.$mount(el);
  var originalDestroy = app.$destroy;
  app.$destroy = function () {
    portalRouter.teardown();
    return originalDestroy.call(this);
  };
  return { app: app, router: router };
}

export function mountMerchantPortal(el) {
  return createMerchantPortal(el);
}
