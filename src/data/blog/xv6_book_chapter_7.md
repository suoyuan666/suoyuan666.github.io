---
title: "Xv6 book: scheduling"
author: suo yuan
pubDatetime: 2023-04-12T03:42:51Z
draft: false
categories:
  - 刷课笔记
tags:
  - Xv6_RISC-V
description:
  "Xv6 book的 第七章节"
---

<!--more-->
Xv6 book 的第七章节
<!--more-->

# scheduling

任何操作系统都有可能运行比计算机拥有的CPU更多的进程，因此需要制定计划在这些进程之间进行CPU的时间共享。理想情况下，这种共享应对用户进程透明。一种常见的方法是通过将进程复用到硬件CPU上，为每个进程提供它拥有自己虚拟CPU的错觉。本章将解释xv6是如何实现这种多路复用的。

## Multiplexing

Xv6通过在两种情况下将每个CPU从一个进程切换到另一个进程来实现多路复用。首先，当一个进程等待设备或pipe I/O完成，或等待子进程退出，或在休眠系统调用中等待时，xv6的`sleep()`和`wakeup()`机制会进行切换。其次，xv6会定期进行切换，以处理那些在长时间内进行计算而不休眠的进程。这种多路复用创造了每个进程都拥有自己CPU的错觉，就像xv6使用内存分配器和硬件页表创造了每个进程都拥有自己内存的错觉一样。

实现多路复用面临一些挑战。首先，如何从一个进程切换到另一个进程？尽管context切换的思想很简单，但在xv6中的实现是一些最不透明的代码之一。其次，如何以对用户进程透明的方式强制进行切换？Xv6使用标准技术，也就是硬件时钟中断做到context切换。第三，所有的CPU在同一组共享的进程之间切换，需要一种锁定计划来避免竞争条件。第四，当进程退出时，必须释放进程的内存和其他资源，但它本身无法完成所有这些，因为可能在仍在使用自己的内核栈导致无法释放它。第五，多核机器的每个核心必须记住它正在执行哪个进程，以便系统调用影响正确的进程内核状态。最后，睡眠和唤醒允许一个进程放弃CPU并等待被另一个进程或中断唤醒。需要小心避免导致唤醒通知丢失的竞争条件。Xv6试图尽可能简单地解决这些问题，但最终产生的代码仍然复杂。

## Code: Context switching

![context_switching](/img/xv6-riscv-book/context_switching.png)

上图描述了从一个用户进程切换到另一个用户进程所涉及的步骤：从旧进程的用户级别到内核级别的过渡（系统调用或中断），切换到当前CPU的调度器线程，切换到新进程的内核线程，以及从trap返回到用户级别进程。Xv6调度器为每个CPU都有一个专用线程（保存的寄存器和堆栈），因为在旧进程的内核栈上执行调度器是不安全的：其他核心可能唤醒该进程并运行它，同时在两个不同的核心上使用相同的栈将是更加难绷的。在本节中，我们将研究在内核线程和调度器线程之间切换的机制。

从一个线程切换到另一个线程涉及保存旧线程的CPU寄存器，并恢复新线程之前保存的寄存器；保存和恢复堆栈指针和程序计数器意味着CPU将切换堆栈并切换正在执行的代码。

函数`swtch()`执行了内核线程切换的保存和恢复操作。`swtch()`并不直接了解线程；它只是保存和恢复一组32个RISC-V寄存器，称为*contexts*。当一个进程需要放弃CPU时，该进程的内核线程调用`swtch()`保存自己的context并返回到调度器的context。每个context包含在一个`struct context`结构体中（**kernel/proc.h**），它本身包含在一个进程的``struct proc``或一个CPU的``struct cpu``中。`swtch()`接受两个参数：`struct context *old`和`struct context *new`。它将当前寄存器保存在`old`中，从`new`中加载寄存器，然后返回。

让我们通过`swtch()`跟踪一个进程进入调度器的过程。我们在第4章中看到，在中断结束时，`usertrap()`调用了`yield()`的可能性之一。`yield()`反过来调用`sched()`，`sched()`再调用`swtch()`保存当前的context在``p->context``中，并切换到先前保存在`cpu->context`中的调度器的context（**kernel/proc.c**）。

`swtch()`(**kernel/swtch.S**）只保存被调用者保存的寄存器；C编译器在调用者中生成代码将调用者保存的寄存器保存在堆栈上。`swtch()`知道在`struct context`中每个寄存器字段的偏移量。它不保存程序计数器。相反，`swtch()`保存`ra`寄存器，其中包含从中调用`swtch()`的返回地址。现在，`swtch()`从新的context中恢复寄存器，该context包含先前由前一个`swtch()`保存的寄存器值。当`swtch()`返回时，它返回到由恢复的`ra`寄存器指向的指令，即先前调用`swtch()`的新线程的指令。此外，它在新线程的堆栈上返回，因为这是恢复的`sp`指向的位置。

在我们的例子中，`sched()`调用了`swtch()`以切换到`cpu->context`，即每个CPU的调度器的context。该context是在过去调度器调用`swtch()`(**kernel/proc.c**)以切换到当前正在放弃CPU的进程时保存的。当我们一直在追踪的`swtch()`返回时，它返回的不是`sched()`而是`scheduler()`，并且堆栈指针在当前CPU的调度器堆栈上。

## Code: scheduling

上一节看了`swtch()`的底层细节；现在让我们将`swtch()`视为已知，并检查从一个进程的内核线程通过调度器切换到另一个进程。调度器以每个CPU一个特殊线程的形式存在，每个线程都运行`scheduler()`函数。这个函数负责选择下一个要运行的进程。想要让出CPU的进程必须获取其自己的进程锁`p->lock`，释放它持有的任何其他锁，更新自己的状态(`p->state`)，然后调用`sched()`。你可以在`yield()`(**kernel/proc.c**)、`sleep()`和`exit()`中看到这个顺序。`sched()`再次检查其中的一些要求（**kernel/proc.c**），然后检查一个推论：由于持有锁，中断应该被禁用。最后，`sched()`调用`swtch()`保存当前context在`p->context`中，并切换到`cpu->context`中的调度器context。`swtch()`返回到调度器的堆栈上，就好像调度器的`swtch()`已经返回一样（**kernel/proc.c**）。调度器继续其for循环，找到要运行的进程，切换到它，循环重复。

我们刚刚看到，在调用`swtch()`时，xv6保持`p->lock`：调用`swtch()`的调用者必须已经持有锁，并且锁的控制权传递给切换到的代码。这种约定在锁中是不寻常的；通常获取锁的线程也负责释放锁，这样更容易理解正确性。对于context切换，需要打破这个约定，因为`p->lock`保护的进程状态和context字段的不变性在执行`swtch()`时并不成立。如果在`swtch()`期间不持有`p->lock`可能会导致问题的一个例子是：在`yield()`将其状态设置为`RUNNABLE`之后，另一个CPU可能会决定运行该进程，但在`swtch()`使其停止使用自己的内核栈之前。结果将是两个CPU在同一堆栈上运行，这将导致crash。

内核线程放弃CPU的唯一地点是在`sched()`中，而它总是切换到`scheduler()`中相同的位置，后者几乎总是切换到之前调用`sched()`的某个内核线程。因此，如果将xv6切换线程的行号打印出来，就会观察到以下简单的模式：（kernel/proc.c:463）、（kernel/proc.c:497）、（kernel/proc.c:463）、（kernel/proc.c:497），依此类推。有意通过线程切换相互传递控制的过程有时被称为协程；在这个例子中，`sched()`和`scheduler()`是彼此的协程。

有一种情况，当调度器对`swtch()`的调用没有结束在`sched()`中。`allocproc()`将一个新进程的context的`ra`寄存器设置为`forkret()`（**kernel/proc.c**），这样它的第一个`swtch()`“return”到该函数的开头。`forkret()`存在是为了释放`p->lock`；否则，由于新进程需要返回到用户空间，就像从fork返回一样，它可能会直接从`usertrapret()`开始。

`scheduler()`（**kernel/proc.c**）运行一个循环：找到要运行的进程，运行它直到它放弃CPU，然后重复。`scheduler()`在进程表上循环，寻找一个可运行的进程，即具有`p->state == RUNNABLE`的进程。一旦找到一个进程，它设置每个CPU的当前进程变量`c->proc`，将进程标记为`RUNNING`，然后调用`swtch()`来开始运行它（**kernel/proc.c**）。

理解调度代码结构的一种方式是，它执行关于每个进程的一组不变性，并在这些不变性不成立时保持`p->lock`。其中一个不变性是，如果一个进程处于`RUNNING`状态，定时器中断的`yield()`必须能够安全地从该进程切换出去；这意味着CPU寄存器必须保存进程的寄存器值（即`swtch()`没有将它们移动到context中），并且`c->proc`必须指向该进程。另一个不变性是，如果一个进程是`RUNNABLE`，那么空闲CPU的调度器可以安全地运行它；这意味着`p->context`必须保存进程的寄存器（即它们实际上并不在真实的寄存器中），没有CPU正在执行进程的内核栈，并且没有CPU的`c->proc`指向该进程。请注意，这些属性在持有`p->lock`的时候通常是不成立的。

维护上述不变性是xv6经常在一个线程中获取`p->lock`并在另一个线程中释放它的原因，例如在`yield()`中获取并在`scheduler()`中释放。一旦`yield()`开始修改运行中的进程的状态以使其成为`RUNNABLE`，锁必须保持直到不变性被恢复：最早的正确释放点是在`scheduler`（运行在自己的堆栈上）清除`c->proc`之后。同样，一旦调度器开始将`RUNNABLE`状态的进程转换为`RUNNING`，就不能在内核线程完全运行之前释放锁（例如在`swtch()`之后，例如在`yield()`中释放）。

## Code: mycpu and myproc

在xv6中，经常需要一个指向当前进程的proc结构的指针。在单处理器上，可以有一个指向当前proc的全局变量。在多核机器上，这种方法不起作用，因为每个核心执行不同的进程。解决这个问题的方法是利用每个核心都有自己的寄存器集这一事实；我们可以使用其中一个寄存器来帮助找到每个核心的信息。

Xv6为每个CPU维护一个`struct cpu`（**kernel/proc.h**），记录当前在该CPU上运行的进程（如果有的话），CPU调度器线程的保存寄存器以及管理禁用中断所需的嵌套自旋锁计数。函数`mycpu()`（**kernel/proc.c**）返回指向当前CPU的`struct cpu`的指针。RISC-V对CPU进行编号，为每个CPU分配一个`hartid`。Xv6确保在内核中，每个CPU的`hartid`存储在该CPU的`tp`寄存器中。这允许`mycpu()`使用`tp`来索引一个cpu结构的数组，以找到正确的CPU。

确保CPU的`tp`始终保存着CPU的`hartid`有一些复杂。`start()`在CPU的启动序列的早期设置了`tp`寄存器，也就是还在machine模式的时候(**kernel/start.c**）。`usertrapret()`将`tp`保存在trampoline页中，因为用户进程可能会修改`tp`。最后，`uservec`在从用户空间进入内核时恢复了保存的`tp`（`kernel/trampoline.S`）。编译器保证永远不会使用`tp`寄存器。如果xv6能够向RISC-V硬件询问当前`hartid`，那就方便的多，但RISC-V只允许在machine模式下进行此操作，supervisor模式不可如此。

`cpuid()`和`mycpu()`的返回值不可信：如果定时器中断并导致线程放弃CPU，然后切换到另一个CPU，先前返回的值将不再正确。为了避免这个问题，xv6要求调用者禁用中断，并在使用返回的`struct cpu`之后才启用它们。

`myproc()`函数（**kernel/proc.c**）返回当前CPU上正在运行的进程的`struct proc`指针。`myproc()`禁用中断，调用`mycpu()`，从`struct cpu`中获取当前进程指针（`c->proc`），然后启用中断。即使中断被启用，`myproc()`的返回值也是安全的：如果定时器中断将调用进程移动到另一个CPU，其`struct proc`指针仍将保持不变。

## sleep and wakeup

调度和锁有助于将一个线程的操作隐藏在另一个线程之前，但我们还需要一些抽象来帮助线程有意地相互交互。例如，xv6中的pipe的读取者可能需要等待写入进程生成数据；父进程调用`wait()`可能需要等待子进程退出；读取磁盘的进程需要等待磁盘硬件完成读取。在这些情况（以及许多其他情况）下，xv6内核使用一种称为"sleep"和"wakeup"的机制。"sleep"允许内核线程等待特定事件；另一个线程可以调用"wakeup"来指示等待事件的线程应该继续。"sleep"和"wakeup"通常被称为顺序协调或条件同步机制。

`sleep()`和`wakeup()`提供了一个相对低级的同步接口。为在xv6中使用，我们将为它们构建一个称为*semaphore*的[更高级同步机制](https://www.cs.utexas.edu/users/EWD/transcriptions/EWD01xx/EWD123.html)，用于协调生产者和消费者（xv6不使用semaphore）。semaphore维护一个计数并提供两个操作。"V"操作（对于生产者）增加计数。"P"操作（对于消费者）等待直到计数非零，然后减少计数并返回。如果只有一个生产者线程和一个消费者线程，并且它们在不同的CPU上执行，并且编译器没有过于激进地进行优化，这个实现将是正确的：

```c
struct semaphore {
  struct spinlock lock;
  int count;
};

void
V(struct semaphore *s)
{
  acquire(&s->lock);
  s->count += 1;
  release(&s->lock);
}

void
P(struct semaphore *s)
{
  while(s->count == 0)
    ;
  acquire(&s->lock);
  s->count -= 1;
  release(&s->lock);
}
```

上面的实现的代价很高的。如果生产者很少活动，消费者将花费大部分时间在while循环中自旋，希望计数非零。消费者的CPU可能会找到比通过重复轮询`s->count`更有成效的工作。避免忙等待需要一种方法，让消费者放弃CPU，并且只在V增加计数后才恢复。

这是朝着这个方向的一步，尽管我们将看到它还不够。让我们想象一对调用，`sleep()`和`wakeup()`，其工作如下。`sleep(chan)`在任意值`chan`上（称为*channel*）上sleep。`sleep()`使调用进程进入sleeping状态，释放CPU以执行其他工作。`wakeup(chan)`唤醒在`chan`上睡眠的所有进程（如果有的话），导致它们的`sleep()`调用返回。如果没有进程在`chan`上等待，则`wakeup()`不执行任何操作。我们可以修改semaphore的实现以使用`sleep()`和`wakeup()`（修改的那行加了注释符）：

```c
void
V(struct semaphore *s)
{
  acquire(&s->lock);
  s->count += 1;
  wakeup(s); 		//
  release(&s->lock);
}

void
P(struct semaphore *s)
{
  while(s->count == 0)
    sleep(s);	//
  acquire(&s->lock);
  s->count -= 1;
  release(&s->lock);
}
```

现在，P在放弃CPU而不是自旋。然而，事实证明使用这种接口设计`sleep()`和`wakeup()`并不是那么直接，而且可能遇到所谓的*lost wakeup*问题。假设在while循环判断时P发现`s->count == 0`。当P在while循环体中但还没执行`sleep(s)`，另一个CPU上运行了V：它将`s->count`更改为非零，并调用`wakeup()`，但发现没有sleeping的进程，因此什么也没做。现在，P继续执行`sleep(s)`：它调用`sleep()`并进入sleeping状态。这会导致一个问题：P正在等待一个已经发生的V调用。除非我们幸运，生产者再次调用V，否则消费者将永远等待，即使count是非零的。

这个问题的根本原因在于，P仅在`s->count == 0`时`sleep()`这一点在V在恰好错误的时刻运行时被违反。保护不变性的一种不正确的方式是将P中的锁获取（修改的那行加了注释符）移到其对计数的检查和调用`sleep()`的地方，使其成为原子操作：

```c
void
P(struct semaphore *s)
{
  acquire(&s->lock);	//
  while(s->count == 0)
    sleep(s);
  s->count -= 1;
  release(&s->lock);
}
```

这个版本的P会避免lost wakeup，因为锁阻止了持有锁的时候执行V。但它也造成了死锁：P在sleeping时持有锁，因此V将永远阻塞，等待锁。

我们将通过更改`sleep()`的接口来修复前面的方案：调用者必须将*condition lock*传递给`sleep()`，以便在将调用进程标记为sleeping并等待sleep channel后释放锁。该锁将强制并发的V需要等到P将自己置于sleeping状态，以便`wakeup()`将找到sleeping的消费者并唤醒它。一旦消费者再次醒来，`sleep()`在返回之前重新获取锁。我们的新的正确的sleep/wakeup方案可以如下使用（修改的那行加了注释符）：

```c
void
V(struct semaphore *s)
{
  acquire(&s->lock);
  s->count += 1;
  wakeup(s); 
  release(&s->lock);
}

void
P(struct semaphore *s)
{
  acquire(&s->lock);
  while(s->count == 0)
    sleep(s, &s->lock);  //
  s->count -= 1;
  release(&s->lock);
}
```

P持有`s->lock`的事实防止在P检查`s->count`到调用`sleep()`这段时间中V尝试唤醒P。然而需要注意的是，我们需要`sleep()`原子地释放`s->lock`并将消费进程置于sleeping状态，以避免lost wakeup。

## Code: sleep and wakeup

Xv6的`sleep()`（**kernel/proc.c**）和`wakeup()`（**kernel/proc.c**）提供了上面示例中显示的接口，它们的实现（加上使用它们的规则）确保没有lost wakeup。基本思想是让`sleep()`标记当前进程为`SLEEPING`，然后调用`sched()`释放CPU；`wakeup()`查找在给定等待channel上sleeping的进程，并将其标记为`RUNNABLE`。调用`sleep()`和`wakeup()`的调用者可以使用任何相互方便的数字作为channel。Xv6通常使用与等待相关的内核数据结构的地址。

`sleep()`获取`p->lock`（**kernel/proc.c**）。现在，进入睡眠状态的进程同时持有`p->lock`和`lk`。在调用者（在示例中是P）中，持有`lk`是必要的：它确保没有其他进程（在示例中是运行V的一个进程）可以开始调用`wakeup(chan)`。现在`sleep()`持有`p->lock`，可以安全地释放`lk`：其他一些进程可能会开始调用`wakeup(chan)`，但`wakeup()`将等待获取`p->lock`，因此将等待直到`sleep()`完成将进程置于睡眠状态，从而防止`wakeup()`错过`sleep()`。

现在，`sleep()`持有`p->lock`且没有其他线程持有，它可以通过记录sleep channel、将进程状态更改为`SLEEPING`并调用`sched()`（**kernel/proc.c**）来将进程置于sleeping状态。接下来说明为什么要确保在将进程标记为`SLEEPING`之后，`p->lock`不能被释放（由调度程序执行）。

在某个时刻，一个进程将获取condition lock，设置等待的条件，并调用`wakeup(chan)`。重要的是，在持有condition lock[严格来说，如果`wakeup()`仅仅在获取之后执行（也就是说，在释放之后调用`wakeup()`），就已经足够了。]的同时调用`wakeup()`。`wakeup()`循环遍历进程表（**kernel/proc.c**）。它获取每个要检查的进程的`p->lock`，这既是因为它可能会操作该进程的状态，也是因为`p->lock`确保`sleep()`和`wakeup()`不会错过彼此。当`wakeup()`找到处于`SLEEPING`状态且channel匹配的进程时，它将该进程的状态更改为`RUNNABLE`。下次调度程序运行时，它将看到该进程已准备好运行。

为什么`sleep()`和`wakeup()`的锁定规则确保sleeping的进程不会错过wakeup呢？sleeping的进程在从检查条件之前的某一点到标记为`SLEEPING`之后的某一点都持有condition lock或其自身的`p->lock`或两者都持有。调用`wakeup()`的进程在`wakeup()`的循环中持有这两个锁。因此，唤醒者要么在消费线程检查条件之前使条件为真；要么唤醒者的`wakeup()`在sleeping的线程被标记为`SLEEPING`之后进行检查。然后就是，`wakeup()`将看到睡眠的进程并唤醒它（除非有其他东西先唤醒它）。

有时会出现多个进程在同一channel上sleeping的情况；例如，从pipe中读取的多个进程。单次调用`wakeup()`将唤醒它们所有。其中一个将首先运行并获取`sleep()`调用时使用的锁，并（在pipe的情况下）读取pipe中等待的任何数据。其他进程将发现，尽管被唤醒，但没有可读取的数据。从它们的角度来看，唤醒是“虚假的”，它们必须再次进入睡眠状态。因此，`sleep()`总是在检查条件的循环内调用。

如果两个sleep/wakeup的使用意外地选择了相同的channel，也不会造成任何伤害：它们将看到虚假的wakeup，但如上所述的循环将容忍这个问题。sleep/wakeup的魅力之一在于它既轻量级（无需创建用作sleep channel的特殊数据结构），又提供了一层间接性（调用者无需知道它们正在与哪个具体的进程交互）。

## Code: Pipes

使用`sleep()`和`wakeup()`来同步生产者和消费者的更复杂的例子是xv6对pipe的实现。我们在第1章看到了pipe的接口：写入pipe一端的字节被复制到内核缓冲区，然后可以从pipe的另一端读取。未来的章节将研究围绕pipe的文件描述符支持，但现在让我们看一下`pipewrite()`和`piperead()`的实现。

每个pipe由一个`struct pipe`表示，其中包含一个锁和一个数据缓冲区。字段`nread`和`nwrite`分别计算从缓冲区读取的总字节数和写入的总字节数。缓冲区是循环的：在`buf[PIPESIZE-1]`之后写入的下一个字节是`buf[0]`。计数不会循环。这种约定允许实现区分满缓冲区（`nwrite == nread+PIPESIZE`）和空缓冲区（`nwrite == nread`），但这意味着索引到缓冲区必须使用`buf[nread % PIPESIZE]`而不是简单的`buf[nread]`（对于`nwrite`也是如此）。

假设在两个不同的CPU上同时调用`piperead()`和`pipewrite()`。`pipewrite()`（**kernel/pipe.c**）开始通过获取pipe的锁，该锁保护计数、数据和它们相关的不变性。然后，`piperead()`（**kernel/pipe.c**）也尝试获取锁，但无法获取。它在`acquire()`（**kernel/spinlock.c**）中自旋等待锁。在`piperead()`等待期间，`pipewrite()`循环处理正在写入的字节（`addr[0..n-1]`），逐个将每个字节添加到pipe中。在此循环期间，缓冲区可能已满。在这种情况下，`pipewrite()`调用`wakeup()`来通知任何sleeping的读取器有数据在缓冲区中等待，并在`&pi->nwrite`上sleep，等待读取器从缓冲区中取出一些字节。`sleep()`在将`pipewrite()`的进程置于sleeping状态时释放`pi->lock`。

现在`pi->lock`可用，`piperead()`成功获取它并进入其临界区：它发现`pi->nread != pi->nwrite`（`pipewrite()`因为`pi->nwrite == pi->nread+PIPESIZE`（**kernel/pipe.c**）而进入睡眠状态），因此它继续执行for循环，从pipe中复制数据，并将`nread`递增与复制的字节数相同。现在有这么多字节可用于写入，所以`piperead()`在返回之前调用`wakeup()`唤醒任何sleeping的写入器。`wakeup()`找到了一个在`&pi->nwrite`上sleeping的进程，这个进程曾经运行`pipewrite()`但在缓冲区填满时停止。它将该进程标记为`RUNNABLE`。

pipe代码为读取器和写入器使用了不同的sleeping channel（`pi->nread`和`pi->nwrite`）；在极少数情况下，如果有很多读取器和写入器在等待相同的pipe，这可能使系统更加高效。pipe代码在循环中sleeping并检查sleep条件；如果有多个读取器或写入器，除了第一个唤醒的进程外，所有进程都会看到条件仍为false，然后再次进入sleeping状态。

## Code: wait, exit, and kill

`sleep()`和`wakeup()`可以用于许多类型的等待。一个有趣的例子，在第1章介绍过，是子进程的退出与其父进程的等待之间的交互。在子进程死亡时，父进程可能已经在等待中睡眠，或者正在执行其他操作；在后一种情况下，对`wait()`的后续调用必须观察到子进程的死亡，可能在它调用`exit()`后很久。xv6记录子进程的终结直到`wait()`观察到它的方式是将调用者置于`ZOMBIE`状态，保持在该状态直到父进程的`wait()`注意到它，将子进程的状态更改为`UNUSED`，复制子进程的退出状态，并将子进程的进程ID返回给父进程。如果父进程在子进程之前退出，父进程将子进程交给init进程，后者会不断调用`wait()`；因此，每个子进程都有一个父进程来清理它。一个挑战是避免在同时进行的父进程和子进程`wait()`和`exit()`、以及同时进行的`exit()`和`exit()`之间的竞争和死锁。

`wait()`开始通过获取`wait_lock`（**kernel/proc.c**）来实现。原因是`wait_lock`充当条件锁，有助于确保父进程不会错过来自正在退出的子进程的唤醒。然后，`wait()`扫描进程表。如果找到一个处于`ZOMBIE`状态的子进程，它将释放该子进程的资源和其proc结构，将子进程的退出状态复制到`wait()`提供的地址（如果不为0），并返回子进程的进程ID。如果`wait()`找到子进程，但没有一个退出，它调用`sleep()`等待它们中的任何一个退出（**kernel/proc.c**），然后再次进行扫描。`wait()`通常持有两个锁，`wait_lock`和某个进程的`pp->lock`；为了避免死锁，先获取`wait_lock`，然后是`pp->lock`。

`exit()`（**kernel/proc.c**）记录退出状态，释放一些资源，调用`reparent()`将其子进程交给init进程，唤醒父进程，标记调用者为僵尸状态，并永久性地让出CPU。`exit()`在此序列期间持有`wait_lock`和`p->lock`这两个锁。它持有`wait_lock`是因为它是唤醒（`wakeup(p->parent)`）的条件锁，防止处于`wait()`状态的父进程错过唤醒。`exit()`必须持有`p->lock`以防止处于`wait()`状态的父进程在子进程最终调用`swtch()`之前就看到子进程处于`ZOMBIE`状态。`exit()`以与`wait()`相同的顺序获取这些锁，以避免死锁。

虽然将状态设置为`ZOMBIE`之前唤醒父进程看起来不太正确，但这是安全的：尽管`wakeup()`可能导致父进程运行，但`wait()`的循环不能在子进程的`p->lock`被调度程序释放之前检查子进程，因此`wait()`无法在`exit()`将其状态设置为`ZOMBIE`之后很快查看正在退出的进程（**kernel/proc.c**:）。

虽然`exit()`允许一个进程终止自己，但`kill()`（**kernel/proc.c**）允许一个进程请求另一个进程终止。直接销毁被kill的进程进程对于`kill()`来说可能过于复杂，因为被kill的进程可能正在另一个CPU上执行，可能正在对内核数据结构进行必要的操作。因此，`kill()`几乎什么都不做：它只是设置被kill的进程的`p->killed`，如果它正在sleep，就wakeup。最终，被kill的进程将进入或离开内核，此时在`usertrap()`中的代码将在`p->killed`被设置时调用`exit()`（通过调用`killed()`来检查（**kernel/proc.c**））。如果被kill的进程正在用户空间运行，它将很快通过发出系统调用或者由于时钟（或其他设备）中断而进入内核。

如果被kill的进程进程正在sleep，`kill()`调用`wakeup()`将导致被kill的进程从sleep中返回。这是个危险操作，因为等待的条件可能不成立。然而，xv6对`sleep()`的调用总是包装在一个while循环中，在`sleep()`返回后重新测试条件。一些对`sleep()`的调用还在循环中测试`p->killed`，并在其被设置时放弃当前的活动。这只有在这种放弃是正确的情况下才会这样做。例如，pipe读写代码在`killed`标志被设置时返回；最终，该代码将返回到trap，trap将再次检查`p->killed`并调用`exit()`。

一些xv6的`sleep()`循环不检查`p->killed`，因为代码正在进行多步的系统调用，这应该是原子的。virtio驱动程序（**kernel/virtio_disk.c**）就是一个例子：它不检查`p->killed`，因为磁盘操作可能是需要一组写操作的其中一个，这些写操作都是为了让文件系统保持在正确状态。等待磁盘I/O的进程直到完成当前的系统调用并且`usertrap()`看到`killed`标志时才会退出。

## Process Locking

每个进程关联的锁（`p->lock`）是xv6中最复杂的锁之一。对于`p->lock`的一个简单理解是，当读取或写入以下任何`struct proc`字段时，必须持有该锁：`p->state`、`p->chan`、`p->killed`、`p->xstate`和`p->pid`。这些字段可能被其他进程或其他核上的调度程序线程使用，因此自然而然地需要通过锁进行保护。

然而，`p->lock`的大多数用途是保护xv6进程数据结构和算法的更高级别方面。以下是`p->lock`所做的全部工作：

- 与`p->state`一起，防止在为新进程分配proc[]时出现竞争。
- 在创建或销毁过程中，将进程隐藏。
- 防止父进程的`wait()`发现已将其状态设置为`ZOMBIE`但尚未让出CPU的进程。
- 防止另一个核心的调度程序在将其状态设置为`RUNNABLE`但在完成`swtch()`之前决定运行yield进程。
- 确保只有一个核心的调度程序决定运行`RUNNABLE`进程。
- 防止时钟中断在进程处于`swtch()`状态时导致其让出CPU。
- 与condition lock一起，有助于防止`wakeup()`忽视正在调用`sleep()`但尚未完成CPU让出的进程。
- 防止被kill的进程进程退出，可能在`kill()`检查`p->pid`并设置`p->killed`之间被重新分配。
- 使`kill()`的`p->state`的检查和写入是原子的。

`p->parent`字段由全局锁`wait_lock`保护，而不是由`p->lock`保护。只有进程的父进程才能修改`p->parent`，尽管该字段既被进程本身读取，也被其他搜索其子进程的进程读取。`wait_lock`的目的是在等待任何子进程退出时作为条件锁定，当`wait()`休眠等待任何子进程退出时使用。退出的子进程会持有`wait_lock`或`p->lock`，直到将其状态设置为`ZOMBIE`、唤醒其父进程并让出CPU之后才释放。`wait_lock`还序列化父进程和子进程的并发退出，以确保init进程（继承该子进程）被唤醒等待。`wait_lock`是全局锁，而不是每个父进程中的每个进程锁，因为在进程获取它之前，它无法知道它的父进程是谁。

## Real world

xv6调度程序实现了一种简单的调度策略，即按顺序运行每个进程的轮转调度策略，也称为循环调度。真实的操作系统实现了更复杂的调度策略，例如允许进程具有优先级。其思想是可运行的高优先级进程将优先于可运行的低优先级进程。这些策略可能会迅速变得复杂，因为通常存在竞争的目标：例如，操作系统可能还希望保证公平性和高吞吐量。此外，复杂的策略可能导致意外的交互，如优先级反转和车队。优先级反转可能发生在低优先级和高优先级进程都使用特定锁的情况下，当低优先级进程获取锁时，可能阻止高优先级进程取得进展。当许多高优先级进程等待获取由低优先级进程获取的共享锁时，可能形成长时间的车队。为了避免这些问题，复杂调度程序中需要额外的机制。

sleep和wakeup是一种简单而有效的同步方法，但还有许多其他方法。在所有这些方法中的第一个挑战是避免我们在本章开头看到的lost wakeup问题。最初的Unix内核的`sleep()`简单地禁用中断，这足够因为Unix在单CPU系统上运行。由于xv6在多处理器上运行，它为`sleep()`添加了一个显式的锁。FreeBSD的`msleep()`采用相同的方法。Plan 9的`sleep()`使用一个回调函数，在进入sleep前持有调度锁；该函数用作睡眠条件的最后一分钟检查，以避免lost wakeup。Linux kernel的`sleep()`使用一个显式的进程队列，称为*wait queue*，而不是*wait channel*；wait queue有其自己的内部锁。

在`wakeup()`中扫描整个进程集是低效的。更好的解决方案是在`sleep()`和`wakeup()`中都用一个数据结构来替代`chan`，该结构保存了在该结构上休眠的进程列表，例如Linux的wait queue。Plan 9的`sleep()`和`wakeup()`将该结构称为*rendezvous point*。许多线程库将相同的结构称为条件变量；在这个context中，操作`sleep()`和`wakeup()`被称为`wait`和`signal`。所有这些机制都共享相同的特征：sleep condition在某种锁的保护下，在sleeping期间以原子方式释放。

`wakeup()`的实现会唤醒在特定channel上等待的所有进程，而可能存在许多进程正在等待该特定通道。操作系统将安排所有这些进程，它们将竞争检查sleep condition。以这种方式行为的进程有时被称为*thundering herd*，最好避免。大多数条件变量都有两个`wakeup()`的primitives：signal用于唤醒一个进程，broadcast用于唤醒所有等待的进程。

semaphores通常用于同步。count通常对应于pipe缓冲区中可用的字节数或进程具有的僵尸子进程的数量之类的内容。在抽象的一部分使用显式计数可以避免lost wakeup问题：有一个明确的计数表示已发生的唤醒次数，这样count还避免了虚假唤醒和thundering herd问题。

在xv6中，终止进程并清理它们引入了很多复杂性。在大多数操作系统中，这甚至更加复杂，因为例如，被kill的进程进程可能深入内核中休眠，展开其堆栈需要谨慎，因为调用堆栈上的每个函数可能需要进行一些清理。一些语言通过提供exception机制来帮助处理这个问题，但C语言不支持。此外，还有其他事件可能导致一个正在休眠的进程被唤醒，即使它正在等待的事件尚未发生。例如，当Unix进程正在休眠时，另一个进程可能向其发送信号。在这种情况下，进程将以值-1和错误代码设置为EINTR从被中断的系统调用返回。应用程序可以检查这些值并决定如何处理。Xv6不支持信号，因此不涉及这种复杂性。

Xv6对`kill()`的支持并不完善：存在可能应该检查`p->killed`的`sleep()`循环。一个相关的问题是，即使对于检查`p->killed`的`sleep()`循环，`sleep()`和`kill()`之间依旧存在竞争；后者可能设置`p->killed`并尝试在被kill的进程的循环检查`p->killed`之后但在调用`sleep()`之前唤醒被kill的进程。如果发生这个问题，被kill的进程在等待的条件发生之前可能不会注意到`p->killed`。这可能会相当长的时间，甚至永远不会发生（例如，如果被kill的进程正在等待从console输入，但用户没有输入任何内容）。

一个真实的操作系统会在常数时间内使用显式的空闲进程结构列表找到空闲的proc结构，而不是使用`allocproc()`中的线性搜索；xv6出于简单起见使用线性扫描。