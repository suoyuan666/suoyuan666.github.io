---
title: 我本次安装 Windows 的配置
author: suo yuan
date: 2024-12-01T04:13:26Z
lastmod: 2024-12-01T04:13:26Z
draft: false
categories:
  - Windows_杂谈
tags:
  - windows
  - intro
description: "再次安装了 Windows，尝试做一些额外的安全配置"
---

我给我的笔记本再次安装了一遍 Windows，它曾经被写了家庭版的密钥。我希望再次安装的时候可以直接安装专业版（Pro）

所以我选择了 [massgravel/Microsoft-Activation-Scripts](https://github.com/massgravel/Microsoft-Activation-Scripts) 用于激活专业版

专业版目前我已知有两个功能是我喜欢的:

- [Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview)
    - Windows Sandbox 提供了一个轻量级桌面环境，可以安全地独立运行应用程序。安装在 Windows 沙箱环境中的软件仍然处于“沙箱”状态，并且与主机分开运行。
- [Microsoft Defender Application Guard](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/microsoft-defender-application-guard/md-app-guard-overview)
    - Microsoft Defender Application Guard (MDAG) 旨在帮助防止旧的和新出现的攻击，以帮助保持员工的工作效率。使用我们独特的硬件隔离方法，我们的目标是通过淘汰当前的攻击方法来破坏攻击者使用的 playbook
    - 对于 Microsoft Edge，应用程序防护有助于隔离企业定义的不受信任站点，从而在员工浏览 Internet 时保护您的公司。作为企业管理员，您可以定义受信任的网站、云资源和内部网络。不在您列表中的所有内容都被视为不可信。如果员工通过 Microsoft Edge 或 Internet Explorer 访问不受信任的站点，Microsoft Edge 会在启用 Hyper-V 的隔离容器中打开该站点。

不过在 Windows 11 24H2 之后，Microsoft Defender Application Guard 已经被移除，Microsoft Edge 默认提供了硬件隔离功能，详情可见: [Microsoft Edge security for your business](https://learn.microsoft.com/en-us/deployedge/ms-edge-security-for-business)

参考 [Privacy Guides](https://www.privacyguides.org/en/)，目前 Privacy Guides 只提供了一些组策略配置，我参考了下: [Group Policy Settings](https://www.privacyguides.org/en/os/windows/group-policies/)

Privacy Guides 有一个已经关闭的 Pull Request: https://github.com/privacyguides/privacyguides.org/pull/2452

我印象中该 PR 的作者因社区对 Microsoft Edge 的态度导致该 PR 被关闭: https://discuss.privacyguides.net/t/windows-guide/250/237，https://github.com/privacyguides/privacyguides.org/pull/2452#issuecomment-2132150704

不得不说，从隐私上来讲，一些商业公司的浏览器大多不讲它作为卖点，但是，我认同应该先谈安全，后谈隐私。