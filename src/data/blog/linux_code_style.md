---
title: "Linux kernel 代码规范"
author: suo yuan
pubDatetime: 2024-08-11T01:25:38Z
draft: false
tags:
  - linux
description: "尝试阅读 Linux kernel 文档中的代码规范"
---

<!--more-->
尝试阅读 Linux kernel 文档中的代码规范
<!--more-->

# Linux kernel 代码规范

## 背景

我也真是闲的😅。不过话说回来，我一直有听说 Linux kernel 的代码规范，比如缩进 8 空格（这是我唯一知道的 8 字符缩进的项目），一行代码不能超过 80 个字符。

所以我准备好好看一下 Linux kernel 的代码规范到底是什么。

有几个部分并不算是比较通用的代码规范，我就没有记。

## coding style

### 缩进

Tab 就是 8 字符，因此缩进就是 8 字符。一些异端试图将缩进设为 4 甚至是 2，这就像是将 Pi 的值设置为 3 一样。

理由: 缩进的意义在于明确一些代码块的起点和终点，当你连续面对屏幕工作 20 个小时的时候，较大的缩进会让你更好的工作。

现在有些人认为 8 个字符的缩进会让代码太往右移了，但是如果你的代码超过了 3 个缩进级别，那这段代码的逻辑就是很难绷的，你应该修改它。

简化 `switch` 中的多个缩进级别的首选方式是 把 `switch` 和 `case` 对齐。例如:

```c
switch (suffix) {
case 'G':
case 'g':
        mem <<= 30;
        break;
case 'M':
case 'm':
        mem <<= 20;
        break;
case 'K':
case 'k':
        mem <<= 10;
        fallthrough;
default:
        break;
}
```

除非你有什么要隐藏的东西，否则不要在一行放多个语句:

```c
if (condition) do_this;
  do_something_everytime;
```

不要使用 `,` 而避免使用 `{}`

```c
if (condition)
        do_this(), do_that();
```

除了注释，文档和 Kconfig 之外，空格不会用于缩进。行尾不可留有空格。

### 断开长字符串

单行长度限制为 80 字符。超过 80 字符的部分应该被分成合理的块，除非超过 80 字符具有很好的可读性且不会隐藏信息。

子语句比父语句的缩进级别更深，一个常见的风格就是函数体部分和函数的左括号对齐。

不能破坏用户可见的字符串(如`printf`)。这会让用户用 `grep` 的时候很难绷

### 大括号与空格

C 代码风格中经常会出现的问题就是大括号的位置，这几乎不存在技术原因的选择。Kernighan 和 Ritchie 向我们展示了一种风格:

```c
if (x is true) {
        we do y
}
```

这适用于所有非函数语句块，如:

```c
switch (action) {
case KOBJ_ADD:
        return "add";
case KOBJ_REMOVE:
        return "remove";
case KOBJ_CHANGE:
        return "change";
default:
        return NULL;
}
```

函数是一种特殊情况: 它的左大括号是另起一行:

```c
int function(int x)
{
        body of function
}
```

右大括号所在的那一行应该不会有其他语句，除非那个语句是上面这段语句的连续，如:

```c
do {
        body of do-loop
} while (condition);

if (x == y) {
        ..
} else if (x > y) {
        ...
} else {
        ....
}
```

理由: K&R

如无必要，单个语句即可完成的地方不用大括号:

```c
if (condition)
        do_this();
else
        do_that();
```

但像 `if-else` 只有一个分支是单个语句的话就应该都加大括号:

```c
if (condition) {
        do_this();
        do_that();
} else {
        otherwise();
}
```

此外，当循环包含多个简单语句的时候使用大括号:

```c
while (condition) {
        if (test)
                do_something();
}
```

#### 空格

Linux kernel 使用空格的风格主要在于函数和关键字的使用。大多数关键字后面都加空格，除了 `sizeof`, `typedef`, `alignof` 和 ` __attribute__`。

也就是 `if, switch, case, for, do, while` 这样的关键字后面跟空格，但是下面这段代码不会:

```c
s = sizeof(struct file);
```

不要写成 `s = sizeof( struct file );` 这样很难绷。

当声明指针或者返回指针类型的函数时，`*` 首选的办法是和变量名或者函数名靠近，而不是和类型名靠近:

```c
char *linux_banner;
unsigned long long memparse(char *ptr, char **retptr);
char *match_strdup(substring_t *s);
```

下面这些二元运算符左右两边都加空格:

```c
=  +  -  <  >  *  /  %  |  &  ^  <=  >=  ==  !=  ?  :
```

但下面这些一元运算符后面没有空格:

```c
&  *  +  -  ~  !  sizeof  typeof  alignof  __attribute__  defined
```

`++  --` 运算符靠近变量那一侧没有空格（就是 `a++` 而不是 `a ++`）

`.` 和 `->` 周围没有空格

不要在行尾留有空格

### 命名

C 语言中不要使用诸如 `ThisVariableIsATemporaryCounter` 这样的变量命名，这应该写成 `tmp`。

虽然大小写混合的名称不受欢迎，但是全局的符号的名称要具有一定的用于描述的信息，比如统计当前活跃的用户数量的函数，可以命名为 `count_active_users`，但不要写成 `cntusr()`。

将函数类型编码到其名称中的行为（被称为 Hungarian notation，匈牙利表示法）是很难绷的，编译器无论如何都知道它的类型，这只会让开发者感到困惑。

本地变量命名要尽可能简短，比如一个循环计数器被命名为 `i`，为了不产生误解而命名成 `loop_counter` 是没有意义的行为，`tmp` 也可以用于临时存储任何类型的值。

如果你害怕混淆局部变量的名称，那么你就会遇到另一个问题—— function-growth-hormone-imbalance syndrome，参考 函数 那部分。

对于符号名称和文档，避免 `master / slave` 或 `blacklist / whitelist` 的用法。

对于 `master / slave`，推荐使用:

```txt
‘{primary,main} / {secondary,replica,subordinate}’ ‘{initiator,requester} / {target,responder}’ ‘{controller,host} / {device,worker,proxy}’ ‘leader / follower’ ‘director / performer’
```

`blacklist / whitelist` 推荐使用:

```txt
‘denylist / allowlist’ ‘blocklist / passlist’
```

引入新用法的情况是维护用户空间的 ABI/API，或者更新代码以符合 2020 年前存在的硬件或协议规范（这些规范强制使用这些术语）。对于新规范，应尽可能将其翻译成现有的编码标准。

### Typedefs

不要对使用类似 `vps_t` 的东西，对结构体和指针使用 `typedef` 是很难绷的行为。当你看到下面这段代码时，你可能会有些困惑:

```c
vps_t a;
```

但如果换成下面这样就很清晰:

```c
struct virtual_container *a;
```

有人认为 `typedef` 就会帮助提高可读性，但实际上未必，只有下面这些情况是有用的:

- 完全不透明的地方，使用 `typedef` 主动隐藏对象是什么
  - 例如 `pte_t` 等对象，你必须正确使用访问函数（accessor functions）去访问它们。
  - 不透明和访问函数本身并不好，为 `pte_t` 等设计成这样的原因是可移植的信息基本为 0（貌似意思是说，不同架构的 `pte_t` 实际类型不一致）
- 清晰整数类型，这种抽象有助于避免混淆，无论是 `int` 还是 `long`，`u8`, `u16`, `u64` 就是很好的类型定义。
  - 某些时候可能会遇到不同架构使用不同的数据类型的情况，这时候可以使用 `typedef unsigned int myflags_t;` 将类型抽象出来。
- 当你使用 sparse 来创建一个新的类型进行类型检查时
  - [sparse](https://lwn.net/Articles/689907/) 是一个语法检查工具。
- 在一些特殊情况下，新类型和 C99 类型相同。
  - 比如有些人不习惯 `uint32_t` 类型，因此，Linux 有 `u8`, `u16`, `u32`, `u64`。
- 在用户空间安全的类型
  - 在部分用户空间可见的结构中，不能要求 C99 的类型，也不能使用 `u32`，因此都使用 `__u32` 或类似的。

或许还有其他情况，但基本规则就这些了。

通常，指针和结构体等合理使用的元素，应该直接访问，而不是使用 `typedef`

### 函数

函数应该简短优雅，它们应该占用一两个屏幕的大小（众所周知，ISO/ANSI 屏幕尺寸 80x24）。

函数的最大长度与函数的复杂性和缩进级别成反比。如果你有一个概念上很简单的函数，它只是一个长（但简单）的 `case` 语句，你必须为许多不同的情况做很多小事情，那么一个更长的函数是可以接受的。

如果你有一个复杂的函数，并且你怀疑一个不太有天赋的初学者可能甚至无法理解这个函数是什么，你应该更加严格地遵守最大限制。使用具有描述性名称的辅助函数（如果你认为它对性能至关重要，可以让编译器内联它们，它可能会比你做得更好）。

函数的另一个衡量标准是局部变量的数量。它们不应超过 5-10，否则你就做错了。重新思考该功能，并将其分成更小的部分。人脑通常可以轻松地记住大约 7 种不同的事物，任何更多的事物都会变得混乱。您知道自己很聪明，但也许您想了解两周后自己做了什么。

在源文件中，用一个空行分隔函数。如果函数是导出的，则其 EXPORT 宏应紧跟在大括号所在行之后:

```c
int system_is_up(void)
{
        return system_state == SYSTEM_RUNNING;
}
EXPORT_SYMBOL(system_is_up);
```

#### 函数原型

在函数原型中,将参数名称及其数据类型包括在内。尽管 C 语言并不要求，但在 Linux 中是首选 因为这是为读者添加有价值信息的简单方法。

不要在函数声明中使用 `extern` 关键字，因为这会使行更长，而且并不是绝对必要的。

函数原型应该遵循 [元素顺序规则](https://lore.kernel.org/mm-commits/CAHk-=wiOCLRny5aifWNhr621kYrJwhfURsa0vFPeUEm8mF0ufg@mail.gmail.com/):

```c
__init void * __must_check action(enum magic value, size_t size, u8 count,
                                  char *fmt, ...) __printf(4, 5) __malloc;
```

- 存储类（下面是 `static __always_inline`，注意 `__always_inline` 在技术上是一个属性，但被视为内联）
- 存储类属性（此处为 `__init`，即节声明，但也包括 `__cold` 之类的东西）
- 返回类型（此处为 `void *`）
- 返回类型属性（此处为 `__must_check`）
- 函数名称（此处为 `action`）
- 函数参数（这里，`(enum magic value，size_t size，u8 count，char *fmt，...)`，注意应始终包含参数名称）
- 函数参数属性（此处为 `__printf(4, 5)`）
- 函数行为属性（此处为 `__malloc`）

对于函数定义（即实际的函数体），编译器不允许在函数参数之后添加函数参数属性。在这些情况下，它们应该遵循存储类属性（例如，与上面的声明示例相比，请注意下面 `__printf(4, 5)` 的位置更改）

```c
static __always_inline __init __printf(4, 5) void * __must_check action(enum magic value,
               size_t size, u8 count, char *fmt, ...) __malloc
{
       ...
}
```

### 函数推出逻辑的集中

当函数从多个位置退出并且必须完成一些常见工作（例如清理）时，`goto` 语句会派上用场。如果不需要清理则直接返回。

选择说明 `goto` 功能或 `goto` 存在原因的标签名称。 `out_free_buffer` 是一个好名字的例子：如果 `goto` 释放缓冲区。避免使用 `err1`: 和 `err2`: 等 GW-BASIC 名称，因为如果您添加或删除退出路径，则必须对它们重新编号，而且无论如何它们都会使正确性难以验证。

- 无条件陈述更容易理解和遵循
- 嵌套减少
- 防止在进行修改时因不更新各个退出点而出现的错误
- 节省编译器优化冗余代码的工作

```c
int fun(int a)
{
        int result = 0;
        char *buffer;

        buffer = kmalloc(SIZE, GFP_KERNEL);
        if (!buffer)
                return -ENOMEM;

        if (condition1) {
                while (loop1) {
                        ...
                }
                result = 1;
                goto out_free_buffer;
        }
        ...
out_free_buffer:
        kfree(buffer);
        return result;
}
```

### 注释

注释是好的，但也存在过度注释的危险。永远不要试图在注释中解释你的代码是如何工作的：最好编写代码，以便其工作原理显而易见，并且解释写得不好的代码是浪费时间。

一般来说，您希望您的注释说明您的代码做了什么，而不是如何做。另外，尽量避免在函数体内添加注释：如果函数非常复杂，您需要单独注释其中的某些部分，那么您可能应该暂时返回到函数那部分的说明。您可以发表一些小注释来注意或警告某些特别聪明（或丑陋）的事情，但尽量避免过度。相反，将注释放在函数的开头，告诉人们它的作用，以及可能为什么这样做。

多行注释的首选格式是:

```c
/*
 * This is the preferred style for multi-line
 * comments in the Linux kernel source code.
 * Please use it consistently.
 *
 * Description:  A column of asterisks on the left side,
 * with beginning and ending almost-blank lines.
 */
```

对于 net/, drivers/net/ 中的文件，推荐的多行注释格式是:

```c
/* The preferred comment style for files in net/ and drivers/net
 * looks like this.
 *
 * It is nearly the same as the generally preferred comment style,
 * but there is no initial almost-blank line.
 */
```

对数据进行注释也很重要，无论它们是基本类型还是派生类型。为此，每行仅使用一个数据声明（多个数据声明不使用逗号）。这为您留下了对每个项目进行小评论的空间，解释其用途。

### 宏，枚举 和 RTL

宏和枚举中的常量都应该大写定义

```c
#define CONSTANT 0x12345
```

### 内联

似乎有一种常见的误解，认为 gcc 有一个神奇的“让程序更快”加速选项，称为内联。虽然使用内联可能是合适的（例如作为替换宏的一种方法），但通常情况下并不合适。大量使用 inline 关键字会导致内核变得更大，这反过来又会减慢系统的整体速度，因为 CPU 的 icache 占用空间更大，而且可用于页面缓存的内存更少。想一想吧；页面缓存未命中会导致磁盘查找，这很容易花费 5 毫秒。有很多 CPU 周期可以进入这 5 毫秒。

一个合理的经验法则是不要在代码超过 3 行的函数中放置内联。此规则的一个例外是已知参数是编译时常量的情况，并且由于这种常量，您知道编译器将能够在编译时优化大部分函数。有关后一种情况的一个很好的示例，请参阅 `kmalloc()` 内联函数。

人们常常认为，向静态且仅使用一次的函数添加内联始终是一个胜利，因为没有空间权衡。虽然这在技术上是正确的，但 gcc 能够在没有帮助的情况下自动内联这些内容，并且当函数被多次使用时，需要移除inline关键字以避免潜在问题，这个维护问题可能超过了提示 gcc 做它本来会做的事情的好处。

### 函数返回值和名称

函数可以返回多种不同类型的值，最常见的一种是指示函数是成功还是失败的值。这样的值可以表示为错误代码整数（-Exxx = 失败，0 = 成功）或成功的布尔值（零 = 失败，非零 = 成功）。

混合这两种表示形式是难以发现的错误的丰富来源。如果 C 语言对整数和布尔值进行了严格区分，那么编译器就会为我们发现这些错误……但事实并非如此。为了帮助防止此类错误，请始终遵循以下约定：

> If the name of a function is an action or an imperative command, the function should return an error-code integer. If the name is a predicate, the function should return a "succeeded" boolean.
>
> 如果函数的名称是动作或命令式命令，该函数应返回一个错误代码整数。 如果名字是一个 predicate，该函数应该返回一个“成功”布尔值。

例如，add work 是一个命令，`add_work()` 函数返回 0 表示成功，或 -EBUSY 表示失败。同样，PCI 设备存在是一个 predicate，如果 `pci_dev_present()` 函数成功找到匹配设备，则返回 1，否则返回 0。

所有 EXPORT 函数都必须遵守此约定，所有公共函数也应如此。私有（静态）函数不需要，但建议这样做。

返回值是计算的实际结果而不是计算是否成功的指示的函数不受此规则的约束。通常，它们通过返回一些超出范围的结果来指示失败。典型的例子是返回指针的函数；他们使用 `NULL` 或 `ERR_PTR` 机制来报告失败。

### bool

Linux kernel 的 `bool` 类型是 C99 `_Bool` 类型的别名。 `bool` 值只能计算为 0 或 1，隐式或显式转换为 `bool` 会自动将该值转换为 true 或 false。当使用 `bool` 类型时 !!不需要构建，这消除了一类错误。

`bool` 函数返回类型和堆栈变量总是可以在适当的时候使用。鼓励使用 `bool` 来提高可读性，并且通常是比 `int` 更好的选择来存储布尔值。

如果缓存行布局或值的大小很重要，请勿使用 `bool`，因为其大小和对齐方式根据编译的体系结构而变化。针对对齐和大小进行优化的结构不应使用 `bool`。

如果结构有许多 true/false 值，请考虑将它们合并到具有 1 位成员的位字段中，或使用适当的固定宽度类型，例如 u8。

类似地，对于函数参数，许多 true/false 可以合并到单个按位“标志”参数中，如果调用站点具有裸露的真/假常量，那么“标志”通常可以是更具可读性的替代方案。

否则，在结构和参数中限制使用 `bool` 可以提高可读性。

### 内联汇编

在架构特定代码中，你可能需要使用内联汇编来与 CPU 或平台功能进行接口。必要时不要犹豫使用内联汇编。但是，不要在 C 可以完成任务时滥用内联汇编。当可能时，你可以并且应该从 C 中访问硬件。

考虑编写简单的辅助函数来包装内联汇编的常见位，而不是重复编写稍有变化的函数。请记住，内联汇编可以使用 C 参数。

大型的、重要的汇编函数应该放在 .S 文件中，并在 C 头文件中定义相应的 C 原型。汇编函数的 C 原型应使用 `asmlinkage`。

---

根据 [kernel newbies](https://kernelnewbies.org/FAQ/asmlinkage)，`asmlinkage` 是一个宏，它告诉编译器该函数不应期望在寄存器中找到其任何参数（常见的优化），而只能在 CPU 的堆栈上找到。

---

您可能需要将您的 asm 语句标记为 `volatile` ，以防止 GCC 在没有注意到任何副作用时删除它。不过，您并不总是需要这样做，而且不必要地这样做会限制优化。

### Conditional Compilation

在可能的情况下，不要在 .c 文件中使用预处理器条件指令（如 `#if`, `#ifdef` 等），这样会使代码更难读懂，逻辑也更难跟踪。相反，应该在头文件中定义这些条件指令，用于定义在 .c 文件中使用的函数，并在 `#else` 情况下提供无操作的占位版本。然后，从 .c 文件中无条件调用这些函数。编译器会避免为占位调用生成任何代码，从而产生相同的结果，但逻辑仍然容易跟踪。

更倾向于编译出整个函数，而不是函数的一部分或表达式的一部分。不要在表达式中放置 `ifdef`，而是将表达式的一部分或全部提取到一个单独的辅助函数中，并将条件应用于该函数。

如果你有一个函数或变量在特定配置下可能不会被使用，并且编译器会警告其定义未使用，可以将其标记为 `__maybe_unused`，而不是将其包裹在预处理器条件指令中。（但是，如果一个函数或变量始终不会被使用，请删除它）。
