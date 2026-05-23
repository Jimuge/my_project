"""
邮件发送模块（SMTP）

功能：
  通过 SMTP 服务器发送自动回复邮件

用法：
  from modules.email_sender import EmailSender
  sender = EmailSender()
  sender.send_reply(
      to_email="someone@163.com",
      subject="回复：您的来信",
      reply_body="感谢您的来信...",
      in_reply_to="<original-message-id@server.com>",
  )

新手须知：
  - SMTP 是发邮件用的协议，和收邮件的 IMAP 不同
  - 163 邮箱使用 SSL 加密，端口 465
  - 用的不是邮箱登录密码，而是"授权码"！
  - In-Reply-To 头可以让回复邮件在收件方那里显示为"同一会话"
"""

import smtplib
from email.mime.text import MIMEText


class EmailSender:
    """
    邮件发送器

    负责通过 SMTP 服务器发送自动回复邮件。
    """

    def __init__(self, server: str, port: int, user: str, password: str):
        """
        初始化邮件发送器

        参数：
            server:   SMTP 服务器地址（如 "smtp.163.com"）
            port:     SMTP 端口（通常是 465）
            user:     邮箱账号
            password: 邮箱授权码
        """
        self.server = server
        self.port = port
        self.user = user
        self.password = password

    def send_reply(
        self,
        to_email: str,
        subject: str,
        reply_body: str,
        in_reply_to: str = "",
    ) -> bool:
        """
        发送自动回复邮件

        参数：
            to_email:    收件人邮箱地址（原邮件的发件人）
            subject:     邮件主题（通常用 "Re: 原主题"）
            reply_body:  回复正文内容
            in_reply_to: 原邮件的 Message-ID，用于邮件会话串联

        返回：
            True  — 发送成功
            False — 发送失败
        """
        print(f"  📤 正在发送回复给 {to_email}...")

        try:
            # ==============================================================
            # 步骤 1：构建邮件
            # ==============================================================
            msg = MIMEText(reply_body, "plain", "utf-8")

            # 设置邮件头
            msg["From"] = self.user                     # 发件人（我们自己）
            msg["To"] = to_email                        # 收件人（原发件人）
            msg["Subject"] = subject                    # 主题

            # 如果提供了原邮件的 Message-ID，设置 In-Reply-To 头
            # 这样邮件客户端（如 Outlook、网易邮箱）会把回复和原邮件
            # 自动关联为同一会话（thread）
            if in_reply_to:
                msg["In-Reply-To"] = in_reply_to
                # References 也是用来关联会话的，有些客户端会用到
                msg["References"] = in_reply_to

            # ==============================================================
            # 步骤 2：通过 SMTP 发送
            # ==============================================================
            # SMTP_SSL — SSL 加密的 SMTP 连接
            with smtplib.SMTP_SSL(
                host=self.server,
                port=self.port,
                timeout=30,
            ) as server:
                # 登录（用授权码，不是登录密码！）
                server.login(self.user, self.password)

                # 发送
                server.sendmail(
                    self.user,
                    to_email,
                    msg.as_string(),
                )

            print(f"  ✅ 回复发送成功！")
            return True

        except smtplib.SMTPAuthenticationError:
            print(f"  ❌ SMTP 认证失败！请检查授权码是否正确")
            print(f"     163邮箱授权码获取方式：设置 → POP3/SMTP → 开启服务并生成授权码")
            return False

        except smtplib.SMTPException as e:
            print(f"  ❌ SMTP 发送失败: {e}")
            return False

        except Exception as e:
            print(f"  ❌ 邮件发送异常: {e}")
            return False
