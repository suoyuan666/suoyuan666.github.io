---
title: 随笔记
author: suo yuan
pubDatetime: 2024-04-13T21:19:25
lastmod: 2025-01-10T10:31:22Z
featured: true
draft: false
tags:
  - others
description: "这是我日常生活的部分吐槽，由于内容分散而且不足以聚合成一个文章，故而在这里写"
---

<!--more-->
这是我日常生活的部分吐槽，由于内容分散而且不足以聚合成一个文章，故而在这里写
<!--more-->

## 对双系统蓝牙的使用的吐槽

这个鬼蓝牙键盘居然会记蓝牙设备的地址 🐴，我这个双系统还特地去 Windows 偷了一下连接这个键盘产生的密钥，替换了 Linux 这里的密钥才成功做到两个系统都可以连。而且 _/var/lib/bluetooth/_ 这个路径普通用户还读不进去。

破案了，我感觉所有蓝牙设备都会这么干，我的耳机也得偷一遍密钥才行。

## 对 Chromium 的吐槽，以及安装 Fedora Linux 的感慨

我真的很烦这个 B Chromium 对 Waylnad 和硬件视频加速支持这么难绷这一点。

在 Fedora 上切换到 KDE Plasma 了，真的很舒服（除了颜值我还是认为不如 GNOME 之外）。总的来说是主要是以下几点让我认为很舒服：

- XWayland 的缩放看起来略显正常
- 支持的 Wayland 输入法协议多，使用 Chromium 内核的软件可以很好的在 Wayland 下输入中文。
- kate 很好用

## 关于中英文排版的感受

刚刚发现汉字中间包着 `*xx*` 这样的 markdown 没有被翻译成斜体，难道汉字和英文字母中间隔一个空格还是一个蛮正确的选择？

现在我认为就应该是中文和英文之间空一格，这样看着也舒服。

## 关于 KDE Plasma 6 的初步感受

KDE Plasma 6 对 Wayland 的支持感觉比 Plasma5 要好很多。不过现在使用 NixOS 时，Plasma 6 还有点小问题，但总体上比 Plasma5 强很多。这建立在我倾向于使用 nvidia-driver 的情况下，也许使用 mesa 本来就会更好

NVIDIA 对 XWayland 的支持还是还是有些难绷，我还是尽量不使用不支持 Wayland 的应用吧（比如使用较老版本 Electorn 编译的软件）。

## 我这个老家伙的观念不太适合 NixOS

虽然 NixOS 的理念让用户在一定程度上不需要太担心系统挂掉，然后需要启动 liveusb chroot 进去修补的问题（毕竟存在一个类似快照的机制，不过不是文件系统层面的，所以也不能说完全不需要担心）。但有时候我一时间我的第一反应还是 chroot 进去修补，难绷。

## NVIDIA 即将支持 XWaylnad 显示同步

NVIDIA 关于 XWayland 的 GPU 显示同步补丁已经在 [Xorg](https://gitlab.freedesktop.org/xorg/xserver/-/merge_requests/967), [Mutter](https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/3300) 和 [KWin](https://invent.kde.org/plasma/kwin/-/merge_requests/4693) 中都已合并。

这里是 KDE 的一位开发者 Xaver Hugl 关于显示同步的解释：[Explicit sync | Xaver's blog](https://zamundaaa.github.io/wayland/2024/04/05/explicit-sync.html)。

根据 [egl-wayland 上的讨论](https://github.com/NVIDIA/egl-wayland/pull/104)，这需要等到 nvidia-driver 555 版本

但是后续该开发者自称移植到 555 版本已经有点晚了，所以需要等到 560 版本的 nvidia-driver。

目前在我看来应该是分两步。第一步是 WM 要支持这个功能，现在 KWin 和 Mutter 都合并了相关补丁，KDE Plasma 6.1 貌似就发布合并了这个补丁的 KWin 了，我不清楚 GNOME 是哪个版本号，可能是 46 的某个小版本吧（猜测）。第二步是本机安装的 nvidia-driver 是支持这个的（目前看来也就是 560 版本以及上了）。

不过这个开发者的评论还是有一点道理的:

> Are there really that many native Wayland Vulkan applications out there right now? I didn't think there were. Of course, that will definitely change in the future, especially when Wine switches to using Wayland.
>
> -- https://github.com/NVIDIA/egl-wayland/pull/104#issuecomment-2073649862

所以 wine 还不支持 Wayland 🐴，我没有用 wine，我还真不知道

根据 [phoronix 的一篇文章介绍](https://www.phoronix.com/news/NVIDIA-555.42.02-Linux-Beta)，NVIDIA 555.42.02 Beta 驱动已经发布了，这个就已经带有了 Wayland 显示同步的支持，莫非这个其实还真的是 555 stable 版本能有的功能？

不管如何，本身的桌面管理器的还得支持才行，KDE Plasma 已经发布了 6.0 的最后一个版本，没有一刻为 6.0.5 而感叹，接下来赶到我电脑上的就是带有 Wayland 显示同步支持的 6.1 ✌️。

## 对 arch-install 的评价

今天安装了 Arch Linux + KDE Plasma，这回我使用 [archinstall](https://github.com/archlinux/archinstall) 安装，感觉还不错。不得不说，AUR 软件是真多，我很多软件什么的都可以找到，直接用 `paru` 安装就行。而且我发现 NVIDIA + XWayland 好像没有那么难绷了。不过还是等到 nvidia-driver 到 555 版本以及 KDE Plasma 6.1 的吧。

## NVIDIA + XWayland 的吐槽

NVIDIA + XWayland 还是很难绷，还是等到 nvidia-driver stable 更新到 555 的吧。

## zed stable for Linux 已发布

zed stable for linux 已经发布，可以根据 [zed docs 上提供的办法](https://zed.dev/docs/linux)下载安装。

我本身不是 Rust 开发者，所以就试着打开了我 C++ 的小项目，总体来说还是不错的，有我看得下去的主题，内置 `clangd` 的支持，不过貌似没有对 `clang-tidy` 和 `clang-format` 的支持，如果还能有对 CMake 的支持就更好了。

## 菜狗对 glibc 的感慨

我一开始想写吐槽，后来感觉吐槽不太好。

起因是我出于某个原因，想去看一下 glibc 对 `fputc()` 的实现，`fputc` 函数本身写的不长，毕竟光调用别的宏了，我就不断的跳，直到跳到了这里:

```c
int
__overflow (FILE *f, int ch)
{
  /* This is a single-byte stream.  */
  if (f->_mode == 0)
    _IO_fwide (f, -1);
  return _IO_OVERFLOW (f, ch);
}
```

`_IO_OVERFLOW` 也是一个宏函数，它完全展开长这个样子:

```c
((IO_validate_vtable ((*(__typeof__ (((struct _IO_FILE_plus){}).vtable)
                 *) (((char *) ((f)))
                 + __builtin_offsetof (struct _IO_FILE_plus,
                               vtable)))))
     ->__overflow) (f, ch)
```

虽然最后了解了一下貌似是为了检查这个 vtable 合不合理用的，但还是感慨，第一次看到这样的宏展开。

## 从 AstroPaper 换到了 hugo

由于每次 `npm install` 后都会输出一些依赖组件不被支持的 log，我就换到了 Hugo 生成我的博客。

## pandoc 将 Markdown 转成 PDF

我希望找到一个我较为喜欢的方式将 Markdown 转成 PDF，我目前使用中，其实曾经用的 Typora 的效果感觉还好，不过我希望用一个偏 free 一些的软件，于是选择使用了 pandoc。

使用下边的这个命令就可以转了

```bash
$ pandoc test.md -o test.pdf --pdf-engine xelatex -V CJKmainfont="Noto Sans CJK SC" -V mainfont="Noto Sans Mono"
```

xelatex 需要相关的 Tex Live 包。

## 尝试了安全启动的 Gentoo Linux

终于，家人们，我用上了安全启动 + 硬盘加密的 Gentoo Linux

下一步就是不使用 gentoo-kernel，使用 gentoo-source 编译内核（为了 CFI）
