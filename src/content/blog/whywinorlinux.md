---
title: 为什么你应该(不)使用GNU/Linux作为日用操作系统
author: suo yuan
pubDatetime: 2024-04-13T11:58:25
featured: false
draft: false
tags:
  - Linux
  - intro
description: "一个简单的评价文章，关于是否应该选择使用GNU/Linux作为你的个人日用桌面操作系统"
---

# 为什么你应该(不)使用GNU/Linux作为日用操作系统

本章关于使用GNU/Linux作为个人日用桌面操作系统做了一些评价，主要是从是否应该使用两方面来评价。

## 为什么不应该使用

### 从应用软件的层面来看

直到2023年初，腾讯才正式推出Linux版本的QQ，并且开发进度落后于Windows和Mac端，不过几乎所有发行版都可以使用，不过还会存在一些小BUG。

直到2024年3月，腾讯才正式推出Linux版本的微信，大致上的该有的功能基本都有，但是原生只能安装在部分国产操作系统上。如果使用的是其他的Linux发行版，可以使用bwrap套一层绕过检测。

网易云音乐已经不再分发官方的Linux版本的软件包了，如果需要使用可以选择安装yesplaymusic。

Microsoft office 365没有Linux的版本，目前要么用WPS。要么用onlyoffice。虽然很多Linux用户貌似会用libreoffice？

我倾向于使用Wayland而不是Xorg。Wayland和Xorg是两套显示服务协议，虽然部分用户认为Wayland并不是用于取代Xorg的，但是我认为Wayland应该全面取代Xorg，因为Wayland相比于Xorg无论是性能还是安全性都要优于Xorg。

但是Chromium对Wayland的支持还没有那么完美，这导致了Electorn的程序大概率也不会对Wayland支持那么完美（缩放存在问题）。并且Chromium不支持text-input-v3（Wayland输入法协议第3版）导致在GNOME下需要为其附加环境变量`QT_IM_MODULE`才能正常使用（印象中还需要附加`--gtk-version=4`）。但是`--gtk-version=4`并没有被Electorn所支持（目前是2024年4月，它并没有支持），所以ibus或者fcitx5是无法切换到中文输入的。

但是Plasma 5.27+支持text-input-v1，text-input-v2 和 text-input-v3。所以只需要附加`--enable-wayland-ime`（这是因为text-input-v1）即可使用。

我这里说的GNOME和Plasma都是一种桌面环境，具体可以参考我在另一篇文章：[面向beginner: GNU/Linux发行版浅评与介绍](../distrointro/)中的图片，我在那篇文章的最后还介绍了一下桌面环境。

只有部分游戏是提供了原生的Linux版本（其中有一部分大概是因为Steam Deck，Steam Deck上的操作系统Steam OS是一个GNU/Linux发行版）。不过Steam提供了Proton兼容层以运行支持Windows的游戏。

很多专业的软件可能处于没有Linux版本的状态。我又不是任何领域的专业人士，这个还是需要自己去搜集。如果是计算机相关还是有很多平替的，可以参考网站[AlternativeTo](https://alternativeto.net/)，这个网站列出了一些软件的替代品可供参考。

### 从硬件的层面来看

对于NVIDIA不算老的卡，基本上都需要安装NVIDIA闭源的显卡驱动才能使其正常工作。目前来说，该驱动可以较为正常的工作。但是我在使用GNOME Wayland的时候，安装NVIDIA闭源的显卡驱动的情况下运行XWayland无法正常的工作。不过我需要XWayland运行的情况基本都是Electorn的软件。

对于硬件视频加速来说，Firefox的支持还不错，Chromium只是实验性支持（不过貌似也可以用）。这里Intel开发了一套VAAPI，NVIDIA开发了一套VDPAU和NVDEC。不过貌似VDPAU那个driver好久不开发了，现在NVIDIA应该是安装nvidia-vaapi-driver，但是我安装完还是有一点问题。

### 从安全的角度来看

这个其实不好说，从开源的角度来说，可以审查理论上下限不会太低，但是[xz的投毒事件](https://en.wikipedia.org/wiki/XZ_Utils_backdoor)也可以看出这个安全性也么那么绝对

> 今天有人提到 Lasse Collin 对于 xz 项目早就疲惫不堪，Jia Tan 是极少数愿意真正贡献代码的“开发者”，这都是这场悲剧不可或缺的背景条件。
>
> 在无人关心的角落，Florian Westphal 最近辞去了内核 netfilter co-maintainer，所以现在 nf 只剩 Pablo Neira Ayuso 一人维护。这可是无数人每天使用的 netfilter。
>
> 在无人关心的角落，我最爱的工具之一 strace 依然只由一个捷克人 Dmitry V. Levin 默默维护。
>
> 在无人关心的角落，tcpdump/libpcap 在由 the-tcpdump-group 持续更新，其中一位 Denis Ovsienko 的自我介绍是 sometimes I work jobs for living, sometimes I contribute pro bono to free and open source software projects, often I do both，给人一种很孤独的感觉。
>
> 在无人关心的角落，bash group 只有三位 active members，其中一位 Bob Proulx 有个古典博客，里面有记录他和妻子的平静生活。
>
> 我以前赞美人月神话，但我现在更关心默默无闻的开发者们，就像 vim 作者 Bram Moolenaar 一生没有和任何人建立亲密关系，我只想问，你这一生过得开心吗？

上面这段话转自[知乎的一个回答](https://www.zhihu.com/question/650826484/answer/3451699113)

基础开源软件组件有些是几个人的为爱发电。但基础组件一旦出现了安全问题，影响还是挺大的。

从安全角度来讲，

- 你不应该使用linux-kernel，而是[linux-hardened](https://github.com/anthraxx/linux-hardened)
    - 这样的kernel使用了基本内核加固补丁集和更多安全相关的编译时配置选项。
- 不应该使用pulseaudio这个音频服务，而是使用pipewire
    - 这一点还好，现在应该都在使用pipewire。
- 应该使用SELinux或者AppArmor这样的软件更细致的管控权限。
- flatpak安装的软件，应该使用flatseal管理软件的权限。
- 使用sudo这样的软件应该只允许用户执行部分软件，或者再用doas代替sudo，不过是否用doas倒还是看自己了。
- 应该尽可能不要用Xorg。
- 磁盘应该加密。
- grub这个bootloader也应该加密。
- 一些文件目录挂载的时候可以禁用读写权限或者执行权限之类的。
- 应该使用firejail或者bwrap这样的沙盒程序。
    - bwrap貌似比firejail更好一些？

这里还存在一个问题是——是否要选择*使用源码分发的包管理器*的发行版。这种发行版的软件分发的是其源代码，软件的编译工作是跑在用户的机器上这样的好处是可以控制软件的功能的选择，软件的体积减小，攻击面理论上也会少一些。并且由于编译是跑在用户自己的机器上，你可以开很多为了安全考虑的编译选项。甚至编译工具链也可以选择。

## 为什么应该使用

### 从应用软件的角度来看

我认为，终端通过shell，将系统的细节暴露给用户，使得用户可以做很多事情。尤其Linux更大限度的暴露细节。由于linux作为一个开源项目，所以开发的时候会更加侧重自身的使用。

[Richard Stallman](https://en.wikipedia.org/wiki/Richard_Stallman)因为认为当时黑客文化式微，发起了GNU项目，组织了自由软件基金会并发起了自由软件运动。

我认为这一定程度上影响了一批人，导致开发者会用开源软件并回馈开源社区。

当然这样的大牛不止这一位，比如[Linus Torvalds](https://en.wikipedia.org/wiki/Linus_Torvalds)技术很强，但是还没有Richard Stallman的观点那么偏激（这句话不代表我认为Richard Stallman的观点偏激，我只是用偏激作为对比的词汇），Linus Torvalds也吸引了很多hacker。

一定程度上，由于开发者目前使用的很多软件都是开源的，开源软件目前互相之间的配合还是可以的，所以作为同样是开源软件的linux，它们之间的工作会更加顺畅。

### 从安全的角度来讲

单纯从批判商业公司闭源软件可能有自留后门的角度来说，开源软件这样的风险少一些（我并不是说开源软件一定不会有风险）。

我目前认为只有上述这个角度能说明使用GNU/Linux作为日用操作系统会比使用诸如Windows更加安全了，还有就是可能Linux会有一些更加强劲的安全权限控制软件。

## 结论

目前应该还是更适合编程开发。

应用程序角度来看，目前GNU/Linux最友好的桌面环境应该是KDE Plasma。目前国内软件大部分都可以在Linux找到官方分发的软件包，就算没有也有非官方的开源实现。部分软件没有Linux的版本，也许会有替代品，但效果可能会差一些。

硬件上来看，NVIDIA显卡的支持目前还是不错，不过还是有些小毛病。

安全性还说，默认的还是不行，用户还是需要一定的自设定。我一直认为，如果真的追求安全性，应该装QubesOS这个操作系统。
