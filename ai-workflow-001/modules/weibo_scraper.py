"""
微博热搜抓取模块

功能：
  从微博抓取当前实时热搜榜单

用法：
  from modules.weibo_scraper import WeiboScraper
  scraper = WeiboScraper()
  hot_list = scraper.get_hot_search()

新手须知：
  - 这里使用的是微博官方的非公开 JSON 接口，不需要登录
  - 如果接口失效，可以换成 https://s.weibo.com/top/summary 做网页解析
  - 现在很多网站会反爬虫，所以加了请求头（Headers）来伪装成浏览器
"""

import json
import time
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# 从 config 模块读取配置
from modules.config import Config


class WeiboScraper:
    """
    微博热搜抓取器

    使用方式：
        wb = WeiboScraper()          # 创建抓取器
        data = wb.get_hot_search()   # 获取热搜榜单
        # 返回格式：[{"rank": 1, "title": "热搜标题", "hot": "热度值"}, ...]
    """

    def __init__(self):
        """初始化：设置请求头和重试策略"""
        # 请求头 —— 伪装成 Chrome 浏览器，避免被微博反爬虫拦截
        self.headers = {
            # User-Agent 告诉服务器"我是一个 Chrome 浏览器"
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            # Accept 告诉服务器我可以接受 JSON 和 HTML
            "Accept": "application/json, text/html, */*",
            # Referer 告诉服务器我是从微博首页跳转过来的
            "Referer": "https://weibo.com/",
            # Cookie 有时需要，这里留空
            "Cookie": "",
        }

        # 创建带重试机制的 Session（网络请求会话）
        # 为什么要重试？因为网络可能不稳定，微博也可能偶尔抽风
        self.session = requests.Session()

        # 重试策略：
        #   total=3       —— 最多重试 3 次
        #   backoff_factor=1 —— 重试间隔：1s, 2s, 4s（指数增长）
        #   status_forcelist —— 遇到这些 HTTP 状态码就重试
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
        )

        # 把重试策略挂到 HTTP 和 HTTPS 上
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # 请求超时时间（秒）：连接超时 10s，读取超时 30s
        self.timeout = (10, 30)

    def get_hot_search(self) -> list[dict]:
        """
        获取微博热搜榜单（主方法）

        流程：
          1. 请求微博热搜 JSON 接口
          2. 解析返回的 JSON 数据
          3. 提取热搜标题、热度、排名

        返回：
            [
                {"rank": 1, "title": "爆款话题", "hot": "5000000"},
                {"rank": 2, "title": "热门话题", "hot": "3000000"},
                ...
            ]

            如果抓取失败，返回空列表 []
        """
        print("🌐 正在抓取微博热搜...")

        try:
            # 发送 GET 请求到微博热搜接口
            # Config.WEIBO_HOT_URL 在 config.py 中定义，默认是微博官方接口
            response = self.session.get(
                Config.WEIBO_HOT_URL,
                headers=self.headers,
                timeout=self.timeout,
            )

            # 检查请求是否成功（状态码 200）
            # raise_for_status() 在状态码不是 200 时会抛出异常
            response.raise_for_status()

            # 解析 JSON 响应
            # response.json() 把 JSON 字符串转成 Python 字典
            data = response.json()

            # 解析热搜数据
            hot_list = self._parse_hot_data(data)

            print(f"✅ 成功获取 {len(hot_list)} 条热搜\n")
            return hot_list

        except requests.exceptions.RequestException as e:
            # 网络请求异常（超时、连接失败、DNS 解析失败等）
            print(f"❌ 网络请求失败: {e}")
            # 尝试用备用方法抓取
            return self._fallback_scrape()

        except json.JSONDecodeError as e:
            # JSON 解析失败（接口返回了非 JSON 内容）
            print(f"❌ JSON 解析失败: {e}")
            return self._fallback_scrape()

    def _parse_hot_data(self, data: dict) -> list[dict]:
        """
        解析微博热搜 JSON 数据（内部方法）

        参数：
            data: 微博 API 返回的原始 JSON 字典

        返回：
            格式化后的热搜列表
        """
        hot_list = []

        # 微博热搜的 JSON 结构大致是：
        # {
        #   "data": {
        #     "realtime": [
        #       {"rank": 1, "word": "标题", "raw_hot": 2000000, ...},
        #       ...
        #     ]
        #   }
        # }
        #
        # 注意：接口结构可能会变，所以这里用了 .get() 并给默认值

        # 获取 realtime 列表（实时热搜）
        realtime_list = data.get("data", {}).get("realtime", [])

        for item in realtime_list:
            # 每个热搜条目可能包含：
            #   word        —— 热搜标题
            #   raw_hot     —— 热度数值（数字）
            #   rank        —— 排名
            #   icon_desc   —— 标签（"沸"、"爆"、"新" 等）
            hot_item = {
                "rank": item.get("rank", 0),                          # 排名
                "title": item.get("word", "").strip(),                 # 标题（去掉首尾空格）
                "hot": self._format_hot(item.get("raw_hot", 0)),      # 热度（格式化后）
                "tag": item.get("icon_desc", ""),                     # 标签
                "category": item.get("category", ""),                 # 分类
            }

            # 跳过空标题（数据异常）
            if hot_item["title"]:
                hot_list.append(hot_item)

        # 按排名排序（确保顺序正确）
        hot_list.sort(key=lambda x: x["rank"])

        # 只取前 N 条（Config.HOT_TOP_COUNT 在 .env 中配置）
        return hot_list[:Config.HOT_TOP_COUNT]

    def _format_hot(self, raw_hot: int) -> str:
        """
        格式化热度数字，让它更易读

        示例：
            5000000  →  "500万"
            1234567  →  "123万"
            123456   →  "12.3万"

        参数：
            raw_hot: 原始热度数值

        返回：
            格式化后的热度字符串
        """
        if raw_hot >= 100_000_000:
            # 亿级别：1.2亿
            return f"{raw_hot / 100_000_000:.1f}亿"
        elif raw_hot >= 10_000:
            # 万级别：123万
            return f"{raw_hot / 10_000:.0f}万"
        else:
            # 千及以下：直接显示
            return str(raw_hot)

    def _fallback_scrape(self) -> list[dict]:
        """
        备用抓取方法

        当主接口失效时，尝试从微博热搜页面解析 HTML
        这里实现了两个备用方案

        返回：
            格式化后的热搜列表
        """
        print("🔄 尝试备用方案...")

        # 备用方案 1：使用热搜汇总页面
        fallback_urls = [
            "https://s.weibo.com/top/summary",
            "https://weibo.com/ajax/side/hotSearch",
        ]

        for url in fallback_urls:
            try:
                print(f"  尝试: {url}")
                response = self.session.get(
                    url,
                    headers=self.headers,
                    timeout=self.timeout,
                )
                response.raise_for_status()

                # 如果是 JSON 接口
                if "ajax" in url:
                    data = response.json()
                    return self._parse_hot_data(data)
                else:
                    # HTML 页面 —— 用简单的文本提取
                    # 注意：更严谨的做法是用 BeautifulSoup 解析 HTML
                    html = response.text
                    return self._parse_html_fallback(html)

            except Exception as e:
                print(f"  ❌ {url} 失败: {e}")
                continue

        print("❌ 所有抓取方案都失败了")
        return []

    def _parse_html_fallback(self, html: str) -> list[dict]:
        """
        从 HTML 页面解析热搜（简易版）

        HTML 页面 <td class="td-02"> 标签里包含热搜标题

        参数：
            html: 页面 HTML 文本

        返回：
            格式化后的热搜列表
        """
        hot_list = []
        import re

        # 简单正则提取热搜标题
        # 匹配 <td class="td-02"> 后面的 <a href=...>标题</a>
        pattern = r'td-02[^>]*>.*?<a[^>]*>(.*?)</a>'
        matches = re.findall(pattern, html, re.DOTALL)

        for rank, title in enumerate(matches, 1):
            title = title.strip()
            if title:
                hot_list.append({
                    "rank": rank,
                    "title": title,
                    "hot": "未知",
                    "tag": "",
                    "category": "",
                })

            # 限制数量
            if len(hot_list) >= Config.HOT_TOP_COUNT:
                break

        return hot_list

    def get_formatted_text(self, hot_list: list[dict]) -> str:
        """
        把热搜列表格式化成可读的文本（用于展示或发送邮件）

        参数：
            hot_list: get_hot_search() 返回的热搜列表

        返回：
            格式化的文本字符串
        """
        if not hot_list:
            return "暂无热搜数据"

        # 获取当前时间
        now = datetime.now().strftime("%Y-%m-%d %H:%M")

        lines = [f"📊 微博热搜榜单 ({now})", "=" * 40]

        for item in hot_list:
            rank = item["rank"]
            title = item["title"]
            hot = item["hot"]
            tag = item["tag"]

            # 如果有标签（爆/沸/新）就显示
            tag_str = f" [{tag}]" if tag else ""
            lines.append(f"  #{rank}  {title}{tag_str}  🔥{hot}")

        return "\n".join(lines)


# ======================================================================
# 测试代码（直接运行本文件时执行）
# ======================================================================
if __name__ == "__main__":
    # 这个 if 块里的代码只有在"直接运行本文件"时才会执行
    # 当被其他文件 import 时不会执行
    scraper = WeiboScraper()
    hot_list = scraper.get_hot_search()
    print(scraper.get_formatted_text(hot_list))
