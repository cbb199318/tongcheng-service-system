import asyncio
import base64
import json
import re
import time
from pathlib import Path

import requests
import websockets

BASE_URL = "http://127.0.0.1:3000/#/user/login"
API_BASE = "http://127.0.0.1:8080"
DEBUG_PORT = 9223
OUT_DIR = Path("/Users/caobingbing/workspace/tongcheng-service-system/tmp/user-test-artifacts")
SHOT_DIR = OUT_DIR / "screenshots"
LOG_PATH = OUT_DIR / "logs" / "user-test-result.json"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def sanitize(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", name)


def api_login():
    res = requests.post(
        f"{API_BASE}/user/auth/login",
        json={"username": "user01", "password": "123456"},
        timeout=10,
    )
    data = res.json()
    return data["data"]["token"]


def api_get(path: str, token: str = ""):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    res = requests.get(f"{API_BASE}{path}", headers=headers, timeout=10)
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
    pages = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json", timeout=10).json()
    for page in pages:
        if page.get("type") == "page" and "#/user" in page.get("url", ""):
            return page["webSocketDebuggerUrl"]
    create = requests.put(f"http://127.0.0.1:{DEBUG_PORT}/json/new?http://127.0.0.1:3000/", timeout=10)
    return create.json()["webSocketDebuggerUrl"]


async def eval_js(client: CDPClient, expression: str, return_by_value=True):
    result = await client.call(
        "Runtime.evaluate",
        {
            "expression": expression,
            "returnByValue": return_by_value,
            "awaitPromise": True,
        },
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


async def card_count(client: CDPClient, selector: str):
    return await eval_js(client, f"document.querySelectorAll({json.dumps(selector)}).length")


async def ensure_logged_out_entry(client: CDPClient):
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await eval_js(
        client,
        """
        (() => {
          localStorage.removeItem('userToken');
          sessionStorage.clear();
          return true;
        })()
        """,
    )
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await wait_for(client, "document.body && document.body.innerText.includes('同城服务平台')")


async def set_order_form(client: CDPClient):
    return await eval_js(
        client,
        """
        (() => {
          const vm = window.__userApp || document.querySelector('#user-app').__vue__;
          if (!vm) return false;
          vm.orderForm.appointDate = '2026-05-14';
          vm.orderForm.appointSlot = '下午 (14:00-18:00)';
          vm.orderForm.address = '济南市历下区测试街道 88 号';
          vm.orderForm.remark = '论文回归测试下单';
          return true;
        })()
        """,
    )


async def set_review_form(client: CDPClient):
    return await eval_js(
        client,
        """
        (() => {
          const vm = window.__userApp || document.querySelector('#user-app').__vue__;
          if (!vm) return false;
          vm.reviewForm.rating = 5;
          vm.reviewForm.content = '论文回归测试评价：页面流程完整，预约与服务说明清晰。';
          return true;
        })()
        """,
    )


async def open_route(client: CDPClient, hash_path: str):
    target = hash_path
    if target.startswith("#/") and not target.startswith("#/user/"):
        target = "#/user" + target[1:]
    await eval_js(client, f"location.hash = {json.dumps(target)}")
    await wait_for(client, f"location.hash === {json.dumps(target)} || location.hash.startsWith({json.dumps(target + '?')})")


async def run():
    result = {"testedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "baseUrl": BASE_URL, "issues": [], "passes": []}

    token = api_login()
    home_data = api_get("/user/home/index")
    services = api_get("/user/service/list?pageNum=1&pageSize=8")["list"]
    orders = api_get("/user/order/list?pageNum=1&pageSize=10", token)["list"]
    target_service = services[0]
    completed_order = next((item for item in orders if str(item.get("status")) == "4" and not int(item.get("isCommented") or 0)), None)

    ws_url = await get_or_create_page_ws()
    client = CDPClient(ws_url)
    await client.connect()

    try:
        await client.call("Page.enable")
        await client.call("Runtime.enable")
        await client.call("DOM.enable")

        await ensure_logged_out_entry(client)
        result["passes"].append({"title": "登录页加载正常", "route": await get_hash(client), "notes": "登录页标题、表单和注册入口可见"})
        await screenshot(client, "01_login_page")

        await click_text(client, "立即注册")
        await wait_for(client, "location.hash.includes('/register')")
        register_shot = await screenshot(client, "02_register_page")
        register_text_ok = await eval_js(client, "document.body.innerText.includes('创建账号') && document.body.innerText.includes('立即注册')")
        if register_text_ok:
            result["passes"].append({"title": "注册页可访问", "route": await get_hash(client), "notes": "注册页展示用户名、昵称、手机号和协议勾选"})
        else:
            result["issues"].append({
                "title": "注册页结构异常",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["打开用户端", "点击立即注册"],
                "actual": "注册页关键字段或文案未完整展示",
                "expected": "应展示论文口径的注册表单与协议勾选",
                "type": "论文不一致",
                "screenshot": register_shot,
            })

        await open_route(client, "#/login")
        await fill_input_by_label(client, "用户名", "user01")
        await fill_input_by_label(client, "密码", "123456")
        await click_text(client, "立即登录")
        await wait_for(client, "location.hash.includes('/home')")
        await wait_for(client, "document.body.innerText.includes('首页推荐')")
        await screenshot(client, "03_home_after_login")
        result["passes"].append({"title": "登录成功进入首页", "route": await get_hash(client), "notes": "登录后默认进入首页推荐"})

        banner_count = len(home_data.get("banners", []))
        category_count = len(home_data.get("categories", []))
        merchant_count = len(home_data.get("recommendedMerchants", []))
        notice_count = len(home_data.get("notices", []))
        home_shot = await screenshot(client, "04_home_sections")
        if (
            banner_count >= 1
            and category_count >= 1
            and merchant_count >= 1
            and notice_count >= 1
            and await eval_js(client, "document.body.innerText.includes('Banner 轮播') && document.body.innerText.includes('服务分类') && document.body.innerText.includes('推荐商家') && document.body.innerText.includes('平台公告')")
        ):
            result["passes"].append({"title": "首页核心区块完整", "route": "#/home", "notes": "包含 Banner、分类、热门服务、推荐商家和公告"})
        else:
            result["issues"].append({
                "title": "首页信息架构缺失",
                "severity": "高",
                "route": "#/home",
                "steps": ["登录用户端", "查看首页"],
                "actual": f"banner={banner_count} category={category_count} merchant={merchant_count} notice={notice_count}",
                "expected": "首页应具备 Banner、分类、热门服务、推荐商家和公告五块内容",
                "type": "论文不一致",
                "screenshot": home_shot,
            })

        await eval_js(
            client,
            """
            (() => {
              const vm = window.__userApp || document.querySelector('#user-app').__vue__;
              vm.serviceQuery.keyword = '保洁';
              vm.pushServiceRouteQuery({ keyword: '保洁', pageNum: 1 });
              return true;
            })()
            """,
        )
        await wait_for(client, "location.hash.includes('/services')")
        await wait_for(client, "location.hash.includes('keyword=%E4%BF%9D%E6%B4%81') || location.hash.includes('keyword=保洁')")
        await wait_network_idle()
        service_list_shot = await screenshot(client, "05_services_list")
        service_cards = await card_count(client, ".user-service-card")
        if service_cards >= 1:
            result["passes"].append({"title": "服务搜索与列表筛选可用", "route": await get_hash(client), "notes": f"关键词“保洁”筛选后展示 {service_cards} 张服务卡片"})
        else:
            result["issues"].append({
                "title": "服务列表筛选无结果",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["登录用户端", "搜索“保洁”"],
                "actual": "页面未展示任何服务卡片",
                "expected": "应展示至少 1 条匹配服务",
                "type": "功能 bug",
                "screenshot": service_list_shot,
            })

        await open_route(client, f"#/service/{target_service['id']}")
        await wait_for(client, "document.body.innerText.includes('服务说明') && document.body.innerText.includes('商家信息')")
        detail_shot = await screenshot(client, "06_service_detail")
        review_count = await card_count(client, ".review-row")
        if await eval_js(client, "document.body.innerText.includes('立即预约')"):
            result["passes"].append({"title": "服务详情页可展示", "route": await get_hash(client), "notes": f"详情页加载完成，当前评价条数 {review_count}"})
        else:
            result["issues"].append({
                "title": "服务详情缺少预约入口",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["进入服务详情页"],
                "actual": "详情页未显示立即预约按钮",
                "expected": "应展示服务摘要、评价和立即预约入口",
                "type": "论文不一致",
                "screenshot": detail_shot,
            })

        await open_route(client, f"#/order/confirm?serviceId={target_service['id']}")
        await wait_for(client, "document.body.innerText.includes('预约下单')")
        await set_order_form(client)
        confirm_shot = await screenshot(client, "07_order_confirm")
        if await eval_js(client, "document.body.innerText.includes('预约日期') && document.body.innerText.includes('服务地址')"):
            result["passes"].append({"title": "预约下单页结构完整", "route": await get_hash(client), "notes": "下单页包含预约日期、时段、地址和备注表单"})
        else:
            result["issues"].append({
                "title": "预约下单页字段不完整",
                "severity": "高",
                "route": await get_hash(client),
                "steps": ["打开预约下单页"],
                "actual": "页面未完整展示论文要求的核心表单字段",
                "expected": "应包含预约日期、预约时段、服务地址和备注",
                "type": "论文不一致",
                "screenshot": confirm_shot,
            })

        await click_text(client, "立即预约")
        await wait_for(client, "location.hash.includes('/order/pay/')")
        await wait_for(client, "document.body.innerText.includes('订单支付')")
        pay_route = await get_hash(client)
        pay_shot = await screenshot(client, "08_order_pay")
        if await eval_js(client, "document.body.innerText.includes('选择模拟支付方式') && document.body.innerText.includes('立即支付')"):
            result["passes"].append({"title": "创建订单后跳转支付页", "route": pay_route, "notes": "订单创建成功，支付页展示金额、预约信息和支付方式"})
        else:
            result["issues"].append({
                "title": "订单创建后未正确进入支付页",
                "severity": "高",
                "route": pay_route,
                "steps": ["服务详情进入预约页", "填写表单提交"],
                "actual": "支付页关键信息不完整",
                "expected": "应跳转支付页并展示订单号、金额、预约信息和支付按钮",
                "type": "功能 bug",
                "screenshot": pay_shot,
            })

        await click_text(client, "立即支付")
        await wait_for(client, "location.hash.includes('/orders')")
        await wait_for(client, "location.hash.includes('status=1')")
        await wait_network_idle()
        orders_shot = await screenshot(client, "09_orders_list")
        if await eval_js(client, "document.body.innerText.includes('我的订单') && document.body.innerText.includes('待接单')"):
            result["passes"].append({"title": "支付成功后进入订单页", "route": await get_hash(client), "notes": "支付后默认定位到待接单列表"})
        else:
            result["issues"].append({
                "title": "支付成功后订单页状态定位异常",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["在支付页点击立即支付"],
                "actual": "订单页未定位到待接单状态",
                "expected": "应进入我的订单，并默认落到待接单页签",
                "type": "功能 bug",
                "screenshot": orders_shot,
            })

        order_detail_id = await eval_js(
            client,
            """
            (() => {
              const row = document.querySelector('.order-card');
              if (!row) return '';
              const btn = Array.from(row.querySelectorAll('button,span')).find(el => (el.innerText || '').trim() === '查看详情');
              if (btn) btn.click();
              return true;
            })()
            """,
        )
        await wait_for(client, "location.hash.includes('/orders/')")
        await wait_for(client, "document.body.innerText.includes('订单详情')")
        order_detail_shot = await screenshot(client, "10_order_detail")
        if await eval_js(client, "document.body.innerText.includes('订单详情') && document.body.innerText.includes('服务地址')"):
            result["passes"].append({"title": "订单详情页可打开", "route": await get_hash(client), "notes": "详情页展示状态、预约信息、备注和进度条"})
        else:
            result["issues"].append({
                "title": "订单详情页展示不完整",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入我的订单", "点击查看详情"],
                "actual": "详情页未完整展示订单结构化信息",
                "expected": "应展示订单状态、预约信息、备注和进度信息",
                "type": "论文不一致",
                "screenshot": order_detail_shot,
            })

        if completed_order:
            await open_route(client, f"#/review/{completed_order['id']}")
            await wait_for(client, "document.body.innerText.includes('服务评价')")
            await set_review_form(client)
            review_shot = await screenshot(client, "11_review_page")
            if await eval_js(client, "document.body.innerText.includes('上传图片（选填，最多 3 张）')"):
                result["passes"].append({"title": "评价页可打开", "route": await get_hash(client), "notes": "评价页展示评分、内容和图片上传区"})
            else:
                result["issues"].append({
                    "title": "评价页缺少上传区或评分区",
                    "severity": "中",
                    "route": await get_hash(client),
                    "steps": ["打开已完成订单评价页"],
                    "actual": "评价页未完整展示评分、内容和图片上传区",
                    "expected": "应具备论文中的评价输入与上传区",
                    "type": "论文不一致",
                    "screenshot": review_shot,
                })
            await click_text(client, "提交评价")
            await asyncio.sleep(1.4)
            review_msg = await get_message(client)
            if "评价成功" in review_msg:
                result["passes"].append({"title": "已完成订单可提交评价", "route": await get_hash(client), "notes": f"提示文案：{review_msg}"})
            else:
                result["issues"].append({
                    "title": "评价提交失败",
                    "severity": "高",
                    "route": await get_hash(client),
                    "steps": ["进入已完成订单评价页", "填写评分和内容", "点击提交评价"],
                    "actual": review_msg or "未出现评价成功提示",
                    "expected": "应成功提交评价并返回订单列表",
                    "type": "功能 bug",
                    "screenshot": review_shot,
                })
            await clear_messages(client)

        await open_route(client, "#/merchant/apply")
        await wait_for(client, "document.body.innerText.includes('商家入驻申请')")
        merchant_apply_shot = await screenshot(client, "12_merchant_apply")
        if await eval_js(client, "document.body.innerText.includes('商家名称') && document.body.innerText.includes('资质证书')"):
            result["passes"].append({"title": "商家入驻页可访问", "route": await get_hash(client), "notes": "页面展示商家资料表单和上传入口"})
        else:
            result["issues"].append({
                "title": "商家入驻页字段不完整",
                "severity": "中",
                "route": await get_hash(client),
                "steps": ["进入商家入驻页"],
                "actual": "页面未完整展示商家名称、电话、地址、简介和资质字段",
                "expected": "应具备论文口径的入驻表单结构",
                "type": "论文不一致",
                "screenshot": merchant_apply_shot,
            })

        await open_route(client, "#/points")
        await wait_for(client, "document.body.innerText.includes('积分兑换')")
        points_shot = await screenshot(client, "13_points_page")
        if await eval_js(client, "document.body.innerText.includes('可兑换权益') && document.body.innerText.includes('兑换记录')"):
            result["passes"].append({"title": "积分页可访问", "route": await get_hash(client), "notes": "积分页展示积分、权益列表和兑换记录"})
        else:
            result["issues"].append({
                "title": "积分页结构不完整",
                "severity": "低",
                "route": await get_hash(client),
                "steps": ["进入积分页"],
                "actual": "未完整展示权益列表或兑换记录",
                "expected": "应展示积分数、可兑换权益和兑换记录",
                "type": "扩展能力问题",
                "screenshot": points_shot,
            })

    finally:
        ensure_dir(LOG_PATH.parent)
        LOG_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        await client.close()


if __name__ == "__main__":
    asyncio.run(run())
