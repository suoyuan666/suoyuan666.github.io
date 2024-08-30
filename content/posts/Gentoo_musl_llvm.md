---
title: "在 Gentoo Linux 上尝试 musl libc + llvm 环境"
author: suo yuan
date: 2024-08-05T09:34:33Z
lastmod: 2024-08-29T22:58:02Z
draft: false
categories:
  - Linux_杂谈
tags:
  - gentoo-linux
  - linux
  - musl libc
description: "尝试使用选择了 musl/llvm 的 profile 的 Gentoo Linux 作为日常使用的桌面操作系统"
---

<!--more-->
尝试使用选择了 musl/llvm 的 profile 的 Gentoo Linux 作为日常使用的桌面操作系统
<!--more-->

# 在 Gentooo Linux 上尝试 musl libc + llvm 环境

## 背景

以前就有听说过 musl libc 了，一个体积小，并且完全按照标准实现的 libc，但一直没想过使用这个 libc。前几天看到 Gentoo Linux 对于 musl libc 有很多 profile 可以使用（不过都是实验性的，而非 stable）。

一定程度上这完成了[之前安装 Gentoo Linux 的文章](../gentooinstall_ng/)中的目标:

> 我在安装前的预计其实是用 Gentoo Linux，同时 init 使用 openrc，默认编译工具链用 clang/llvm，用 hardened profile 并且开一些额外的编译选项（比如 thinlto 之类的）。不过目前只实现了使用 openrc 和 hardened profile。

之前那次我没有实现这些目标，只是使用了 openrc，这次我使用这个 profile 确实实现了这一点，因为 systemd 依赖于 glibc，所以我选择使用 openrc，默认编译工具链就是 clang/llvm，甚至 C++ 标准库使用的也是提供的 [libc++](https://libcxx.llvm.org/)，因为默认用 clang/llvm 编译，所以我直接默认就开启了 thinlto。

## 安装前

[musl libc 的作者提供了一个 musl uClibc glibc dietlibc 之间的比较](https://www.etalabs.net/compare_libcs.html)，musl libc 体积上确实小，不过部分库函数的性能不如 glibc。并且由于 glibc 中存在 GNU 的一些扩展，导致 musl libc 和 glibc 不能完全兼容，一些依赖于 glibc 的闭源发行二进制软件包的程序可能无法运行在 musl libc 上，不过可以尝试使用flatpak 运行。

Chromium 浏览器无法使用 musl libc 编译，electorn 的也无法使用。一定程度上，这迫使一直用 Visual Studio Code 的我开始使用 neovim。

musl libc 支持的 locale 还不是很多：

```txt
  [1]   C
  [2]   C.UTF-8
  [3]   sr_RS.UTF-8
  [4]   cs_CZ.UTF-8
  [5]   nb_NO.UTF-8
  [6]   de_DE.UTF-8
  [7]   sv_SE.UTF-8
  [8]   nl_NL.UTF-8
  [9]   fr_FR.UTF-8
  [10]  fi_FI.UTF-8
  [11]  en_GB.UTF-8
  [12]  it_IT.UTF-8
  [13]  pt_PT.UTF-8
  [14]  en_US.UTF-8 *
  [15]  de_CH.UTF-8
  [16]  es_ES.UTF-8
  [17]  pt_BR.UTF-8
  [18]  ru_RU.UTF-8
```

这里没有 zh_CN.UTF-8。

musl libc 设置时区的方式也会有所不同，需要在 **/etc/env.d/00musl** 文件中写好 `TZ` 环境变量。

以上关于 locale 和时区的设置，[Gentoo wiki](https://wiki.gentoo.org/wiki/Musl_usage_guide) 都有说明。在 [Gentoo 的另一篇 wiki](https://wiki.gentoo.org/wiki/Musl_porting_notes) 记录了一些常见的 musl libc 编译可能遇到的问题（即编译那些一定程度上依赖于 glibc 的软件）。

## 安装时遇到的问题

一开始装完后，进入 grub，进入 openrc 后就没后续了，之后重新装一编就没有遇到这个问题。不好评价这个问题的原因。

不知道是不是我这个内核版本的原因，我用 openrc 从来没有正常关机过，直接死在那里，后来我换到 stable 内核就没有这个问题了。

firefox-115 esr 版本无法正常编译，会报一些错误类似: `ld.lld: error: undefined hidden symbol`。详情可以参考 GitHub 上 [LLVM 的 issue](https://github.com/llvm/llvm-project/issues/79027) 以及 [FreeBSD Bugzilla](https://bugs.freebsd.org/bugzilla/show_bug.cgi?id=276746) 上的讨论。而且 `rust` 编译的部分也会出现问题。

我参考了 FreeBSD 上的解法，首先是 `rust` 那里，根据 FreeBSD Bugzilla 上的讨论，原因是:

> rust-bindgen uses some tricks to generate bindings for C++ components, but gets confused by some new constructs in libc++ 18 headers, causing it to generate faulty binding code.

该问题已经被[今年 1 月份的补丁](https://hg.mozilla.org/mozilla-central/rev/9e96d1447f6c) 解决，对此我选择不用 esr 版本，用 stable 的版本。

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

对于 [dev-libs/darts](https://packages.gentoo.org/packages/dev-libs/darts) 来说，由于 **src/lexicon.h** 中的 `std::random_shuffle` 在 `std` 中已经不存在，[cppreference](https://en.cppreference.com/w/cpp/algorithm/random_shuffle) 中也可以看到，该函数 从 C++ 17 开始就废除了。所以我给它写了个 patch。

在 **/etc/portage/** 目录下新建一个 **patches** 的文件夹，然后在 **patches** 里新建 **dev-libs/darts** 这两级文件夹，之后把补丁放进去，安装的时候会自动 patch。

```patch
diff --git a/src/lexicon.h b/src/lexicon.h
index a2935f4..2a30d1b 100644
--- a/src/lexicon.h
+++ b/src/lexicon.h
@@ -1,3 +1,4 @@
+// clang-format off
 #ifndef DARTS_LEXICON_H_
 #define DARTS_LEXICON_H_

@@ -7,6 +8,7 @@
 #include <ctime>
 #include <iostream>
 #include <limits>
+#include <random>
 #include <vector>

 #include "./mersenne-twister.h"
@@ -58,9 +60,9 @@ class Lexicon {
   }
   // randomize() shuffles keys. Values are not affected.
   void randomize() {
-    Darts::MersenneTwister mt(
-        static_cast<Darts::MersenneTwister::int_type>(std::time(NULL)));
-    std::random_shuffle(keys_.begin(), keys_.end(), mt);
+    std::random_device rd;
+    std::mt19937 g(rd());
+    std::shuffle(keys_.begin(), keys_.end(), g);
   }

   void split();
```

我开头有 `// clang-format off` 的原因是我的 neovim 会保存时候自动调用 clang-format 格式化。

如果遇到了 Hyprland 0.42 编译失败的情况，报错是 `copy_if` 等函数没有找到，可以使用我找到的这个 patch

```patch
From eb42adc4c090918ad6be9fcb24066da8cdfd9bd0 Mon Sep 17 00:00:00 2001
From: Serenity Braesch <Serenity.Braesch@proton.me>
Date: Sat, 24 Aug 2024 01:53:08 -0600
Subject: [PATCH] Fix missing include needed by clang

---
 src/managers/XCursorManager.cpp | 1 +
 1 file changed, 1 insertion(+)

diff --git a/src/managers/XCursorManager.cpp b/src/managers/XCursorManager.cpp
index 7fc21a28..1e7ca535 100644
--- a/src/managers/XCursorManager.cpp
+++ b/src/managers/XCursorManager.cpp
@@ -1,3 +1,4 @@
+#include <algorithm>
 #include <cstring>
 #include <dirent.h>
 #include <filesystem>
-- 
2.44.2
```

这已经被 [合并到 Hyprland 主线](https://github.com/hyprwm/Hyprland/pull/7490) 里了，等下一个版本应该就没这个事情了。

## 后记

我没有尝试什么桌面环境，本身我这台计算机的性能就没强到哪去，所以我安装了 sway，还算正常。后来还是用了 Hyprland，xdg-desktop-portal-hyprland 这个软件是 guru 仓库内的，好家伙。
