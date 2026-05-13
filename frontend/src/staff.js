(function () {
  const API_BASE = 'http://127.0.0.1:8080';
  const LOCAL_SERVICE_PLACEHOLDER = './public/service-placeholder.svg';
  const api = axios.create({ baseURL: API_BASE });

  function normalizeResourceUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || /^data:/.test(url)) return url;
    if (url.indexOf('/upload/') === 0) return API_BASE + url;
    return url;
  }

  function parsePositiveInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function defaultMessageForm() {
    return { orderId: null, content: '' };
  }

  Vue.use(VueRouter);

  const LoginPage = {
    template: `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo" style="background:linear-gradient(135deg,#10b981,#0f766e);">S</div>
            <h1 style="color:#0f766e;">同城服务平台服务人员端</h1>
            <p>登录后仅处理分配给自己的订单，围绕履约过程完成服务和沟通。</p>
          </div>
          <el-form :model="app.loginForm" label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="app.loginForm.username"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="app.loginForm.password" type="password"></el-input>
            </el-form-item>
            <el-button class="auth-submit" type="primary" style="background:linear-gradient(135deg,#10b981,#0f766e);" :loading="app.loading.login" @click="app.login">
              登录服务人员端
            </el-button>
          </el-form>
          <div class="auth-footnote">演示账号：staff1_1 / 123456</div>
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
            <h3>工作台</h3>
            <p>只聚焦自己被分配的订单，不展示全店运营与管理能力。</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card stat-blue"><span>待服务</span><strong>{{ app.dashboard.pendingServiceCount || 0 }}</strong></div>
          <div class="stat-card stat-green"><span>服务中</span><strong>{{ app.dashboard.inServiceCount || 0 }}</strong></div>
          <div class="stat-card stat-violet"><span>已完成</span><strong>{{ app.dashboard.completedCount || 0 }}</strong></div>
          <div class="stat-card stat-orange"><span>累计分配</span><strong>{{ app.dashboard.totalAssignedCount || 0 }}</strong></div>
        </div>

        <div class="editor-layout">
          <div class="content-card">
            <div class="section-title"><h3>当前账号</h3></div>
            <div class="staff-profile-grid">
              <div><span>姓名</span><strong>{{ app.profile.name || '-' }}</strong></div>
              <div><span>账号</span><strong>{{ app.profile.username || '-' }}</strong></div>
              <div><span>联系电话</span><strong>{{ app.profile.phone || '-' }}</strong></div>
              <div><span>所属商家</span><strong>{{ app.profile.merchantName || '-' }}</strong></div>
              <div><span>擅长标签</span><strong>{{ app.profile.specialty || '暂无' }}</strong></div>
              <div><span>状态</span><strong>{{ app.profile.status === 1 ? '在职' : '停用' }}</strong></div>
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
                <el-button type="primary" @click="$router.push({ path: '/orders', query: { status: '2' } })">处理待服务</el-button>
                <el-button @click="$router.push('/orders')">查看我的订单</el-button>
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
      this.app.bootstrap();
    }
  };

  const OrdersPage = {
    template: `
      <div>
        <div class="panel-section-title">
          <div>
            <h3>我的订单</h3>
            <p>仅展示分配给当前服务人员的订单。</p>
          </div>
        </div>

        <div class="paper-toolbar-tabs">
          <el-button size="mini" :type="app.orderFilters.status === '' ? 'primary' : 'default'" @click="changeStatus('')">全部</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '2' ? 'primary' : 'default'" @click="changeStatus('2')">待服务</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '3' ? 'primary' : 'default'" @click="changeStatus('3')">服务中</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '4' ? 'primary' : 'default'" @click="changeStatus('4')">已完成</el-button>
          <el-button size="mini" :type="app.orderFilters.status === '5' ? 'primary' : 'default'" @click="changeStatus('5')">已取消</el-button>
        </div>

        <div class="table-card paper-table">
          <el-table :data="app.orderList.list || []" border>
            <el-table-column type="index" label="序号" width="70"></el-table-column>
            <el-table-column prop="orderNo" label="订单号" width="210"></el-table-column>
            <el-table-column label="服务信息" min-width="220">
              <template slot-scope="scope">
                <div class="row-title">
                  <img class="row-thumb" :src="app.orderCover(scope.row)" alt="service">
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
            <el-table-column label="状态" width="110">
              <template slot-scope="scope">
                <el-tag size="mini" :type="app.orderTagType(scope.row.status)">{{ app.orderStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template slot-scope="scope">
                <div class="row-link-actions">
                  <span class="action-link" @click="$router.push('/orders/' + scope.row.id)">详情</span>
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
      changePage: function (page) {
        this.app.pushOrderRouteQuery({ pageNum: page });
      }
    }
  };

  const OrderDetailPage = {
    template: `
      <div v-if="app.currentOrderDetail">
        <div class="panel-section-title">
          <div>
            <h3>订单详情</h3>
            <p>围绕分配给自己的订单查看预约信息、沟通记录并推进履约。</p>
          </div>
          <div class="account-actions">
            <el-button @click="$router.push('/orders')">返回订单列表</el-button>
            <el-button v-if="app.currentOrderDetail.status === '2'" type="warning" @click="app.startOrder(app.currentOrderDetail.id)">开始服务</el-button>
            <el-button v-if="app.currentOrderDetail.status === '3'" type="success" @click="app.completeOrder(app.currentOrderDetail.id)">完成服务</el-button>
          </div>
        </div>

        <div class="summary-strip">
          <div class="summary-mini-card"><span>订单编号</span><strong>{{ app.currentOrderDetail.orderNo }}</strong></div>
          <div class="summary-mini-card"><span>当前状态</span><strong>{{ app.orderStatusText(app.currentOrderDetail.status) }}</strong></div>
          <div class="summary-mini-card"><span>预约时间</span><strong>{{ app.currentOrderDetail.appointDate }} {{ app.currentOrderDetail.appointSlot }}</strong></div>
          <div class="summary-mini-card"><span>分配时间</span><strong>{{ app.formatDate(app.currentOrderDetail.assignTime) }}</strong></div>
        </div>

        <div class="content-card">
          <div class="order-detail-grid">
            <div><span>服务名称</span><strong>{{ app.currentOrderDetail.serviceName || '-' }}</strong></div>
            <div><span>服务分类</span><strong>{{ app.currentOrderDetail.categoryName || '-' }}</strong></div>
            <div><span>用户姓名</span><strong>{{ app.currentOrderDetail.userName || '-' }}</strong></div>
            <div><span>联系电话</span><strong>{{ app.currentOrderDetail.userPhone || '-' }}</strong></div>
            <div><span>所属商家</span><strong>{{ app.currentOrderDetail.merchantName || '-' }}</strong></div>
            <div><span>商家电话</span><strong>{{ app.currentOrderDetail.merchantPhone || '-' }}</strong></div>
            <div><span>服务地址</span><strong>{{ app.currentOrderDetail.address || '-' }}</strong></div>
            <div><span>用户备注</span><strong>{{ app.currentOrderDetail.remark || '无' }}</strong></div>
          </div>

          <div class="message-panel">
            <div class="section-title"><h3>订单沟通</h3></div>
            <div class="message-thread" v-if="app.orderMessages.length">
              <div v-for="item in app.orderMessages" :key="item.id" class="message-bubble" :class="{ 'is-self': item.senderRole === 'staff' }">
                <div class="message-head">
                  <strong>{{ item.senderName }} · {{ item.senderRole === 'merchant' ? '商家' : (item.senderRole === 'staff' ? '服务人员' : '用户') }}</strong>
                  <span>{{ app.formatDate(item.createTime) }}</span>
                </div>
                <div class="message-content">{{ item.content }}</div>
              </div>
            </div>
            <div v-else class="mini-empty">暂无沟通记录。</div>
            <div class="message-composer">
              <el-input type="textarea" :rows="3" v-model="app.orderMessageForm.content" placeholder="请输入沟通内容"></el-input>
              <el-button type="primary" @click="app.sendOrderMessage">发送</el-button>
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
      this.app.loadOrderDetail(this.$route.params.id);
    },
    watch: {
      '$route.params.id': function (id) {
        this.app.loadOrderDetail(id);
      }
    }
  };

  const ProfilePage = {
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
            <div><span>姓名</span><strong>{{ app.profile.name || '-' }}</strong></div>
            <div><span>账号</span><strong>{{ app.profile.username || '-' }}</strong></div>
            <div><span>联系电话</span><strong>{{ app.profile.phone || '-' }}</strong></div>
            <div><span>所属商家</span><strong>{{ app.profile.merchantName || '-' }}</strong></div>
            <div><span>商家地址</span><strong>{{ app.profile.merchantAddress || '-' }}</strong></div>
            <div><span>擅长标签</span><strong>{{ app.profile.specialty || '暂无' }}</strong></div>
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
      this.app.fetchProfile();
    }
  };

  const router = new VueRouter({
    routes: [
      { path: '/', redirect: '/dashboard' },
      { path: '/login', component: LoginPage },
      { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true } },
      { path: '/orders', component: OrdersPage, meta: { requiresAuth: true } },
      { path: '/orders/:id', component: OrderDetailPage, meta: { requiresAuth: true } },
      { path: '/profile', component: ProfilePage, meta: { requiresAuth: true } }
    ]
  });

  router.beforeEach(function (to, from, next) {
    var token = localStorage.getItem('staffToken');
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
    el: '#staff-app',
    router: router,
    template: `
      <div class="staff-shell">
        <template v-if="isLoginRoute">
          <router-view></router-view>
        </template>
        <template v-else>
          <div class="backoffice-header">
            <div class="backoffice-header-inner">
              <div class="backoffice-title">
                <div class="backoffice-kicker">Staff Workspace</div>
                <h1>服务人员工作台</h1>
                <p>只处理被分配的订单，聚焦订单沟通与履约推进。</p>
              </div>
              <div class="backoffice-userbox">
                <div>
                  <strong>{{ profile.name || authInfo.name || '服务人员账号' }}</strong>
                  <span>{{ profile.merchantName || '-' }} · {{ profile.status === 1 ? '在职' : '停用' }}</span>
                </div>
                <el-button type="text" @click="goHome">门户</el-button>
                <el-button type="text" @click="logout">退出</el-button>
              </div>
            </div>
          </div>

          <div class="backoffice-layout">
            <div class="backoffice-sidebar">
              <div class="account-card">
                <h3>{{ profile.name || authInfo.name || '服务人员账号' }}</h3>
                <p>{{ profile.merchantName || '所属商家' }}</p>
                <div class="metric-inline">
                  <el-tag size="mini" type="success">待服务 {{ dashboard.pendingServiceCount || 0 }}</el-tag>
                  <el-tag size="mini">服务中 {{ dashboard.inServiceCount || 0 }}</el-tag>
                </div>
              </div>

              <div class="backoffice-menu">
                <div class="backoffice-menu-title">功能导航</div>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/dashboard') }" @click="$router.push('/dashboard')">工作台</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/orders') }" @click="$router.push('/orders')">我的订单</el-button>
                <el-button class="menu-button" :class="{ 'is-active': isRoute('/profile') }" @click="$router.push('/profile')">个人信息</el-button>
              </div>
            </div>
            <div class="backoffice-panel">
              <router-view></router-view>
            </div>
          </div>
        </template>
      </div>
    `,
    data: function () {
      return {
        token: localStorage.getItem('staffToken') || '',
        loginForm: { username: 'staff1_1', password: '123456' },
        authInfo: {},
        profile: {},
        dashboard: {},
        orderFilters: { status: '', pageNum: 1, pageSize: 10 },
        orderList: { list: [], total: 0, pageNum: 1, pageSize: 10 },
        currentOrderDetail: null,
        orderMessages: [],
        orderMessageForm: defaultMessageForm(),
        loading: {
          login: false
        }
      };
    },
    computed: {
      isLoginRoute: function () {
        return this.$route.path === '/login';
      }
    },
    created: function () {
      if (this.token) {
        this.bootstrap();
      }
    },
    methods: {
      request: function (config, auth) {
        var vm = this;
        return api(Object.assign({}, config, {
          headers: auth === false ? (config.headers || {}) : this.headers(config.headers || {})
        })).then(function (res) {
          if (res.data.code === 401) {
            vm.handleExpired();
            throw new Error(res.data.message || '登录已失效');
          }
          if (res.data.code !== 200) {
            throw new Error(res.data.message || '请求失败');
          }
          return res.data.data;
        }).catch(function (err) {
          if (err.response && err.response.status === 401) {
            vm.handleExpired();
          }
          throw err;
        });
      },
      headers: function (extra) {
        return Object.assign({}, extra || {}, this.token ? { Authorization: 'Bearer ' + this.token } : {});
      },
      setToken: function (token) {
        this.token = token;
        localStorage.setItem('staffToken', token);
      },
      handleExpired: function () {
        this.token = '';
        localStorage.removeItem('staffToken');
        if (this.$route.path !== '/login') {
          this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } });
        }
      },
      login: function () {
        var vm = this;
        this.loading.login = true;
        return this.request({
          method: 'post',
          url: '/staff/auth/login',
          data: this.loginForm
        }, false).then(function (data) {
          vm.setToken(data.token);
          vm.$message.success('登录成功');
          vm.bootstrap();
          vm.$router.push(vm.$route.query.redirect || '/dashboard');
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.login = false;
        });
      },
      logout: function () {
        this.token = '';
        localStorage.removeItem('staffToken');
        this.$router.push('/login');
      },
      bootstrap: function () {
        this.fetchAuthInfo();
        this.fetchProfile();
        this.fetchDashboard();
      },
      fetchAuthInfo: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/auth/info' }).then(function (data) {
          vm.authInfo = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchProfile: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/profile/detail' }).then(function (data) {
          vm.profile = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      fetchDashboard: function () {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/dashboard/summary' }).then(function (data) {
          vm.dashboard = data || {};
        }).catch(function (err) {
          if (vm.token) vm.$message.error(err.message);
        });
      },
      readOrderQuery: function (query) {
        return {
          status: query.status || '',
          pageNum: parsePositiveInt(query.pageNum, 1),
          pageSize: 10
        };
      },
      serializeOrderQuery: function (state) {
        var query = {};
        if (state.status) query.status = state.status;
        if (state.pageNum > 1) query.pageNum = String(state.pageNum);
        return query;
      },
      handleOrderRoute: function (query) {
        this.orderFilters = this.readOrderQuery(query || {});
        this.fetchOrders();
      },
      pushOrderRouteQuery: function (overrides) {
        var next = Object.assign({}, this.orderFilters, overrides || {});
        this.$router.push({ path: '/orders', query: this.serializeOrderQuery(next) });
      },
      fetchOrders: function () {
        var vm = this;
        return this.request({
          method: 'get',
          url: '/staff/order/list',
          params: {
            status: this.orderFilters.status || undefined,
            pageNum: this.orderFilters.pageNum,
            pageSize: this.orderFilters.pageSize
          }
        }).then(function (data) {
          vm.orderList = data || { list: [], total: 0, pageNum: 1, pageSize: vm.orderFilters.pageSize };
          vm.fetchDashboard();
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      loadOrderDetail: function (orderId) {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/order/' + orderId }).then(function (data) {
          vm.currentOrderDetail = data;
          vm.orderMessageForm = { orderId: data.id, content: '' };
          vm.fetchOrderMessages(data.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
          vm.$router.push('/orders');
        });
      },
      fetchOrderMessages: function (orderId) {
        var vm = this;
        return this.request({ method: 'get', url: '/staff/order/message/list', params: { orderId: orderId } }).then(function (data) {
          vm.orderMessages = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      sendOrderMessage: function () {
        var vm = this;
        if (!this.orderMessageForm.orderId || !this.orderMessageForm.content.trim()) {
          this.$message.warning('请输入沟通内容');
          return;
        }
        return this.request({
          method: 'post',
          url: '/staff/order/message/send',
          data: this.orderMessageForm
        }).then(function () {
          vm.orderMessageForm.content = '';
          vm.fetchOrderMessages(vm.currentOrderDetail.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      startOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/staff/order/start', data: { orderId: orderId } }).then(function () {
          vm.$message.success('已开始服务');
          vm.afterOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      completeOrder: function (orderId) {
        var vm = this;
        return this.request({ method: 'post', url: '/staff/order/complete', data: { orderId: orderId } }).then(function () {
          vm.$message.success('服务已完成');
          vm.afterOrderAction(orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      afterOrderAction: function (orderId) {
        this.fetchOrders();
        this.fetchDashboard();
        if (this.$route.path === '/orders/' + orderId) {
          this.loadOrderDetail(orderId);
        }
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
      orderCover: function (order) {
        return normalizeResourceUrl(order.serviceImage || LOCAL_SERVICE_PLACEHOLDER);
      },
      isRoute: function (prefix) {
        return this.$route.path === prefix || this.$route.path.indexOf(prefix + '/') === 0;
      },
      goHome: function () {
        window.location.href = './index.html';
      }
    }
  });
})();
