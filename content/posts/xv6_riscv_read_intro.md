---
title: "xv6-riscv 源码阅读——前言"
author: suo yuan
date: 2024-09-01T13:16:22Z
# lastmod: 2024-08-29T22:58:02Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 项目读一遍，这是前言，不包括实际代码部分"
summary: "尝试把 xv6-riscv 项目读一遍，这是前言，不包括实际代码部分"
---

# xv6-riscv 源码阅读——前言

---

目前才阅读了一些用户态的代码，内核态的代码局限于当初做 lab 看的那些，所以更新可能不能太勤

---

## 背景

作为我第一个接触到的操作系统内核项目（虽然我一直使用 Gentoo Linux，但 linux kernel 的代码我又没看过），我对 xv6-riscv 还是有很多兴趣的，本身我对这些系统软件就还算感兴趣。所以有了这个系列，希望可以完整的写完，并且尽量做到适合新手。

## 开发环境搭建

对于 Debian/Ubuntu or Arch Linux or WSL 大可以参考 [官方网站的命令](https://pdos.csail.mit.edu/6.1810/2024/tools.html) 安装相关软件。如果和我一样是 Gentoo Linux 的话，则是使用 [crossdev](https://wiki.gentoo.org/wiki/Crossdev) 安装这种 riscv 架构的编译工具链。

```bash
$ emerge --ask sys-devel/Crossdev
$ eselect repository create crossdev
$ crossdev -s2 --target riscv64-unknown-linux-gnu --ex-gdb
```

这里的 `-s1` 是选择安装的级别，根据 `crossdev --help`:

```txt
Stage Options:
    -s0, --stage0            Build just binutils
    -s1, --stage1            Also build a bare C compiler (no C library/
                                C++/shared GCC libs/C++ exceptions/etc...)
    -s2, --stage2            Also build kernel headers
    -s3, --stage3            Also build the C library
    -s4, --stage4            Also build a full compiler [default]
                                (shared libs GCC/various lang frontends/etc...)
```

这个项目不需要 C library 和 kernel headers 什么的，毕竟是跑在 qemu 上的。

默认 qemu 安装没有 riscv64 的支持，需要另开 USE 变量，我给 qemu 开了这些 USE 变量:

```txt
app-emulation/qemu virgl virtfs usbredir spice usbredirspice qemu_softmmu_targets_x86_64 qemu_softmmu_targets_riscv64
```

重新编译一编就可以模拟 riscv64 架构了。

使用下面的命令下载和编译项目:

```bash
$ git clone https://github.com/mit-pdos/xv6-riscv.git
$ cd xv6-riscv
$ make qemu
```

等一段时间就可以发现进入了一个 shell 环境:

```bash
$ make qemu
qemu-system-riscv64 -machine virt -bios none -kernel kernel/kernel -m 128M -smp 3 -nographic -global virtio-mmio.force-legacy=false -drive file=fs.img,if=none,format=raw,id=x0 -device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0

xv6 kernel is booting

hart 2 starting
hart 1 starting
init: starting sh
$ 
```

我这里是已经跑过编译了，所以会直接起 qemu。

输入 `Ctrl + a` 之后再输入 `x` 就可以退出 qemu，如果输入的是 `c` 而不是 `x` 则是进入 qemu 的 monitor 模式。

可以使用 `make qemu-gdb` 开启一个用于给 gdb 调试的端口，之后新开一个终端并进入这个目录执行 `riscv64-unknown-linux-gnu-gdb`（可能你的发行版的 riscv64 架构的 gdb 不叫这个名字）就可以开始调试了，不过可能一开始提示这个目录的 gdbinit 脚本不能执行，你需要在 **.config/gdb** 下信任这个脚本。

这个脚本内容很简单

```gdbinit
set confirm off
set architecture riscv:rv64
target remote 127.0.0.1:26000
symbol-file kernel/kernel
set disassemble-next-line auto
set riscv use-compressed-breakpoints yes
```

就是做了一些简单初始化的工作，让你可以上来就可以开始调试 kernel。

执行 `make clean` 可以清理掉编译产生的文件，只留下那些源文件。

clangd 需要 **compile_commands.json** 文件解析项目的依赖关系，所以需要安装 bear，之后执行 `bear -- make` 重新跑一遍编译，让 bear 产生这个文件，从而让 clangd 解析。


TODO: make gdb 等简单介绍
