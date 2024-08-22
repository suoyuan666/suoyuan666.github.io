---
title: 我写的 Gentoo Linux 安装指南
author: suo yuan
date: 2024-03-28T20:05:47
draft: false
categories:
  - Linux_杂谈
tags:
  - Gentoo Linux
  - Linux
  - intro
description: "我这次安装 Gentoo Linux 做的额外的工作，也就是除官方文档之外的安装步骤。这里我用的 init 是 openrc，WM 用的是 Hyprland"
---

<!--more-->
我这次安装 Gentoo Linux 做的额外的工作，也就是除官方文档之外的安装步骤。这里我用的 init 是 openrc，WM 用的是 Hyprland
<!--more-->

# 我写的 Gentoo Linux 安装指南

## 背景

我这次安装主要因为 Gentoo Linux 在我看来真的很有趣，并且我想尝试一些新的东西试试，虽然我用 Arch Linux 应该不会遇到滚挂的问题，但我还是有些疑虑。

我在安装前的预计其实是用 Gentoo Linux，同时 init 使用 openrc，默认编译工具链用 clang/llvm，用 hardened profile 并且开一些额外的编译选项（比如 thinlto 之类的）。不过目前只实现了使用 openrc 和 hardened profile。

## profile 选择

根据 [Gentoo Linux 在 24 年 3 月发布的 news](https://www.gentoo.org/support/news-items/2024-03-22-new-23-profiles.html)，profile 17.1 等版本已经过时了，最好应该更新到 23.0。如果你的 stage3 包下载的是 systemd 什么的，那就直接 enable 23.0 的 profile，如果你上来就选择了 openrc 相关的 profile，貌似还是 17.1 的。你需要更换到对应 23.0 中的那些 split-usr 的 profile。

```bash
$ eselect profile list | grep 23.0
  [21]  default/linux/amd64/23.0 (stable)
  [22]  default/linux/amd64/23.0/systemd (stable)
  [23]  default/linux/amd64/23.0/desktop (stable)
  [24]  default/linux/amd64/23.0/desktop/systemd (stable)
  [25]  default/linux/amd64/23.0/desktop/gnome (stable)
  [26]  default/linux/amd64/23.0/desktop/gnome/systemd (stable)
  [27]  default/linux/amd64/23.0/desktop/plasma (stable)
  [28]  default/linux/amd64/23.0/desktop/plasma/systemd (stable)
  [29]  default/linux/amd64/23.0/no-multilib (stable)
  [30]  default/linux/amd64/23.0/no-multilib/systemd (stable)
  [31]  default/linux/amd64/23.0/no-multilib/hardened (stable)
  [32]  default/linux/amd64/23.0/no-multilib/hardened/systemd (stable)
  [33]  default/linux/amd64/23.0/no-multilib/hardened/selinux (stable)
  [34]  default/linux/amd64/23.0/no-multilib/hardened/selinux/systemd (stable)
  [35]  default/linux/amd64/23.0/no-multilib/prefix (exp)
  [36]  default/linux/amd64/23.0/no-multilib/prefix/kernel-2.6.32+ (exp)
  [37]  default/linux/amd64/23.0/no-multilib/prefix/kernel-2.6.16+ (exp)
  [38]  default/linux/amd64/23.0/no-multilib/prefix/kernel-3.2+ (exp)
  [39]  default/linux/amd64/23.0/llvm (stable)
  [40]  default/linux/amd64/23.0/llvm/systemd (stable)
  [41]  default/linux/amd64/23.0/hardened (stable)
  [42]  default/linux/amd64/23.0/hardened/systemd (stable)
  [43]  default/linux/amd64/23.0/hardened/selinux (stable)
  [44]  default/linux/amd64/23.0/hardened/selinux/systemd (stable)
  [45]  default/linux/amd64/23.0/split-usr (stable)
  [46]  default/linux/amd64/23.0/split-usr/desktop (stable)
  [47]  default/linux/amd64/23.0/split-usr/desktop/gnome (stable)
  [48]  default/linux/amd64/23.0/split-usr/desktop/plasma (stable)
  [49]  default/linux/amd64/23.0/split-usr/no-multilib (stable)
  [50]  default/linux/amd64/23.0/split-usr/no-multilib/selinux (stable)
  [51]  default/linux/amd64/23.0/split-usr/no-multilib/hardened (stable)
  [52]  default/linux/amd64/23.0/split-usr/no-multilib/hardened/selinux (stable)
  [53]  default/linux/amd64/23.0/split-usr/no-multilib/prefix (exp)
  [54]  default/linux/amd64/23.0/split-usr/no-multilib/prefix/kernel-2.6.32+ (exp)
  [55]  default/linux/amd64/23.0/split-usr/no-multilib/prefix/kernel-2.6.16+ (exp)
  [56]  default/linux/amd64/23.0/split-usr/no-multilib/prefix/kernel-3.2+ (exp)
  [57]  default/linux/amd64/23.0/split-usr/llvm (stable)
  [58]  default/linux/amd64/23.0/split-usr/hardened (stable)
  [59]  default/linux/amd64/23.0/split-usr/hardened/selinux (stable)
  [62]  default/linux/amd64/23.0/x32 (dev)
  [63]  default/linux/amd64/23.0/x32/systemd (exp)
  [64]  default/linux/amd64/23.0/split-usr/x32 (exp)
  [69]  default/linux/amd64/23.0/musl (dev)
  [70]  default/linux/amd64/23.0/musl/llvm (exp)
  [71]  default/linux/amd64/23.0/musl/hardened (exp)
  [72]  default/linux/amd64/23.0/musl/hardened/selinux (exp)
  [73]  default/linux/amd64/23.0/split-usr/musl (dev)
  [74]  default/linux/amd64/23.0/split-usr/musl/llvm (exp)
  [75]  default/linux/amd64/23.0/split-usr/musl/hardened (exp)
  [76]  default/linux/amd64/23.0/split-usr/musl/hardened/selinux (exp)
```

为什么这里说 _split-usr_，在 [merge-usr](https://wiki.gentoo.org/wiki/Merge-usr) 这篇 wiki 中指出，merge-usr 对于>=systemd 255 来说是必需的，对于其他 init 系统来说是可选的。23.0 的除了标明 _split-usr_ 默认都是 _merge-usr_ 的，所以如果我目前使用的是 openrc，文件的布局默认就是 _split-usr_，也就先不更改了。

对我来说，我除了要 enable desktop 的 profile 之外，我还想要 enable hardened 的 profile 以带来安全上的提升。可以在[Gentoo Wiki 上关于 profile 的介绍中](<https://wiki.gentoo.org/wiki/Profile_(Portage)#Example_1:_Combining_multiple_profiles_from_the_Gentoo_ebuild_repository>)查看到如何将两个 profile 同时 enable

说起安全性，Gentoo Linux 目前跟的是 LTS 的内核，版本目前在 6.6，不过 6.7 在安全性貌似有很多改进（存疑），所以我选择跟进 stable 的脚步（

[Project:Hardened](https://wiki.gentoo.org/wiki/Project:Hardened) 这个项目主页介绍了 Gentoo Hardened profile 的一些细节，但是这篇文档质量貌似不是很好。

## WM 选择

使用的是 openrc，但我网络方面依旧选择的是 networkmanager，主要因为习惯了，其他的像 iwd，或者 wpa_supplicant 这样的 WiFi 连接工具我用的都不是很习惯（主要我是要用桌面环境的，这俩我都不知道有 tui 或者 gui 组件）。音频服务方面选择的是 pipewire，我并不想用 pulseaudio，所以只能选择 pipewire 了。根据[Gentoo Wiki 关于 PipeWire 的描述](https://wiki.gentoo.org/wiki/PipeWire)，可以看出这东西还有点依赖 systemd，难绷。虽然 wiki 中关于 openrc 也给了使用它的方法。

DE 方面，我本来是想用 GNOME 的，虽然 GNOME 依赖于 systemd，但是 Gentoo Linux 做了一些工作使得可以在 openrc 上使用 GNOME，但是 GNOME 需要编译好多软件，我真的受不了了。我基于 “我真的喜欢用 Wayland” 的心理，选择使用了 Hyprland，WM 向来要比 DE 默认少装很多软件。

关于 Hyprland 的启动，我还是推荐 `dbus-run-session Hyprland` 这样启动，而不是直接 `Hyprland`。状态栏我是用的是 waybar，通知组件用的是 mako，程序启动器使用的是 wofi，Terminal 使用的是 kitty。输入法使用的是 fcitx5。

在 GNOME 中，使用 chromium 内核的软件以 Wayland 启动的话就无法使用中文输入法，需要附加 `--gtk-version=4` 这个 flag 才能使用，但是 Electron 的应用目前还不支持 gtk4 导致附加了 flag 也不好使。

但是在 Hyprland 中就没有这个问题，就像是 KDE Plasma 中也不会存在这个问题一样。只需要附加 `--enable-wayland-ime` 这个 flag 就可以了。

Chromium 内核的软件以 Wayland 启动的话会很模糊，附加 `--use-gl=egl` 就好了。

Hyprland 没有太好的主题设置软件，我选择的是使用 `gsettings` 这个软件

```bash
$ gsettings get org.gnome.desktop.interface font-name
'Noto Sans Mono 11'
$ gsettings get org.gnome.desktop.interface icon-theme
'Tela'
```

如果把 `get` 改成 `set` 就是设置字体和主题了。
