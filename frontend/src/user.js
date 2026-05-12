(function () {
  const api = axios.create({ baseURL: 'http://127.0.0.1:8080' });

  new Vue({
    el: '#user-app',
    template: `
      <div class="user-shell">
        <template v-if="!token">
          <div class="auth-screen">
            <div class="auth-card">
              <div class="auth-brand">
                <div class="auth-logo">✿</div>
                <h1>手工饰品</h1>
                <p>{{ authTab === 'login' ? '欢迎回来，继续你的服务之旅' : '创建账号，开启同城服务之旅' }}</p>
              </div>
              <div class="auth-actions">
                <el-button :type="authTab === 'login' ? 'primary' : 'default'" @click="authTab = 'login'">登录</el-button>
                <el-button :type="authTab === 'register' ? 'primary' : 'default'" @click="authTab = 'register'">注册</el-button>
              </div>

              <template v-if="authTab === 'login'">
                <el-form :model="loginForm" label-position="top">
                  <el-form-item label="用户名">
                    <el-input v-model="loginForm.username" prefix-icon="el-icon-user-solid"></el-input>
                  </el-form-item>
                  <el-form-item label="密码">
                    <el-input v-model="loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input>
                  </el-form-item>
                  <el-button class="auth-submit" type="primary" @click="login">立即登录</el-button>
                </el-form>
                <div class="auth-footnote">演示账号：user01 / 123456</div>
              </template>

              <template v-else>
                <el-form :model="registerForm" label-position="top">
                  <el-form-item label="用户名"><el-input v-model="registerForm.username" prefix-icon="el-icon-user-solid"></el-input></el-form-item>
                  <el-form-item label="昵称"><el-input v-model="registerForm.nickname"></el-input></el-form-item>
                  <el-form-item label="手机号"><el-input v-model="registerForm.phone" prefix-icon="el-icon-mobile-phone"></el-input></el-form-item>
                  <el-form-item label="密码"><el-input v-model="registerForm.password" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
                  <el-form-item label="确认密码"><el-input v-model="registerForm.confirmPassword" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
                  <el-button class="auth-submit" type="primary" @click="register">立即注册</el-button>
                </el-form>
              </template>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="top-platform">
            <div class="top-platform-inner">
              <div class="platform-title">
                <h2>同城服务平台</h2>
                <p>围绕服务浏览、预约下单、订单支付与评价闭环的论文演示版</p>
              </div>
              <div class="platform-userbox">
                <div>
                  <div><strong>{{ userInfo.nickname || userInfo.username }}</strong></div>
                  <div class="demo-text">积分 {{ userInfo.points }} · 角色 {{ userInfo.role }}</div>
                </div>
                <el-button type="text" @click="logout">退出</el-button>
                <el-button type="text" @click="goHome">门户</el-button>
              </div>
            </div>
          </div>

          <div class="platform-body">
            <div class="platform-grid">
              <div class="platform-menu">
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'home' }" @click="switchTab('home')">首页推荐</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'services' }" @click="switchTab('services')">服务列表</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'orders' }" @click="switchTab('orders')">我的订单</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'merchant' }" @click="switchTab('merchant')">商家入驻</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'points' }" @click="switchTab('points')">积分入口</el-button>
              </div>

              <div class="platform-panel">
                <template v-if="activeTab === 'home'">
                  <div class="section-title"><h3>推荐服务</h3></div>
                  <div class="banner-strip" style="margin-bottom:20px;">
                    <div class="content-card banner-item" v-for="banner in homeData.banners" :key="banner.id">
                      <img :src="banner.imageUrl" :alt="banner.title">
                      <h4>{{ banner.title }}</h4>
                    </div>
                  </div>
                  <div class="search-strip">
                    <el-input v-model="serviceQuery.keyword" placeholder="搜索服务名称"></el-input>
                    <el-select v-model="serviceQuery.categoryId" clearable placeholder="服务分类">
                      <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
                    </el-select>
                    <el-select v-model="serviceQuery.sortType" clearable placeholder="排序方式">
                      <el-option label="按销量" value="sales"></el-option>
                      <el-option label="按评分" value="rating"></el-option>
                      <el-option label="按价格" value="price"></el-option>
                    </el-select>
                    <el-button type="primary" @click="switchTab('services')">去筛选</el-button>
                  </div>
                  <div class="service-grid">
                    <div class="service-card" v-for="service in homeData.hotServices" :key="service.id">
                      <div class="service-image-wrap">
                        <img :src="service.images || fallbackImage(service.id)" :alt="service.name">
                        <span class="service-badge">{{ serviceBadge(service) }}</span>
                      </div>
                      <div class="service-card-body">
                        <h4>{{ service.name }}</h4>
                        <div class="service-meta">{{ service.merchantName || '平台商家' }}</div>
                        <div class="service-score">★★★★★ <span>{{ service.merchantRating || '4.9' }}</span></div>
                        <div class="service-price-row">
                          <div class="service-price">￥{{ service.price }}</div>
                          <div class="demo-text">已售{{ service.sales || 0 }}</div>
                        </div>
                        <div class="order-actions">
                          <el-button size="mini" @click="showServiceDetail(service.id)">详情</el-button>
                          <el-button size="mini" type="primary" @click="openOrderFromCard(service)">立即预约</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="activeTab === 'services'">
                  <div class="search-strip">
                    <el-input v-model="serviceQuery.keyword" placeholder="搜索服务名称"></el-input>
                    <el-select v-model="serviceQuery.categoryId" clearable placeholder="选择分类">
                      <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
                    </el-select>
                    <el-select v-model="serviceQuery.sortType" clearable placeholder="排序方式">
                      <el-option label="按销量" value="sales"></el-option>
                      <el-option label="按评分" value="rating"></el-option>
                      <el-option label="按价格" value="price"></el-option>
                    </el-select>
                    <el-button type="primary" @click="fetchServices">搜索</el-button>
                  </div>
                  <div class="service-grid">
                    <div class="service-card" v-for="service in serviceList.list" :key="service.id">
                      <div class="service-image-wrap">
                        <img :src="service.image || fallbackImage(service.id)" :alt="service.name">
                        <span class="service-badge">{{ serviceBadge(service) }}</span>
                      </div>
                      <div class="service-card-body">
                        <h4>{{ service.name }}</h4>
                        <div class="service-meta">{{ service.merchantName }}</div>
                        <div class="service-score">★★★★★ <span>{{ service.merchantRating }}</span></div>
                        <div class="service-price-row">
                          <div class="service-price">￥{{ service.price }}</div>
                          <div class="demo-text">已售{{ service.sales || 0 }}</div>
                        </div>
                        <div class="order-actions">
                          <el-button size="mini" @click="showServiceDetail(service.id)">详情</el-button>
                          <el-button size="mini" type="primary" @click="openOrderFromCard(service)">预约</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="activeTab === 'orders'">
                  <div class="order-page-title">我的订单</div>
                  <div class="order-filter-tabs">
                    <el-button size="mini" :type="!orderQuery.status ? 'primary' : 'default'" @click="filterOrders('')">全部</el-button>
                    <el-button size="mini" :type="orderQuery.status === '0' ? 'primary' : 'default'" @click="filterOrders('0')">待支付</el-button>
                    <el-button size="mini" :type="orderQuery.status === '1' ? 'primary' : 'default'" @click="filterOrders('1')">待服务</el-button>
                    <el-button size="mini" :type="orderQuery.status === '4' ? 'primary' : 'default'" @click="filterOrders('4')">已完成</el-button>
                    <el-button size="mini" :type="orderQuery.status === '5' ? 'primary' : 'default'" @click="filterOrders('5')">已取消</el-button>
                  </div>
                  <div class="order-card" v-for="order in orderList.list" :key="order.id">
                    <div class="order-card-head">
                      <div>订单号：{{ order.orderNo }}</div>
                      <el-tag size="mini" :type="orderTagType(order.status)">{{ orderStatusText(order.status) }}</el-tag>
                    </div>
                    <div class="order-card-body">
                      <div style="flex:1;">
                        <h3 class="order-main-title">{{ order.service && order.service.name }}</h3>
                        <div class="order-info-text">
                          <div>{{ order.service && order.service.merchantName }}</div>
                          <div>{{ order.appointDate }} {{ order.appointSlot }}</div>
                          <div>{{ order.address }}</div>
                        </div>
                      </div>
                      <div style="min-width:170px;">
                        <div class="order-price">￥{{ order.totalPrice }}</div>
                        <div class="order-actions">
                          <el-button size="mini" @click="showOrderDetail(order.id)">查看详情</el-button>
                          <el-button v-if="order.status === '0'" size="mini" type="primary" @click="payOrder(order.id)">去支付</el-button>
                          <el-button v-if="order.status === '0' || order.status === '1'" size="mini" @click="cancelOrder(order.id)">取消订单</el-button>
                          <el-button v-if="order.status === '4' && !order.isCommented" size="mini" type="primary" @click="openReview(order)">去评价</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-if="activeTab === 'merchant'">
                  <div class="section-title"><h3>商家入驻申请</h3></div>
                  <el-form :model="merchantApplyForm" label-width="100px">
                    <el-form-item label="商家名称"><el-input v-model="merchantApplyForm.name"></el-input></el-form-item>
                    <el-form-item label="联系电话"><el-input v-model="merchantApplyForm.phone"></el-input></el-form-item>
                    <el-form-item label="详细地址"><el-input v-model="merchantApplyForm.address"></el-input></el-form-item>
                    <el-form-item label="商家简介"><el-input type="textarea" v-model="merchantApplyForm.intro"></el-input></el-form-item>
                    <el-form-item label="资质地址"><el-input v-model="merchantApplyForm.license"></el-input></el-form-item>
                    <el-button type="primary" @click="submitMerchantApply">提交申请</el-button>
                  </el-form>
                  <div v-if="merchantApplyDetail && merchantApplyDetail.id" class="content-card" style="margin-top:16px;">
                    <div><strong>当前审核状态：</strong>{{ merchantApplyDetail.auditStatus }}</div>
                    <div style="margin-top:8px;"><strong>审核备注：</strong>{{ merchantApplyDetail.auditRemark }}</div>
                  </div>
                </template>

                <template v-if="activeTab === 'points'">
                  <div class="section-title"><h3>积分能力预留</h3></div>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="当前积分">{{ pointsInfo.points }}</el-descriptions-item>
                    <el-descriptions-item label="能力说明">{{ pointsInfo.message }}</el-descriptions-item>
                  </el-descriptions>
                  <el-button type="warning" style="margin-top:16px;" @click="exchangePoints">提交兑换占位请求</el-button>
                </template>
              </div>
            </div>
          </div>
        </template>

        <el-dialog title="服务详情" :visible.sync="serviceDialogVisible" width="760px">
          <div v-if="serviceDetail">
            <h3>{{ serviceDetail.name }}</h3>
            <p>{{ serviceDetail.merchantName }} · 评分 {{ serviceDetail.merchantRating }}</p>
            <p>价格 ￥{{ serviceDetail.price }} · 时长 {{ serviceDetail.duration }} 分钟</p>
            <p>{{ serviceDetail.description }}</p>
            <div class="tag-list">
              <el-tag v-for="tag in serviceDetail.tags || []" :key="tag" size="mini">{{ tag }}</el-tag>
            </div>
            <el-divider></el-divider>
            <div v-for="review in serviceDetail.reviews || []" :key="review.id" class="content-card" style="margin-top: 12px;">
              <div><strong>{{ review.nickname }}</strong> · {{ review.rating }} 星</div>
              <div style="margin-top: 8px;">{{ review.content }}</div>
              <div v-if="review.reply" style="margin-top: 8px; color: #2563eb;">商家回复：{{ review.reply }}</div>
            </div>
          </div>
        </el-dialog>

        <el-dialog title="预约下单" :visible.sync="orderDialogVisible" width="560px">
          <el-form :model="orderForm" label-width="100px">
            <el-form-item label="服务名称"><el-input :value="selectedService ? selectedService.name : ''" disabled></el-input></el-form-item>
            <el-form-item label="预约日期"><el-date-picker v-model="orderForm.appointDate" type="date" value-format="yyyy-MM-dd" style="width:100%"></el-date-picker></el-form-item>
            <el-form-item label="预约时段"><el-input v-model="orderForm.appointSlot" placeholder="例如 09:00-12:00"></el-input></el-form-item>
            <el-form-item label="服务地址"><el-input v-model="orderForm.address"></el-input></el-form-item>
            <el-form-item label="备注"><el-input type="textarea" v-model="orderForm.remark"></el-input></el-form-item>
            <el-button type="primary" @click="submitOrder">提交订单</el-button>
          </el-form>
        </el-dialog>

        <el-dialog title="订单详情" :visible.sync="orderDialogDetailVisible" width="700px">
          <pre class="soft-pre" v-if="currentOrderDetail">{{ JSON.stringify(currentOrderDetail, null, 2) }}</pre>
        </el-dialog>

        <el-dialog title="提交评价" :visible.sync="reviewDialogVisible" width="560px">
          <el-form :model="reviewForm" label-width="100px">
            <el-form-item label="评分"><el-rate v-model="reviewForm.rating"></el-rate></el-form-item>
            <el-form-item label="评价内容"><el-input type="textarea" v-model="reviewForm.content"></el-input></el-form-item>
            <el-form-item label="图片地址"><el-input v-model="reviewForm.imageInput" placeholder="多个地址用英文逗号分隔"></el-input></el-form-item>
            <el-button type="primary" @click="submitReview">提交评价</el-button>
          </el-form>
        </el-dialog>
      </div>
    `,
    data() {
      return {
        authTab: 'login',
        activeTab: 'home',
        token: localStorage.getItem('userToken') || '',
        userInfo: {},
        loginForm: { username: 'user01', password: '123456' },
        registerForm: { username: '', nickname: '', phone: '', password: '', confirmPassword: '' },
        homeData: { banners: [], categories: [], hotServices: [], notices: [] },
        categories: [],
        serviceQuery: { keyword: '', categoryId: '', sortType: '' },
        serviceList: { list: [] },
        serviceDialogVisible: false,
        serviceDetail: null,
        selectedService: null,
        orderDialogVisible: false,
        orderDialogDetailVisible: false,
        currentOrderDetail: null,
        orderForm: { appointDate: '', appointSlot: '', address: '', remark: '' },
        orderQuery: { status: '' },
        orderList: { list: [] },
        reviewDialogVisible: false,
        reviewTargetOrder: null,
        reviewForm: { rating: 5, content: '', imageInput: '' },
        merchantApplyForm: { name: '', phone: '', address: '', intro: '', license: '' },
        merchantApplyDetail: null,
        pointsInfo: {}
      };
    },
    created() {
      this.fetchHome();
      this.fetchCategories();
      this.fetchServices();
      if (this.token) {
        this.fetchUserInfo();
        this.fetchOrders();
        this.fetchMerchantApply();
        this.fetchPointsInfo();
      }
    },
    methods: {
      headers() {
        return this.token ? { Authorization: 'Bearer ' + this.token } : {};
      },
      request(method, url, data, auth) {
        return api({ method, url, data, headers: auth ? this.headers() : {} }).then(res => {
          if (res.data.code !== 200) throw new Error(res.data.message);
          return res.data.data;
        });
      },
      goHome() { window.location.href = './index.html'; },
      fallbackImage(id) { return 'https://picsum.photos/480/320?service=' + id; },
      serviceBadge(service) {
        if ((service.sales || 0) > 12) return '快速上门';
        if ((service.merchantRating || 0) >= 4.8) return '高分服务';
        return '新房开荒';
      },
      switchTab(tab) {
        this.activeTab = tab;
        this.handleTabChange({ name: tab });
      },
      handleTabChange(tab) {
        if (tab.name === 'orders' && this.token) this.fetchOrders();
        if (tab.name === 'merchant' && this.token) this.fetchMerchantApply();
        if (tab.name === 'points' && this.token) this.fetchPointsInfo();
        if (tab.name === 'services') this.fetchServices();
      },
      orderStatusText(status) {
        return { '0': '待支付', '1': '待服务', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType(status) {
        return { '0': 'warning', '1': '', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      filterOrders(status) {
        this.orderQuery.status = status;
        this.fetchOrders();
      },
      login() {
        this.request('post', '/user/auth/login', this.loginForm, false).then(data => {
          this.token = data.token;
          localStorage.setItem('userToken', data.token);
          this.userInfo = data;
          this.$message.success('登录成功');
          this.fetchOrders();
          this.fetchMerchantApply();
          this.fetchPointsInfo();
        }).catch(err => this.$message.error(err.message));
      },
      register() {
        this.request('post', '/user/auth/register', this.registerForm, false).then(() => {
          this.$message.success('注册成功，请登录');
          this.authTab = 'login';
        }).catch(err => this.$message.error(err.message));
      },
      logout() {
        this.token = '';
        this.userInfo = {};
        localStorage.removeItem('userToken');
        this.$message.success('已退出登录');
      },
      fetchUserInfo() {
        this.request('get', '/user/auth/info', null, true).then(data => this.userInfo = data).catch(() => {});
      },
      fetchHome() {
        this.request('get', '/user/home/index', null, false).then(data => this.homeData = data);
      },
      fetchCategories() {
        this.request('get', '/user/category/list', null, false).then(data => this.categories = data);
      },
      fetchServices() {
        const params = new URLSearchParams();
        Object.keys(this.serviceQuery).forEach(key => { if (this.serviceQuery[key]) params.append(key, this.serviceQuery[key]); });
        this.request('get', '/user/service/list?' + params.toString(), null, false).then(data => this.serviceList = data);
      },
      showServiceDetail(id) {
        this.request('get', '/user/service/' + id, null, false).then(data => {
          this.serviceDetail = data;
          this.serviceDialogVisible = true;
        });
      },
      openOrderFromCard(service) {
        if (!this.token) {
          this.$message.warning('请先登录后下单');
          return;
        }
        this.selectedService = service;
        this.orderDialogVisible = true;
      },
      submitOrder() {
        if (!this.selectedService) return;
        this.request('post', '/user/order/create', {
          serviceId: this.selectedService.id,
          appointDate: this.orderForm.appointDate,
          appointSlot: this.orderForm.appointSlot,
          address: this.orderForm.address,
          remark: this.orderForm.remark
        }, true).then(() => {
          this.$message.success('订单创建成功');
          this.orderDialogVisible = false;
          this.fetchOrders();
          this.activeTab = 'orders';
        }).catch(err => this.$message.error(err.message));
      },
      fetchOrders() {
        if (!this.token) return;
        const params = new URLSearchParams();
        if (this.orderQuery.status) params.append('status', this.orderQuery.status);
        this.request('get', '/user/order/list?' + params.toString(), null, true).then(data => this.orderList = data);
      },
      showOrderDetail(id) {
        this.request('get', '/user/order/' + id, null, true).then(data => {
          this.currentOrderDetail = data;
          this.orderDialogDetailVisible = true;
        });
      },
      payOrder(orderId) {
        this.request('post', '/user/order/pay', { orderId }, true).then(() => {
          this.$message.success('支付成功');
          this.fetchOrders();
        }).catch(err => this.$message.error(err.message));
      },
      cancelOrder(orderId) {
        this.$prompt('请输入取消原因', '取消订单', { confirmButtonText: '确认', cancelButtonText: '取消' })
          .then(({ value }) => this.request('post', '/user/order/cancel', { orderId, reason: value }, true))
          .then(() => {
            this.$message.success('取消成功');
            this.fetchOrders();
          }).catch(err => { if (err && err.message) this.$message.error(err.message); });
      },
      openReview(order) {
        this.reviewTargetOrder = order;
        this.reviewForm = { rating: 5, content: '', imageInput: '' };
        this.reviewDialogVisible = true;
      },
      submitReview() {
        const images = this.reviewForm.imageInput ? this.reviewForm.imageInput.split(',').map(item => item.trim()).filter(Boolean) : [];
        this.request('post', '/user/review/create', {
          orderId: this.reviewTargetOrder.id,
          serviceId: this.reviewTargetOrder.service.id,
          merchantId: this.reviewTargetOrder.merchant.id,
          rating: this.reviewForm.rating,
          content: this.reviewForm.content,
          images
        }, true).then(() => {
          this.$message.success('评价成功');
          this.reviewDialogVisible = false;
          this.fetchOrders();
        }).catch(err => this.$message.error(err.message));
      },
      submitMerchantApply() {
        this.request('post', '/user/merchant/apply', this.merchantApplyForm, true).then(() => {
          this.$message.success('申请已提交');
          this.fetchMerchantApply();
        }).catch(err => this.$message.error(err.message));
      },
      fetchMerchantApply() {
        if (!this.token) return;
        this.request('get', '/user/merchant/apply/detail', null, true).then(data => this.merchantApplyDetail = data);
      },
      fetchPointsInfo() {
        if (!this.token) return;
        this.request('get', '/user/points/info', null, true).then(data => this.pointsInfo = data);
      },
      exchangePoints() {
        this.request('post', '/user/points/exchange', {}, true).then(data => {
          this.pointsInfo = data;
          this.$message.success(data.message);
        }).catch(err => this.$message.error(err.message));
      }
    }
  });
})();
