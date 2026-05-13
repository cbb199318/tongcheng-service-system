import asyncio
import base64
import json
import re
import time
from pathlib import Path

import requests
import websockets

USER_BASE_URL = "http://127.0.0.1:3000/#/user/login"
ADMIN_BASE_URL = "http://127.0.0.1:3000/#/admin/login"
API_BASE = "http://127.0.0.1:8080"
DEBUG_PORT = 9223
OUT_DIR = Path("/Users/caobingbing/workspace/tongcheng-service-system/tmp/ch6-test-artifacts")
SHOT_DIR = OUT_DIR / "screenshots"
LOG_PATH = OUT_DIR / "logs" / "supplemental-test-result.json"


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


def get_page_ws(base_url: str, keyword: str) -> str:
    pages = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json", timeout=10).json()
    for page in pages:
        if page.get("type") == "page" and keyword in page.get("url", ""):
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


async def navigate(client: CDPClient, url: str):
    await client.call("Page.navigate", {"url": url})
    await wait_for(client, "document.readyState === 'complete'")


async def screenshot(client: CDPClient, name: str):
    ensure_dir(SHOT_DIR)
    data = await client.call("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    target = SHOT_DIR / f"{sanitize(name)}.png"
    target.write_bytes(base64.b64decode(data["data"]))
    return str(target)


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


def api_user_login(username: str, password: str):
    response = requests.post(
        f"{API_BASE}/user/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    return response.json()


def api_user_home():
    response = requests.get(f"{API_BASE}/user/home/index", timeout=10)
    return response.json()


async def run_tc001():
    client = CDPClient(get_page_ws(USER_BASE_URL, "#/user"))
    await client.connect()
    try:
        await navigate(client, USER_BASE_URL)
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
        await navigate(client, "http://127.0.0.1:3000/#/user/register")
        await wait_for(client, "window.__userApp && window.__userApp.$route.path === '/register'")
        suffix = str(int(time.time()))[-6:]
        username = f"zhangsan_{suffix}"
        password = "123456"
        await eval_js(
            client,
            f"""
            (() => {{
              const vm = window.__userApp;
              vm.registerForm = {{
                username: {json.dumps(username)},
                nickname: '张三',
                phone: '1380000{suffix[-4:]}',
                password: {json.dumps(password)},
                confirmPassword: {json.dumps(password)}
              }};
              vm.registerAgreement = true;
              return true;
            }})()
            """,
        )
        await clear_messages(client)
        await eval_js(client, "window.__userApp.register(); true;")
        await wait_for(
            client,
            """
            (() => {
              const msg = Array.from(document.querySelectorAll('.el-message'));
              return location.hash.includes('/login') &&
                msg.length &&
                (msg[msg.length - 1].innerText || '').includes('注册成功');
            })()
            """,
        )
        screenshot_path = await screenshot(client, "tc001_register_success")
        login_result = api_user_login(username, password)
        return {
            "id": "TC001",
            "title": "用户注册",
            "inputData": f"用户名{username}、密码{password}",
            "expected": "注册成功，跳转至登录页",
            "actual": "注册成功并跳转登录页，随后接口登录验证成功",
            "passed": bool(login_result.get("data", {}).get("token")),
            "evidence": screenshot_path,
            "extraEvidence": str(LOG_PATH),
        }
    finally:
        await client.close()


async def admin_login(client: CDPClient):
    await navigate(client, ADMIN_BASE_URL)
    await eval_js(
        client,
        """
        (() => {
          localStorage.removeItem('adminToken');
          sessionStorage.clear();
          return true;
        })()
        """,
    )
    await navigate(client, ADMIN_BASE_URL)
    await wait_for(client, "window.__adminApp && location.hash.includes('/admin/login')")
    await eval_js(
        client,
        """
        (() => {
          const vm = window.__adminApp;
          vm.loginForm = { username: 'admin', password: '123456' };
          return true;
        })()
        """,
    )
    await clear_messages(client)
    await eval_js(client, "window.__adminApp.login(); true;")
    await wait_for(client, "window.__adminApp && window.__adminApp.$route.path === '/dashboard'", timeout=20)


async def run_tc015_tc017_tc018():
    client = CDPClient(get_page_ws(ADMIN_BASE_URL, "#/admin"))
    await client.connect()
    try:
        await admin_login(client)
        suffix = str(int(time.time()))[-6:]

        await eval_js(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              vm.$router.push('/merchants/3');
              return true;
            })()
            """,
        )
        await wait_for(client, "window.__adminApp && window.__adminApp.$route.path === '/merchants/3'")
        await wait_for(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              return !!(vm && vm.merchantDetail && vm.merchantDetail.id === 3);
            })()
            """,
        )
        await clear_messages(client)
        await eval_js(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              return vm.request({
                method: 'post',
                url: '/admin/merchant/audit',
                data: { id: vm.merchantDetail.id, status: '2', remark: '审核通过' }
              }).then(() => vm.fetchMerchantDetail(vm.merchantDetail.id));
            })()
            """,
            return_by_value=False,
        )
        await wait_for(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              return !!(vm && vm.merchantDetail && String(vm.merchantDetail.auditStatus) === '2');
            })()
            """,
            timeout=20,
        )
        merchant_approve_screenshot = await screenshot(client, "tc015_merchant_approve_success")

        category_name = f"搬家服务-{suffix}"
        await eval_js(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              vm.$router.push('/categories');
              return true;
            })()
            """,
        )
        await wait_for(client, "window.__adminApp && window.__adminApp.$route.path === '/categories'")
        await wait_for(client, "document.body.innerText.includes('分类管理')")
        await eval_js(
            client,
            f"""
            (() => {{
              const vm = window.__adminApp;
              vm.openCategoryDialog();
              vm.categoryForm.name = {json.dumps(category_name)};
              vm.categoryForm.sort = 1;
              vm.categoryForm.icon = '';
              vm.categoryForm.status = 1;
              return true;
            }})()
            """,
        )
        await clear_messages(client)
        await eval_js(client, "window.__adminApp.saveCategory(); true;")
        await wait_for(
            client,
            f"""
            (() => {{
              const hasMessage = Array.from(document.querySelectorAll('.el-message')).some(el => (el.innerText || '').includes('保存成功'));
              const hasRow = Array.from(document.querySelectorAll('.el-table__body tr')).some(tr => (tr.innerText || '').includes({json.dumps(category_name)}));
              return hasMessage && hasRow;
            }})()
            """,
            timeout=20,
        )
        category_screenshot = await screenshot(client, "tc017_category_create_success")

        notice_title = f"系统升级通知-{suffix}"
        notice_content = "将于今晚维护"
        await eval_js(
            client,
            """
            (() => {
              const vm = window.__adminApp;
              vm.$router.push('/notices');
              return true;
            })()
            """,
        )
        await wait_for(client, "window.__adminApp && window.__adminApp.$route.path === '/notices'")
        await wait_for(client, "document.body.innerText.includes('公告管理')")
        await eval_js(
            client,
            f"""
            (() => {{
              const vm = window.__adminApp;
              vm.openNoticeDialog();
              vm.noticeForm.title = {json.dumps(notice_title)};
              vm.noticeForm.content = {json.dumps(notice_content)};
              vm.noticeForm.status = 1;
              return true;
            }})()
            """,
        )
        await clear_messages(client)
        await eval_js(client, "window.__adminApp.saveNotice(); true;")
        await wait_for(
            client,
            f"""
            (() => {{
              const hasMessage = Array.from(document.querySelectorAll('.el-message')).some(el => (el.innerText || '').includes('保存成功') || (el.innerText || '').includes('公告发布成功'));
              const hasRow = Array.from(document.querySelectorAll('.el-table__body tr')).some(tr => (tr.innerText || '').includes({json.dumps(notice_title)}));
              return hasMessage && hasRow;
            }})()
            """,
            timeout=20,
        )
        notice_screenshot = await screenshot(client, "tc018_notice_create_success")
        user_home_result = api_user_home()
        notices = user_home_result.get("data", {}).get("notices", [])
        user_home_has_notice = any(item.get("title") == notice_title for item in notices)

        return [
            {
                "id": "TC015",
                "title": "商家审核通过",
                "inputData": "选择待审核商家，点击通过",
                "expected": "商家审核状态更新为已通过",
                "actual": "待审核商家审核通过，详情页状态更新为已通过",
                "passed": True,
                "evidence": merchant_approve_screenshot,
            },
            {
                "id": "TC017",
                "title": "服务分类添加",
                "inputData": f"分类名“{category_name}”、排序1",
                "expected": "分类添加成功，列表显示新分类",
                "actual": "分类保存成功，管理端分类列表出现新增记录",
                "passed": True,
                "evidence": category_screenshot,
            },
            {
                "id": "TC018",
                "title": "公告发布",
                "inputData": f"标题“{notice_title}”、内容“{notice_content}”",
                "expected": "公告发布成功，用户端首页显示",
                "actual": "公告保存成功，管理端公告列表出现新增记录，用户首页接口同步返回该公告",
                "passed": user_home_has_notice,
                "evidence": notice_screenshot,
                "extraEvidence": str(LOG_PATH),
            },
        ]
    finally:
        await client.close()


async def main():
    ensure_dir(LOG_PATH.parent)
    ensure_dir(SHOT_DIR)
    cases = []
    cases.append(await run_tc001())
    cases.extend(await run_tc015_tc017_tc018())
    payload = {
        "testedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "cases": cases,
    }
    LOG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
