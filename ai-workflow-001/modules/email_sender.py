"""
邮件发送模块

功能：
  把分析报告 + 标题 + 配图通过邮件发送给指定收件人

用法：
  from modules.email_sender import EmailSender
  sender = EmailSender()
  sender.send_report(analysis_text, titles, image_paths)

新手须知：
  - 使用的是 SMTP 协议发送邮件
  - 163邮箱/QQ邮箱都需要使用"授权码"而不是登录密码
  - 不同邮箱的 SMTP 服务器地址不同：
      163邮箱：  smtp.163.com      端口 465（SSL）
      QQ邮箱：   smtp.qq.com       端口 465（SSL）
      Gmail：    smtp.gmail.com    端口 587（TLS）
  - 发送附件需要把图片作为 MIME 的附件部分
"""

import smtplib
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from modules.config import Config


class EmailSender:
    """
    邮件发送器

    使用方式：
        sender = EmailSender()
        sender.send_report(
            analysis="分析文本...",
            titles=["标题1", "标题2", "标题3"],
            image_paths=["图片1.png", "图片2.png"],
        )
    """

    def __init__(self):
        """
        初始化：检查邮件配置
        """
        self._check_config()

    def _check_config(self):
        """
        检查邮件相关配置是否完整
        如果缺少配置，给出明确提示
        """
        missing = []

        if not Config.SMTP_USER:
            missing.append("SMTP_USER（发件人邮箱）")
        if not Config.SMTP_PASSWORD:
            missing.append("SMTP_PASSWORD（SMTP 授权码）")
        if not Config.TO_EMAIL:
            missing.append("TO_EMAIL（收件人邮箱）")

        if missing:
            print(f"⚠️ 邮件配置不完整: {', '.join(missing)}")
            print("   请在 .env 文件中补充相关配置")

    def send_report(
        self,
        analysis: str,
        titles: list[str],
        image_paths: list[str] | None = None,
    ) -> bool:
        """
        发送热点分析报告邮件

        参数：
            analysis:    热点分析文本（DeepSeek 分析结果）
            titles:      生成的标题列表
            image_paths: 配图文件路径列表（可选）

        返回：
            True  — 发送成功
            False — 发送失败（具体错误会打印出来）
        """
        print("📧 正在发送邮件...")

        try:
            # =================================================================
            # 步骤 1：构建邮件内容
            # =================================================================
            msg = self._build_email(analysis, titles, image_paths)

            # =================================================================
            # 步骤 2：连接到 SMTP 服务器并发送
            # =================================================================
            self._send_via_smtp(msg)

            print(f"✅ 邮件发送成功！收件人: {Config.TO_EMAIL}\n")
            return True

        except smtplib.SMTPAuthenticationError:
            print("❌ SMTP 认证失败！请检查授权码是否正确")
            print("   163邮箱授权码获取方式：设置 → POP3/SMTP → 开启服务并生成授权码")
            return False

        except smtplib.SMTPException as e:
            print(f"❌ SMTP 发送失败: {e}")
            return False

        except Exception as e:
            print(f"❌ 邮件发送异常: {e}")
            return False

    def _build_email(
        self,
        analysis: str,
        titles: list[str],
        image_paths: list[str] | None = None,
    ) -> MIMEMultipart:
        """
        构建完整的邮件内容（HTML 格式 + 图片附件）

        参数：
            analysis:    分析文本
            titles:      标题列表
            image_paths: 配图路径列表

        返回：
            构建好的 MIMEMultipart 邮件对象
        """
        # 创建邮件容器
        # MIMEMultipart 可以同时包含文本和附件
        msg = MIMEMultipart("related")
        # "related" 表示各个部分是关联的（文字和图片属于同一封邮件）

        # 设置邮件头
        msg["From"] = Config.SMTP_USER                    # 发件人
        msg["To"] = Config.TO_EMAIL                       # 收件人
        msg["Subject"] = self._build_subject()             # 主题

        # =================================================================
        # 构建邮件正文（HTML 格式）
        #
        # HTML 邮件比纯文本邮件更好看，可以加样式、布局、图片等
        # =================================================================
        html_body = self._build_html_body(analysis, titles)
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # =================================================================
        # 添加配图附件
        # =================================================================
        if image_paths:
            for img_path in image_paths:
                self._attach_image(msg, img_path)

        return msg

    def _build_subject(self) -> str:
        """
        生成邮件主题

        格式：【AI热点分析】YYYY-MM-DD 微博热搜洞察报告
        """
        today = datetime.now().strftime("%Y-%m-%d")
        return f"【AI热点分析】{today} 微博热搜洞察报告"

    def _build_html_body(self, analysis: str, titles: list[str]) -> str:
        """
        构建 HTML 格式的邮件正文

        参数：
            analysis: 分析文本
            titles:   标题列表

        返回：
            HTML 字符串
        """
        # =================================================================
        # 把标题列表转换成 HTML 列表项
        # =================================================================
        titles_html = ""
        for i, title in enumerate(titles, 1):
            titles_html += f"<li style='margin: 8px 0; font-size: 15px;'><strong>{title}</strong></li>"

        # =================================================================
        # 把分析文本中的换行转换成 HTML 换行
        # =================================================================
        analysis_html = analysis.replace("\n", "<br>")

        # =================================================================
        # HTML 模板
        #
        # 内联样式（inline style）兼容性最好
        # 几乎所有的邮件客户端都支持
        # =================================================================
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="font-family: 'Microsoft YaHei', Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                <!-- 邮件标题 -->
                <h1 style="color: #FF6B35; border-bottom: 3px solid #FF6B35; padding-bottom: 10px;">
                    🔥 AI 热点分析报告
                </h1>

                <!-- 日期 -->
                <p style="color: #999; font-size: 14px;">
                    生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}
                </p>

                <!-- 标题部分 -->
                <h2 style="color: #333; margin-top: 25px;">📰 推荐标题</h2>
                <ul style="padding-left: 20px;">
                    {titles_html}
                </ul>

                <!-- 分析部分 -->
                <h2 style="color: #333; margin-top: 25px;">📊 热点分析</h2>
                <div style="background: #fafafa; padding: 15px 20px; border-radius: 8px; line-height: 1.8; color: #444; font-size: 14px;">
                    {analysis_html}
                </div>

                <!-- 页脚 -->
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #bbb; font-size: 12px; text-align: center;">
                    <p>本报告由 AI 自动生成，仅供参考</p>
                    <p>Powered by DeepSeek + SiliconFlow</p>
                </div>

            </div>
        </body>
        </html>
        """

        return html

    def _attach_image(self, msg: MIMEMultipart, image_path: str):
        """
        把图片作为附件添加到邮件中

        参数：
            msg:        邮件对象
            image_path: 图片文件路径
        """
        path = Path(image_path)

        if not path.exists():
            print(f"  ⚠️ 图片文件不存在，跳过: {image_path}")
            return

        # 以二进制读取图片
        with open(path, "rb") as f:
            img_data = f.read()

        # 创建附件对象
        # MIMEApplication 可以处理任意二进制数据
        # _subtype 指定 MIME 子类型，"octet-stream" 表示通用的二进制流
        attachment = MIMEApplication(img_data, _subtype="octet-stream")

        # 设置附件的文件名（Content-Disposition 头）
        attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=path.name,  # 使用图片原来的文件名
        )

        # 把附件添加到邮件中
        msg.attach(attachment)
        print(f"  📎 已添加附件: {path.name}")

    def _send_via_smtp(self, msg: MIMEMultipart):
        """
        通过 SMTP 服务器发送邮件

        参数：
            msg: 构建好的邮件对象

        注意：
            163邮箱使用 SSL，端口 465
            其他邮箱可能用 TLS，端口 587
        """
        # =================================================================
        # SMTP_SSL — SSL 加密的 SMTP 连接
        #
        # 163邮箱用 SSL，所以这里使用 SMTP_SSL
        # 如果用 TLS（如 Gmail），需要改用 smtplib.SMTP() 然后 starttls()
        # =================================================================
        with smtplib.SMTP_SSL(
            host=Config.SMTP_SERVER,
            port=Config.SMTP_PORT,
            timeout=30,
        ) as server:
            # 登录 SMTP 服务器
            # 163邮箱的 SMTP 登录名是完整的邮箱地址
            # 密码是授权码（不是邮箱登录密码！）
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)

            # 发送邮件
            # sendmail(发件人, 收件人, 邮件内容)
            server.sendmail(
                Config.SMTP_USER,
                Config.TO_EMAIL,
                msg.as_string(),
            )


# ======================================================================
# 测试代码
# ======================================================================
if __name__ == "__main__":
    test_analysis = """## 今日热点趋势
今天科技领域多个话题登上热搜。
AI技术的发展引发广泛讨论。"""
    test_titles = ["AI技术再突破", "科技改变生活", "未来已来"]

    sender = EmailSender()
    sender.send_report(
        analysis=test_analysis,
        titles=test_titles,
        image_paths=[],
    )
