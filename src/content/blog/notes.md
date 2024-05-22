---
title: 随笔记
author: suo yuan
pubDatetime: 2024-04-13T21:19:25
featured: false
pinned: true
draft: false
tags:
  - others
description: "这是我日常生活的部分吐槽，由于内容分散而且不足以聚合成一个文章，故而在这里写"
---

---

这个鬼蓝牙键盘居然会记蓝牙设备的地址🐴，我这个双系统还特地去Windows偷了一下连接这个键盘产生的密钥，替换了Linux这里的密钥才成功做到两个系统都可以连。而且 _/var/lib/bluetooth/_ 这个路径普通用户还读不进去。

---

我真的很烦这个B Chromium对Waylnad和硬件视频加速支持这么难绷这一点。

---

在Fedora上切换到KDE Plasma了，真的很舒服（除了颜值我还是认为不如GNOME之外）。总的来说是主要是以下几点让我认为很舒服：

- XWayland的缩放看起来略显正常
- 支持的Wayland输入法协议多，使用Chromium内核的软件可以很好的在Wayland下输入中文。
- kate很好用

---

刚刚发现汉字中间包着`*xx*`这样的markdown没有被翻译成斜体，难道汉字和英文字母中间隔一个空格还是一个蛮正确的选择？

---

KDE Plasma6 对Wayland的支持感觉比Plasma5要好很多。不过现在使用NixOS时，Plasma6还有点小问题，但总体上比Plasma5强很多。这建立在我倾向于使用nvidia-driver的情况下，也许使用mesa本来就会更好

NVIDIA对XWayland的支持还是还是有些难绷，我还是尽量不使用不支持Wayland的应用吧（比如使用较老版本Electorn编译的软件）。

虽然NixOS的理念让用户在一定程度上不需要太担心系统挂掉，然后需要启动liveusb chroot进去修补的问题（毕竟存在一个类似快照的机制，不过不是文件系统层面的，所以也不能说完全不需要担心）。但有时候我一时间我的第一反应还是chroot进去修补，难绷。

---

NVIDIA关于XWayland的GPU显示同步补丁已经在[Xorg](https://gitlab.freedesktop.org/xorg/xserver/-/merge_requests/967), [Mutter](https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/3300)和[KWin](https://invent.kde.org/plasma/kwin/-/merge_requests/4693)中都已合并。

这里是KDE的一位开发者Xaver Hugl关于显示同步的解释：[Explicit sync | Xaver's blog](https://zamundaaa.github.io/wayland/2024/04/05/explicit-sync.html)。

根据[egl-wayland上的讨论](https://github.com/NVIDIA/egl-wayland/pull/104)，这需要等到nvidia-driver 555版本

但是后续该开发者自称移植到555版本已经有点晚了，所以需要等到560版本的nvidia-driver。

目前在我看来应该是分两步。第一步是WM要支持这个功能，现在KWin和Mutter都合并了相关补丁，KDE Plasma 6.1貌似就发布合并了这个补丁的KWin了，我不清楚GNOME是哪个版本号，可能是46的某个小版本吧（猜测）。第二步是本机安装的nvidia-driver是支持这个的（目前看来也就是560版本以及上了）。

不过这个开发者的评论还是有一点道理的:

> Are there really that many native Wayland Vulkan applications out there right now? I didn't think there were. Of course, that will definitely change in the future, especially when Wine switches to using Wayland.
>
> -- https://github.com/NVIDIA/egl-wayland/pull/104#issuecomment-2073649862

所以wine还不支持Wayland🐴，我没有用wine，我还真不知道

---

根据[phoronix的一篇文章介绍](https://www.phoronix.com/news/NVIDIA-555.42.02-Linux-Beta)，NVIDIA 555.42.02 Beta驱动已经发布了，这个就已经带有了Wayland显示同步的支持，莫非这个其实还真的是555 stable版本能有的功能？

不管如何，本身的桌面管理器的还得支持才行，KDE Plasma已经发布了6.0的最后一个版本，没有一刻为6.0.5而感叹，接下来来到我电脑上的就是带有Wayland显示同步支持的6.1。

---
