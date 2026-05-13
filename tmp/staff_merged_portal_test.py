import asyncio
import json
import time
from datetime import date, timedelta
from pathlib import Path

import requests
import websockets

BASE_URL = "http://127.0.0.1:3000/merchant.html#/login"
API_BASE = "http://127.0.0.1:8080"
DEBUG_PORT = 9223
OUT_DIR = Path("/Users/caobingbing/workspace/tongcheng-service-system/tmp/staff-merged-test-artifacts")
LOG_PATH = OUT_DIR / "staff-merged-test-result.json"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def now_tag():
    return str(int(time.time()))


class TestFailure(Exception):
    pass


class ApiClient:
    def __init__(self):
        self.session = requests.Session()

    def login(self, path, username, password):
        response = self.session.post(
            API_BASE + path,
            json={"username": username, "password": password},
            timeout=10,
        )
        payload = response.json()
        if payload.get("code") != 200:
            raise TestFailure(f"login failed for {path}: {payload}")
        return payload["data"]["token"]

    def request(self, method, path, token=None, **kwargs):
        headers = kwargs.pop("headers", {})
        if token:
            headers["Authorization"] = "Bearer " + token
        response = self.session.request(method, API_BASE + path, headers=headers, timeout=10, **kwargs)
        payload = response.json()
        if payload.get("code") != 200:
            raise TestFailure(f"{method} {path} failed: {payload}")
        return payload.get("data")


class CDPClient:
    def __init__(self, ws_url):
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
                future = self.pending.pop(data["id"], None)
                if future and not future.done():
                    future.set_result(data)

    async def call(self, method, params=None):
        self.msg_id += 1
        future = asyncio.get_running_loop().create_future()
        self.pending[self.msg_id] = future
        await self.ws.send(json.dumps({"id": self.msg_id, "method": method, "params": params or {}}))
        response = await future
        if "error" in response:
            raise TestFailure(f"{method} failed: {response['error']}")
        return response.get("result", {})

    async def eval(self, expression):
        result = await self.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        return result.get("result", {}).get("value")

    async def close(self):
        if self.ws:
            await self.ws.close()


async def get_or_create_page_ws():
    pages = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json", timeout=10).json()
    for page in pages:
        if page.get("type") == "page" and "merchant.html" in page.get("url", ""):
            return page["webSocketDebuggerUrl"]
    created = requests.put(f"http://127.0.0.1:{DEBUG_PORT}/json/new?{BASE_URL}", timeout=10)
    return created.json()["webSocketDebuggerUrl"]


async def wait_for(client, expression, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        value = await client.eval(expression)
        if value:
            return value
        await asyncio.sleep(0.2)
    raise TestFailure(f"timeout waiting for: {expression}")


async def ui_login_checks():
    ws_url = await get_or_create_page_ws()
    client = CDPClient(ws_url)
    await client.connect()
    await client.call("Page.enable")
    await client.call("Runtime.enable")
    await client.call("Page.navigate", {"url": BASE_URL})
    await wait_for(client, "document.readyState === 'complete'")
    await client.eval(
        "(() => { localStorage.clear(); sessionStorage.clear(); location.hash = '#/login'; return true; })()"
    )
    await client.call("Page.reload", {"ignoreCache": True})
    await wait_for(client, "!!window.__merchantApp")

    await client.eval(
        "(async()=>{ const vm=window.__merchantApp; vm.switchLoginMode('merchant'); vm.loginForm.username='merchant01'; vm.loginForm.password='123456'; await vm.login(); return true; })()"
    )
    await wait_for(client, "location.hash === '#/dashboard'")
    merchant_menu = await client.eval(
        "Array.from(document.querySelectorAll('.menu-button')).map(el => (el.innerText || '').trim())"
    )
    await client.eval("(async()=>{ window.__merchantApp.logout(); return true; })()")
    await wait_for(client, "location.hash.indexOf('/login') > -1")

    await client.eval(
        "(async()=>{ const vm=window.__merchantApp; vm.switchLoginMode('staff'); vm.loginForm.username='staff1_1'; vm.loginForm.password='123456'; await vm.login(); return true; })()"
    )
    await wait_for(client, "location.hash === '#/staff/dashboard'")
    staff_menu = await client.eval(
        "Array.from(document.querySelectorAll('.menu-button')).map(el => (el.innerText || '').trim())"
    )
    await client.close()

    return {
        "merchant_hash": "#/dashboard",
        "merchant_menu": merchant_menu,
        "staff_hash": "#/staff/dashboard",
        "staff_menu": staff_menu,
    }


def build_test_order(api, user_token):
    appoint_date = (date.today() + timedelta(days=1)).isoformat()
    order_tag = now_tag()
    created = api.request(
        "post",
        "/user/order/create",
        token=user_token,
        json={
            "serviceId": 1,
            "appointDate": appoint_date,
            "appointSlot": "上午 (08:00-12:00)",
            "address": f"自动化测试地址 {order_tag}",
            "remark": f"staff-merged-auto-{order_tag}",
        },
    )
    order_id = created["orderId"]
    api.request("post", "/user/order/pay", token=user_token, json={"orderId": order_id})
    return order_id


def assert_true(condition, message):
    if not condition:
        raise TestFailure(message)


def run_api_flow():
    api = ApiClient()
    merchant_token = api.login("/merchant/auth/login", "merchant01", "123456")
    staff1_token = api.login("/staff/auth/login", "staff1_1", "123456")
    staff2_token = api.login("/staff/auth/login", "staff1_2", "123456")
    user_token = api.login("/user/auth/login", "user01", "123456")

    dashboard = api.request("get", "/merchant/dashboard/summary", token=merchant_token)
    staff_list = api.request("get", "/merchant/staff/list", token=merchant_token, params={})
    assert_true(len(staff_list) >= 2, "expected at least 2 staff members")
    staff1 = next((item for item in staff_list if item["username"] == "staff1_1"), None)
    staff2 = next((item for item in staff_list if item["username"] == "staff1_2"), None)
    assert_true(staff1 is not None, "staff1_1 missing")
    assert_true(staff2 is not None, "staff1_2 missing")

    order_id = build_test_order(api, user_token)
    api.request("post", "/merchant/order/accept", token=merchant_token, json={"orderId": order_id})
    api.request(
        "post",
        "/merchant/order/assign-staff",
        token=merchant_token,
        json={"orderId": order_id, "staffId": staff1["id"]},
    )

    merchant_order = api.request("get", f"/merchant/order/{order_id}", token=merchant_token)
    assert_true(merchant_order["staff"]["username"] == "staff1_1", "assigned staff mismatch")

    merchant_messages_before = api.request(
        "get",
        "/merchant/order/message/list",
        token=merchant_token,
        params={"orderId": order_id},
    )
    api.request(
        "post",
        "/user/order/message/send",
        token=user_token,
        json={"orderId": order_id, "content": "用户发起自动化沟通消息"},
    )
    api.request(
        "post",
        "/merchant/order/message/send",
        token=merchant_token,
        json={"orderId": order_id, "content": "商家回复自动化消息"},
    )

    staff1_orders = api.request(
        "get",
        "/staff/order/list",
        token=staff1_token,
        params={"pageNum": 1, "pageSize": 50},
    )
    staff2_orders = api.request(
        "get",
        "/staff/order/list",
        token=staff2_token,
        params={"pageNum": 1, "pageSize": 50},
    )
    staff1_ids = [item["id"] for item in staff1_orders["list"]]
    staff2_ids = [item["id"] for item in staff2_orders["list"]]
    assert_true(order_id in staff1_ids, "assigned order missing from staff1 list")
    assert_true(order_id not in staff2_ids, "assigned order should not appear in staff2 list")

    staff_messages_before = api.request(
        "get",
        "/staff/order/message/list",
        token=staff1_token,
        params={"orderId": order_id},
    )
    api.request(
        "post",
        "/staff/order/message/send",
        token=staff1_token,
        json={"orderId": order_id, "content": "员工回复自动化消息"},
    )
    staff_messages_after = api.request(
        "get",
        "/staff/order/message/list",
        token=staff1_token,
        params={"orderId": order_id},
    )
    assert_true(len(staff_messages_after) >= len(staff_messages_before) + 1, "staff message not appended")

    api.request("post", "/staff/order/start", token=staff1_token, json={"orderId": order_id})
    merchant_after_start = api.request("get", f"/merchant/order/{order_id}", token=merchant_token)
    assert_true(merchant_after_start["status"] == "3", "order did not enter in-service status")

    api.request("post", "/staff/order/complete", token=staff1_token, json={"orderId": order_id})
    merchant_after_complete = api.request("get", f"/merchant/order/{order_id}", token=merchant_token)
    assert_true(merchant_after_complete["status"] == "4", "order did not complete")

    user_messages = api.request(
        "get",
        "/user/order/message/list",
        token=user_token,
        params={"orderId": order_id},
    )
    sender_roles = [item["senderRole"] for item in user_messages]

    return {
        "dashboard_staff_count": dashboard.get("staffCount"),
        "staff_list_size": len(staff_list),
        "test_order_id": order_id,
        "assigned_staff": merchant_order["staff"]["username"],
        "merchant_messages_before": len(merchant_messages_before),
        "staff1_visible": order_id in staff1_ids,
        "staff2_hidden": order_id not in staff2_ids,
        "sender_roles": sender_roles,
        "status_after_start": merchant_after_start["status"],
        "status_after_complete": merchant_after_complete["status"],
    }


def main():
    ensure_dir(OUT_DIR)
    result = {
        "status": "passed",
        "checks": {},
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    try:
        result["checks"]["ui"] = asyncio.run(ui_login_checks())
        result["checks"]["api_flow"] = run_api_flow()
    except Exception as exc:  # noqa: BLE001
        result["status"] = "failed"
        result["error"] = str(exc)

    LOG_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
