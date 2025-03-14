---
title: "程序员的自我修养：动态链接"
author: suo yuan
pubDatetime: 2022-10-26T03:42:51Z
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

# 可执行文件的装载与进程

## 进程虚拟地址空间

程序运行起来之后拥有自己的虚拟地址空间，其大小由CPU的位数决定。C语言指针所占空间可以判断虚拟地址空间的大小，32位平台下的指针是32位，也就是4字节；64位平台下的指针是64位，即8字节。历史上指针曾经分为长指针、短指针和近指针，这是为了应对当时处理器而设计的，现在可以不再考虑。

以32位为例：

Linux平台的虚拟地址空间操作系统要占用1G，Windows默认占用2G（但可以改成1G）。

Intel在95年采用了36位的物理地址，更改了页映射的方式使得能够访问高达64GB的物理内存，这个地址扩展方法叫做PAE（Physical Address Extension）。

扩展的物理地址空间无法被普通的应用程序感受到。操作系统提供了一种窗口映射的方法，把额外的内存映射到进程地址空间中，应用程序可以根据需求选择申请和映射。比如程序从0x10000000~0x20000000这一段256MB的虚拟地址空间作为窗口，程序可以从高4GB的物理空间申请多个大小为256MB的物理空间，根据需求将窗口映射到某个物理空间块。

Windows下这个访问内存的操作方式叫做AWE（Address Windowing Extensions），Linux可以通过`mmap()`系统调用来实现。

## 装载的方式

最简单是静态装入的方法就是将程序运行所需要的指令和数据全部装入内存。但很多时候程序所需的内存大于物理内存，于是有了动态装入，即将程序最常用的部分常驻内存，不常用的数据放在磁盘里。

覆盖装入和页映射是典型的动态装载的方法。

### 覆盖装入

覆盖装入在虚拟存储没有出现之前使用广泛，现在已经被淘汰了。

覆盖装入把压力转移到了程序员这边，程序员需要手动把程序封装成若干个块，再写一个辅助代码来管理这些块。比如main函数会调用A或者B，就可以main调用A的时候把A载入，调用B的时候用B覆盖掉A的位置。

### 页映射

将内存和磁盘中的数据和指令按照页为单位来划分。执行程序某个页的时候将页载入内存的某个页，如果都满了就利用相关算法放弃一个页。这就是主流操作系统装载可执行文件的方式了。如果程序需要内存中没有载入的页，硬件会捕获这个信息，就是所谓的页错误 (Page Fault)，然后操作系统接管进程，负责将没有载入的页载入并建立映射关系。

## 操作系统角度看可执行文件的装载

有了现在硬件的地址转换和页映射的机制，操作系统动态加载可执行文件和静态加载有了很大的区别。

### 进程的建立

一个进程的关键的特征是它拥有独立的虚拟地址空间，这让它有别去其他进程。下面是常见建立进程的情况：

1. 创建一个独立的虚拟地址空间。
2. 读取可执行文件头，建立虚拟空间和可执行文件的映射关系。
3. 将CPU指令寄存器设置成可执行文件的入口地址，启动运行。

**创建虚拟地址空间**

虚拟地址空间实际上由一组映射函数将虚拟空间的各个页映射到相应的物理空间，创建一个虚拟空间实际上不是创建空间而是创建映射函数所需要的相应的数据结构。在i386的Linux下，创建这个只是分配一个页目录即可，页映射关系等是后续再进行设置。

**读取可执行文件头，并建立虚拟空间和可执行文件的映射关系**

上面一步的页映射关系函数是虚拟内存到物理内存的映射关系，这一步所做的是虚拟空间与可执行文件的映射关系。当程序发生页错误时，操作系统将会从物理内存中分配一个物理页，然后将该页从磁盘读取到内存中，再设置这个虚拟页和物理页的映射关系。当操作系统捕获到页错误时，它需要知道程序所需的页再可执行文件的哪个位置。这就是虚拟空间和可执行文件之间的映射关系。

Linux中将进程虚拟空间的一个段叫做虚拟内存区域（VMA），Windows下叫虚拟段。

**将CPU指令寄存器设置成可执行文件的入口地址，启动运行**

操作系统通过设置CPU指令寄存器将控制权转交给进程，进程由此开始执行。

这一步看似简单，再操作系统层面上比较复杂，它涉及到内核堆栈和用户堆栈的切换、CPU运行权限的切换。不过从进程的角度来看，这一步就是操作系统执行了一条跳转到可执行文件入口地址的调转指令。

## 进程虚存空间分布
### ELF文件链接视图
ELF文件被映射时，以系统的页长度作为映射单位。每个段被映射时的长度都是系统页长度的整数倍，如果不是，多余的部分也将占用一个页。

为了节省空间，ELF文件装载的时候将相同权限的段合并一起当作一个段来进行映射，这样的段概念上叫`Segment`。从链接的角度来看，ELF文件按照`Section`存储，从装载的角度来看，ELF文件按照`Segment`划分。

readelf可以查看ELF的Segment，正如描述Section属性的结构叫段表，描述Segment的结构叫程序头

```shel
readelf -l <filename>
```

以一个循环执行sleep的程序为例
```c
///sleepc.c:
#include <stdlib.h>

int main(void){
    while (1)
    {
        sleep(1000);
    }
    return 0;
}
```

```bash
$ gcc -static sleepc.c -o sleepc.elf
$ readelf -S sleepc.elf
There are 32 section headers, starting at offset 0xbcd50:

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .note.gnu.pr[...] NOTE             0000000000400270  00000270
       0000000000000040  0000000000000000   A       0     0     8
  [ 2] .note.gnu.bu[...] NOTE             00000000004002b0  000002b0
       0000000000000024  0000000000000000   A       0     0     4
  [ 3] .note.ABI-tag     NOTE             00000000004002d4  000002d4
       0000000000000020  0000000000000000   A       0     0     4
  [ 4] .rela.plt         RELA             00000000004002f8  000002f8
       0000000000000240  0000000000000018  AI      29    20     8
  [ 5] .init             PROGBITS         0000000000401000  00001000
       000000000000001b  0000000000000000  AX       0     0     4
  [ 6] .plt              PROGBITS         0000000000401020  00001020
       0000000000000090  0000000000000000  AX       0     0     8
  [ 7] .text             PROGBITS         00000000004010c0  000010c0
       0000000000079333  0000000000000000  AX       0     0     64
  [ 8] __libc_freeres_fn PROGBITS         000000000047a400  0007a400
       0000000000000ab2  0000000000000000  AX       0     0     16
  [ 9] .fini             PROGBITS         000000000047aeb4  0007aeb4
       000000000000000d  0000000000000000  AX       0     0     4
  [10] .rodata           PROGBITS         000000000047b000  0007b000
       000000000001bc84  0000000000000000   A       0     0     32
  [11] .stapsdt.base     PROGBITS         0000000000496c84  00096c84
       0000000000000001  0000000000000000   A       0     0     1
  [12] .eh_frame         PROGBITS         0000000000496c88  00096c88
       000000000000b2d8  0000000000000000   A       0     0     8
  [13] .gcc_except_table PROGBITS         00000000004a1f60  000a1f60
       00000000000000f6  0000000000000000   A       0     0     1
  [14] .tdata            PROGBITS         00000000004a3778  000a2778
       0000000000000018  0000000000000000 WAT       0     0     8
  [15] .tbss             NOBITS           00000000004a3790  000a2790
       0000000000000048  0000000000000000 WAT       0     0     8
  [16] .init_array       INIT_ARRAY       00000000004a3790  000a2790
       0000000000000008  0000000000000008  WA       0     0     8
  [17] .fini_array       FINI_ARRAY       00000000004a3798  000a2798
       0000000000000008  0000000000000008  WA       0     0     8
  [18] .data.rel.ro      PROGBITS         00000000004a37a0  000a27a0
       0000000000003768  0000000000000000  WA       0     0     32
  [19] .got              PROGBITS         00000000004a6f08  000a5f08
       00000000000000d8  0000000000000000  WA       0     0     8
  [20] .got.plt          PROGBITS         00000000004a6fe8  000a5fe8
       00000000000000a8  0000000000000008  WA       0     0     8
  [21] .data             PROGBITS         00000000004a70a0  000a60a0
       00000000000019f8  0000000000000000  WA       0     0     32
  [22] __libc_subfreeres PROGBITS         00000000004a8a98  000a7a98
       0000000000000048  0000000000000000 WAR       0     0     8
  [23] __libc_IO_vtables PROGBITS         00000000004a8ae0  000a7ae0
       0000000000000768  0000000000000000  WA       0     0     32
  [24] __libc_atexit     PROGBITS         00000000004a9248  000a8248
       0000000000000008  0000000000000000 WAR       0     0     8
  [25] .bss              NOBITS           00000000004a9260  000a8250
       0000000000005800  0000000000000000  WA       0     0     32
  [26] __libc_freer[...] NOBITS           00000000004aea60  000a8250
       0000000000000020  0000000000000000  WA       0     0     8
  [27] .comment          PROGBITS         0000000000000000  000a8250
       000000000000001b  0000000000000001  MS       0     0     1
  [28] .note.stapsdt     NOTE             0000000000000000  000a826c
       00000000000014d8  0000000000000000           0     0     4
  [29] .symtab           SYMTAB           0000000000000000  000a9748
       000000000000c0d8  0000000000000018          30   767     8
  [30] .strtab           STRTAB           0000000000000000  000b5820
       00000000000073d9  0000000000000000           0     0     1
  [31] .shstrtab         STRTAB           0000000000000000  000bcbf9
       0000000000000157  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  R (retain), D (mbind), l (large), p (processor specific)

```

通过readelf可以看到该文件section的数量，也可以查看segment的数量。正如描述section属性的结构叫段表，描述segment的结构叫程序头，它描述了ELF文件该如何被操作系统映射到进程的虚拟空间

```bash
$ readelf -l sleepc.elf

Elf file type is EXEC (Executable file)
Entry point 0x4014e0
There are 10 program headers, starting at offset 64

Program Headers:
  Type           Offset             VirtAddr           PhysAddr
                 FileSiz            MemSiz              Flags  Align
  LOAD           0x0000000000000000 0x0000000000400000 0x0000000000400000
                 0x0000000000000538 0x0000000000000538  R      0x1000
  LOAD           0x0000000000001000 0x0000000000401000 0x0000000000401000
                 0x0000000000079ec1 0x0000000000079ec1  R E    0x1000
  LOAD           0x000000000007b000 0x000000000047b000 0x000000000047b000
                 0x0000000000027056 0x0000000000027056  R      0x1000
  LOAD           0x00000000000a2778 0x00000000004a3778 0x00000000004a3778
                 0x0000000000005ad8 0x000000000000b308  RW     0x1000
  NOTE           0x0000000000000270 0x0000000000400270 0x0000000000400270
                 0x0000000000000040 0x0000000000000040  R      0x8
  NOTE           0x00000000000002b0 0x00000000004002b0 0x00000000004002b0
                 0x0000000000000044 0x0000000000000044  R      0x4
  TLS            0x00000000000a2778 0x00000000004a3778 0x00000000004a3778
                 0x0000000000000018 0x0000000000000060  R      0x8
  GNU_PROPERTY   0x0000000000000270 0x0000000000400270 0x0000000000400270
                 0x0000000000000040 0x0000000000000040  R      0x8
  GNU_STACK      0x0000000000000000 0x0000000000000000 0x0000000000000000
                 0x0000000000000000 0x0000000000000000  RW     0x10
  GNU_RELRO      0x00000000000a2778 0x00000000004a3778 0x00000000004a3778
                 0x0000000000003888 0x0000000000003888  R      0x1

 Section to Segment mapping:
  Segment Sections...
   00     .note.gnu.property .note.gnu.build-id .note.ABI-tag .rela.plt 
   01     .init .plt .text __libc_freeres_fn .fini 
   02     .rodata .stapsdt.base .eh_frame .gcc_except_table 
   03     .tdata .init_array .fini_array .data.rel.ro .got .got.plt .data __libc_subfreeres __libc_IO_vtables __libc_atexit .bss __libc_freeres_ptrs 
   04     .note.gnu.property 
   05     .note.gnu.build-id .note.ABI-tag 
   06     .tdata .tbss 
   07     .note.gnu.property 
   08     
   09     .tdata .init_array .fini_array .data.rel.ro .got 
```

Segment类型只有`LOAD`才是需要被映射的，其他的诸如`NOTE`、`TLS`、`GNU_STACK`都是装载时起辅助作用。

从上面的输出中也可以看出哪些section被合并到了哪个segment，其权限时什么等等信息。

从不同的角度看ELF文件，这被称为视图（View），从Section的角度看ELF文件就是链接视图，从Segment的角度看是执行视图。

和段表一样，程序头表也是一个结构体数组，它的结构体名字叫Elf64_Phdr，成员含义如下：

```c
typedef struct
{
  Elf64_Word	p_type;	     /* Segment type */
  Elf64_Word	p_flags;		/* Segment flags */
  Elf64_Off	p_offset;		/* Segment file offset */
  Elf64_Addr	p_vaddr;		/* Segment virtual address */
  Elf64_Addr	p_paddr;		/* Segment physical address */
  Elf64_Xword	p_filesz;		/* Segment size in file */
  Elf64_Xword	p_memsz;		/* Segment size in memory */
  Elf64_Xword	p_align;		/* Segment alignment */
} Elf64_Phdr;
```

|成员|含义|
|:--:|:--:|
|p_type|Segment的类型|
|p_offset|Segment在文件中的偏移|
|p_vaddr|Segment的第一个字节在进程虚拟地址空间的起始位置|
|p_paddr|Segment的物理装载地址|
|p_filesz|Segment在ELF文件中所占空间的长度|
|p_memsz|Segment在进程虚拟地址空间中所占的长度|
|p_flags|Segment的权限属性|
|p_align|Segment的对齐属性，实际对齐字节是2的p_align次方|

一般来说，`p_paddr`和`p_vaddr`大小应该是一样的。

对于LOAD类型的Segment来说，p_memsz的值应该不能小于p_filesz。p_memsz大于p_filesz，表示该Segment在内存分配的空间大小超过了ELF文件中实际的大小，多余的部分要被填充为0。BSS段会以这个方式和数据段一起合并，因为数据段和BSS的唯一区别在于，数据段从文件中初始化内容，BSS段的内容全部初始化为0。

### 堆和栈
VMA除了被用来映射可执行文件的segment之外还有其他作用。Linux下，可以通过查看/proc以查看进程的虚拟空间分布

```bash
$ ./sleepc.elf &
$ ps
    PID TTY          TIME CMD
   1039 pts/1    00:00:00 fish
   1241 pts/1    00:00:00 sleepc.elf
   1247 pts/1    00:00:00 ps
$ cat /proc/1241/maps 
00400000-00401000 r--p 00000000 00:17 144115                             /home/suoyuan/test/sleepc.elf
00401000-0047b000 r-xp 00001000 00:17 144115                             /home/suoyuan/test/sleepc.elf
0047b000-004a3000 r--p 0007b000 00:17 144115                             /home/suoyuan/test/sleepc.elf
004a3000-004a7000 r--p 000a2000 00:17 144115                             /home/suoyuan/test/sleepc.elf
004a7000-004aa000 rw-p 000a6000 00:17 144115                             /home/suoyuan/test/sleepc.elf
004aa000-004af000 rw-p 00000000 00:00 0 
01cb9000-01cdb000 rw-p 00000000 00:00 0                                  [heap]
7ffc9bf89000-7ffc9bfaa000 rw-p 00000000 00:00 0                          [stack]
7ffc9bfd9000-7ffc9bfdd000 r--p 00000000 00:00 0                          [vvar]
7ffc9bfdd000-7ffc9bfdf000 r-xp 00000000 00:00 0                          [vdso]
ffffffffff600000-ffffffffff601000 --xp 00000000 00:00 0                  [vsyscall]
```

上面的输出中，第一列是VMA的地址范围，第二列是VMA的权限，第三列是偏移（VMA对应的segment再映像文件中的偏移），第四列表示映像文件所在设备的主设备号和次设备号，第五列表示映像文件的节点号，最后一列是映像文件的路径。

其中主次设备号和节点号都为0的表明它们没有被映射到文件中，这种VMA叫做匿名虚拟内存区域。

一个进程基本有如下几种VMA：

- 代码VMA，可读可执行，有映像文件
- 数据VMA，可读可写不可执行，有映像文件
- 堆VMA，可读可写不可执行，无映像文件，匿名，可向上扩展
- 栈VMA，可读可写不可执行，无映像文件，匿名，可向下扩展

![虚拟映射关系](/img/op_power/visual.png)

### 段地址对齐

很多时候段的大小没有不是页的大小的整数倍，存在空间上的浪费。Unix采取段对齐的方案来解决这一问题。

段对齐就是把各个段接壤的部分共享一个物理页面，然后将物理内存分别映射两次，如下图：

![段合并](/img/op_power/segment.png)

由图可知，段合并使得ELF文件再物理内存上被分为了以页大小为单位的若干个块，但并没有改变进程虚拟空间。

### 进程栈初始化

进程刚启动的时候需要知道进程运行的环境（环境变量和运行时参数），常见做法是把操作系统在进程启动前把这些信息提前保存到进程的虚拟空间的栈中。

## Linux内核装载ELF简介

用户层面，bash进程调用`fork()`系统调用创建新进程，新进程调用`execve()`系统调用执行指定的ELF文件，原先的bash进程等待新进程结束，继续等待用户输入命令。

进入`execve()`系统调用之后，Linux内核正式开始装载工作。内核中，`execve()`系统调用的相应入口是`sys_execve()`，`sys_execve()`进行一些参数的检查复制之后调用`do_execve()`，`do_execve()`首先查找被执行的文件，若找到文件则读取文件前128个字节以判断可执行文件的格式（ELF、a.out、Java程序、脚本程序等等），每个可执行文件的开头字节都是特殊的，尤其是前4个字节，被称为magic number。

`do_execve()`读取了前128字节之后调用`search_binary_handle()`搜索匹配合适的可执行文件装载处理过程，`search_binary_handle()`通过判断文件头部magic number确定文件的格式并调用相应的装载处理过程（比如ELF的叫`load_elf_binary()`，a.out的叫`load_aout_binary`，可执行脚本叫`load_script()`）下述步骤是ELF可执行文件的装载：

1. 检查ELF可执行文件格式的有效性，比如magic number、程序头表中segment的数量
2. 寻找动态链接的`.interp`段，设置动态链接器路径
3. 根据ELF可执行文件的程序头表的描述，对ELF文件进行映射
4. 初始化ELF进程环境
5. 将系统调用的返回地址修改成ELF可执行文件的入口点。入口点取决于链接方式，静态是e_entery的地址，动态则是动态链接器

当`load_elf_binary()`执行完毕，返回至`do_execve()`再返回到`sys_execve()`时，上述步骤的第5步已经把系统调用的地址修改。当`sys_execve()`系统调用从内核态返回到用户态时，EIP寄存器直接跳转到ELF程序的入口地址。

## Windows PE的装载简介

PE的段的数量一般很少，其在链接器生成可执行文件的时候将所有的段尽可能的合并，一般只有代码段、数据段、只读数据段和BSS段等为数不多的段。PE文件所有段的起始地址都是页的倍数，段的长度如果不是页的整数倍，映射时向上补齐到页的整数倍，所以它没有ELF段地址对齐等问题。

PE里常见术语RVA（Relative Virtual Address）相对虚拟地址，类似于偏移量的一个概念。每个PE文件装载的时候都有一个装载目标地址，也就是所谓的基地址。PE被设计成可以装载到任何地址，所以基地址并不固定。

装载PE的简单过程：

1. 读取文件的第一个页。这个页包含了DOS头，PE文件头和段表
2. 检查进程地址空间中目标地址是否可用，若不可用就换。可执行文件基本无法遇到被占用的问题，因为往往它是第一个被载入的模块，这是针对DLL文件的装载来说的
3. 使用段表提供的信息，将PE文件所有的段一一映射到地址空间
4. 如果装载地址不是目标地址，进行Rebasing
5. 装载PE文件所需的DLL文件
6. 对PE文件中的所有导入符号进行解析
7. 根据PE头指定的参数，建立初始化堆栈
8. 建立主线程并启动线程

PE文件中，与装载有关的信息都在PE扩展头和段表。以下是其中的几个和装载相关的成员：

|成员|含义|
|:--:|:--|
|Image Base|PE文件的优先装载地址|
|AddressOfEntryPoint|PE装载器准备运行的PE文件的第一个指令的RVA|
|SectionAlignment|内存中段对齐的粒度，默认情况下是系统页的大小|
|FileAlignment|文件中段对齐的粒度，值是2的指数倍|
|MajorSubsystem Versio; MinorSubsystem Version|系统运行所需要的Win32子系统版本|
|SizeOfImage|内存中整个PE映像的尺寸|
|SizeOfHeaders|所有头+节表的大小，也等于文件尺寸-文件中所有节的尺寸，可以用此值作为PE文件第一节的文件偏移量|
|Subsystem|NT用来是被PE文件属于哪个子系统|
|SizeOfCode|代码段的长度|
|SizeOfInitializedData|初始化了的数据段长度|
|SizeOfUninitializedData|未初始化了的数据段长度|
|BaseOfCode|代码段起始RVA|
|BaseOfData|数据段起始RVA|

# 动态链接

## 为什么需要动态链接

静态链接占用内存和磁盘空间，后期模块更新维护困难。

### 动态链接

在程序运行时才进行链接，把链接的过程推迟到运行时进行，这就是动态链接的思想。

假设有A、B两个程序，它们都用了C这个模块。运行A的时候，系统发现了A用到了C，即A依赖于C，那么系统就要加载C，若是A或C还依赖于其他目标文件，系统会把它们全部载入内存，直到依赖关系满足。系统随后开始链接工作，该工作原理和静态链接相似。之后系统控制权交给A的程序入口，程序开始运行。这时运行B，系统只需要加载B，因为内存已经存在C的副本，系统只需要将它俩链接起来即可。

动态链接涉及运行时的链接及多个文件的装载，必须要有操作系统的支持。因为动态链接的情况下，进程的虚拟地址空间的分布比静态链接更为复杂，还有一些存储管理、内存共享、进程线程等机制在动态链接下也有一些微妙的变化。

Linux中，ELF动态链接文件被称为动态共享对象（DSO，Dynamic Shared Objects），简称共享对象，以`.so`为后缀。Windows系统中，动态链接文件被称为动态链接库（Dynamic Linking Liabray）以`.dll`为后缀。

## Linux下动态链接的简单例子
以下面四个代码为例：

```C
/* program1.c */
#include "Lib.h"
int main(){
	foobar(1);
	return 0;
}
/* program2.c */
#include "Lib.h"
int main(){
	foobar(2);
	return 0;
}
/* Lib.c */
#include <stdio.h>
void foobar(int i){
	printf("Printing from lib.so, Program%d\n", i);
}
/* Lib.h */
#ifndef LTB_H
#define LTB_H
void foobar(int i);
#endif
```

使用GCC将Lib.c编译成一个共享目标文件：

```bash
$ gcc -fPIC -shared -o Lib.so Lib.c
```

`-shared`表示生成共享对象。之后分别编译链接Progarm.c和Program2.c


```bash
$ gcc -o program1 program1.c ./Lib.so
$ gcc -o program2 program2.c ./Lib.so
```

![](/img/op_power/dymanic.png)

按照静态链接，program1链接的时候应该有Lib.o参与，但这里是Lib.so。

链接器在将program1.o链接成可执行文件时，这时候链接器需要确定`foobar()`函数的性质，如果它是定义在静态目标模块中的，就走静态链接的流程，如果这是动态共享对象的函数，编译器就会将这个符号的引用标记为一个动态链接的符号不对其进行重定位，这个工作留在装载时进行。

Lib.so保存了完整的符号信息，链接器解析符号时就可以知道`foobar()`是个定义在Lib.so的动态符号，这样链接器可以对`foobar()`进行特殊的处理。

### 动态链接程序运行时地址空间分布

查看program1进程的虚拟地址空间分布，可以在`foobar()`函数中加一个`sleep()`函数

```bash
$ ./program1 &
Printing from lib.so, Program1
$ ps
    PID TTY          TIME CMD
   1045 pts/1    00:00:00 fish
   1702 pts/1    00:00:00 program1
   1708 pts/1    00:00:00 ps
$ cat /proc/1702/maps 
55f59eb69000-55f59eb6a000 r--p 00000000 00:17 144512                     /home/suoyuan/test/program1
55f59eb6a000-55f59eb6b000 r-xp 00001000 00:17 144512                     /home/suoyuan/test/program1
55f59eb6b000-55f59eb6c000 r--p 00002000 00:17 144512                     /home/suoyuan/test/program1
55f59eb6c000-55f59eb6d000 r--p 00002000 00:17 144512                     /home/suoyuan/test/program1
55f59eb6d000-55f59eb6e000 rw-p 00003000 00:17 144512                     /home/suoyuan/test/program1
55f5a006d000-55f5a008e000 rw-p 00000000 00:00 0                          [heap]
7fcce1ff9000-7fcce1ffc000 rw-p 00000000 00:00 0 
7fcce1ffc000-7fcce201e000 r--p 00000000 00:17 4066                       /usr/lib/libc.so.6
7fcce201e000-7fcce2179000 r-xp 00022000 00:17 4066                       /usr/lib/libc.so.6
7fcce2179000-7fcce21d0000 r--p 0017d000 00:17 4066                       /usr/lib/libc.so.6
7fcce21d0000-7fcce21d4000 r--p 001d4000 00:17 4066                       /usr/lib/libc.so.6
7fcce21d4000-7fcce21d6000 rw-p 001d8000 00:17 4066                       /usr/lib/libc.so.6
7fcce21d6000-7fcce21e3000 rw-p 00000000 00:00 0 
7fcce21ff000-7fcce2200000 r--p 00000000 00:17 144511                     /home/suoyuan/test/Lib.so
7fcce2200000-7fcce2201000 r-xp 00001000 00:17 144511                     /home/suoyuan/test/Lib.so
7fcce2201000-7fcce2202000 r--p 00002000 00:17 144511                     /home/suoyuan/test/Lib.so
7fcce2202000-7fcce2203000 r--p 00002000 00:17 144511                     /home/suoyuan/test/Lib.so
7fcce2203000-7fcce2204000 rw-p 00003000 00:17 144511                     /home/suoyuan/test/Lib.so
7fcce2204000-7fcce2206000 rw-p 00000000 00:00 0 
7fcce2206000-7fcce2207000 r--p 00000000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fcce2207000-7fcce222e000 r-xp 00001000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fcce222e000-7fcce2238000 r--p 00028000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fcce2238000-7fcce223a000 r--p 00032000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fcce223a000-7fcce223c000 rw-p 00034000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7ffeccce6000-7ffeccd07000 rw-p 00000000 00:00 0                          [stack]
7ffeccd1a000-7ffeccd1e000 r--p 00000000 00:00 0                          [vvar]
7ffeccd1e000-7ffeccd20000 r-xp 00000000 00:00 0                          [vdso]
ffffffffff600000-ffffffffff601000 --xp 00000000 00:00 0                  [vsyscall]
```

可以发现`Lib.so`和`Program1`一样，它们都被操作系统以同样的方法映射到进程的虚拟地址空间。除了`Lib.so`之外，`Program1`还用到了动态链接形式的C语言你运行库`libc.so.6`。另外还有一个共享对象就是`ld-linux-x86-64.so.2`，这实际上是Linux下的动态链接器。动态链接器和普通共享对象一样被映射到进程的地址空间，在系统开始运行`program1`之前会先将控制权交给动态链接器，由它完成所有的动态链接工作以后再把控制权交给`program1`，然后开始执行。
共享对象的最终装载地址在编译时是不确定的，使用readelf -l查看其segment可以发现其装载地址从0开始。

## 地址无关代码
### 固定装载地址的困扰

为模块手工写死地址十分困难，静态共享库解决了这个问题，但是也仅仅是把分配地址的权利交给了操作系统，仍然是写死的。如今静态共享库已经被淘汰了。为了解决这个问题，共享对象在编译时不能假设自己在进程虚拟地址空间的位置。

### 装载时重定位

把重定位的过程推到装载时执行，对这些地址进行修正。之前静态链接的重定位叫做链接时重定位（Link Time Relocation），现在这个情况是装载时重定位（Load Time Relocation），Windows中这种重定位也叫基址重置（Rebasing）

动态链接模块被装载映射到虚拟空间后，指令部分在多个进程直接共享，由于装载时重定位的方法需要修改指令，所以无法做到同一份指令被多个进程共享。动态链接库中的可修改数据部分对于不同的进程来说有多个副本，所以它们可以采用装载时重定位的方法解决。

### 地址无关代码

虽然装载时重定位解决了绝对地址引用的位，但是失去了动态链接节省内存的优势。

程序模块中共享的指令部分在装载时不需要因为装载地址的改变而改变，所以实现的基本想法就是把指令中那些需要需要修改的部分分离出来，跟数据部分放在一起这样指令部分就可以保持不变，而数据部分可以在每个进程中拥有一个副本。这种方案就是目前被称地址无关代码（PIC，Position-independent Code）的技术。

这里把共享目标模块中的地址引用按照是否跨模块分为内部引用和外部引用，根据引用方式分为指令引用和数据访问，这样就得到了四种情况：

1. 模块内部的函数调用、调转等
2. 模块内部的数据访问，比如定义在模块中的全局变量、静态变量
3. 模块外部的函数调用、调转等
4. 模块外部的数据访问，比如定义在其他模块中的全局变量

**模块内的函数调用、调转**

模块内部的调转、函数调用都可以是相对地址调用，这种指令不需要重定位。

**模块内的数据访问**

使用的相对寻址。ELF获取当前指令地址（PC）的值，再加上一条偏移量即可。

**模块间的数据访问**

这种其他模块的全局变量的地址跟装载地址有关，ELF的做法是在数据段里面建立一个指向这些变量的指针数组，被称为全局偏移表（Global Offset Table），当代码需要引用全局变量时可以通过GOT中相对应的项间接引用。
指令要访问这种变量的时候，程序首先找到GOT，根据GOT中变量对应的项找到变量的目标地址。每个变量都对应一个4字节的地址，链接器在装载模块的时候会查找每个变量所在的地址，然后填充GOT中的各个项，确保每个指针指向的地址正确。由于GOT本身放在数据段，可以再模块装载时被修改，并且每个进程都可以有独立的副本，相互不受影响。

**模块间的函数调用、跳转**

采用上述方法解决，不同的是GOT存放目标函数的地址

`-fpic`和`-fPIC`：

这两个GCC的参数都用来生成地址无关代码，区别在于大写的产生的代码也要大，但是对硬件平台的适应能力强于小写的。

### 共享模块的全局变量

如果一个模块引用了一个定义在共享对象的全局变量的时候，编译器无法根据上下文判断这个全局变量是定义在同一个模块的其他目标文件还是定义在另一个共享模块中，即无法判断是否是跨模块的调用。所以默认把定义在模块内部的全局变量当作跨模块的情况处理，也就是通过GOT实现变量的访问。

当共享模块被装载时，如果某个全局变量在可执行文件中拥有副本，动态链接器就会把GOT中的相对地址指向该副本，如果变量在共享模块中被初始化，动态链接器还需要把初始化值复制到程序主模块中的变量副本，如果该全局变量在程序主模块中没有副本，GOT的相对地址就指向模块内部的该变量副本

## 延迟绑定 (PLT)

为了提升动态链接的性能

#### 基本实现

基本思想就是当函数第一次被用到时才绑定，进行符号查找和重定位的工作，没用到就不绑定。ELF用PLT（Procedure Linkage Table）的方法实现。

调用某个外部模块的函数时，正常方法是通过GOT中相应的项进行间接跳转。PLT为了实现延迟绑定，在这个过程中间增加了一层间接跳转。调用函数并不直接通过GOT跳转，而是通过PLT来进行跳转。所有外部函数在PLT中都有一个相应的项，假设`bar()`函数在PLT中项的地址称为bar@plt，下面是它的实现：

```asm
bar@plt:
jmp *(bar@GOT)
push n
jump find_from_got
```

第一条指令是通过GOT间接跳转，`bar@GOT`表示GOT中保存`bar()`函数相对应的项，如果链接器初始化该项就会跳转去调用函数。为了实现延迟绑定，初始化并没有把地址填进去。第二条指令将n压栈，这个数字是bar符号引用在重定位表`.rel.plt`中的下标，然后跳转到`find_from_got`，其进行一系列工作就会将`bar()`真正的地址填入`bar@GOT`中，再次调用即可跳转。

这种函数一旦被解析完毕，第一条的`jmp`指令就可以调转到真正的`bar()`函数找那个，函数返回时根据堆栈保存的EIP的值直接返回调用者，而不需要执行`bar@plt()`中的代码，这段代码只会在符号未解析的时候调用一次。

上面描述的是基本原理，现实中PLT的实现要稍复杂一些。GOT被拆分成了`.got`和`.got.plt`两个表，`.got`存放全局变量引用的地址，`.got.plt`保存函数引用的地址。实际上的PLT的结构也与上述的PLT有所不同。

## 动态链接相关结构

Linux系统下，动态链接器ld.so就是一个共享对象，操作系统同样可以通过映射的方式将它加载到进程的地址空间中。操作系统完成加载动态链接器后就会将控制权交给动态链接器的入口地址，得到控制权后再执行一系列自身的初始化操作，根据当前的环境参数开始对可执行文件进行动态链接工作，当所有的动态链接工作完成之后，动态链接器会将控制权交给可执行文件的入口地址，程序开始正式执行。

### `.interp`段

`.interp`的内容就是一个字符串，这个字符串就是动态链接器所在的路径。

使用objdump可以查看该路径

```bash
$ objdump -s hello

hello:     file format elf64-x86-64

Contents of section .interp:
 0318 2f6c6962 36342f6c 642d6c69 6e75782d  /lib64/ld-linux-
 0328 7838362d 36342e73 6f2e3200           x86-64.so.2. 

...
```

### `.dynamic`段

这是动态链接ELF中最重要的结构，这个段保存了动态链接器所需要的基本信息，比如以来哪些共享对象、动态链接符号表的位置、动态链接重定位表的位置、共享对象初始化代码的地址等。

```C
typedef struct
{
  Elf64_Sxword	d_tag;			/* Dynamic entry type */
  union
    {
      Elf64_Xword d_val;		     /* Integer value */
      Elf64_Addr d_ptr;			/* Address value */
    } d_un;
} Elf64_Dyn;

```
下面列举几个d_tag常见的值，全部定义在elf.h文件中，就在Elf64_Dyn的定义下面。

|d_tag类型|d_un含义|
|:--:|:--|
|DT_SYMTAB|动态链接符号表的地址，d_ptr表示`.dynsym`的地址|
|DT_STRTAB|动态链接字符串表的地址，d_ptr表示`.dynstr`的地址|
|DT_STRSZ|动态链接字符串表大小，d_val表示大小|
|DT_HASH|动态链接哈希表地址，d_ptr表示`.hash`地址|
|DT_SONAME|本共享文件的`SO-NAME`|
|DT_RPATH|动态链接共享对象搜索路径|
|DT_INIT|初始化代码地址|
|DT_FINT|结束代码地址|
|DT_NEED|依赖的共享目标文件，d_ptr表示所依赖的共享目标文件名|
|DT_REL	DT_RELA|动态链接重定位表地址|
|DT_RELENT   DT_RELAENT|动态重读位表入口数量|

### 动态符号表

完成动态链接的关在在于所依赖的符号和相关文件的信息。静态链接中，有一个专门的段叫符号表`.symtab`，里面保存了所有关于该目标文件的符号的定义和引用。动态链接和静态链接相似，比如前面例子中`program1`依赖于`Lib.so`，引用了里面的`foobar()`函数，对于`program1`来说，`program1`导入了`foobar()`函数，`foobar()`就是它的导入函数，对于`Lib.so`来说，它定义了`foobar()`函数并提供给其他模块使用，`foobar()`就是它的导出函数。

为了表示动态链接这些诶模块之间的导入导出关系，ELF专门有一个叫做动态符号表 (Dynamic Symbol Table)的段用来保存这些信息，这个段的段名通常叫做`.dynsym` 。与`.symtab`不同的是，`dynsym`只保存了动态链接相关的符号，对于模块内部的符号（比如模块的私有变量）。很多时候动态链接的模块通识拥有`.dynsym`和`.symtab`两个表，后者往往保存了所有符号，包括`.dynsym`中的符号。

和`.symtab`类似，动态符号表也需要一些辅助的表，比如用来保存符号名的字符串表。静态链接时叫符号字符串表`.strtab`，这里就是动态符号字符串表`.dynstr` (Synamic String Tab)；为了加快程序运行时查找符号的过程，往往该还有辅助的符号哈希表`.hash`可以用readelf查看ELF文件的动态符号表和哈希表。

```bash
$ readelf -sD Lib.so

Symbol table for image contains 8 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_deregisterT[...]
     2: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND [...]@GLIBC_2.2.5 (2)
     3: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND __gmon_start__
     4: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_registerTMC[...]
     5: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND sleep@GLIBC_2.2.5 (2)
     6: 0000000000000000     0 FUNC    WEAK   DEFAULT  UND [...]@GLIBC_2.2.5 (2)
     7: 0000000000001119    54 FUNC    GLOBAL DEFAULT   12 foobar

```

### 动态链接重定位表

共享对象需要重定位的主要原因是导入符号的存在。动态链接下，无论是可执行文件或共享对象，一旦其依赖于其他共享对象，就会存在对导入符号的引用。编译时这些导入符号的地址未知。静态链接中，这些未知的地址引用在最终链接时被修正。在动态链接中，导入符号的地址在运行时才能确定，所以需要运行时将这些导入符号的引用修正，即需要重定位。
动态链接下，如果一个共享对象不是以PIC模式编译的，毫无疑问需要重定位；如果其是PIC模式编译，事实上也需要重定位。

对于使用PIC技术的可执行文件或共享对象来说，虽然代码段不需要重定位（因为与地址无关），但是数据段还包含了绝对地址的引用，因为代码段中绝对地址相关的部分被分离了出来，变成GOT，而GOT实际上是数据段的一部分。除了GOT外，数据段还可能包含绝对地址引用。

#### 动态链接重定位相关结构

共享对象的重定位与前面静态链接中的目标文件的重定位十分类似，唯一的区别在于目标文件的重定位在静态链接时完成，而共享对象的重定位在装载时完成。在静态链接中，目标文件里面包含有专门用于表示重定位信息的重定位表（`.rel.text`、`.rel.data`）

动态链接的文件中，也有类似的重定位表分别叫做`.rel.dyn`和`.rel.plt`，分别相当于静态链接的`.rel.text`和`.rel.data`。`rel.dyn`实际上时对数据引用的修正，它所修正的位置位于`.got`以及数据段，而`.rel.plt`时对函数引用的修正，它修正的位置位于`.got.plt`。可以使用readelf查看一个动态链接的文件的重定位表

```bash
$ readelf -r Lib.so 

Relocation section '.rela.dyn' at offset 0x498 contains 7 entries:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
000000003df8  000000000008 R_X86_64_RELATIVE                    1110
000000003e00  000000000008 R_X86_64_RELATIVE                    10c0
000000004010  000000000008 R_X86_64_RELATIVE                    4010
000000003fc8  000100000006 R_X86_64_GLOB_DAT 0000000000000000 _ITM_deregisterTM[...] + 0
000000003fd0  000300000006 R_X86_64_GLOB_DAT 0000000000000000 __gmon_start__ + 0
000000003fd8  000400000006 R_X86_64_GLOB_DAT 0000000000000000 _ITM_registerTMCl[...] + 0
000000003fe0  000600000006 R_X86_64_GLOB_DAT 0000000000000000 __cxa_finalize@GLIBC_2.2.5 + 0

Relocation section '.rela.plt' at offset 0x540 contains 2 entries:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
000000004000  000200000007 R_X86_64_JUMP_SLO 0000000000000000 printf@GLIBC_2.2.5 + 0
000000004008  000500000007 R_X86_64_JUMP_SLO 0000000000000000 sleep@GLIBC_2.2.5 + 0

$ readelf -S Lib.so

...
  [20] .got              PROGBITS         0000000000003fc8  00002fc8
       0000000000000020  0000000000000008  WA       0     0     8
  [21] .got.plt          PROGBITS         0000000000003fe8  00002fe8
       0000000000000028  0000000000000008  WA       0     0     8
...
```

之前在静态链接的指令修正介绍了R_X86_64_PC32和R_X86_64_PLT32。这里可以看到一些新的类型：R_X86_64_RELATIVE、R_X86_64_GLOB_DAT和R_X86_64_JUMP_SLO。
这里可以看到`printf()`函数的重定位入口类型是R_X86_64_JUMP_SLO，它的偏移是000000004000，实际上位于`.got.plt`中。`.got.plt`的前三项被系统占据，从第四项开始才是真正存放数据。第四项就是0000000000003fe8 + 3 * 8 = 000000004000，即`printf()`，第五项就是`sleep()`。

动态链接器进行重定位时，它先查找`printf()`的地址，`printf`位于libc.so.6，地址找到后就会将地址填到`.got.plt`中的偏移为000000004000的位置上，从而实现了地址的重定位。

R_X86_64_GLOB_DAT是对`.got`的重定位，它和R_X86_64_JUMP_SLO相似。

R_X86_64_RELATIVE这种类型的重定位实际上是基址重置。共享对象的数据段无法做到地址无关，所以必须在装载时将其重定位。对于下面这样的代码

```c
static int a;
static int* p = &a;
```

在编译时，共享对象的地址从0开始，假设静态变量a相对于起始地址的偏移时A，即p的值时A。一旦共享对象被装载到地址B，那么实际上该变量的地址就要变成A+B，p的值也得跟着变。R_X86_64_RELATIVE类型的重定位入口就是用来重定位p变量这种类型的，变量在装载时需要加上一个装载地址才是正确的结果。

### 动态链接时进程堆栈初始化信息

从动态链接器的角度来看，当操作系统把控制权交给它的时候，它将开始做链接工作，那么它至少需要知道关于可执行文件和本进程的一些信息，比如可执行文件的segment，程序的入口地址等等。这些信息往往由操作系统传递给动态链接器，保存在进程的堆栈里面。堆栈保存动态链接器所需的辅助信息数组，其在elf.h中有定义

```c
typedef struct
{
  uint64_t a_type;		     /* Entry type */
  union
    {
      uint64_t a_val;		/* Integer value */
      /* We use to have pointer elements added here.  We cannot do that,
	 though, since it does not work when using 32-bit definitions
	 on 64-bit platforms and vice versa.  */
    } a_un;
} Elf64_auxv_t;
```

|a_type定义|a_type值|a_val含义|
|:--:|:--:|:--|
|AT_NULL|0|表示辅助信息数组结束|
|AT_EXEFD|2|表示可执行文件的文件文件描述符。动态链接器需要知道关于可执行文件的信息，进程执行可执行文件时，操作系统就会把文件打开，这时就会产生文件文件描述符|
|AT_PHDR|3|可执行文件的程序头表在进程中的地址|
|AT_PHDR|3|动态链接器可以用AT_EXEFD那样通过操作系统读写文件功能访问可执行文件，但操作系统还可以将可执行文件映射到进程的虚拟地址空间中，动态链接器就可以直接访问内存中的文件映像。所以操作系统要么选择上面的方式，要么选择这种方式。选择这种方式，操作系统必须提供后面的AT_PHENT、AT_PHNUM和AT_ENTRY这几个类型|
|AT_PHENT|4|可执行文件头中程序头表中每一个入口的大小|
|AT_PHNUM|5|可执行文件头中程序员表中入口的数量|
|AT_BASE|7|动态链接器本身的装载地址|
|AT_ENTRY|9|可执行文件入口地址|

## 动态链接的步骤和实现
### 动态链接器bootstrap

动态链接器是一个特殊的共享对象，本身不依赖于其他任何共享对象，它所需要的全局和静态变量的重定位工作由自身完成。这需要一段精巧的代码在不用到这些变量的情况下完成对于这些变量的重定位，这种启动代码被称为bootstrap。

动态链接器的入口地址就是bootstrap代码的入口。bootstrap代码首先找到自己的GOT。GOT的第一个入口保存的是`.dynamic`段的偏移地址，由此找到了动态链接器本身的`.dynamic`段。通过`.dynamic`中的信息，bootstrap代码可以获得动态链接器本身的重定位表和符号表等，从而得到动态链接器本身的重定位入口，先将它们全部重定位。从这一步开始，动态链接器代码中才可以使用自己的全局变量和静态变量。

实际上动态链接器在bootstrap代码中，除了不可是哟个全局变量和静态变量之外，甚至不能调用函数。使用PIC模式编译的共享对象，对于模块内部的函数调用也是和模块外部函数调用使用一样的方式——GOT/PLT，所以在其没有重定位之前，bootstrap代码不能使用它们。在Glibc源码下elf/rtld.c中有一段注释：

```
  /* Now life is sane; we can call functions and access global data.
     Set up to use the operating system facilities, and find out from
     the operating system's program loader where to find the program
     header table in core.  Put the rest of _dl_start into a separate
     function, that way the compiler cannot put accesses to the GOT
     before ELF_DYNAMIC_RELOCATE.  */
```

该注释写在bootstrap代码的结尾。

### 装载共享对象

完成bootstrap之后，动态链接器将可执行文件和链接器自身的符号表都合并到一个符号表中，称为全局符号表。之后链接器寻找可执行文件所依赖的共享对象，在`.dynamic`段中，类型DT_NEEDED所指的就是这个。链接器列出可执行文件所需的共享对象，将它们的名字放到一个集合中，链接器从集合中读取一个名字，找到并打开相应的文件，读取相应的ELF文件头和`.dynamic`段，然后将它相应的代码段和数据段映射到进程空间。如果ELF共享对象还依赖于其他共享对象，那么将所依赖的共享对象的名字放到集合中。当然链接器可以有不同的装载顺序。

当一个新的共享对象被装载进来时，它的符号表会被合并到全局符号表中。

**符号的优先级**

```c
//a1.c:
#include<stdio.h>
void a(){
     printf("a1.c\n");
}

//a2.c:
#include <stdio.h>
void a(){
     printf("a2.c \n");
}

//b1.c:
void a();
void b1(){
     a():
}

//b2.c:
void a();
void b2(){
     a();
}
```

这里指定b1.so依赖于a1.so，b2.so依赖于a2.so。

```bash
$ gcc -fPIC -shared a1.c -o a1.so
$ gcc -fPIC -shared a2.c -o a2.so
$ gcc -fPIC -shared b1.c a1.so -o b1.so
$ gcc -fPIC -shared b2.c a2.so -o b2.so
```

这时候如果程序使用了`b1()`函数和`b2()`函数

```c
#include <stdio.h>

void b1();
void b2();

int main(){
        b1();
        b2();
        return 0;
}
```

```bash
$ gcc main.c b1.so b2.so -o main -Wl,-rpath=$(pwd),--disable-new-dtags
$ ./main
a1.c
a1.c

```

这里的-Wl用于将后续逗号隔开的选项传给ld链接器

rpath指定链接器在本目录寻找共享对象，否则链接器会报出a1.so和b2.so不存在的错误

--disable-new-dtags，表示启用RPATH而不是RUNPATH，RUNPATH无法在装载a1.so和a2.so的时候也搜索这个路径，通过strace可以验证。当然用户可以手动修改环境变量，那么连RPATH也不用写了。

[How to set RPATH and RUNPATH with GCC/LD?](https://stackoverflow.com/questions/52018092/how-to-set-rpath-and-runpath-with-gcc-ld)


```bash
export LD_LIBRARY_PATH=.; 
```

在main.c中加个`sleep()`函数以查看main程序的进程地址空间

```bash
$ cat /proc/4329/maps 
562581f38000-562581f39000 r--p 00000000 00:17 172029                     /home/suoyuan/test/main
562581f39000-562581f3a000 r-xp 00001000 00:17 172029                     /home/suoyuan/test/main
562581f3a000-562581f3b000 r--p 00002000 00:17 172029                     /home/suoyuan/test/main
562581f3b000-562581f3c000 r--p 00002000 00:17 172029                     /home/suoyuan/test/main
562581f3c000-562581f3d000 rw-p 00003000 00:17 172029                     /home/suoyuan/test/main
562581fab000-562581fcc000 rw-p 00000000 00:00 0                          [heap]
7fd22c779000-7fd22c77b000 rw-p 00000000 00:00 0 
7fd22c77b000-7fd22c77c000 r--p 00000000 00:17 171921                     /home/suoyuan/test/a2.so
7fd22c77c000-7fd22c77d000 r-xp 00001000 00:17 171921                     /home/suoyuan/test/a2.so
7fd22c77d000-7fd22c77e000 r--p 00002000 00:17 171921                     /home/suoyuan/test/a2.so
7fd22c77e000-7fd22c77f000 r--p 00002000 00:17 171921                     /home/suoyuan/test/a2.so
7fd22c77f000-7fd22c780000 rw-p 00003000 00:17 171921                     /home/suoyuan/test/a2.so
7fd22c780000-7fd22c781000 r--p 00000000 00:17 171920                     /home/suoyuan/test/a1.so
7fd22c781000-7fd22c782000 r-xp 00001000 00:17 171920                     /home/suoyuan/test/a1.so
7fd22c782000-7fd22c783000 r--p 00002000 00:17 171920                     /home/suoyuan/test/a1.so
7fd22c783000-7fd22c784000 r--p 00002000 00:17 171920                     /home/suoyuan/test/a1.so
7fd22c784000-7fd22c785000 rw-p 00003000 00:17 171920                     /home/suoyuan/test/a1.so
7fd22c785000-7fd22c7a7000 r--p 00000000 00:17 4066                       /usr/lib/libc.so.6
7fd22c7a7000-7fd22c902000 r-xp 00022000 00:17 4066                       /usr/lib/libc.so.6
7fd22c902000-7fd22c959000 r--p 0017d000 00:17 4066                       /usr/lib/libc.so.6
7fd22c959000-7fd22c95d000 r--p 001d4000 00:17 4066                       /usr/lib/libc.so.6
7fd22c95d000-7fd22c95f000 rw-p 001d8000 00:17 4066                       /usr/lib/libc.so.6
7fd22c95f000-7fd22c96c000 rw-p 00000000 00:00 0 
7fd22c988000-7fd22c989000 r--p 00000000 00:17 171923                     /home/suoyuan/test/b2.so
7fd22c989000-7fd22c98a000 r-xp 00001000 00:17 171923                     /home/suoyuan/test/b2.so
7fd22c98a000-7fd22c98b000 r--p 00002000 00:17 171923                     /home/suoyuan/test/b2.so
7fd22c98b000-7fd22c98c000 r--p 00002000 00:17 171923                     /home/suoyuan/test/b2.so
7fd22c98c000-7fd22c98d000 rw-p 00003000 00:17 171923                     /home/suoyuan/test/b2.so
7fd22c98d000-7fd22c98e000 r--p 00000000 00:17 171922                     /home/suoyuan/test/b1.so
7fd22c98e000-7fd22c98f000 r-xp 00001000 00:17 171922                     /home/suoyuan/test/b1.so
7fd22c98f000-7fd22c990000 r--p 00002000 00:17 171922                     /home/suoyuan/test/b1.so
7fd22c990000-7fd22c991000 r--p 00002000 00:17 171922                     /home/suoyuan/test/b1.so
7fd22c991000-7fd22c992000 rw-p 00003000 00:17 171922                     /home/suoyuan/test/b1.so
7fd22c992000-7fd22c994000 rw-p 00000000 00:00 0 
7fd22c994000-7fd22c995000 r--p 00000000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fd22c995000-7fd22c9bc000 r-xp 00001000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fd22c9bc000-7fd22c9c6000 r--p 00028000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fd22c9c6000-7fd22c9c8000 r--p 00032000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fd22c9c8000-7fd22c9ca000 rw-p 00034000 00:17 4057                       /usr/lib/ld-linux-x86-64.so.2
7fff60507000-7fff60528000 rw-p 00000000 00:00 0                          [stack]
7fff605d3000-7fff605d7000 r--p 00000000 00:00 0                          [vvar]
7fff605d7000-7fff605d9000 r-xp 00000000 00:00 0                          [vdso]
ffffffffff600000-ffffffffff601000 --xp 00000000 00:00 0              
```

可以看到虽然这四个共享对象都被装载进来了，但最后得以执行的都是a1.so中的`a()`函数。这种符号覆盖的现象，被称为全局符号介入 (Global Symbol Interpose)
Linux的链接器定义了一个规则用于处理该问题，即不添加一个已有的符号到全局符号表中。可以通过strace查看其装载顺序可以发现，a2.so是最后装载的，所以最后打印两个都是a1.c。

```bash
$ strace ./main 2>&1 | grep openat
```

**全局符号介入和地址无关代码**

之前介绍过在地址无关代码中提到模块内的函数调用直接相对地址。由于存在全局符合介入的问题，模块内a函数对b函数的调用不能那么简单地处理。一旦b函数被其他模块的同名函数覆盖，a函数采用相对地址的话就需要重定位。所以对b函数的调用来说，编译器会当作跨模块的来处理。不过我现在有一个小猜测就是GCC能够优化这个玩意
为了提高效率，可以认为的将其变成私有的函数，也就是用`static`关键字。

### 重定位和初始化

完成上述步骤，链接器开始重新遍历可执行文件和每个共享对象的重定位表，将它们的GOT/PLT中每个需要修正的位置进行修正。

重定位后，如果某个共享对象存在`.init`段，那么动态链接器就会执行`.init`段中的代码。可执行文件也有`.init`段不由动态链接器执行，它有程序初始化部分代码负责执行。
此时，动态链接器将进程的控制权转交给程序的入口并开始执行。

## 显示运行时链接

支持动态链接的系统往往还支持另一种模块加载方式——显示运行时加载 (Explicit Run-time Linking)，又叫运行时加载。一般的共享对象不需要进行任何修改就可以搞这种方式，这种共享对象往往叫做动态装载库。

之前的共享对象的装载和链接都是由动态链接器在程序启动之前完成，而动态链接器的装载则是通过一系列动态链接器提供的API来完成。这里具体指四个函数：`dlopen()`、`dlsym()`、`dlerror()`和`dlclose()`。

下面关于这四个函数的叙述在man页中基本都能找到

```bash
man 3 {dlopen, dlsym, dlerror, dlclose}
```

### dlopen()

`dlopen()`函数用于打开一个动态库，并将其加载到进程的地址空间，完成初始化。

```c
void *dlopen(const char *filename, int flags);
```

第一个参数时被加载动态库的路径，如果这个路径是绝对路径就直接开，如果是相对路径，`dlopen()`会尝试一定的顺序去查找该文件。

1. 查找LD_LIBRARY_PATH环境变量指定的目录
2. 查找/etc/ld.so.cache里面指定的路径
3. /lib、/usr/lib

如果filename的值为0，`dlopen()`将返回全局符号表的句柄。

第二个参数flag表示函数符号的解析方式，RTLD_LAZY表示延迟绑定，RTLD_NOW表示当模块被加载完时即完成所有的函数绑定工作，二者选其一。还有一些常量可以和前面两个搭配使用，像RTLD_GLOBAL表示将加载的模块的全局变量合并到进程的全局符号表中。

`dlopen()`的返回值时被加载模块的句柄，用于后续操作。如果加载失败则返回NULL，已加载返回的还是原先的句柄。

### dlsym()

`dlsym()`函数是运行时装载的核心部分，用来找到所需的符号

```c
void *dlsym(void *restrict handle, const char *restrict symbol);
```

第一个参数是`dlopen()`返回的句柄，第二个参数是要查找的符号的名字（一个以\0结尾的C字符串）。如果`dlsym()`找到了相应的符号就会返回该符号的值，没有就是NULL。
如果符号是函数或者变量，返回的是地址；如果符号是常量，返回的是值。

为了防止常量值就是NULL或者0，还应该使用`dlerror()`函数判一手，如果该函数返回NULL就是符号找到了，没找到这个函数会返回相应的错误信息。

### dlerror()

每次调用`dlopen()`、`dlsym()`或`dlclose()`之后，都可以通过调用`dlerror()`来判断上一次调用是否成功。
成功返回NULL，不成功返回相应的错误信息。

### dlclose()

`dlclose()`的作用和`dlopen()`相反，它的作用是将一个已加载的模块卸载。系统维持一个加载引用计数器，每次使用`dlopen()`加载某模块时，相应的计数器加一。

### 运行时装载的演示程序

这里希望实现一个执行共享对象里的任意一个函数的程序，该程序的用法如下：

```bash
$ ./runso <shared object> <function> [arg1] [arg2] ... <return type>
```

因为x64函数调用约定的问题，我并没有想出一个比书中代码实现的更简单的办法，所以照抄了，GCC编译的时候带上-m32指定编译成32位的程序就行。实验用的共享对象也得搞成32位的。

```c
#include <stdio.h>
#include <stdlib.h>
#include <dlfcn.h>

#define SETUP_STACK                            \
i = 2;                                         \
while (++i < argc - 1)                         \
{                                              \
    switch (argv[i][0])                        \
    {                                          \
    case 'i':                                  \
        asm volatile(                          \
            "push %0" ::                       \
            "r"(atoi(&argv[i][1])));           \
        esp += 4;                              \
        break;                                 \
    case 'd':                                  \
        atoi(&argv[i][1]);                     \
        asm volatile(                          \
            "subl $8, %esp\n"                  \
            "fstpl (%esp)");                   \
        esp += 8;                              \
        break;                                 \
    case 's':                                  \
        asm volatile(                          \
            "push %0" ::                       \
            "r"(&argv[i][1]));                 \
        esp += 4;                              \
        break;                                 \
    default:                                   \
        printf("error argument type\n");       \
        goto exit_runso;                       \
    }                                          \
}                                              \

#define RESTORE_STACK                            \
    asm volatile("add %0, %%esp\n" :: "r"(esp)); \

int main(int argc, char* argv[]){
    void* handle;
    char* error;
    int i;
    int esp = 0;
    void* func;

    handle = dlopen(argv[1], RTLD_NOW);
    if(handle == 0){
        printf("Can not find library: %s\n", argv[1]);
        return -1;
    }
    func = dlsym(handle, argv[2]);
    if((error = dlerror()) != NULL){
        printf("Find symbol %s error:%s\n", argv[2], error);
        goto exit_runso;
    }

    switch (argv[argc-1][0])
    {
    case 'i':
        int (*func_int)() = func;
        SETUP_STACK;
        int rati = func_int();
        RESTORE_STACK;
        printf("ret = %d\n", rati);
        break;
    case 'd':
        double (*func_double)() = func;
        SETUP_STACK;
        double ratd = func_double();
        RESTORE_STACK;
        printf("ret = %f\n", ratd);
        break;
    case 's':
        char* (*func_char)() = func;
        SETUP_STACK;
        char* ratc = func_char();
        RESTORE_STACK;
        printf("ret = %s\n", ratc);
        break;
    case 'v':
        void (*func_void)() = func;
        SETUP_STACK;
        func_void();
        printf("ret is anywhere \n");
        break;
    default:
        break;
    }
    exit_runso:
    dlclose(handle);
}
```

下面是本次实验中共享对象的源码

```c
#include <stdio.h>
int int_f(int a){
    printf("You start me !!!\n");
    printf ("My type is int \n");
    return a;
}
char* char_f(char* s){
    printf("You start me !!!\n");
    printf("My type is char*\n");
    return s;
}
void void_f(){
    printf("You start me !!!\n");
    printf("My type is void\n");
}
```

```bash
$ gcc -m32 runso.c -o runso
$ gcc -shared -m32 hello.c -o hello.so
$ ./runso ./hello.so char_f sssdwd s
You start me !!!
My type is char*
ret = ssdwd
$ ./runso ./hello.so int_f i123 i
You start me !!!
My type is int
ret = 123
```

# Linux共享库组织

从文件结构的角度来讲，共享库 (Shared Library)和共享对象没什么区别，Linux下的共享库就是普通的ELF共享对象。由于共享对象可以被多个程序共享，所以它就成为了库的存在形式，久而久之这俩概念已经模糊了，广义上可以堪称一个概念。

## 共享库版本
共享库的文件命名规则如下

```
libname.so.x.y.z
```

xyz从左到右，主版本号、次版本号、发布版本号。

- 主版本号表示库的重大升级，不同主版本号的库之间不兼容。
- 次版本号表示库的增量升级，即增加一些新的接口符号，且原有的不变。
- 发布版本号表示对库的一些错误的修正和性能的改进，不增加或修改新的接口。

### SO-NAME

SO-NAME是共享库文件名去掉次版本号和发布版本号的结果，比如libfoo.so.3.5.9的SO-NAME就是libfoo.so.3。

系统会为这个文件创建一个软连接指向以SO-NAME命名的文件，这样在大方向不变的情况下可以保证次版本号和发布版本号最新。

程序的`.dynamic`中也无需把依赖的文件名写的太死，限制了自己。

## 符号版本
### 基于符号的版本机制

Glibc从2.1开始支持基于符号的版本机制 (Symbol Versioning)。该机制的基本思想就是让每个导出和导入符号都有一个相关联的版本号，实际做法类似于符号修饰。

与以往简单地重命名共享库版本号不同，假设把libfoo.so.1.2升级到1.3时，保持libfoo.so.1这个SO-NAME，给1.3这个新版打一个标记，比如VERS1.3。

## 共享库系统路径

FHS (File Hierarchy Standard)标准规定了Unix和类Unix系统的文件存放布局（系统文件该如何存放，各个目录的结构、组织和作用）。FHS规定，一个系统主要3个存放共享库的位置

- /lib，这个位置存放系统最关键和基础的共享库，这些库主要为系统启动以及/bin和/sbin目录下的程序服务。
- /usr/lib，这个目录存放非系统运行时需要的关键性的共享库。
- /usr/local/lib，存放第三方应用程序的库

## 共享库查找过程

Linux系统都有一个叫做ldconfig的程序，这个程序的作用时为共享库目录下的各个共享库创建、删除或更新相应的SO-NAME。它还会将SO-NAME收集放到/etc/ld.so.cache文件中，建立SO-NAME缓存。动态链接器查找共享库时可以直接从这个特殊设计过的文件中查找，会加快共享库的查找过程。

其他的man页中有

```bash
man 1 ld
```

```
The linker uses the following search paths to locate required shared libraries:

           1.  Any directories specified by -rpath-link options.

           2.  Any directories specified by -rpath options.  The difference between -rpath and -rpath-link is that directories specified by -rpath options are included in the executable and used at runtime, whereas the
               -rpath-link option is only effective at link time. Searching -rpath in this way is only supported by native linkers and cross linkers which have been configured with the --with-sysroot option.

           3.  On an ELF system, for native linkers, if the -rpath and -rpath-link options were not used, search the contents of the environment variable "LD_RUN_PATH".

           4.  On SunOS, if the -rpath option was not used, search any directories specified using -L options.

           5.  For a native linker, search the contents of the environment variable "LD_LIBRARY_PATH".

           6.  For a native ELF linker, the directories in "DT_RUNPATH" or "DT_RPATH" of a shared library are searched for shared libraries needed by it. The "DT_RPATH" entries are ignored if "DT_RUNPATH" entries exist.

           7.  For a linker for a Linux system, if the file /etc/ld.so.conf exists, the list of directories found in that file.  Note: the path to this file is prefixed with the "sysroot" value, if that is defined, and then
               any "prefix" string if the linker was configured with the --prefix=<path> option.

           8.  For a native linker on a FreeBSD system, any directories specified by the "_PATH_ELF_HINTS" macro defined in the elf-hints.h header file.

           9.  Any directories specified by a "SEARCH_DIR" command in a linker script given on the command line, including scripts specified by -T (but not -dT).

           10. The default directories, normally /lib and /usr/lib.

           11. Any directories specified by a plugin LDPT_SET_EXTRA_LIBRARY_PATH.

           12. Any directories specified by a "SEARCH_DIR" command in a default linker script.

```

## 共享库的创建和安装
### 共享库的创建

过程和创建共享对象差不多。

```bash
$ gcc -shared -Wl,-soname,<name> -o <library_name> <source_files>
```

不用-soname的话，共享库默认没有SO-NAME

### 清除符号信息

正常编译出来的会有对于最终发布版本无用的符号信息，去掉也可。

### 共享库的安装

移动到指定目录，ldconfig一下即可。

### 共享库构造和析构函数

GCC提供了一种共享库的构造和析构函数，在函数声明加上`__attribute__((constructor))`就是构造函数，在`main()`函数执行前执行，`__attribute__((destructor))`表明该函数在`main()`函数执行完毕后执行，或者说调用`exit()`时执行。

如果有多个构造函数，`constructor(2)`这样可以指定其优先级。对于构造函数来说数字越小优先级越大，对于析构函数来说正好相反。

# Windows下的动态链接
## DLL简介

DLL (Dynamic-Link Library)，相当于Linux下的共享对象。Windows系统中采用了大量的DLL，甚至Windows内核结构很大程度上也依赖于DLL机制。DLL和EXE文件都是PE格式的，区别在于PE文件头的头部中有个符号位表示其到底是啥。而DLL文件也未必得是`.dll`为后缀，`.ocx`、`.CPL`也可以。

Windows平台有大量的大型软件通过升级DLL的形式进行自我完善，微软经常将这些升级补丁积累到一定程度形成一个软件更新包。

ELF的动态链接可以实现运行时加载，Windows也有类似的技术。

在ELF中，共享库中所有的全局函数和变量在默认情况下都可以被其他模块使用，也就是说ELF默认导出所有的全局符号。DLL中需要显示地告诉编译器要导出某个符号，否则默认都不导出。

Microsoft Visual C++ (MSVC)编译器提供了一系列C/C++的扩展来指定符号的导入和导出，对于一些支持Windows平台的的编译器也都支持这种扩展。可以使用`__declspec`关键字修饰某个函数或变量，比如使用`__declspec(dllexport)`表示该符号是从本DLL导出的符号，`__declspec(dllimport)`表示该符号是从别的DLL导入的符号。

除了使用`__declspec`关键字之外，还可以使用`.def`文件声明导入导出符号。这个文件类似于`.lds`文件，可以当作link链接器的输入文件，用来控制链接器过程。`.def`文件中IMPORT和EXPORT可以用来声明导入导出符号。

### 创建DLL

```c
__declspec(dllexport) double add(double a, double b)
{
    return a + b;
}

__declspec(dllexport) double sub(double a, double b)
{
    return a - b;
}

__declspec(dllexport) double mul(double a, double b)
{
    return a * b;
}
```

使用/LDd参数表示生成Debug版的DLL，/LD生成Release版的

```shell
$ CL /LDd .\math.c
```

这条命令生成了math.dll、math.obj、math.exp和math.lib

```shell
$ dumpbin /EXPORTS .\math.dll
Microsoft (R) COFF/PE Dumper Version 14.34.31937.0
Copyright (C) Microsoft Corporation.  All rights reserved.


Dump of file .\math.dll

File Type: DLL

  Section contains the following exports for math.dll

    00000000 characteristics
    FFFFFFFF time date stamp
        0.00 version
           1 ordinal base
           3 number of functions
           3 number of names

    ordinal hint RVA      name

          1    0 00001000 add
          2    1 00001040 mul
          3    2 00001020 sub

  Summary

        3000 .data
        3000 .pdata
       13000 .rdata
        1000 .reloc
       3C000 .text
        1000 _RDATA
```

可以看到这个DLL有3个导出函数以及它们的RVA

### 使用DLL

对于其他DLL导入的符号，需要使用`__declspec(dllimport)`显示地声明某个符号为导入符号。

```c
#include <stdio.h>

__declspec(dllimport) double sub(double a, double b);

int main(){
    double result = sub(3.0, 2.0);
    printf("Result = %f\n", result);
    return 0;
}
```

```shell
$ CL /c .\main.c
$ link .\main.obj .\math.lib
```

math.lib不真正包含math.c的代码和数据，它用来描述math.dll的导出符号，包含了main.obj链接math.dll所需要的导入符号和一部分“桩”代码。像math.lib这样的文件被称为导入库 (Import Library)

![MSVC静态库链接](/img/op_power/MSVCstaic.png)

### 使用模块定义文件

将前面例子中math.c的`__declspec`扩展去掉，创建一个math.def文件，内容如下

```
LIBRARY math
EXPORTS
add
sub
mul
```

```shell
CL .\math.c /LD /DEF .\math.def
```

### DLL显示运行时链接

Windows提供了3个API：

- LoadLibrary （或LoadLibraryEx)，这个函数用来装载DLL到进程的地址空间
- GetProcAddress，用来查找某个符号的地址
- FreeLibrary，卸载某个已加载的模块

## 符号导出导入表
### 导出表

Windows PE中所有导出的符号被集中存放在了被称为导出表的结构中。
PE文件头中有一个叫做DataDirectory的结构数组，数组共有16个元素，每个元素保存一个地址和一个长度。它第一个元素就是导出表的结构的地址和长度。导出表是一个IMAGE_EXPORT_DIRECTORY的结构体，它被定义在winnt.h中

```c
typedef struct _IMAGE_EXPORT_DIRECTORY {
    DWORD   Characteristics;
    DWORD   TimeDateStamp;
    WORD    MajorVersion;
    WORD    MinorVersion;
    DWORD   Name;
    DWORD   Base;
    DWORD   NumberOfFunctions;
    DWORD   NumberOfNames;
    DWORD   AddressOfFunctions;     // RVA from base of image
    DWORD   AddressOfNames;         // RVA from base of image
    DWORD   AddressOfNameOrdinals;  // RVA from base of image
} IMAGE_EXPORT_DIRECTORY, *PIMAGE_EXPORT_DIRECTORY;
```

导出表结构中，最后三个成员指向3个数组。这三个数组是导出表中最重要的结构——导出地址表 (EAT, Export Address Table)、符号名表 (Name Table)和名字序列对应表 (Name-Ordinal Table)

**序号 (Ordinal)**

早期内存很小的时候，内存中存放太多函数名太奢侈了，当时DLL的函数导出的主要方式是序号。一个导出符号的需要就是函数在EAT中的地址下标加上一个BASE值（IMAGE_EXPORT_DIRECTORY中的Base，默认为1）。

如果一个模块导入了某个函数，它在导入表中不保存函数名，而是保存函数的序号。序号-Base值就可以得到下标，然后就可以在EAT中找到RVA了。

但是在DLL中加减函数的话，序号就会发生变化，导致依赖它的程序出现一些问题。

现在的DLL不采用序号作为导入导出的手段，但是为了向后兼容，序号导出方式仍然被保留。

---

对于链接器来说，它在链接输出DLL时要知晓哪些函数和变量时要被导出的，除了之前介绍的方式，link链接器提供了/EXPORT参数用来指定导出符号

### EXP文件

链接器创建DLL采用两边扫描过程

1. 遍历所有的目标文件并收集所有的导出符号信息并且创建DLL的导出表。链接器将这个导出表放在一个临时的目标文件的`.edata`段中，这个目标文件就是EXP文件。
2. 链接器将EXP文件当作普通目标文件和其他输入的目标文件链接在一起并且输出DLL。这时EXP的`.edata`段被传输到DLL文件中称为导出表。

EXP自然也是COFF/PE文件。

### 导出重定向

DLL支持导出重定向 (Export Forwarding)机制。该机制就是将某个导出符号重定向到另一个DLL。调用a.dll的foo()函数相当于调用b.dll的bar()函数。
如果要重定向某个函数，可以使用模块定义文件 (DEF文件)

```
EXPORTS

<function name> = <DLL name>.<function name>
```

正常情况下，导入表的地址数组包含的是函数的RVA，但如果这个RVA指向的位置位于导出表中，那么表示这个符号被重定向了。被重定向了的符号的RVA不表示该函数的地址，而是指向一个ASCII字符串，这个字符串在导出表中，它是赴澳重定向后的DLL文件名和符号名，也就是等号右边这个东西，比如NTDLL.func

### 导入表

当某个PE文件被加载时，Windows加载器的其中一个任务就是将所有需要导入的函数地址确定并且将导入表中的元素调整到正确的地址，以实现动态链接的过程。

```shell
$  dumpbin /IMPORTS math.dll
Microsoft (R) COFF/PE Dumper Version 14.34.31937.0
Copyright (C) Microsoft Corporation.  All rights reserved.


Dump of file math.dll

File Type: DLL

  Section contains the following imports:

    KERNEL32.dll
             18000F000 Import Address Table
             180017D08 Import Name Table
                     0 time date stamp
                     0 Index of first forwarder reference

                         464 QueryPerformanceCounter
                         22B GetCurrentProcessId
                         22F GetCurrentThreadId
                         301 GetSystemTimeAsFileTime
                         381 InitializeSListHead
                         4E9 RtlCaptureContext
                         4F1 RtlLookupFunctionEntry
                         4F8 RtlVirtualUnwind
                         397 IsDebuggerPresent
                         5D8 UnhandledExceptionFilter
                         597 SetUnhandledExceptionFilter
                         2E8 GetStartupInfoW
                         39E IsProcessorFeaturePresent
                         28C GetModuleHandleW
                          8E CloseHandle
                         4F7 RtlUnwindEx
                         385 InterlockedFlushSList
                         274 GetLastError
                         557 SetLastError
                         141 EnterCriticalSection
                         3D6 LeaveCriticalSection
                         11B DeleteCriticalSection
                         37D InitializeCriticalSectionAndSpinCount
                         5C8 TlsAlloc
                         5CA TlsGetValue
                         5CB TlsSetValue
                         5C9 TlsFree
                         1BD FreeLibrary
                         2C4 GetProcAddress
                         3DC LoadLibraryExW
                         13D EncodePointer

...
```

可以看到math.dll从KERNEL32.dll导入了很多的函数，这是因为构建Windows DLL时，还链接了会用到KERNEL32.dll的支持DLL运行的基本运行库。

PE文件中，导入表是一个IMAGE_IMPORT_DESCRIPTOR的结构体数组，每一个IMAGE_IMPORT_DESCRIPTOR结构对应一个将被导入的DLL

```c
typedef struct _IMAGE_IMPORT_DESCRIPTOR {
    union {
        DWORD   Characteristics;            // 0 for terminating null import descriptor
        DWORD   OriginalFirstThunk;         // RVA to original unbound IAT (PIMAGE_THUNK_DATA)
    } DUMMYUNIONNAME;
    DWORD   TimeDateStamp;                  // 0 if not bound,
                                            // -1 if bound, and real date\time stamp
                                            //     in IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT (new BIND)
                                            // O.W. date/time stamp of DLL bound to (Old BIND)

    DWORD   ForwarderChain;                 // -1 if no forwarders
    DWORD   Name;
    DWORD   FirstThunk;                     // RVA to IAT (if bound this IAT has actual addresses)
} IMAGE_IMPORT_DESCRIPTOR;
typedef IMAGE_IMPORT_DESCRIPTOR UNALIGNED *PIMAGE_IMPORT_DESCRIPTOR;
```

结构体中的FirstThunk指向一个导入地址数组 (Import Address Table)，IAT是导入表中最重要的结构，IAT中每个元素对应一个被导入的符号，元素的值在不同的情况下有不同的含义。在动态链接器刚完成映射还没有开始重定位和符号解析时，IAT中的元素表示相对于的导入符号的符号名或序号；当Windows的动态链接器完成该模块的链接时，元素值会被动态链接器改写成该符号的真正地址。通过元素的最高位来判断导入地址数组的元素中包含的是符号名还是序号。

在IMAGE_IMPORT_DESCRIPTOR结构中，还有一个指针OriginalFirstThunk指向一个叫做导入名称表 (INT, Import Name Table)的数组。

Windows的动态链接器在装载模块的时候会改写导入表的IAT。虽然PE的导入表是只读的，但因为Windows的动态链接器是Windows内核的一部分，所以可以在装载时把导入表所在的页面改成可读写，IAT被写完了再改回来。

**延迟载入**

当链接一个支持延迟载入的DLL时，链接器会产生和普通DLL类似但却会被操作系统忽略的数据。当延迟载入的API第一次被调用时，由链接器添加的特殊的桩代码会启动，这个代码负责对DLL的装载工作。桩代码通过调用GetProcAddress来找到被调用API的地址。MSVC还做了额外的优化，使得对该DLL的调用速度和普通方式载入的DLL的速度差不多。

### 导入函数的调用

如果PE的模块需要调用一个导入函数，仿照ELF GOT机制的一个办法就是一个间接跳转指令

```asm
CALL DWORD PTR [0x0040D11C]
```

这条指令的含义是间接调用0x0040D11C地址中保存的地址，即从0x0040D11C开始取4个字节作为目标地址（DWORD PTR 表示4个字节的操作前缀），然后调用该目标地址。0x0040D11C这个地址刚好是IAT中的某一项，即需要调用的外部函数在IAT中所对应的元素，比如在之前的main.exe中就需要调用math.dll的`sub()`函数，那么0x0040D11C对应`sub()`导入函数在main.exe的IAT中的位置。该过程和GOT调转类似。

ELF通过在GOT调转前加了一层计算目标函数地址在GOT中的位置实现了地址无关，PE并没有，由此可见PE并不是地址无关。PE通过重定基地址的方法解决了装载时模块在进程空间中的地址冲突问题。

在`__declspec`关键字引入之前，微软提供了ing一种方法分辨一个函数是否是导入还是内部的。这种情况下，编译器同意产生直接调用的指令。链接器在连接时会将导入函数的目标地址导向一小段桩代码，由这这个代码将控制权交给IAT中真正的地址，实现如下

```asm
CALL 0x0040100C
...
0x0040100C:
CALL DWORD PTR [0x0040D11C]
```

链接器一般不产生指令，这段指令来自产生DLL文件伴随的Lib文件，即导入库。

编译器产生导入库时，同一个导出函数会产生两个符号的定义。对于函数`foo()`来说，它在导入库中有两个符号，一个是foo，另一个是__imp__foo。前者指向foo函数的桩代码，后者指向foo函数在IAT中的位置。使用`__declspec(import)`关键字声明`foo()`导入函数时，编译器在链接时会在导入函数前加上前缀__imp__，和导入库的__imp__foo能够正常链接；如果不使用这个关键字，编译器会产生一个正常的foo符号引用，以便和导入库中的foo符号相链接。

现在MSVC编译器支持以上两种导入方式，但仅仅是不用写`__declspec(dllimport)`了而已，不写`__declspec(dllexport)`根本不产生导入库，好鸡儿鸡肋的样子。
到了Microsoft的文档，直接没说这个

[从 DLL 导出](https://learn.microsoft.com/zh-cn/cpp/build/exporting-from-a-dll?view=msvc-170)


> 可使用两种方法从 DLL 导出函数：
> 创建模块定义 (.def) 文件，然后在生成 DLL 时使用 .def 文件。 如果希望按序号而不是按名称从 DLL 中导出函数，请使用此方法。
> 在函数定义中使用关键字 __declspec(dllexport)。

## DLL优化

DLL的代码段和数据段本身并不是和地址无关的，它默认需要被装载到ImageBase指定的目标地址中。如果目标地址被占用就需要装载到其他地址，便会引起整个DLL的Rebase。对于有大量DLL的程序来说，频繁的Rebase会造成程序的启动速度减慢。

动态链接过程中，导入函数的符号在运行时需要被逐个解析。解析过程中，免不了会涉及到符号字符串的查找。即使用了好的算法，量一大，这个过程也是非常耗时的。

这两个愿意可能会导致应用程序的速度非常慢，因为系统需要在启动程序时进行大量的符号解析和Rebase。

### 重定基地址

Windows的PE采取一种和ELF不同的办法——装载时重定位。DLL模块装载时，如果目标地址被占用，那么操作系统就会为它分配一块新的空间，并且将DLL装载到新地址，并且所有涉及到绝对地址的引用都要进行重定位。当然这个重定位只需要加上一个值即可（目标装载地址和实际装载地址的差值）。

PE文件的重定位信息都放在了`.reloc`段，可以在PE文件头中的DataDirectory里面得到重定位段的信息。对于EXE文件来说，MSVC默认不产生重定位段，毕竟它时进程运行时第一个装入虚拟空间的。但DLL一般都会产生重定位信息，也可以用/FIXED参数禁止产生重定位信息。

但是如果一个DLL被多个进程共享，且该DLL被这些进程装载到不同的位置，那么每个进程都需要有一份单独的DLL代码段的副本。该方案相对于ELF共享对象地址无关的方案来说更浪费内存。Rebase的DLL代码段在被换出的时候需要被写到交换空间，而不像没有Rebase的DLL一样释放物理页面，再次用到直接从DLL文件重新读就行。但是它比ELF的PIC机制更快一些。

**改变默认基址**

对于一个程序来说，它所用到的DLL基本是固定的，装载顺序和地址也是一样的。

MSVC提供了指定输出文件的基地址的功能，link链接时使用/BASE参数可以指定基地址。MSVC还提供了editbin可以用来改变已有DLL的基地址。

### 序号

def文件可以定义导出符号的序号和函数名是否可见。

```
LIBRARY math
add @1 NONAME
```

### 导入函数绑定

大多数情况下，DLL会以和之前一样的顺序被装载到和之前一样的地址。这就带来一个DLL性能优化方式——DLL绑定 (DLL Binding)。

```shell
editbin /BIND main.exe
```
DLL的绑定实现也比较简单，editbin对程序的导入符号进行遍历查找，找到后就把符号的运行时的地址写到导入表内。之前介绍导入表中的INT就是干这个的。

绑定地址失效：

1. DLL更新，导致导出函数地址发生变化
2. DLL在装载的时候Rebase，导致装载地址和绑定的不一样

PE的解决办法：链接器在程序绑定时对每个DLL的时间戳 (Timestamp)和校验和 (Checksum，比如MD5)保存到导入表中。运行时Windows核对DLL和登记信息是否能对上并确认其是否Rebase，发生变化就进行对DLL的符号解析。
