---
title: "xv6-riscv 源码阅读——前言"
author: suo yuan
date: 2024-09-01T13:16:22Z
lastmod: 2024-09-02T03:17:52Z
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

> 目前才阅读了一些用户态的代码，内核态的代码局限于当初做 lab 看的那些，所以更新可能不能太勤

## 背景

作为我第一个接触到的操作系统内核项目（虽然我一直使用 Gentoo Linux，但 linux kernel 的代码我又没看过），我对 xv6-riscv 还是有很多兴趣的，本身我对这些系统软件就还算感兴趣。所以有了这个系列，希望可以完整的写完，并且尽量做到适合新手。

## 开发环境搭建

对于 Debian/Ubuntu or Arch Linux or WSL 大可以参考 [官方网站的命令](https://pdos.csail.mit.edu/6.1810/2024/tools.html) 安装相关软件。如果和我一样是 Gentoo Linux 的话，则是使用 [crossdev](https://wiki.gentoo.org/wiki/Crossdev) 安装这种 RISC-V 架构的编译工具链。

```bash
$ emerge --ask sys-devel/Crossdev
$ eselect repository create crossdev
$ crossdev -s1 --target riscv64-unknown-linux-gnu --ex-gdb
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

默认 qemu 安装没有 RISC-V 64 的支持，需要另开 USE 变量，我给 qemu 开了这些 USE 变量:

```txt
app-emulation/qemu virgl virtfs usbredir spice usbredirspice qemu_softmmu_targets_x86_64 qemu_softmmu_targets_riscv64
```

这里有些 USE 变量对于 xv6-riscv 没那么必要，我是因为本身日常需要装图形化的虚拟机，所以才会开这些。

重新编译一编就可以模拟 RISC-V 64 架构了。

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

可以使用 `make qemu-gdb` 开启一个用于给 gdb 调试的端口，之后新开一个终端并进入这个目录执行 `riscv64-unknown-linux-gnu-gdb`（可能你的发行版的 RISC-V 64 架构的 gdb 不叫这个名字）就可以开始调试了，不过可能一开始提示这个目录的 gdbinit 脚本不能执行，你需要在 **.config/gdb** 下信任这个脚本。

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

我使用的是 neovim，所以需要用 clangd 提供更多有关 C 语言的支持。

clangd 需要 **compile_commands.json** 文件解析项目的依赖关系，所以需要安装 bear，之后执行 `bear -- make` 重新跑一遍编译，让 bear 产生这个文件，从而让 clangd 解析。

如果你使用的是 Visual Studio Code，我更推荐安装 C/C++ 插件，因为需要用到 gdb 调试。

## make 介绍

> GNU Make is a tool which controls the generation of executables and other non-source files of a program from the program's source files. 
>
> GNU Make 是一个控制从程序源文件生成可执行文件和其他非源文件的工具。

这需要一个 Makefile 去声明项目的构建

以 xv6-riscv 的 Makefile 为例

```makefile
K=kernel
U=user
```

这就是在定义变量，后续可以使用 `$(K)` 这样的形式来使用这个变量。

```makefile
$K/kernel: $(OBJS) $K/kernel.ld $U/initcode
	$(LD) $(LDFLAGS) -T $K/kernel.ld -o $K/kernel $(OBJS) 
	$(OBJDUMP) -S $K/kernel > $K/kernel.asm
	$(OBJDUMP) -t $K/kernel | sed '1,/SYMBOL TABLE/d; s/ .* / /; /^$$/d' > $K/kernel.sym
```

这里描述了 `$K/kernel` 这个目标的编译过程以及依赖关系。`:` 后面的就是以来关系，需要等这些文件或者是这些目标以及完成后才能开始该目标的构建。而下面缩进四个空格的则是具体的构建时候的命令了。

为什么我们启动时候是输入 `make qemu`，调试的时候是用 `make qemu-gdb`，就是因为这是 Makefile 写好的。

```makefile
qemu: $K/kernel fs.img
	$(QEMU) $(QEMUOPTS)

.gdbinit: .gdbinit.tmpl-riscv
	sed "s/:1234/:$(GDBPORT)/" < $^ > $@

qemu-gdb: $K/kernel .gdbinit fs.img
	@echo "*** Now run 'gdb' in another window." 1>&2
	$(QEMU) $(QEMUOPTS) -S $(QEMUGDB)
```

## gdb 介绍

> GDB, the GNU Project debugger, allows you to see what is going on `inside' another program while it executes -- or what another program was doing at the moment it crashed. 
>
> GDB，GNU Project 调试器，允许您查看另一个程序在执行时的“内部”发生了什么，或者另一个程序在崩溃的时候正在做什么。

总的来说，gdb 是一个命令行版本的调试器，和大家编程中使用的调试器没什么两样。图形化的工具大多是 F5 开始调试，F7/F8 还是 F10/F11 用于步进和跳进之类的。命令行的工具把这些都用指令代替，可以更加专业全面的观察程序运行的行为。

上面这段话的后者是在说 core dump，在 Linux 发行版的环境中变成经常会遇到 Segmentation fault，这时候下面可能还会附带依据 core dumped，这就意味着系统已经为这次 crash 生成了一份“核心转储”文件，可以用 gdb 打开这个文件，软件会直接在发生 crash 的指令的地方打开，方便调试。可以使用 `coredumpctl` 查看生成的核心转储文件。

简单的启动一个软件就是 `gdb <software>`，进入之后，`run` 是开始运行，`breakpoint`（可以简写成 `b`）则是下断点 `b main` 就是对 main 函数下断点，也可以对行数下断点，只需要 `b test.c:xx` 就行，xx 就是行数。`continue` 可以在停止后继续执行，可以简写成 `c`。 `next` 是步进，`step` 则是跳进（实际上我有点忘记了步进和跳进的区别，反正 `step` 可以调试的时候进到函数里的，`next` 则是一行一行执行，遇到了函数也不进去，当成一个语句等待执行完毕），可以简写成 `n` 和 `s`，并且可以 `n x`，x 是数字，表示一次执行几句。

`list` 可以查看原始 C 代码（当然，前提是附加 -g 选项编译的，xv6-riscv 默认附加了这个编译选项）。`layout src` 可以启动一个 TUI 界面，让界面展示原始 C 代码，`layout asm` 则是展示汇编指令，当然还有寄存器窗口，这种时候，上下左右建都会聚焦在上面的源代码窗口，如果需要使用上下键找历史命令，需要输入 `focus cmd` 重新聚焦到命令行这部分。`print` 可以打印变量的值，也可以做一些简单的数学计算，可以用 `p` 简写，`p/x` 表示用十六进制表示，`p/s` 当然就是字符串表示，更多的可以看文档，`print` 可以打印 C 代码表达式的值，意思是如果存在一个指针 ptr，可以 `p ptr` 打印这个指针的值，也可以直接 `p *ptr` 对这个指针解引用，可以 `p &ptr` 看这个指针的地址。`x` 可以查看内存分布，`x/20` 则是看这个 \[地址，地址+20\] 范围的地址，当然这个也可以选择表示方式，并且也支持简单的 C 代码表示。

`backtrace` 可以把运行到现在函数调用的关系打印出来，可以简写成 `bt`。

gdb 支持项目存在一个 **.gdbinit** 文件，gdb 启动的时候会先执行它。gdb 可以很好的和 Python 集成，所以也存在很多用 Python 写的 gdb 插件，比如 [gef](https://github.com/hugsy/gef)。

可以再看看 [GDB Cheat Sheet](https://jyywiki.cn/OS/manuals/gdb-cheat-sheet.pdf)，里面列出了些常用的指令。

更多的可以参考 GDB 的文档: https://sourceware.org/gdb/current/onlinedocs/gdb.html/