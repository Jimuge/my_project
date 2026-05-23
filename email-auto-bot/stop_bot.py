#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
停止邮箱自动回复机器人

用法：
  双击运行，或在终端执行：python stop_bot.py

原理：
  读取 main.py 启动时生成的 bot.pid 文件，
  找到对应的进程并终止它。
"""

import os
import signal
import sys
from pathlib import Path


def stop_bot():
    """通过 PID 文件停止机器人进程"""
    print("🛑 正在停止邮箱自动回复机器人...")

    # PID 文件路径（和 main.py 同目录）
    pid_file = Path(__file__).resolve().parent / "bot.pid"

    if not pid_file.exists():
        print("❌ 没有找到正在运行的机器人进程（bot.pid 不存在）")
        print("   可能原因：机器人没有在运行，或上次没有正常退出")
        return

    # 读取 PID
    try:
        with open(pid_file, "r") as f:
            pid_str = f.read().strip()
            pid = int(pid_str)
    except (ValueError, IOError):
        print("❌ PID 文件损坏，尝试强制终止所有 Python 进程...")
        _force_kill_all()
        return

    # 检查进程是否存在
    if not _is_process_running(pid):
        print(f"ℹ️ 进程 {pid} 已不存在（可能已经退出了）")
        pid_file.unlink(missing_ok=True)
        return

    # 终止进程
    try:
        if sys.platform == "win32":
            os.system(f"taskkill /F /PID {pid} >nul 2>nul")
        else:
            os.kill(pid, signal.SIGKILL)

        print(f"✅ 已终止进程 {pid}，机器人已停止")

        # 清理 PID 文件
        pid_file.unlink(missing_ok=True)

    except ProcessLookupError:
        print(f"ℹ️ 进程 {pid} 已不存在")
        pid_file.unlink(missing_ok=True)
    except Exception as e:
        print(f"❌ 终止失败: {e}")
        print("   尝试强制终止所有 Python 进程...")
        _force_kill_all()


def _is_process_running(pid: int) -> bool:
    """检查指定 PID 的进程是否在运行"""
    if sys.platform == "win32":
        result = os.system(f"tasklist /FI \"PID eq {pid}\" 2>nul | findstr {pid} >nul")
        return result == 0
    else:
        try:
            os.kill(pid, 0)
            return True
        except (ProcessLookupError, PermissionError):
            return False


def _force_kill_all():
    """暴力模式：杀掉所有 main.py 相关进程"""
    if sys.platform == "win32":
        # 用 wmic 找到包含 main.py 的 python 进程
        result = os.popen(
            'wmic path win32_process where "name=\'python.exe\'" get ProcessId,CommandLine 2>nul'
        ).read()

        killed = 0
        for line in result.split("\n"):
            if "main.py" in line and "stop_bot" not in line:
                parts = line.strip().split()
                if parts:
                    try:
                        pid = int(parts[-1])
                        os.system(f"taskkill /F /PID {pid} >nul 2>nul")
                        killed += 1
                    except ValueError:
                        pass

        if killed > 0:
            print(f"✅ 已强制终止 {killed} 个机器人进程")
        else:
            print("ℹ️ 没有找到运行中的机器人进程")
    else:
        result = os.popen('ps aux | grep "main.py" | grep -v grep | grep -v stop_bot').read()
        if result.strip():
            for line in result.strip().split("\n"):
                parts = line.split()
                if len(parts) > 1:
                    pid = parts[1]
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                    except (ProcessLookupError, ValueError):
                        pass
            print("✅ 已强制终止所有机器人进程")
        else:
            print("ℹ️ 没有找到运行中的机器人进程")


if __name__ == "__main__":
    stop_bot()

    # 暂停一下，让用户看到结果
    if sys.platform == "win32":
        input("\n按回车键退出...")
