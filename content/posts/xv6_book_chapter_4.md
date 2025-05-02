---
title: "Xv6 book: Traps and system calls"
author: suo yuan
date: 2023-03-26T03:42:51Z
draft: false
categories:
  - 刷课笔记
tags:
  - Xv6_RISC-V
description:
  "Xv6 book 的第四章节"
---

<!--more-->
Xv6 book 的第四章节
<!--more-->

# Traps and system calls

有三种情况可以让 CPU 放下普通的执行指令，强制将控制权转给处理该情况的特殊代码。一种情况是系统调用，用户程序执行 `ecall` 指令要求内核做一些事；另一种是指令执行了非法操作，比如除以 0 或者使用无效的虚拟地址。第三种情况是设备在发出需要的信号时的中断，例如硬盘完成了读写操作。

这里使用 trap 作为这些情况的通用术语。通常来讲，不管现在正在执行的代码是什么都会让 trap 先运行，然后自己再去执行，并且不知道 trap 做了什么。不知道这一点对设备中断尤其重要。通常情况是，trap 强制将控制权转移给内核，内核保存寄存器和其他状态以便于后续恢复，内核执行相应的处理代码，内核恢复刚刚保存的东西，代码得以继续执行。

Xv6 在内核处理中所有的 trap。内核中处理的 trap 通常用于系统调用。这对中断来说的好处在于隔离需要只有内核使用设备，并且内核可以让多个进程之间共享设备。对于异常来说的意义在于 xv6 可以杀死有问题的程序以响应用户空间的异常。

Xv6 的 trap 处理分为四步：RISC-V CPU 执行硬件操作，为内核中处理如何处理 trap 的 C 代码准备一些汇编指令。虽然三种 trap 之间的共性表明内核可以调用一个代码处理所有 trap，但是在以下三种不同的情况分开使用三种代码是很方便的： 来自用户空间的 trap、来自内核空间的 trap 和时钟中断。处理 trap 的内核代码通常被称为处理程序 (handler)，第一个处理程序通常用汇编而不是 C 来编写，有时称为 vector。

## RISC-V trap machinery

每个 RISC-V CPU 都有一组控制寄存器，内核写入寄存器告诉 CPU 如何处理 trap，内核读取寄存器寻找以及发生的 trap。[RISC-V 文档](https://github.com/riscv/riscv-isa-manual/releases)包含完整的过程。**kernel/riscv.h** 包含 xv6 使用的定义。下边是最重要的寄存器的概述：

- `stvec`，内核在这里写入 trap 处理程序的地址，RISC-V 跳转到 `stvec` 的地址来处理 trap
- `sepc`，RISC-V 在遇到 trap 时将 pc 保存在这里（毕竟 pc 接下来就要被 `stvec` 覆盖了）。`sert` 在从 trap 返回时将 `sepc` 复制到 `pc`。内核可以编写 `sepc` 来控制 `sert` 的去向。
- `scause`，一个用于描述 trap 原因的数字
- `sscrath`，trap 处理程序使用 `sscrath` 防止保存用户寄存器前避免覆盖了用户寄存器。
- `sstatus`，`sstatus` 的 SIE 位控制是否启用设备中断。如果内核 clear 了 SIE，RISC-V 将会推迟用户中断直到内核设置了 SIE。SPP 位指出了 trap 来自 user 模式还是 supervisor 模式，并控制 `sret` 返回的模式。

上述寄存器设计在 supervisor 模式下处理的 trap，它们不能在 user 模式下读写。对于 machine 模式的 trap，有一小组类似的控制寄存器，xv6 只在时钟中断的特殊情况才会使用它。

多核芯片的每个 CPU 都有自己的一组这样的寄存器，并且在任何时间内都有可能有多个 CPU 在处理 trap。

当需要强制设置 trap 时，RISC-V 硬件对所有的 trap 执行以下操作（时钟中断除外）：

1. 如果 trap 是设备中断，并且 `sstatus` 的 SIE 被 clear 了就不会执行以下任何操作。
2. clear `status` 的 SIE 位以禁用中断
3. 把 `pc` 复制给 `spec`
4. 在 `status` 的 SPP 位保存当前的模式（user 还是 supervisor）
5. 设置 `scause` 以处理导致该 trap 的原因
6. 把模式设置成 supervisor
7. `stvec` 复制给 `pc`
8. 在 `pc` 指向的新地址开始执行

CPU 不会切换内核的页表，不会切换到内核的栈上，也不会保存除 PC 之外的任何寄存器。这都是内核软件的活。CPU 做这点活的原因之一就是让软件更加灵活，例如某些操作系统在特定情况下省略页表切换以提高 trap 的效率。

## 来自于用户空间的 trap

Xv6 处理 trap 的方式取决于这玩意是在内核中执行还是在用户代码中执行。下面是用户代码的 trap 的故事，在第五节描述了内核代码的 trap。

trap将会出现在正执行的用户程序在用户空间执行系统调用、非法操作或者设备中断的时候。来自用户空间的 trap 的高级路径是 `uservec` (**kernel/trampoline.S**: 21)，然后是 `usertrap` (**kernel/trap.c**: 37)；返回时是 `usertrapret` (kernel/trap.c: 90)，之后是 `userret` (**kernel/trampoline.S**: 101)。

设计 xv6 trap 处理的主要限制之一是 RISC-V 硬件强制执行 trap 时不会切换页表，也就是说 `stvec` 中的 trap 处理程序地址必须在用户页表中有一个有效的映射，这是 trap 处理程序的代码开始执行时生效的页表。xv6 的 trap 处理代码需要切换到内核页表，为了能够切换之后继续执行，内核页面必须具有 `stvec` 指向的处理程序的映射。

Xv6 使用 trampoline 页满足这些需求，trampoline 页包含 `uservec`，其指向 `stvec`。这个页在每个进程中的页表都会被映射，并且会被映射到 `TRAMPOLINE` 这个地址（该地址在进程虚拟地址的顶部）上。trampoline 页也被映射到内核页表的 `TRAMPOLINE` 地址。看下面这个图片，虽然 trampoline 页被映射到用户页表中，但是没有 `PTE_U` 这个 flag，所以只有 supervisor 模式才能执行代码。因为这个页也被映射在内核页表的相同的位置，所以切换到内核态的时候还可以接着执行该处理程序。

![vaapa](/img/xv6-riscv-book/virtual-address-and-physical-address.png)

`uservec` 指向的 trap 处理程序在 **trampoline.S** (kernel/trampoline.S:21)。当 `uservec` 刚开始的时候，RISC-V CPU 这 32 个寄存器都需要被保存在内存的某个位置以便中断返回的时候恢复。存储寄存器值的内存位置同样需要被一个寄存器来存储，不过此时没有寄存器可以用来干这件事，RISC-V 提供 `sscratch` 寄存器可以改变这尴尬局面 —— `csrw` 指令可以在 `uservec` 首部保存 `a0` 寄存器到 `sscratch` 寄存器上。

`uservec` 接下来的任务就是保存那 32 个寄存器的值。内核为每一个进程都分配一个页用来保存 `trapframe` 结构体，这个结构体拥有可以保存这32个寄存器值的空间(**kernel/proc.h**:43)。因为 `satp` 仍然指向用户页表，所以 `uservec` 需要 trapframe 被映射到用户地址空间。xv6在每个进程虚拟地址 `TRAPFRAME` 映射进程的 trapframe。`TRAPFRAME` 在 `TRAMPOLINE` 之后。进程的 ` p->trapframe` 也是指向 `trapframe`。因为记录的是它的物理地址，因此内核也可以在内核页表中使用它。

`uservec` 将 `TRAPFRAME` 加载到 `a0` 寄存器并把那 32 个寄存器的值保存到这里（包括用户的 `a0`，这是从 `sscrath` 寄存器读到的）。

`trapframe` 包含当前进程内核栈的地址，当前 CPU 的 hartid，`usertrap` 函数的地址以及内核页表的地址。`uservec` 可以检索这些值，将 `stap` 切换到内核页表并调用 `usertrap`。

`usertrap` 的工作是确定导致 trap 的原因再处理它，而后返回(**kernel/trap.c**:37)。它首先会改变 `stvec` 的值使 kernel 可以使用 `kernelvec` 而不是 `uservec`。它会保存 `sepc` 寄存器（以保存 `pc` 的值），因为 `usertrap` 也许会调用 `yeild` 去切换到其他进程的 kernel 线程，切换到的新进程可能会返回到用户态从而修改 `spec` 的值。如果这个 trap 是系统调用的话，`usertrap` 会调用 `syscall` 去处理它，如果是设备中断就调用 `devintr`，除此之外就是异常了，kernel 会杀掉这个出错的进程。系统调用执行过程中会把保存的 `pc` 加 4（即指向下一条指令），因为 RISC-V 中执行系统调用的时候，`sepc` 还是指向那条 `ecall` 指令，但是实际上应该被执行的用户代码是 `ecall` 的下一条。退出时 `usertrap` 会检查进程是否应该被 kill 或者应该让出 CPU（如果这个 trap 是时钟中断的话）。

返回到用户态的第一步是执行 `usertrapret`(**kernel/trap.c:90**)。这个函数会设置好 RISC-V 控制寄存器为未来来自用户态的 trap 做准备。这涉及到根据 `uservec` 改变 `stvec` 的值。准备 `uservec` 依赖的 trapframe 字段。并将 `sepc` 设置为之前保存的PC值。最后， `usertrapret` 会调用在 trampoline 页的 `userret`，这个页被同时映射在用户页表和内核页表，原因是 `userret` 中的汇编代码会切换页表。

`usertrapret` 函数在调用 `userret` 函数时,会通过 `a0` 寄存器传入指向进程用户页表的指针。`userret` 函数会将 `satp` 切换成进程的用户页表。需要记住，用户页表映射了 trampoline 页和 `TRAPFRAME`，但没有映射内核的其他内容。陷阱页在用户和内核页表中的相同虚拟地址映射，使 `userret` 函数在改变 `satp` 后继续执行。从此时起 `userret` 函数仅可以使用寄存器内容和 `TRAPFRAME` 内容。`userret` 函数会首先加载 `TRAPFRAME` 地址到 `a0` 寄存器，然后通过 `a0` 从 `TRAPFRAME` 中恢复已保存的用户模式寄存器值。之后恢复已保存的用户 `a0` 值，执行 `sret` 指令返回至用户模式。

## Code: Calling system calls

章节二结尾说了 **initcode.S** 调用了 `exec` 系统调用 (**user/initcode.S**:11)。接下来展示的是 user 的调用如何导致内核中 `exec` 的具体实现。

**initcode.S** 将 `exec` 的参数放到 `a0` 和 `a1` 寄存器中，并且把系统调用号存入 `a7` 寄存器。系统调用号会在 `syscalls` 数组（该数组是一个存着函数指针的表） (**kernel/syscall.c**:107)中匹配到一个入口。`ecall` 指令会导致切换到内核态然后再执行 `uservec`、`usertrap`，最后 `syscall` 被执行。

`syscall` (**kernel/syscall.c**:132)从保存在 trapframe 的 `a7` 寄存器检索出系统调用号并使其在 `syscalls` 检索出相应的处理函数。对于第一个系统调用来说，`a7` 包含的就是 `SYS_exec` (**kernel/syscall.h**:8)，其执行的结果就是调用系统调用的实现函数 `sys_exec`。

当 `sys_exec` 返回时，`syscall` 把返回值赋给 `p->trapframe->a0`，这会导致用户态下调用的那个 `exec` 会将其视作自己的返回值（因为 RISC-V 中，C 语言的调用规定就是 `a0` 寄存器保存返回值）。系统调用通常会在出错时返回负数，正常运行成功就返回非负数。如果系统调用号是无效的，`syscall` 会报错并且返回 `-1`。

## Code: System call arguments

内核中的系统调用需要用户代码传递来的参数，由于用户代码会调用系统调用的封装函数，所以那些参数会按照 RISC-V 调用约定那样位于那些寄存器中。 kernel 中存在三个函数（`argint`, `argaddr`, `argfd`）用于从 trap frame 拿到参数。它们都是调用了 `argraw` 并用自己的方式去保存参数。

一些系统调用的参数是指针，并且 kernel 必须使用这指针去对用户内存进行读写操作。例如 `exec` 这个系统调用会传递给 kernel 一个指向用户态中的字符数组的指针。这里存在两个问题。第一，用户程序可能有 bug 或者就是个恶意程序，可能会传给 kernel 一个非法的指针（比如让 kernel 访问内核内存而不是用户内存）。其次，xv6 内核页表映射与用户页表映射不同，因此 kernel 不能使用普通指令 load 或 store 用户提供的地址。

kernel中实现了一个函数可以将来自用户地址的数据安全的传递。`fetchstr()`(**kernel/syscall.c**:25)就是一个例子。文件系统的调用（例如 `exec`）会使用 `fetchstr()`（最终调用的是 `copyinstr()`）来完成这项工作。

`copyinstr()` (**kernel/vm.c**:403)从用户页表 `pagetable` 的虚拟地址 `srcva` 复制最多 `max` 个字节到`dst`。由于 `pagetable` 已经并非当前的页表了，所以会调用 `walkaddr()`（这会调用 `walk()`）去寻找 `pagetable` 的 `srcva`，然后就会返回一个`pa0`。内核页表的物理地址和虚拟地址是直接映射的，所以 `copyinstr()`可以直接从 `pa0` 复制字符串到 `dst` 上。`walkaddr()` (**kernel/vm.c**:109)会检测用户提供的虚拟地址是否是进程的用户地址空间的一部分以防止程序欺骗 kernel 读取其他内存。`copyout()` 提供了类似的功能 —— 复制用户指定的地址到内存中。

## 来自内核态的 trap

Xv6 控制 CPU trap 寄存器的方式会取决于当前执行的用户代码还是内核代码。如果是内核代码正在执行的话，CPU 会将 `stvec` 寄存器指向 `kernelvec` (**kernel/kernelvec.S**:12)处的汇编代码，这是因为 xv6 已经在内核中了，`kernelvec` 可以依赖 `satp` 设置内核页表以及指向一个有效的内核栈的栈指针。`kernelvec` 将 32 个寄存器全部压栈以便于后续的恢复。

`kernelvec` 将寄存器保存在被中断的内核线程的堆栈上。这里面有一点极其重要 —— CPU 是否会切换到其他线程，如果切换到了新进程，trap 将返回到新进程的栈，将被中断线程保存的寄存器安全地保留在新的栈上。

`kernelvec` 保存完寄存器后就跳转到了 `kerneltrap` (**kernel/trap.c**:135)。`kerneltrap` 是为设备终端和异常这两种trap做准备的。它会调用 `devintr` (**kernel/trap.c**:178)检查并处理前者。如果陷阱不是设备中断，那么它一定是异常，如果发生在 xv6 kernel 中，则始终是致命错误，kernel 调用 `panic` 并停止执行。

如果 `kerneltrap` 是被时钟中断调起来的，并且一个进程的内核线程正在运行（这与调度线程相对），`kerneltrap` 会调用 `yield` 去给其他进程执行的机会。当其中一个线程决定让出控制时，原始线程及其关联的 `kerneltrap` 就有机会继续执行。

当 `kerneltrap` 的工作结束了就会返回到被这个 trap 中断的代码上。因为 `yield` 可能会扰乱 `sepc` 和 `sstatus` 保存的之前的模式。 `kerneltrap` 再一开始就保存了它们，现在恢复控制寄存器并返回到 `kernelvec` (**kernel/kernelvec.S**:50)。`kernelvec` 会pop掉栈上之前保存的寄存器数据并执行 `sret`，将 `sepc` 复制给PC并恢复中断的内核代码。

当CPU从用户态进入内核态时，Xv6 将 CPU 的 `stvec` 设置为 `kernelvec`，可以再 `usertrap`(**kernel/trap.c**:29)看到这一点。 kernel 有一个窗口期用于执行，但此时 `stvec` 仍设置为 `uservec`，再此时期不能发生中断（这点很重要）幸运的是，RISC-V 在开始捕获陷阱时总是禁用中断，并且 xv6 在设置 `stvec` 之前不会再次启用它们。

## Page-fault exceptions

Xv6对异常的响应相当无聊：如果是发生在用户态的异常，kernel 会 kill 出错的进程；如果是内核态的异常，会 kernel panic。事实上，操作系统通常会以更有趣的方式做出响应。

例如，很多kernel会使用page fault来实现 **copy-on-write**(COW) fork。至于 COW fork 到底是什么，可以联想 xv6 的 fork，`fork` 导致那时候的父进程和子进程的内存是一致的，xv6 用 `uvmcopy`(**kernel/vm.c**:306)实现了 fork，这个函数会给子进程分配物理内存并把父进程的内存复制进去。如果父进程和子进程共享父进程的物理内存将会更加高效，然而不可以直接这么实现，这样对共享的堆栈的写入会扰乱彼此的执行。

通过使用合适的页表权限和 page fault，父进程和子进程可以安全地共享物理内存。当一个没有被映射的虚拟地址要被使用的时候，CPU会报 `page-fault` 异常（当然如果这个页的`PTE_V`flag被清除了，或其权限位(`PTE_R, PTE_W, PTE_X, PTE_U`)禁止尝试该操作。以上三种原因分别为 `load page faults`（load指令无法翻译它的虚拟地址），`store page faults`（store指令无法翻译它的虚拟地址）和 `instruction page faults`（PC指向的地址无法被翻译）。`scause` 寄存器会指明页错误的类型，`stval` 寄存器包含无法被翻译的地址。

COW fork 的基本方案就是这种父子进程初始化所有共享的物理页面，但是每个映射的页面都是只读的（`PTE_W` flag被清除了）。父子进程可以读取这共享的物理页面。如果有页面需要被写入，RISC-V CPU 会报一个页错误异常，kernel 的 trap 处理器会将分配一个新的物理内存页复制到报错的那个映射的物理地址。kernel 会改变报错进程页表的 PTE 以指向副本，这是可读写的。之后恢复到报错进程的那个导致报错的指令。写时复制需要一些记录来帮助确定何时可以释放物理页面，因为每个页面的引用次数可能会根据 forks、page faults、execs 和 exits 的历史而变化，取决于它的使用情况。如果一个进程发生了存储页面错误，并且物理页面只被该进程的页表引用，那么无需进行拷贝。

写时复制让 `fork` 更快（`fork` 不需要复制内存了，其中一部分后续可能会被写入，那时候才会复制）。但通常情况下，大多数内存不会被复制。一个常见的例子就是 `fork` 后面的 `exec`：一些页会在 `fork` 后被写入，但是子进程的 `exec` 会释放大多数来自父进程的内存。

页表和页错误的组合还带来了广泛有趣的可能性（除了 COW fork）。另一个广泛应用的特性被叫做 *lazy allocation*。这分为两部：第一步，当应用通过调用 `sbrk` 获取更多的内存时，kernel 记住增加的大小但不分配物理内存，也不为新的虚拟内存创建一个 PTEs；第二步，在这些新的地址中发生了页错误的时候，kernel 分配一页物理内存并将其映射进页表里。类似于 COW fork，kernel 可以在应用无法感知的情况下实现 lazy allocation

因为应用通常请求比它们实际会用到的要多的内存，lazy alloaction 让 kernel 在应用不使用这个页的话就不分配。除此之外，如果应用请求增加的地址太大，`sbrk` 不使用 lazy allocation 就会产生更大的消耗。Lazy allocation 使这种操作的成本可以随时间而分摊。一方面，lazy allocation 导致了处理页错误的额外开销，这会涉及到 kernel/user 转换。操作系统可以通过在每次页面错误时分配一批连续的页而不是一个页，并通过定制内核的 entry/exit 代码以处理这种页面错误，从而降低这种成本。

另一个广泛使用的 feature 是 *demand paging*。在 `exec` 中，xv6 会急切地将一个程序的所有 text 和 data 都加载到内存里。因为应用可能很大，并且从硬盘读数据是 expensive 的操作。启动应用的成本也许会被用户感知到，比如从 shell 中运行一个很大的程序，用户需要等一段时间才能得到结果。为了改善响应时间，现代化的 kernel 会给用户地址空间创建一个页表，但是标记为不可用。当页错误时，kernel 从硬盘读取一页大小的内容并且将它映射到用户地址空间中。类似 COW fork 和 lazy allocation，kernel 实现这个功能但不会被应用感知到。

程序的运行可能需要的内存比运行它的计算机实际的内存还要多，操作系统通过实现 *paging to disk* 以优雅地应对这个情况。这个想法就是存储一小部分的用户页表在 RAM 中，并且把剩下的存储在硬盘的 *paging area* 上。kernel 会将存储在 paging area 的那部分内存对应的 PTEs 标记为不可用（毕竟不在 RAM 里）。如果应用尝试读取已经从磁盘 *paged out* 的页，应用将会因此一个页错误，并且这个页就会 *paged in*：kernel  trap 处理程序将会分配一个页给物理内存，从磁盘读取一页到 RAM 里，并且将相关的 PTE 修改成指向这个 RAM。

如果有一个页需要被载入内存，但是物理 RAM 已经不够了会发生什么？这种情况下，kernel 必须首先 free 一个物理页（直接 page out 或者把它搞到磁盘的 paging area 中）并将其标记为不可用。刚刚介绍的两种办法中，后者更加 expensive，所以它尽量少的出现才会是性能最佳的，即如果应用程序仅使用其内存页面的子集，且这些子集的并集适应于 RAM。这通常被称为具有良好的引用局部性。与很多虚拟内存技术一样，kernel 通常实现这个 paging to disk 不会被应用感知到。

不管硬件 RAM 有多大，计算机通常操作尽量少的物理内存。例如，云服务提供商在一台计算机上同时运行多个客户以低成本地利用他们的硬件成本。另一个例子是，人们使用一个很少物理内存的智能手机去运行很多应用。

Lazy allocation 和 damand paging 在物理内存稀缺的时候都是格外有用的。在 `sbrk` 或`exec` 中急切地分配内存会带来额外的清除成本，以便释放内存。此外，存在急切分配工作被浪费的风险，因为在应用程序使用页面之前，操作系统可能已经将其清除。

其他结合了分页和页面错误异常的特性包括自动扩展堆栈和内存映射文件。

## Real world

Trampoline 和 trapframe 可能看起来过于复杂。推动力在于 RISC-V 在遇到 trap 时故意尽可能地执行少量操作，以允许非常快速的trap处理，这被证明是重要的。因此，内核 trap 处理程序的前几条指令实际上必须在用户环境中执行：用户页表和用户寄存器内容。而且 trap 处理程序最初对一些有用的事实一无所知，比如运行的进程的身份或内核页表的地址。解决方案是可能的，因为 RISC-V 提供了内核在进入用户空间之前可以存储信息的受保护位置：`sscratch` 寄存器和用户页表条目，它们指向内核内存，但由于缺乏 `PTE_U` 权限而受保护。Xv6 的 trampoline 和 trapframe 利用了这些 RISC-V 特性。

如果将内核内存映射到每个进程的用户页表中（带有适当的PTE权限标志），就可以消除特殊 trampoline 的需求。这也将消除当遇到 trap 的时候从用户空间到内核时的页表切换的需要。这反过来将允许内核中的系统调用实现利用当前进程的用户内存映射，从而允许内核代码直接引用用户指针。许多操作系统已经利用这些思想以提高效率。Xv6 避免使用它们，以降低内核由于无意中使用用户指针而导致安全漏洞的可能性，并减少确保用户和内核虚拟地址不重叠所需的一些复杂性。

生产环境下的操作系统实现 COW fork、lazy allocation、damand paging、paging to disk、memory-mapped files 等。此外，这种操作系统将尝试使用所有物理内存，用于应用程序或缓存（例如文件系统的缓冲区缓存，将在第 8.2 节中详细介绍）。在这方面，Xv6 是天真的：你希望你的操作系统使用你承受的物理内存，但 Xv6 不会这样做。此外，如果 Xv6 内存不足，它会向正在运行的应用程序返回错误或终止它，而不是例如将另一个应用程序的页面 page 到磁盘里。
