<template>
  <div id="app-shell">
    <portal-host v-if="activePortal" :portal="activePortal" />
    <div v-else class="landing-body">
      <div class="landing-shell">
        <div class="landing-hero">
          <p class="eyebrow">SpringBoot + Vue2 + MyBatis-Plus</p>
          <h1>同城服务管理系统</h1>
          <p class="subtitle">论文配套演示版，现已切换为标准 Vue 工程，统一通过 npm 开发服务器承载用户端、商家端和管理端。</p>
        </div>
        <div class="portal-grid">
          <a class="portal-card user" href="#/user/home">
            <h2>用户端</h2>
            <p>注册登录、浏览服务、预约下单、模拟支付、订单管理、服务评价、商家入驻。</p>
          </a>
          <a class="portal-card merchant" href="#/merchant/login">
            <h2>商家工作台</h2>
            <p>商家与员工共用一个入口登录，支持店铺维护、员工管理、订单处理、评价回复与内部履约协同。</p>
          </a>
          <a class="portal-card admin" href="#/admin/login">
            <h2>管理端</h2>
            <p>用户管理、审核管理、内容管理、订单监管与统计面板。</p>
          </a>
        </div>
        <div class="tip-box">
          <div>演示账号：`user01 / 123456`、`merchant01 / 123456`、`staff1_1 / 123456`、`admin / 123456`</div>
          <div>员工账号请从商家工作台进入，登录页切换到“员工登录”。</div>
          <div>后端默认地址：`http://127.0.0.1:8080`</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PortalHost from './components/PortalHost.vue';
import { detectPortalByHash } from './utils/portal';

export default {
  name: 'App',
  components: {
    PortalHost: PortalHost
  },
  data: function () {
    return {
      activePortal: detectPortalByHash(window.location.hash)
    };
  },
  mounted: function () {
    window.addEventListener('hashchange', this.syncPortalFromHash);
  },
  beforeDestroy: function () {
    window.removeEventListener('hashchange', this.syncPortalFromHash);
  },
  methods: {
    syncPortalFromHash: function () {
      this.activePortal = detectPortalByHash(window.location.hash);
    }
  }
};
</script>
