"""
AI 智能回复生成模块

功能：
  使用 DeepSeek AI 分析收到的邮件内容，生成合适的回复文本

用法：
  from modules.ai_responder import AIResponder
  responder = AIResponder()
  reply = responder.generate_reply("邮件内容...", "客户询问产品价格")

新手须知：
  - DeepSeek 的 API 兼容 OpenAI 格式，所以用的是 openai 库
  - 给 AI 的"系统提示词"（system prompt）决定了 AI 的回复风格
  - API Key 从 .env 文件读取，通过 Config 类获取
"""

from openai import OpenAI


class AIResponder:
    """
    AI 回复生成器

    根据收到的邮件内容，用 DeepSeek AI 生成智能回复。
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        persona: str,
    ):
        """
        初始化 AI 回复生成器

        参数：
            api_key:  DeepSeek API 密钥
            base_url: DeepSeek API 地址
            model:    模型名称（如 "deepseek-chat"）
            persona:  AI 人设（如 "你是一个友好的智能客服助手"）
        """
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.persona = persona

    def generate_reply(
        self,
        sender_email: str,
        sender_name: str | None,
        subject: str,
        body: str,
    ) -> str | None:
        """
        根据收到的邮件内容，生成回复文本

        参数：
            sender_email: 发件人邮箱地址
            sender_name:  发件人名称（如果有的话）
            subject:      邮件主题
            body:         邮件正文

        返回：
            生成的回复文本，如果失败则返回 None
        """
        # ==============================================================
        # 步骤 1：构建 AI 的系统提示词
        #
        # 系统提示词（system prompt）告诉 AI 它的角色和任务
        # 这里根据用户配置的人设，加上详细的回复规则
        # ==============================================================
        system_prompt = f"""你是 {self.persona}。

你在处理一封需要回复的邮件。请根据邮件内容，生成一个回复邮件。

规则：
1. 回复要礼貌、专业、友好
2. 直接针对邮件中提到的问题或请求进行回复
3. 如有疑问先确认清楚，不要编造信息
4. 如果邮件是问候或闲聊，用友好的语气回应
5. 回复要简洁明了，不要啰嗦
6. 用中文回复
7. 只输出回复内容本身，不要加额外的说明、标题或前缀"""

        # ==============================================================
        # 步骤 2：构建用户消息（包含邮件原文）
        #
        # 把邮件原文嵌入到提示词中，让 AI 理解上下文
        # ==============================================================
        sender_display = sender_name or sender_email
        user_message = f"""以下是一封来自 {sender_display}（{sender_email}）的邮件，请根据内容生成回复。

邮件主题：{subject}

邮件正文：
{body}

---
请生成对这封邮件的回复。"""

        # ==============================================================
        # 步骤 3：调用 DeepSeek API
        # ==============================================================
        print(f"  🤖 AI 正在为「{sender_display}」的邮件生成回复...")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                # 温度设为 0.7，在稳定性和创造性之间取得平衡
                temperature=0.7,
                # 最大生成长度
                max_tokens=1024,
            )

            # 从响应中提取生成的文本
            reply_content = response.choices[0].message.content
            if reply_content:
                print("  ✅ AI 回复生成成功")
                return reply_content.strip()
            else:
                print("  ⚠️ AI 返回了空内容")
                return None

        except Exception as e:
            print(f"  ❌ DeepSeek API 调用失败: {e}")
            return None
