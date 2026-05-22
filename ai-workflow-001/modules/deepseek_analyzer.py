"""
DeepSeek 热点分析模块

功能：
  调用 DeepSeek API 对微博热搜进行深入分析

用法：
  from modules.deepseek_analyzer import DeepSeekAnalyzer
  analyzer = DeepSeekAnalyzer()
  result = analyzer.analyze_hot_topics(hot_list)

新手须知：
  - DeepSeek API 兼容 OpenAI 的格式，所以用 openai 库就能调用
  - 需要先在 https://platform.deepseek.com 注册并获取 API Key
  - 温度（temperature）参数控制创造性：0 最保守，2 最天马行空
"""

# openai 库不仅可以调用 OpenAI，也可以调用兼容 OpenAI 格式的 API
# DeepSeek、通义千问、智谱等都兼容这个格式
from openai import OpenAI

from modules.config import Config


class DeepSeekAnalyzer:
    """
    DeepSeek 热点分析器

    使用方式：
        analyzer = DeepSeekAnalyzer()       # 创建分析器
        result = analyzer.analyze(hot_list)  # 分析热搜，返回分析结果
    """

    def __init__(self):
        """
        初始化 DeepSeek 客户端

        因为 DeepSeek API 兼容 OpenAI 格式，
        所以我们用 OpenAI 客户端，只改 base_url 就行
        """
        self.client = OpenAI(
            api_key=Config.DEEPSEEK_API_KEY,          # DeepSeek 的 API Key
            base_url=Config.DEEPSEEK_BASE_URL,        # DeepSeek 的 API 地址
        )

        # 使用的模型名称（在 .env 中配置，默认 deepseek-chat）
        self.model = Config.DEEPSEEK_MODEL

        # =================================================================
        # 系统提示词（System Prompt）
        #
        # 这是给 AI 的"角色设定"，告诉它应该以什么身份和风格来回答。
        # 一个好的系统提示词能让 AI 的输出质量大幅提升。
        # =================================================================
        self.system_prompt = """你是一位资深的新媒体运营专家和热点分析师。
你的任务是对微博热搜话题进行深入分析，给出有洞察力的见解。

分析要求：
1. 总结今天的热点趋势：这些热搜反映了什么社会情绪或关注点？
2. 指出最值得关注的话题：哪些话题最有讨论价值？为什么？
3. 给出分析洞察：这些热点背后的深层原因或趋势是什么？

回复格式要求：
- 语言风格：专业但不枯燥，通俗有深度
- 使用中文回复
- 适当使用小标题和分段，让内容易读
- 不需要客套话，直接给出分析内容"""

    def analyze(self, hot_list: list[dict]) -> str:
        """
        分析热搜榜单（对外主方法）

        参数：
            hot_list: 微博热搜列表，格式：
                [
                    {"rank": 1, "title": "标题", "hot": "500万", "tag": "爆"},
                    ...
                ]

        返回：
            分析结果的文本（Markdown 格式）
        """
        # 把热搜列表整理成 AI 容易理解的文本格式
        hot_topics_text = self._format_topics_for_prompt(hot_list)

        # 构建用户消息：把热搜数据发给 AI
        user_message = f"""以下是今天微博热搜榜单的前{len(hot_list)}条话题：

{hot_topics_text}

请对以上热点话题进行分析。"""

        print("🤖 正在调用 DeepSeek 分析热点...")

        try:
            # =================================================================
            # 调用 DeepSeek API
            #
            # 参数说明：
            #   model        — 模型名称
            #   messages     — 对话消息列表
            #   temperature  — 创造性（0-2），0.7 在创意和准确间取得平衡
            #   max_tokens   — 最大输出 token 数
            # =================================================================
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=2000,
            )

            # 从响应中提取 AI 回复的文本内容
            # response.choices[0].message.content 是标准的 OpenAI 响应格式
            analysis = response.choices[0].message.content

            print("✅ DeepSeek 分析完成\n")
            return analysis

        except Exception as e:
            error_msg = f"DeepSeek API 调用失败: {e}"
            print(f"❌ {error_msg}")
            return error_msg

    def _format_topics_for_prompt(self, hot_list: list[dict]) -> str:
        """
        把热搜列表格式化成 AI 更容易理解的文本

        参数：
            hot_list: 原始热搜列表

        返回：
            格式化后的文本
        """
        lines = []
        for item in hot_list:
            rank = item["rank"]
            title = item["title"]
            hot = item["hot"]
            tag = item.get("tag", "")

            tag_str = f" [{tag}]" if tag else ""
            lines.append(f"{rank}. {title}{tag_str}（热度：{hot}）")

        return "\n".join(lines)


# ======================================================================
# 测试代码
# ======================================================================
if __name__ == "__main__":
    # 测试数据
    test_data = [
        {"rank": 1, "title": "测试热点话题", "hot": "500万", "tag": "爆"},
        {"rank": 2, "title": "另一个热门话题", "hot": "300万", "tag": "沸"},
    ]

    analyzer = DeepSeekAnalyzer()
    result = analyzer.analyze(test_data)
    print(result)
