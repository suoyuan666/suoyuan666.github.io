---
title: "Verilator 使用"
author: suo yuan
date: 2024-09-20T04:54:29Z
lastmod: 2025-01-10T10:31:22Z
draft: false
tags:
  - Verilator
  - Intro
description: "Verilator 的简单使用，现在的内容还没什么深度，后期接触的深了会继续更新"
summary: "Verilator 的简单使用，现在的内容还没什么深度，后期接触的深了会继续更新"
---

# Verilator 使用

因为报名了[一生一芯](https://ysyx.oscc.cc/)，所以简单学习了一下 Verilator 的使用。

## Verilator 介绍

Verilator 是开源的 Verilog 仿真测试工具，可以通过编写 C/C++ 完成对 Verilog 的仿真，Verilator 会将 Verilog 转换成 C/C++ 并与测试文件一起编译成程序运行，从而看到仿真结果。

> Verilator is a free and open-source software tool which converts Verilog (a hardware description language) to a cycle-accurate behavioral model in C++ or SystemC. The generated models are cycle-accurate and 2-state; as a consequence, the models typically offer higher performance than the more widely used event-driven simulators, which can model behavior within the clock cycle. Verilator is now used within academic research, open source projects and for commercial semiconductor development. It is part of the growing body of free EDA software.
>
> Verilator 是一款自由的开源软件，可将 Verilog （一种硬件描述语言）转换为 C++ 或 SystemC 中的周期精确行为模型。生成的模型具有周期精确性和状态性；因此，这些模型通常比更广泛使用的事件驱动模拟器提供更高的性能，后者可以在时钟周期内建模行为。Verilator 现在用于学术研究、开源项目和商业半导体开发。它是日益壮大的免费 EDA 软件群体的一部分。

## 安装 Verilator

你不是 Gentoo Linux 的话，都完全没有看安装这部分的必要，直接从使用部分看起吧。

[一生一芯要求](https://ysyx.oscc.cc/docs/2306/preliminary/0.4.html#stfw-rtfm)的 Verilator 的版本为 5.008，可惜 [guru](https://github.com/gentoo-mirror/guru) 的 [sci-electronics/verilator](https://github.com/gentoo-mirror/guru/tree/master/sci-electronics/verilator) 并没有这个版本，我特地本地创建了一个仓库，把 guru 的这个 EBUILD 抄到了那里。

我使用的是 llvm/systemd profile，`CXXFLAGS` 是 `-O3 -pipe -flto=thin -fstack-protector-strong -fstack-clash-protection -fcf-protection=full -D_FORTIFY_SOURCE=3`，`LDFLAGS` 是 `-Wl,-O3,-z,now,--as-needed,--lto-O3,--icf=safe,--gc-sections`，但是编译的时候内存占用显示直接满了，我尝试降低编译时并行的线程数量，后来告诉我链接出现了问题，我懒得去看到底是哪位的问题了，直接用的 `gcc-nolto` 这个 env 编译的，我的 gcc-nolto 内容如下:

```txt
CC="gcc"
CXX="g++"
CPP="gcc -E"
AR="ar"
NM="nm"
RANLIB="ranlib"
CFLAGS="-O3 -march=x86-64-v3 -pipe -fstack-protector-strong -fstack-clash-protection -fcf-protection=full"
CXXFLAGS="${CFLAGS}"
LDFLAGS="-Wl,-O3,-z,now"
```

> 2025 年 1 月 10 号
>
> 我今天重装了一遍，发现用 GCC 就行，不需要 nolto，我开了 `-flto` 编译也可以成功，不过 Clang 编译失败

## 使用 Verilator

可以参考[官方文档给出的例子](https://verilator.org/guide/latest/example_cc.html)，还有 [USTC CECS 2023](https://soc.ustc.edu.cn/CECS/lab2/verilator/) 中也简单介绍了一点 Verilator 的使用。

你可能有生成波形图的需求，可以参考[官方文档的 FAQ](https://verilator.org/guide/latest/faq.html) 中的 **How do I generate waveforms (traces) in C++?** 给出的办法。

## 一生一芯: 关于 NVBoard

我在编译 NVBoard 总是报错 ld: DSO missing from command line 什么的，我一开始思索是否是因为我系统用的不是 GCC 的 libstdc++ 而是 LLVM 的 libc++ 的原因，但是我一时间没有找到全局使用 clang/llvm 编译工具链的方法。后来通过 AI 了解到一个解决办法: `-lc++`
