---
title: "Xv6 book: Locking"
author: suo yuan
pubDatetime: 2023-04-09T03:42:51Z
draft: false
categories:
  - 刷课笔记
tags:
  - Xv6_RISC-V
description:
  "Xv6 book 的第六章节"
---

<!--more-->
Xv6 book 的第六章节
<!--more-->

# Locking

现在的大多数包括 xv6 在内的内核会交错执行多个进程。这里面有多处理器硬件的功劳：拥有多个独立执行的CPU的计算机，例如 xv6 的 RISC-V。这些多个 CPU 共享物理 RAM，而 xv6 利用这种共享来维护所有 CPU 都读写的数据结构。这种共享可能导致一个 CPU 在另一个 CPU 正在更新它时读取数据结构，甚至可能多个 CPU 同时更新相同的数据；如果没有经过精心设计，这样的并发访问可能会产生不正确的结果或损坏数据结构。即使在单处理器上，内核也可能在多个线程之间切换 CPU，导致它们的执行交错进行。最后，一个设备中断处理程序可能会修改与一些可中断代码相同的数据，如果中断发生的时间不对，可能会损坏数据。并发这个词指的是由于多处理器并行性、线程切换或中断而导致多个指令流交错的情况。

内核中充斥着可同时访问的数据。例如，两个CPU可能同时调用 `kalloc()`，从而同时从空闲列表的头部弹出。内核设计者喜欢允许大量并发，因为它可以通过并行性提高性能和增加响应能力。可惜结果证明，内核设计者必须在存在这种并发性的情况下确保正确性才行。有许多实现正确代码的方法，其中一些比其他方法更容易推理。旨在在并发情况下确保正确性的策略和支持它们的抽象称为并发控制(*concurrency control*)技术。

Xv6使用了多种并发控制技术，具体取决于情况；还有许多其他可能的技术。本章重点介绍一种广泛使用的技术：锁。锁提供互斥，确保一次只有一个 CPU 可以持有锁。如果程序员将每个共享数据项与一个锁关联，并且在使用该项时代码始终持有相关的锁，那么该项将一次只由一个 CPU 使用。在这种情况下，可以认为该锁保护数据项。尽管锁是一种容易理解的并发控制机制，但锁的缺点是它们可能限制性能，因为它们会串行化并发操作。

该章节剩下的部分会介绍 xv6 为什么需要锁，锁是如何实现的以及如何使用锁。

## Races

假设两个在两个不同CPU上调用 `wait()` 的已退出的子进程。`wait()` 会释放子进程的内存。因此，在每个CPU上，内核将调用 `kfree()` 来释放子进程的内存页。内核分配器维护一个链表：`kalloc()`（**kernel/kalloc.c**）从空闲页面列表中pop内存页面，而 `kfree()`将一个页面 push到空闲列表中。为了获得最佳性能，我们可能希望两个父进程的 `kfree`s 在没有等待对方的情况下并行执行，但考虑到 xv6 的 `kfree()` 实现，这是不正确的。

![SMP_architecture](/img/xv6-riscv-book/SMP_architecture.png)

图 6.1 更详细地说明了这个设置：空闲页面的链表位于两个 CPU 共享的内存中，它们使用加载和存储指令来操作列表。（实际上，处理器具有缓存，但在概念上，多处理器系统的行为就好像存在一个单一的共享内存。）如果没有并发请求，您可以将列表推送操作实现如下：

```c
struct element {
  int data;
  struct element *next;
};

struct element *list = 0;

void
push(int data)
{
  struct element *l;
  
  l = malloc(sizeof *l);
  l->data = data;
  l->next = list;
  list = l;
}
```

![Example_race](/img/xv6-riscv-book/Example_race.png)

这个实现在独立执行时是正确的。然而，如果有多个副本同时执行，那么这段代码就不正确了。如果两个CPU同时执行 `push()`，两者都可能在图 6.1 中的第 15 行执行之前执行第 16 行，这将导致不正确的结果，如图 6.2 所示。然后将会有两个列表元素，它们的 `next` 设置为列表的先前值。当在第16行发生两次对列表的赋值时，第二次将覆盖第一次；参与第一次赋值的元素将会丢失。

第 16 行的丢失更新是竞争的一个例子。竞争是一种情况，其中内存位置被同时访问，而至少有一个访问是写入。竞争通常是错误的迹象，可能是丢失更新（如果访问是写入）或对未完全更新的数据结构进行读取。

竞争的结果取决于编译器生成的机器代码、涉及的两个 CPU 的时序以及它们的内存操作由内存系统如何排序，这可能使由竞争引起的错误难以复现和调试。例如，在调试 push 时添加打印语句可能会改变执行的时序，足以使竞争消失。

避免竞争的通常方法是使用锁。锁确保互斥性，以便一次只有一个 CPU 可以执行 `push()` 的敏感行；这使得上述情景成为不可能。上述代码的正确加锁版本只需添加几行（修改的那行添加了注释符）：

```c
struct element *list = 0;

struct lock listlock;  //

void
push(int data)
{
  struct element *l;
  
  l = malloc(sizeof *l);
  l->data = data;
  acquire(&listlock);  //
  l->next = list;
  list = l;
  release(&listlock);  //
}
```

在 `acquire()` 和 `release()` 之间的指令序列通常被称为 *critical section*。通常说锁是在保护列表。

当我们说一个锁保护数据时，我们实际上是指该锁保护一些适用于数据的不变量。不变量是在操作之间维护的数据结构的属性。通常，一个操作的正确行为取决于不变量在操作开始时为真。操作可能会暂时违反不变量，但必须在完成之前重新确立它们。例如，在链表的情况下，不变量是列表指向列表中的第一个元素，每个元素的 `next` 字段指向下一个元素。`push()` 的实现会暂时违反这个不变量：在第 12 行，`l` 指向下一个列表元素，但 `list` 还没有指向 `l`（在第13行重新建立）。我们上面检查的竞争发生是因为第二个CPU执行了依赖于列表不变量的代码，而这些不变量在那时是（暂时）违反的。正确使用锁确保一次只有一个 CPU 可以在 *critical section* 对数据结构进行操作，因此当数据结构的不变量不成立时，没有 CPU 会执行数据结构操作。

你可以把锁看作是串行化并发的 *critical section*，使它们一次只运行一个，从而保持不变量（假设 *critical section* 在隔离状态下是正确的）。你还可以将由同一把锁保护的 *critical section* 视为相互原子化，因此每个 *critical section* 只看到之前 *critical section* 的完整更改集，并且永远不会看到部分完成的更新。

尽管锁对于程序正确性而言很有用，但其本质上限制了性能。例如，如果两个进程同时调用 `kfree()`，锁将串行化这两个 *critical section*，因此在不同的 CPU 上运行它们不会带来任何好处。如果多个进程在同一时间想要相同的锁，或者说锁经历争用就很难绷。内核设计中的一个主要挑战就是在追求并行性时避免锁的争用。Xv6 在这方面做得不多，但复杂的内核会组织数据结构和算法，专门为了避免锁的争用。在这个 list 示例中，内核可以为每个 CPU 维护一个单独的空闲列表，只有在当前 CPU 的列表为空且必须从另一个 CPU 中窃取内存时才触及另一个 CPU 的空闲列表。其他用例可能需要更复杂的设计。

锁的位置对性能也很重要。例如，将 `acquire()` 移到 `push()` 的较早位置（在第 8 行之前）是正确的。但这可能会降低性能，因为调用 `malloc()` 的操作会被串行化。下面的 "Using locks" 部分提供了一些建议，指导何时插入 `acquire()` 和 `release()` 调用。

## Code: Locks

Xv6 拥有两种类型的锁：自旋锁（spinlocks）和睡眠锁（sleep-locks）。我们先从自旋锁开始。Xv6 将自旋锁表示为一个结构体 `spinlock`（**kernel/spinlock.h**）。结构体中的重要字段是 `locked`，它在锁可被使用时为零，在锁被持有时为非零。从逻辑上讲，xv6 应该通过执行类似以下代码来获取锁：

```c
void
acquire(struct spinlock *lk) // does not work!
{
  for(;;) {
    if(lk->locked == 0) {
      lk->locked = 1;
      break;
    }
  }
}
```

不幸的是，这个实现在多处理器上不能保证互斥性。可能发生两个 CPU 同时到达第 5 行，看到 `lk->locked` 为零，然后都执行第 6 行抓住锁。在这一点上，两个不同的 CPU 都持有锁，违反了互斥性质。我们需要的是一种使第 5 行和第 6 行执行为一个原子（即不可分割）步骤的方法。

由于锁被广泛使用，多核处理器通常提供实现第5和第6行的原子版本的指令。在 RISC-V 上，这个指令是 `amoswap r, a。amoswap`： 读取内存地址 a 处的值，将寄存器 `r` 的内容写入该地址，并将它读取的值放入 `r`。也就是说，它交换了寄存器和内存地址的内容。它使用特殊的硬件以原子方式执行此序列，防止任何其他CPU在读取和写入之间使用内存地址。

Xv6 的 `acquire()`（**kernel/spinlock.c**）使用了可移植的 C 库调用 `__sync_lock_test_and_set()`，它编译为 `amoswap` 指令；返回值是 `lk->locked` 之前（交换的）的内容。`acquire()` 函数将交换包装在一个循环中，一直循环尝试（自旋）直到它获取了锁。每次迭代都将一个值交换到` lk->locked` 中并检查先前的值；如果先前的值为0，那么我们已经获取了锁，交换会将 `lk->locked` 设置为 1。如果先前的值为 1，那么某个其他 CPU 持有锁，而我们将1原子地交换到 `lk->locked` 中并不会改变它的值。

一旦获得锁，`acquire()` 函数为调试记录获取锁的 CPU。`lk->cpu` 字段受到锁的保护，必须在持有锁的情况下才能更改。`release()` 函数（**kernel/spinlock.c**）是 `acquire()` 函数的相反操作：它清除 `lk->cpu` 字段，然后释放锁。从概念上讲，释放只需要将 0 赋给 `lk->locked`。C 标准允许编译器使用多个存储指令来实现赋值，因此C赋值可能在并发代码方面不是原子的。所以，`release()` 使用 C 库函数 `__sync_lock_release()`，执行原子的赋值操作。

## Code: Using locks

使用锁的难点在于决定使用多少锁以及每个锁应该保护哪些数据和不变量。有一些基本原则。首先，每当一个变量可以被一个 CPU 写入的同时另一个 CPU 可以读取或写入它时，应该使用锁以防止这两个操作重叠。其次，要记住锁保护不变量：如果一个不变量涉及多个内存位置，通常需要通过一个单一的锁来保护它们，以确保保持不变量。

上述规则说明了何时需要锁，但没有提到何时不需要锁，而且不锁定太多是很重要的，因为锁会降低并行性。如果并行性不重要，那么可以安排只有一个线程，而不用担心锁。在多处理器上，一个简单的内核可以通过具有单一锁来实现这一点，该锁在进入内核时必须获取，并在退出内核时释放（尽管阻塞系统调用（如 `pipe` `read` 或 `wait`）可能会带来问题）。许多单处理器操作系统已经通过这种方法转换为在多处理器上运行，有时被称为 “big kernel lock”，但这种方法牺牲了并行性：一次只能有一个CPU在内核中执行。如果内核进行了大量计算，使用更大一组更细粒度的锁可能更有效，以便内核可以在多个 CPU 上同时执行。

作为粗粒度锁定的一个例子，xv6的 **kalloc.c** 分配器具有一个由单一锁保护的空闲列表。如果不同 CPU 上的多个进程尝试同时分配页面，每个进程都必须通过在 `acquire()` 中自旋等待。自旋会浪费 CPU 的时间。如果 CPU 多数时候都用来自旋，也许通过更改分配器设计，使用多个具有各自锁的空闲列表，以允许真正并行的分配，性能可能会得到改善。

作为细粒度锁定的一个例子，xv6 为每个文件都有一个单独的锁，这样处理不同文件的进程通常可以在不等待对方锁的情况下继续执行。如果希望允许进程同时写同一文件的不同区域，文件锁定方案可以变得更加细粒度。最终，锁的颗粒度需要在性能和复杂性之间权衡。

随着后续章节对 xv6 的每个部分进行解释，它们将提到 xv6 在处理并发时使用锁的例子。作为预览，图 6.3 列出了 xv6 中的所有锁。

![Locks_in_xv6](/img/xv6-riscv-book/Locks_in_xv6.png)

## Deadlock and lock ordering

如果通过内核的代码执行流必须同时持有多个锁，那么很重要的一点是所有代码执行流以相同的顺序获取这些锁。如果不这样做，就有发生死锁的风险。假设 xv6 中有两个代码执行流需要锁 A 和 B，但代码执行流 1 按照 A 然后 B 的顺序获取锁，而另一条路径按照 B 然后 A 的顺序获取锁。假设线程 T1 执行代码执行流 1 并获取锁 A，线程 T2 执行代码执行流 2 并获取锁 B。接下来，T1 将尝试获取锁 B，而 T2 将尝试获取锁 A。两者都将无限期地阻塞，因为在两种情况下，另一个线程持有所需的锁，并且在其获取返回之前不会释放它。为了避免这种死锁，所有代码执行流必须以相同的顺序获取锁。对全局锁获取顺序的需求意味着锁实际上是每个函数规范的一部分：调用者必须以使锁按约定的顺序获取的方式调用函数。

在 xv6 中，由于 sleep 的工作方式（参见第7章），涉及每个进程锁（每个 `struct proc` 中的锁）的长度为两的锁顺序链很多。例如，`consoleintr`（**kernel/console.c**）是处理键入字符的中断处理程序。当输入换行符时，任何等待console输入的进程都应该被唤醒。为了实现这一点，`consoleintr()` 在调用 `wakeup()` 时持有 `cons.lock`，而 `wakeup()` 获取等待进程的锁以唤醒它。因此，全局避免死锁的锁顺序规则包括 `cons.lock` 必须在任何进程锁之前获取。文件系统代码包含了 xv6 最长的锁链。例如，创建文件需要同时持有目录的锁、新文件的 inode 的锁、磁盘块缓冲区的锁、磁盘驱动程序的 `vdisk_lock`，以及调用进程的 `p->lock`。为了避免死锁，文件系统代码总是按照前文提到的顺序获取锁。

遵守全局避免死锁的顺序可能会让人感觉很难绷。有时，锁顺序与逻辑程序结构冲突，例如，可能代码模块 M1 调用模块 M2，但锁顺序要求在 M1 中获取一个锁之前必须获取 M2 中的一个锁。有时，锁的身份事先不知道，可能是因为必须持有一个锁以便发现下一个要获取的锁的身份。这种情况在文件系统中查找路径名中的连续组件时以及在 `wait()` 和 `exit()` 的代码中搜索进程表以查找子进程时会出现。最后，死锁的危险通常限制了锁定方案的细粒度，因为更多的锁通常意味着更多的死锁机会。避免死锁的需要通常是内核实现的一个重要因素。

## Re-entrant locks

可能会觉得通过使用可重入锁（也称为递归锁）可以避免一些死锁和锁定顺序的挑战。这个想法是，如果一个进程持有锁，并且该进程尝试再次获取锁，那么内核可以允许这样做（因为进程已经持有锁），而不是像 xv6 内核那样调用 panic。

然而，事实证明可重入锁使得推理并发性变得更加困难：可重入锁破坏了锁导致 *critical section* 在其他 *critical section* 是原子的直觉。考虑以下两个函数 `f()` 和 `g()`：

```c
struct spinlock lock;
int data = 0; // protected by lock

f() {
  acquire(&lock);
  if(data == 0){
    call_once();
    h();
    data = 1;
  }
  release(&lock);
}

g() {
  aquire(&lock);
  if(data == 0){
    call_once();
    data = 1;
  }
  release(&lock);
}
```

观察这段代码片段，直觉是 `call_once()` 只会被调用一次：要么由 `f()` 调用，要么由 `g()` 调用，但不会两者兼有。

但是如果允许可重入锁，并且 `h()` 恰好调用 `g()`，那么 `call_once()` 将被调用两次。如果不允许可重入锁，那么 `h()` 调用 `g()` 将导致死锁，这也不太好。但是，假设调用 `call_once()` 将是一个严重错误，那么死锁更可取。内核开发人员将观察到死锁（内核恢复到 panic 状态），并可以修改代码以避免它，而调用 `call_once()` 两次可能会悄悄产生难以追踪的错误。

出于这个原因，xv6 使用更简单易懂的非可重入锁。然而，只要程序员记住锁定规则，两种方法都可以使其正常工作。如果 xv6 使用可重入锁，就必须修改 `acquire()`，以注意到锁当前由调用线程持有。还必须向 `struct spinlock` 添加一个嵌套获取的计数，类似于接下来将要讨论的 `push_off`。

## Locks and interrupt handlers

一些 xv6 的自旋锁保护着同时由线程和中断处理程序使用的数据。例如，`clockintr()` 时钟中断处理程序可能会在大约同一时间递增 `ticks`（**kernel/trap.c**），而内核线程在 `sys_sleep()`（**kernel/sysproc.c**）中读取 `ticks`。锁 `tickslock` 串行化了这两个访问。

自旋锁和中断的交互引发了潜在的危险。假设 `sys_sleep()` 持有 `tickslock`，并且它的 CPU 被时钟中断。`clockintr()` 将尝试获取 `tickslock`，看到它被持有，并等待释放。在这种情况下，`tickslock` 将永远不会被释放：只有 `sys_sleep()` 才能释放它，但 `sys_sleep()` 不会继续运行，直到 `clockintr()` 返回。因此，CPU 将死锁，需要锁的任何代码也将被冻结。

为了避免这种情况，如果一个自旋锁被中断处理程序使用，CPU 绝不能在启用中断的情况下持有该锁。Xv6 更加保守：当一个 CPU 获取任何锁时，xv6 总是在该 CPU 上禁用中断。中断仍然可能发生在其他 CPU 上，因此中断的获取可以等待线程释放自旋锁；只是不能在同一个 CPU 上等待。

当 CPU 不持有自旋锁时，xv6 会重新启用中断；它必须进行一些簿记以处理*critical section*。`acquire()` 调用 `push_off()`，而 `release()` 调用 `pop_off()`来跟踪当前 CPU 上锁的嵌套级别。当该计数达到零时，`pop_off()` 将恢复在最外层*critical section*开始时存在的中断使能状态。`intr_off()` 和 `intr_on()` 函数分别执行 RISC-V 指令以禁用和启用中断。

在设置 `lk->locked` 之前，`acquire()` 必须严格调用 `push_off()`。如果两者颠倒，那么在打开中断的情况下持有锁的短暂窗口将出现，而一个不幸时机的中断可能会导致系统死锁。`release()` 也是在释放锁之后才能调用 `pop_off()`。

## Instruction and memory ordering

我们会自然地认为程序按照源代码语句的出现顺序执行。这对于单线程代码来说是一个合理的认知，但在多个线程通过共享内存进行 交互时，这是不正确的。其中一个原因是编译器发出的store和load指令的顺序与源代码暗示的顺序不同，而且可能完全省略它们（例如通过将数据缓存在寄存器中）。另一个原因是为了提高性能，CPU 可能会乱序执行指令。例如，CPU 可能注意到在一系列串行指令中，指令 A 和 B 互不依赖。CPU 可能首先启动指令 B，要么是因为它的输入在指令 A 的输入之前就绪，要么是为了重叠执行 A 和 B。

作为可能出错的一个例子，在这个 `push()` 的代码中，如果编译器或 CPU 将对应于第 4 行的存储移动到第 6 行的 `release()` 之后，将是一场灾难：

```c
l = malloc(sizeof *l);
l->data = data;
acquire(&listlock);
l->next = list;
list = l;
release(&listlock);
```

如果发生了这样的重新排序，将会出现一个窗口期，另一个 CPU 可能会获取锁并观察到更新后的列表，但看到一个未初始化的 `list->next`。

好消息是，编译器和 CPU 通过遵循一组称为内存模型的规则，并通过提供一些primitives来帮助程序员控制重新排序，从而帮助并发程序员。

为了告诉硬件和编译器不要重新排序，xv6 在 `acquire()`和 `release()`中都使用了 `__sync_synchronize()`。`__sync_synchronize()` 是一个内存block：它告诉编译器和 CPU 不要在block之间重新排序加载或存储。xv6 中 `acquire()` 和 `release()` 中的block在几乎所有关键情况下都强制执行顺序，因为 xv6 在访问共享数据时使用锁。第 9 章讨论了一些例外情况。

## Sleep locks

有时 xv6 需要长时间持有锁。例如，文件系统（第 8 章）在读写磁盘上的文件内容时会保持文件锁定，而这些磁盘操作可能需要数十毫秒。如果持有自旋锁这么长时间，如果另一个进程想要获取它，那么这个进程将会浪费很多时间在自旋上。自旋锁的另一个缺点是，进程在保持自旋锁的同时不能让出 CPU；我们希望能够：在持有锁的进程等待磁盘时，其他进程可以使用 CPU。在持有自旋锁的同时让出 CPU 是非法的，因为如果然后第二个线程尝试获取自旋锁，可能会导致死锁；由于 `acquire()` 不会让出 CPU，第二个线程的自旋可能会阻止第一个线程运行并释放锁。在持有锁的同时让出 CPU 也会违反持有自旋锁时必须关闭中断的要求。因此，我们希望一种在等待获取时可以让出 CPU，并允许在持有锁时进行让出（和中断）的锁类型。

由于 sleep-locks 保持中断启用，因此不能在中断处理程序中使用。由于 `acquiresleep` 可能会让出 CPU，因此在 `spinlock` 关键部分内部不能使用 sleep-locks（尽管可以在 sleep-lock 关键部分内部使用 spinlocks）。自旋锁最适用于短的关键部分，因为等待它们会浪费 CPU 时间；sleep-locks 对于较长时间的操作效果很好。

## Real world

尽管经过多年对并发 primitives 和并行性的研究，使用锁进行编程仍然具有挑战性。通常最好将锁隐藏在更高级别的抽象中，比如同步队列，尽管 xv6 并未这样做。如果你使用锁进行编程，明智的做法是使用一个试图识别竞争的工具，因为很容易忽略需要锁的不变式。

大多数操作系统支持 POSIX 线程（Pthreads），允许用户进程在不同的 CPU 上同时运行多个线程。Pthreads 支持用户级别的锁、block 等。Pthreads 还允许程序员可选地指定一个锁应该是可重入的。

在用户级支持 Pthreads 需要操作系统的支持。例如，如果一个 pthread 在系统调用中 block，同一进程的另一个 pthread 应该能够在该 CPU 上运行。另一个例子，如果一个 pthread 更改其进程的地址空间（例如，映射或解除映射内存），内核必须安排运行同一进程的其他 CPU 更新其硬件页表以反映地址空间的变化。

虽然可以在没有原子指令的情况下实现锁，但这是昂贵的，大多数操作系统使用原子指令。

如果许多 CPU 尝试在同一时间获取相同的锁，锁可能会变得昂贵。如果一个 CPU 在其本地缓存中缓存了一个锁，而另一个 CPU 必须获取该锁，那么用于更新包含锁的缓存行的原子指令必须将该行从一个 CPU 的缓存移动到另一个 CPU 的缓存，并可能使缓存行的任何其他副本无效。从另一个 CPU 的缓存中获取缓存行的代价可能比从本地缓存中获取缓存行的代价高几个数量级。

为了避免与锁相关的开销，许多操作系统使用无锁数据结构和算法。例如，可以实现一个类似本章开头的链表，它在搜索列表期间不需要锁，并且在列表中插入一个项只需要一个原子指令。然而，无锁编程比编程锁更复杂；例如，必须担心指令和内存重新排序。由于使用锁已经很困难，因此 xv6 避免了无锁编程带来的复杂性。
