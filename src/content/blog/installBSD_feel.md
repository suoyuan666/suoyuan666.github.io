---
title: "安装FreeBSD的初步感受"
author: suo yuan
pubDatetime: 2023-10-04T03:42:51Z
featured: false
draft: false
tags:
  - BSD
  - intro
description:
  "介绍了大部分主流发行版"
---
# 安装FreeBSD的初步感受

virt-manager的UEFI不是很能让我装上FreeBSD，难绷。

安装DE的时候怎么也整不上，一旦startx或者启动DM了就卡住，后来发现应该是我virt-manager（virt-manager好像就是个libvirt的GUI吧）这个QXL的问题，但是安装了xf86-video-qxl也不是很好用。最后选择了VirtualBox，按照KDE官网上的教程最终也是装上了KDE Plasma

卡住的时候我还想切换到另一个tty结果切换不了，不过FreeBSD提供了Signal User模式，可以在真正要登陆之前先以一个高权限的身份进去，但是此时磁盘挂载是没有写权限的，需要mount -u -o rw /重新挂一回。

shell默认是sh，我改成csh，网上简单搜了一下好像没有像bash-completion这样的软件遂放弃补全，后来发现starship乱码，后来bash作为VSCode-OSS的依赖被装上了，我也就换称bash了（）\[starship乱码这个问题我没有在真机安装中遇到\]

FireFox需要配置才能播放音频，pkg info -xD firefox可以再次看到那些提示：打开about:config新建一个media.cubeb.backend属性填写相关的音频后端

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

说起starship乱码，konsole上的中文也是乱码（也不能说乱码，nm竟然是是?，对这些字符集不了解，不知道普通乱码和?的区别）

我的鼠标滚轮的往下滑还是正常的，但是上滑被识别成了返回到上一步？\[这个可以通过xmodmap修改映射来解决，把89的位置设置成0即可，我看有人会把7也设置成0\]

```bash
xmodmap -e "pointer = 1 2 3 4 5 6 7 0 0 10 11 12"
```

我没有太仔细了解xmodmap是做什么的，不能保证这个方法一定是十分适合解决这个问题的。`xmodmap -pp`可以查看当前的映射。

换源是在/usr/local/etc目录下新建了一个配置文件，用户使用pkg安装软件产生的文件也都在/usr/local/下了，甚至我的home目录也被改称了/usr/home下。事实上，/home指向/usr/home，它就是一个链接。

FreeBSD有一个叫做linuxualtor的东西来模拟Linux，听说好像是劫持Linux的syscall翻译成FreeBSD的？官方模拟的是CentOS 7的(linux-c7软件包)，但也提供了别的软件用来装上Debian/Ubuntu之类。linux-c7提供的CentOS是被修剪过的，用来安装平台上其他linux为前缀的软件（比如linux-steam-utils）。

我在尝试模拟Ubuntu运行linuxqq时候遇到一个问题是窗口根本起不来。给我一种也许那里只能允许CLI的感觉（逃）。我曾以为也许是我虚拟机装的FreeBSD的原因，直到我看到了别人成功装上运行了linuxqq。后来知道了解决方案：xhost +local:说起来，FreeBSD对Wayland的支持好像还不是很行。

真机安装的时候曾有一次它甚至没有成功扫描出我的iwlwifi，没有加载出wlan0无线网卡接口，我自己安装后手动设置好后不知道是不是我设置错了，反正无线网卡驱动crash了，不过之后我又试着装过一回倒没出现这个问题。