"""
邮件接收模块（POP3）

功能：
  连接邮箱的 POP3 服务器，获取最新邮件，并解析邮件内容

用法：
  from modules.email_watcher import EmailWatcher
  watcher = EmailWatcher()
  emails = watcher.fetch_new_emails()

新手须知：
  - POP3 是收邮件用的协议，SMTP 是发邮件用的
  - 163 邮箱的 POP3 服务器是 pop.163.com，端口 995（SSL）
  - 一封邮件可能有纯文本和 HTML 两种版本，我们优先取纯文本
  - 邮件内容可能用 GBK、GB2312、UTF-8 等不同编码，程序会自动处理
  - POP3 没有"已读/未读"的概念，我们通过记录已回复的 Message-ID 来去重
"""

import email
import poplib
import re
from email.header import decode_header
from email.message import Message


# ======================================================================
# EmailInfo：表示一封邮件的数据结构
# ======================================================================
class EmailInfo:
    """
    一封邮件的信息

    属性：
        message_id: 邮件的 Message-ID 头，全局唯一，用于去重
        sender:     发件人地址（例如 "someone@163.com"）
        subject:    邮件主题
        body_text:  邮件正文（纯文本格式）
        date:       邮件发送时间
        pop3_index: 邮件在 POP3 服务器上的编号
    """

    def __init__(
        self,
        message_id: str,
        sender: str,
        subject: str,
        body_text: str,
        date: str,
        pop3_index: int = 0,
    ):
        self.message_id = message_id
        self.sender = sender
        self.subject = subject
        self.body_text = body_text
        self.date = date
        self.pop3_index = pop3_index


class EmailWatcher:
    """
    邮件监控器

    负责连接 POP3 服务器、获取最新邮件、解析邮件内容。

    注意：
      - POP3 没有"未读"标志，所以每次都会获取邮箱里的邮件
      - 去重逻辑在 main.py 中通过 replied_log.json 实现
      - 我们只获取邮件头信息来初步筛选，避免下载大附件浪费流量
    """

    def __init__(self, server: str, port: int, user: str, password: str):
        """
        初始化邮件监控器

        参数：
            server:   POP3 服务器地址（如 "pop.163.com"）
            port:     POP3 端口（通常是 995）
            user:     邮箱账号
            password: 邮箱授权码
        """
        self.server = server
        self.port = port
        self.user = user
        self.password = password

    def fetch_new_emails(self, max_count: int = 10) -> list[EmailInfo]:
        """
        获取最新的邮件

        参数：
            max_count: 最多获取多少封最新邮件

        返回：
            EmailInfo 对象的列表，按时间从旧到新排列
            如果没有新邮件，返回空列表
        """
        print("📬 正在检查收件箱...")

        try:
            # ==============================================================
            # 步骤 1：连接 POP3 服务器
            # ==============================================================
            # POP3_SSL 使用 SSL 加密连接（端口 995）
            conn = poplib.POP3_SSL(self.server, self.port)
            conn.user(self.user)
            conn.pass_(self.password)

            # ==============================================================
            # 步骤 2：获取邮件列表
            # ==============================================================
            # stat() 返回 (邮件总数, 总字节数)
            msg_count, total_size = conn.stat()
            print(f"  📊 收件箱共有 {msg_count} 封邮件")

            if msg_count == 0:
                print("  📭 收件箱为空")
                conn.quit()
                return []

            # 只取最新的 max_count 封邮件
            # POP3 的编号从 1 开始，越大的编号越新
            start_index = max(1, msg_count - max_count + 1)
            target_indices = list(range(start_index, msg_count + 1))

            print(f"  📨 正在获取最近 {len(target_indices)} 封邮件...")

            # ==============================================================
            # 步骤 3：逐封获取邮件
            # ==============================================================
            emails = []
            for index in target_indices:
                email_info = self._fetch_single_email(conn, index)
                if email_info:
                    emails.append(email_info)

            conn.quit()

            # 按时间从旧到新排序（时间早的在前，晚的在后）
            emails.sort(key=lambda e: e.date)

            print(f"  ✅ 成功读取 {len(emails)} 封邮件")
            return emails

        except poplib.error_proto as e:
            print(f"  ❌ POP3 连接失败: {e}")
            print("     请检查邮箱账号和授权码是否正确")
            return []

        except Exception as e:
            print(f"  ❌ 读取邮件异常: {e}")
            return []

    def _fetch_single_email(
        self, conn: poplib.POP3_SSL, index: int
    ) -> EmailInfo | None:
        """
        获取并解析一封邮件的详细信息

        参数：
            conn:  POP3 连接对象
            index: 邮件的编号（从 1 开始）

        返回：
            解析好的 EmailInfo 对象，如果解析失败则返回 None
        """
        try:
            # ==============================================================
            # 步骤 1：获取邮件原始数据
            # ==============================================================
            # retr(index) 返回 (响应, 行列表, 字节数)
            # 每行是一个字节串
            resp, lines, octets = conn.retr(index)

            # 把各行重新拼成完整的原始邮件数据
            raw_email = b"\r\n".join(lines)

            # ==============================================================
            # 步骤 2：解析邮件
            # ==============================================================
            # email.parser 是 Python 内置模块，可以解析标准的邮件格式
            msg: Message = email.message_from_bytes(raw_email)

            # ==============================================================
            # 步骤 3：获取 Message-ID（邮件的全局唯一标识）
            # ==============================================================
            message_id = self._decode_header_str(msg.get("Message-ID", ""))

            # ==============================================================
            # 步骤 4：获取发件人
            # ==============================================================
            from_header = msg.get("From", "")
            sender_email = self._extract_email_address(from_header)

            # ==============================================================
            # 步骤 5：获取主题
            # ==============================================================
            subject = self._decode_header_str(msg.get("Subject", "（无主题）"))

            # ==============================================================
            # 步骤 6：获取正文
            # ==============================================================
            body_text = self._get_email_body(msg)

            # ==============================================================
            # 步骤 7：获取日期
            # ==============================================================
            date_str = msg.get("Date", "")

            return EmailInfo(
                message_id=message_id,
                sender=sender_email,
                subject=subject,
                body_text=body_text,
                date=date_str,
                pop3_index=index,
            )

        except Exception as e:
            print(f"  ⚠️ 解析第 {index} 封邮件时出错: {e}")
            return None

    def _decode_header_str(self, raw: str) -> str:
        """
        解码邮件头信息

        邮件头（如 Subject、From）可能用了编码，例如：
          =?UTF-8?B?5rWL6K+V?=
        需要用 Python 的 decode_header 来解码。

        参数：
            raw: 原始的邮件头字符串

        返回：
            解码后的普通字符串
        """
        if not raw:
            return ""

        decoded_parts = decode_header(raw)
        result = []

        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    try:
                        result.append(part.decode(encoding))
                    except (LookupError, UnicodeDecodeError):
                        result.append(part.decode("utf-8", errors="replace"))
                else:
                    result.append(part.decode("utf-8", errors="replace"))
            else:
                result.append(str(part))

        return "".join(result)

    def _extract_email_address(self, from_header: str) -> str:
        """
        从邮件头中提取邮箱地址

        邮件 From 头有多种格式：
          "user@163.com"
          "张三 <zhang@163.com>"
          "=?UTF-8?B?...?= <user@163.com>"

        参数：
            from_header: 原始的 From 头

        返回：
            提取出的邮箱地址
        """
        if not from_header:
            return "未知发件人"

        # 先用正则提取尖括号中的内容，如 "<user@163.com>"
        match = re.search(r"<([^>]+)>", from_header)
        if match:
            return match.group(1).strip()

        # 没有尖括号，说明整个就是邮箱地址
        decoded = self._decode_header_str(from_header)
        return decoded.strip()

    def _get_email_body(self, msg: Message) -> str:
        """
        从邮件中提取纯文本正文

        一封邮件可能有多个部分（MIME 格式）：
          - text/plain（纯文本版本）
          - text/html（HTML 版本）
          - 附件

        优先使用纯文本版本，如果没有再用 HTML 版本（去除标签）。

        参数：
            msg: 解析后的邮件 Message 对象

        返回：
            邮件的正文文本
        """
        body = None
        html = None

        if msg.is_multipart():
            # ==============================================================
            # 多部分邮件（最常见的情况）
            #
            # 遍历邮件的每个部分，分别找纯文本和 HTML
            # ==============================================================
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                # 跳过附件（附件不是正文）
                if "attachment" in content_disposition:
                    continue

                charset = part.get_content_charset() or "utf-8"

                try:
                    raw_payload = part.get_payload(decode=True)
                    if raw_payload is None:
                        continue

                    decoded = raw_payload.decode(charset, errors="replace")

                    if content_type == "text/plain":
                        body = decoded
                    elif content_type == "text/html":
                        html = decoded
                except Exception:
                    continue
        else:
            # ==============================================================
            # 简单邮件（只有正文，没有附件和多个版本）
            # ==============================================================
            charset = msg.get_content_charset() or "utf-8"
            try:
                raw_payload = msg.get_payload(decode=True)
                if raw_payload:
                    decoded = raw_payload.decode(charset, errors="replace")
                    if msg.get_content_type() == "text/html":
                        html = decoded
                    else:
                        body = decoded
            except Exception:
                pass

        # ==============================================================
        # 优先使用纯文本，没有纯文本时用 HTML 去掉标签后的内容
        # ==============================================================
        if body:
            return body.strip()

        if html:
            # 简单的 HTML 标签去除
            text = re.sub(r"<[^>]+>", "", html)
            text = re.sub(r"\s+", " ", text)
            return text.strip()

        return "（无法读取邮件正文）"
