---
title: "LLVM 初探: 1. LLVM IR"
author: suo yuan
date: 2026-02-05T01:53:55Z
draft: false
tags:
  - LLVM
  - Compiler
categories:
  - LLVM 初探
description: "这是我学习 LLVM 开发的笔记，本篇是第一篇，简单介绍了 LLVM 的编译以及 LLVM IR"
summary: "这是我学习 LLVM 开发的笔记，本篇是第一篇，简单介绍了 LLVM 的编译以及 LLVM IR"
---

# LLVM 初探: 1. LLVM IR

我想试试看能不能入门 LLVM 开发，所以这系列博客将会是我这段时间学习的记录

LLVM 指的是一整套编译器和相关的工具链的集合，而 LLVM 这个名字也不是什么缩写，就是这个项目的名称。LLVM 不仅包含 Clang、LLVM core、LLD 这些编译器相关的工具，同时还有 LLDB 调试器、libc 和 libc++、Clang 下面还有 clang-tidy 和 clang-format，不过 libc 还在开发中。

## 编译 LLVM

这里就可以直接参考 [LLVM 官方文档的步骤](https://llvm.org/docs/GettingStarted.html#getting-the-source-code-and-building-llvm)了，我这里简单列举一下:

```bash
$ git clone https://github.com/llvm/llvm-project.git
$ cd llvm-project
$ cmake -S llvm -B build -G Ninja \
        -DCMAKE_INSTALL_PREFIX=~/.bin/ \
        -DCMAKE_BUILD_TYPE=RelWithDebInfo \
        -DLLVM_ENABLE_PROJECTS="clang" \
        -DLLVM_ENABLE_RUNTIMES=compiler-rt \
        -DLLVM_INSTALL_UTILS=ON \
        -DLLVM_TARGETS_TO_BUILD="X86;RISCV" \
        -DLLVM_USE_LINKER=lld \
        -DLLVM_OPTIMIZED_TABLEGEN=ON \
        -DLLVM_CCACHE_BUILD=ON \
        -DLLVM_BUILD_LLVM_DYLIB=ON \
        -DLLVM_LINK_LLVM_DYLIB=ON
$ cmake --build build
$ sudo cmake --build build -t install # $HOME/.bin/
```

默认情况下，大多数 GNU/Linux 发行版不会预装 lld 链接器。建议手动安装它，因为它的链接速度比 GNU ld 快很多，对于 LLVM 这种大型项目的编译非常有帮助。或者也可以尝试目前链接速度最快的 [mold](https://github.com/rui314/mold)，不过我个人没有试过。我因为是 Gentoo Linux + LLVM Profile 所以根本不存在没有 lld 的问题，直接就用了。

这里的 RelWithDebInfo 是带有 Debug info 的 Release 版本，不会有 Debug 版本那么大的磁盘空间占用以及性能损耗，我这里使用了 RelWithDebInfo 和动态链接方式，编译后的构建目录占用了 7 GB，之前看到有人说在 Debug 模式下的 LLVM + Clang 编译，即使是单个后端也会占用 200 GB，太恐怖了，我现在只有 240+ GB 的空间，所以我根本没尝试 Debug 模式，虽然这个应该更适合开发者使用。

我为什么特意设置 `CMAKE_INSTALL_PREFIX`，纯粹是因为默认是 /usr/local/bin/ 的话有些麻烦

## 导出 LLVM IR

这里有两个办法，第一是使用 [Compiler Explorer](https://godbolt.org/)，当你选择编译器为 Clang 后，`Add new` 选项中就会有 LLVM IR；第二是使用自己的 clang

```bash
$ clang test.c -emit-llvm -S
```

这样会生成 test.ll 文件，这就是 LLVM IR 了，我会用两个小 demo 来简单介绍 LLVM IR

### LLVM IR demo: hello

先从 hello 开始吧

```c
#include <stdio.h>

int main() {
  printf("hello\n");
  return 0;
}
```

LLVM IR 是这样:

```txt
@.str = private unnamed_addr constant [7 x i8] c"hello\0A\00", align 1

define dso_local noundef i32 @main() {
entry:
  %retval = alloca i32, align 4
  store i32 0, ptr %retval, align 4
  %call = call i32 (ptr, ...) @printf(ptr noundef @.str)
  ret i32 0
}

declare i32 @printf(ptr noundef, ...) #1
```

这里首先是定义了一个字符串常量叫做 `.str`，内容是 `hello\0a\00`。在 LLVM IR 中，字符串以十六进制表示，其中 `\0a` 是换行符 `\n` 的十六进制表示，末尾的 `\00` 是空字符 `\0`，对应 C 语言中字符串以空字符结尾的规则。`[7 x i8]` 表示这是一个包含 7 个 i8 类型的元素的数组。

在 LLVM IR 中，`@` 开头表示全局变量/常量，而 `%` 开头表示局部变量。

函数这里的 entry block 有四条 IR 指令，先是用 `alloca` 分配了 `retval` 变量的栈空间，类型为 i32。之后用 `store` 给这个变量赋值为 0，然后用 `call` 指令调用了 printf 函数，最后 `ret i32 0` 返回 0。

这里需要介绍 basic block 的概念。在编译时，一个函数会被拆分成多个 basic block，basic block 有以下特性：

1. **单入口**：只能从第一条指令进入
2. **单出口**：只能从最后一条指令离开
3. **顺序执行**：块内的指令按顺序执行，没有分支跳转

如果代码流程中出现分支或跳转，就会产生新的 basic block。由于这个 hello 示例函数逻辑简单，没有条件分支，所以只有一个 entry 这一个 block。

我们可以使用 O1 优化一下，会发现 LLVM IR 变成了

```txt
@str = private unnamed_addr constant [6 x i8] c"hello\00", align 1

define dso_local noundef i32 @main() local_unnamed_addr {
entry:
  %puts = tail call i32 @puts(ptr nonnull dereferenceable(1) @str)
  ret i32 0
}

declare noundef i32 @puts(ptr noundef readonly captures(none)) local_unnamed_addr #1
```

首先是 `printf` 的调用被优化为 `puts`，其次是 main 函数中不再有 `retval` 变量，而是直接调用 `puts` 并返回 0

这里的 `tail call` 标记表示这是一个尾调用。尾调用优化 (Tail Call Optimization, TCO) 是一种编译器优化，当函数的最后一个操作是调用另一个函数并直接返回其结果时，编译器可以复用当前函数的栈帧而不是创建新的栈帧。这在 `return func(a)` 这种场景下很有用

### LLVM IR demo: add and factorial

这里有一个加法函数和一个阶乘函数，这个 demo 比上面的复杂一些，有了流程控制，也有了我们自己写的函数的调用
```c
#include <stdio.h>

int global_var = 10;

int add(int a, int b);
int factorial(int n);

int main() {
  int x = 5;
  int y = 3;

  int z = add(x, y);
  printf("add: %d\n", z);

  int fact = factorial(x);
  printf("factorial: %d\n", fact);

  if (z >= y) {
    global_var += z;
  } else {
    global_var -= y;
  }

  int *p = &global_var;
  *p += 1;

  return 0;
}

int add(int a, int b) {
  int c = a + b;
  return c;
}

int factorial(int n) {
  if (n <= 1) {
    return 1;
  }
  int result = 1;
  for (int i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
```

我们先看 main 函数部分的 IR

```txt
@global_var = dso_local global i32 10, align 4
@.str = private unnamed_addr constant [9 x i8] c"add: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [15 x i8] c"factorial: %d\0A\00", align 1

define dso_local noundef i32 @main() {
entry:
  %retval = alloca i32, align 4
  %x = alloca i32, align 4
  %y = alloca i32, align 4
  %z = alloca i32, align 4
  %fact = alloca i32, align 4
  %p = alloca ptr, align 8

  store i32 0, ptr %retval, align 4
  store i32 5, ptr %x, align 4
  store i32 3, ptr %y, align 4

  %0 = load i32, ptr %x, align 4
  %1 = load i32, ptr %y, align 4

  %call = call noundef i32 @add(int, int)(i32 noundef %0, i32 noundef %1)

  store i32 %call, ptr %z, align 4
  %2 = load i32, ptr %z, align 4
  %call1 = call i32 (ptr, ...) @printf(ptr noundef @.str, i32 noundef %2)

  %3 = load i32, ptr %x, align 4
  %call2 = call noundef i32 @factorial(int)(i32 noundef %3)
  store i32 %call2, ptr %fact, align 4
  %4 = load i32, ptr %fact, align 4
  %call3 = call i32 (ptr, ...) @printf(ptr noundef @.str.1, i32 noundef %4)

  %5 = load i32, ptr %z, align 4
  %6 = load i32, ptr %y, align 4
  %cmp = icmp sge i32 %5, %6
  br i1 %cmp, label %if.then, label %if.else

if.then:
  %7 = load i32, ptr %z, align 4
  %8 = load i32, ptr @global_var, align 4
  %add = add nsw i32 %8, %7
  store i32 %add, ptr @global_var, align 4
  br label %if.end

if.else:
  %9 = load i32, ptr %y, align 4
  %10 = load i32, ptr @global_var, align 4
  %sub = sub nsw i32 %10, %9
  store i32 %sub, ptr @global_var, align 4
  br label %if.end

if.end:
  store ptr @global_var, ptr %p, align 8
  %11 = load ptr, ptr %p, align 8
  %12 = load i32, ptr %11, align 4
  %add4 = add nsw i32 %12, 1
  store i32 %add4, ptr %11, align 4
  ret i32 0
}
```

这是没有加优化参数时的行为，我们可以看到首先是分配栈空间，然后就按照我们 main 函数中的算术运算的顺序开始调用了 store load 和 call 之类的，这里有个

```txt
%5 = load i32, ptr %z, align 4
%6 = load i32, ptr %y, align 4
%cmp = icmp sge i32 %5, %6
br i1 %cmp, label %if.then, label %if.else
```

这里就是取出 `z` 和 `y` 的值，`icmp` 是整数比较，`sge` 表示有符号的大于等于，而 `br` 后面就是根据比较结果来判断应该跳到哪里了，`br` 在直接跟 label 的时候就是无条件跳转，这在 `if.then` block 中可以看到这个用法

在 O1 下，这些算术运算都会被干掉，因为已经进行了常量折叠的优化，这里很多求值操作都是没必要的

```txt
@global_var = dso_local local_unnamed_addr global i32 10, align 4
@.str = private unnamed_addr constant [9 x i8] c"add: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [15 x i8] c"factorial: %d\0A\00", align 1

define dso_local noundef i32 @main() local_unnamed_addr {
entry:
  %call1 = tail call i32 (ptr, ...) @printf(ptr noundef nonnull dereferenceable(1) @.str, i32 noundef 8)
  %call3 = tail call i32 (ptr, ...) @printf(ptr noundef nonnull dereferenceable(1) @.str.1, i32 noundef 120)
  %0 = load i32, ptr @global_var, align 4
  %add4 = add nsw i32 %0, 9
  store i32 %add4, ptr @global_var, align 4
  ret i32 0
}
```

这里 `add nsw` 的 `nsw` 是 No Signed Wrap，表示编译器保证有符号整数运算不会发生溢出。如果实际运行时发生溢出，则是 Undefined Behavior

这个标记使得编译器可以基于"不会溢出"的假设进行更激进的优化。类似的还有 `nuw` (No Unsigned Wrap)，表示无符号整数运算不会溢出

O1 优化下还有一个值得注意的，那就是阶乘函数的优化

```txt
define dso_local noundef i32 @factorial(int)(i32 noundef %n) local_unnamed_addr {
entry:
  %cmp = icmp slt i32 %n, 2
  br i1 %cmp, label %return, label %for.body

for.body:
  %i.07 = phi i32 [ %inc, %for.body ], [ 2, %entry ]
  %result.06 = phi i32 [ %mul, %for.body ], [ 1, %entry ]
  %mul = mul nuw nsw i32 %i.07, %result.06
  %inc = add nuw i32 %i.07, 1
  %exitcond.not = icmp eq i32 %i.07, %n
  br i1 %exitcond.not, label %return, label %for.body

return:
  %retval.0 = phi i32 [ 1, %entry ], [ %mul, %for.body ]
  ret i32 %retval.0
}
```

这里涉及到了 phi 函数，这也是由 SSA (Static Single Assignment，静态单赋值) 引入的概念，就像 LLVM 官网所说:

> LLVM began as a research project at the University of Illinois, with the goal of providing a modern, SSA-based compilation strategy capable of supporting both static and dynamic compilation of arbitrary programming languages.

LLVM 提供了现代化的基于 SSA 形式的通用编译器架构。

SSA 的核心思想是：**每个变量只能被赋值一次**。如果源代码中一个变量被多次赋值，SSA 会将它们转换为不同的变量定义。例如:

```c
int x = 0;
int y = x;
x = 1;
int z = x;
```

变成了

```c
int x = 0;
int y = x;
int x1 = 1;
int z = x1;
```

这样带来一个问题，那就是对于 if 这样的语句来说，可能会导致一个变量会有不同的取值，如果每个取值对应一个变量，那么在 if 下面应该用哪个呢

```c
if (condition) {
    x1 = 1;
} else {
    x2 = 2;
}

x3 = phi(x1, x2);
```

这就是 `phi` 函数的用处。phi 函数通常出现在多个控制流路径汇合的地方（如 if-else 语句之后、循环开始处），用于选择来自不同前驱基本块的值。`phi` 函数的语法是：

```llvm
%x3 = phi i32 [ %x1, %label1 ], [ %x2, %label2 ]
```

如果执行流从 `%label1` 来，则 `%x3 = %x1`；如果从 `%label2` 来，则 `%x3 = %x2`。

phi 函数只存在于 IR 层面，用于辅助编译器进行数据流分析和优化，在最终生成汇编代码时会被消除，转换为实际的寄存器分配或内存操作。

SSA 的引入大大简化了数据流分析的复杂度，主要优势包括：

1. **定义唯一**：每个变量只有一个定义点，变量的使用和定义之间存在明确的依赖关系
2. **简化优化**：常量传播、死代码消除、公共子表达式消除等优化变得更加简单
3. **精确的数据流分析**：可以快速找到变量的定义和使用位置

如果没有 SSA，就像我刚刚提的例子

```c
int x = 0;
int y = x;
x = 1;
int z = x;
```

z 的值依赖于 x，但编译器无法简单地追溯到 x 的定义，因为 x 在中途被重新赋值了。编译器需要进行复杂的数据流分析才能确定 z 使用的是哪个 x 的值。

对于更加复杂的表达式求值来说，在不引入 SSA 的情况下，编译器很难做常量折叠等优化。但当引入了 SSA 之后，编译器可以直接追溯变量的定义链，因为每个变量都有唯一的定义点，不会被修改。这使得 def-use 链变得非常清晰，优化器可以快速找到变量的来源并进行优化。

此时可以看回我们那个阶乘函数

```c
define dso_local noundef i32 @factorial(int)(i32 noundef %n) local_unnamed_addr {
entry:
  %cmp = icmp slt i32 %n, 2
  br i1 %cmp, label %return, label %for.body

for.body:
  %i.07 = phi i32 [ %inc, %for.body ], [ 2, %entry ]
  %result.06 = phi i32 [ %mul, %for.body ], [ 1, %entry ]
  %mul = mul nuw nsw i32 %i.07, %result.06
  %inc = add nuw i32 %i.07, 1
  %exitcond.not = icmp eq i32 %i.07, %n
  br i1 %exitcond.not, label %return, label %for.body

return:
  %retval.0 = phi i32 [ 1, %entry ], [ %mul, %for.body ]
  ret i32 %retval.0
}
```

这里的 `phi` 的含义也就理清了，也就是表明变量的不同状态

```c
  %i.07 = phi i32 [ %inc, %for.body ], [ 2, %entry ]
```

这里表示 `%i.07` 可能有两种取值来源：

1. 如果执行流从 `entry` 基本块进入，则值为 2
2. 如果执行流从 `for.body` 基本块进入(即循环回边)，则值为 `%inc`

这是循环中 phi 函数的典型用法：在循环开始时选择初始值，在循环体执行后选择更新后的值。`%result.06` 同理，在循环开始时是 1，循环体中是 `%mul`
如果你用 O2 或更高级别的优化编译，你会发现这个阶乘函数会被自动向量化，使用 SIMD 指令进行优化

```txt
define dso_local noundef i32 @factorial(int)(i32 noundef %n) local_unnamed_addr {
entry:
  %cmp = icmp slt i32 %n, 2
  br i1 %cmp, label %return, label %for.body.preheader

for.body.preheader:
  %0 = add nsw i32 %n, -1
  %min.iters.check = icmp ult i32 %n, 9
  br i1 %min.iters.check, label %for.body.preheader9, label %vector.ph

vector.ph:
  %n.vec = and i32 %0, -8
  %1 = or disjoint i32 %n.vec, 2
  br label %vector.body

vector.body:
  %index = phi i32 [ 0, %vector.ph ], [ %index.next, %vector.body ]
  %vec.ind = phi <4 x i32> [ <i32 2, i32 3, i32 4, i32 5>, %vector.ph ], [ %vec.ind.next, %vector.body ]
  %vec.phi = phi <4 x i32> [ splat (i32 1), %vector.ph ], [ %2, %vector.body ]
  %vec.phi8 = phi <4 x i32> [ splat (i32 1), %vector.ph ], [ %3, %vector.body ]
  %step.add = add <4 x i32> %vec.ind, splat (i32 4)
  %2 = mul <4 x i32> %vec.ind, %vec.phi
  %3 = mul <4 x i32> %step.add, %vec.phi8
  %index.next = add nuw i32 %index, 8
  %vec.ind.next = add <4 x i32> %vec.ind, splat (i32 8)
  %4 = icmp eq i32 %index.next, %n.vec
  br i1 %4, label %middle.block, label %vector.body

middle.block:
  %bin.rdx = mul <4 x i32> %3, %2
  %5 = tail call i32 @llvm.vector.reduce.mul.v4i32(<4 x i32> %bin.rdx)
  %cmp.n = icmp eq i32 %0, %n.vec
  br i1 %cmp.n, label %return, label %for.body.preheader9

for.body.preheader9:
  %i.07.ph = phi i32 [ 2, %for.body.preheader ], [ %1, %middle.block ]
  %result.06.ph = phi i32 [ 1, %for.body.preheader ], [ %5, %middle.block ]
  br label %for.body

for.body:
  %i.07 = phi i32 [ %inc, %for.body ], [ %i.07.ph, %for.body.preheader9 ]
  %result.06 = phi i32 [ %mul, %for.body ], [ %result.06.ph, %for.body.preheader9 ]
  %mul = mul nuw nsw i32 %i.07, %result.06
  %inc = add nuw i32 %i.07, 1
  %exitcond.not = icmp eq i32 %i.07, %n
  br i1 %exitcond.not, label %return, label %for.body

return:
  %retval.0 = phi i32 [ 1, %entry ], [ %5, %middle.block ], [ %mul, %for.body ]
  ret i32 %retval.0
}
```

## LLVM IR 的三种形式

LLVM IR 有三种等价的形式：

1. **文本形式(.ll 文件)**：人类可读的文本格式，本文展示的都是这种形式
2. **内存形式**：LLVM 在内存中的 C++ 对象表示，用于编译器内部处理
3. **二进制形式(.bc 文件，Bitcode)**：紧凑的二进制格式，可以用 `clang -emit-llvm -c` 生成

这三种形式可以互相转换，使用 `llvm-as`(文本→二进制)和 `llvm-dis`(二进制→文本)。

## LLVM IR 中的常见属性

文章中出现了一些 IR 属性，这里补充说明：

- **dso_local**：表示符号在同一个动态共享对象 (DSO) 中定义，可以进行更激进的优化
- **noundef**：表示参数或返回值不能是 `undef` (undefined)
- **align**：指定内存对齐要求，对性能有影响
- **private/internal/external**：符号的链接类型
- **unnamed_addr**：表示全局变量的地址不重要，可以与其他相同内容的常量合并
