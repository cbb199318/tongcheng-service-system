const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000/admin.html#/login';
const OUT_DIR = '/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts';
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const LOG_PATH = path.join(OUT_DIR, 'logs', 'admin-test-result.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

async function waitForTableStable(page) {
  await page.waitForTimeout(800);
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function takeShot(page, name, fullPage = true) {
  ensureDir(SHOT_DIR);
  const target = path.join(SHOT_DIR, `${sanitize(name)}.png`);
  await page.screenshot({ path: target, fullPage });
  return target;
}

async function getMessageText(page) {
  const message = page.locator('.el-message').last();
  if (await message.count()) {
    return (await message.textContent())?.trim() || '';
  }
  return '';
}

async function clearMessages(page) {
  const closeButtons = page.locator('.el-message .el-message__closeBtn');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i += 1) {
    await closeButtons.nth(i).click().catch(() => {});
  }
}

async function login(page, result) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=同城服务平台管理端');
  result.passes.push({
    title: '登录页加载正常',
    route: await page.evaluate(() => location.hash),
    notes: '登录页标题、输入框和登录按钮均已展示'
  });
  await takeShot(page, '01_login_page');

  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('123456');
  await page.getByRole('button', { name: '登录后台' }).click();
  await page.waitForURL(/#\/dashboard/, { timeout: 10000 });
  await page.waitForSelector('text=数据总览');
  result.passes.push({
    title: '登录成功并跳转统计页',
    route: await page.evaluate(() => location.hash),
    notes: '登录后路由跳转到 #/dashboard'
  });
  await takeShot(page, '02_dashboard_after_login');
}

async function testDashboard(page, result) {
  await page.waitForSelector('text=数据总览');
  await waitForTableStable(page);

  const cards = page.locator('.stat-card');
  const cardCount = await cards.count();
  const hasTrend = await page.locator('text=近 7 日订单趋势').count();
  const hasRate = await page.locator('text=服务分类占比').count();
  const hasRank = await page.locator('text=商家订单排行 TOP5').count();
  const shot = await takeShot(page, '03_dashboard_full');

  if (cardCount >= 4 && hasTrend && hasRate && hasRank) {
    result.passes.push({
      title: '统计页核心区块存在',
      route: '#/dashboard',
      notes: '包含指标卡、趋势图、占比图和排行区块'
    });
  } else {
    result.issues.push({
      title: '统计页核心区块缺失',
      severity: '高',
      route: '#/dashboard',
      steps: ['登录管理端', '进入统计总览页'],
      actual: `指标卡数量=${cardCount}，趋势图=${!!hasTrend}，占比图=${!!hasRate}，排行=${!!hasRank}`,
      expected: '统计页应包含指标卡、趋势图、占比图和排行区块',
      type: '论文不一致',
      screenshot: shot
    });
  }
}

async function testMerchantAudit(page, result) {
  await page.getByRole('button', { name: '商家审核' }).click();
  await page.waitForURL(/#\/merchants/);
  await page.waitForSelector('text=商家审核');
  await waitForTableStable(page);
  const listShot = await takeShot(page, '04_merchants_list');

  const pendingRow = page.locator('.el-table__body tr').filter({ hasText: '优选到家' }).first();
  if (await pendingRow.count()) {
    result.passes.push({
      title: '商家审核页加载正常',
      route: '#/merchants',
      notes: '待审核商家、筛选区、表格区和分页区可见'
    });
  } else {
    result.issues.push({
      title: '商家审核缺少待审核演示数据',
      severity: '中',
      route: '#/merchants',
      steps: ['登录管理端', '进入商家审核页'],
      actual: '页面未找到待审核商家“优选到家”',
      expected: '应存在至少一条待审核商家用于答辩演示',
      type: '演示数据问题',
      screenshot: listShot
    });
  }

  await pendingRow.getByText('查看详情').click();
  await page.waitForURL(/#\/merchants\/\d+/);
  await page.waitForSelector('text=商家详情');
  const detailShot = await takeShot(page, '05_merchant_detail');
  result.passes.push({
    title: '商家详情页可打开',
    route: await page.evaluate(() => location.hash),
    notes: '详情页包含 Logo、资质、联系信息和审核备注'
  });

  await page.getByRole('button', { name: '驳回' }).click();
  await page.waitForSelector('.el-dialog__wrapper:has-text("驳回审核")');
  await page.getByRole('button', { name: '确认驳回' }).click();
  await page.waitForTimeout(600);
  const emptyRejectMsg = await getMessageText(page);
  const rejectShot = await takeShot(page, '06_merchant_reject_validation', false);
  if (emptyRejectMsg.includes('请输入驳回原因')) {
    result.passes.push({
      title: '商家驳回备注必填校验生效',
      route: await page.evaluate(() => location.hash),
      notes: `提示文案：${emptyRejectMsg}`
    });
  } else {
    result.issues.push({
      title: '商家驳回未拦截空备注',
      severity: '高',
      route: await page.evaluate(() => location.hash),
      steps: ['进入商家详情页', '点击驳回', '不填写备注直接提交'],
      actual: emptyRejectMsg || '未出现必填提示',
      expected: '应阻止提交并提示填写驳回原因',
      type: '功能 bug',
      screenshot: rejectShot
    });
  }
  await clearMessages(page);
  await page.locator('.el-dialog__wrapper .el-textarea__inner').fill('答辩测试驳回备注');
  await page.getByRole('button', { name: '确认驳回' }).click();
  await page.waitForTimeout(1000);
  const finalMsg = await getMessageText(page);
  const finalShot = await takeShot(page, '07_merchant_rejected_after_submit');
  if (finalMsg.includes('驳回成功')) {
    result.passes.push({
      title: '商家驳回操作可执行',
      route: await page.evaluate(() => location.hash),
      notes: `提示文案：${finalMsg}`
    });
  } else {
    result.issues.push({
      title: '商家驳回操作失败',
      severity: '高',
      route: await page.evaluate(() => location.hash),
      steps: ['进入待审核商家详情页', '填写驳回原因', '提交驳回'],
      actual: finalMsg || '未出现成功提示',
      expected: '应成功提交驳回并刷新状态',
      type: '功能 bug',
      screenshot: finalShot
    });
  }
}

async function testServiceAudit(page, result) {
  await page.getByRole('button', { name: '服务审核' }).click();
  await page.waitForURL(/#\/services/);
  await page.waitForSelector('text=服务审核');
  await waitForTableStable(page);
  await takeShot(page, '08_services_list');

  const pendingRow = page.locator('.el-table__body tr').filter({ hasText: '热水器检修' }).first();
  if (!await pendingRow.count()) {
    result.issues.push({
      title: '服务审核缺少待审核演示数据',
      severity: '中',
      route: '#/services',
      steps: ['登录管理端', '进入服务审核页'],
      actual: '未找到待审核服务“热水器检修”',
      expected: '应存在待审核服务数据用于论文演示',
      type: '演示数据问题',
      screenshot: path.join(SHOT_DIR, '08_services_list.png')
    });
    return;
  }

  await pendingRow.getByText('查看详情').click();
  await page.waitForURL(/#\/services\/\d+/);
  await page.waitForSelector('text=服务详情');
  await takeShot(page, '09_service_detail');

  await page.getByRole('button', { name: '驳回' }).click();
  await page.waitForSelector('.el-dialog__wrapper:has-text("驳回审核")');
  await page.getByRole('button', { name: '确认驳回' }).click();
  await page.waitForTimeout(600);
  const emptyRejectMsg = await getMessageText(page);
  const rejectShot = await takeShot(page, '10_service_reject_validation', false);
  if (emptyRejectMsg.includes('请输入驳回原因')) {
    result.passes.push({
      title: '服务驳回备注必填校验生效',
      route: await page.evaluate(() => location.hash),
      notes: `提示文案：${emptyRejectMsg}`
    });
  } else {
    result.issues.push({
      title: '服务驳回未拦截空备注',
      severity: '高',
      route: await page.evaluate(() => location.hash),
      steps: ['进入服务详情页', '点击驳回', '不填写备注直接提交'],
      actual: emptyRejectMsg || '未出现必填提示',
      expected: '应阻止提交并提示填写驳回原因',
      type: '功能 bug',
      screenshot: rejectShot
    });
  }
  await clearMessages(page);
  await page.locator('.el-dialog__wrapper .el-textarea__inner').fill('答辩测试服务驳回备注');
  await page.getByRole('button', { name: '确认驳回' }).click();
  await page.waitForTimeout(1000);
  const finalMsg = await getMessageText(page);
  const finalShot = await takeShot(page, '11_service_rejected_after_submit');
  if (finalMsg.includes('驳回成功')) {
    result.passes.push({
      title: '服务驳回操作可执行',
      route: await page.evaluate(() => location.hash),
      notes: `提示文案：${finalMsg}`
    });
  } else {
    result.issues.push({
      title: '服务驳回操作失败',
      severity: '高',
      route: await page.evaluate(() => location.hash),
      steps: ['进入待审核服务详情页', '填写驳回原因', '提交驳回'],
      actual: finalMsg || '未出现成功提示',
      expected: '应成功提交驳回并刷新状态',
      type: '功能 bug',
      screenshot: finalShot
    });
  }
}

async function testOrders(page, result) {
  await page.getByRole('button', { name: '订单监管' }).click();
  await page.waitForURL(/#\/orders/);
  await page.waitForSelector('text=订单监管');
  await waitForTableStable(page);
  await takeShot(page, '12_orders_list_initial');

  const orderInput = page.getByPlaceholder('搜索订单编号');
  await orderInput.fill('DEMO-M01-PENDING-001');
  await page.getByRole('button', { name: '查询' }).click();
  await waitForTableStable(page);
  const orderCountAfterNo = await page.locator('.el-table__body tr').count();
  const routeAfterNo = await page.evaluate(() => location.hash);
  if (routeAfterNo.includes('orderNo=DEMO-M01-PENDING-001') && orderCountAfterNo === 1) {
    result.passes.push({
      title: '订单按编号筛选可用',
      route: routeAfterNo,
      notes: '筛选后仅保留 1 条匹配订单'
    });
  } else {
    result.issues.push({
      title: '订单编号筛选异常',
      severity: '高',
      route: routeAfterNo,
      steps: ['进入订单监管页', '输入订单编号 DEMO-M01-PENDING-001', '点击查询'],
      actual: `路由=${routeAfterNo}，结果行数=${orderCountAfterNo}`,
      expected: '路由应带筛选参数，列表应仅返回匹配订单',
      type: '功能 bug',
      screenshot: await takeShot(page, '13_orders_filter_by_no')
    });
  }

  await page.getByText('待接单').click();
  await waitForTableStable(page);
  const routeAfterStatus = await page.evaluate(() => location.hash);
  const statusCell = await page.locator('.el-table__body tr td').nth(5).textContent().catch(() => '');
  if (routeAfterStatus.includes('status=1') && String(statusCell || '').includes('待接单')) {
    result.passes.push({
      title: '订单按状态筛选可用',
      route: routeAfterStatus,
      notes: '待接单筛选命中目标订单'
    });
  } else {
    result.issues.push({
      title: '订单状态筛选异常',
      severity: '高',
      route: routeAfterStatus,
      steps: ['进入订单监管页', '选择状态“待接单”'],
      actual: `路由=${routeAfterStatus}，状态列=${statusCell}`,
      expected: '应按状态过滤并反映到路由',
      type: '功能 bug',
      screenshot: await takeShot(page, '14_orders_filter_by_status')
    });
  }

  await page.getByRole('button', { name: '重置' }).click();
  await waitForTableStable(page);
  const datePicker = page.locator('.el-date-editor--daterange');
  await datePicker.click();
  await page.locator('.el-date-range-picker .available').first().click();
  await page.locator('.el-date-range-picker .available').nth(1).click();
  await waitForTableStable(page);
  const routeAfterDate = await page.evaluate(() => location.hash);
  if (routeAfterDate.includes('startDate=') && routeAfterDate.includes('endDate=')) {
    result.passes.push({
      title: '订单按日期筛选可用',
      route: routeAfterDate,
      notes: '日期范围变更后路由带上起止日期'
    });
  } else {
    result.issues.push({
      title: '订单日期筛选异常',
      severity: '中',
      route: routeAfterDate,
      steps: ['进入订单监管页', '选择一个日期区间'],
      actual: `路由=${routeAfterDate}`,
      expected: '应按日期过滤并同步到路由参数',
      type: '功能 bug',
      screenshot: await takeShot(page, '15_orders_filter_by_date')
    });
  }

  await page.getByRole('button', { name: '重置' }).click();
  await waitForTableStable(page);
  await page.locator('.el-table__body tr').first().getByText('详情').click();
  await page.waitForURL(/#\/orders\/\d+/);
  await page.waitForSelector('text=订单详情');
  const detailShot = await takeShot(page, '16_order_detail');
  const timelineCount = await page.locator('.admin-timeline-item').count();
  if (timelineCount >= 4) {
    result.passes.push({
      title: '订单详情页可打开且结构化展示',
      route: await page.evaluate(() => location.hash),
      notes: '订单详情展示状态进度、用户、商家、服务与备注区块'
    });
  } else {
    result.issues.push({
      title: '订单详情结构不完整',
      severity: '中',
      route: await page.evaluate(() => location.hash),
      steps: ['进入订单监管页', '点击任一订单详情'],
      actual: `时间轴节点数=${timelineCount}`,
      expected: '应展示完整状态进度和结构化详情',
      type: '论文不一致',
      screenshot: detailShot
    });
  }
}

async function testUsers(page, result) {
  await page.getByRole('button', { name: '用户管理' }).click();
  await page.waitForURL(/#\/users/);
  await page.waitForSelector('text=用户管理');
  await waitForTableStable(page);
  const listShot = await takeShot(page, '17_users_list');

  const userRow = page.locator('.el-table__body tr').filter({ hasText: '张三' }).first();
  if (!await userRow.count()) {
    result.issues.push({
      title: '用户管理缺少可启停演示数据',
      severity: '中',
      route: '#/users',
      steps: ['登录管理端', '进入用户管理页'],
      actual: '未找到用户“张三”',
      expected: '应有可执行启停操作的普通用户',
      type: '演示数据问题',
      screenshot: listShot
    });
    return;
  }

  await userRow.getByText('禁用').click();
  await page.waitForTimeout(1000);
  const disableMsg = await getMessageText(page);
  const disabledRow = page.locator('.el-table__body tr').filter({ hasText: '张三' }).first();
  const disabledText = await disabledRow.textContent();
  const disableShot = await takeShot(page, '18_user_disabled');
  if (disableMsg.includes('操作成功') && disabledText.includes('禁用') && disabledRow.locator('text=启用')) {
    result.passes.push({
      title: '用户禁用操作生效',
      route: '#/users',
      notes: `提示文案：${disableMsg}`
    });
  } else {
    result.issues.push({
      title: '用户禁用后状态未刷新',
      severity: '高',
      route: '#/users',
      steps: ['进入用户管理页', '对张三点击禁用'],
      actual: `提示=${disableMsg}；行内容=${disabledText}`,
      expected: '应提示成功，并将用户状态切换为禁用、操作按钮切换为启用',
      type: '功能 bug',
      screenshot: disableShot
    });
  }

  await clearMessages(page);
  await disabledRow.getByText('启用').click();
  await page.waitForTimeout(1000);
  const enableMsg = await getMessageText(page);
  const enabledRow = page.locator('.el-table__body tr').filter({ hasText: '张三' }).first();
  const enabledText = await enabledRow.textContent();
  const enableShot = await takeShot(page, '19_user_enabled');
  if (enableMsg.includes('操作成功') && enabledText.includes('正常') && enabledRow.locator('text=禁用')) {
    result.passes.push({
      title: '用户启用操作生效',
      route: '#/users',
      notes: `提示文案：${enableMsg}`
    });
  } else {
    result.issues.push({
      title: '用户启用后状态未恢复',
      severity: '高',
      route: '#/users',
      steps: ['对已禁用的张三点击启用'],
      actual: `提示=${enableMsg}；行内容=${enabledText}`,
      expected: '应提示成功，并恢复正常状态和禁用按钮',
      type: '功能 bug',
      screenshot: enableShot
    });
  }
}

async function testNotices(page, result) {
  await page.getByRole('button', { name: '公告管理' }).click();
  await page.waitForURL(/#\/notices/);
  await page.waitForSelector('text=公告管理');
  await waitForTableStable(page);
  await takeShot(page, '20_notices_list');

  const firstEdit = page.locator('.el-table__body tr').first().getByText('编辑');
  if (!await firstEdit.count()) {
    result.issues.push({
      title: '公告管理无可编辑数据',
      severity: '中',
      route: '#/notices',
      steps: ['进入公告管理页'],
      actual: '未找到公告编辑按钮',
      expected: '应存在至少一条公告以验证维护流程',
      type: '演示数据问题',
      screenshot: path.join(SHOT_DIR, '20_notices_list.png')
    });
    return;
  }

  await firstEdit.click();
  await page.waitForSelector('.el-dialog__wrapper:has-text("公告编辑")');
  await page.locator('.el-dialog__wrapper input').first().fill('');
  await page.locator('.el-dialog__wrapper textarea').fill('');
  await page.getByRole('button', { name: '保存' }).click();
  await page.waitForTimeout(600);
  const warnMsg = await getMessageText(page);
  const warnShot = await takeShot(page, '21_notice_validation', false);
  if (warnMsg.includes('请完整填写公告标题和内容')) {
    result.passes.push({
      title: '公告表单必填提示合理',
      route: '#/notices',
      notes: `提示文案：${warnMsg}`
    });
  } else {
    result.issues.push({
      title: '公告表单缺少完整性校验提示',
      severity: '中',
      route: '#/notices',
      steps: ['进入公告管理页', '点击编辑', '清空标题和内容后保存'],
      actual: warnMsg || '未出现必填提示',
      expected: '应提示完整填写公告标题和内容',
      type: '功能 bug',
      screenshot: warnShot
    });
  }
  await page.getByRole('button', { name: '取消' }).click();
}

async function testBanners(page, result) {
  await page.getByRole('button', { name: '轮播图管理' }).click();
  await page.waitForURL(/#\/banners/);
  await page.waitForSelector('text=轮播图管理');
  await waitForTableStable(page);
  await takeShot(page, '22_banners_list');

  await page.getByRole('button', { name: '新增轮播图' }).click();
  await page.waitForSelector('.el-dialog__wrapper:has-text("轮播图编辑")');
  await page.getByRole('button', { name: '保存' }).click();
  await page.waitForTimeout(600);
  const warnMsg = await getMessageText(page);
  const warnShot = await takeShot(page, '23_banner_validation', false);
  if (warnMsg.includes('请先上传轮播图')) {
    result.passes.push({
      title: '轮播图表单提示合理',
      route: '#/banners',
      notes: `提示文案：${warnMsg}`
    });
  } else {
    result.issues.push({
      title: '轮播图保存前缺少图片校验提示',
      severity: '中',
      route: '#/banners',
      steps: ['进入轮播图管理页', '点击新增轮播图', '不上传图片直接保存'],
      actual: warnMsg || '未出现图片必填提示',
      expected: '应提示先上传轮播图',
      type: '功能 bug',
      screenshot: warnShot
    });
  }
  await page.getByRole('button', { name: '取消' }).click();
}

async function main() {
  ensureDir(path.dirname(LOG_PATH));
  const result = {
    testedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    issues: [],
    passes: []
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

  page.on('pageerror', async (error) => {
    const shot = await takeShot(page, `pageerror_${Date.now()}`, false).catch(() => '');
    result.issues.push({
      title: '页面运行时报错',
      severity: '高',
      route: await page.evaluate(() => location.hash).catch(() => ''),
      steps: ['访问当前页面并执行交互'],
      actual: error.message,
      expected: '页面不应出现未捕获运行时错误',
      type: '功能 bug',
      screenshot: shot
    });
  });

  page.on('console', async (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon')) {
        const shot = await takeShot(page, `console_error_${Date.now()}`, false).catch(() => '');
        result.issues.push({
          title: '页面控制台报错',
          severity: '中',
          route: await page.evaluate(() => location.hash).catch(() => ''),
          steps: ['访问当前页面并执行交互'],
          actual: text,
          expected: '控制台不应出现明显错误',
          type: '功能 bug',
          screenshot: shot
        });
      }
    }
  });

  try {
    await login(page, result);
    await testDashboard(page, result);
    await testMerchantAudit(page, result);
    await testServiceAudit(page, result);
    await testOrders(page, result);
    await testUsers(page, result);
    await testNotices(page, result);
    await testBanners(page, result);
  } finally {
    fs.writeFileSync(LOG_PATH, JSON.stringify(result, null, 2), 'utf8');
    await browser.close();
  }
}

main().catch((error) => {
  const payload = {
    testedAt: new Date().toISOString(),
    fatal: true,
    error: error.stack || String(error)
  };
  ensureDir(path.dirname(LOG_PATH));
  fs.writeFileSync(LOG_PATH, JSON.stringify(payload, null, 2), 'utf8');
  process.exitCode = 1;
});
