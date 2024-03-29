---
title: 我写的Gentoo Linux安装指南
author: suo yuan
pubDatetime: 2024-03-28T20:05:47
featured: false
draft: false
tags:
  - Gentoo Linux
description: "我这次安装Gentoo Linux做的额外的工作，也就是除官方文档之外的安装步骤。这里我用的init是openrc，WM用的是Hyprland"
---

# 我写的Gentoo Linux安装指南

## 背景

我这次安装主要因为Gentoo Linux在我看来真的很有趣，并且我想尝试一些新的东西试试，虽然我用Arch Linux应该不会遇到滚挂的问题，但我还是有些疑虑。

我在安装前的预计其实是用Gentoo Linux，同时init使用openrc，默认编译工具链用clang/llvm，用hardened profile并且开一些额外的编译选项（比如thinlto之类的）。不过目前只实现了使用openrc和hardened profile。

## profile 选择

根据[Gentoo Linux在24年3月发布的news](https://www.gentoo.org/support/news-items/2024-03-22-new-23-profiles.html)，profile 17.1等版本已经过时了，最好应该更新到23.0。如果你的stage3包下载的是systemd什么的，那就直接enable 23.0 的profile，如果你上来就选择了openrc相关的profile，貌似还是17.1的。你需要更换到对应23.0中的那些split-usr的profile。

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

为什么这里说*split-usr*，在[merge-usr](https://wiki.gentoo.org/wiki/Merge-usr)这篇wiki中指出，merge-usr对于>=systemd 255来说是必需的，对于其他init系统来说是可选的。23.0的除了标明*split-usr*默认都是*merge-usr*的，所以如果我目前使用的是openrc，文件的布局默认就是*split-usr*，也就先不更改了。

对我来说，我除了要enable desktop的profile之外，我还想要enable hardened的profile以带来安全上的提升。可以在[Gentoo Wiki上关于profile的介绍中](<https://wiki.gentoo.org/wiki/Profile_(Portage)#Example_1:_Combining_multiple_profiles_from_the_Gentoo_ebuild_repository>)查看到如何将两个profile同时enable

说起安全性，Gentoo Linux目前跟的是LTS的内核，版本目前在6.6，不过6.7在安全性貌似有很多改进（存疑），所以我选择跟进stable的脚步（

[Project:Hardened](https://wiki.gentoo.org/wiki/Project:Hardened)这个项目主页介绍了Gentoo Hardened profile的一些细节，但是质量不是很好（。

## WM 选择

使用的是openrc，但我网络方面依旧选择的是networkmanager，主要因为习惯了，其他的像iwd，或者wpa_supplicant这样的WiFi连接工具我用的都不是很习惯（主要我是要用桌面环境的，这俩我都不知道有tui或者gui组件）。音频服务方面选择的是pipewire，我并不想用pulseaudio，所以只能选择pipewire了。根据[Gentoo Wiki关于PipeWire的描述](https://wiki.gentoo.org/wiki/PipeWire)，可以看出这东西还有点依赖systemd，难绷。虽然wiki中关于openrc也给了使用它的方法。

DE方面，我本来是想用GNOME的，虽然GNOME依赖于systemd，但是Gentoo Linux做了一些工作使得可以在openrc上使用GNOME，但是GNOME需要编译好多软件，我真的受不了了。我基于“我真的喜欢用Wayland”的心理，选择使用了Hyprland，WM向来要比DE默认少装很多软件。

关于Hyprland的启动，我还是推荐`dbus-run-session Hyprland`这样启动，而不是直接`Hyprland`。状态栏我是用的是waybar，通知组件用的是mako，程序启动器使用的是wofi，Terminal使用的是kitty。输入法使用的是fcitx5。

在GNOME中，使用chromium内核的软件以Wayland启动的话就无法使用中文输入法，需要附加`--gtk-version=4`这个flag才能使用，但是Electron的应用目前还不支持gtk4导致附加了flag也不好使。

但是在Hyprland中就没有这个问题，就像是KDE Plasma中也不会存在这个问题一样。只需要附加`--enable-wayland-ime`这个flag就可以了。

Chromium内核的软件以Wayland启动的话会很模糊，附加`--use-gl=egl`就好了。

Hyprland没有太好的主题设置软件，我选择的是使用`gsettings`这个软件

```bash
$ gsettings get org.gnome.desktop.interface font-name
'Noto Sans Mono 11'
$ gsettings get org.gnome.desktop.interface icon-theme
'Tela'
```

如果把`get`改成`set`就是设置字体和主题了。
