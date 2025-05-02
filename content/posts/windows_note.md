---
title: 我本次安装 Windows 的配置
author: suo yuan
date: 2024-12-01T04:13:26Z
lastmod: 2024-12-02T00:09:32Z
draft: false
categories:
  - Windows_杂谈
tags:
  - windows
  - intro
description: "再次安装了 Windows，尝试做一些额外的安全配置"
---

我给我的笔记本再次安装了一遍 Windows，它曾经被写了家庭版的密钥。我希望再次安装的时候可以直接安装专业版（Pro）

我通过 https://msdl.gravesoft.dev/#3113 下载了 Windows 11 24H2 的系统镜像，我看下载链接没什么问题就用了

所以我选择了 [massgravel/Microsoft-Activation-Scripts](https://github.com/massgravel/Microsoft-Activation-Scripts) 用于激活专业版

关于专业版，曾经有两个功能是我很喜欢的:

- [Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview)
    - Windows Sandbox 提供了一个轻量级桌面环境，可以安全地独立运行应用程序。安装在 Windows 沙箱环境中的软件仍然处于“沙箱”状态，并且与主机分开运行。
- [Microsoft Defender Application Guard](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/microsoft-defender-application-guard/md-app-guard-overview)
    - Microsoft Defender Application Guard (MDAG) 旨在帮助防止旧的和新出现的攻击，以帮助保持员工的工作效率。使用我们独特的硬件隔离方法，我们的目标是通过淘汰当前的攻击方法来破坏攻击者使用的 playbook
    - 对于 Microsoft Edge，应用程序防护有助于隔离企业定义的不受信任站点，从而在员工浏览 Internet 时保护您的公司。作为企业管理员，您可以定义受信任的网站、云资源和内部网络。不在您列表中的所有内容都被视为不可信。如果员工通过 Microsoft Edge 或 Internet Explorer 访问不受信任的站点，Microsoft Edge 会在启用 Hyper-V 的隔离容器中打开该站点。

不过在 Windows 11 24H2 之后，Microsoft Defender Application Guard 已经被移除。

安装了专业版后，设置一些组策略，摁 Windows 键搜索组策略即可进入组策略的编辑:

在 **计算机配置** -> **管理模板** 中:

**系统**:

- Device Guard
    - 打开基于虚拟化的安全
        - 基于虚拟化的安全性使用 Windows 虚拟机监控程序来提供对安全服务的支持。基于虚拟化的安全性需要安全启动，并且可以选择使用 DMA 保护来启用。DMA 保护需要硬件支持，并且仅在正确配置的设备上启用。
        - 未设置改成已启用
        - 平台安全级别 选 安全启动和 DMA 保护
        - 安全启动配置 选 已启用
        - 基于虚拟化的代码完整性保护
            - 此设置可启用基于虚拟化的内核模式代码完整性保护。启用此功能后，将强制执行内核模式内存保护，并且代码完整性验证路径受基于虚拟化的安全功能的保护。
            - 选择 使用 UEFI 锁定启用
        - 内核模式硬件强制堆栈保护
            - 此设置为内核模式代码启用硬件强制堆栈保护。启用此安全功能后，内核模式数据堆栈将使用基于硬件的影子堆栈进行强化，这些堆栈存储了预期的返回地址目标，以确保程序控制流不会被篡改。
            - 选择 在强制模式下启用
- Internet 通信管理
  - Internet 通信设置:
      - 关闭 Windows 客户体验改善计划: 已启用
      - 关闭 Windows 错误报告：已启用
      - 关闭 Windows Messenger 客户体验改善计划：已启用
- OS 策略
  - 允许使用剪切板历史记录: 已禁用
  - 允许剪切板在设备间同步: 已禁用
  - 启用活动源: 已禁用
  - 允许发布用户活动: 已禁用
  - 允许上传用户活动: 已禁用

**Windows 组件**

- BitLocker 驱动器加密
    - 选择驱动器加密方法和密码强度(Windows 8、Windows Server 2012、Windows 8.1 或 Windows 10 [版本 1507])
        - 已启动
        - 选择加密方法: AES 256 位
    - 操作系统驱动器
        - 启动时需要附加身份验证: 已启用
            - 该选项需要 [TPM](https://support.microsoft.com/zh-cn/topic/%E4%BB%80%E4%B9%88%E6%98%AF-tpm-705f241d-025d-4470-80c5-4feeb24fa1ee)，Windows 11 的升级条件之一就是 TPM，并且现代的计算机都带 TPM，所以就启用了。
        - 允许增强型启动 PIN: 已启用

之后在 [Download and configure Microsoft Edge for Business](https://www.microsoft.com/en-us/edge/business/download) 中点击 **Download Windows 64-bit Policy**

解压后，将 `MicrosoftEdgePolicyTemplates\windows\admx\msedge.admx` 复制到 `C:\Windows\PolicyDefinitions`，再将 `MicrosoftEdgePolicyTemplates\windows\zh-CN\msedge.adml` 复制到 `C:\Windows\PolicyDefinitions\zh-CN`，之后打开组策略，就可以在管理模板中找到 Microsoft Edge 了。

**Microsoft Edge**

- 配置自动 HTTPS:
    - 已启用
    - 选择 通过 HTTP 传送的所有导航都将切换到 HTTPS。可能会更频繁地出现连接错误。
- 阻止第三方 Cookie:
    - 已启用
    - 我本以为这是默认的，但现在才知道 Edge 和 Chrome 都不是默认阻止第三方 Cookie
- 配置浏览器进程中代码完整性设置
    - 已启用
    - 在浏览器进程中启用代码完整性防护强制
- 启用联机 OCSP/CRL 检查
    - 已启用
    - Chromium 默认好像会禁用该选项，印象中 OCSP 用来查验 SSL/TLS 证书是否被吊销的，FireFox 默认开启该选项，导致我 Linux 下的 FireFox 有时候打开网页的速度显著的慢，我就给关闭了。不过对于 Windows，我相信它。
    - 不好评价它能提高多少安全性
- 增强 Microsoft Edge 中的安全状态
    - 已启用
    - 选择 严格模式
- 启用网络服务沙盒
    - 已启用
- 限制 WebRTC 本地 IP 地址公开
    - 已启用
    - 选择 除非代理服务器支持 UDP，否则，请使用 TCP。这不会公开本地 IP 地址
- 允许网站自动播放媒体
    - 已禁用

以上组策略部分参考自 [Privacy Guides](https://www.privacyguides.org/en/)，目前 Privacy Guides 只提供了一些组策略配置: [Group Policy Settings](https://www.privacyguides.org/en/os/windows/group-policies/)

Privacy Guides 有一个已经关闭的 Pull Request: https://github.com/privacyguides/privacyguides.org/pull/2452，我也参考了下它的配置

我印象中该 PR 的作者因社区对 Microsoft Edge 的态度导致该 PR 被关闭: https://discuss.privacyguides.net/t/windows-guide/250/237，https://github.com/privacyguides/privacyguides.org/pull/2452#issuecomment-2132150704

不得不说，从隐私上来讲，一些商业公司的浏览器大多不讲它作为卖点，但是，我认同应该先谈安全，后谈隐私。

之后我启用了 BitLocker 加密 和 Windows 沙盒。