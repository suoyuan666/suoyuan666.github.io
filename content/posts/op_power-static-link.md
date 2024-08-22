---
title: "程序员的自我修养：静态链接"
author: suo yuan
date: 2022-10-30T03:42:51Z
draft: false
tags:
  - readding notes
  - compilation principle
description:
  "程序员的自我修养：链接、装载与库这本书的读书笔记"
---

<!--more-->
程序员的自我修养：链接、装载与库这本书的读书笔记
<!--more-->

# 编译和链接

## 被隐藏的过程

编译器利用源代码输出与之对应的可执行文件可以被分解为四个步骤：预处理、汇编、编译和链接。

### 预处理

预处理阶段处理那些预处理指令（以#开头的那些）。

```
$ gcc -E hello.c -o hello.i
```

处理规则如下：

- 将所有的#define删除，展开所有的宏定义。
- 处理所有的条件预处理指令，如#if、#ifdef、#elif、#else、#endif
- 处理#include预处理指令，将包含的文件插入该预编译指令的位置。
- 删除所有的注释
- 添加行号和文件名标识，以便编译时产生调试用的行号信息和用于报错
- 保留所有的#program指令

### 编译

编译就是将处理完的文件进行一系列的词法分析、语法分析及优化后生成对应的汇编代码文件

### 汇编

汇编就是将汇编代码转化成机器代码

### 链接

链接就是将引入的头文件链接到一起

## 编译器的作为

假设源代码里有一句：

```C
array[index] = (index + 4) * (2 + 6);
```

### 词法分析
源代码被输入到扫描器，运用一种类似于有限状态机的算法将源代码的字符序列分割成一系列的记号。

词法分析产生的记号一般可以被分为如下几类：关键字、标识符、字面量（数字、字符串等）和特殊符号（如加号、等号）。识别的同时，扫描器也完成了其他工作。比如说将标识符存入符号表，数字、字符串常量存放到文字表等，以备后续步骤使用。

上述语句被分析后产生16个记号：

|记号|类型|
|:--:|:--:|
|array|标识符|
|[|左方括号|
|index|标识符|
|]|右方括号|
|=|赋值|
|(|左圆括号|
|index|标识符|
|+|加号|
|4|数字|
|)|右圆括号|
|\*|乘号|
|(|左圆括号|
|2|数字|
|+|加好|
|6|数字|
|)|右圆括号|

### 语法分析

语法分析将对扫描器产生的记号进行语法分析，从而产生语法树。整个过程采用上下文无关语法的分析手段。

语法分析器生成的语法数就是以表达式为节点的树：

![](/img/op_power/tree.png)

在这个阶段，运算符的优先级也就确认下来了，如果表达式不合法，编译器会报告语法分析阶段的错误。

### 语义分析

编译器能分析的是静态语义，即能够在编译阶段确定的语义。经过语义分析阶段后，整个语法树的表达式都被标识了类型，如果有些类型需要做隐式转换，语义分析程序就会在语法树上插入相应的转换节点。

### 中间代码生成

源代码级别优化器往往会将整个语法树转换成中间代码。常见的中间代码有三地址码、P代码

这个时候上述表达式的2+6就可以直接被优化成8

### 目标代码生成与优化

对于下边这个例子：

```asm
movl	index, %ecx
addl	$4, %ecx
mull	$8, %ecx
movl	index, %eax
movl	%ecx, array(, %eax, 4)
```

最终可以被优化为：

```asm
movl	index, %edx
leal	32(, %edx, 8), %eax
movl	%eax, array(, %edx, 4)
```

## 静态链接

链接的过程包括地址和空间分配、符号决议和重定位这些步骤。符号决议有时也叫地址绑定等。静态链接的基本过程就是把编译器编译成的目标文件（扩展名一般为.o或.obj）和库一起链接形成最后的可执行文件。

链接器要对源文件未定义的变量、函数的地址加以修正。编译器会把它们的地址先设为0，等待链接器链接的时候修正地址，这个过程就是重定向。

# 目标文件

## 目标文件的格式

Windows是PE，Linux是ELF。PE/ELF都是COFF格式的变种

|ELF文件类型|说明|示例|
|:--|:--|:--:|
|可重定位文件 (Relocatable File)|这类文件包含了代码和数据，可以被用来链接成可执行文件或共享目标文件。静态链接库也归为这一类|Linux 的`.o`，Windows的`.obj`|
|可执行文件 (Executable File)|这类文件包含了可以直接执行的程序|Windows下的`.exe`，Linux下`/bin/bash`文件|
|共享目标文件 (Shared Object File)|这类文件包含了代码和数据，可以在两种情况下使用。一种是链接器可以使用这种文件跟其他可重定位文件和共享目标文件链接，产生新的目标文件。第二种是动态链接器可以将几个这种共享目标文件与可执行文件结合，作为进程映像的一部分来允许|Linux的`.so`比如/usr/lib/libc.so，Windows下的DLL|
|核心转储文件 (Core Dump File)|当进程意外终止时，系统可以将该进程的地址空间的内容及终止时的一些其他信息转储到核心转储文件|linux下的core dump|

Linux下使用`file`命令可以查看相应的文件格式

```bash
$ file <filename>
```

## 目标文件的内容

目标文件按照包含信息的不同属性，以节的形式存储，有时候也叫段。一般情况下它们都表示一个定长的区域不做区别，唯一的区别就是在ELF的链接视图和装载视图的时候。

程序源代码编译后的机器指令被放在代码段里，代码段的名字有`.code`和`.text`，已初始化的全局变量和局部静态变量放在数据段`.data`中，未初始化的全局变量和局部静态变量或者初始化却为0的放在BSS段`.bss`

## 浅析目标文件

使用objdump工具可以查看目标文件的内部结构

```bash
$ objdump -h <filename>
```

参数-h是把ELF各个段的基本信息打印出来，可以使用-x打印更多的信息。

```bash
$ objdump -s -d <filename>
```

`-s`是将所有段的内容以十六进制的方式打印出来，`-d`可以将包含指令的段反汇编。

```c
//Hello.c:
#include<stdio.h>
void fun1();
int gloabl_init_var = 666;
int global_uninit_var;
int main(void){
    static int static_init_var = 999;
    static int static_uninit_var;
    int a = 1;
    int b;
    printf("Hello\n");
    fun1();
    return 0;
}
void fun1(){}
```

使用gcc编译但不链接

```bash
$ gcc -c Hello.c
```

使用objdump查看object内部结构

```bash
$ objdump -h Hello.o

Hello.o:     file format elf64-x86-64

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .text         00000036  0000000000000000  0000000000000000  00000040  2**0
                  CONTENTS, ALLOC, LOAD, RELOC, READONLY, CODE
  1 .data         00000008  0000000000000000  0000000000000000  00000078  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  2 .bss          00000008  0000000000000000  0000000000000000  00000080  2**2
                  ALLOC
  3 .rodata       00000006  0000000000000000  0000000000000000  00000080  2**0
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  4 .comment      0000001c  0000000000000000  0000000000000000  00000086  2**0
                  CONTENTS, READONLY
  5 .note.GNU-stack 00000000  0000000000000000  0000000000000000  000000a2  2**0
                  CONTENTS, READONLY
  6 .note.gnu.property 00000030  0000000000000000  0000000000000000  000000a8  2**3
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  7 .eh_frame     00000058  0000000000000000  0000000000000000  000000d8  2**3
                  CONTENTS, ALLOC, LOAD, RELOC, READONLY, DATA

```

`-h`是把ELF文件各个段的基本信息打印出来，`-x`可以打印出更多的信息。

除了代码段、数据段和BSS段之外，还有只读数据段(.rodata)、注释信息段(.comment)和堆栈提示段(.note.GNU-stack)。

这里的`Size`就是段的长度，`File off`(offset)是段所在的位置。每个段的第二行中`CONTENTS`、`ALLOC`等表示段的属性，前者表示该段在文件中存在。可以看到BSS段并不是`CONTENTS`，表示其实际上在ELF文件中不存在内容。

### 代码段
```bash
$objdump -s -d Hello.o
Hello.o:     file format elf64-x86-64

Contents of section .text:
 0000 554889e5 4883ec10 c745fc01 00000048  UH..H....E.....H
 0010 8d050000 00004889 c7e80000 0000b800  ......H.........
 0020 000000e8 00000000 b8000000 00c9c355  ...............U
 0030 4889e590 5dc3                        H...].          
Contents of section .data:
 0000 9a020000 e7030000                    ........        
Contents of section .rodata:
 0000 48656c6c 6f00                        Hello.          
Contents of section .comment:
 0000 00474343 3a202847 4e552920 31322e32  .GCC: (GNU) 12.2
 0010 2e312032 30323330 31313100           .1 20230111.    
Contents of section .note.gnu.property:
 0000 04000000 20000000 05000000 474e5500  .... .......GNU.
 0010 020001c0 04000000 00000000 00000000  ................
 0020 010001c0 04000000 01000000 00000000  ................
Contents of section .eh_frame:
 0000 14000000 00000000 017a5200 01781001  .........zR..x..
 0010 1b0c0708 90010000 1c000000 1c000000  ................
 0020 00000000 2f000000 00410e10 8602430d  ..../....A....C.
 0030 066a0c07 08000000 1c000000 3c000000  .j..........<...
 0040 00000000 07000000 00410e10 8602430d  .........A....C.
 0050 06420c07 08000000                    .B......        

Disassembly of section .text:

0000000000000000 <main>:
   0:   55                      push   %rbp
   1:   48 89 e5                mov    %rsp,%rbp
   4:   48 83 ec 10             sub    $0x10,%rsp
   8:   c7 45 fc 01 00 00 00    movl   $0x1,-0x4(%rbp)
   f:   48 8d 05 00 00 00 00    lea    0x0(%rip),%rax        # 16 <main+0x16>
  16:   48 89 c7                mov    %rax,%rdi
  19:   e8 00 00 00 00          call   1e <main+0x1e>
  1e:   b8 00 00 00 00          mov    $0x0,%eax
  23:   e8 00 00 00 00          call   28 <main+0x28>
  28:   b8 00 00 00 00          mov    $0x0,%eax
  2d:   c9                      leave
  2e:   c3                      ret

000000000000002f <fun1>:
  2f:   55                      push   %rbp
  30:   48 89 e5                mov    %rsp,%rbp
  33:   90                      nop
  34:   5d                      pop    %rbp
  35:   c3                      ret
```

"Contents of setion .text"是将.text的数据以十六进制方式打印出来的内容,总共0x2b字节，和之前用objdump打印的`.text`段的长度一致。最左边的是偏移量，中间四列是十六进制内容，最右边是.text段的ASCII码形式。

### 数据段和只读数据段

.data保存了已经初始化的全局变量和局部静态变量。Hello.c文件中有两个这样的变量（global_init_var和static_init_var），每个变量4字节，所以`.data`段大小8字节。

```
Contents of section .data:
 0000 9a020000 e7030000                    ........  
```

上面关于`.data`段的内容中，前四个字节分别是0x9a、0x02、0x00、0x00。这个值对应gloabl_init_var，即十进制的666，但其存放的顺序是倒序的，而不是正常666的十六进制表示0x029a。这涉及到字节序的问题。

.rodata存放只读数据，一般是程序的只读变量(const修饰)和字符串常量。Hello.c中` printf("Hello\n");`用到了字符串常量Hello\n，这只是一种只读数据，所以被放在了`.rodata`段。

有时候编译器会把字符串常量放在`.data`段。

### BSS段
.bss段存放未初始化的全局变量和局部静态变量，准确的说法是.bss段为它们预留了空间。

通过符号表可以看到未初始化的全局变量和局部静态变量都不全部放在了.bss段，这和不同的语言和编译器的实现有关，有的编译器会将全局未初始化变量存放在.bss段，有的不会，只会预留一个未定义的全局变量符号，等最后链接成可执行文件的时候再加上.bss段分配空间。

一个变量被初始化为0也会被放在`.bss`段，这是优化的结果。

### 其他段
除了`.text .data .bss`三个最常用的段之外，ELF文件可能包含其他的段用来保存和程序相关的信息。

|常用的段名|说明|
|:--|:--|
|.rodatal|Read Only Data，存储只读数据，比如字符串常量、全局const变量，和.rodata段一样|
|.comment|存放了编译器的版本信息|
|.debug|调试信息|
|.dynamic|动态链接信息|
|.hash|符号哈希表|
|.line|调试用到的行号表，即源代码行号和编译后的指令的对应表|
|.note|额外的编译信息，比如程序的公司名，版本号|
|.strtab|String Tab，字符串表，存储ELF文件中用到的各种字符串|
|.symtab|Symbol Tab，符号表|
|.shstrtab|Section String Tbale，段名表|
|.plt / .got|动态链接的跳转表和 全局入口表|
|.init / .fini|程序的初始化和终结代码段|

这些段的名字都有`.`作前缀，表明这些表的名字是系统保留的，应用程序可以使用一些非系统保留的名字作为段名，但不可以`.`作为前缀。ELF允许有多个重复名字的段。还有一些段的名字是因为ELF的历史遗留问题造成，如

```
.sdata .tdesc .sbcc .lit4 .lit8 .reginfo .gptab .liblist .conflict
```

上述段名已经被遗弃了。

### 自定义段

GCC提供了一种扩展机制可以让开发者指定变量所处的段

```C
__attribute__((section("<name>"))) 
```

上述语句后面接一个函数或变量定义的语句即可，就可以指定保存的段名，如：

```C
__attribute__((section("FOO"))) int global = 42;
```

## ELF文件结构描述

ELF目标文件格式最前部的是ELF文件头（ELF Header），它包含了描述整个文件的基本属性。紧接着是ELF文件各个段，与段有关的重要结构就是段表（Section Header Table），它描述了ELF文件包含的段的信息。

### 文件头

使用readelf可以详细查看ELF文件

```bash
readelf -h Hello.o

ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              REL (Relocatable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x0
  Start of program headers:          0 (bytes into file)
  Start of section headers:          904 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           0 (bytes)
  Number of program headers:         0
  Size of section headers:           64 (bytes)
  Number of section headers:         14
  Section header string table index: 13

```
ELF文件结构及其相关常数定义在`/usr/include/elf.h`里，ELF有32位和64位两个版本，自然对应`Elf32_Ehdr`和`Elf64_Ehdr`两个结构。elf.h使用typedef定义了一套自己的变量体系。

```c
/* Type for a 16-bit quantity.  */
typedef uint16_t Elf32_Half;
typedef uint16_t Elf64_Half;

/* Types for signed and unsigned 32-bit quantities.  */
typedef uint32_t Elf32_Word;
typedef	int32_t  Elf32_Sword;
typedef uint32_t Elf64_Word;
typedef	int32_t  Elf64_Sword;

/* Types for signed and unsigned 64-bit quantities.  */
typedef uint64_t Elf32_Xword;
typedef	int64_t  Elf32_Sxword;
typedef uint64_t Elf64_Xword;
typedef	int64_t  Elf64_Sxword;

/* Type of addresses.  */
typedef uint32_t Elf32_Addr;
typedef uint64_t Elf64_Addr;

/* Type of file offsets.  */
typedef uint32_t Elf32_Off;
typedef uint64_t Elf64_Off;

/* Type for section indices, which are 16-bit quantities.  */
typedef uint16_t Elf32_Section;
typedef uint16_t Elf64_Section;

/* Type for version symbol information.  */
typedef Elf32_Half Elf32_Versym;
typedef Elf64_Half Elf64_Versym;
```

以Elf64_Ehdr为例：

```C
#define EI_NIDENT (16)
typedef struct
{
  unsigned char	e_ident[EI_NIDENT];	/* Magic number and other info */
  Elf64_Half	e_type;			/* Object file type */
  Elf64_Half	e_machine;		/* Architecture */
  Elf64_Word	e_version;		/* Object file version */
  Elf64_Addr	e_entry;		/* Entry point virtual address */
  Elf64_Off	e_phoff;		/* Program header table file offset */
  Elf64_Off	e_shoff;		/* Section header table file offset */
  Elf64_Word	e_flags;		/* Processor-specific flags */
  Elf64_Half	e_ehsize;		/* ELF header size in bytes */
  Elf64_Half	e_phentsize;		/* Program header table entry size */
  Elf64_Half	e_phnum;		/* Program header table entry count */
  Elf64_Half	e_shentsize;		/* Section header table entry size */
  Elf64_Half	e_shnum;		/* Section header table entry count */
  Elf64_Half	e_shstrndx;		/* Section header string table index */
} Elf64_Ehdr;
```

ELF文件头结构成员含义

|成员|readelf输出结果和含义|
|:--:|:--|
|e_ident|Magic、Class、Data、Version、OS/ABI、ABI Version|
|e_type|Type，ELF文件类型|
|e_machine|ELF文件件的CPU平台属性|
|e_version|ELF版本号，一般为1|
|e_entry|Entry point address，入口地址，可重定位文件一般没有入口地址，则这个值为0|
|e_phoff|Start of program headers|
|e_shoff|Start of section headers，段表在文件中的偏移|
|e_word|Flags，ELF标志位，标识一些ELF文件平台相关的属性|
|e_ehsize|Size of this header，ELF文件头本身大小|
|e_phentsize|Size of program headers|
|e_phnum|Number of program headers|
|e_shentsize|Size of section headers，段表描述符的大小|
|e_shnum|Number of Section headers，段表描述符数量，等于该ELF文件中段的数量|
|e_shstrndx|Section header string table index，段表字符串表所在的段在段表中的下标|

#### ELFmagic number

使用readelf最前面打印的Magic被ELF标准规定标识ELF平台的属性。

最开始的4字节是所有ELF文件都相同的标识码：0x7f、0x45、0x4c、0x46，第一个对应ASCII的del控制符。侯三字节对应elf三个字母的ASCII码。几乎所有可执行文件格式的最开始几个字节都是magic number，a.out是0x01、0x07，PE/COFF是0x4d、0x5a。Magic number可以用来确认文件的类型，操作系统加载可执行文件时检查magic number是否正确以决定是否记载。

接下来的一个字节用来表示ELF文件类的，0x01是32位、0x02是64位。

第6个字节是字节序，规定ELF文件时大端还是小端的。

第七个规定ELF文件的主版本号。

后9个无特别要求，有的平台将其作为扩展标志。

#### 文件类型

e_type表示ELF文件类型
|常量|值|含义|
|:--|:--:|:--|
|ET_REL|1|可重定位文件，后缀.o|
|ET_EXEC|2|可执行文件|
|ET_DYN|3|共享目标文件，后缀.so|

#### 机器类型

e_machine表示ELF文件的平台属性

ELF文件格式被设计在多个平台使用。这不表示同一个文件在不同的平台上都能使用，而是表示不同的平台遵循同一个标准。

|常量|值|含义|
|:--|:--:|:--|
|EM_M32|1|AT&T WE 32100|
|EM_SPARC|2|SPARC|
|EM_386|3|Intel x86|
|EM_68K|4|Motorola 68000|
|EM_88K|5|Motorola 88000|
|EM_860|6|Intel 80860|

### 段表

`objdump -h`只会列出关键的段，readelf还能看到辅助性的段

```bash
$ readelf -S Hello.o
There are 14 section headers, starting at offset 0x388:

Section Headers:
  [Nr] Name              Type             Address           Offset  
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .text             PROGBITS         0000000000000000  00000040 
       0000000000000036  0000000000000000  AX       0     0     1
  [ 2] .rela.text        RELA             0000000000000000  00000298
       0000000000000048  0000000000000018   I      11     1     8
  [ 3] .data             PROGBITS         0000000000000000  00000078
       0000000000000008  0000000000000000  WA       0     0     4
  [ 4] .bss              NOBITS           0000000000000000  00000080
       0000000000000008  0000000000000000  WA       0     0     4
  [ 5] .rodata           PROGBITS         0000000000000000  00000080
       0000000000000006  0000000000000000   A       0     0     1
  [ 6] .comment          PROGBITS         0000000000000000  00000086
       000000000000001c  0000000000000001  MS       0     0     1
  [ 7] .note.GNU-stack   PROGBITS         0000000000000000  000000a2
       0000000000000000  0000000000000000           0     0     1
  [ 8] .note.gnu.pr[...] NOTE             0000000000000000  000000a8
       0000000000000030  0000000000000000   A       0     0     8
  [ 9] .eh_frame         PROGBITS         0000000000000000  000000d8
       0000000000000058  0000000000000000   A       0     0     8
  [10] .rela.eh_frame    RELA             0000000000000000  000002e0
       0000000000000030  0000000000000018   I      11     9     8
  [11] .symtab           SYMTAB           0000000000000000  00000130
       0000000000000108  0000000000000018          12     6     8
  [12] .strtab           STRTAB           0000000000000000  00000238
       0000000000000060  0000000000000000           0     0     1
  [13] .shstrtab         STRTAB           0000000000000000  00000310
       0000000000000074  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), l (large), p (processor specific)

```
查看其输出发现段表是一个以Elf64_Shdr结构体为元素的数组，数组元素的个数即段的个数，Elf64_Shdr也被称为段描述符（Section Descriptor）。
Elf64_Shdr被定义在`/usr/include/elf.h`，

```c
typedef struct
{
  Elf64_Word	sh_name;		/* Section name (string tbl index) */
  Elf64_Word	sh_type;		/* Section type */
  Elf64_Xword	sh_flags;		/* Section flags */
  Elf64_Addr	sh_addr;		/* Section virtual addr at execution */
  Elf64_Off	sh_offset;		/* Section file offset */
  Elf64_Xword	sh_size;		/* Section size in bytes */
  Elf64_Word	sh_link;		/* Link to another section */
  Elf64_Word	sh_info;		/* Additional section information */
  Elf64_Xword	sh_addralign;		/* Section alignment */
  Elf64_Xword	sh_entsize;		/* Entry size if section holds table */
} Elf64_Shdr;
```

其成员含义如下：

|变量|含义|
|:--|:--|
|sh_name|段名|
|sh_type|段的类型|
|sh_flags|段的标志位|
|sh_addr|段虚拟地址|
|sh_offset|段偏移|
|sh_size|段的长度|
|sh_link和sh_info|段的链接信息|
|sh_addralign|有些段对段地址有对齐要求，它表示的就是地址对齐数量中的指数，如果值为3就表明对齐是$2^3$=8倍，如果为0或1则表明没有这种需求|
|sh_entsize|项的长度|

段名是个字符串，它位于一个叫做`.shstrtab`的字符串表。`sh_name`是段名字符串在这个表中的偏移。

段的名字对编译器和链接器来说是有意义的，但对操作系统来说没啥意义。对操作系统来说，一个段如何处理取决于其属性和权限。

#### 段的类型

对于编译器和链接器来说，主要决定段的属性的是段的类型（sh_type)和段的标志位（sh_flags)。

|常量|值|含义|
|:--:|:--:|:--|
|SHT_NULL|0|无效段|
|SHT_PROGBITS|1|程序段、代码段、数据段皆是此类型|
|SHT_SYMTAB|2|表示该段的内容为符号表|
|SHT_STRTAB|3|表示该段的内容是字符串表|
|SHT_RELA|4|重定位表|
|SHT_HASH|5|符号表的哈希表|
|SHT_DYNAMIC|6|动态链接信息|
|SHT_NOTE|7|提示性信息|
|SHT_NOBITS|8|表示该段在文件中无内容，如.bss段|
|SHT_REL|9|该段包含可重定位信息|
|SHT_SHLIB|10|保留|
|SHT_DNYSYM|11|动态链接的符号表|

#### 段的标志位

段的标志位表示该段在虚拟地址空间中的属性。

|常量|值|含义|
|:--:|:--:|:--|
|SHT_WRITE|1|可写|
|SHT_ALLOC|2|表示该段需要在进程空间分配空间，有些含有指示或控制信息的段不需要在进程空间中分配空间，就不会有这个标志。代码段数据段会有这个标志|
|SHT_EXECINSTR|4|可执行|

#### 段的链接信息

如果段的类型和链接相关，sh_link和sh_info两个成员所包含的意义如下，对于其他类型的段，二者无意义。

|sh_type|sh_link|sh_info|
|:--:|:--:|:--:|
|SHT_DYNAMIC|该段使用的字符串表在段表中的下标|0|
|SHT_HASH|该段使用的符号表在段表中的下标|0|
|SHT_REL|该段使用的相应符号表在段表中的下标|该重定位表所作用的段在段表中的下标|
|SHT_RELA|同上|同上|
|SHT_SYMTAB|操作系统相关|操作系统相关|
|SHT_DYNAYM|同上|同上|
|other|SHN_UNDEF|0|

### 重定位表

Hello.o有一个叫做`.rel.text`的段，它的类型是`RELA`，即它是一个重定位表。

对于每个需要重定位的代码段和数据段，都会有一个相应的重定位表。比如Hello.o中就存在对`printf()`函数的调用。

重定位表同时也是ELF文件的一个段，段的类型(sh_type)就是`SHT_RELA`，`sh_link`表示该符号的下标，`sh_info`表示其作用在哪个段。比如`.rel.text`作用于`.text`段，`.text`段的下表是 1 ，那么`.rel.text`的`.sh_info`就为1。

### 字符串表

ELF文件中的字符串长度并不固定（段名、变量名等），无法用固定的结构表示它们，故而把字符串集中存放到一个表，然后使用字符串在表中的偏移引用字符串。

|偏移|+0|+1|+2|+3|+4|+5|+6|+7|+8|+9|
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:
|+0|\0|h|e|l|l|o|w|o|r|l|
|+10|d|\0|M|y|v|a|r|i|a|b|
|+20|l|e|\0|

它的偏移与之对应的字符串如下表

|偏移|字符串|
|:--:|:--|
|0|空字符串|
|1|helloworld|
|6|world|
|12|Myvariable|

一般字符串表以段的形式保存，`.strtab`是字符串表，`.shstrtab`是段表字符串表。顾名思义，字符串表保存普通的字符串，段表字符串表保存段表中用到的字符串，比如段名。

之前`readelf -h`中得到了`e_shstrndx`的值为13，而`readelf -S`可以看到，`shstrtab`这个段正好位于段表中下标13的位置。

## 符号

链接中，函数和变量被称为符号，函数名和变量名被称为符号名

每一个目标文件都会有一个相应的符号表，每个定义的符号都会有一个对应的值（符号值），对于函数和变量来说，这个值就是它们的地址。
符号总共分为以下几类：

- 定义在本目标文件的全局符号，可以被其他目标文件引用
  - 比如Hello.o中的main、fun1()和global_init_var
- 在本目标文件引用却未定义的全局符号，一般叫外部符号
  - 比如Hello.o中的printf
- 段名，这种符号由编译器产生，值就是段的起始地址
  - 比如Hello.o中的.text、.data等
- 局部符号，编译单元内部可见。调试器使用这些符号分析程序或崩溃时的核心转储文件。于链接无用，被链接器忽视
- 行号信息，目标文件指令和源代码行的对应关系，可选

查看ELF的符号表有很多工具，readelf、objdump、nm等，以nm为例：

```bash
$ nm Hello.o
000000000000002f T fun1
0000000000000000 D gloabl_init_var
0000000000000000 B global_uninit_var
0000000000000000 T main
                 U puts
0000000000000004 d static_init_var.0
0000000000000004 b static_uninit_var.1

```
### ELF符号表结构

符号表往往是文件中的一个段，名字叫.symtab，符号表结构是Elf64_Sym结构的数组，每个Elf64_Sym结构对应一个符号

```c
typedef struct
{
  Elf64_Word	st_name;		/* Symbol name (string tbl index) */
  unsigned char	st_info;		/* Symbol type and binding */
  unsigned char st_other;		/* Symbol visibility */
  Elf64_Section	st_shndx;		/* Section index */
  Elf64_Addr	st_value;		/* Symbol value */
  Elf64_Xword	st_size;		/* Symbol size */
} Elf64_Sym;
```

|成员|含义|
|:--:|:--|
|st_name|符号名，该成员包含该符号名在字符串表的下标|
|st_value|符号对应的值。值与符号有关，可能是绝对值，也可能是个地址|
|st_size|符号大小。对于包含数据的符号来说，值是该数据类型的大小，比如double的符号就是8。如果值是0，则表示该符号大小为0或未知|
|st_info|符号类型和绑定信息|
|st_other|符号的可见性|
|st_shndx|符号所在的段|

#### 符号类型和绑定信息

低4位表示符号类型，高28位表示符号绑定信息

符号绑定信息：

|宏定义名|值|说明|
|:--:|:--:|:--|
|STB_LOCAL|0|局部符号，低目标文件外部不可见|
|STB_GLOBAL|1|全局符号，外部可见|
|STB_WEAK|2|弱引用|

符号类型：

|宏定义名|值|说明|
|:--:|:--:|:--|
|STT_NOTYPE|0|未知类型符号|
|STT_OBJECT|1|数据对象，如变量、数组|
|STT_FUNC|2|函数或其他可执行代码|
|STT_SECTION|3|段，这个符号必须是STB_LOCAL的|
|STT_FILE|4|文件名，一般指的是该目标文件所对应的源文件名，它一定是STB_LOCAL的，st_shndx一定是SHN_ABS|

#### 符号所在段

`st_shndx`，如果符号定义在本目标文件中，该成员的表示符号所在的表在段表中的下标，如果不在或者对于一些特殊符号，其值也会特殊些，具体如下：
|宏定义名|值|说明|
|:--:|:--:|:--|
|SHN_ABS|0xfff1|该符号包含一个绝对的值|
|SHN_COMMON|0xfff2|该符号是一个COMMON类型的符号，一般来说未初始化的全局符号定义就是这是类型|
|SHN_UNDEF|0|该符号未定义，即引用未定义|

#### 符号值

- 在目标文件中，如果是该符号的定义并且该符号不是COMMON块类型的，则st_value表示该符号在段中的偏移。
  - 即符号所对应的函数或变量位于由`st_shndx`指定的段，偏移`st_value`的位置。
- 在目标文件中，如果符号是COMMON块类型，st_value表示该符号的对齐属性
- 在可执行文件中，st_value表示该符号的虚拟地址

#### 以Hello.o为例

```bash
$ readelf -s Hello.o 

Symbol table '.symtab' contains 11 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS Hello.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT    1 .text
     3: 0000000000000000     0 SECTION LOCAL  DEFAULT    5 .rodata
     4: 0000000000000004     4 OBJECT  LOCAL  DEFAULT    4 static_uninit_var.1
     5: 0000000000000004     4 OBJECT  LOCAL  DEFAULT    3 static_init_var.0
     6: 0000000000000000     4 OBJECT  GLOBAL DEFAULT    3 gloabl_init_var
     7: 0000000000000000     4 OBJECT  GLOBAL DEFAULT    4 global_uninit_var
     8: 0000000000000000    47 FUNC    GLOBAL DEFAULT    1 main
     9: 0000000000000000     0 NOTYPE  GLOBAL DEFAULT  UND puts
    10: 000000000000002f     7 FUNC    GLOBAL DEFAULT    1 fun1

```
readelf输出和Elf64_Sym的各个成员几乎一一对应。

第一列Num表示符号表数组的下标，第二列Value就是符号值，第三列Size表示符号大小，第四列和第五列表示符号类型和绑定信息，第六列表示其可见性，第七列Ndx表示符号所属的段，最后一列是符号名称。

- `fun1()`和`main()`函数都是定义在Hello.c里的，它们都处于代码段，所以`Ndx`值是1，即Hello.o中，`.text`段的下标是1。它俩是函数，所以类型是FUNC，它们是全局可见，所以是GLOBAL，Size表示函数指令所占的字节数，Value表示函数相对于代码段起始位置的偏移量
- `prindf()`函数在Hello.c中被引用无定义，所以Ndx是UND
- global_init_var是已初始化的全局变量，被定义在`.bss`段，即下标为3
- static前缀的两个局部变量的绑定属性是LOCAL，即编译单元内部可见。Name不是源文件中的名称在符号修饰中可以解释

### 特殊符号
使用ld作为链接器来链接生产可执行文件时，它会定义很多特殊符号，这些符号没有在程序中定义却可以直接声明并引用它，这就是特殊符号。只有使用ld链接器生成最终可执行文件的时候这些文件才存在。下面列举几个有代表性的特殊符号：

- \_\_executable\_start，程序起始地址，这不是入口地址，是程序最开始的地址
- \_\_etext或\_etext或etext，代码段结束地址
- \_edata或edata，数据段结束地址
- \_end或end，程序结束地址

以上地址都是程序被装载时的虚拟地址。

在程序中可以直接使用这些符号。

```c
#include <stdio.h>

extern char __executable__start[];
extern char etext[], _etext[], __etext[];
extern char edata[], _edata[];
extern char end[], _end[];

int main(void){
     printf("Executable Start %X\n",  __executable__start);
     printf("Text End %X %X %X\n", etext, _etext, __etext);
     printf("Data End %X %X\n", edata, _edata);
     printf("Executable End %X %X\n", end, _end);
     return 0;
}
```

### 符号修饰和函数签名

早期符号和与之对应的函数名或变量名是一致的，就容易造成符号冲突问题，Unix下C语言规定全局的变量和函数经过编译后，相对应的符号名前加`_`暂缓这个问题，后来像C++这样的语言有命名空间这样的方法解决这个问题。

Linux下的GCC编译器已经默认不加`_`了，Windows平台下的依然保留。

为了支持C++函数重载、名称空间这样的机制，使得编译器和链接器能够区分重载的函数，就有了符号修饰或符号改编。例如下面的例子：

```cpp
int func(int);
float func(float);

class C {
	int func(int);
	class C2 {
		int func(int);
	};
};
namespace N {
	int func(int);
	class C {
		int func(int);
	};
}
```
上述函数有6个同名函数，不过返回类型和参数以及所在的类和名称空间有所不同。

这就靠函数签名，函数签名包含了一个函数的信息（函数名、参数类型、所在的类和名称空间等）。编译器和链接器处理符号的时候，它们使用名称修饰的方法使得每个函数签名对应一个修饰后名称。上述6个函数签名在GCC编译器下产生的修饰后名称如下：

|函数签名|修饰后名称（符号名）|
|:--:|:--:|
|int func(int)|\_Z4funci|
|float func(float)|\_Z4funcf|
|int C::func(int)|\_ZN1C4funcEi|
|int C::C2::fun(int)|\_ZN1C2C24funcEi|
|int N::func(int)|\_AN1N4funcEi|
|int N::C::func(int)|\_ZN1N1C4funcEi|

GCC的基本C++名称修饰方法如下：

所有的符号以`_Z`开头，对于嵌套的名字（名称空间或类）后面紧跟`N`，然后是名称空间和类的名字，名字前面的是名字字符串长度，以`E`为结尾，对于函数来说，参数列表紧跟在`E`后面。

c++filt可以解析被修饰过的名称：

```bash
$ c++filt _ZN1N1C4funcEi
N::C::func(int)
```
全局变量和局部静态变量依旧有签名和名称修饰的机制，不过变量的类型没有加入修饰后名称中。

不同的编译器采用不同的名称修饰的方法，这是不同的编译器之间难以相互操作的主要原因之一。

### extern "C"

C++提供了extern关键字用来声明或定义一个C语言的符号：

```cpp
extern "C" {
	int func(int);
	int var;
}
extern "C" int suc;
```

上述声明和定义的函数和变量就不会受到C++名称修饰的作用。

C++无法链接C语言的库函数，因为C++对函数进行了名称修饰，但C语言没有。使用C++宏`__cplusplus`可以解决这个问题

```cpp
#ifdef __cplusplus
extern "C"{
#enddef

<funcation detail>

#ifdef __cplusplus
}
#enddef
```

如果当前编译单元是C++代码，函数会在`extern "C"`里面被声明，如果C代码则是直接声明。

### 弱符号和强符号

C/C++中，编译器默认函数和初始化的全局变量为强符号，未初始化的全局变量为弱符号，也可以通过GCC的`__attribute__((weak))`定义任何一个强符号为弱符号。
针对强弱符号，链接器按以下规则处理：

1. 不允许强符号被多次定义，不同的目标文件不能有同名的强符号。
2. 如果一个符号在一个目标文件中是强符号，在其他文件中都是弱符号，那么就选择强符号
3. 如果一个符号在所有目标文件中都是弱符号，那么选择占用空间最大的一个，比如A中定义了int的a，B中有个long的a，那么链接后符号a就是占8字节了

#### 强引用和弱引用

对外部目标文件的符号引用在目标屋内按最终链接成可执行文件时，他们就要被正确决议，如果没找到符号的定义，链接器就要报错。

上述过程导致报错的情况就是强引用导致的，弱引用就算未定义也不会报错。链接器默认其为0或是一个特殊的值

GCC中，可以通过`attribute((weakref))`这个扩展关键字声明一个外部函数的引用为弱引用。

弱符号和弱引用对于库来说有用，库中定义的弱符号可以被用户定义的强符号所覆盖，比如程序的某些扩展功能是弱引用，就算去掉了扩展功能也可以正常链接，只是缺少了相应的功能。

## 调试信息

GCC编译时加上`-g`参数就可以在产生的文件中加上调试信息，使用readelf等工具可以看到多了个`.debug`相关的段

Linux下，使用`strip`命令可以去掉ELF文件中的调试信息

# 静态链接

以下面两个源文件进行举例说明：

```C
/* a.c */
extern int shared;
int main(){
	int a = 100;
	swap(&a, &shared);
}
```
```C
/* b.c */
int shared = 1;
void swap(int* a, int* b){
	*a ^= *b ^= *a ^= *b;
}
```

使用GCC编译器可以将`a.c`和`b.c`分别编译成目标文件`a.o`和`b.o`

```bash
$ gcc -c a.c b.c
```

## 地址和空间分配

### 按序叠加

将输入的目标文件按照次序叠加起来，但是规模稍大的程序有很多目标文件，每个目标文件都有代码段和数据段，如果只是简单地按次序堆叠就会浪费空间，因为它们有对齐要求。

### 相似段合并

将相同性质的段合并。

`.bss`段在目标文件和可执行文件中并不占用空间，但它在装载的时候占用空间，所以链接器合并各个段的时候也会合并`.bss`段并且分配虚拟空间。

链接器为目标文件分配地址和空间的**地址和空间**有两个含义：一是输出的可执行文件中的空间，二是装载后的虚拟地址中的虚拟地址空间。对于`.bss`这样的段来说，分配空间的意义仅局限于虚拟地址空间，因为它们在文件中无内容。这里只谈虚拟地址空间的分配，因为它关系到链接器后面关于地址计算的步骤，可执行文件本身的空间分配和链接过程关系不大。

目前链接器的空间分配策略都采用相似段合并。

### 两步连接

这是链接器采取的方法

#### 空间与地址分配

扫描所有的目标文件，获得它们段的长度、属性和位置，将目标文件中的符号表内的符号定义和符号引用收集起来放入全局符号表。

这一步中，链接器获得所有目标文件的段长度并将它们合并，计算输出文件中各个段合并后的长度和位置，建立映射关系。

#### 符号解析和重定位

使用上一步收集的信息，读取输入文件中段的数据、重定位信息，进行符号解析和重定位，调整代码位置。

#### 使用ld进行链接

使用ld将两个文件链接起来

```bash
ld a.o b.o -c main -o ab --fno-stack-protector
```

\-c指定入口函数，默认为_start，这里应为main

```bash
$ objdump -h a.o

a.o:     file format elf64-x86-64

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .text         00000031  0000000000000000  0000000000000000  00000040  2**0
                  CONTENTS, ALLOC, LOAD, RELOC, READONLY, CODE
  1 .data         00000000  0000000000000000  0000000000000000  00000071  2**0
                  CONTENTS, ALLOC, LOAD, DATA
  2 .bss          00000000  0000000000000000  0000000000000000  00000071  2**0
                  ALLOC
  3 .comment      0000001c  0000000000000000  0000000000000000  00000071  2**0
                  CONTENTS, READONLY
  4 .note.GNU-stack 00000000  0000000000000000  0000000000000000  0000008d  2**0
                  CONTENTS, READONLY
  5 .note.gnu.property 00000030  0000000000000000  0000000000000000  00000090  2**3
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  6 .eh_frame     00000038  0000000000000000  0000000000000000  000000c0  2**3
                  CONTENTS, ALLOC, LOAD, RELOC, READONLY, DATA

$ objdump -h b.o

b.o:     file format elf64-x86-64

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .text         0000004b  0000000000000000  0000000000000000  00000040  2**0
                  CONTENTS, ALLOC, LOAD, READONLY, CODE
  1 .data         00000004  0000000000000000  0000000000000000  0000008c  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  2 .bss          00000000  0000000000000000  0000000000000000  00000090  2**0
                  ALLOC
  3 .comment      0000001c  0000000000000000  0000000000000000  00000090  2**0
                  CONTENTS, READONLY
  4 .note.GNU-stack 00000000  0000000000000000  0000000000000000  000000ac  2**0
                  CONTENTS, READONLY
  5 .note.gnu.property 00000030  0000000000000000  0000000000000000  000000b0  2**3
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  6 .eh_frame     00000038  0000000000000000  0000000000000000  000000e0  2**3
                  CONTENTS, ALLOC, LOAD, RELOC, READONLY, DATA

$ objdump -h ab

ab:     file format elf64-x86-64

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .note.gnu.property 00000030  00000000004001c8  00000000004001c8  000001c8  2**3
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  1 .text         0000007c  0000000000401000  0000000000401000  00001000  2**0
                  CONTENTS, ALLOC, LOAD, READONLY, CODE
  2 .eh_frame     00000058  0000000000402000  0000000000402000  00002000  2**3
                  CONTENTS, ALLOC, LOAD, READONLY, DATA
  3 .data         00000004  0000000000403000  0000000000403000  00003000  2**2
                  CONTENTS, ALLOC, LOAD, DATA
  4 .comment      0000001b  0000000000000000  0000000000000000  00003004  2**0
                  CONTENTS, READONLY
```
VMA表示虚拟地址，LMA表示加载地址。

链接前虚拟地址VMA为0，链接后各个段都分配了虚拟地址。

### 符号地址的确定

链接器分配好空间地址之后，各个段链接后的虚拟地址已经确定。

上一步完成之后，链接器开始计算各个符号的虚拟地址，因为符号在段内的相对位置是确定的，所以只需要`虚拟地址+偏移量`即可。

## 重定位与符号解析

### 重定位

空间和地址的分配之后，链接器就进入了符号解析与重定位的步骤

在链接器对外部引用进行地址修正之前，编译器对这些符号的地址设置被`0x00000000`和`0xFFFFFFFC`代替

```bash
$ objdump -d a.o
a.o:     file format elf64-x86-64


Disassembly of section .text:

0000000000000000 <main>:
   0:   55                      push   %rbp
   1:   48 89 e5                mov    %rsp,%rbp
   4:   48 83 ec 10             sub    $0x10,%rsp
   8:   c7 45 fc 64 00 00 00    movl   $0x64,-0x4(%rbp)
   f:   48 8d 45 fc             lea    -0x4(%rbp),%rax
  13:   48 8d 15 00 00 00 00    lea    0x0(%rip),%rdx        # 1a <main+0x1a>
  1a:   48 89 d6                mov    %rdx,%rsi
  1d:   48 89 c7                mov    %rax,%rdi
  20:   b8 00 00 00 00          mov    $0x0,%eax
  25:   e8 00 00 00 00          call   2a <main+0x2a>
  2a:   b8 00 00 00 00          mov    $0x0,%eax
  2f:   c9                      leave
  30:   c3                      ret

```
### 重定位表

重定位表往往就是ELF文件中的一个段，每个需要重定位的段都存在对应的重定位表，比如代码段的重定位表就是`.rel.text`，`.data`段则为`.rel.data`。用objdump可以查看重定位表

```bash
$ objdump -r a.o

a.o:     file format elf64-x86-64

RELOCATION RECORDS FOR [.text]:
OFFSET           TYPE              VALUE
0000000000000016 R_X86_64_PC32     shared-0x0000000000000004
0000000000000026 R_X86_64_PLT32    swap-0x0000000000000004


RELOCATION RECORDS FOR [.eh_frame]:
OFFSET           TYPE              VALUE
0000000000000020 R_X86_64_PC32     .text

```

每个被重定位的地方叫一个重定位入口。`OFFSET`表示该入口在被重定位的段中的位置，`RELOCATION RECORDS FOR[.text]`表示这个重定位表是代码段的重定位表。

重定位表的定义如下：

```C
/* The following, at least, is used on Sparc v9, MIPS, and Alpha.  */
typedef struct
{
  Elf64_Addr	r_offset;		/* Address */
  Elf64_Xword	r_info;	     /* Relocation type and symbol index */
} Elf64_Rel;

/* I have seen two different definitions of the Elf64_Rel and
   Elf64_Rela structures, so we'll leave them out until Novell (or
   whoever) gets their act together.  */
/* Relocation table entry with addend (in section of type SHT_RELA).  */

typedef struct
{
  Elf64_Addr	r_offset;		/* Address */
  Elf64_Xword	r_info;	     /* Relocation type and symbol index */
  Elf64_Sxword	r_addend;		/* Addend */
} Elf64_Rela;
```

- r_offset，重定位入口的偏移。对于可重定位文件来说，其值是该重定位入口所要修正的位置的第一个字节相对于段起始的偏移；对于可执行文件或共享目标文件来说，其值为该重定位入口所要修正位置的第一个字节的虚拟地址。
- r_info，重定位入口的类型和符号，该成员低8位表示重定位入口的类型，高24位表示重定位入口的符号在符号表中的下标（64位中被分成了两个32位）。由于不同的处理器的指令格式有所不同，所以重定位所要修正 的指令地址格式也不一样。对于可执行文件和共享目标文件来说，它们的重定位入口是动态链接类型的。
- r_addend，用于计算重定位地址时的加数

根据Oracle的文档描述，Rel有个隐式的加数

> Rela entries contain an explicit addend. Entries of type Rel store an implicit addend in the location to be modified.

[File Format](https://docs.oracle.com/cd/E19683-01/816-1386/6m7qcoblj/index.html#chapter6-54839)

### 符号解析

重定位的过程伴随着符号的解析过程。重定位的过程中，每个重定位的入口都是对一个符号的引用，当链接器对某个符号的引用进行重定位时，它就要确定这个符号的目标地址。这时候链接器会去查找所有输入目标文件的符号表组成的全局符号表，找到相应的符号进行重定位。

### 指令修正方式

重定位方式指令修正方式区别在于绝对寻址和相对寻址

|宏定义|值|重定义修正方法|
|:--:|:--:|:--|
|R_386_32|1|绝对寻址修正 符号的实际位置+保存在被修证位置的值|
|R_386_PC32|2|相对寻址修正 符号的实际位置+保存在被修正位置的值-被修正的位置（相对于段来说的偏移量或虚拟地址）|

假设a.o和b.o链接成最终可执行文件后，main函数的虚拟地址是0x1000，swap函数是0x2000，shared变量虚拟地址是0x3000，shared变量编译器未链接时填充为0x00000000，swap填充0xFFFFFFFC

shared的修正方式是R_386_32，即绝对地址修正。对于这个重定位入口，修正的结果应该是0x30000+0x00000000=0x3000

swap的休整方式R_386_PC32，相对寻址修正，结果是0x2000+(-4)-(0x1000+0x27)=0xFD5，常量-4是0xFFFFFFFC的补码形式，这条call指令是偏移为0x26的。

call指令的下一条指令的起始地址加上call指令后面接的偏移量，就是swap函数的地址。

上述关于指令修正方式的解释是书中所述。

之前objdump -r读到的类型是R_X86_64_PC32和R_X86_64_PLT32。前者和上面介绍的相对寻址修正差不多，后者和前者差不多（关于后者可以看下[How does the address of R_X86_64_PLT32 computed?](https://stackoverflow.com/questions/64424692/how-does-the-address-of-r-x86-64-plt32-computed)）。

## COMMON块

弱符号机制允许同一个符号定义存在多个文件之中。如果一个弱符号定义在多个目标文件中而类型不同，链接器又不支持符号的类型该如何处理。这里有三种情况：

1. 两个或两个以上的强符号类型不一致
2. 有一个强符号，其他都是弱符号，符号不一致
3. 两个或两个以上弱符号不一致

对于第一种情况，链接器会报符号多重定义错误，链接器所要应对的是后两种情况

链接器处理弱符号时采用的是COMMON（Common Block）块机制，即如果多个弱符号，以占用空间最大的符号为准。

如果一个符号是强符号，最终的输出结果和强符号相同，链接过程如果弱符号大于强符号，ld链接器就会打印一条警告信息。

这里也知道了为什么未初始化的全局变量不会像未初始化的局部静态变量一样被编译器放在`.bss`段里，因为编译器无法确定这个弱符号最终的大小，只能由链接器读取所有的目标文件之后确定大小。这时候未初始化的全局变量就会在BSS段分配空间了。总体来看，它俩是都存储在BSS段的。

GCC的`-fno-common`允许为所有未初始化的全局变量不以COMMON块的形式处理，或者使用`__attribute__`扩展

```C
int global __attribute__((nocommon));
```

一旦一个未初始化的全局变量不是以COMMON块的形式存在，那么它就相当于一个强符号，如果其他目标文件也有这个强符号，就会发生符号重复的错误。

## C++相关的问题

### 重复代码消除

C++编译器可能产生很多重复的代码，比如模板、外部内联函数和虚函数表。一个模板在多个编译单元被实例化成为相同类型的时候就会产生重复的代码。

主流方法是将每个模板的实例代码都单独放在一个段里。比如有一个模板函数`add<T>()`一个编译单元以int和float，编译单元的亩薄啊文件就包含了连个该模板实例的段，假设分别为`.temp.add<int>`和`.temp.int<float>`，别的编译单元也以int和float实例化该模板函数时，也会产生相同的名字，这样最终链接的时候可以区分这些相同的模板实例段，将它们合并到代码段。

GCC和Visual C++都是如此，GCC最终链接合并的段叫做Link Once，段被命名为`.gnu.linkonce.name`，`name`是模板函数实例的修饰后名称。Visual C++做法稍有不同，它把这种类型的段叫做`COMDAT`这种段的属性字段都有`IMAGE_SCN_LNK_COMDAT`(0x00001000)标记，链接器看到这个标志就会认为这个段是`COMDAT`类型，链接时丢弃重复段。

上述方法说的是模板，对于外部内联函数和虚函数表来说是类似的。

#### 函数级别链接

VISUAL C++提供了函数级别链接选项这个选项让所有的函数能像前面介绍的模板函数一样单独保存在一个段里面，当链接器需要使用某个目标文件的函数的时候就会将它合并到输出文件中，抛弃目标文件中其他无用的函数。

这样的链接比起往常会把无用的函数一起链接进来的整个地址链接减少了空间浪费。但这个优化会减慢编译和链接过程，链接器会计算函数之间的依赖关系并把其放在独立的段中，目标文件随着段数目的增加会变得相对较大，重定位过程因为段的数目的增加变得复杂，目标函数的段的数量也有所增加

GCC提供了类似的机制，它有两个选择分别是`-ffunction-sections`和`-fdata-sections`，区别在于是将函数保存单独段还是变量保存单独段。

### 全局构造与析构

Linux系统一般程序入口是`_start`，这是Linux系统库（Glibc）的一部分。程序与和Glibc库链接在一起形成最终可执行文件之后，这个函数就是程序的初始化部分的入口，程序初始化完成部分完成一系列初始化过程之后会调用main函数，main函数结束之后返回到初始化部分，它会进行一些清理工作然后结束进程。

ELF定义了两个特殊的段——`.init`和`.fini`前者存放Glibc初始化部分安排执行的代码，后者存放main函数正常退出时Glibc执行的代码。

全局构造在main函数执行前执行，它的析构在main函数结束了再执行也是因此了。

### C++与ABI

编译器编译出的目标文件能够相互链接它们必须满足下列的条件

- 采用同样的目标文件格式
- 拥有相同的符号修饰标准
- 变量的内存分布方式相同、函数调用方式相同
- ......

上述和可执行二进制兼容性相关的内容称为ABI（Application Binary Interfeace）

ABI和API的区别在于前者针对二进制层面，后者针对源代码层面。ABI的兼容程度要比API更为严格。比如POSIX这个API标准规定`printf()`这个函数的原型，保证了函数定义在所有遵循POSIX标准的系统之间都是一样的，但是它无法保证这个函数实际执行的时候，参数是按照什么顺序压栈，参数在堆栈上如何分布，调用指令是否相同（x86是call，MIPS是jal）。

C++让人诟病的就是二进制兼容不好，比起C语言来说更为不易。不仅不同编译器编译的二进制代码之间无法兼容，同一个编译器也有可能出现这个情况。


## 静态库链接

一种语言的开发环境往往附带语言库。这些库通常是对操作系统的API的包装。比如`printf()`函数会对字符串进行一些必要的处理后，最后调用操作系统提供的API。各个操作系统下在终端输出字符串的API都不一样，linux下是`write`系统调用，Windows下则是`WriteConsole`系统API。

库里面还会有一些很常用的函数，比如用于获取字符串长度的`strlen()`，该函数遍历整个字符串后返回字符串的长度，这个函数没有调用任何操作系统的API。

一个静态库可以简单地看作一组目标文件的集合，即多个目标文件压缩打包后形成的文件。比如linux中最常用的C语言静态库libc位于/usr/lib/libc.a，它属于Glibc项目的一部分。可以使用ar工具查看该文件包含了哪些目标文件。

```bash
$ ar -t /usr/lib/libc.a

init-first.o
libc-start.o
sysdep.o
version.o
check_fds.o
libc-tls.o
dso_handle.o
errno.o
errno-loc.o
iconv_open.o
iconv.o
iconv_close.o
gconv_open.o
gconv.o
gconv_close.o
gconv_db.o
gconv_conf.o
gconv_builtin.o
...

```

这些目标文件也会相互依赖，使用GCC编译器的`-verbose`选项可以把编译过程的中间步骤打印出来，`--fno-builtin`保证GCC不会开启内置函数的优化选项，可以从此一窥Hello.c的中间步骤

这里的Hello.c不是上面的，只是简单打印一个Hello

```c
#include<stdio.h>
int main(void){
    printf("Hello\n");
    return 0;
}
```

```bash
$  gcc -static --verbose -fno-builtin Hello.c 

Using built-in specs.
COLLECT_GCC=gcc
COLLECT_LTO_WRAPPER=/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/lto-wrapper
Target: x86_64-pc-linux-gnu
Configured with: /build/gcc/src/gcc/configure --enable-languages=c,c++,ada,fortran,go,lto,objc,obj-c++,d --enable-bootstrap --prefix=/usr --libdir=/usr/lib --libexecdir=/usr/lib --mandir=/usr/share/man --infodir=/usr/share/info --with-bugurl=https://bugs.archlinux.org/ --with-build-config=bootstrap-lto --with-linker-hash-style=gnu --with-system-zlib --enable-__cxa_atexit --enable-cet=auto --enable-checking=release --enable-clocale=gnu --enable-default-pie --enable-default-ssp --enable-gnu-indirect-function --enable-gnu-unique-object --enable-libstdcxx-backtrace --enable-link-serialization=1 --enable-linker-build-id --enable-lto --enable-multilib --enable-plugin --enable-shared --enable-threads=posix --disable-libssp --disable-libstdcxx-pch --disable-werror
Thread model: posix
Supported LTO compression algorithms: zlib zstd
gcc version 12.2.1 20230111 (GCC) 
COLLECT_GCC_OPTIONS='-static' '-v' '-fno-builtin' '-mtune=generic' '-march=x86-64' '-dumpdir' 'a-'
 /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/cc1 -quiet -v Hello.c -quiet -dumpdir a- -dumpbase Hello.c -dumpbase-ext .c -mtune=generic -march=x86-64 -version -fno-builtin -o /tmp/cc0STAo1.s
GNU C17 (GCC) version 12.2.1 20230111 (x86_64-pc-linux-gnu)
        compiled by GNU C version 12.2.1 20230111, GMP version 6.2.1, MPFR version 4.2.0, MPC version 1.3.1, isl version isl-0.25-GMP

GGC heuristics: --param ggc-min-expand=100 --param ggc-min-heapsize=131072
ignoring nonexistent directory "/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../x86_64-pc-linux-gnu/include"
#include "..." search starts here:
#include <...> search starts here:
 /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/include
 /usr/local/include
 /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/include-fixed
 /usr/include
End of search list.
GNU C17 (GCC) version 12.2.1 20230111 (x86_64-pc-linux-gnu)
        compiled by GNU C version 12.2.1 20230111, GMP version 6.2.1, MPFR version 4.2.0, MPC version 1.3.1, isl version isl-0.25-GMP

GGC heuristics: --param ggc-min-expand=100 --param ggc-min-heapsize=131072
Compiler executable checksum: c5620313e3defc07ff561cb90de48ddc
COLLECT_GCC_OPTIONS='-static' '-v' '-fno-builtin' '-mtune=generic' '-march=x86-64' '-dumpdir' 'a-'
 as -v --64 -o /tmp/cc1DGmYx.o /tmp/cc0STAo1.s
GNU assembler version 2.40 (x86_64-pc-linux-gnu) using BFD version (GNU Binutils) 2.40
COMPILER_PATH=/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/:/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/:/usr/lib/gcc/x86_64-pc-linux-gnu/:/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/:/usr/lib/gcc/x86_64-pc-linux-gnu/
LIBRARY_PATH=/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/:/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../lib/:/lib/../lib/:/usr/lib/../lib/:/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../:/lib/:/usr/lib/
COLLECT_GCC_OPTIONS='-static' '-v' '-fno-builtin' '-mtune=generic' '-march=x86-64' '-dumpdir' 'a.'
 /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/collect2 -plugin /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/liblto_plugin.so -plugin-opt=/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/lto-wrapper -plugin-opt=-fresolution=/tmp/cc5qtzYs.res -plugin-opt=-pass-through=-lgcc -plugin-opt=-pass-through=-lgcc_eh -plugin-opt=-pass-through=-lc --build-id --hash-style=gnu -m elf_x86_64 -static /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../lib/crt1.o /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../lib/crti.o /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/crtbeginT.o -L/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1 -L/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../lib -L/lib/../lib -L/usr/lib/../lib -L/usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../.. /tmp/cc1DGmYx.o --start-group -lgcc -lgcc_eh -lc --end-group /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/crtend.o /usr/lib/gcc/x86_64-pc-linux-gnu/12.2.1/../../../../lib/crtn.o
COLLECT_GCC_OPTIONS='-static' '-v' '-fno-builtin' '-mtune=generic' '-march=x86-64' '-dumpdir' 'a.'
```
其中关键的三个步骤分别在第12行、31行和36行

1. 调用cc1程序，这个程序实际上就是GCC的C语言编译器，它将Hello.c编译成一个临时汇编文件/tmp/cc0STAo1.s
2. 调用as程序（GNU的汇编器），它将/tmp/cc0STAo1.s会变成临时目标文件/tmp/cc1DGmYx.o
3. 调用collect2程序完成最后的链接，而不是ld程序。

collect2可以看作是ld链接器的包装，它会调用ld链接器完成对目标文件的链接，再对链接结果进行一些处理。

## 链接过程控制

在大多数情况下，链接器默认链接规则没有问题，但对一些有特殊要求的程序，比如操作系统内核、BIOS和一些没有操作系统的情况下运行的程序（Boot Loader或嵌入式系统的程序），以及一些需要特殊的链接过程的程序等，它们往往受限于一些特殊条件，如需要指定输出文件的各个段的虚拟地址、段的名称、段存放的顺序等，因为这些特殊的环境，特别是某些硬件调价的限制，往往对程序的各个段的地址有特殊的要求。

### 链接控制脚本

- 使用命令行给链接器指定参数，比如`ld -e`这样的
- 将链接指定存放在目标文件里，编译器经常通过这种方法想链接器传递指令。
- 使用链接控制脚本

由于各个链接平台的链接过程不同，这里只说明ld链接器。

ld在用户没有指定链接脚本的时候会使用默认脚本，可以使用下面的命令查看ld默认的链接脚本

```bash
$ ld -verbose
```

默认ld链接脚本存放在/usr/lib/ldscripts/下，不同的机器平台和输出文件格式都有对于的脚本

为了精准控制链接过程，也可以使用自己的链接脚本，使用-T参数

```bash
$ ld -T link.script
```

### 最“小”的程序

为了演示链接的控制过程，下面将做一个最“小”的程序。也就是打印一个Hello。但不能像上面演示gcc编译过程时使用的那样，理由如下

- 其使用了`printf()`函数，该函数时系统C语言库的一部分。为了使用该函数，连接时就需要将C语言库和目标文件链接产生最终可执行文件。这里希望它能脱离C语言库。
- 由于使用了库，就需要main函数。程序入口是库的_start，由库负责初始化后调用main函数来执行程序的主体部分。这里为了加以区分，会使用nomain作为程序的入口。
- 这里希望把所有段都合并到一个叫tinytext的段，这是由链接脚本控制链接过程生成的。

```c
char* str = "Hello\n";

void print(){
    asm(
        "movq $1, %rax     \n\t"
        "movq $1, %rdi     \n\t"
        "movq (str), %rsi  \n\t"
        "movq $6, %rdx     \n\t"
        "syscall           \n\t"
    );
}

void exit(){
    asm(
        "movq $60, %rax \n\t"
        "movq $42, %rdi \n\t"
        "syscall        \n\t"
    );
}

void nomain(){
    print();
    exit();
}
```
与本书不同的是，我尽量采用64位的，所以程序源码已经被我修改了。

这是使用C语言，如果使用汇编，还会进一步压缩文件的大小\[doge\]，下面是我更改蒋炎岩老师在网站上放的一段代码，下面的下载链接就是蒋炎岩老师所写代码的下载链接

[下载链接](http://jyywiki.cn/pages/OS/2022/demos/minimal.S)


```asm
.globl nomain
nomain:
  movq $1, %rax
  movq $1, %rdi
  movq $mes, %rsi
  movq $6, %rdx
  syscall 
  movq $60,  %rax
  movq $42,  %rdi
  syscall  
mes: .ascii "Hello\n"
```

这里没有使用库函数，而是直接使用了linux的系统调用完成了在终端打印hello并退出，下面是他俩的函数声明：

```c
ssize_t write(int fd, const void buf[.count], size_t count);
void _exit(int status)
```

关于`write`的介绍，可以在man-pages中找到，同理，`exit`也可以

```bash
$ man 2 write
```

> write() writes up to count bytes from the buffer starting at buf to the file referred to by the file descriptor fd.

[write(2) — Linux manual page](https://man7.org/linux/man-pages/man2/write.2.html)

在bash shell中，可以通过`echo $?`查看退出码42，如果是fish shell，默认直接显示，而且不能通过`echo $?`打印。

先看一个简单的链接脚本test.lds（一般链接脚本的后缀名都是lds,ld script）的例子

```
ENTRY(nomain)
SECTIONS
{
     . = 0x00400000 + SIZEOF_HEADERS;
     tinytext : { *(.text) * (.data) * (.rodata) }
     /DISCARD/ : { *(.comment) }
}
```

第一行指定了程序的入口为`nomain()`函数，后面的`SECTIONS`命令一般是链接脚本的主体，这个命令指定了各种输入端到输出段的交换。这里面有三个语句，第一个是赋值语句，剩下两个是段转换规则，其含义基本如下：

- . = 0x00400000 + SIZEOF_HEADERS; 
  - 第一条赋值语句的意思是将当前虚拟地址空间设置成 0x00400000 + SIZEOF_HEADERS，`SIZEOF_HEADERS`为输出文件的文件头大小。`.`表示当前虚拟地址，因为后面紧跟着输出段`tinytext`，所以这个段的起始地址就是 0x00400000 + SIZEOF_HEADERS。
- tinytext : { *(.text) * (.data) * (.rodata) }
  - 所有输入文件名字为`.text`、`.data`和`.rodata`的段依次合并到输出文件的`.tinytext`
- /DISCARD/ : { *(.comment) }
  - 将所有输入文件中名字为`.commit`的段丢弃，不保存在输出文件中

最后我的打印Hello程序的链接脚本是：

```
ENTRY(nomain)
SECTIONS
{
     . = 0x00400000 + SIZEOF_HEADERS;
     tinytext : { *(.text) * (.data) * (.rodata) *(.data.rel.local) }
     /DISCARD/ : { *(.comment) *(.note.gnu.property) *(.eh_frame )  }
}
```

```bash
$ gcc -c -fno-builtin hello.c
$ ld -static -T test.lds -o hello hello.o
ld: warning: hello has a LOAD segment with RWX permissions
```

使用objdump可以发现只有tinytext一个段了

```bash
$ objdump -h hello

hello:     file format elf64-x86-64

Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 tinytext      00000068  00000000004000e8  00000000004000e8  000000e8  2**3
                  CONTENTS, ALLOC, LOAD, CODE
```

但使用readelf可以发现事实并非如此

```bash
$  readelf -S hello
There are 5 section headers, starting at offset 0x228:

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] tinytext          PROGBITS         00000000004000e8  000000e8
       0000000000000068  0000000000000000 WAX       0     0     8
  [ 2] .symtab           SYMTAB           0000000000000000  00000150
       0000000000000090  0000000000000018           3     2     8
  [ 3] .strtab           STRTAB           0000000000000000  000001e0
       000000000000001e  0000000000000000           0     0     1
  [ 4] .shstrtab         STRTAB           0000000000000000  000001fe
       0000000000000024  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), l (large), p (processor specific)

```

ld链接器默认会产生序号为2、3、4这三个段。对于可执行文件来说，符号表和字符串表是可选的，但段名字符串表保存段名故而不可缺少。

可以使用`ld -s`禁止产生符号表或者使用`strip`

```bash
$ ld -static -s -T test.lds -o hello hello.o
ld: warning: hello has a LOAD segment with RWX permissions
$ readelf -S hello
There are 3 section headers, starting at offset 0x168:

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] tinytext          PROGBITS         00000000004000e8  000000e8
       0000000000000068  0000000000000000 WAX       0     0     8
  [ 2] .shstrtab         STRTAB           0000000000000000  00000150
       0000000000000014  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), l (large), p (processor specific)
```

### ld链接语法简介

ld链接器的连接脚本语法继承于AT&T链接器命令语言的语法。连接脚本由一系列语句组成，语句分两种，一种是命令语句，另一种是赋值语句。

之前的test.lds有两个命令语句，`ENTRY`和`SECTIONS`。其中`SECTIONS`负责链接过程的段转换过程，是链接最核心和最复杂的部分。

|命令语句|说明|
|:--|:--|
|ENTRY(symbol)|指定符号symbol的值为入口地址。入口地址即进程执行的第一条用户空间的指令在进程地址空间的地址，它被指定在ELF文件头Elf64_Ehdr的e_entry成员中。ld有多种方法设置进程入口地址。|
|STARTUP(filename)|将文件filename作为链接过程的第一个输入文件|
|SEARCH_DIR(path)|将路径path加入到ld链接器的库查找目录。ld会根据指定的目录去查找相应的库，也可以使用-Lpath指定|
|INPUT(file,file,...)|将指定文件作为链接过程的输入文件
|INCLUDE filename|将指定文件包含进链接脚本|
|PROVIDE(symbol)|将链接脚本中定义某个符号。该符号可以在程序中被引用。之前提到的特殊符号都是通过这个方法定义在脚本中|

ld有多种方法设置进程入口地址，其优先级为：

1. ld命令行的-e选项
2. 链接脚本的`ENTRY`命令
3. 如果`_strat`符号有定义，使用这个符号
4. 如果存在`.text`段，使用这个段的第一个字节的地址
5. 使用0

`SECTIONS`命令语句的基本格式为：
```
SECTIONS
{
     ...
     secname : { contents }
     ...
}
```

secname表示输出端的段名，secname后面需要跟一个空格，后面紧跟着冒号和一对大括号。contents描述了一套规则和条件，它表示符号这种条件的输入段将合并到这个输出端中。输出段名的命名方法必须满足输出文件的格式要求，比如使用ld产生一个a.out格式的文件，输出段名不能使用`.text`、`data`和`.bss`之外的任何名字，因为这个格式规定了段名。

有一个特殊的段就是`/DISCARD/`如果这个名字是输出端，所有符合contents条件的段都会被丢弃。

contents可以包含多个条件，条件之间使用空格隔开。条件的写法如下：

```
filename(sections)
```

fielname是输入文件名，sections是段名

- file1.o(.data)表示输入文件名为file1.o的文件中的`.data`段符合条件
- file1.o(.data .rodata)或file1.o(.data, .rodata)二者都表示file1.o文件中的`.data`或`.rodata`符合条件
- file1.o表示其所有段都符合条件
- *(.data)表示所有输入文件的`.data`段符合条件。\*是通配符，类似正则表达式的\*，这里允许使用正则表达式

## BFD库

BFD (Binary File Descriptor libray)是一个GNU项目，它目标是通过一种同意的接口去处理不同的目标格式，因为现在硬件和软件平台种类繁多。

现在的GCC、ld、GDB及Binutils的其他工具都通过BFD库处理目标文件，而不是直接操作目标文件。

# Windows PE/COFF

Windows引入了一种叫PE (Protable Executable)的可执行格式作为该平台的标准可执行文件格式。PE和ELF同根同源，二者都由COFF (Common Object File Format)格式发展而来。

微软对64位Windows平台的PE结构做了一些修改，新的文件格式叫做PE32+，新格式没有添加任何结构，最大变化就是把32位的字段改成了64位。

与ELF文件相同，PE/COFF格式也采取基于段的格式。代码段名字往往叫做`.code`，数据段叫`.data`，不同编译器使用的段名可能有所不同。

## PE的前身-COFF

还是使用最开始那个Hello.c的例子

```c
//Hello.c
#include<stdio.h>
void fun1();
int gloabl_init_var = 666;
int global_uninit_var;
int main(void){
    static int static_init_var = 999;
    static int static_uninit_var;
    int a = 1;
    int b;
    printf("Hello\n");
    fun1();
    return 0;
}
void fun1(){}
```

使用CL编译器，这里用的是VS2022中下载的相关工具，而非书中介绍的

```bash
$ CL /c /Za Hello.c
```

`/c`表示只编译不链接，`/Za`表示禁用语言扩展 

和GUN的工具链中的objdump一样，这里也有一个类似的工具，就是dumpbin

```bash
$ dumpbin /ALL .\Hello.obj > Hello.txt
```

`/ALL`表示打印目标文件的所有相关信息，也可以使用`/SUMMARY`选项查看基本信息

```bash
$  dumpbin /SUMMARY .\Hello.obj
Microsoft (R) COFF/PE Dumper Version 14.34.31937.0
Copyright (C) Microsoft Corporation.  All rights reserved.


Dump of file .\Hello.obj

File Type: COFF OBJECT

  Summary

          70 .chks64
           B .data
          78 .debug$S
          18 .drectve
          24 .pdata
          D6 .text$mn
          18 .xdata
```

### COFF文件结构

COFF文件的文件头包含了两部分，一个是描述文件总体结构和属性的映像头 (Image Header)，另一个是描述该文件包含的段属性的段表 (Section Table)。

---

映像 (Image)：因为PE文件在装载时被直接映射到进程的虚拟空间中运行，它时进程的虚拟空间的映像。所以PE可执行文件很多时候被叫做映像文件 (Image File)。

||
|:--:|
|Image Header IMAGE_FILE_HEADER|
|Section Table IMAGE_SECTION_HEADER[]|
|.text|
|.data|
|.drectve|
|.debug$S|
|...|
|Symbol Table|

---

我并不想画图，所以用表格展示了，自然第一个空着的那样是应该省略的。

文件头里面描述COFF总体属性的映像头时一个IMAGE_FILE_HEADER的结构，和ELF中的Elf64_Ehdr作用相同。在微软SDK目录下的winnt.h文件中可以找到相关定义

```c
typedef struct _IMAGE_FILE_HEADER {
    WORD    Machine;
    WORD    NumberOfSections;
    DWORD   TimeDateStamp;
    DWORD   PointerToSymbolTable;
    DWORD   NumberOfSymbols;
    WORD    SizeOfOptionalHeader;
    WORD    Characteristics;
} IMAGE_FILE_HEADER, *PIMAGE_FILE_HEADER;
```

对照dumpbin产生的txt文件，会发现这个结构和文本中FILE HEADER VALUES是对应的。

```
...

Dump of file .\Hello.obj

File Type: COFF OBJECT

FILE HEADER VALUES
            8664 machine (x64)
               E number of sections
        63D72E72 time date stamp Mon Jan 30 10:41:54 2023
             50B file pointer to symbol table
              33 number of symbols
               0 size of optional header
               0 characteristics

...
```

可以看到目标文件类型是COFF OBJECT，文件头包含了目标机器类型，这里是0X8664，同样在winnt.h文件中可以看到关于这些值的定义

下面小截取一手0x8664的定义，还有很多平台就不都拿过来了。

```c
#define IMAGE_FILE_MACHINE_AMD64             0x8664  // AMD64 (K8)
```

time date stamp表示PE文件的创建时间。file pointer to symbol table表示符号表在PE中的位置。size of optional header指的是Optional Header的大小，这个结构只存在于PE文件，COFF目标文件中不存在该结构，所以为0。

映像头后面紧跟着的就是COFF文件的段表，它是一个类型为IMAGE_SECTION_HEADER结构的数组，数组里面每个元素代表一个段，和ELF中Elf64_Shdr类似。它也被定义在winnt.h中。

```c
#define IMAGE_SIZEOF_SHORT_NAME              8

typedef struct _IMAGE_SECTION_HEADER {
    BYTE    Name[IMAGE_SIZEOF_SHORT_NAME];
    union {
            DWORD   PhysicalAddress;
            DWORD   VirtualSize;
    } Misc;
    DWORD   VirtualAddress;
    DWORD   SizeOfRawData;
    DWORD   PointerToRawData;
    DWORD   PointerToRelocations;
    DWORD   PointerToLinenumbers;
    WORD    NumberOfRelocations;
    WORD    NumberOfLinenumbers;
    DWORD   Characteristics;
} IMAGE_SECTION_HEADER, *PIMAGE_SECTION_HEADER;
```

可以看到每个段所拥有的属性包括段名、物理地址、虚拟地址、原始数据大小、段在文件中的位置、该段的重定位表在文件中的位置、该段的行号表在文件中的位置、标志位等。

|字段|含义|
|:--|:--|
|VirtualSize|该段被加载至内存后的大小|
|VirtualAddress|该段被加载至内存后的虚拟地址|
|SizeOfRawData|该段在文件中的大小|
|Characteristics|段的属性|

SizeOfRawData的值可能和VirtualSize不一样，比如`.bss`段的SizeOfRawData会是0，而VirtualSize值是`.bss`段的大小。另外涉及到内存对齐等问题，前者的值往往要比后者小

段的属性主要包含段的类型（代码、数据、bss）、对齐方式及权限。

段表后就是具体段的内容了，由于介绍过和COFF相似的ELF的一些段，所以下面只介绍ELF中不存在的段，`.debug$S`段和`.drectve`段。

## 链接指示信息

```
SECTION HEADER #1
.drectve name
       0 physical address
       0 virtual address
      18 size of raw data
     244 file pointer to raw data (00000244 to 0000025B)
       0 file pointer to relocation table
       0 file pointer to line numbers
       0 number of relocations
       0 number of line numbers
  100A00 flags
         Info
         Remove
         1 byte align

RAW DATA #1
  00000000: 20 20 20 2F 44 45 46 41 55 4C 54 4C 49 42 3A 22     /DEFAULTLIB:"
  00000010: 4C 49 42 43 4D 54 22 20                          LIBCMT" 

   Linker Directives
   -----------------
   /DEFAULTLIB:LIBCMT
```

上面的就是Hello.txt中关于`.drectve`段相关的内容。drectve实际上是directive的缩写，它的内容是编译器传递给链接器的指令，即编译器告诉链接器该如何链接这个目标文件。段名后面就是段的属性，包括地址、长度、位置等属性，最后一个属性是flags，也就是IMAGE_SECTION_HEADER中的Characteristics成员，`.drectve`段的标志位是0x100A00。

|标志位|宏定义|意义|
|:--:|:--|:--|
|0x00100000|IMAGE_SCN_ALIGN_1BYTES|1字节对齐。相当于不对齐|
|0x00000800|IMAGE_SCN_LNK_REMOVE|最终链接成映像文件的时候抛弃该段|
|0x00000200|IMAGE_SCN_LNK_INFO|该段包含的是注释或其他信息|

dumpbin打印了标志位的三个组合属性：Info、Remove、 1 byte align。即该段是信息段，而非程序数据；该段在最后链接成可执行文件的时候被抛弃；该段在文件中对齐方式是一字节对齐。

紧随其后的是该段在文件中的原始数据（RAW DATA #1）。dumpbin知道这个段是`.drectve`段，并对该段的内容进行解析，结果就是/DEFAULTLIB:LIBCMT这条链接指令。这就是CL编译器希望传递给link链接器的参数。该参数表示这个目标文件需要LIBCMT这个默认库。

LIBCMT全程Library C Multitheared，静态链接的多线程C库。

## 调试信息

COFF文件中以`.debug`开头的段都包含着调试信息。比如`.debug$S`表示包含的是符号相关的调试信息段；`debug$P`表示包含预编译头文件相关的调试信息段；`.debug$T`表示包含类型相关的调试信息段。

在Hello.obj中只看到了`.debug$S`段，可以在该段的文本信息看到目标文件的绝对路径、编译器信息等。

## 符号表

Hello.txt最后部分就是COFF符号表，COFF符号表包含的内容几乎和ELF文件的符号表是一致的，主要就是符号名、符号类型、所在位置。

```
COFF SYMBOL TABLE
000 01047CC1 ABS    notype       Static       | @comp.id
001 80010190 ABS    notype       Static       | @feat.00
002 00000002 ABS    notype       Static       | @vol.md
003 00000000 SECT1  notype       Static       | .drectve
    Section length   18, #relocs    0, #linenums    0, checksum        0
005 00000000 SECT2  notype       Static       | .debug$S
    Section length   78, #relocs    0, #linenums    0, checksum        0
007 00000000 SECT3  notype       Static       | .data
    Section length    B, #relocs    0, #linenums    0, checksum 84C66A7A
009 00000000 SECT3  notype       External     | gloabl_init_var
00A 00000004 UNDEF  notype       External     | global_uninit_var
00B 00000000 SECT4  notype       Static       | .text$mn
    Section length   34, #relocs    3, #linenums    0, checksum F819F81E
00D 00000000 SECT5  notype       Static       | .text$mn
    Section length    8, #relocs    1, #linenums    0, checksum 411950D3, selection    2 (pick any)
00F 00000000 SECT6  notype       Static       | .text$mn
    Section length   43, #relocs    2, #linenums    0, checksum 2D481083, selection    2 (pick any)
011 00000000 SECT7  notype       Static       | .text$mn
    Section length   57, #relocs    2, #linenums    0, checksum 41BAE1CE, selection    2 (pick any)
013 00000000 SECT5  notype ()    External     | __local_stdio_printf_options
014 00000000 UNDEF  notype ()    External     | __acrt_iob_func
015 00000000 UNDEF  notype ()    External     | __stdio_common_vfprintf
016 00000000 SECT6  notype ()    External     | _vfprintf_l
017 00000000 SECT7  notype ()    External     | printf
018 00000000 SECT4  notype ()    External     | fun1
019 00000010 SECT4  notype ()    External     | main
01A 00000000 SECT6  notype       Label        | $LN3
01B 00000000 SECT7  notype       Label        | $LN3
01C 00000010 SECT4  notype       Label        | $LN3
01D 00000000 SECT8  notype       Static       | .xdata
    Section length    8, #relocs    0, #linenums    0, checksum 8D3961AC, selection    5 (pick associative Section 0x6)
01F 00000000 SECT8  notype       Static       | $unwind$_vfprintf_l
020 00000000 SECT9  notype       Static       | .pdata
    Section length    C, #relocs    3, #linenums    0, checksum A712C50E, selection    5 (pick associative Section 0x6)
022 00000000 SECT9  notype       Static       | $pdata$_vfprintf_l
023 00000000 SECTA  notype       Static       | .xdata
    Section length    8, #relocs    0, #linenums    0, checksum 8D3961AC, selection    5 (pick associative Section 0x7)
025 00000000 SECTA  notype       Static       | $unwind$printf
026 00000000 SECTB  notype       Static       | .pdata
    Section length    C, #relocs    3, #linenums    0, checksum 5FE3FADF, selection    5 (pick associative Section 0x7)
028 00000000 SECTB  notype       Static       | $pdata$printf
029 00000000 SECTC  notype       Static       | .xdata
    Section length    8, #relocs    0, #linenums    0, checksum 37887F31
02B 00000000 SECTC  notype       Static       | $unwind$main
02C 00000000 SECTD  notype       Static       | .pdata
    Section length    C, #relocs    3, #linenums    0, checksum 7D3C6CAC
02E 00000000 SECTD  notype       Static       | $pdata$main
02F 00000008 UNDEF  notype       External     | ?_OptionsStorage@?1??__local_stdio_printf_options@@9@9 (`__local_stdio_printf_options'::`2'::_OptionsStorage)
030 00000004 SECT3  notype       Static       | $SG9830
031 00000000 SECTE  notype       Static       | .chks64
    Section length   70, #relocs    0, #linenums    0, checksum        0

String Table Size = 0x10B bytes
```

输出结果最左列是符号编号，接着是符号的大小，第三列是符号所在的位置。ABS (Absolute)表示符号是个绝对值，即一个常量，它不存在于任何段中；SECT1 (SECT#1)表示符号对于的对象定义在文件中第一个段中；UNDEF表示未定义，即该符号定义在其他目标文件。第四列是符号类型，对于C语言来说，COFF只区分两种，一种是变量和其他符号，叫notype，另一种是函数，叫notype()，该符号类型值可以用于其他一些需要强符号类型的语言或系统中，可以给链接器更多的信息来识别符号的类型。第五列是符号的可见范围，Static是局部，External是全局。最后一列是符号名，对于需要符号修饰的，dumpbin会把修饰前后的名字都打印出来，括号内的就是修饰前的。如果dumpbin发现这个符号是段名，还会解析这个段的基本属性：段长度、重定位数、行号数以及校验和。

## PE

PE相较于COFF的主要变化由两个

- 文件最开始的部分不是COFF文件头，而是DOS MZ可执行文件格式的文件头和桩代码
- 原有的IMAGE_FILE_HEADER扩展成IMAGE_NT_HEADERS，该结果在原有基础上新转增了PE扩展头部结构。

由于历史原因，PE文件设计为了兼容DOS系统，还存在Image DOS Header和DOS Stub两个结构。

Image_DOS_HEADER结构也被定义在winnt.h里面。该结构的e_lfanew成员表明了PE文件头在PE文件中的偏移。这个成员在DOS的可执行文件格式中永远为0，所以Windows执行可执行文件时会先判断这个成员是否为0，如果为0就启用DOS子系统。

IMAGE_NT_HEADERS是PE文件真正的文件头，它包含一个标记和两个结构体。标记是一个常量，对于合法的PE文件来说，值永远是0x00004550，按照小端字节序，对应的是'P'、'E'、'\0'、'\0'四个字符的ASCII码。文件头包含的两个结构分别是映像头和PE扩展头部结构

```c
typedef struct _IMAGE_NT_HEADERS64 {
    DWORD Signature;
    IMAGE_FILE_HEADER FileHeader;
    IMAGE_OPTIONAL_HEADER64 OptionalHeader;
} IMAGE_NT_HEADERS64, *PIMAGE_NT_HEADERS64;
```

64位Windows编译默认定义_WIN64这个宏，一些符号的名字也会被定义成别的，比如：

> The actual structure in WinNT.h is named IMAGE_NT_HEADERS32 and IMAGE_NT_HEADERS is defined as IMAGE_NT_HEADERS32. However, if _WIN64 is defined, then IMAGE_NT_HEADERS is defined as IMAGE_NT_HEADERS64. 

[IMAGE_NT_HEADERS64 structure (winnt.h)](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_nt_headers64#remarks)

Image_FILE_HEADER在前面介绍过了，这里新出现的就是PE扩展头部结构。

```c
typedef struct _IMAGE_OPTIONAL_HEADER64 {
    WORD        Magic;
    BYTE        MajorLinkerVersion;
    BYTE        MinorLinkerVersion;
    DWORD       SizeOfCode;
    DWORD       SizeOfInitializedData;
    DWORD       SizeOfUninitializedData;
    DWORD       AddressOfEntryPoint;
    DWORD       BaseOfCode;
    ULONGLONG   ImageBase;
    DWORD       SectionAlignment;
    DWORD       FileAlignment;
    WORD        MajorOperatingSystemVersion;
    WORD        MinorOperatingSystemVersion;
    WORD        MajorImageVersion;
    WORD        MinorImageVersion;
    WORD        MajorSubsystemVersion;
    WORD        MinorSubsystemVersion;
    DWORD       Win32VersionValue;
    DWORD       SizeOfImage;
    DWORD       SizeOfHeaders;
    DWORD       CheckSum;
    WORD        Subsystem;
    WORD        DllCharacteristics;
    ULONGLONG   SizeOfStackReserve;
    ULONGLONG   SizeOfStackCommit;
    ULONGLONG   SizeOfHeapReserve;
    ULONGLONG   SizeOfHeapCommit;
    DWORD       LoaderFlags;
    DWORD       NumberOfRvaAndSizes;
    IMAGE_DATA_DIRECTORY DataDirectory[IMAGE_NUMBEROF_DIRECTORY_ENTRIES];
} IMAGE_OPTIONAL_HEADER64, *PIMAGE_OPTIONAL_HEADER64;
```

这里有很多成员，有些和PE文件的装载和运行有关。这里只挑一些和静态链接相关的介绍。

### PE数据目录

Windows系统装载PE可执行文件时，往往需要很快找到一些装载所需要的数据结构，比如导入表、导出表等。这些常用的数据和长度都被保存在了一个叫数据目录的结构里面，它就是IMAGE_OPTIONAL_HEADER64结构里面的DataDirectory成员。该成员是一个IMAGE_DATA_DIRECTORY结构的数组，相关定义如下：

```c
typedef struct _IMAGE_DATA_DIRECTORY {
    DWORD   VirtualAddress;
    DWORD   Size;
} IMAGE_DATA_DIRECTORY, *PIMAGE_DATA_DIRECTORY;

#define IMAGE_NUMBEROF_DIRECTORY_ENTRIES    16
```

DataDirectory数组里面每个元素对应包含一个表，winnt.h中定义了一些以IMAGE_DIRECTORY_ENTRY_开头的宏。

```c
#define IMAGE_DIRECTORY_ENTRY_EXPORT          0   // Export Directory
```

从上面的代码可以看出，数组第一个元素所包含的地址和长度就是导出表所在的地址和长度。
