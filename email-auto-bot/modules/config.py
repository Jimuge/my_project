"""
配置管理模块

功能：
  从 .env 文件中读取邮箱、AI、自动回复等配置信息

用法：
  from modules.config import Config
  imap_server = Config.IMAP_SERVER

新手须知：
  - .env 文件保存敏感信息（邮箱授权码、API 密钥等），不要提交到 Git
  - 所有配置集中在这里管理，其他地方只需要引用 Config.xxx
  - 修改配置后需要重启程序才能生效
"""

import os
from pathlib import Path

from dotenv import load_dotenv


class Config:
    """
    配置类 —— 所有配置项集中管理

    使用类变量（而不是实例变量），所以可以直接通过 Config.xxx 访问，
    不需要先创建对象。
    """

    # ------------------------------------------------------------------
    # 1. 项目根目录 & 环境变量加载
    # ------------------------------------------------------------------
    # __file__ 是当前文件（config.py）的路径
    # .parent.parent 就是项目的根目录（modules/ 的上一级）
    ROOT_DIR = Path(__file__).resolve().parent.parent

    # 加载项目根目录下的 .env 文件
    load_dotenv(dotenv_path=ROOT_DIR / ".env", override=True)

    # ------------------------------------------------------------------
    # 2. POP3 配置（收邮件）
    # ------------------------------------------------------------------
    # 163 邮箱的 POP3 服务器地址和端口
    # 163 对 IMAP 有限制，所以改用 POP3
    POP3_SERVER = os.getenv("POP3_SERVER", "pop.163.com")
    POP3_PORT = int(os.getenv("POP3_PORT", "995"))

    # 邮箱账号和授权码
    POP3_USER = os.getenv("POP3_USER", "")
    POP3_PASSWORD = os.getenv("POP3_PASSWORD", "")

    # ------------------------------------------------------------------
    # 3. SMTP 配置（发邮件）
    # ------------------------------------------------------------------
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.163.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

    # ------------------------------------------------------------------
    # 4. DeepSeek AI 配置（生成回复内容）
    # ------------------------------------------------------------------
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # ------------------------------------------------------------------
    # 5. 自动回复规则
    # ------------------------------------------------------------------
    # 回复模式：whitelist（仅回复白名单） 或 all（回复所有邮件）
    REPLY_MODE = os.getenv("REPLY_MODE", "whitelist")

    # 白名单列表（从逗号分隔的字符串转换成 Python 列表）
    _whitelist_str = os.getenv("REPLY_WHITELIST", "")

    @classmethod
    def get_whitelist(cls) -> list[str]:
        """
        获取白名单邮箱列表

        把 .env 中用逗号分隔的邮箱字符串，转换成 Python 列表。
        同时去除多余的空格和空字符串。

        返回：
            例如 ["friend@163.com", "boss@company.com"]
        """
        if not cls._whitelist_str:
            return []
        # 按逗号分割 → 去除每个邮箱两边的空格 → 过滤掉空字符串
        return [
            email.strip()
            for email in cls._whitelist_str.split(",")
            if email.strip()
        ]

    # AI 人设（告诉 AI 以什么身份回复）
    AI_PERSONA = os.getenv("AI_PERSONA", "你是一个友好的智能客服助手")

    # 检查邮件的间隔时间（秒）
    CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "60"))

    # ------------------------------------------------------------------
    # 6. 已回复日志文件
    # ------------------------------------------------------------------
    # 用于记录哪些邮件已经回复过，防止重复回复
    REPLIED_LOG_PATH = ROOT_DIR / "replied_log.json"

    # ------------------------------------------------------------------
    # 7. 有效性检查
    # ------------------------------------------------------------------
    @classmethod
    def validate(cls) -> list[str]:
        """
        检查必填配置是否都已填写

        返回：
            缺失配置项的提示信息列表，如果全部正常则返回空列表
        """
        errors = []

        checks = {
            "POP3_USER": "POP3 邮箱账号",
            "POP3_PASSWORD": "POP3 授权码",
            "SMTP_USER": "SMTP 邮箱账号",
            "SMTP_PASSWORD": "SMTP 授权码",
            "DEEPSEEK_API_KEY": "DeepSeek API 密钥",
        }

        for key, name in checks.items():
            if not getattr(cls, key):
                errors.append(f"❌ {name} 未配置，请在 .env 文件中设置 {key}")

        # 检查白名单模式必须要有白名单
        if cls.REPLY_MODE == "whitelist" and not cls.get_whitelist():
            errors.append(
                "❌ 白名单模式（REPLY_MODE=whitelist）下，"
                "请在 .env 中设置 REPLY_WHITELIST"
            )

        return errors
