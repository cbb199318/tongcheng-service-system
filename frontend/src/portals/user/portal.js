import Vue from 'vue';
import VueRouter from 'vue-router';
import axios from 'axios';
import { createPortalRouter } from '../../utils/portalRouter';

const API_BASE = '';
const RESOURCE_BASE = 'http://127.0.0.1:8080';
const LOCAL_SERVICE_PLACEHOLDER = '/service-placeholder.svg';
const api = axios.create({ baseURL: API_BASE });

Vue.use(VueRouter);

function createUserPortal(el) {

  function defaultOrderForm() {
    return { appointDate: '', appointSlot: '上午 (08:00-12:00)', address: '', remark: '' };
  }

  function defaultReviewForm() {
    return { rating: 5, content: '', images: [] };
  }

  function defaultPayForm() {
    return { method: 'mock_wechat' };
  }

  function defaultOrderMessageForm() {
    return { orderId: null, content: '' };
  }

  function normalizeResourceUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url) || /^data:/.test(url)) {
      return url;
    }
    if (url.indexOf('/upload/') === 0) {
      return RESOURCE_BASE + url;
    }
    return url;
  }

  function parseImages(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(normalizeResourceUrl);
    }
    return String(value).split(',').map(item => item.trim()).filter(Boolean).map(normalizeResourceUrl);
  }

  function parseTags(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean);
    }
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }

  function firstImage(value) {
    const list = parseImages(value);
    return list.length ? list[0] : '';
  }

  Vue.component('service-tile', {
    props: ['service'],
    computed: {
      app() {
        return this.$root;
      }
    },
    template: `
      <div class="service-card user-service-card">
        <div class="service-image-wrap">
          <img :src="app.resolveServiceCover(service)" :alt="service.name">
          <span class="service-badge">{{ app.serviceBadge(service) }}</span>
        </div>
        <div class="service-card-body">
          <h4>{{ service.name }}</h4>
          <div class="service-meta-row">
            <span class="merchant-mini-avatar">{{ app.merchantInitial(service.merchantName) }}</span>
            <span class="service-meta">{{ service.merchantName || '平台商家' }}</span>
            <span class="service-score">★★★★★</span>
            <span class="service-score-value">{{ service.merchantRating || '4.9' }}</span>
          </div>
          <div class="service-price-row">
            <div class="service-price">￥{{ service.price }}</div>
            <div class="demo-text">已售{{ service.sales || 0 }}</div>
          </div>
          <div class="order-actions">
            <el-button size="mini" @click="app.goToServiceDetail(service.id)">查看详情</el-button>
            <el-button size="mini" type="primary" @click="app.goToOrderConfirm(service.id)">立即预约</el-button>
          </div>
        </div>
      </div>
    `
  });

  const LoginPage = {
    template: `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo">✿</div>
            <h1>同城服务平台</h1>
            <p>欢迎回来，继续你的同城服务之旅</p>
          </div>
          <el-form :model="app.loginForm" label-position="top">
            <el-form-item label="用户名">
              <el-input v-model="app.loginForm.username" prefix-icon="el-icon-user-solid"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="app.loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input>
            </el-form-item>
            <el-button class="auth-submit" type="primary" :loading="app.loading.login" @click="app.login">立即登录</el-button>
          </el-form>
          <div class="auth-footnote">演示账号：user01 / 123456</div>
          <div class="auth-switch-row">还没有账号？<span class="auth-switch-link" @click="$router.push('/register')">立即注册</span></div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    }
  };

  const RegisterPage = {
    template: `
      <div class="auth-screen">
        <div class="auth-card auth-card-wide">
          <div class="auth-brand">
            <div class="auth-logo">✿</div>
            <h1>同城服务平台</h1>
            <p>创建账号，开启本地生活服务预约之旅</p>
          </div>
          <el-form :model="app.registerForm" label-position="top">
            <el-form-item label="用户名"><el-input v-model="app.registerForm.username" prefix-icon="el-icon-user-solid"></el-input></el-form-item>
            <el-form-item label="昵称"><el-input v-model="app.registerForm.nickname"></el-input></el-form-item>
            <el-form-item label="手机号"><el-input v-model="app.registerForm.phone" prefix-icon="el-icon-mobile-phone"></el-input></el-form-item>
            <el-form-item label="密码"><el-input v-model="app.registerForm.password" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
            <el-form-item label="确认密码"><el-input v-model="app.registerForm.confirmPassword" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
            <el-checkbox v-model="app.registerAgreement">我已阅读并同意《用户协议》和《隐私政策》</el-checkbox>
            <el-button class="auth-submit" type="primary" :loading="app.loading.register" @click="app.register">立即注册</el-button>
          </el-form>
          <div class="auth-switch-row">已有账号？<span class="auth-switch-link" @click="$router.push('/login')">立即登录</span></div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    }
  };

  const HomePage = {
    template: `
      <div class="user-page-shell">
        <div class="user-page-header">
          <div>
            <h2>首页推荐</h2>
            <p>浏览热门同城服务，快速找到适合你的本地生活方案。</p>
          </div>
        </div>

        <div class="content-card hero-banner-card">
          <div class="section-title">
            <h3>Banner 轮播</h3>
          </div>
          <el-carousel
            v-if="app.homeData.banners && app.homeData.banners.length"
            class="hero-carousel"
            height="300px"
            indicator-position="outside">
            <el-carousel-item v-for="banner in app.homeData.banners" :key="banner.id">
              <div class="hero-banner-slide" @click="openBanner(banner)">
                <img :src="app.normalizeUrl(banner.imageUrl)" :alt="banner.title">
                <div class="hero-banner-overlay">
                  <strong>{{ banner.title || '同城优选服务' }}</strong>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
          <div v-else class="hero-banner-empty">暂无轮播图，等待管理员配置首页 Banner。</div>
        </div>

        <div class="search-strip user-search-strip">
          <el-input v-model="app.serviceQuery.keyword" placeholder="搜索服务名称" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.serviceQuery.categoryId" clearable placeholder="选择分类">
            <el-option v-for="item in app.categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
          <el-select v-model="app.serviceQuery.sortType" clearable placeholder="排序方式">
            <el-option label="按销量" value="sales"></el-option>
            <el-option label="按评分" value="rating"></el-option>
            <el-option label="按价格" value="price"></el-option>
          </el-select>
          <el-button type="primary" @click="search">搜索服务</el-button>
        </div>

        <div class="content-card category-shortcuts-card">
          <div class="section-title">
            <h3>服务分类</h3>
          </div>
          <div class="category-quick-grid">
            <button
              v-for="item in app.homeData.categories.slice(0, 8)"
              :key="item.id"
              class="category-quick-item"
              @click="jumpCategory(item.id)">
              <strong>{{ item.name }}</strong>
              <span>查看该分类下的服务</span>
            </button>
          </div>
        </div>

        <div class="user-home-layout">
          <div>
            <div class="section-title">
              <h3>热门服务</h3>
              <el-button type="text" @click="$router.push('/services')">查看更多</el-button>
            </div>
            <div class="user-card-grid">
              <service-tile v-for="service in app.homeData.hotServices" :key="service.id" :service="service"></service-tile>
            </div>
          </div>

          <div class="user-side-column">
            <div class="content-card user-side-card">
              <div class="section-title"><h3>推荐商家</h3></div>
              <div v-if="app.homeData.recommendedMerchants && app.homeData.recommendedMerchants.length">
                <div class="merchant-recommend-card" v-for="merchant in app.homeData.recommendedMerchants" :key="merchant.id">
                  <div class="merchant-recommend-head">
                    <img v-if="merchant.logo" :src="app.normalizeUrl(merchant.logo)" alt="logo">
                    <span v-else class="merchant-recommend-avatar">{{ app.merchantInitial(merchant.name) }}</span>
                    <div>
                      <strong>{{ merchant.name }}</strong>
                      <div class="demo-text">评分 {{ merchant.rating || '4.8' }} · 已服务 {{ merchant.orderCount || 0 }} 单</div>
                    </div>
                  </div>
                  <div class="demo-text">{{ merchant.intro || '专业本地服务商家，提供高效上门服务。' }}</div>
                </div>
              </div>
              <div v-else class="mini-empty">暂无推荐商家</div>
            </div>

            <div class="content-card user-side-card">
              <div class="section-title"><h3>平台公告</h3></div>
              <div v-if="app.homeData.notices && app.homeData.notices.length">
                <div class="notice-line" v-for="notice in app.homeData.notices" :key="notice.id">
                  <strong>{{ notice.title }}</strong>
                  <span>{{ app.formatDate(notice.createTime) }}</span>
                </div>
              </div>
              <div v-else class="mini-empty">暂无公告</div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    created() {
      this.app.ensureHomeLoaded();
      this.app.ensureCategoriesLoaded();
    },
    methods: {
      search() {
        this.app.serviceQuery.pageNum = 1;
        this.app.pushServiceRouteQuery();
      },
      jumpCategory(categoryId) {
        this.app.serviceQuery.categoryId = categoryId;
        this.app.serviceQuery.pageNum = 1;
        this.app.pushServiceRouteQuery();
      },
      openBanner(banner) {
        if (banner && banner.linkUrl && /^https?:\/\//.test(banner.linkUrl)) {
          window.open(banner.linkUrl, '_blank');
          return;
        }
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      }
    }
  };

  const ServicesPage = {
    template: `
      <div class="user-page-shell">
        <div class="user-page-header">
          <div>
            <h2>服务列表</h2>
            <p>按分类、关键字和排序方式筛选服务项目。</p>
          </div>
        </div>

        <div class="search-strip user-search-strip">
          <el-input v-model="app.serviceQuery.keyword" placeholder="搜索服务名称" @keyup.enter.native="search"></el-input>
          <el-select v-model="app.serviceQuery.categoryId" clearable placeholder="服务分类">
            <el-option v-for="item in app.categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
          <el-select v-model="app.serviceQuery.sortType" clearable placeholder="排序方式">
            <el-option label="按销量" value="sales"></el-option>
            <el-option label="按评分" value="rating"></el-option>
            <el-option label="按价格" value="price"></el-option>
          </el-select>
          <el-button type="primary" @click="search">搜索</el-button>
        </div>

        <div class="user-card-grid">
          <service-tile v-for="service in app.serviceList.list" :key="service.id" :service="service"></service-tile>
        </div>

        <div class="mini-empty" v-if="!app.serviceList.list.length && !app.loading.services">暂无匹配服务</div>

        <div class="user-pagination" v-if="app.serviceList.total > app.serviceQuery.pageSize">
          <el-pagination
            background
            layout="prev, pager, next"
            :current-page="app.serviceQuery.pageNum"
            :page-size="app.serviceQuery.pageSize"
            :total="app.serviceList.total"
            @current-change="changePage">
          </el-pagination>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    created() {
      this.app.ensureCategoriesLoaded();
    },
    watch: {
      '$route.query': {
        immediate: true,
        handler(query) {
          this.app.syncServiceQueryFromRoute(query);
          this.app.fetchServices();
        }
      }
    },
    methods: {
      search() {
        this.app.pushServiceRouteQuery({ pageNum: 1 });
      },
      changePage(page) {
        this.app.pushServiceRouteQuery({ pageNum: page });
      }
    }
  };

  const ServiceDetailPage = {
    template: `
      <div class="user-page-shell" v-if="app.serviceDetail">
        <div class="user-breadcrumb">
          <span @click="$router.push('/home')">首页</span>
          <span>/</span>
          <span @click="$router.push('/services')">服务列表</span>
          <span>/</span>
          <span>{{ app.serviceDetail.name }}</span>
        </div>

        <div class="service-detail-layout">
          <div class="content-card">
            <el-carousel height="360px" indicator-position="outside">
              <el-carousel-item v-for="(image, index) in app.serviceDetail.images" :key="index">
                <img class="detail-carousel-image" :src="image" :alt="app.serviceDetail.name">
              </el-carousel-item>
            </el-carousel>
          </div>

          <div class="content-card service-detail-info">
            <h2>{{ app.serviceDetail.name }}</h2>
            <div class="tag-list">
              <el-tag v-for="tag in app.serviceDetail.tags" :key="tag" size="mini">{{ tag }}</el-tag>
              <el-tag size="mini" type="info">{{ app.serviceDetail.categoryName }}</el-tag>
              <el-tag size="mini" type="warning">约{{ app.serviceDetail.duration || 60 }}分钟</el-tag>
            </div>
            <div class="detail-price">￥{{ app.serviceDetail.price }}</div>
            <div class="detail-score-row">
              <span>★★★★★</span>
              <strong>{{ app.serviceDetail.merchantRating || '4.9' }}</strong>
              <span class="demo-text">已售 {{ app.serviceDetail.sales || 0 }}</span>
            </div>
            <div class="detail-highlight-grid">
              <div>
                <span>服务时长</span>
                <strong>{{ app.serviceDetail.duration || 60 }} 分钟</strong>
              </div>
              <div>
                <span>服务分类</span>
                <strong>{{ app.serviceDetail.categoryName || '精选服务' }}</strong>
              </div>
              <div>
                <span>累计销量</span>
                <strong>{{ app.serviceDetail.sales || 0 }} 单</strong>
              </div>
              <div>
                <span>商家评分</span>
                <strong>{{ app.serviceDetail.merchantRating || '4.9' }}</strong>
              </div>
            </div>
            <div class="detail-section">
              <h4>商家信息</h4>
              <p>{{ app.serviceDetail.merchantName }}</p>
              <p class="demo-text">{{ app.serviceDetail.merchant && app.serviceDetail.merchant.intro ? app.serviceDetail.merchant.intro : '平台认证商家，支持预约上门。' }}</p>
            </div>
            <div class="detail-section">
              <h4>服务说明</h4>
              <p>{{ app.serviceDetail.description }}</p>
            </div>
            <el-button type="primary" class="detail-book-button" @click="app.goToOrderConfirm(app.serviceDetail.id)">立即预约</el-button>
          </div>
        </div>

        <div class="content-card review-panel">
          <div class="section-title"><h3>用户评价</h3></div>
          <div v-if="app.serviceDetail.reviews && app.serviceDetail.reviews.length">
            <div class="review-row" v-for="review in app.serviceDetail.reviews" :key="review.id">
              <div class="review-row-head">
                <strong>{{ review.nickname }}</strong>
                <span>{{ review.rating }} 星</span>
                <span>{{ app.formatDate(review.createTime) }}</span>
              </div>
              <p>{{ review.content || '用户未填写文字评价。' }}</p>
              <div class="review-image-strip" v-if="review.images && review.images.length">
                <img v-for="(image, index) in review.images" :key="index" :src="image" alt="review">
              </div>
              <div class="merchant-reply-box" v-if="review.reply">商家回复：{{ review.reply }}</div>
            </div>
          </div>
          <div v-else class="mini-empty">暂无评价，欢迎成为第一位预约用户。</div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    watch: {
      '$route.params.id': {
        immediate: true,
        handler(value) {
          this.app.loadServiceDetail(value);
        }
      }
    }
  };

  const OrderConfirmPage = {
    template: `
      <div class="user-page-shell" v-if="app.serviceDetail">
        <div class="user-page-header">
          <div>
            <h2>预约下单</h2>
            <p>填写预约日期、时段和服务地址，确认后进入支付页面。</p>
          </div>
        </div>

        <div class="checkout-layout">
          <div class="content-card checkout-service-card">
            <img :src="app.resolveServiceCover(app.serviceDetail)" :alt="app.serviceDetail.name">
            <div>
              <h3>{{ app.serviceDetail.name }}</h3>
              <div class="tag-list">
                <el-tag size="mini" type="info">{{ app.serviceDetail.categoryName }}</el-tag>
                <el-tag size="mini">{{ app.serviceDetail.duration || 60 }}分钟</el-tag>
              </div>
              <p class="demo-text">{{ app.serviceDetail.merchantName }}</p>
            </div>
            <div class="checkout-price">￥{{ app.serviceDetail.price }}</div>
          </div>

          <div class="content-card form-card">
            <el-form :model="app.orderForm" label-position="top">
              <el-form-item label="预约日期">
                <el-date-picker v-model="app.orderForm.appointDate" type="date" value-format="yyyy-MM-dd" style="width:100%"></el-date-picker>
              </el-form-item>
              <el-form-item label="预约时段">
                <el-select v-model="app.orderForm.appointSlot" style="width:100%">
                  <el-option label="上午 (08:00-12:00)" value="上午 (08:00-12:00)"></el-option>
                  <el-option label="下午 (14:00-18:00)" value="下午 (14:00-18:00)"></el-option>
                  <el-option label="晚上 (18:00-21:00)" value="晚上 (18:00-21:00)"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="服务地址">
                <el-input type="textarea" :rows="3" v-model="app.orderForm.address" placeholder="请输入详细服务地址"></el-input>
              </el-form-item>
              <el-form-item label="备注">
                <el-input type="textarea" :rows="3" v-model="app.orderForm.remark" placeholder="如有特殊需求请备注"></el-input>
              </el-form-item>
              <el-button type="primary" class="page-main-button" :loading="app.loading.orderSubmit" @click="submit">立即预约</el-button>
            </el-form>
          </div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    watch: {
      '$route.query.serviceId': {
        immediate: true,
        handler(value) {
          this.app.orderForm = defaultOrderForm();
          this.app.loadServiceDetail(value);
        }
      }
    },
    methods: {
      submit() {
        this.app.submitOrder();
      }
    }
  };

  const PayPage = {
    template: `
      <div class="user-page-shell" v-if="app.currentOrderDetail">
        <div class="content-card pay-page-card">
          <div class="pay-page-title">订单支付</div>
          <h2>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.name }}</h2>
          <div class="tag-list">
            <el-tag size="mini">{{ app.currentOrderDetail.service && app.currentOrderDetail.service.categoryName }}</el-tag>
            <el-tag size="mini" type="warning">{{ app.currentOrderDetail.appointDate }}</el-tag>
            <el-tag size="mini" type="info">{{ app.currentOrderDetail.appointSlot }}</el-tag>
          </div>
          <div class="pay-amount">￥{{ app.currentOrderDetail.totalPrice }}</div>
          <div class="pay-info-grid">
            <div><span>商家</span><strong>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.merchantName }}</strong></div>
            <div><span>订单号</span><strong>{{ app.currentOrderDetail.orderNo }}</strong></div>
            <div><span>服务地址</span><strong>{{ app.currentOrderDetail.address }}</strong></div>
            <div><span>当前状态</span><strong>{{ app.orderStatusText(app.currentOrderDetail.status) }}</strong></div>
          </div>
          <div class="pay-method-panel" v-if="app.currentOrderDetail.status === '0'">
            <div class="section-title">
              <h3>选择模拟支付方式</h3>
              <span class="demo-text">当前为演示支付流程，不接入真实支付通道。</span>
            </div>
            <el-radio-group v-model="app.payForm.method" class="pay-method-list">
              <label class="pay-method-card" :class="{ active: app.payForm.method === 'mock_wechat' }">
                <el-radio label="mock_wechat">微信模拟支付</el-radio>
                <span>选择支付方式后，订单将流转为待接单。</span>
              </label>
              <label class="pay-method-card" :class="{ active: app.payForm.method === 'mock_balance' }">
                <el-radio label="mock_balance">余额模拟支付</el-radio>
                <span>仅用于教学演示，不会接入真实账户与外部网关。</span>
              </label>
            </el-radio-group>
          </div>
          <el-button v-if="app.currentOrderDetail.status === '0'" type="primary" class="page-main-button" :loading="app.loading.payOrder" @click="app.payCurrentOrder">立即支付</el-button>
          <el-button v-else class="page-main-button" @click="$router.push({ path: '/orders', query: { status: '1' } })">查看我的订单</el-button>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    watch: {
      '$route.params.id': {
        immediate: true,
        handler(value) {
          this.app.payForm = defaultPayForm();
          this.app.loadOrderDetail(value);
        }
      }
    }
  };

  const OrdersPage = {
    template: `
      <div class="user-page-shell">
        <div class="user-page-header">
          <div>
            <h2>我的订单</h2>
            <p>查看预约进度、支付状态与已完成订单评价入口。</p>
          </div>
        </div>

        <div class="order-filter-tabs">
          <el-button size="mini" :type="activeFilterKey === '' ? 'primary' : 'default'" @click="changeFilter('')">全部</el-button>
          <el-button size="mini" :type="activeFilterKey === '0' ? 'primary' : 'default'" @click="changeFilter('0')">待支付</el-button>
          <el-button size="mini" :type="activeFilterKey === '1' ? 'primary' : 'default'" @click="changeFilter('1')">待接单</el-button>
          <el-button size="mini" :type="activeFilterKey === '2' ? 'primary' : 'default'" @click="changeFilter('2')">已接单</el-button>
          <el-button size="mini" :type="activeFilterKey === '3' ? 'primary' : 'default'" @click="changeFilter('3')">服务中</el-button>
          <el-button size="mini" :type="activeFilterKey === '4' ? 'primary' : 'default'" @click="changeFilter('4')">已完成</el-button>
          <el-button size="mini" :type="activeFilterKey === '5' ? 'primary' : 'default'" @click="changeFilter('5')">已取消</el-button>
        </div>

        <div class="order-card" v-for="order in app.orderList.list" :key="order.id">
          <div class="order-card-head">
            <div>订单号：{{ order.orderNo }}</div>
            <el-tag size="mini" :type="app.orderTagType(order.status)">{{ app.orderStatusText(order.status) }}</el-tag>
          </div>
          <div class="order-card-body">
            <div class="order-card-main">
              <h3 class="order-main-title">{{ order.service && order.service.name }}</h3>
              <div class="order-info-text">
                <div>{{ order.service && order.service.merchantName }}</div>
                <div>{{ order.appointDate }} {{ order.appointSlot }}</div>
                <div>{{ order.address }}</div>
              </div>
            </div>
            <div class="order-card-side">
              <div class="order-price">￥{{ order.totalPrice }}</div>
              <div class="order-actions">
                <el-button size="mini" @click="$router.push('/orders/' + order.id)">查看详情</el-button>
                <el-button v-if="order.status === '0'" size="mini" type="primary" @click="$router.push('/order/pay/' + order.id)">去支付</el-button>
                <el-button v-if="order.status === '0' || order.status === '1'" size="mini" @click="app.cancelOrder(order.id)">取消订单</el-button>
                <el-button v-if="order.status === '4' && !order.isCommented" size="mini" type="primary" @click="$router.push('/review/' + order.id)">去评价</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="mini-empty" v-if="!app.orderList.list.length && !app.loading.orders">暂无订单记录</div>

        <div class="user-pagination" v-if="app.orderList.total > app.orderList.pageSize">
          <el-pagination
            background
            layout="prev, pager, next"
            :current-page="pageNum"
            :page-size="Number(app.orderList.pageSize)"
            :total="app.orderList.total"
            @current-change="changePage">
          </el-pagination>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      },
      activeFilterKey() {
        return this.$route.query.statusGroup === 'service_pending' ? '1' : (this.$route.query.status || '');
      },
      pageNum() {
        return Number(this.$route.query.pageNum || 1);
      }
    },
    watch: {
      '$route.query': {
        immediate: true,
        handler(query) {
          this.app.fetchOrders(query);
        }
      }
    },
    methods: {
      changeFilter(status) {
        const query = {};
        if (status) {
          query.status = status;
        }
        this.$router.push({ path: '/orders', query: query });
      },
      changePage(page) {
        const query = {};
        if (this.$route.query.statusGroup) {
          query.statusGroup = this.$route.query.statusGroup;
        }
        if (this.$route.query.status) {
          query.status = this.$route.query.status;
        }
        if (page > 1) {
          query.pageNum = String(page);
        }
        this.$router.push({ path: '/orders', query: query });
      }
    }
  };

  const OrderDetailPage = {
    template: `
      <div class="user-page-shell" v-if="app.currentOrderDetail">
        <div class="user-page-header">
          <div>
            <h2>订单详情</h2>
            <p>查看订单状态、预约信息、支付时间与服务记录。</p>
          </div>
        </div>

        <div class="order-detail-layout">
          <div class="content-card">
            <div class="order-status-banner">
              <div>
                <strong>{{ app.orderStatusText(app.currentOrderDetail.status) }}</strong>
                <span>订单号：{{ app.currentOrderDetail.orderNo }}</span>
              </div>
              <div class="order-price">￥{{ app.currentOrderDetail.totalPrice }}</div>
            </div>
            <div class="order-detail-grid">
              <div><span>服务名称</span><strong>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.name }}</strong></div>
              <div><span>所属商家</span><strong>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.merchantName }}</strong></div>
              <div><span>预约日期</span><strong>{{ app.currentOrderDetail.appointDate }}</strong></div>
              <div><span>预约时段</span><strong>{{ app.currentOrderDetail.appointSlot }}</strong></div>
              <div><span>服务地址</span><strong>{{ app.currentOrderDetail.address }}</strong></div>
              <div><span>备注</span><strong>{{ app.currentOrderDetail.remark || '无' }}</strong></div>
              <div><span>服务人员</span><strong>{{ app.currentOrderDetail.staff ? app.currentOrderDetail.staff.name : '暂未分配' }}</strong></div>
              <div><span>分配时间</span><strong>{{ app.formatDate(app.currentOrderDetail.assignTime) }}</strong></div>
              <div><span>支付时间</span><strong>{{ app.formatDate(app.currentOrderDetail.payTime) }}</strong></div>
              <div><span>完成时间</span><strong>{{ app.formatDate(app.currentOrderDetail.completeTime) }}</strong></div>
            </div>
            <div class="order-progress-strip">
              <div
                v-for="(step, index) in app.orderProgressSteps(app.currentOrderDetail)"
                :key="step.key"
                class="order-progress-step"
                :class="{ done: step.done, current: step.current }">
                <div class="step-dot"></div>
                <div class="step-line" v-if="index < app.orderProgressSteps(app.currentOrderDetail).length - 1"></div>
                <strong>{{ step.label }}</strong>
                <span>{{ step.time || '待更新' }}</span>
              </div>
            </div>
            <div class="order-actions">
              <el-button v-if="app.currentOrderDetail.status === '0'" size="mini" type="primary" @click="$router.push('/order/pay/' + app.currentOrderDetail.id)">去支付</el-button>
              <el-button v-if="app.currentOrderDetail.status === '0' || app.currentOrderDetail.status === '1'" size="mini" @click="app.cancelOrder(app.currentOrderDetail.id)">取消订单</el-button>
              <el-button v-if="app.currentOrderDetail.status === '4' && !app.currentOrderDetail.isCommented" size="mini" type="primary" @click="$router.push('/review/' + app.currentOrderDetail.id)">去评价</el-button>
            </div>

            <div class="message-panel">
              <div class="section-title"><h3>订单沟通</h3></div>
              <div class="message-thread" v-if="app.orderMessages.length">
                <div v-for="item in app.orderMessages" :key="item.id" class="message-bubble" :class="{ 'is-self': item.senderRole === 'user' }">
                  <div class="message-head">
                    <strong>{{ item.senderName }} · {{ item.senderRole === 'merchant' ? '商家' : (item.senderRole === 'staff' ? '服务人员' : '用户') }}</strong>
                    <span>{{ app.formatDate(item.createTime) }}</span>
                  </div>
                  <div class="message-content">{{ item.content }}</div>
                </div>
              </div>
              <div v-else class="mini-empty">暂无沟通记录，可在此确认服务安排或联系商家。</div>
              <div class="message-composer">
                <el-input type="textarea" :rows="3" v-model="app.orderMessageForm.content" placeholder="请输入要发送的订单消息"></el-input>
                <el-button type="primary" @click="app.sendUserOrderMessage">发送</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    watch: {
      '$route.params.id': {
        immediate: true,
        handler(value) {
          this.app.loadOrderDetail(value);
        }
      }
    }
  };

  const ReviewPage = {
    template: `
      <div class="user-page-shell" v-if="app.currentOrderDetail">
        <div class="content-card review-form-panel">
          <div class="user-page-header compact">
            <div>
              <h2>服务评价</h2>
              <p>分享你的预约体验，帮助更多用户选择合适的服务。</p>
            </div>
          </div>

          <div class="review-order-card">
            <strong>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.name }}</strong>
            <p>{{ app.currentOrderDetail.service && app.currentOrderDetail.service.merchantName }}</p>
            <span>{{ app.currentOrderDetail.appointDate }} {{ app.currentOrderDetail.appointSlot }}</span>
          </div>

          <el-form :model="app.reviewForm" label-position="top">
            <el-form-item label="服务评分">
              <div class="review-score-picker">
                <el-rate v-model="app.reviewForm.rating"></el-rate>
                <span>{{ app.reviewText(app.reviewForm.rating) }}</span>
              </div>
            </el-form-item>
            <el-form-item label="评价内容（选填）">
              <el-input type="textarea" :rows="6" maxlength="200" show-word-limit v-model="app.reviewForm.content" placeholder="分享您的服务体验..."></el-input>
            </el-form-item>
            <el-form-item label="上传图片（选填，最多 3 张）">
              <el-upload
                action=""
                class="paper-upload"
                :file-list="app.reviewFileList"
                :limit="3"
                list-type="picture-card"
                accept="image/*"
                :http-request="uploadReviewImage"
                :on-remove="removeReviewImage"
                :on-exceed="reviewExceed"
                :on-preview="previewImage">
                <div class="upload-dropzone" :class="{ 'is-uploading': app.loading.uploadReview }">
                  <i class="el-icon-picture-outline upload-dropzone-icon"></i>
                  <strong>{{ app.loading.uploadReview ? '图片上传中...' : '上传评价图片' }}</strong>
                  <span>支持 JPG、PNG，单张不超过 5MB</span>
                </div>
              </el-upload>
            </el-form-item>
            <div class="page-action-row">
              <el-button @click="$router.push('/orders/' + app.currentOrderDetail.id)">取消</el-button>
              <el-button type="primary" :loading="app.loading.reviewSubmit" @click="app.submitReview">提交评价</el-button>
            </div>
          </el-form>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    watch: {
      '$route.params.orderId': {
        immediate: true,
        handler(value) {
          this.app.prepareReview(value);
        }
      }
    },
    methods: {
      uploadReviewImage(request) {
        this.app.handleReviewUpload(request);
      },
      removeReviewImage(file, fileList) {
        this.app.syncReviewImages(fileList);
      },
      reviewExceed() {
        this.app.$message.warning('最多上传 3 张图片');
      },
      previewImage(file) {
        if (file.url) {
          window.open(file.url, '_blank');
        }
      }
    }
  };

  const MerchantApplyPage = {
    template: `
      <div class="user-page-shell">
        <div class="user-page-header">
          <div>
            <h2>商家入驻申请</h2>
            <p>填写商家资料并上传资质图片，提交后等待平台审核。</p>
          </div>
        </div>

        <div class="content-card merchant-apply-panel">
          <div class="merchant-apply-heading">
            <h3>填写入驻资料</h3>
            <p>资质证书为必填，Logo 可作为次要展示素材上传。</p>
          </div>
          <el-form :model="app.merchantApplyForm" label-width="110px">
            <el-form-item label="商家名称"><el-input v-model="app.merchantApplyForm.name" placeholder="请输入商家名称"></el-input></el-form-item>
            <el-form-item label="联系电话"><el-input v-model="app.merchantApplyForm.phone" placeholder="请输入联系电话"></el-input></el-form-item>
            <el-form-item label="商家地址"><el-input type="textarea" :rows="2" v-model="app.merchantApplyForm.address" placeholder="请输入商家地址"></el-input></el-form-item>
            <el-form-item label="商家简介"><el-input type="textarea" :rows="4" v-model="app.merchantApplyForm.intro" placeholder="请输入商家简介（选填）"></el-input></el-form-item>
            <el-form-item label="商家 Logo">
              <div class="upload-row">
                <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadLogo">
                  <el-button icon="el-icon-upload2" :loading="app.loading.uploadLogo">上传 Logo</el-button>
                </el-upload>
                <div class="upload-preview-box" v-if="app.merchantApplyForm.logo">
                  <img :src="app.normalizeUrl(app.merchantApplyForm.logo)" alt="logo">
                </div>
                <span class="upload-tip">建议上传方形图片，单张不超过 5MB。</span>
              </div>
            </el-form-item>
            <el-form-item label="资质证书">
              <div class="upload-row">
                <el-upload action="" :show-file-list="false" accept="image/*" :http-request="uploadLicense">
                  <el-button type="primary" icon="el-icon-upload" :loading="app.loading.uploadLicense">上传资质证书</el-button>
                </el-upload>
                <div class="upload-preview-box large" v-if="app.merchantApplyForm.license">
                  <img :src="app.normalizeUrl(app.merchantApplyForm.license)" alt="license">
                </div>
                <span class="upload-tip">请上传清晰可见的资质照片，支持即时预览。</span>
              </div>
            </el-form-item>
            <div class="page-action-row">
              <el-button @click="$router.push('/home')">返回首页</el-button>
              <el-button type="primary" :loading="app.loading.merchantApply" @click="app.submitMerchantApply">提交申请</el-button>
            </div>
          </el-form>
        </div>

        <div class="content-card merchant-status-card" v-if="app.merchantApplyDetail && app.merchantApplyDetail.id">
          <div class="section-title"><h3>当前审核状态</h3></div>
          <div class="merchant-status-grid">
            <div><span>审核状态</span><strong>{{ app.auditText(app.merchantApplyDetail.auditStatus) }}</strong></div>
            <div><span>审核备注</span><strong>{{ app.merchantApplyDetail.auditRemark || '暂无审核备注' }}</strong></div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    created() {
      this.app.fetchMerchantApply();
    },
    methods: {
      uploadLogo(request) {
        this.app.handleMerchantAssetUpload(request, 'logo');
      },
      uploadLicense(request) {
        this.app.handleMerchantAssetUpload(request, 'license');
      }
    }
  };

  const PointsPage = {
    template: `
      <div class="user-page-shell">
        <div class="user-page-header">
          <div>
            <h2>积分兑换</h2>
            <p>支持查看积分、选择权益并提交兑换。</p>
          </div>
        </div>

        <div class="points-layout">
          <div class="content-card points-card">
            <div class="points-number">{{ app.pointsInfo.points || 0 }}</div>
            <p>{{ app.pointsInfo.message }}</p>
            <el-button
              type="warning"
              class="page-main-button"
              :disabled="!app.pointsSelectedCode"
              :loading="app.loading.pointsExchange"
              @click="app.exchangePoints">
              立即兑换
            </el-button>
          </div>

          <div class="content-card points-catalog-card">
            <div class="section-title">
              <h3>可兑换权益</h3>
              <span class="demo-text">选择一个积分权益后提交兑换</span>
            </div>
            <div v-if="app.pointsInfo.items && app.pointsInfo.items.length" class="points-item-grid">
              <label
                v-for="item in app.pointsInfo.items"
                :key="item.code"
                class="points-item-card"
                :class="{ active: app.pointsSelectedCode === item.code, disabled: !item.canExchange }">
                <input
                  type="radio"
                  name="points-item"
                  :value="item.code"
                  v-model="app.pointsSelectedCode"
                  :disabled="!item.canExchange">
                <div class="points-item-head">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.pointsCost }} 积分</span>
                </div>
                <p>{{ item.description }}</p>
                <em>{{ item.canExchange ? '当前积分可兑换' : '当前积分不足' }}</em>
              </label>
            </div>
            <div v-else class="mini-empty">暂无可兑换权益</div>
          </div>

          <div class="content-card points-record-card">
            <div class="section-title">
              <h3>兑换记录</h3>
              <span class="demo-text">保留最近 10 条积分兑换记录</span>
            </div>
            <div v-if="app.pointsInfo.records && app.pointsInfo.records.length">
              <div class="points-record-row" v-for="record in app.pointsInfo.records" :key="record.id">
                <div>
                  <strong>{{ record.itemName }}</strong>
                  <span>{{ app.formatDate(record.createTime) }}</span>
                </div>
                <div class="points-record-side">
                  <em>-{{ record.pointsCost }} 积分</em>
                  <label>{{ record.statusText }}</label>
                </div>
              </div>
            </div>
            <div v-else class="mini-empty">暂无兑换记录，先选择上方权益完成一次兑换吧。</div>
          </div>
        </div>
      </div>
    `,
    computed: {
      app() {
        return this.$root;
      }
    },
    created() {
      this.app.fetchPointsInfo();
    }
  };

  const portalRouter = createPortalRouter(VueRouter, '/user', [
      { path: '/', redirect: '/home' },
      { path: '/login', component: LoginPage },
      { path: '/register', component: RegisterPage },
      { path: '/home', component: HomePage },
      { path: '/services', component: ServicesPage },
      { path: '/service/:id', component: ServiceDetailPage },
      { path: '/order/confirm', component: OrderConfirmPage, meta: { requiresAuth: true } },
      { path: '/order/pay/:id', component: PayPage, meta: { requiresAuth: true } },
      { path: '/orders', component: OrdersPage, meta: { requiresAuth: true } },
      { path: '/orders/:id', component: OrderDetailPage, meta: { requiresAuth: true } },
      { path: '/review/:orderId', component: ReviewPage, meta: { requiresAuth: true } },
      { path: '/merchant/apply', component: MerchantApplyPage, meta: { requiresAuth: true } },
      { path: '/points', component: PointsPage, meta: { requiresAuth: true } }
    ]);
  const router = portalRouter.router;

  router.beforeEach(function (to, from, next) {
    const token = localStorage.getItem('userToken') || '';
    if (to.meta.requiresAuth && !token) {
      next({ path: '/login', query: { redirect: to.fullPath } });
      return;
    }
    if ((to.path === '/login' || to.path === '/register') && token) {
      next('/home');
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
      <div class="user-shell">
        <template v-if="showHeader">
          <div class="user-topbar">
            <div class="user-topbar-inner">
              <div class="user-brand" @click="goHome">
                <span class="user-brand-logo">✿</span>
                <div>
                  <strong>同城服务平台</strong>
                </div>
              </div>
              <div class="user-nav">
                <span :class="{ active: isRoute('/home') }" @click="goHome">首页</span>
                <span :class="{ active: isRoute('/services') || isRoute('/service') }" @click="goServices">服务列表</span>
                <span :class="{ active: isRoute('/orders') || isRoute('/order/pay') || isRoute('/review') }" @click="goOrders">我的订单</span>
                <span :class="{ active: isRoute('/merchant/apply') }" @click="goMerchantApply">商家入驻</span>
              </div>
              <div class="platform-userbox" v-if="token">
                <div>
                  <div><strong>{{ userInfo.nickname || userInfo.username }}</strong></div>
                  <div class="demo-text">积分 {{ userInfo.points || 0 }} · 角色 {{ userInfo.role || 'user' }}</div>
                </div>
                <el-button type="text" @click="goPoints">积分</el-button>
                <el-button type="text" @click="logout">退出</el-button>
              </div>
              <div class="platform-userbox" v-else>
                <div>
                  <div><strong>游客访问</strong></div>
                  <div class="demo-text">登录后可预约、支付、评价和申请入驻</div>
                </div>
                <el-button type="text" @click="$router.push('/login')">登录</el-button>
                <el-button type="text" @click="$router.push('/register')">注册</el-button>
              </div>
            </div>
          </div>
        </template>
        <div :class="showHeader ? 'user-route-shell' : 'auth-route-shell'">
          <router-view></router-view>
        </div>
      </div>
    `,
    mounted: function () {
      var root = document.querySelector('#user-app');
      if (root) root.__vue__ = this;
      window.__userApp = this;
    },
    data: function () {
      return {
        token: localStorage.getItem('userToken') || '',
        userInfo: {},
        loginForm: { username: 'user01', password: '123456' },
        registerForm: { username: '', nickname: '', phone: '', password: '', confirmPassword: '' },
        registerAgreement: false,
        homeData: { banners: [], categories: [], hotServices: [], recommendedMerchants: [], notices: [] },
        categories: [],
        serviceQuery: { keyword: '', categoryId: '', sortType: 'sales', pageNum: 1, pageSize: 8 },
        serviceList: { list: [], total: 0, pageNum: 1, pageSize: 8 },
        serviceDetail: null,
        orderForm: defaultOrderForm(),
        payForm: defaultPayForm(),
        orderList: { list: [], total: 0, pageNum: 1, pageSize: 10 },
        currentOrderDetail: null,
        orderMessages: [],
        orderMessageForm: defaultOrderMessageForm(),
        reviewForm: defaultReviewForm(),
        reviewFileList: [],
        merchantApplyForm: { name: '', phone: '', address: '', intro: '', logo: '', license: '' },
        merchantApplyDetail: null,
        pointsInfo: {},
        pointsSelectedCode: '',
        loading: {
          login: false,
          register: false,
          services: false,
          orderSubmit: false,
          orders: false,
          payOrder: false,
          reviewSubmit: false,
          orderMessage: false,
          merchantApply: false,
          pointsExchange: false,
          uploadReview: false,
          uploadLogo: false,
          uploadLicense: false
        }
      };
    },
    computed: {
      showHeader: function () {
        return this.$route.path !== '/login' && this.$route.path !== '/register';
      }
    },
    created: function () {
      this.ensureHomeLoaded();
      this.ensureCategoriesLoaded();
      if (this.token) {
        this.fetchUserInfo();
      }
    },
    methods: {
      headers: function () {
        return this.token ? { Authorization: 'Bearer ' + this.token } : {};
      },
      request: function (method, url, data, auth) {
        var vm = this;
        return api({
          method: method,
          url: url,
          data: data,
          headers: auth ? this.headers() : {}
        }).then(function (res) {
          if (res.data.code === 401) {
            vm.handleAuthExpired();
            throw new Error(res.data.message || '登录已失效');
          }
          if (res.data.code !== 200) {
            throw new Error(res.data.message);
          }
          return res.data.data;
        }).catch(function (err) {
          if (err.response && err.response.status === 401) {
            vm.handleAuthExpired();
          }
          throw err;
        });
      },
      handleAuthExpired: function () {
        if (!this.token) return;
        this.token = '';
        this.userInfo = {};
        localStorage.removeItem('userToken');
        if (this.$route.path !== '/login') {
          this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } });
        }
      },
      setToken: function (token) {
        this.token = token;
        localStorage.setItem('userToken', token);
      },
      normalizeUrl: function (url) {
        return normalizeResourceUrl(url);
      },
      resolveServiceCover: function (service) {
        return normalizeResourceUrl(service.image || firstImage(service.images) || LOCAL_SERVICE_PLACEHOLDER);
      },
      merchantInitial: function (value) {
        var text = String(value || '商').trim();
        return text ? text.slice(0, 1) : '商';
      },
      serviceBadge: function (service) {
        if ((service.sales || 0) > 12) return '快速上门';
        if ((service.merchantRating || 0) >= 4.8) return '高分服务';
        return '品质服务';
      },
      reviewText: function (rating) {
        return { 1: '不太满意', 2: '一般', 3: '还不错', 4: '满意', 5: '非常满意' }[rating] || '非常满意';
      },
      orderStatusText: function (status) {
        return { '0': '待支付', '1': '待接单', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType: function (status) {
        return { '0': 'warning', '1': '', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      auditText: function (status) {
        return { '0': '待审核', '1': '已驳回', '2': '已通过' }[status] || '待完善';
      },
      formatDate: function (value) {
        if (!value) return '-';
        return String(value).replace('T', ' ').slice(0, 19);
      },
      isRoute: function (prefix) {
        return this.$route.path.indexOf(prefix) === 0;
      },
      goHome: function () {
        this.$router.push('/home');
      },
      goServices: function () {
        this.pushServiceRouteQuery();
      },
      goOrders: function () {
        this.$router.push('/orders');
      },
      goMerchantApply: function () {
        this.$router.push('/merchant/apply');
      },
      goPoints: function () {
        this.$router.push('/points');
      },
      goToServiceDetail: function (id) {
        this.$router.push('/service/' + id);
      },
      goToOrderConfirm: function (serviceId) {
        this.$router.push({ path: '/order/confirm', query: { serviceId: String(serviceId) } });
      },
      login: function () {
        var vm = this;
        this.loading.login = true;
        this.request('post', '/user/auth/login', this.loginForm, false).then(function (data) {
          vm.setToken(data.token);
          vm.userInfo = data;
          vm.$message.success('登录成功');
          vm.fetchUserInfo();
          vm.fetchMerchantApply();
          vm.fetchPointsInfo();
          vm.$router.push(vm.$route.query.redirect || '/home');
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.login = false;
        });
      },
      register: function () {
        var vm = this;
        if (!this.registerAgreement) {
          this.$message.warning('请先勾选用户协议');
          return;
        }
        this.loading.register = true;
        this.request('post', '/user/auth/register', this.registerForm, false).then(function () {
          vm.$message.success('注册成功，请登录');
          vm.registerForm = { username: '', nickname: '', phone: '', password: '', confirmPassword: '' };
          vm.registerAgreement = false;
          vm.$router.push('/login');
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.register = false;
        });
      },
      logout: function () {
        this.token = '';
        this.userInfo = {};
        this.serviceDetail = null;
        this.currentOrderDetail = null;
        this.orderForm = defaultOrderForm();
        this.reviewForm = defaultReviewForm();
        this.reviewFileList = [];
        this.merchantApplyForm = { name: '', phone: '', address: '', intro: '', logo: '', license: '' };
        this.merchantApplyDetail = null;
        this.pointsInfo = {};
        this.pointsSelectedCode = '';
        localStorage.removeItem('userToken');
        this.$router.push('/login');
      },
      parsePositiveInteger: function (value, fallback) {
        var parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
      },
      normalizeServiceQuery: function (query) {
        var categoryId = query.categoryId === '' || query.categoryId === null || query.categoryId === undefined
          ? ''
          : this.parsePositiveInteger(query.categoryId, '');
        return {
          keyword: query.keyword || '',
          categoryId: categoryId,
          sortType: query.sortType || 'sales',
          pageNum: this.parsePositiveInteger(query.pageNum, 1),
          pageSize: this.serviceQuery.pageSize
        };
      },
      syncServiceQueryFromRoute: function (routeQuery) {
        this.serviceQuery = Object.assign({}, this.serviceQuery, this.normalizeServiceQuery(routeQuery || {}));
      },
      buildServiceRouteQuery: function (overrides) {
        var nextQuery = Object.assign({}, this.serviceQuery, overrides || {});
        var normalized = this.normalizeServiceQuery(nextQuery);
        var query = {};
        if (normalized.keyword) query.keyword = normalized.keyword;
        if (normalized.categoryId !== '') query.categoryId = String(normalized.categoryId);
        if (normalized.sortType && normalized.sortType !== 'sales') query.sortType = normalized.sortType;
        if (normalized.pageNum > 1) query.pageNum = String(normalized.pageNum);
        return query;
      },
      pushServiceRouteQuery: function (overrides) {
        this.$router.push({ path: '/services', query: this.buildServiceRouteQuery(overrides) });
      },
      fetchUserInfo: function () {
        var vm = this;
        if (!this.token) return Promise.resolve();
        return this.request('get', '/user/auth/info', null, true).then(function (data) {
          vm.userInfo = data;
        }).catch(function () {});
      },
      ensureHomeLoaded: function () {
        return this.fetchHome();
      },
      fetchHome: function () {
        var vm = this;
        return this.request('get', '/user/home/index', null, false).then(function (data) {
          vm.homeData = data;
        });
      },
      ensureCategoriesLoaded: function () {
        var vm = this;
        return this.request('get', '/user/category/list', null, false).then(function (data) {
          vm.categories = data;
        });
      },
      fetchServices: function () {
        var vm = this;
        var params = new URLSearchParams();
        Object.keys(this.serviceQuery).forEach(function (key) {
          if (vm.serviceQuery[key] !== '' && vm.serviceQuery[key] !== null && vm.serviceQuery[key] !== undefined) {
            params.append(key, vm.serviceQuery[key]);
          }
        });
        this.loading.services = true;
        return this.request('get', '/user/service/list?' + params.toString(), null, false).then(function (data) {
          vm.serviceList = data;
        }).finally(function () {
          vm.loading.services = false;
        });
      },
      loadServiceDetail: function (id) {
        var vm = this;
        if (!id) return Promise.resolve();
        return this.request('get', '/user/service/' + id, null, false).then(function (data) {
          data.images = parseImages(data.images);
          data.tags = parseTags(data.tags);
          if (!data.images.length) {
            data.images = [vm.resolveServiceCover(data)];
          }
          if (data.reviews) {
            data.reviews = data.reviews.map(function (review) {
              review.images = parseImages(review.images);
              return review;
            });
          }
          vm.serviceDetail = data;
        }).catch(function (err) {
          vm.$message.error(err.message);
          vm.$router.push('/services');
        });
      },
      submitOrder: function () {
        var vm = this;
        if (!this.serviceDetail) return;
        this.loading.orderSubmit = true;
        return this.request('post', '/user/order/create', {
          serviceId: this.serviceDetail.id,
          appointDate: this.orderForm.appointDate,
          appointSlot: this.orderForm.appointSlot,
          address: this.orderForm.address,
          remark: this.orderForm.remark
        }, true).then(function (data) {
          vm.$message.success('订单创建成功');
          vm.orderForm = defaultOrderForm();
          vm.$router.push('/order/pay/' + data.orderId);
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.orderSubmit = false;
        });
      },
      fetchOrders: function (status) {
        var vm = this;
        if (!this.token) return Promise.resolve();
        var params = new URLSearchParams();
        var pageNum = this.parsePositiveInteger(status && status.pageNum, 1);
        var pageSize = this.orderList.pageSize || 10;
        if (status && status.statusGroup) params.append('statusGroup', status.statusGroup);
        else if (status && status.status) params.append('status', status.status);
        params.append('pageNum', pageNum);
        params.append('pageSize', pageSize);
        this.loading.orders = true;
        return this.request('get', '/user/order/list?' + params.toString(), null, true).then(function (data) {
          vm.orderList = data;
        }).finally(function () {
          vm.loading.orders = false;
        });
      },
      loadOrderDetail: function (id) {
        var vm = this;
        if (!id) return Promise.resolve();
        return this.request('get', '/user/order/' + id, null, true).then(function (data) {
          if (data.review && data.review.images) {
            data.review.images = parseImages(data.review.images);
          }
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
        return this.request('get', '/user/order/message/list?orderId=' + orderId, null, true).then(function (data) {
          vm.orderMessages = data || [];
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      sendUserOrderMessage: function () {
        var vm = this;
        if (!this.orderMessageForm.orderId || !this.orderMessageForm.content.trim()) {
          this.$message.warning('请输入沟通内容');
          return;
        }
        return this.request('post', '/user/order/message/send', this.orderMessageForm, true).then(function () {
          vm.orderMessageForm.content = '';
          vm.fetchOrderMessages(vm.currentOrderDetail.id);
        }).catch(function (err) {
          vm.$message.error(err.message);
        });
      },
      payCurrentOrder: function () {
        var vm = this;
        if (!this.currentOrderDetail) return;
        this.loading.payOrder = true;
        return this.request('post', '/user/order/pay', { orderId: this.currentOrderDetail.id }, true).then(function () {
          vm.$message.success('支付成功');
          return vm.loadOrderDetail(vm.currentOrderDetail.id);
        }).then(function () {
          vm.$router.push({ path: '/orders', query: { status: '1' } });
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.payOrder = false;
        });
      },
      cancelOrder: function (orderId) {
        var vm = this;
        this.$prompt('请输入取消原因', '取消订单', { confirmButtonText: '确认', cancelButtonText: '取消' })
          .then(function (_ref) {
            return vm.request('post', '/user/order/cancel', { orderId: orderId, reason: _ref.value }, true);
          })
          .then(function () {
            vm.$message.success('取消成功');
            vm.fetchOrders(vm.$route.query);
            if (vm.currentOrderDetail && vm.currentOrderDetail.id === orderId) {
              vm.loadOrderDetail(orderId);
            }
          }).catch(function (err) {
            if (err && err.message) {
              vm.$message.error(err.message);
            }
          });
      },
      prepareReview: function (orderId) {
        var vm = this;
        this.reviewForm = defaultReviewForm();
        this.reviewFileList = [];
        return this.loadOrderDetail(orderId).then(function () {
          if (!vm.currentOrderDetail) return;
          if (vm.currentOrderDetail.status !== '4') {
            vm.$message.warning('仅已完成订单允许评价');
            vm.$router.push('/orders/' + orderId);
            return;
          }
          if (vm.currentOrderDetail.isCommented) {
            vm.$message.warning('该订单已评价');
            vm.$router.push('/orders/' + orderId);
          }
        });
      },
      submitReview: function () {
        var vm = this;
        if (!this.currentOrderDetail || !this.currentOrderDetail.service || !this.currentOrderDetail.merchant) return;
        this.loading.reviewSubmit = true;
        return this.request('post', '/user/review/create', {
          orderId: this.currentOrderDetail.id,
          serviceId: this.currentOrderDetail.service.id,
          merchantId: this.currentOrderDetail.merchant.id,
          rating: this.reviewForm.rating,
          content: this.reviewForm.content,
          images: this.reviewForm.images
        }, true).then(function () {
          vm.$message.success('评价成功');
          vm.reviewForm = defaultReviewForm();
          vm.reviewFileList = [];
          vm.$router.push('/orders');
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.reviewSubmit = false;
        });
      },
      fetchMerchantApply: function () {
        var vm = this;
        if (!this.token) return Promise.resolve();
        return this.request('get', '/user/merchant/apply/detail', null, true).then(function (data) {
          vm.merchantApplyDetail = data;
          if (data) {
            vm.merchantApplyForm = {
              name: data.name || '',
              phone: data.phone || '',
              address: data.address || '',
              intro: data.intro || '',
              logo: data.logo || '',
              license: data.license || ''
            };
          } else {
            vm.merchantApplyForm = { name: '', phone: '', address: '', intro: '', logo: '', license: '' };
          }
        }).catch(function () {});
      },
      submitMerchantApply: function () {
        var vm = this;
        this.loading.merchantApply = true;
        return this.request('post', '/user/merchant/apply', this.merchantApplyForm, true).then(function () {
          vm.$message.success('申请已提交');
          vm.fetchMerchantApply();
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.merchantApply = false;
        });
      },
      fetchPointsInfo: function () {
        var vm = this;
        if (!this.token) return Promise.resolve();
        return this.request('get', '/user/points/info', null, true).then(function (data) {
          vm.pointsInfo = data;
          vm.userInfo.points = data.points || 0;
          if (data.items && data.items.length) {
            var firstAvailable = data.items.find(function (item) { return item.canExchange; });
            vm.pointsSelectedCode = firstAvailable ? firstAvailable.code : '';
          } else {
            vm.pointsSelectedCode = '';
          }
        }).catch(function () {});
      },
      exchangePoints: function () {
        var vm = this;
        if (!this.pointsSelectedCode) {
          this.$message.warning('请先选择一个积分兑换项');
          return Promise.resolve();
        }
        this.loading.pointsExchange = true;
        return this.request('post', '/user/points/exchange', { itemCode: this.pointsSelectedCode }, true).then(function (data) {
          vm.pointsInfo = data;
          vm.userInfo.points = data.points || 0;
          if (data.items && data.items.length) {
            var firstAvailable = data.items.find(function (item) { return item.canExchange; });
            vm.pointsSelectedCode = firstAvailable ? firstAvailable.code : '';
          }
          vm.$message.success(data.message);
        }).catch(function (err) {
          vm.$message.error(err.message);
        }).finally(function () {
          vm.loading.pointsExchange = false;
        });
      },
      uploadFile: function (file) {
        var formData = new FormData();
        formData.append('file', file);
        return api.post('/common/upload', formData, {
          headers: Object.assign({ 'Content-Type': 'multipart/form-data' }, this.headers())
        }).then(function (res) {
          if (res.data.code !== 200) {
            throw new Error(res.data.message);
          }
          return normalizeResourceUrl(res.data.data.url);
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
      handleReviewUpload: function (request) {
        var vm = this;
        if (!this.validateImageUpload(request.file, '评价图片')) {
          request.onError(new Error('invalid file'));
          return;
        }
        this.loading.uploadReview = true;
        this.uploadFile(request.file).then(function (url) {
          vm.reviewFileList = vm.reviewFileList.concat([{ name: request.file.name, url: url }]);
          vm.reviewForm.images = vm.reviewFileList.map(function (item) { return item.url; });
          request.onSuccess({ url: url });
          vm.$message.success('图片上传成功');
        }).catch(function (err) {
          vm.$message.error(err.message);
          request.onError(err);
        }).finally(function () {
          vm.loading.uploadReview = false;
        });
      },
      syncReviewImages: function (fileList) {
        this.reviewFileList = fileList.map(function (item) {
          return { name: item.name, url: item.url || (item.response && item.response.url) || '' };
        });
        this.reviewForm.images = this.reviewFileList.map(function (item) { return item.url; }).filter(Boolean);
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
          vm.$set(vm.merchantApplyForm, field, url);
          vm.$message.success('上传成功');
          request.onSuccess({ url: url });
        }).catch(function (err) {
          vm.$message.error(err.message);
          request.onError(err);
        }).finally(function () {
          vm.loading[loadingKey] = false;
        });
      },
      orderProgressSteps: function (order) {
        if (!order) return [];
        var status = String(order.status || '');
        var cancelled = status === '5';
        return [
          {
            key: 'create',
            label: '创建',
            time: this.formatDate(order.createTime),
            done: true,
            current: status === '0'
          },
          {
            key: 'pay',
            label: '支付',
            time: this.formatDate(order.payTime),
            done: ['1', '2', '3', '4'].indexOf(status) > -1 || Boolean(order.payTime),
            current: status === '1'
          },
          {
            key: 'accept',
            label: '接单',
            time: this.formatDate(order.acceptTime),
            done: ['2', '3', '4'].indexOf(status) > -1 || Boolean(order.acceptTime),
            current: status === '2'
          },
          {
            key: 'start',
            label: '服务开始',
            time: this.formatDate(order.startTime),
            done: ['3', '4'].indexOf(status) > -1 || Boolean(order.startTime),
            current: status === '3'
          },
          {
            key: cancelled ? 'cancel' : 'complete',
            label: cancelled ? '已取消' : '已完成',
            time: this.formatDate(cancelled ? order.cancelTime : order.completeTime),
            done: ['4', '5'].indexOf(status) > -1,
            current: ['4', '5'].indexOf(status) > -1
          }
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

export function mountUserPortal(el) {
  return createUserPortal(el);
}
