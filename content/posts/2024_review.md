---
title: "2024 年终总结"
author: suo yuan
date: 2024-12-31T06:38:19Z
draft: false
tags:
  - life
categories:
  - 年终总结
description: "2024 年终总结"
summary: "2024 年终总结"
---

# 2024 年终总结

今年总体来说并不太好

## 刷课进度

从年初开始看，我在寒假期间终于把 [MIT 6.1810: Operating System Engineering](https://pdos.csail.mit.edu/6.828/2022/) 的 lab 刷的差不多了，并看了 CS106L，初步了解了 modern C++。

后来想要刷 CMU 15445 那个数据库的课，不过没怎么动，所以这个课就教给我了两个东西：CMake 的使用和 [Google Test](https://github.com/google/googletest) 测试框架。我将它们引入到了我在 2023 年编写的命令行程序 [ReleaseButler](https://github.com/suoyuan666/ReleaseButler) 中。

我现在把我希望刷的课，都列到了[关于界面](../../about/)

## 为了操作系统尽可能安全，我的尝试

今年了解到了 [xz-utils 后门](https://en.wikipedia.org/wiki/XZ_Utils_backdoor)，这让我直到现在都在找一个日常使用 Linux 发行版的安全和好用的平衡。

目前来说，我认为安全做的最好的应该是 Google Pixel + GrapheneOS，Chromebook 也还行。桌面端的我认为都不是很行，我一直很期待存储空间隔离的功能，但貌似只有 GrapheneOS 实现了。

处于这个目的，我尝试了 Qubes OS，不过还是用不太习惯。我目前在使用 Fedora Silverblue + Windows 双系统，主力开发目前是 Windows 这里，我希望毕业后装一个 AMD GPU 的电脑，这样就只装 mesa 就好了，也不需要考虑 nvidia-driver 的一些问题（比如不支持 musl libc，安全启动还需要额外导一遍密钥等）。

我现在感觉 Windows 的安全性做的也还不错，不过市场占有率在这，更多的安全研究员会盯着 Windows。

所以有一句话说的还有点道理，用冷门的东西更安全（

为了达到“保证日常可用的前提下尽可能的安全”的目标，我尝试了 Gentoo Linux，这是因为我并不完全了解某些发行版的软件构建过程，索性就在自己的电脑上跑得了。在使用 Gentoo Linux 的过程中，我特地搜索了什么编译选项用于获得更好的安全性和性能。我将它们都记录在 [Gentoo_portage](https://github.com/suoyuan666/Gentoo_portage)。

使用 Gentoo Linux 的时候，我选择了 LLVM profile，因为听说会提升编译速度（这个我没感知到），还有就是我跟喜欢 LLVM 的一些工具（clang-tidy、clang-format）。实际上我倾向于自己编译内核（开启 CFI 选项）。Linux kernel 只有在使用 Clang/LLVM 编译时在可以在编译时使用 CFI。我感觉大部分发行版都没开启 CFI 啊。

我尝试了 musl libc + LLVM profile，这是因为听说 musl libc 不像 glibc 存在 GNU 自己的扩展，所以代码更加干净，攻击面也更小。但不得不说，我在尝试了之后才知道 glibc 的地位，systemd 和 chromium 居然还蛮依赖 glibc 的（Gentoo wiki 的解释是 systemd 依赖于 glibc，chromium 需要做很多修改才能在 musl libc 上使用）。由于 visual studio code 无法使用，导致我没再使用这个 profile（虽然可以使用 flatpak 安装它），不过现在我的 Fedora Silverblue 也是用 flatpak 安装的 visual studio code，也许这对我来说将不再是问题？

后来我感觉 Gentoo Linux 的项目开发人员不是特别够，部分不怎么重量级的包还处于没人维护的状态（但它居然还在官方软件仓库里）。目前我倾向于使用 Fedora/OpenSUSE 等，等我有个性能好的电脑再装 Gentoo Linux。

我现在开始倾向于使用操作系统提供的硬盘加密功能，我认为这是必需的步骤。

## 开源相关

在学长的推荐下，我报名了今年的开源之夏，并成功申请到了一个项目并成功结项。

在 B 站上看到了 [LCPU Getting Started](https://www.bilibili.com/video/BV1sLD6YXEC6/)，我还尝试给这个项目的网站[添加了一点小东西](https://github.com/lcpu-club/getting-started/pull/24)，后来看到他们貌似准备这个是他们校内组织来维护，顿时有些抱歉（

## 一生一芯

我花了两周把一生一芯的预学习部分写完了，不过由于当时我很不想用 Windows，但是 Hyprland 作为使用 Wayland 的窗口管理器，无法很好的让腾讯会议运行，我就没去参加入学答辩，我准备在一月初考完试再改一改，之后参加入学答辩。

争取毕业前整完

## 博客开的坑

我想要把 xv6-riscv 看一下，并形成个源码阅读的系列文章，不过目前就完成了用户态的部分。

## 实习

找寒假实习失败

准备在寒假再面一下 PLCT 实验室的实习

## 未来展望

希望面试顺利，一生一芯的完成顺利

有机会学一下 Rust
