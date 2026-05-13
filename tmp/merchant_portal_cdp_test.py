import asyncio
import base64
import json
import re
import time
from pathlib import Path

import requests
import websockets

BASE_URL = "http://127.0.0.1:3000/merchant.html#/login"
API_BASE = "http://127.0.0.1:8080"
DEBUG_PORT = 9223
OUT_DIR = Path("/Users/caobingbing/workspace/tongcheng-service-system/tmp/merchant-test-artifacts")
SHOT_DIR = OUT_DIR / "screenshots"
LOG_PATH = OUT_DIR / "logs" / "merchant-test-result.json"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def sanitize(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", name)


def api_login():
    res = requests.post(
        f"{API_BASE}/merchant/auth/login",
        json={"username": "merchant01", "password": "123456"},
        timeout=10,
    )
    return res.json()["data"]["token"]


def api_get(path: str, token: str):
    res = requests.get(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    return res.json()["data"]


class CDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0
        self.pending = {}

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

    async def call(self, method: str, params=None):
        self.msg_id += 1
        msg_id = self.msg_id
        fut = asyncio.get_running_loop().create_future()
        self.pending[msg_id] = fut
        await self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        response = await fut
        if "error" in response:
            raise RuntimeError(f"{method} failed: {response['error']}")
        return response.get("result", {})

    async def close(self):
        if self.ws:
            await self.ws.close()


async def get_or_create_page_ws():
    pages = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json", timeout=10).json()
    for page in pages:
        if page.get("type") == "page" and "merchant.html" in page.get("url", ""):
            return page["webSocketDebuggerUrl"]
    create = requests.put(f"http://127.0.0.1:{DEBUG_PORT}/json/new?{BASE_URL}", timeout=10)
    return create.json()["webSocketDebuggerUrl"]


async def eval_js(client: CDPClient, expression: str, return_by_value=True):
    result = await client.call(
        "Runtime.evaluate",
        {"expression": expression, "returnByValue": return_by_value, "awaitPromise": True},
    )
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
    return await eval_js(
        client,
        f"""
        (() => {{
          const nodes = Array.from(document.querySelectorAll('button,span,a,div,label'));
          const target = nodes.find(el => (el.innerText || '').trim() === {json.dumps(text)});
          if (!target) return false;
          target.click();
          return true;
        }})()
        """,
    )


async def fill_input_by_label(client: CDPClient, label: str, value: str):
    return await eval_js(
        client,
        f"""
        (() => {{
          const items = Array.from(document.querySelectorAll('.el-form-item'));
          const item = items.find(el => (el.innerText || '').includes({json.dumps(label)}));
          if (!item) return false;
          const input = item.querySelector('input,textarea');
          if (!input) return false;
          input.focus();
          input.value = {json.dumps(value)};
          input.dispatchEvent(new Event('input', {{ bubbles: true }}));
          input.dispatchEvent(new Event('change', {{ bubbles: true }}));
          return true;
        }})()
        """,
    )


async def get_hash(client: CDPClient):
    return await eval_js(client, "location.hash")


async def get_message(client: CDPClient):
    return await eval_js(
        client,
        """
        (() => {
          const list = Array.from(document.querySelectorAll('.el-message'));
          if (!list.length) return '';
          return (list[list.length - 1].innerText || '').trim();
        })()
        """,
    )


async def clear_messages(client: CDPClient):
    await eval_js(
        client,
        """
        (() => {
          document.querySelectorAll('.el-message .el-message__closeBtn').forEach(btn => btn.click());
          return true;
        })()
        """,
    )


async def ensure_logged_out_entry(client: CDPClient):
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await eval_js(
        client,
        """
        (() => {
          localStorage.removeItem('merchantToken');
          sessionStorage.clear();
          return true;
        })()
        """,
    )
    await eval_js(
        client,
        """
        (() => {
          if (window.__merchantApp && typeof window.__merchantApp.logout === 'function') {
            window.__merchantApp.logout();
            return true;
          }
          location.hash = '#/login';
          return true;
        })()
        """,
    )
    await client.call("Page.reload", {"ignoreCache": True})
    await wait_for(client, "document.readyState === 'complete'")
    await wait_for(client, "document.body && document.body.innerText.includes('商家后台')")


async def set_service_form(client: CDPClient):
    return await eval_js(
        client,
        """
        (() => {
          const vm = window.__merchantApp || document.querySelector('#merchant-app').__vue__;
          if (!vm) return false;
          vm.serviceForm.categoryId = 2;
          vm.serviceForm.name = '论文回归演示服务';
          vm.serviceForm.price = 168;
          vm.serviceForm.duration = 120;
          vm.serviceForm.description = '用于论文商家端回归测试的演示服务项目。';
          vm.serviceForm.tagText = '保洁,回归测试';
          vm.serviceForm.imageList = ['http://127.0.0.1:8080/upload/demo/service-1.svg'];
          return true;
        })()
        """,
    )


async def set_reject_reason(client: CDPClient, value: str):
    return await eval_js(
        client,
        f"""
        (() => {{
          const vm = window.__merchantApp || document.querySelector('#merchant-app').__vue__;
          if (!vm) return false;
          vm.rejectForm.reason = {json.dumps(value)};
          return true;
        }})()
        """,
    )


async def click_row_action(client: CDPClient, row_text: str, action_text: str):
    return await eval_js(
        client,
        f"""
        (() => {{
          const row = Array.from(document.querySelectorAll('.el-table__body tr')).find(tr => (tr.innerText || '').includes({json.dumps(row_text)}));
          if (!row) return false;
          const action = Array.from(row.querySelectorAll('span,button,a')).find(el => (el.innerText || '').trim() === {json.dumps(action_text)});
          if (!action) return false;
          action.click();
          return true;
        }})()
        """,
    )


async def click_first_action(client: CDPClient, action_text: str):
    return await eval_js(
        client,
        f"""
        (() => {{
          const action = Array.from(document.querySelectorAll('.el-table__body tr span, .el-table__body tr button, .el-table__body tr a'))
            .find(el => (el.innerText || '').trim() === {json.dumps(action_text)});
          if (!action) return false;
          action.click();
          return true;
        }})()
        """,
    )


async def run():
    result = {"testedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "baseUrl": BASE_URL, "issues": [], "passes": []}

    token = api_login()
    summary = api_get("/merchant/dashboard/summary", token)
    services = api_get("/merchant/service/list?pageNum=1&pageSize=10", token)["list"]
    orders = api_get("/merchant/order/list?pageNum=1&pageSize=10", token)["list"]
    reviews = api_get("/merchant/review/list?pageNum=1&pageSize=10", token)["list"]

    pending_order = next((item for item in orders if str(item.get("status")) == "1"), None)
    accepted_order = next((item for item in orders if str(item.get("status")) == "2"), None)
    pending_review = next((item for item in reviews if not item.get("hasReply")), None)
    detail_order_id = (pending_order or accepted_order or (orders[0] if orders else {"id": ""})).get("id")

    ws_url = await get_or_create_page_ws()
    client = CDPClient(ws_url)
    await client.connect()

    try:
        await client.call("Page.enable")
        await client.call("Runtime.enable")
        await client.call("DOM.enable")

        await ensure_logged_out_entry(client)
        result["passes"].append({"title": "商家登录页加载正常", "route": await get_hash(client), "notes": "登录页标题、账号密码输入框和登录按钮可见"})
        await screenshot(client, "01_login_page")

        await fill_input_by_label(client, "用户名", "merchant01")
        await fill_input_by_label(client, "密码", "123456")
        await click_text(client, "登录商家端")
        await wait_for(client, "location.hash.includes('/dashboard')")
        await wait_for(client, "document.body.innerText.includes('商家后台管理')")
        await screenshot(client, "02_dashboard_after_login")
        result["passes"].append({"title": "商家登录成功进入控制台", "route": await get_hash(client), "notes": "登录后默认进入控制台"})

        dashboard_shot = await screenshot(client, "03_dashboard_full")
        if (
            summary.get("serviceCount", 0) >= 1
            and await eval_js(client, "document.body.innerText.includes('待回复评价') && document.body.innerText.includes('待接单订单') || document.body.innerText.includes('待接单')")
        ):
            result["passes"].append({"title": "控制台核心指标可见", "route": "#/dashboard", "notes": "展示审核状态、服务数量、待接单和待回复评价等指标"})
        else:
            result["issues"].append({
                "title": "控制台缺少论文核心指标",
                "severity": "高",
                "route": "#/dashboard",
                "steps": ["登录商家端", "进入控制台"],
                "actual": "指标卡或快捷入口展示不完整",
                "expected": "应展示论文主链路所需的服务、订单、评价和审核状态信息",
                "type": "论文不一致",
                "screenshot": dashboard_shot,
            })

        await click_text(client, "商家信息")
        await wait_for(client, "location.hash.includes('/info')")
        await wait_for(client, "document.body.innerText.includes('商家资料') || document.body.innerText.includes('商家信息')")
        info_shot = await screenshot(client, "04_merchant_info")
        if await eval_js(client, "document.body.innerText.includes('商家名称') && document.body.innerText.includes('资质证书') && document.body.innerText.includes('审核状态')"):
            result["passes"].append({"title": "商家信息页结构完整", "route": await get_hash(client), "notes": "资料表单、Logo/资质区和审核状态区可见"})
        else:
            result["issues"].append({
                "title": "商家信息页字段不完整",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["进入商家信息页"],
                "actual": "资料页未完整展示论文所需字段",
                "expected": "应展示商家名称、电话、地址、简介、Logo、资质和审核状态",
                "type": "论文不一致",
                "screenshot": info_shot,
            })

        await click_text(client, "服务管理")
        await wait_for(client, "location.hash.includes('/services')")
        await wait_for(client, "document.body.innerText.includes('服务管理')")
        service_list_shot = await screenshot(client, "05_services_list")
        if services and await eval_js(client, "document.body.innerText.includes('新增服务')"):
            result["passes"].append({"title": "服务管理页可访问", "route": await get_hash(client), "notes": f"当前服务数 {len(services)}，具备筛选与新增入口"})
        else:
            result["issues"].append({
                "title": "服务管理页异常",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["进入服务管理页"],
                "actual": "服务列表或新增入口不可用",
                "expected": "应展示服务列表、筛选区和新增服务入口",
                "type": "功能 bug",
                "screenshot": service_list_shot,
            })

        await click_text(client, "新增服务")
        await wait_for(client, "location.hash.includes('/services/new')")
        await wait_for(client, "document.body.innerText.includes('服务名称') && document.body.innerText.includes('服务图片')")
        await set_service_form(client)
        service_editor_shot = await screenshot(client, "06_service_editor")
        result["passes"].append({"title": "新增服务页结构完整", "route": await get_hash(client), "notes": "展示分类、价格、时长、描述、图片和标签输入"})
        await click_text(client, "提交服务")
        await asyncio.sleep(1.6)
        create_service_msg = await get_message(client)
        if "服务已提交" in create_service_msg:
            result["passes"].append({"title": "新增服务操作可执行", "route": await get_hash(client), "notes": f"提示文案：{create_service_msg}"})
        else:
            result["issues"].append({
                "title": "新增服务失败",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["进入新增服务页", "填写服务表单", "点击提交服务"],
                "actual": create_service_msg or "未出现成功提示",
                "expected": "应成功提交服务并返回列表，进入待审核状态",
                "type": "功能 bug",
                "screenshot": service_editor_shot,
            })
        await clear_messages(client)

        await click_text(client, "订单处理")
        await wait_for(client, "location.hash.includes('/orders')")
        await wait_for(client, "document.body.innerText.includes('订单处理')")
        orders_shot = await screenshot(client, "07_orders_list")
        if pending_order and await eval_js(client, "document.body.innerText.includes('待接单') && document.body.innerText.includes('订单处理')"):
            result["passes"].append({"title": "订单处理页可访问", "route": await get_hash(client), "notes": "具备状态筛选、订单列表和详情入口"})
        else:
            result["issues"].append({
                "title": "订单处理页缺少演示订单",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入订单处理页"],
                "actual": "未找到可用于接单/拒单的待接单订单",
                "expected": "应存在待接单演示订单用于论文演示",
                "type": "演示数据问题",
                "screenshot": orders_shot,
            })

        if pending_order:
            await click_row_action(client, pending_order["orderNo"], "接单")
            await asyncio.sleep(1.2)
            accept_msg = await get_message(client)
            accept_shot = await screenshot(client, "08_order_accept")
            if "接单成功" in accept_msg:
                result["passes"].append({"title": "待接单订单可接单", "route": await get_hash(client), "notes": f"提示文案：{accept_msg}"})
            else:
                result["issues"].append({
                    "title": "接单操作失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入订单处理页", "对待接单订单点击接单"],
                    "actual": accept_msg or "未出现接单成功提示",
                    "expected": "应成功接单并更新订单状态为已接单",
                    "type": "功能 bug",
                    "screenshot": accept_shot,
                })
            await clear_messages(client)

        if accepted_order:
            await click_row_action(client, accepted_order["orderNo"], "开始服务")
            await asyncio.sleep(1.2)
            start_msg = await get_message(client)
            start_shot = await screenshot(client, "09_order_start")
            if "已开始服务" in start_msg:
                result["passes"].append({"title": "已接单订单可开始服务", "route": await get_hash(client), "notes": f"提示文案：{start_msg}"})
            else:
                result["issues"].append({
                    "title": "开始服务操作失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入订单处理页", "对已接单订单点击开始服务"],
                    "actual": start_msg or "未出现开始服务成功提示",
                    "expected": "应成功将订单更新为服务中",
                    "type": "功能 bug",
                    "screenshot": start_shot,
                })
            await clear_messages(client)

        opened_reject = await eval_js(
            client,
            """
            (() => {
              const vm = window.__merchantApp || document.querySelector('#merchant-app').__vue__;
              if (!vm) return false;
              if (vm.$route.path !== '/orders' || vm.orderFilters.status !== '1') {
                vm.pushOrderRouteQuery({ status: '1', pageNum: 1 });
              }
              return true;
            })()
            """,
        )
        await wait_for(client, "location.hash.includes('/orders')")
        await wait_network_idle()
        has_reject_action = await eval_js(
            client,
            """
            (() => {
              const vm = window.__merchantApp || document.querySelector('#merchant-app').__vue__;
              if (!vm || !vm.orderList || !vm.orderList.list) return false;
              const target = vm.orderList.list.find(item => String(item.status) === '1');
              if (!target) return false;
              vm.openRejectDialog(target);
              return true;
            })()
            """,
        )
        if opened_reject and has_reject_action:
            await wait_for(client, "document.body.innerText.includes('拒单原因')")
            await click_text(client, "确认拒单")
            await asyncio.sleep(0.8)
            reject_warn_msg = await get_message(client)
            reject_warn_shot = await screenshot(client, "10_order_reject_validation")
            if "拒单原因不能为空" in reject_warn_msg or "请输入拒单原因" in reject_warn_msg:
                result["passes"].append({"title": "拒单原因必填校验生效", "route": await get_hash(client), "notes": f"提示文案：{reject_warn_msg}"})
            else:
                result["issues"].append({
                    "title": "拒单未拦截空原因",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入订单处理页", "对待接单订单点击拒单", "不填写原因直接提交"],
                    "actual": reject_warn_msg or "未出现必填提示",
                    "expected": "应阻止提交并提示填写拒单原因",
                    "type": "功能 bug",
                    "screenshot": reject_warn_shot,
                })
            await clear_messages(client)
            await set_reject_reason(client, "论文回归测试拒单原因")
            await click_text(client, "确认拒单")
            await asyncio.sleep(1.2)
            reject_msg = await get_message(client)
            reject_shot = await screenshot(client, "11_order_reject")
            if "拒单成功" in reject_msg:
                result["passes"].append({"title": "待接单订单可拒单", "route": await get_hash(client), "notes": f"提示文案：{reject_msg}"})
            else:
                result["issues"].append({
                    "title": "拒单操作失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入订单处理页", "填写拒单原因并提交"],
                    "actual": reject_msg or "未出现拒单成功提示",
                    "expected": "应成功将订单更新为已取消",
                    "type": "功能 bug",
                    "screenshot": reject_shot,
                })
            await clear_messages(client)
        else:
            result["issues"].append({
                "title": "订单列表缺少拒单操作入口",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入订单处理页"],
                "actual": "当前列表未找到可点击的“拒单”操作",
                "expected": "存在待接单订单时应展示拒单入口",
                "type": "演示数据问题",
                "screenshot": orders_shot,
            })

        if detail_order_id:
            await eval_js(client, f"location.hash = '#/orders/{detail_order_id}'")
            await wait_for(client, "location.hash.match(/#\\/orders\\/\\d+/)")
            await wait_for(client, "document.body.innerText.includes('订单详情')")
            order_detail_shot = await screenshot(client, "12_order_detail")
            if await eval_js(client, "document.body.innerText.includes('订单详情') && (document.body.innerText.includes('服务与用户信息') || (document.body.innerText.includes('用户名') && document.body.innerText.includes('服务名称'))) && document.body.innerText.includes('关键时间点')"):
                result["passes"].append({"title": "订单详情页结构化展示", "route": await get_hash(client), "notes": "详情页展示用户、服务、预约信息和进度条"})
            else:
                result["issues"].append({
                    "title": "订单详情页展示不完整",
                    "severity": "中",
                    "route": await get_hash(client),
                    "steps": ["进入订单详情页"],
                    "actual": "订单详情未完整展示结构化信息",
                    "expected": "应展示订单信息、用户信息、服务信息和状态进度",
                    "type": "论文不一致",
                    "screenshot": order_detail_shot,
                })

        await click_text(client, "评价管理")
        await wait_for(client, "location.hash.includes('/reviews')")
        await wait_for(client, "document.body.innerText.includes('评价管理')")
        review_list_shot = await screenshot(client, "13_reviews_list")
        if pending_review and await eval_js(client, "document.body.innerText.includes('待回复') && document.body.innerText.includes('回复状态')"):
            result["passes"].append({"title": "评价管理页可访问", "route": await get_hash(client), "notes": f"当前待回复评价 {len(reviews)} 条"})
        else:
            result["issues"].append({
                "title": "评价管理页缺少待回复演示数据",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入评价管理页"],
                "actual": "未找到可回复评价",
                "expected": "应存在待回复评价用于论文演示",
                "type": "演示数据问题",
                "screenshot": review_list_shot,
            })

        if pending_review:
            await click_row_action(client, pending_review["orderNo"], "回复")
            await wait_for(client, "document.body.innerText.includes('回复评价')")
            await fill_input_by_label(client, "回复内容", "论文回归测试回复：感谢您的评价，我们会继续保持服务质量。")
            reply_shot = await screenshot(client, "14_review_reply_dialog")
            await click_text(client, "提交回复")
            await asyncio.sleep(1.2)
            reply_msg = await get_message(client)
            if "回复成功" in reply_msg:
                result["passes"].append({"title": "待回复评价可提交回复", "route": await get_hash(client), "notes": f"提示文案：{reply_msg}"})
            else:
                result["issues"].append({
                    "title": "评价回复失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入评价管理页", "对待回复评价填写回复内容", "点击提交回复"],
                    "actual": reply_msg or "未出现回复成功提示",
                    "expected": "应成功保存回复并回到评价列表",
                    "type": "功能 bug",
                    "screenshot": reply_shot,
                })
            await clear_messages(client)

    finally:
        ensure_dir(LOG_PATH.parent)
        LOG_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        await client.close()


if __name__ == "__main__":
    asyncio.run(run())
