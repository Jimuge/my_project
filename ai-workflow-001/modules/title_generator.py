"""
标题生成模块

功能：
  基于 DeepSeek 的热点分析结果，生成 3 个吸引眼球的标题
  这些标题可以用于视频、文章或社交媒体发布

用法：
  from modules.title_generator import TitleGenerator
  generator = TitleGenerator()
  titles = generator.generate_titles(analysis_result)

新手须知：
  - 标题生成本质上也是调用 DeepSeek API，但用不同的提示词
  - 这样可以复用 deepseek_analyzer 的客户端配置
  - 生成多个标题可以 A/B 测试哪个效果更好
"""

from openai import OpenAI

from modules.config import Config


class TitleGenerator:
    """
    标题生成器

    使用方式：
        gen = TitleGenerator()
        titles = gen.generate_titles(analysis_text)
        # 返回示例：
        # [
        #     "标题1：xxx",
        #     "标题2：xxx",
        #     "标题3：xxx",
        # ]
    """

    # =================================================================
    # 标题风格模板
    #
    # 类变量，定义了 3 种不同的标题风格模板
    # AI 会根据模板格式来生成相应风格的标题
    # =================================================================

    # 风格 1：悬念/好奇型 — 让人想点进去看
    STYLE_CURIOUS = "好奇探索型：制造悬念，引发好奇心，让人想点击了解详情"

    # 风格 2：观点/态度型 — 表达鲜明立场
    STYLE_OPINION = "观点态度型：有鲜明的立场和态度，引发共鸣或讨论"

    # 风格 3：实用/总结型 — 提供价值感
    STYLE_UTILITY = "实用总结型：总结现象本质，给人收获感和价值感"

    # 所有风格列表
    STYLES = [STYLE_CURIOUS, STYLE_OPINION, STYLE_UTILITY]

    def __init__(self):
        """初始化：复用 DeepSeek 客户端"""
        self.client = OpenAI(
            api_key=Config.DEEPSEEK_API_KEY,
            base_url=Config.DEEPSEEK_BASE_URL,
        )
        self.model = Config.DEEPSEEK_MODEL

        # 系统提示词：定义标题专家的角色
        self.system_prompt = """你是一位顶尖的标题创作专家。
你的专长是根据热点分析内容，创作出高点击率、高传播性的标题。

核心原则：
1. 标题要抓住眼球，但不要标题党（内容要与标题相符）
2. 每篇标题控制在 15-30 字之间
3. 适当使用数字、对比、反问等手法增加吸引力
4. 风格要匹配当前的新媒体传播环境

注意：只输出标题本身，不需要序号、不需要解释、不需要额外内容。"""

    def generate_titles(self, analysis_text: str) -> list[str]:
        """
        生成 3 个不同风格的标题

        参数：
            analysis_text: DeepSeek 分析模块输出的分析文本

        返回：
            包含 3 个标题的列表，例如：
            ["今天的热搜暴露了一个真相...", "为什么大家都在讨论...", "从热搜看2024趋势..."]

            如果生成失败，返回错误提示列表
        """
        print("🎯 正在生成标题...")

        # 构建提示词：把分析结果和标题要求一起发给 AI
        user_message = f"""以下是一份微博热点分析报告，请根据它创作 3 个不同风格的标题：

--- 分析报告开始 ---
{analysis_text}
--- 分析报告结束 ---

请分别按照以下 3 种风格各创作 1 个标题（共 3 个）：

风格1：{self.STYLE_CURIOUS}
风格2：{self.STYLE_OPINION}
风格3：{self.STYLE_UTILITY}

每个标题一行，不要序号，直接输出标题内容。"""

        try:
            # 调用 DeepSeek API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.8,  # 标题创作可以稍微高一点温度，更有创意
                max_tokens=500,
            )

            # 获取 AI 回复的文本
            content = response.choices[0].message.content

            # 按行拆分，去掉空行，得到标题列表
            titles = [
                line.strip()
                for line in content.strip().split("\n")
                if line.strip()
            ]

            # 确保不超过 3 个
            titles = titles[:3]

            print(f"✅ 标题生成完成，共 {len(titles)} 个\n")
            for i, title in enumerate(titles, 1):
                print(f"  标题{i}: {title}")
            print()

            return titles

        except Exception as e:
            error_msg = f"标题生成失败: {e}"
            print(f"❌ {error_msg}")
            return [f"⚠️ 标题生成失败：{e}"]

    def generate_for_topic(
        self, analysis_text: str, custom_topic: str = ""
    ) -> list[str]:
        """
        基于特定话题方向生成标题

        参数：
            analysis_text: 分析文本
            custom_topic: 可选的自定义话题方向
                （比如"科技方向"、"娱乐方向"等）

        返回：
            标题列表
        """
        if not custom_topic:
            return self.generate_titles(analysis_text)

        print(f"🎯 正在生成（定向：{custom_topic}）标题...")

        user_message = f"""以下是一份微博热点分析报告：

{analysis_text}

请从「{custom_topic}」的角度出发，创作 3 个不同风格的标题：

风格1（好奇探索型）：{self.STYLE_CURIOUS}
风格2（观点态度型）：{self.STYLE_OPINION}
风格3（实用总结型）：{self.STYLE_UTILITY}

每个标题一行。"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.8,
                max_tokens=500,
            )

            content = response.choices[0].message.content
            titles = [
                line.strip()
                for line in content.strip().split("\n")
                if line.strip()
            ]

            return titles[:3]

        except Exception as e:
            print(f"❌ 定向标题生成失败: {e}")
            return []


# ======================================================================
# 测试代码
# ======================================================================
if __name__ == "__main__":
    test_analysis = """
## 今日热点趋势

今天的热搜主要集中在科技和娱乐领域。
某科技公司发布了新一代AI产品，引发广泛讨论。
同时一部新上映的电影口碑爆棚，票房创新高。
    """

    gen = TitleGenerator()
    titles = gen.generate_titles(test_analysis)
    for i, t in enumerate(titles, 1):
        print(f"{i}. {t}")
