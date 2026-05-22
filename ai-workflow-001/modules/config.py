"""
配置管理模块

功能：
  从 .env 文件中读取各种 API 密钥和配置信息

用法：
  from modules.config import Config
  api_key = Config.DEEPSEEK_API_KEY

新手须知：
  - .env 文件是用来保存敏感信息的（如 API 密钥），不要提交到 Git
  - 本项目根目录有一个 .env.example 模板文件，复制并重命名为 .env 即可
  - 所有配置集中在这里管理，其他地方只需要引用 Config.xxx
"""

import os
from pathlib import Path

# python-dotenv 库：用于从 .env 文件加载环境变量
# 不加这个也行，但我们需要从 .env 文件读取配置
from dotenv import load_dotenv


class Config:
    """
    配置类 —— 所有配置项集中管理

    使用类变量（而不是实例变量），所以可以直接通过 Config.xxx 访问，
    不需要先创建对象：Config().xxx ❌  vs  Config.xxx ✅
    """

    # ------------------------------------------------------------------
    # 1. 项目根目录 & 环境变量加载
    # ------------------------------------------------------------------
    # __file__ 是当前文件（config.py）的路径
    # Path(__file__).resolve() 获取绝对路径
    # .parent.parent 就是项目的根目录（因为 config.py 在 modules/ 下）
    ROOT_DIR = Path(__file__).resolve().parent.parent

    # 加载项目根目录下的 .env 文件
    # override=True 表示如果系统环境变量已存在，也强制用 .env 里的值覆盖
    load_dotenv(dotenv_path=ROOT_DIR / ".env", override=True)

    # ------------------------------------------------------------------
    # 2. DeepSeek API 配置
    # ------------------------------------------------------------------
    # DeepSeek 官方 API 地址（兼容 OpenAI 格式）
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # ------------------------------------------------------------------
    # 3. SiliconFlow API 配置（用于 AI 生成配图）
    # ------------------------------------------------------------------
    SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
    SILICONFLOW_BASE_URL = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    # 图片生成模型：Kolors（快手可图），中文理解能力强
    SILICONFLOW_IMAGE_MODEL = os.getenv("SILICONFLOW_IMAGE_MODEL", "Kwai-Kolors/Kolors")
    # 图片尺寸
    IMAGE_SIZE = os.getenv("IMAGE_SIZE", "1024x1024")

    # ------------------------------------------------------------------
    # 4. 邮件（SMTP）配置
    # ------------------------------------------------------------------
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.163.com")      # SMTP 服务器地址
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))              # SMTP 端口（SSL 一般是 465）
    SMTP_USER = os.getenv("SMTP_USER", "")                      # 发件人邮箱地址
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")               # SMTP 授权码（不是邮箱登录密码！）
    TO_EMAIL = os.getenv("TO_EMAIL", "")                         # 收件人邮箱地址

    # ------------------------------------------------------------------
    # 5. 微博热搜配置
    # ------------------------------------------------------------------
    # 抓取多少条热搜进行分析（太多的话 token 消耗大，太少没意义）
    HOT_TOP_COUNT = int(os.getenv("HOT_TOP_COUNT", "15"))
    # 微博热搜 API 地址（Weibo 官方的非公开接口）
    WEIBO_HOT_URL = os.getenv(
        "WEIBO_HOT_URL",
        "https://weibo.com/ajax/side/hotSearch"
    )

    # ------------------------------------------------------------------
    # 6. 有效性检查
    # ------------------------------------------------------------------
    @classmethod
    def validate(cls) -> list[str]:
        """
        检查必填配置是否都已填写

        返回：
            缺失配置项的提示信息列表，如果全部正常则返回空列表

        用法：
            errors = Config.validate()
            if errors:
                for err in errors:
                    print(err)
                exit(1)
        """
        errors = []

        # 逐一检查必填项
        checks = {
            "DEEPSEEK_API_KEY": "DeepSeek API 密钥",
            "SILICONFLOW_API_KEY": "SiliconFlow API 密钥",
            "SMTP_USER": "发件人邮箱",
            "SMTP_PASSWORD": "SMTP 授权码",
            "TO_EMAIL": "收件人邮箱",
        }

        for key, name in checks.items():
            if not getattr(cls, key):
                errors.append(f"❌ {name}未配置，请在 .env 文件中设置 {key}")

        return errors
