#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 热点分析 Workflow — 主程序入口

工作流程：
  1️⃣ 抓取微博热搜榜单
  2️⃣ DeepSeek 分析热点趋势
  3️⃣ 生成 3 个不同风格的标题
  4️⃣ SiliconFlow 为每个标题生成配图
  5️⃣ 将分析报告 + 标题 + 配图发到你的邮箱

用法：
  python main.py                    # 执行完整的流程
  python main.py --skip-image       # 跳过图片生成（省 token/费用）
  python main.py --skip-email       # 跳过邮件发送（仅本地查看）
  python main.py --count 10         # 只抓取前 10 条热搜

新手须知：
  - 第 1 次使用前，先复制 .env.example 为 .env，然后填上你的 API Key
  - 运行前执行：pip install -r requirements.txt
  - 如果某个步骤失败，程序会跳过它继续执行后面的步骤
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

# =====================================================================
# Windows 兼容：解决双击运行时控制台编码报错问题
# 不加这行的话，打印 emoji（🔥✅❌）在 GBK 编码的终端会崩溃
# =====================================================================
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# =====================================================================
# 导入自定义模块
# =====================================================================
# 每个模块都封装了独立的功能，互相之间低耦合
from modules.config import Config
from modules.weibo_scraper import WeiboScraper
from modules.deepseek_analyzer import DeepSeekAnalyzer
from modules.title_generator import TitleGenerator
from modules.image_generator import ImageGenerator
from modules.email_sender import EmailSender


def parse_args() -> argparse.Namespace:
    """
    解析命令行参数

    这样用户可以通过命令行选项控制程序行为，不用改代码
    """
    parser = argparse.ArgumentParser(
        description="🔥 AI 热点分析 Workflow — 抓取热搜 → AI分析 → 生成标题 → 配图 → 发邮件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例：
  python main.py                    # 完整运行
  python main.py --skip-image       # 跳过图片生成
  python main.py --count 5          # 只分析前 5 条热搜
  python main.py --skip-image --skip-email  # 仅分析，不生成图片不发邮件
        """,
    )

    parser.add_argument(
        "--count",
        type=int,
        default=Config.HOT_TOP_COUNT,
        help=f"分析的热搜条数（默认: {Config.HOT_TOP_COUNT}）",
    )
    parser.add_argument(
        "--skip-image",
        action="store_true",
        help="跳过图片生成步骤",
    )
    parser.add_argument(
        "--skip-email",
        action="store_true",
        help="跳过邮件发送步骤",
    )
    parser.add_argument(
        "--output-dir",
        default="output_images",
        help="图片输出目录（默认: output_images）",
    )

    return parser.parse_args()


def print_banner():
    """打印启动横幅"""
    banner = """
╔══════════════════════════════════════════╗
║     🔥 AI 热点分析 Workflow             ║
║     微博热搜 → DeepSeek分析 → 配图 → 邮件    ║
╚══════════════════════════════════════════╝
    """
    print(banner)


def print_separator(title: str):
    """打印分隔线，让流程更清晰"""
    width = 56
    print()
    print("=" * width)
    print(f"  {title}")
    print("=" * width)


def main():
    """
    主函数 — 编排整个工作流程

    这是"编排层"（orchestration layer），
    它不负责具体实现，而是像导演一样调度各个模块协同工作。

    流程：
      Step 1: 抓取微博热搜
      Step 2: DeepSeek AI 分析
      Step 3: 生成 3 个标题
      Step 4: 生成配图（可跳过）
      Step 5: 发送邮件（可跳过）
    """
    # ----------------------------------------------------------------
    # 0. 初始化
    # ----------------------------------------------------------------
    args = parse_args()
    print_banner()

    # 检查配置是否完整
    errors = Config.validate()
    if errors:
        print("❌ 配置检查未通过：")
        for err in errors:
            print(f"  {err}")
        print("\n💡 请复制 .env.example 为 .env，并填写真实的 API Key 和邮箱信息")
        sys.exit(1)

    # 更新热搜条数（如果命令行指定了）
    if args.count != Config.HOT_TOP_COUNT:
        print(f"📌 分析条数: {args.count}（命令行指定）")
    else:
        print(f"📌 分析条数: {Config.HOT_TOP_COUNT}（默认）")

    # 用于在各步骤之间传递数据的变量
    hot_list = []           # 热搜列表
    analysis_text = ""      # AI 分析结果
    titles = []             # 生成的标题
    image_paths = []        # 生成的配图路径

    # ----------------------------------------------------------------
    # Step 1: 抓取微博热搜
    # ----------------------------------------------------------------
    print_separator("Step 1/5  微博热搜抓取")

    scraper = WeiboScraper()
    hot_list = scraper.get_hot_search()

    if not hot_list:
        print("❌ 没有获取到热搜数据，程序终止")
        sys.exit(1)

    # 打印热搜榜单
    print(scraper.get_formatted_text(hot_list))

    # ----------------------------------------------------------------
    # Step 2: DeepSeek AI 分析热点
    # ----------------------------------------------------------------
    print_separator("Step 2/5  DeepSeek AI 热点分析")

    analyzer = DeepSeekAnalyzer()
    analysis_text = analyzer.analyze(hot_list)

    if not analysis_text or analysis_text.startswith("DeepSeek API 调用失败"):
        print("⚠️ 分析失败，尝试继续执行后续步骤...")
        analysis_text = "今日热点分析暂时不可用。"

    print(analysis_text)

    # ----------------------------------------------------------------
    # Step 3: 生成 3 个标题
    # ----------------------------------------------------------------
    print_separator("Step 3/5  生成推荐标题")

    title_gen = TitleGenerator()
    titles = title_gen.generate_titles(analysis_text)

    if not titles:
        print("⚠️ 标题生成失败，使用默认标题")
        titles = [
            "今日热点洞察报告",
            "微博热搜趋势分析",
            "AI视角看热点",
        ]

    # ----------------------------------------------------------------
    # Step 4: 生成配图（可跳过）
    # ----------------------------------------------------------------
    print_separator("Step 4/5  AI 配图生成")

    if args.skip_image:
        print("⏭️ 已跳过图片生成（--skip-image）")
    else:
        img_gen = ImageGenerator()
        image_paths = img_gen.generate_multiple(
            titles=titles,
            analysis_text=analysis_text,
            output_dir=args.output_dir,
        )

        if image_paths:
            print(f"\n📸 共生成 {len(image_paths)} 张配图")
        else:
            print("\n⚠️ 没有生成任何配图")

    # ----------------------------------------------------------------
    # Step 5: 发送邮件（可跳过）
    # ----------------------------------------------------------------
    print_separator("Step 5/5  发送邮件")

    if args.skip_email:
        print("⏭️ 已跳过邮件发送（--skip-email）")
    else:
        sender = EmailSender()
        success = sender.send_report(
            analysis=analysis_text,
            titles=titles,
            image_paths=image_paths,
        )

        if not success:
            print("⚠️ 邮件发送失败，请检查配置")

    # ----------------------------------------------------------------
    # 完成
    # ----------------------------------------------------------------
    print()
    print("=" * 56)
    print("  ✅ 全部流程执行完毕！")
    print("=" * 56)
    print()
    print(f"  📊 分析热搜: {len(hot_list)} 条")
    print(f"  🏷️  生成标题: {len(titles)} 个")
    print(f"  📸 生成配图: {len(image_paths)} 张")
    if not args.skip_email:
        print(f"  📧 发送邮件: {Config.TO_EMAIL}")
    print()


# =====================================================================
# 入口
# =====================================================================
# Python 的惯用写法：
# 当直接运行 main.py 时，__name__ 等于 "__main__"，会执行下面的代码
# 当被其他文件 import 时，__name__ 不等于 "__main__"，不会自动执行
def pause_and_exit():
    """运行结束后暂停，防止双击时窗口一闪而过"""
    if sys.platform == "win32":
        input("\n按回车键退出...")
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ 程序异常: {e}")
    finally:
        pause_and_exit()
