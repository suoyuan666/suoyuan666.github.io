---
title: "在 Gentoo Linux 上尝试 musl libc + llvm 环境"
author: suo yuan
pubDatetime: 2024-08-05T09:34:33Z
featured: false
draft: false
tags:
  - gentoo-linux
  - linux
description: "尝试使用选择了 musl/llvm 的 profile 的 Gentoo Linux 作为日常使用的桌面操作系统"
---

# 在 Gentooo Linux 上尝试 musl libc + llvm 环境

## 背景

以前就有听说过 musl libc 了，一个体积小，并且完全按照标准实现的 libc，但一直没想过使用这个 libc。前几天看到 Gentoo Linux 对于 musl libc 有很多 profile 可以使用（不过都是实验性的，而非 stable）。

一定程度上这完成了[之前安装 Gentoo Linux 的文章](../gentooinstall_ng/)中的目标:

> 我在安装前的预计其实是用 Gentoo Linux，同时 init 使用 openrc，默认编译工具链用 clang/llvm，用 hardened profile 并且开一些额外的编译选项（比如 thinlto 之类的）。不过目前只实现了使用 openrc 和 hardened profile。

之前那次我没有实现这些目标，只是使用了 openrc，这次我使用这个 profile 确实实现了这一点，因为 systemd 依赖于 glibc，所以我选择使用 openrc，默认编译工具链就是 clang/llvm，甚至 C++ 标准库使用的也是提供的 [libc++](https://libcxx.llvm.org/)，因为默认用 clang/llvm 编译，所以我直接默认就开启了 thinlto。

## 安装前

[musl libc 的作者提供了一个 musl uClibc glibc dietlibc 之间的比较](https://www.etalabs.net/compare_libcs.html)，musl libc 体积上确实小，不过部分库函数的性能不如 glibc。并且由于 glibc 中存在 GNU 的一些扩展，导致 musl libc 和 glibc 不能完全兼容，一些依赖于 glibc 的闭源发行二进制软件包的程序可能无法运行在 musl libc 上，不过可以尝试使用flatpak 运行。

Chromium 浏览器无法使用 musl libc 编译，electorn 的也无法使用。一定程度上，这迫使我开始使用 neovim（因为我使用 Visual Studio Code）。

## 安装时遇到的问题

一开始装完后，进入 grub，进入 openrc 后就没后续了，之后重新装一编就没有遇到这个问题。不好评价这个问题的原因。

不知道是不是我这个内核版本的原因，我用 openrc 从来没有正常关机过，直接死在那里，后来我换到 stable 内核就没有这个问题了。

firefox-115 esr 版本无法正常编译，会报一些错误类似: `ld.lld: error: undefined hidden symbol`。详情可以参考 GitHub 上 [LLVM 的 issue](https://github.com/llvm/llvm-project/issues/79027) 以及 [FreeBSD Bugzilla](https://bugs.freebsd.org/bugzilla/show_bug.cgi?id=276746) 上的讨论。而且 `rust` 编译的部分也会出现问题。

我参考了 FreeBSD 上的解法，首先是 `rust` 那里，根据 FreeBSD Bugzilla 上的讨论，原因是:

> rust-bindgen uses some tricks to generate bindings for C++ components, but gets confused by some new constructs in libc++ 18 headers, causing it to generate faulty binding code.

该问题已经被[今年 1 月份的补丁](https://hg.mozilla.org/mozilla-central/rev/9e96d1447f6c) 解决，所以我选择不用 esr 版本，用 stable 的版本。

其次对于 undefined hidden symbol 的问题，则是为 firefox 的编译单独创建一个环境。在 **/etc/portage/env/** 目录下创建一个 **compiler-clang-firefox** 文件，文件内容是:

```txt
COMMON_FLAGS="-O2 -march=x86-64-v3 -pipe -fvisibility=hidden -fvisibility-inlines-hidden"
CLAGS="${COMMON_FLAGS}"
CXXFLAGS="${COMMON_FLAGS}"

CC="clang"
CXX="clang++"
CPP="clang-cpp"
AR="llvm-ar"
NM="llvm-nm"
RANLIB="
llvm-ranlib"
```

也就是 CXXFLAGS 加上 `-fvisibility=hidden -fvisibility-inlines-hidden`

新建 **/etc/portage/package.env/** 目录，在其中新建一个文件写入:

```txt
www-client/firefox compiler-clang-firefox
```

这样就可以使用指定的编译环境编译了。

## 后记

我没有尝试什么桌面环境，本身我这台计算机的性能就没强到哪去，所以我安装了 sway，还算正常。
