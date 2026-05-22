"""
AI 配图生成模块

功能：
  调用 SiliconFlow API，根据标题生成配图
  SiliconFlow 是一个提供多种 AI 模型推理服务的平台

用法：
  from modules.image_generator import ImageGenerator
  gen = ImageGenerator()
  image_path = gen.generate_image("标题文本", "输出目录")

新手须知：
  - SiliconFlow 支持多种文生图模型，默认使用 Kolors（快手可图）
  - 需要先在 https://siliconflow.cn 注册并获取 API Key
  - 生成的图片保存在本地，文件名包含时间戳避免覆盖
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

# requests 用来发送 HTTP 请求调用 API
import requests

from modules.config import Config


class ImageGenerator:
    """
    AI 配图生成器

    使用方式：
        gen = ImageGenerator()
        # 生成一张图片，返回保存路径
        path = gen.generate_image("标题文本", "output_images")
        print(f"图片已保存到: {path}")
    """

    # 支持的图片尺寸（文生图模型常见的尺寸）
    SUPPORTED_SIZES = {
        "1024x1024",  # 正方形（默认）
        "1280x720",   # 16:9 横屏（适合封面图）
        "720x1280",   # 9:16 竖屏（适合手机壁纸/短视频封面）
    }

    def __init__(self):
        """
        初始化：验证配置
        """
        if not Config.SILICONFLOW_API_KEY:
            print("⚠️ 警告：SiliconFlow API Key 未配置，图片生成功能不可用")

    def generate_image(
        self,
        title: str,
        analysis_text: str = "",
        output_dir: str = "output_images",
    ) -> str | None:
        """
        根据标题生成一张配图

        参数：
            title:          标题文本，用作图片内容的核心依据
            analysis_text:  可选的分析文本，提供更多上下文
            output_dir:     图片保存目录（相对于项目根目录）

        返回：
            成功：图片文件的绝对路径
            失败：None

        流程：
            1. 用标题构建图片描述 prompt
            2. 调用 SiliconFlow API 生成图片
            3. 下载图片并保存到本地
        """
        # 确保输出目录存在
        output_path = Config.ROOT_DIR / output_dir
        output_path.mkdir(parents=True, exist_ok=True)

        # 用标题 + 分析来构建图片描述 prompt
        image_prompt = self._build_prompt(title, analysis_text)

        print(f"🎨 正在为标题生成配图...")
        print(f"  标题: {title[:50]}...")
        print(f"  Prompt: {image_prompt[:80]}...")

        try:
            # =================================================================
            # 步骤 1：调用 SiliconFlow API 生成图片
            #
            # API 文档：https://docs.siliconflow.cn/api-reference/images/generations
            # =================================================================
            image_url = self._call_siliconflow_api(image_prompt)

            if not image_url:
                print("❌ API 返回的图片 URL 为空")
                return None

            # =================================================================
            # 步骤 2：下载生成的图片到本地
            # =================================================================
            filename = f"hotopic_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.png"
            filepath = output_path / filename

            self._download_image(image_url, filepath)

            print(f"✅ 配图已保存: {filepath}\n")
            return str(filepath)

        except Exception as e:
            print(f"❌ 图片生成失败: {e}")
            return None

    def _build_prompt(self, title: str, analysis_text: str = "") -> str:
        """
        构建图片生成的 prompt

        把标题和分析文本转换成 AI 绘画模型能理解的描述

        参数：
            title:          标题
            analysis_text:  分析文本

        返回：
            图片 prompt 文本
        """
        # 基础风格设定 —— 确保图片风格统一、美观
        base_style = (
            "Digital art style, trending topic visualization, "
            "modern design, vibrant colors, high quality, 4K, "
            "clean composition, professional lighting"
        )

        # 从标题提取核心关键词
        # 标题通常在 30 字以内，直接用作主题
        prompt = f"Topic: {title}"

        # 如果有分析文本，提取前 100 字作为额外上下文
        if analysis_text:
            # 取分析文本的前 100 个字符
            context = analysis_text[:100].replace("\n", " ")
            prompt += f". Context: {context}"

        # 加上基础风格
        prompt += f". Style: {base_style}"

        # 如果 prompt 太长，截断到合理长度（多数模型支持 1000 token 以内）
        if len(prompt) > 800:
            prompt = prompt[:800]

        return prompt

    def _call_siliconflow_api(self, prompt: str) -> str | None:
        """
        调用 SiliconFlow 文生图 API

        参数：
            prompt: 图片描述文本

        返回：
            成功：生成的图片 URL
            失败：None
        """
        # 构建 API 请求 URL
        url = f"{Config.SILICONFLOW_BASE_URL}/images/generations"

        # 构建请求头
        headers = {
            "Authorization": f"Bearer {Config.SILICONFLOW_API_KEY}",
            "Content-Type": "application/json",
        }

        # 构建请求体
        payload = {
            "model": Config.SILICONFLOW_IMAGE_MODEL,
            "prompt": prompt,
            "n": 1,                     # 一次生成 1 张
            "size": Config.IMAGE_SIZE,   # 图片尺寸
        }

        # 发送 POST 请求
        # timeout=(连接超时, 读取超时) —— 图片生成可能较慢，给长一点
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=(10, 120),
        )

        # 检查响应状态
        response.raise_for_status()

        # 解析响应
        result = response.json()

        # SiliconFlow 返回格式：
        # {
        #   "images": [
        #     {"url": "https://...", ...}
        #   ]
        # }
        # 或
        # {
        #   "data": [
        #     {"url": "https://...", ...}
        #   ]
        # }
        images = result.get("images") or result.get("data") or []

        if images and len(images) > 0:
            return images[0].get("url") or images[0].get("url", "")

        return None

    def _download_image(self, url: str, filepath: Path):
        """
        从 URL 下载图片到本地

        参数：
            url:      图片 URL
            filepath: 保存路径（Path 对象）
        """
        # 发送 GET 请求下载图片
        response = requests.get(url, timeout=(10, 60))
        response.raise_for_status()

        # 以二进制写入文件
        # "wb" = write binary（二进制写入模式）
        with open(filepath, "wb") as f:
            f.write(response.content)

    def generate_multiple(
        self,
        titles: list[str],
        analysis_text: str = "",
        output_dir: str = "output_images",
    ) -> list[str]:
        """
        批量生成多个标题的配图

        参数：
            titles:         标题列表
            analysis_text:  分析文本
            output_dir:     图片保存目录

        返回：
            图片路径列表（生成失败的不会包含在内）
        """
        saved_paths = []

        for i, title in enumerate(titles, 1):
            print(f"\n--- 生成配图 {i}/{len(titles)} ---")
            path = self.generate_image(title, analysis_text, output_dir)
            if path:
                saved_paths.append(path)

        return saved_paths


# ======================================================================
# 测试代码
# ======================================================================
if __name__ == "__main__":
    gen = ImageGenerator()
    path = gen.generate_image("AI技术突破：人工智能改变世界", "科技领域的最新突破")
    if path:
        print(f"图片保存在: {path}")
    else:
        print("图片生成失败")
