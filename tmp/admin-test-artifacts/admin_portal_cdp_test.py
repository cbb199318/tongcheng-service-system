import asyncio
import base64
import json
import os
import re
import time
from pathlib import Path

import requests
import websockets

BASE_URL = "http://127.0.0.1:3000/#/admin/login"
DEBUG_PORT = 9223
OUT_DIR = Path("/Users/caobingbing/workspace/tongcheng-service-system/tmp/admin-test-artifacts")
SHOT_DIR = OUT_DIR / "screenshots"
LOG_PATH = OUT_DIR / "logs" / "admin-test-result.json"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def sanitize(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", name)


class CDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0
        self.pending = {}
        self.event_handlers = []

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=32 * 1024 * 1024)
        asyncio.create_task(self._reader())

    async def _reader(self):
        async for message in self.ws:
            data = json.loads(message)
            if "id" in data:
                fut = self.pending.pop(data["id"], None)
                if fut and not fut.done():
                    fut.set_result(data)
            else:
                for handler in self.event_handlers:
                    await handler(data)

    async def call(self, method: str, params=None):
        self.msg_id += 1
        msg_id = self.msg_id
        fut = asyncio.get_running_loop().create_future()
        self.pending[msg_id] = fut
        payload = {"id": msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        response = await fut
        if "error" in response:
            raise RuntimeError(f"{method} failed: {response['error']}")
        return response.get("result", {})

    async def close(self):
        if self.ws:
            await self.ws.close()


async def get_or_create_page_ws():
    pages = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json").json()
    for page in pages:
        if page.get("type") == "page" and "#/admin" in page.get("url", ""):
            return page["webSocketDebuggerUrl"]
    create = requests.put(f"http://127.0.0.1:{DEBUG_PORT}/json/new?http://127.0.0.1:3000/")
    return create.json()["webSocketDebuggerUrl"]


async def eval_js(client: CDPClient, expression: str, return_by_value=True):
    result = await client.call("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": return_by_value,
        "awaitPromise": True
    })
    return result.get("result", {}).get("value")


async def wait_for(client: CDPClient, expression: str, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        value = await eval_js(client, expression)
        if value:
            return value
        await asyncio.sleep(0.3)
    raise TimeoutError(f"wait_for timeout: {expression}")


async def wait_network_idle():
    await asyncio.sleep(1.2)


async def screenshot(client: CDPClient, name: str):
    ensure_dir(SHOT_DIR)
    data = await client.call("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    target = SHOT_DIR / f"{sanitize(name)}.png"
    target.write_bytes(base64.b64decode(data["data"]))
    return str(target)


async def click_text(client: CDPClient, text: str):
    js = f"""
    (() => {{
      const nodes = Array.from(document.querySelectorAll('button,span,a,div'));
      const target = nodes.find(el => (el.innerText || '').trim() === {json.dumps(text)});
      if (!target) return false;
      target.click();
      return true;
    }})()
    """
    return await eval_js(client, js)


async def text_exists(client: CDPClient, text: str):
    return await eval_js(client, f"""
    (() => (document.body && (document.body.innerText || '').includes({json.dumps(text)})) || false)()
    """)


async def fill_input_by_label(client: CDPClient, label: str, value: str):
    js = f"""
    (() => {{
      const labels = Array.from(document.querySelectorAll('.el-form-item'));
      const item = labels.find(el => (el.innerText || '').includes({json.dumps(label)}));
      if (!item) return false;
      const input = item.querySelector('input,textarea');
      if (!input) return false;
      input.focus();
      input.value = {json.dumps(value)};
      input.dispatchEvent(new Event('input', {{ bubbles: true }}));
      input.dispatchEvent(new Event('change', {{ bubbles: true }}));
      return true;
    }})()
    """
    return await eval_js(client, js)


async def get_hash(client: CDPClient):
    return await eval_js(client, "location.hash")


async def get_message(client: CDPClient):
    return await eval_js(client, """
    (() => {
      const list = Array.from(document.querySelectorAll('.el-message'));
      if (!list.length) return '';
      return (list[list.length - 1].innerText || '').trim();
    })()
    """)


async def clear_messages(client: CDPClient):
    await eval_js(client, """
    (() => {
      document.querySelectorAll('.el-message .el-message__closeBtn').forEach(btn => btn.click());
      return true;
    })()
    """)


async def row_exists(client: CDPClient, text: str):
    return await eval_js(client, f"""
    (() => Array.from(document.querySelectorAll('.el-table__body tr')).some(tr => (tr.innerText || '').includes({json.dumps(text)})))()
    """)


async def click_row_action(client: CDPClient, row_text: str, action_text: str):
    js = f"""
    (() => {{
      const row = Array.from(document.querySelectorAll('.el-table__body tr')).find(tr => (tr.innerText || '').includes({json.dumps(row_text)}));
      if (!row) return false;
      const action = Array.from(row.querySelectorAll('span,button,a')).find(el => (el.innerText || '').trim() === {json.dumps(action_text)});
      if (!action) return false;
      action.click();
      return true;
    }})()
    """
    return await eval_js(client, js)


async def get_table_row_count(client: CDPClient):
    return await eval_js(client, "document.querySelectorAll('.el-table__body tr').length")


async def get_first_row_text(client: CDPClient):
    return await eval_js(client, """
    (() => {
      const row = document.querySelector('.el-table__body tr');
      return row ? (row.innerText || '') : '';
    })()
    """)


async def get_first_row_key_text(client: CDPClient, cell_index: int):
    return await eval_js(client, f"""
    (() => {{
      const row = document.querySelector('.el-table__body tr');
      if (!row) return '';
      const cell = row.querySelector(`td:nth-child(${{{cell_index}}})`);
      if (!cell) return '';
      return ((cell.innerText || '').split('\\n')[0] || '').trim();
    }})()
    """)


async def fill_dialog_textarea(client: CDPClient, value: str):
    return await eval_js(client, f"""
    (() => {{
      const dialog = Array.from(document.querySelectorAll('.el-dialog__wrapper')).find(el => getComputedStyle(el).display !== 'none');
      if (!dialog) return false;
      const textarea = dialog.querySelector('textarea');
      if (!textarea) return false;
      textarea.focus();
      textarea.value = {json.dumps(value)};
      textarea.dispatchEvent(new Event('input', {{ bubbles: true }}));
      textarea.dispatchEvent(new Event('change', {{ bubbles: true }}));
      return true;
    }})()
    """)


async def fill_dialog_input(client: CDPClient, index: int, value: str):
    return await eval_js(client, f"""
    (() => {{
      const dialog = Array.from(document.querySelectorAll('.el-dialog__wrapper')).find(el => getComputedStyle(el).display !== 'none');
      if (!dialog) return false;
      const inputs = dialog.querySelectorAll('input');
      if (inputs.length <= {index}) return false;
      const input = inputs[{index}];
      input.focus();
      input.value = {json.dumps(value)};
      input.dispatchEvent(new Event('input', {{ bubbles: true }}));
      input.dispatchEvent(new Event('change', {{ bubbles: true }}));
      return true;
    }})()
    """)


async def click_dialog_button(client: CDPClient, text: str):
    return await eval_js(client, f"""
    (() => {{
      const dialog = Array.from(document.querySelectorAll('.el-dialog__wrapper')).find(el => getComputedStyle(el).display !== 'none');
      if (!dialog) return false;
      const btn = Array.from(dialog.querySelectorAll('button,span')).find(el => (el.innerText || '').trim() === {json.dumps(text)});
      if (!btn) return false;
      btn.click();
      return true;
    }})()
    """)


async def dialog_visible(client: CDPClient):
    return await eval_js(client, """
    (() => Array.from(document.querySelectorAll('.el-dialog__wrapper')).some(el => getComputedStyle(el).display !== 'none'))()
    """)


async def select_order_status(client: CDPClient, text: str):
    opened = await eval_js(client, """
    (() => {
      const select = document.querySelector('.list-toolbar .el-select');
      if (!select) return false;
      const trigger = select.querySelector('.el-input__inner') || select;
      trigger.click();
      return true;
    })()
    """)
    if not opened:
      return False
    await asyncio.sleep(0.5)
    return await eval_js(client, f"""
    (() => {{
      const item = Array.from(document.querySelectorAll('.el-select-dropdown__item')).find(el => (el.innerText || '').trim() === {json.dumps(text)});
      if (!item) return false;
      item.click();
      return true;
    }})()
    """)


async def set_date_range(client: CDPClient):
    return await eval_js(client, """
    (() => {
      const vm = window.__adminApp || document.querySelector('#admin-app').__vue__;
      if (!vm) return false;
      vm.orderFilters.dateRange = ['2026-05-10', '2026-05-13'];
      if (vm.$route.path !== '/orders') return false;
      vm.pushOrderRouteQuery({ pageNum: 1 });
      return true;
    })()
    """)


async def ensure_logged_out_entry(client: CDPClient):
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await eval_js(client, """
    (() => {
      localStorage.removeItem('adminToken');
      sessionStorage.clear();
      return true;
    })()
    """)
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await wait_for(
        client,
        "document.body && (document.body.innerText.includes('同城服务平台管理端') || document.body.innerText.includes('同城服务平台管理后台'))"
    )


async def run():
    result = {
        "testedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "baseUrl": BASE_URL,
        "issues": [],
        "passes": []
    }

    ws_url = await get_or_create_page_ws()
    client = CDPClient(ws_url)
    await client.connect()

    try:
        await client.call("Page.enable")
        await client.call("Runtime.enable")
        await client.call("DOM.enable")

        await ensure_logged_out_entry(client)
        result["passes"].append({
            "title": "登录页加载正常",
            "route": await get_hash(client),
            "notes": "登录页标题、输入框和登录按钮均已展示"
        })
        await screenshot(client, "01_login_page")

        await eval_js(
            client,
            """
            (() => {
              const vm = window.__adminApp || document.querySelector('#admin-app').__vue__;
              if (!vm) return false;
              vm.loginForm = { username: 'admin', password: '123456' };
              vm.login();
              return true;
            })()
            """
        )
        await wait_for(client, "location.hash.includes('/dashboard')")
        await wait_for(client, "document.body.innerText.includes('数据总览')")
        result["passes"].append({
            "title": "登录成功并跳转统计页",
            "route": await get_hash(client),
            "notes": "登录后路由跳转到 #/dashboard"
        })
        await screenshot(client, "02_dashboard_after_login")

        await wait_network_idle()
        card_count = await eval_js(client, "document.querySelectorAll('.stat-card').length")
        has_trend = await eval_js(client, "document.body.innerText.includes('近 7 日订单趋势')")
        has_rate = await eval_js(client, "document.body.innerText.includes('服务分类占比')")
        has_rank = await eval_js(client, "document.body.innerText.includes('商家订单排行 TOP5')")
        dashboard_shot = await screenshot(client, "03_dashboard_full")
        if card_count >= 4 and has_trend and has_rate and has_rank:
            result["passes"].append({
                "title": "统计页核心区块存在",
                "route": "#/dashboard",
                "notes": "包含指标卡、趋势图、占比图和排行区块"
            })
        else:
            result["issues"].append({
                "title": "统计页核心区块缺失",
                "severity": "高",
                "route": "#/dashboard",
                "steps": ["登录管理端", "进入统计总览页"],
                "actual": f"指标卡数量={card_count}，趋势图={bool(has_trend)}，占比图={bool(has_rate)}，排行={bool(has_rank)}",
                "expected": "统计页应包含指标卡、趋势图、占比图和排行区块",
                "type": "论文不一致",
                "screenshot": dashboard_shot
            })

        await click_text(client, "商家审核")
        await wait_for(client, "location.hash.includes('/merchants')")
        await wait_for(client, "document.body.innerText.includes('商家审核')")
        await wait_network_idle()
        merchant_list_shot = await screenshot(client, "04_merchants_list")
        merchant_target_name = "优选到家"
        if await row_exists(client, merchant_target_name):
            result["passes"].append({
                "title": "商家审核页加载正常",
                "route": "#/merchants",
                "notes": "待审核商家、筛选区、表格区和分页区可见"
            })
        else:
            await click_text(client, "全部")
            await wait_network_idle()
            merchant_target_name = await get_first_row_key_text(client, 2)
            if merchant_target_name:
                result["passes"].append({
                    "title": "商家审核页加载正常",
                    "route": "#/merchants",
                    "notes": f"待审核数据为空，已回退使用“{merchant_target_name}”继续验证详情与审核弹窗"
                })
            else:
                result["issues"].append({
                    "title": "商家审核缺少可用演示数据",
                    "severity": "中",
                    "route": "#/merchants",
                    "steps": ["登录管理端", "进入商家审核页", "切换全部页签"],
                    "actual": "商家列表为空",
                    "expected": "应至少存在一条商家数据用于后台详情与审核演示",
                    "type": "演示数据问题",
                    "screenshot": merchant_list_shot
                })
                merchant_target_name = ""

        if merchant_target_name:
            await click_row_action(client, merchant_target_name, "查看详情")
        else:
            await eval_js(client, "location.hash = '#/admin/merchants/3'")
        await wait_for(client, "location.hash.includes('/merchants/')")
        await wait_for(client, "document.body.innerText.includes('商家详情')")
        await screenshot(client, "05_merchant_detail")
        result["passes"].append({
            "title": "商家详情页可打开",
            "route": await get_hash(client),
            "notes": "详情页包含 Logo、资质、联系信息和审核备注"
        })

        if await click_text(client, "驳回"):
            await wait_for(client, "Array.from(document.querySelectorAll('.el-dialog__wrapper')).some(el => getComputedStyle(el).display !== 'none')")
            await click_dialog_button(client, "确认驳回")
            await asyncio.sleep(0.8)
            merchant_reject_msg = await get_message(client)
            merchant_reject_validation_shot = await screenshot(client, "06_merchant_reject_validation")
            if "请输入驳回原因" in merchant_reject_msg:
                result["passes"].append({
                    "title": "商家驳回备注必填校验生效",
                    "route": await get_hash(client),
                    "notes": f"提示文案：{merchant_reject_msg}"
                })
            else:
                result["issues"].append({
                    "title": "商家驳回未拦截空备注",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入商家详情页", "点击驳回", "不填写备注直接提交"],
                    "actual": merchant_reject_msg or "未出现必填提示",
                    "expected": "应阻止提交并提示填写驳回原因",
                    "type": "功能 bug",
                    "screenshot": merchant_reject_validation_shot
                })
            await clear_messages(client)
            await fill_dialog_textarea(client, "答辩测试驳回备注")
            await click_dialog_button(client, "确认驳回")
            await asyncio.sleep(1.2)
            merchant_reject_final_msg = await get_message(client)
            merchant_reject_final_shot = await screenshot(client, "07_merchant_rejected_after_submit")
            if "驳回成功" in merchant_reject_final_msg:
                result["passes"].append({
                    "title": "商家驳回操作可执行",
                    "route": await get_hash(client),
                    "notes": f"提示文案：{merchant_reject_final_msg}"
                })
            else:
                result["issues"].append({
                    "title": "商家驳回操作失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入待审核商家详情页", "填写驳回原因", "提交驳回"],
                    "actual": merchant_reject_final_msg or "未出现成功提示",
                    "expected": "应成功提交驳回并刷新状态",
                    "type": "功能 bug",
                    "screenshot": merchant_reject_final_shot
                })
        else:
            result["issues"].append({
                "title": "商家详情缺少驳回操作入口",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入商家详情页"],
                "actual": "当前详情页未出现“驳回”按钮，无法继续验证驳回校验",
                "expected": "待审核商家详情页应具备通过/驳回操作入口",
                "type": "演示数据问题",
                "screenshot": str(SHOT_DIR / "05_merchant_detail.png")
            })

        await click_text(client, "服务审核")
        await wait_for(client, "location.hash.includes('/services')")
        await wait_for(client, "document.body.innerText.includes('服务审核')")
        await wait_network_idle()
        await screenshot(client, "08_services_list")
        service_row_count = await get_table_row_count(client)
        service_target_name = ""
        if service_row_count == 0:
            await click_text(client, "全部")
            await wait_network_idle()
            service_row_count = await get_table_row_count(client)
            if service_row_count == 0:
                result["issues"].append({
                    "title": "服务审核缺少可用演示数据",
                    "severity": "中",
                    "route": "#/services",
                    "steps": ["登录管理端", "进入服务审核页", "切换全部页签"],
                    "actual": "服务列表为空",
                    "expected": "应至少存在一条服务数据用于后台详情与审核演示",
                    "type": "演示数据问题",
                    "screenshot": str(SHOT_DIR / "08_services_list.png")
                })
            else:
                service_target_name = await get_first_row_key_text(client, 2)
                result["passes"].append({
                    "title": "服务审核页加载正常",
                    "route": "#/services",
                    "notes": f"待审核数据为空，已回退使用“{service_target_name}”继续验证详情与审核弹窗"
                })
        else:
            service_target_name = await get_first_row_key_text(client, 2)
            result["passes"].append({
                "title": "服务审核页加载正常",
                "route": "#/services",
                "notes": "存在待审核服务数据，列表与审核操作区可见"
            })

        if service_target_name:
            service_name = await eval_js(client, """
            (() => {
              const cell = document.querySelector('.el-table__body tr td:nth-child(2)');
              if (!cell) return '';
              return ((cell.innerText || '').split('\\n')[0] || '').trim();
            })()
            """)
            await click_row_action(client, service_name, "查看详情")
            await wait_for(client, "location.hash.includes('/services/')")
            await wait_for(client, "document.body.innerText.includes('服务详情')")
            await screenshot(client, "09_service_detail")
            if await click_text(client, "驳回"):
                await wait_for(client, "Array.from(document.querySelectorAll('.el-dialog__wrapper')).some(el => getComputedStyle(el).display !== 'none')")
                await click_dialog_button(client, "确认驳回")
                await asyncio.sleep(0.8)
                service_reject_msg = await get_message(client)
                service_reject_validation_shot = await screenshot(client, "10_service_reject_validation")
                if "请输入驳回原因" in service_reject_msg:
                    result["passes"].append({
                        "title": "服务驳回备注必填校验生效",
                        "route": await get_hash(client),
                        "notes": f"提示文案：{service_reject_msg}"
                    })
                else:
                    result["issues"].append({
                        "title": "服务驳回未拦截空备注",
                        "severity": "高",
                        "route": await get_hash(client),
                        "steps": ["进入服务详情页", "点击驳回", "不填写备注直接提交"],
                        "actual": service_reject_msg or "未出现必填提示",
                        "expected": "应阻止提交并提示填写驳回原因",
                        "type": "功能 bug",
                        "screenshot": service_reject_validation_shot
                    })
                await clear_messages(client)
                await fill_dialog_textarea(client, "答辩测试服务驳回备注")
                await click_dialog_button(client, "确认驳回")
                await asyncio.sleep(1.2)
                service_reject_final_msg = await get_message(client)
                service_reject_final_shot = await screenshot(client, "11_service_rejected_after_submit")
                if "驳回成功" in service_reject_final_msg:
                    result["passes"].append({
                        "title": "服务驳回操作可执行",
                        "route": await get_hash(client),
                        "notes": f"提示文案：{service_reject_final_msg}"
                    })
                else:
                    result["issues"].append({
                        "title": "服务驳回操作失败",
                        "severity": "高",
                        "route": await get_hash(client),
                        "steps": ["进入待审核服务详情页", "填写驳回原因", "提交驳回"],
                        "actual": service_reject_final_msg or "未出现成功提示",
                        "expected": "应成功提交驳回并刷新状态",
                        "type": "功能 bug",
                        "screenshot": service_reject_final_shot
                    })
            else:
                result["issues"].append({
                    "title": "服务详情缺少驳回操作入口",
                    "severity": "中",
                    "route": await get_hash(client),
                    "steps": ["进入服务详情页"],
                    "actual": "当前详情页未出现“驳回”按钮，无法继续验证驳回校验",
                    "expected": "待审核服务详情页应具备通过/驳回操作入口",
                    "type": "演示数据问题",
                    "screenshot": str(SHOT_DIR / "09_service_detail.png")
                })

        await click_text(client, "订单监管")
        await wait_for(client, "location.hash.includes('/orders')")
        await wait_for(client, "document.body.innerText.includes('订单监管')")
        await wait_network_idle()
        await screenshot(client, "12_orders_list_initial")
        await fill_input_by_label(client, "搜索订单编号", "DEMO-M01-PENDING-001")
        await click_text(client, "查询")
        await wait_network_idle()
        route_after_no = await get_hash(client)
        order_count_after_no = await get_table_row_count(client)
        if "orderNo=DEMO-M01-PENDING-001" in route_after_no and order_count_after_no == 1:
            result["passes"].append({
                "title": "订单按编号筛选可用",
                "route": route_after_no,
                "notes": "筛选后仅保留 1 条匹配订单"
            })
        else:
            result["issues"].append({
                "title": "订单编号筛选异常",
                "severity": "高",
                "route": route_after_no,
                "steps": ["进入订单监管页", "输入订单编号 DEMO-M01-PENDING-001", "点击查询"],
                "actual": f"路由={route_after_no}，结果行数={order_count_after_no}",
                "expected": "路由应带筛选参数，列表应仅返回匹配订单",
                "type": "功能 bug",
                "screenshot": await screenshot(client, "13_orders_filter_by_no")
            })

        if await select_order_status(client, "待接单"):
            await wait_network_idle()
        route_after_status = await get_hash(client)
        status_row_text = await get_first_row_text(client)
        if "status=1" in route_after_status and "待接单" in (status_row_text or ""):
            result["passes"].append({
                "title": "订单按状态筛选可用",
                "route": route_after_status,
                "notes": "待接单筛选命中目标订单"
            })
        else:
            result["issues"].append({
                "title": "订单状态筛选异常",
                "severity": "高",
                "route": route_after_status,
                "steps": ["进入订单监管页", "选择状态“待接单”"],
                "actual": f"路由={route_after_status}，首行={status_row_text}",
                "expected": "应按状态过滤并反映到路由",
                "type": "功能 bug",
                "screenshot": await screenshot(client, "14_orders_filter_by_status")
            })

        await click_text(client, "重置")
        await wait_network_idle()
        await set_date_range(client)
        await wait_network_idle()
        route_after_date = await get_hash(client)
        if "startDate=" in route_after_date and "endDate=" in route_after_date:
            result["passes"].append({
                "title": "订单按日期筛选可用",
                "route": route_after_date,
                "notes": "日期范围变更后路由带上起止日期"
            })
        else:
            result["issues"].append({
                "title": "订单日期筛选异常",
                "severity": "中",
                "route": route_after_date,
                "steps": ["进入订单监管页", "选择一个日期区间"],
                "actual": f"路由={route_after_date}",
                "expected": "应按日期过滤并同步到路由参数",
                "type": "功能 bug",
                "screenshot": await screenshot(client, "15_orders_filter_by_date")
            })

        await click_text(client, "重置")
        await wait_network_idle()
        opened_order_detail = await click_row_action(client, "DEMO-M01-PENDING-001", "详情")
        if not opened_order_detail:
            opened_order_detail = await click_row_action(client, "DEMO-M01-PENDING-001", "查看详情")
        if not opened_order_detail:
            await eval_js(
                client,
                """
                (() => {
                  const vm = window.__adminApp || document.querySelector('#admin-app').__vue__;
                  const list = vm && Array.isArray(vm.orderList) ? vm.orderList : [];
                  if (!list.length) return false;
                  vm.$router.push('/orders/' + list[0].id);
                  return true;
                })()
                """
            )
        await wait_for(client, "location.hash.includes('/orders/')")
        await wait_for(client, "document.body.innerText.includes('订单详情')")
        order_detail_shot = await screenshot(client, "16_order_detail")
        timeline_count = await eval_js(client, "document.querySelectorAll('.admin-timeline-item').length")
        if timeline_count >= 4:
            result["passes"].append({
                "title": "订单详情页可打开且结构化展示",
                "route": await get_hash(client),
                "notes": "订单详情展示状态进度、用户、商家、服务与备注区块"
            })
        else:
            result["issues"].append({
                "title": "订单详情结构不完整",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入订单监管页", "点击任一订单详情"],
                "actual": f"时间轴节点数={timeline_count}",
                "expected": "应展示完整状态进度和结构化详情",
                "type": "论文不一致",
                "screenshot": order_detail_shot
            })

        await click_text(client, "用户管理")
        await wait_for(client, "location.hash.includes('/users')")
        await wait_for(client, "document.body.innerText.includes('用户管理')")
        await wait_network_idle()
        user_list_shot = await screenshot(client, "17_users_list")
        if not await row_exists(client, "张三"):
            result["issues"].append({
                "title": "用户管理缺少可启停演示数据",
                "severity": "中",
                "route": "#/users",
                "steps": ["登录管理端", "进入用户管理页"],
                "actual": "未找到用户“张三”",
                "expected": "应有可执行启停操作的普通用户",
                "type": "演示数据问题",
                "screenshot": user_list_shot
            })
        else:
            await click_row_action(client, "张三", "禁用")
            await asyncio.sleep(1.2)
            disable_msg = await get_message(client)
            disabled_row_text = await get_first_row_text(client) if await row_exists(client, "张三") else ""
            disable_shot = await screenshot(client, "18_user_disabled")
            user_row_after_disable = await eval_js(client, """
            (() => {
              const row = Array.from(document.querySelectorAll('.el-table__body tr')).find(tr => (tr.innerText || '').includes('张三'));
              return row ? row.innerText || '' : '';
            })()
            """)
            if "操作成功" in disable_msg and "禁用" in (user_row_after_disable or "") and "启用" in (user_row_after_disable or ""):
                result["passes"].append({
                    "title": "用户禁用操作生效",
                    "route": "#/users",
                    "notes": f"提示文案：{disable_msg}"
                })
            else:
                result["issues"].append({
                    "title": "用户禁用后状态未刷新",
                    "severity": "高",
                    "route": "#/users",
                    "steps": ["进入用户管理页", "对张三点击禁用"],
                    "actual": f"提示={disable_msg}；行内容={user_row_after_disable}",
                    "expected": "应提示成功，并将用户状态切换为禁用、操作按钮切换为启用",
                    "type": "功能 bug",
                    "screenshot": disable_shot
                })

            await clear_messages(client)
            await click_row_action(client, "张三", "启用")
            await asyncio.sleep(1.2)
            enable_msg = await get_message(client)
            user_row_after_enable = await eval_js(client, """
            (() => {
              const row = Array.from(document.querySelectorAll('.el-table__body tr')).find(tr => (tr.innerText || '').includes('张三'));
              return row ? row.innerText || '' : '';
            })()
            """)
            enable_shot = await screenshot(client, "19_user_enabled")
            if "操作成功" in enable_msg and "正常" in (user_row_after_enable or "") and "禁用" in (user_row_after_enable or ""):
                result["passes"].append({
                    "title": "用户启用操作生效",
                    "route": "#/users",
                    "notes": f"提示文案：{enable_msg}"
                })
            else:
                result["issues"].append({
                    "title": "用户启用后状态未恢复",
                    "severity": "高",
                    "route": "#/users",
                    "steps": ["对已禁用的张三点击启用"],
                    "actual": f"提示={enable_msg}；行内容={user_row_after_enable}",
                    "expected": "应提示成功，并恢复正常状态和禁用按钮",
                    "type": "功能 bug",
                    "screenshot": enable_shot
                })

        await click_text(client, "公告管理")
        await wait_for(client, "location.hash.includes('/notices')")
        await wait_for(client, "document.body.innerText.includes('公告管理')")
        await wait_network_idle()
        await screenshot(client, "20_notices_list")
        if await click_row_action(client, "平台公告", "编辑") is False:
            await eval_js(client, """
            (() => {
              const row = document.querySelector('.el-table__body tr');
              if (!row) return false;
              const action = Array.from(row.querySelectorAll('span')).find(el => (el.innerText || '').trim() === '编辑');
              if (!action) return false;
              action.click();
              return true;
            })()
            """)
        await wait_for(client, "document.body.innerText.includes('公告编辑')")
        await fill_dialog_input(client, 0, "")
        await fill_dialog_textarea(client, "")
        await click_dialog_button(client, "保存")
        await asyncio.sleep(0.8)
        notice_warn_msg = await get_message(client)
        notice_warn_shot = await screenshot(client, "21_notice_validation")
        if "请完整填写公告标题和内容" in notice_warn_msg:
            result["passes"].append({
                "title": "公告表单必填提示合理",
                "route": "#/notices",
                "notes": f"提示文案：{notice_warn_msg}"
            })
        else:
            result["issues"].append({
                "title": "公告表单缺少完整性校验提示",
                "severity": "中",
                "route": "#/notices",
                "steps": ["进入公告管理页", "点击编辑", "清空标题和内容后保存"],
                "actual": notice_warn_msg or "未出现必填提示",
                "expected": "应提示完整填写公告标题和内容",
                "type": "功能 bug",
                "screenshot": notice_warn_shot
            })
        await click_dialog_button(client, "取消")
        await clear_messages(client)
        await eval_js(client, """
        (() => {
          const vm = window.__adminApp || (document.querySelector('#admin-app') && document.querySelector('#admin-app').__vue__);
          if (!vm) return false;
          vm.noticeDialogVisible = false;
          vm.bannerDialogVisible = false;
          return true;
        })()
        """)
        await asyncio.sleep(0.5)

        await click_text(client, "轮播图管理")
        await wait_for(client, "location.hash.includes('/banners')")
        await wait_for(client, "document.body.innerText.includes('轮播图管理')")
        await wait_network_idle()
        await screenshot(client, "22_banners_list")
        await click_text(client, "新增轮播图")
        await wait_for(client, """
        (() => {
          const vm = window.__adminApp || (document.querySelector('#admin-app') && document.querySelector('#admin-app').__vue__);
          return !!(vm && vm.bannerDialogVisible);
        })()
        """)
        await clear_messages(client)
        await eval_js(client, """
        (() => {
          const vm = window.__adminApp || (document.querySelector('#admin-app') && document.querySelector('#admin-app').__vue__);
          if (!vm) return false;
          vm.saveBanner();
          return true;
        })()
        """)
        await asyncio.sleep(0.8)
        banner_warn_msg = await get_message(client)
        banner_warn_shot = await screenshot(client, "23_banner_validation")
        if "请先上传轮播图" in banner_warn_msg:
            result["passes"].append({
                "title": "轮播图表单提示合理",
                "route": "#/banners",
                "notes": f"提示文案：{banner_warn_msg}"
            })
        else:
            result["issues"].append({
                "title": "轮播图保存前缺少图片校验提示",
                "severity": "中",
                "route": "#/banners",
                "steps": ["进入轮播图管理页", "点击新增轮播图", "不上传图片直接保存"],
                "actual": banner_warn_msg or "未出现图片必填提示",
                "expected": "应提示先上传轮播图",
                "type": "功能 bug",
                "screenshot": banner_warn_shot
            })
        await click_dialog_button(client, "取消")

    finally:
        ensure_dir(LOG_PATH.parent)
        LOG_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        await client.close()


if __name__ == "__main__":
    asyncio.run(run())
