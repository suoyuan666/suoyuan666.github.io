---
title: "安装 FreeBSD 的初步感受"
author: suo yuan
date: 2023-10-04T03:42:51Z
draft: false
categories:
  - 杂谈
tags:
  - BSD
  - intro
description: "在笔记本电脑上安装 FreeBSD 的初步感受，因为无法日常使用，所以只是初步感受"
---

<!--more-->
在笔记本上安装FreeBSD的初步感受，因为无法日常使用，所以只是初步感受
<!--more-->

# 安装 FreeBSD 的初步感受

virt-manager 的 UEFI 不是很能让我装上 FreeBSD，难绷。

安装 DE 的时候怎么也整不上，一旦 startx 或者启动 DM 了就卡住，后来发现应该是我 virt-manager（virt-manager 好像就是个 libvirt 的 GUI 吧）这个 QXL 的问题，但是安装了 xf86-video-qxl 也不是很好用。最后选择了 VirtualBox，按照 KDE 官网上的教程最终也是装上了 KDE Plasma

卡住的时候我还想切换到另一个 tty 结果切换不了，不过 FreeBSD 提供了 Signal User 模式，可以在真正要登陆之前先以一个高权限的身份进去，但是此时磁盘挂载是没有写权限的，需要 mount -u -o rw /重新挂一回。

shell 默认是 sh，我改成 csh，网上简单搜了一下好像没有像 bash-completion 这样的软件遂放弃补全，后来发现 starship 乱码，后来 bash 作为 VSCode-OSS 的依赖被装上了，我也就换称 bash 了（）\[starship 乱码这个问题我没有在真机安装中遇到\]

FireFox 需要配置才能播放音频，pkg info -xD firefox 可以再次看到那些提示：打开 about:config 新建一个 media.cubeb.backend 属性填写相关的音频后端

```text
Currently used audio backend can be inspected on about:support page.
Supported backends and default probing order is as follows:

pulse-rust if pulseaudio package is installed (PULSEAUDIO option)
jack if jackit package is installed (JACK option)
sndio if sndio package is installed (SNDIO option)
alsa if alsa-lib package is installed (ALSA option)
oss (always available)

To force a specific backend open about:config page and create media.cubeb.backend preference.
```

说起 starship 乱码，konsole 上的中文也是乱码（也不能说乱码，nm 竟然是是?，对这些字符集不了解，不知道普通乱码和?的区别）

我的鼠标滚轮的往下滑还是正常的，但是上滑被识别成了返回到上一步？\[这个可以通过 xmodmap 修改映射来解决，把 89 的位置设置成 0 即可，我看有人会把 7 也设置成 0\]

```bash
xmodmap -e "pointer = 1 2 3 4 5 6 7 0 0 10 11 12"
```

我没有太仔细了解 xmodmap 是做什么的，不能保证这个方法一定是十分适合解决这个问题的。`xmodmap -pp` 可以查看当前的映射。

换源是在/usr/local/etc 目录下新建了一个配置文件，用户使用 pkg 安装软件产生的文件也都在/usr/local/下了，甚至我的 home 目录也被改称了/usr/home 下。事实上，/home 指向/usr/home，它就是一个链接。

FreeBSD 有一个叫做 linuxualtor 的东西来模拟 Linux，听说好像是劫持 Linux 的 syscall 翻译成 FreeBSD 的？官方模拟的是 CentOS 7 的(linux-c7 软件包)，但也提供了别的软件用来装上 Debian/Ubuntu 之类。linux-c7 提供的 CentOS 是被修剪过的，用来安装平台上其他 linux 为前缀的软件（比如 linux-steam-utils）。

我在尝试模拟 Ubuntu 运行 linuxqq 时候遇到一个问题是窗口根本起不来。给我一种也许那里只能允许 CLI 的感觉（逃）。我曾以为也许是我虚拟机装的 FreeBSD 的原因，直到我看到了别人成功装上运行了 linuxqq。后来知道了解决方案：xhost +local:说起来，FreeBSD 对 Wayland 的支持好像还不是很行。

真机安装的时候曾有一次它甚至没有成功扫描出我的 iwlwifi，没有加载出 wlan0 无线网卡接口，我自己安装后手动设置好后不知道是不是我设置错了，反正无线网卡驱动 crash 了，不过之后我又试着装过一回倒没出现这个问题。
