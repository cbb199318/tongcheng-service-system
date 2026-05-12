(function () {
  const api = axios.create({ baseURL: 'http://127.0.0.1:8080' });

  new Vue({
    el: '#merchant-app',
    template: `
      <div class="merchant-shell">
        <template v-if="!token">
          <div class="auth-screen">
            <div class="auth-card">
              <div class="auth-brand">
                <div class="auth-logo" style="background:linear-gradient(135deg,#fb923c,#ea580c);">M</div>
                <h1 style="color:#ea580c;">商家工作台</h1>
                <p>登录后进入论文样例风格的运营后台，处理服务、订单和评价。</p>
              </div>
              <el-form :model="loginForm" label-position="top">
                <el-form-item label="用户名"><el-input v-model="loginForm.username" prefix-icon="el-icon-user-solid"></el-input></el-form-item>
                <el-form-item label="密码"><el-input v-model="loginForm.password" type="password" prefix-icon="el-icon-lock"></el-input></el-form-item>
                <el-button class="auth-submit" type="primary" style="background:linear-gradient(135deg,#fb923c,#ea580c);" @click="login">登录商家端</el-button>
              </el-form>
              <div class="auth-footnote">演示账号：merchant01 / 123456</div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="backoffice-header">
            <div class="backoffice-header-inner">
              <div class="backoffice-title">
                <div class="backoffice-kicker">Merchant Workspace</div>
                <h1>商家后台管理</h1>
                <p>参照论文截图的白底工作台，聚焦资料维护、服务发布、订单流转与评价回复。</p>
              </div>
              <div class="backoffice-userbox">
                <div>
                  <strong>{{ authInfo.name || merchantInfo.name || '商家账号' }}</strong>
                  <span>审核状态 {{ auditText(authInfo.auditStatus) }} · 累计订单 {{ merchantInfo.orderCount || 0 }}</span>
                </div>
                <el-button type="text" @click="goHome">门户</el-button>
                <el-button type="text" @click="logout">退出</el-button>
              </div>
            </div>
          </div>

          <div class="backoffice-layout">
            <div class="backoffice-sidebar">
              <div class="account-card">
                <h3>{{ merchantInfo.name || authInfo.name }}</h3>
                <p>{{ merchantInfo.address || '请先补充商家地址与简介信息。' }}</p>
                <div class="metric-inline">
                  <el-tag size="mini" type="warning">{{ auditText(authInfo.auditStatus) }}</el-tag>
                  <el-tag size="mini" type="success">评分 {{ merchantInfo.rating || '4.8' }}</el-tag>
                  <el-tag size="mini">订单 {{ merchantInfo.orderCount || 0 }}</el-tag>
                </div>
                <div class="account-actions">
                  <el-button size="mini" @click="switchTab('info')">资料页</el-button>
                  <el-button size="mini" type="primary" @click="openServiceDialog()">发布服务</el-button>
                </div>
              </div>

              <div class="backoffice-menu">
                <div class="backoffice-menu-title">功能导航</div>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'info' }" @click="switchTab('info')">店铺信息</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'services' }" @click="switchTab('services')">服务管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'orders' }" @click="switchTab('orders')">订单处理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'reviews' }" @click="switchTab('reviews')">评价管理</el-button>
                <el-button class="menu-button" :class="{ 'is-active': activeTab === 'extensions' }" @click="switchTab('extensions')">扩展预留</el-button>
              </div>
            </div>

            <div class="backoffice-panel">
              <template v-if="activeTab === 'info'">
                <div class="panel-section-title">
                  <div>
                    <h3>商家信息</h3>
                    <p>表单布局和右侧预览区参考论文中的资料编辑页风格。</p>
                  </div>
                  <el-button type="primary" @click="updateMerchant">保存资料</el-button>
                </div>

                <div class="summary-strip">
                  <div class="summary-mini-card">
                    <span>审核状态</span>
                    <strong>{{ auditText(merchantInfo.auditStatus || authInfo.auditStatus) }}</strong>
                  </div>
                  <div class="summary-mini-card">
                    <span>商家评分</span>
                    <strong>{{ merchantInfo.rating || '4.8' }}</strong>
                  </div>
                  <div class="summary-mini-card">
                    <span>累计服务单</span>
                    <strong>{{ merchantInfo.orderCount || 0 }}</strong>
                  </div>
                </div>

                <div class="editor-layout">
                  <div class="content-card">
                    <el-form :model="merchantInfo" label-width="110px">
                      <el-form-item label="商家名称"><el-input v-model="merchantInfo.name"></el-input></el-form-item>
                      <el-form-item label="联系电话"><el-input v-model="merchantInfo.phone"></el-input></el-form-item>
                      <el-form-item label="商家地址"><el-input type="textarea" :rows="2" v-model="merchantInfo.address"></el-input></el-form-item>
                      <el-form-item label="商家简介"><el-input type="textarea" :rows="5" v-model="merchantInfo.intro"></el-input></el-form-item>
                      <el-form-item label="商家 Logo"><el-input v-model="merchantInfo.logo" placeholder="填写图片 URL"></el-input></el-form-item>
                      <el-form-item label="资质证书"><el-input v-model="merchantInfo.license" placeholder="填写图片 URL"></el-input></el-form-item>
                    </el-form>
                  </div>
                  <div class="preview-stack">
                    <div class="preview-card">
                      <h4>商家 Logo 预览</h4>
                      <div class="preview-media">
                        <img v-if="merchantInfo.logo" :src="merchantInfo.logo" alt="logo">
                        <span v-else>未上传 Logo</span>
                      </div>
                    </div>
                    <div class="preview-card">
                      <h4>资质证书预览</h4>
                      <div class="preview-media tall">
                        <img v-if="merchantInfo.license" :src="merchantInfo.license" alt="license">
                        <span v-else>未上传资质图片</span>
                      </div>
                    </div>
                    <div class="preview-card">
                      <h4>审核备注</h4>
                      <div class="demo-text">{{ merchantInfo.auditRemark || '当前暂无审核备注。' }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <template v-if="activeTab === 'services'">
                <div class="panel-section-title">
                  <div>
                    <h3>服务管理</h3>
                    <p>沿用论文中列表页和服务编辑页的浅色后台风格。</p>
                  </div>
                  <el-button type="primary" @click="openServiceDialog()">新增服务</el-button>
                </div>

                <div class="summary-strip">
                  <div class="summary-mini-card">
                    <span>服务总数</span>
                    <strong>{{ serviceList.list.length }}</strong>
                  </div>
                  <div class="summary-mini-card">
                    <span>待审核</span>
                    <strong>{{ countServicesByAudit('0') }}</strong>
                  </div>
                  <div class="summary-mini-card">
                    <span>已上架</span>
                    <strong>{{ countServicesByStatus(1) }}</strong>
                  </div>
                </div>

                <div class="list-toolbar">
                  <el-input v-model="serviceFilters.keyword" placeholder="搜索服务名称"></el-input>
                  <el-select v-model="serviceFilters.auditStatus" clearable placeholder="审核状态">
                    <el-option label="待审核" value="0"></el-option>
                    <el-option label="已驳回" value="1"></el-option>
                    <el-option label="已通过" value="2"></el-option>
                  </el-select>
                  <el-select v-model="serviceFilters.status" clearable placeholder="上下架状态">
                    <el-option label="已上架" value="1"></el-option>
                    <el-option label="已下架" value="0"></el-option>
                  </el-select>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredServices" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column label="服务信息" min-width="320">
                      <template slot-scope="scope">
                        <div class="row-title">
                          <img class="row-thumb" :src="serviceCover(scope.row)" alt="service">
                          <div>
                            <div>{{ scope.row.name }}</div>
                            <div class="row-subtext">{{ categoryName(scope.row.categoryId) }} · {{ tagSummary(scope.row.tags) }}</div>
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
                    <el-table-column label="状态" width="180">
                      <template slot-scope="scope">
                        <el-tag size="mini" :type="auditTagType(scope.row.auditStatus)">{{ auditText(scope.row.auditStatus) }}</el-tag>
                        <el-tag size="mini" style="margin-left:8px;">{{ shelfText(scope.row.status) }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="更新时间" width="180">
                      <template slot-scope="scope">{{ formatDate(scope.row.updateTime || scope.row.createTime) }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="220">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="openServiceDialog(scope.row)">编辑</span>
                          <span class="action-link warning" @click="toggleServiceStatus(scope.row)">{{ scope.row.status === 1 ? '下架' : '上架' }}</span>
                          <span class="action-link danger" @click="deleteService(scope.row.id)">删除</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'orders'">
                <div class="panel-section-title">
                  <div>
                    <h3>订单处理</h3>
                    <p>订单状态按照论文中的流转规则展示与操作。</p>
                  </div>
                </div>

                <div class="paper-toolbar-tabs">
                  <el-button size="mini" :type="orderFilters.status === '' ? 'primary' : 'default'" @click="orderFilters.status = ''">全部</el-button>
                  <el-button size="mini" :type="orderFilters.status === '1' ? 'primary' : 'default'" @click="orderFilters.status = '1'">待接单</el-button>
                  <el-button size="mini" :type="orderFilters.status === '2' ? 'primary' : 'default'" @click="orderFilters.status = '2'">已接单</el-button>
                  <el-button size="mini" :type="orderFilters.status === '3' ? 'primary' : 'default'" @click="orderFilters.status = '3'">服务中</el-button>
                  <el-button size="mini" :type="orderFilters.status === '4' ? 'primary' : 'default'" @click="orderFilters.status = '4'">已完成</el-button>
                  <el-button size="mini" :type="orderFilters.status === '5' ? 'primary' : 'default'" @click="orderFilters.status = '5'">已取消</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredOrders" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column prop="orderNo" label="订单编号" width="200"></el-table-column>
                    <el-table-column label="服务信息" min-width="220">
                      <template slot-scope="scope">
                        <div>{{ scope.row.serviceName || '服务订单' }}</div>
                        <div class="row-subtext">{{ scope.row.categoryName || '服务类目待补充' }}</div>
                      </template>
                    </el-table-column>
                    <el-table-column label="预约信息" width="190">
                      <template slot-scope="scope">
                        <div>{{ scope.row.appointDate }}</div>
                        <div class="row-subtext">{{ scope.row.appointSlot }}</div>
                      </template>
                    </el-table-column>
                    <el-table-column prop="totalPrice" label="金额" width="110">
                      <template slot-scope="scope">￥{{ scope.row.totalPrice }}</template>
                    </el-table-column>
                    <el-table-column label="状态" width="110">
                      <template slot-scope="scope">
                        <el-tag size="mini" :type="orderTagType(scope.row.status)">{{ orderStatusText(scope.row.status) }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="250">
                      <template slot-scope="scope">
                        <div class="row-link-actions">
                          <span class="action-link" @click="showOrderDetail(scope.row.id)">详情</span>
                          <span v-if="scope.row.status === '1'" class="action-link" @click="acceptOrder(scope.row.id)">通过</span>
                          <span v-if="scope.row.status === '1'" class="action-link danger" @click="rejectOrder(scope.row.id)">驳回</span>
                          <span v-if="scope.row.status === '2'" class="action-link warning" @click="startOrder(scope.row.id)">开始服务</span>
                          <span v-if="scope.row.status === '3'" class="action-link" @click="completeOrder(scope.row.id)">完成服务</span>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'reviews'">
                <div class="panel-section-title">
                  <div>
                    <h3>评价管理</h3>
                    <p>突出待回复评价，方便演示商家反馈闭环。</p>
                  </div>
                </div>

                <div class="paper-toolbar-tabs">
                  <el-button size="mini" :type="reviewFilter === 'all' ? 'primary' : 'default'" @click="reviewFilter = 'all'">全部</el-button>
                  <el-button size="mini" :type="reviewFilter === 'pending' ? 'primary' : 'default'" @click="reviewFilter = 'pending'">待回复</el-button>
                  <el-button size="mini" :type="reviewFilter === 'replied' ? 'primary' : 'default'" @click="reviewFilter = 'replied'">已回复</el-button>
                </div>

                <div class="table-card paper-table">
                  <el-table :data="filteredReviews" border>
                    <el-table-column type="index" label="序号" width="70"></el-table-column>
                    <el-table-column label="评分" width="120">
                      <template slot-scope="scope">{{ scope.row.rating }} 星</template>
                    </el-table-column>
                    <el-table-column label="评价内容" min-width="320">
                      <template slot-scope="scope">
                        <div>{{ scope.row.content || '用户未填写文字评价' }}</div>
                        <div class="row-subtext">订单号 {{ scope.row.orderId }} · 图片 {{ (scope.row.images || []).filter(Boolean).length }} 张</div>
                      </template>
                    </el-table-column>
                    <el-table-column label="回复状态" width="180">
                      <template slot-scope="scope">
                        <el-tag size="mini" :type="scope.row.reply ? 'success' : 'warning'">{{ scope.row.reply ? '已回复' : '待回复' }}</el-tag>
                        <div class="row-subtext" style="margin-top:6px;">{{ scope.row.replyTime ? formatDate(scope.row.replyTime) : '尚未回复' }}</div>
                      </template>
                    </el-table-column>
                    <el-table-column label="回复内容" min-width="220">
                      <template slot-scope="scope">{{ scope.row.reply || '暂无回复内容' }}</template>
                    </el-table-column>
                    <el-table-column label="操作" width="120">
                      <template slot-scope="scope">
                        <span class="action-link" @click="replyReview(scope.row)">{{ scope.row.reply ? '重新回复' : '回复' }}</span>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>

              <template v-if="activeTab === 'extensions'">
                <div class="panel-section-title">
                  <div>
                    <h3>论文扩展能力预留</h3>
                    <p>一期先保留接口边界，方便后续补充招募、协同和服务沟通模块。</p>
                  </div>
                  <el-button type="warning" @click="loadRecruitOverview">刷新预留接口</el-button>
                </div>

                <div class="editor-layout">
                  <div class="preview-card">
                    <h4>人员招募接口预览</h4>
                    <pre class="soft-pre">{{ JSON.stringify(recruitOverview, null, 2) }}</pre>
                  </div>
                  <div class="preview-stack">
                    <div class="preview-card">
                      <h4>预留方向</h4>
                      <div class="demo-text">/merchant/staff/recruit/* 用于人员招募，/merchant/order/communication/* 用于订单沟通，当前版本保留接口入口但不做独立前台。</div>
                    </div>
                    <div class="preview-card">
                      <h4>扩展建议</h4>
                      <div class="demo-text">后续可以在当前左侧导航中增加“人员协同”和“沟通记录”，保持与论文结构一致。</div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>

        <el-dialog title="服务编辑" :visible.sync="serviceDialogVisible" width="860px">
          <div class="editor-layout">
            <div class="content-card">
              <el-form :model="serviceForm" label-width="100px">
                <el-form-item label="服务分类">
                  <el-select v-model="serviceForm.categoryId" placeholder="选择分类" style="width:100%">
                    <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id"></el-option>
                  </el-select>
                </el-form-item>
                <el-form-item label="服务名称"><el-input v-model="serviceForm.name"></el-input></el-form-item>
                <el-form-item label="服务价格"><el-input v-model="serviceForm.price"></el-input></el-form-item>
                <el-form-item label="服务时长"><el-input v-model="serviceForm.duration" placeholder="分钟"></el-input></el-form-item>
                <el-form-item label="图片地址"><el-input v-model="serviceForm.images" placeholder="多个地址用英文逗号分隔"></el-input></el-form-item>
                <el-form-item label="服务标签"><el-input v-model="serviceForm.tags" placeholder="多个标签用英文逗号分隔"></el-input></el-form-item>
                <el-form-item label="服务描述"><el-input type="textarea" :rows="6" v-model="serviceForm.description"></el-input></el-form-item>
                <el-button type="primary" @click="saveService">保存服务</el-button>
              </el-form>
            </div>
            <div class="preview-stack">
              <div class="preview-card">
                <h4>封面预览</h4>
                <div class="preview-media">
                  <img v-if="servicePreviewImages.length" :src="servicePreviewImages[0]" alt="cover">
                  <span v-else>等待填写服务图片</span>
                </div>
              </div>
              <div class="preview-card">
                <h4>标签预览</h4>
                <div class="metric-inline" v-if="serviceTagList.length">
                  <el-tag v-for="item in serviceTagList" :key="item" size="mini">{{ item }}</el-tag>
                </div>
                <div v-else class="mini-empty">暂无标签</div>
              </div>
              <div class="preview-card">
                <h4>附图数量</h4>
                <div class="demo-text">当前共 {{ servicePreviewImages.length }} 张图片，建议至少准备 1 张主图用于论文演示。</div>
              </div>
            </div>
          </div>
        </el-dialog>

        <el-dialog title="订单详情" :visible.sync="orderDialogVisible" width="700px">
          <pre class="soft-pre">{{ JSON.stringify(orderDetail, null, 2) }}</pre>
        </el-dialog>
      </div>
    `,
    data() {
      return {
        token: localStorage.getItem('merchantToken') || '',
        activeTab: 'info',
        loginForm: { username: 'merchant01', password: '123456' },
        authInfo: {},
        merchantInfo: {},
        serviceList: { list: [] },
        categories: [],
        serviceDialogVisible: false,
        serviceForm: { id: null, categoryId: '', name: '', price: '', duration: '', images: '', tags: '', description: '' },
        serviceFilters: { keyword: '', auditStatus: '', status: '' },
        orderList: { list: [] },
        orderFilters: { status: '' },
        orderDetail: null,
        orderDialogVisible: false,
        reviewList: { list: [] },
        reviewFilter: 'all',
        recruitOverview: {}
      };
    },
    computed: {
      filteredServices() {
        return (this.serviceList.list || []).filter(row => {
          const keyword = this.serviceFilters.keyword ? this.serviceFilters.keyword.trim().toLowerCase() : '';
          const matchKeyword = !keyword || (row.name || '').toLowerCase().indexOf(keyword) > -1;
          const matchAudit = !this.serviceFilters.auditStatus || row.auditStatus === this.serviceFilters.auditStatus;
          const matchStatus = this.serviceFilters.status === '' || String(row.status) === this.serviceFilters.status;
          return matchKeyword && matchAudit && matchStatus;
        });
      },
      filteredOrders() {
        return (this.orderList.list || []).filter(row => !this.orderFilters.status || row.status === this.orderFilters.status);
      },
      filteredReviews() {
        return (this.reviewList.list || []).filter(row => {
          if (this.reviewFilter === 'pending') return !row.reply;
          if (this.reviewFilter === 'replied') return !!row.reply;
          return true;
        });
      },
      servicePreviewImages() {
        return this.splitImages(this.serviceForm.images);
      },
      serviceTagList() {
        return (this.serviceForm.tags || '').split(',').map(item => item.trim()).filter(Boolean);
      }
    },
    created() {
      this.fetchCategories();
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
      switchTab(tab) {
        this.activeTab = tab;
        if (tab === 'services') this.fetchServices();
        if (tab === 'orders') this.fetchOrders();
        if (tab === 'reviews') this.fetchReviews();
      },
      bootstrap() {
        this.fetchAuthInfo();
        this.fetchMerchantInfo();
        this.fetchServices();
        this.fetchOrders();
        this.fetchReviews();
      },
      login() {
        this.request('post', '/merchant/auth/login', this.loginForm, false).then(data => {
          this.token = data.token;
          localStorage.setItem('merchantToken', data.token);
          this.$message.success('登录成功');
          this.bootstrap();
        }).catch(err => this.$message.error(err.message));
      },
      logout() {
        this.token = '';
        this.authInfo = {};
        this.merchantInfo = {};
        localStorage.removeItem('merchantToken');
        this.$message.success('已退出登录');
      },
      fetchAuthInfo() {
        this.request('get', '/merchant/auth/info').then(data => {
          this.authInfo = data.merchant || data;
        });
      },
      fetchMerchantInfo() {
        this.request('get', '/merchant/info/detail').then(data => {
          this.merchantInfo = data;
        });
      },
      updateMerchant() {
        this.request('put', '/merchant/info/update', this.merchantInfo).then(() => {
          this.$message.success('资料已更新');
          this.fetchMerchantInfo();
          this.fetchAuthInfo();
        }).catch(err => this.$message.error(err.message));
      },
      fetchCategories() {
        this.request('get', '/user/category/list', null, false).then(data => {
          this.categories = data;
        });
      },
      fetchServices() {
        this.request('get', '/merchant/service/list').then(data => {
          this.serviceList = data;
        });
      },
      countServicesByAudit(status) {
        return (this.serviceList.list || []).filter(item => item.auditStatus === status).length;
      },
      countServicesByStatus(status) {
        return (this.serviceList.list || []).filter(item => item.status === status).length;
      },
      openServiceDialog(row) {
        this.serviceForm = row ? {
          id: row.id,
          categoryId: row.categoryId,
          name: row.name,
          price: row.price,
          duration: row.duration,
          images: row.images || '',
          tags: row.tags || '',
          description: row.description || ''
        } : { id: null, categoryId: '', name: '', price: '', duration: '', images: '', tags: '', description: '' };
        this.serviceDialogVisible = true;
      },
      saveService() {
        const payload = Object.assign({}, this.serviceForm, {
          tags: this.serviceForm.tags,
          images: this.serviceForm.images
        });
        const method = payload.id ? 'put' : 'post';
        const url = payload.id ? '/merchant/service/update' : '/merchant/service/create';
        this.request(method, url, payload).then(() => {
          this.$message.success('服务已提交');
          this.serviceDialogVisible = false;
          this.fetchServices();
        }).catch(err => this.$message.error(err.message));
      },
      toggleServiceStatus(row) {
        this.request('post', '/merchant/service/status', {
          serviceId: row.id,
          status: row.status === 1 ? 0 : 1
        }).then(() => {
          this.$message.success('状态已更新');
          this.fetchServices();
        }).catch(err => this.$message.error(err.message));
      },
      deleteService(id) {
        this.request('delete', '/merchant/service/' + id).then(() => {
          this.$message.success('删除成功');
          this.fetchServices();
        }).catch(err => this.$message.error(err.message));
      },
      fetchOrders() {
        this.request('get', '/merchant/order/list').then(data => {
          this.orderList = data;
        });
      },
      showOrderDetail(id) {
        this.request('get', '/merchant/order/' + id).then(data => {
          this.orderDetail = data;
          this.orderDialogVisible = true;
        }).catch(err => this.$message.error(err.message));
      },
      acceptOrder(orderId) {
        this.request('post', '/merchant/order/accept', { orderId }).then(() => {
          this.$message.success('接单成功');
          this.fetchOrders();
        }).catch(err => this.$message.error(err.message));
      },
      rejectOrder(orderId) {
        this.$prompt('请输入驳回原因', '驳回订单', { confirmButtonText: '确认', cancelButtonText: '取消' })
          .then(({ value }) => this.request('post', '/merchant/order/reject', { orderId, reason: value }))
          .then(() => {
            this.$message.success('驳回成功');
            this.fetchOrders();
          })
          .catch(() => {});
      },
      startOrder(orderId) {
        this.request('post', '/merchant/order/start', { orderId }).then(() => {
          this.$message.success('已开始服务');
          this.fetchOrders();
        }).catch(err => this.$message.error(err.message));
      },
      completeOrder(orderId) {
        this.request('post', '/merchant/order/complete', { orderId }).then(() => {
          this.$message.success('服务已完成');
          this.fetchOrders();
        }).catch(err => this.$message.error(err.message));
      },
      fetchReviews() {
        this.request('get', '/merchant/review/list').then(data => {
          this.reviewList = data;
        });
      },
      replyReview(row) {
        this.$prompt('请输入回复内容', '回复评价', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          inputValue: row.reply || ''
        }).then(({ value }) => this.request('post', '/merchant/review/reply', {
          reviewId: row.id,
          reply: value
        })).then(() => {
          this.$message.success('回复成功');
          this.fetchReviews();
        }).catch(() => {});
      },
      loadRecruitOverview() {
        this.request('get', '/merchant/staff/recruit/overview').then(data => {
          this.recruitOverview = data;
        }).catch(err => this.$message.error(err.message));
      },
      auditText(status) {
        return { '0': '待审核', '1': '已驳回', '2': '已通过' }[status] || '待完善';
      },
      auditTagType(status) {
        return { '0': 'warning', '1': 'danger', '2': 'success' }[status] || '';
      },
      shelfText(status) {
        return status === 1 ? '已上架' : '已下架';
      },
      orderStatusText(status) {
        return { '0': '待支付', '1': '待接单', '2': '已接单', '3': '服务中', '4': '已完成', '5': '已取消' }[status] || status;
      },
      orderTagType(status) {
        return { '0': 'warning', '1': 'warning', '2': 'primary', '3': 'success', '4': 'success', '5': 'info' }[status] || '';
      },
      categoryName(categoryId) {
        const match = (this.categories || []).find(item => item.id === categoryId);
        return match ? match.name : '未分类';
      },
      serviceCover(row) {
        return this.splitImages(row.images)[0] || ('https://picsum.photos/300/200?merchant-service=' + row.id);
      },
      splitImages(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        return String(value).split(',').map(item => item.trim()).filter(Boolean);
      },
      tagSummary(tags) {
        if (!tags) return '暂无标签';
        return String(tags).split(',').map(item => item.trim()).filter(Boolean).slice(0, 3).join(' / ');
      },
      formatDate(value) {
        if (!value) return '-';
        return String(value).replace('T', ' ').slice(0, 19);
      }
    }
  });
})();
