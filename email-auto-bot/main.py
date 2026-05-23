#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能邮件自动回复系统 — 主程序入口

功能：
  像智能客服一样自动回复特定发件人的邮件

工作流程：
  1️⃣ 连接到邮箱检查未读邮件
  2️⃣ 判断发件人是否在白名单中（或是否设置为回复所有人）
  3️⃣ 检查是否已经回复过这封邮件（避免重复回复）
  4️⃣ 用 DeepSeek AI 分析邮件内容并生成合适的回复
  5️⃣ 自动发送回复邮件
  6️⃣ 记录已回复的邮件 ID，下次不再重复回复

用法：
  python main.py              # 执行一次，检查并回复新邮件后退出
  python main.py --watch      # 持续监控模式，每隔一段时间自动检查
  python main.py --interval 120  # 配合 --watch，设置检查间隔（秒）

新手须知：
  - 第 1 次使用前，先把 .env.example 复制为 .env，填上授权码等配置
  - 运行前执行：pip install -r requirements.txt
  - --watch 模式会一直运行，按 Ctrl+C 可以停止
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# Windows 兼容：解决控制台编码报错问题
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from modules.config import Config
from modules.email_watcher import EmailWatcher
from modules.ai_responder import AIResponder
from modules.email_sender import EmailSender


# ======================================================================
# 已回复邮件日志管理
#
# 用 JSON 文件记录已经回复过的邮件 ID，防止重复回复。
# 每次启动时加载，回复后立即保存。
# ======================================================================

def load_replied_log(log_path: Path) -> set:
    """
    加载已回复邮件的记录

    从 JSON 文件中读取已回复的邮件 ID 列表，转换成 Python 集合。
    集合（set）的查找速度比列表（list）快很多。

    参数：
        log_path: JSON 日志文件的路径

    返回：
        包含已回复邮件 ID 的集合
    """
    if not log_path.exists():
        return set()

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # 确保数据是一个列表
        if isinstance(data, list):
            return set(data)
        return set()
    except (json.JSONDecodeError, IOError):
        # 文件损坏了就重新开始
        return set()


def save_replied_log(log_path: Path, replied_ids: set):
    """
    保存已回复邮件的记录

    把集合转换成列表，写入 JSON 文件。

    参数：
        log_path:     JSON 日志文件的路径
        replied_ids:  已回复的邮件 ID 集合
    """
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(list(replied_ids), f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f"  ⚠️ 无法保存回复记录: {e}")


# ======================================================================
# 参数解析
# ======================================================================

def parse_args() -> argparse.Namespace:
    """
    解析命令行参数

    允许用户通过命令行控制程序行为。
    """
    parser = argparse.ArgumentParser(
        description="🤖 智能邮件自动回复系统 — DeepSeek AI 自动回复邮件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例：
  python main.py                # 执行一次，检查并回复后退出
  python main.py --watch        # 持续监控，每隔 60 秒检查一次
  python main.py --watch --interval 120  # 每 120 秒检查一次
  python main.py --dry-run      # 仅检查，不实际发送回复
        """,
    )

    parser.add_argument(
        "--watch",
        action="store_true",
        help="持续监控模式，每隔一段时间自动检查新邮件",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=Config.CHECK_INTERVAL,
        help=f"检查间隔（秒，默认 {Config.CHECK_INTERVAL}）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="模拟运行：检查邮件但不实际发送回复",
    )
    parser.add_argument(
        "--max-emails",
        type=int,
        default=10,
        help="每次最多处理多少封新邮件（默认 10）",
    )

    return parser.parse_args()


# ======================================================================
# 核心逻辑：检查并回复邮件
# ======================================================================

def check_and_reply(
    watcher: EmailWatcher,
    responder: AIResponder,
    sender: EmailSender,
    replied_ids: set,
    log_path: Path,
    max_emails: int,
    dry_run: bool,
) -> int:
    """
    检查新邮件并自动回复

    这是整个程序的核心函数，完成以下步骤：
      1. 获取未读邮件
      2. 筛选出需要回复的邮件（白名单、未回复过）
      3. 对每封邮件用 AI 生成回复
      4. 发送回复
      5. 记录已回复的邮件 ID

    参数：
        watcher:     邮件监控器
        responder:   AI 回复生成器
        sender:      邮件发送器
        replied_ids: 已回复邮件 ID 集合
        log_path:    日志文件路径
        max_emails:  最多处理多少封邮件
        dry_run:     是否为模拟运行模式

    返回：
        本次成功回复的邮件数量
    """
    now = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{now}] 🔍 开始检查邮件...")

    # ----------------------------------------------------------------
    # 步骤 1：获取未读邮件
    # ----------------------------------------------------------------
    emails = watcher.fetch_new_emails(max_count=max_emails)

    if not emails:
        return 0

    # ----------------------------------------------------------------
    # 步骤 2：筛选需要回复的邮件
    # ----------------------------------------------------------------
    reply_count = 0

    for email_info in emails:
        print(f"\n  📧 发件人: {email_info.sender}")
        print(f"  📝 主题: {email_info.subject}")

        # ----------------------------------------------------------------
        # 步骤 2a：检查是否已回复过
        # ----------------------------------------------------------------
        if email_info.message_id in replied_ids:
            print(f"  ⏭️ 已回复过，跳过")
            continue

        # ----------------------------------------------------------------
        # 步骤 2b：检查发件人是否在白名单中（whitelist 模式）
        # ----------------------------------------------------------------
        if Config.REPLY_MODE == "whitelist":
            whitelist = Config.get_whitelist()
            # 转为小写比较，避免大小写不一致的问题
            sender_lower = email_info.sender.lower()
            if not any(w.lower() == sender_lower for w in whitelist):
                print(f"  ⏭️ 发件人不在白名单中，跳过")
                continue

        # ----------------------------------------------------------------
        # 步骤 3：用 AI 生成回复
        # ----------------------------------------------------------------
        reply_text = responder.generate_reply(
            sender_email=email_info.sender,
            sender_name=None,
            subject=email_info.subject,
            body=email_info.body_text,
        )

        if not reply_text:
            print(f"  ⚠️ AI 回复生成失败，跳过此邮件")
            continue

        # 打印回复预览
        print(f"\n  📋 回复预览:")
        for line in reply_text.split("\n")[:5]:
            print(f"    │ {line}")
        if reply_text.count("\n") > 5:
            print(f"    │ ...（共 {len(reply_text)} 字）")

        # ----------------------------------------------------------------
        # 步骤 4：发送回复
        # ----------------------------------------------------------------
        if dry_run:
            print(f"  🏃 模拟模式（--dry-run），不实际发送")
            # 模拟模式下也标记为已回复，方便调试
            replied_ids.add(email_info.message_id)
            reply_count += 1
            continue

        # 构建回复邮件的主题（在原主题前加 Re:）
        if email_info.subject.startswith("Re:"):
            reply_subject = email_info.subject
        else:
            reply_subject = f"Re: {email_info.subject}"

        success = sender.send_reply(
            to_email=email_info.sender,
            subject=reply_subject,
            reply_body=reply_text,
            in_reply_to=email_info.message_id,
        )

        if success:
            replied_ids.add(email_info.message_id)
            reply_count += 1

    # ----------------------------------------------------------------
    # 步骤 5：保存已回复记录
    # ----------------------------------------------------------------
    if reply_count > 0:
        save_replied_log(log_path, replied_ids)

    print(f"\n  📊 本轮共回复 {reply_count} 封邮件")
    return reply_count


# ======================================================================
# 主函数
# ======================================================================

def main():
    """
    主函数 — 编排整个工作流程

    工作模式：
      - 一次模式（默认）：检查一次邮件，回复后退出
      - 监控模式（--watch）：持续循环检查
    """

    # ----------------------------------------------------------------
    # 0. 初始化
    # ----------------------------------------------------------------
    args = parse_args()

    # 保存当前进程的 PID，供 stop_bot.py 使用
    _save_pid()

    print()
    print("╔══════════════════════════════════════════╗")
    print("║     🤖 智能邮件自动回复系统               ║")
    print("║     收件 → AI 分析 → 自动回复              ║")
    print("╚══════════════════════════════════════════╝")
    print()

    # 检查配置是否完整
    errors = Config.validate()
    if errors:
        print("❌ 配置检查未通过：")
        for err in errors:
            print(f"  {err}")
        print("\n💡 请复制 .env.example 为 .env，并填写真实信息")
        sys.exit(1)

    # 显示当前配置摘要
    print(f"📌 邮箱: {Config.POP3_USER}")
    print(f"📌 回复模式: {Config.REPLY_MODE}")
    if Config.REPLY_MODE == "whitelist":
        whitelist = Config.get_whitelist()
        print(f"📌 白名单: {', '.join(whitelist)}")
    if args.dry_run:
        print(f"🏃 模拟模式（dry-run）：不会实际发送邮件")
    if args.watch:
        print(f"🔄 监控模式：每隔 {args.interval} 秒检查一次")
    print()

    # ----------------------------------------------------------------
    # 1. 初始化各模块
    # ----------------------------------------------------------------
    watcher = EmailWatcher(
        server=Config.POP3_SERVER,
        port=Config.POP3_PORT,
        user=Config.POP3_USER,
        password=Config.POP3_PASSWORD,
    )

    responder = AIResponder(
        api_key=Config.DEEPSEEK_API_KEY,
        base_url=Config.DEEPSEEK_BASE_URL,
        model=Config.DEEPSEEK_MODEL,
        persona=Config.AI_PERSONA,
    )

    sender = EmailSender(
        server=Config.SMTP_SERVER,
        port=Config.SMTP_PORT,
        user=Config.SMTP_USER,
        password=Config.SMTP_PASSWORD,
    )

    # 加载已回复记录
    replied_ids = load_replied_log(Config.REPLIED_LOG_PATH)
    if replied_ids:
        print(f"📋 已加载 {len(replied_ids)} 条已回复记录\n")

    # ----------------------------------------------------------------
    # 2. 执行检查与回复
    # ----------------------------------------------------------------
    if args.watch:
        # ==============================================================
        # 监控模式：不断循环检查
        # ==============================================================
        print("🔄 进入监控模式，按 Ctrl+C 停止\n")
        try:
            while True:
                check_and_reply(
                    watcher=watcher,
                    responder=responder,
                    sender=sender,
                    replied_ids=replied_ids,
                    log_path=Config.REPLIED_LOG_PATH,
                    max_emails=args.max_emails,
                    dry_run=args.dry_run,
                )
                print(f"\n⏳ 等待 {args.interval} 秒后再次检查...")
                print("-" * 50)
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n\n🛑 已停止监控")
    else:
        # ==============================================================
        # 一次模式：执行一次后退出
        # ==============================================================
        check_and_reply(
            watcher=watcher,
            responder=responder,
            sender=sender,
            replied_ids=replied_ids,
            log_path=Config.REPLIED_LOG_PATH,
            max_emails=args.max_emails,
            dry_run=args.dry_run,
        )

    print("\n✅ 执行完毕！\n")

    # 程序结束，清理 PID 文件
    _clean_pid()


# ======================================================================
# PID 文件管理（给 stop_bot.py 用的）
# ======================================================================
PID_FILE = Path(__file__).resolve().parent / "bot.pid"


def _save_pid():
    """把当前进程 ID 写入 bot.pid，方便 stop_bot.py 定位进程"""
    try:
        with open(PID_FILE, "w") as f:
            f.write(str(os.getpid()))
    except IOError:
        pass


def _clean_pid():
    """删除 PID 文件"""
    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
    except IOError:
        pass


# ======================================================================
# 入口
# ======================================================================
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 用户手动停止")
        _clean_pid()
    except Exception as e:
        print(f"\n❌ 程序异常: {e}")
        import traceback
        traceback.print_exc()
        _clean_pid()
    finally:
        if sys.platform == "win32":
            # 在监控模式下，不需要按回车退出
            pass
