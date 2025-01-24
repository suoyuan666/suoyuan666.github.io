---
title: "xv6-riscv 源码阅读 —— 内核态: 虚拟化"
author: suo yuan
date: 2025-01-24T13:55:50Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 读一遍，本篇简单说了下 xv6 虚拟化是怎么做的，也就是虚拟内存，进程抽象等"
summary: "尝试把 xv6-riscv 读一遍，本篇简单说了下 xv6 虚拟化是怎么做的，也就是虚拟内存，进程抽象等"
---

# 虚拟化

> 虚拟内存是一种内存管理技术，它提供了“给定机器上实际可用的存储资源的理想化抽象”，它“给用户创造了一个拥有全部内存的错觉”。
>
> 计算机操作系统结合使用硬件和软件，将程序使用的内存地址（称为虚拟地址）映射到计算机内存中的物理地址。从进程或任务的角度来看，主存储表现为连续的地址空间或连续段的集合。操作系统管理虚拟地址空间以及实内存到虚拟内存的分配。 CPU 中的地址转换硬件通常称为内存管理单元 (MMU)，可自动将虚拟地址转换为物理地址。
>
> 虚拟内存的主要好处包括使应用程序不必管理共享内存空间，能够在进程之间共享库使用的内存，由于内存隔离而提高安全性，以及能够在概念上使用比物理可用更多的内存，使用分页或分段技术。

上面这段来自 [WikiPedia](https://en.wikipedia.org/wiki/Virtual_memory)

xv6 运行在 Sv39 RISC-V 上，也就是说它只使用 64 bit 虚拟地址的低 39 bit。xv6 通过三级页表来寻址

xv6 的 main.c 中，首先初始化了内核页表部分

```c
void
kinit()
{
  initlock(&kmem.lock, "kmem");
  freerange(end, (void*)PHYSTOP);
}

void
freerange(void *pa_start, void *pa_end)
{
  char *p;
  p = (char*)PGROUNDUP((uint64)pa_start);
  for(; p + PGSIZE <= (char*)pa_end; p += PGSIZE)
    kfree(p);
}
```

这里是对锁的初始化，之后再把空间都 free 一遍

之后是初始化内核页表

```c
// Initialize the one kernel_pagetable
void
kvminit(void)
{
  kernel_pagetable = kvmmake();
}
```

kernel_pagetable 就是一 uint64 的指针

```c
// Make a direct-map page table for the kernel.
pagetable_t
kvmmake(void)
{
  pagetable_t kpgtbl;

  kpgtbl = (pagetable_t) kalloc();
  memset(kpgtbl, 0, PGSIZE);

  // uart registers
  kvmmap(kpgtbl, UART0, UART0, PGSIZE, PTE_R | PTE_W);

  // virtio mmio disk interface
  kvmmap(kpgtbl, VIRTIO0, VIRTIO0, PGSIZE, PTE_R | PTE_W);

  // PLIC
  kvmmap(kpgtbl, PLIC, PLIC, 0x4000000, PTE_R | PTE_W);

  // map kernel text executable and read-only.
  kvmmap(kpgtbl, KERNBASE, KERNBASE, (uint64)etext-KERNBASE, PTE_R | PTE_X);

  // map kernel data and the physical RAM we'll make use of.
  kvmmap(kpgtbl, (uint64)etext, (uint64)etext, PHYSTOP-(uint64)etext, PTE_R | PTE_W);

  // map the trampoline for trap entry/exit to
  // the highest virtual address in the kernel.
  kvmmap(kpgtbl, TRAMPOLINE, (uint64)trampoline, PGSIZE, PTE_R | PTE_X);

  // allocate and map a kernel stack for each process.
  proc_mapstacks(kpgtbl);
  
  return kpgtbl;
}
```

可以看出，这里首先分配了一个内核页表，之后填空 0，然后把地址映射过去，然后将其返回

```c
// Allocate one 4096-byte page of physical memory.
// Returns a pointer that the kernel can use.
// Returns 0 if the memory cannot be allocated.
void *
kalloc(void)
{
  struct run *r;

  acquire(&kmem.lock);
  r = kmem.freelist;
  if(r)
    kmem.freelist = r->next;
  release(&kmem.lock);

  if(r)
    memset((char*)r, 5, PGSIZE); // fill with junk
  return (void*)r;
}
```

```c
// add a mapping to the kernel page table.
// only used when booting.
// does not flush TLB or enable paging.
void
kvmmap(pagetable_t kpgtbl, uint64 va, uint64 pa, uint64 sz, int perm)
{
  if(mappages(kpgtbl, va, sz, pa, perm) != 0)
    panic("kvmmap");
}
```

```c
// Create PTEs for virtual addresses starting at va that refer to
// physical addresses starting at pa.
// va and size MUST be page-aligned.
// Returns 0 on success, -1 if walk() couldn't
// allocate a needed page-table page.
int
mappages(pagetable_t pagetable, uint64 va, uint64 size, uint64 pa, int perm)
{
  uint64 a, last;
  pte_t *pte;

  if((va % PGSIZE) != 0)
    panic("mappages: va not aligned");

  if((size % PGSIZE) != 0)
    panic("mappages: size not aligned");

  if(size == 0)
    panic("mappages: size");
  
  a = va;
  last = va + size - PGSIZE;
  for(;;){
    if((pte = walk(pagetable, a, 1)) == 0)
      return -1;
    if(*pte & PTE_V)
      panic("mappages: remap");
    *pte = PA2PTE(pa) | perm | PTE_V;
    if(a == last)
      break;
    a += PGSIZE;
    pa += PGSIZE;
  }
  return 0;
}
```

`mappages` 的核心部分就是下边那个 `for` 循环

```c
a = va;
last = va + size - PGSIZE;
for(;;){
  if((pte = walk(pagetable, a, 1)) == 0)
    return -1;
  if(*pte & PTE_V)
    panic("mappages: remap");
  *pte = PA2PTE(pa) | perm | PTE_V;
  if(a == last)
    break;
  a += PGSIZE;
  pa += PGSIZE;
}
```

```c
// Return the address of the PTE in page table pagetable
// that corresponds to virtual address va.  If alloc!=0,
// create any required page-table pages.
//
// The risc-v Sv39 scheme has three levels of page-table
// pages. A page-table page contains 512 64-bit PTEs.
// A 64-bit virtual address is split into five fields:
//   39..63 -- must be zero.
//   30..38 -- 9 bits of level-2 index.
//   21..29 -- 9 bits of level-1 index.
//   12..20 -- 9 bits of level-0 index.
//    0..11 -- 12 bits of byte offset within the page.
pte_t *
walk(pagetable_t pagetable, uint64 va, int alloc)
{
  if(va >= MAXVA)
    panic("walk");

  for(int level = 2; level > 0; level--) {
    pte_t *pte = &pagetable[PX(level, va)];
    if(*pte & PTE_V) {
      pagetable = (pagetable_t)PTE2PA(*pte);
    } else {
      if(!alloc || (pagetable = (pde_t*)kalloc()) == 0)
        return 0;
      memset(pagetable, 0, PGSIZE);
      *pte = PA2PTE(pagetable) | PTE_V;
    }
  }
  return &pagetable[PX(0, va)];
}
```

```c
#define PX(level, va) ((((uint64) (va)) >> PXSHIFT(level)) & PXMASK)
#define PA2PTE(pa) ((((uint64)pa) >> 12) << 10)
```

上面的两个宏展开是下边这样

```c
((((uint64)(va)) >> (12 + (9 * (level)))) & 0x1FF)
((((uint64)pagetable) >> 12) << 10)
```

宏 `PTE_V` 表示该 PTE 是否已存在，所以找到了一个 PTE 就要查看它的 `PTE_V` 位，并且在之后还涉及到给它赋 `PTE_V`。宏 `PX` 用来取某个级的 PTE 出来，从这个展开的宏也能看出来，首先右移 `12 + 9 * level`，这是因为一级就要占 9 字节，再加上本身就有的 12 字节的偏移量，最后和 `0x1FF` 按位与取出最后 9 字节。而 `PA2PTE` 用来将物理地址转换成对应的 PTE，右移 12 字节为了取出偏移量，之后左移 10 字节是为了空出一些 flag

可以参考下边的图片来理解，图片来自 [RISC-V 手册](https://github.com/riscv/riscv-isa-manual)

![page_table_detail](/img/xv6-riscv-read/kernel/page_table_detail.png)

还有一些 xv6-book 的图片，更多关于页表的解释也可以看我之前写的 [xv6-book 的翻译](../../tags/xv6_risc-v/)

![RISC-V-PTE](/img/xv6-riscv-book/RISC-V-PTE.png)

![RISC-V-addres-translation-details](/img/xv6-riscv-book/RISC-V-addres-translation-details.png)

```c
// Allocate a page for each process's kernel stack.
// Map it high in memory, followed by an invalid
// guard page.
void
proc_mapstacks(pagetable_t kpgtbl)
{
  struct proc *p;
  
  for(p = proc; p < &proc[NPROC]; p++) {
    char *pa = kalloc();
    if(pa == 0)
      panic("kalloc");
    uint64 va = KSTACK((int) (p - proc));
    kvmmap(kpgtbl, va, (uint64)pa, PGSIZE, PTE_R | PTE_W);
  }
}
```

最后映射完后，再映射一遍进程的 kernel stack

`KSTACK` 是一个宏函数

```c
#define KSTACK(p) (TRAMPOLINE - ((p) + 1) * 2 * PGSIZE)
// Expands to
(((1L << (9 + 9 + 9 + 12 - 1)) - 4096) - (((int)(p - proc)) + 1) * 2 * 4096)
```

## 进程

```c
// initialize the proc table.
void
procinit(void)
{
  struct proc *p;
  
  initlock(&pid_lock, "nextpid");
  initlock(&wait_lock, "wait_lock");
  for(p = proc; p < &proc[NPROC]; p++) {
      initlock(&p->lock, "proc");
      p->state = UNUSED;
      p->kstack = KSTACK((int) (p - proc));
  }
}
```

这就是进程的初始化，这里涉及到对进程的出现 `struct proc`

```c
struct proc {
  struct spinlock lock;

  // p->lock must be held when using these:
  enum procstate state;        // Process state
  void *chan;                  // If non-zero, sleeping on chan
  int killed;                  // If non-zero, have been killed
  int xstate;                  // Exit status to be returned to parent's wait
  int pid;                     // Process ID

  // wait_lock must be held when using this:
  struct proc *parent;         // Parent process

  // these are private to the process, so p->lock need not be held.
  uint64 kstack;               // Virtual address of kernel stack
  uint64 sz;                   // Size of process memory (bytes)
  pagetable_t pagetable;       // User page table
  struct trapframe *trapframe; // data page for trampoline.S
  struct context context;      // swtch() here to run process
  struct file *ofile[NOFILE];  // Open files
  struct inode *cwd;           // Current directory
  char name[16];               // Process name (debugging)
};
```

## exec

这时候就涉及到 syscall 

RISC-V 的系统调用通过 ecall 来完成，ecall 会跳转到内核的一段处理程序中，这个处理程序的地址在 `stvec` 寄存器中

在 `main` 函数中，`stvec` 寄存器第一次初始化是指向来自内核的 trap 处理程序

> xv6 的 trap 处理程序大致分成两个——来自用户态的和来自内核态的
>
> 目前也没有什么用户空间的事，就先初始化内核态的。用户态的 trap 处理程序会在处理时将 `stvec` 寄存器改成内核态的，之后在返回时再改回用户态的。
>
> 这里说的 trap 是指 CPU 需要放下正在正常执行的指令，强制跳转到另一个处理该情况的代码。比如各种中断，系统调用等，都属于该情况。

```c
// set up to take exceptions and traps while in the kernel.
void
trapinithart(void)
{
  w_stvec((uint64)kernelvec);
}
```

在 `userinit()` 函数中，`p = allocproc();` 中的 `allocproc()` 函数涉及到了

```c
// Set up new context to start executing at forkret,
// which returns to user space.
memset(&p->context, 0, sizeof(p->context));
p->context.ra = (uint64)forkret;
p->context.sp = p->kstack + PGSIZE;
```

`forkret` 中调用了 `usertrapret()`，这个函数将 `stvec` 的值设置为了 kernel/trampoline.S 中的 `uservec`

这里的 `ra` 寄存器保存了返回地址，和 x86 架构不同的是，RISC-V 有专门的寄存器保存返回地址，而不是像 x86 那样放在栈上，而 `ret` 指令会直接跳转到 `ra` 寄存器的值开始执行，所以 `ra` 寄存器属于被调用者保存寄存器，`context` 成员就是用来保存这些的寄存器的。

专门有一组汇编指令用来交换当前 CPU 和指定进程的 `context`

```asm
swtch:
        sd ra, 0(a0)
        sd sp, 8(a0)
        sd s0, 16(a0)
        sd s1, 24(a0)
        sd s2, 32(a0)
        sd s3, 40(a0)
        sd s4, 48(a0)
        sd s5, 56(a0)
        sd s6, 64(a0)
        sd s7, 72(a0)
        sd s8, 80(a0)
        sd s9, 88(a0)
        sd s10, 96(a0)
        sd s11, 104(a0)

        ld ra, 0(a1)
        ld sp, 8(a1)
        ld s0, 16(a1)
        ld s1, 24(a1)
        ld s2, 32(a1)
        ld s3, 40(a1)
        ld s4, 48(a1)
        ld s5, 56(a1)
        ld s6, 64(a1)
        ld s7, 72(a1)
        ld s8, 80(a1)
        ld s9, 88(a1)
        ld s10, 96(a1)
        ld s11, 104(a1)
        
        ret
```

所以当调用了 `ret` 就会跳转到 `ra` 寄存器的地方开始执行，也就是之前写好的 `forkret()`

这里有点跳跃了，因为 `userinit` 之后，初始化工作都完成了之后，`main()` 会调用 `scheduler()`

```c
void
scheduler(void)
{
  struct proc *p;
  struct cpu *c = mycpu();

  c->proc = 0;
  for(;;){
    // The most recent process to run may have had interrupts
    // turned off; enable them to avoid a deadlock if all
    // processes are waiting.
    intr_on();

    int found = 0;
    for(p = proc; p < &proc[NPROC]; p++) {
      acquire(&p->lock);
      if(p->state == RUNNABLE) {
        // Switch to chosen process.  It is the process's job
        // to release its lock and then reacquire it
        // before jumping back to us.
        p->state = RUNNING;
        c->proc = p;
        swtch(&c->context, &p->context);

        // Process is done running for now.
        // It should have changed its p->state before coming back.
        c->proc = 0;
        found = 1;
      }
      release(&p->lock);
    }
    if(found == 0) {
      // nothing to run; stop running on this core until an interrupt.
      intr_on();
      asm volatile("wfi");
    }
  }
}
```

`scheduler` 涉及到对 `swtch()` 的调用，所以会执行到 `ret`

可以看出 xv6 的调度也很简单，就是轮询着看

`forkret()` 在最后会执行 `usertrapret()`，该函数会将当前 CPU 运行状态转换成用户态。

> 切换到用户态是通过 `status` 寄存器和 `sret` 指令实现的，`sret` 会将当前运行模式调整到 `status` 的 SPP 位所指定的模式
>
> When an SRET instruction is executed to return from the trap handler, the privilege level is set to user mode if the SPP bit is 0, or supervisor mode if the SPP bit is 1

`sret` 返回后，第一个程序就开始运行了 (?)

之后 trap 处理程序就被设定为了 `trampoline_uservec` 也就是用户态的 trap 处理程序，改代码会保存当前进程的状态，之后就跳转到 `usertrap()`，该函数会根据 `status` 寄存器的值判断应该怎么处理，而 syscall 就在这里被处理

```c
if(r_scause() == 8){
  // system call

  if(killed(p))
    exit(-1);

  // sepc points to the ecall instruction,
  // but we want to return to the next instruction.
  p->trapframe->epc += 4;

  // an interrupt will change sepc, scause, and sstatus,
  // so enable only now that we're done with those registers.
  intr_on();

  syscall();
}
```

到了 `syscall()` 中，它会遍历一个函数指针数组

```c
static uint64 (*syscalls[])(void) = {
[SYS_fork]    sys_fork,
[SYS_exit]    sys_exit,
[SYS_wait]    sys_wait,
[SYS_pipe]    sys_pipe,
[SYS_read]    sys_read,
[SYS_kill]    sys_kill,
[SYS_exec]    sys_exec,
[SYS_fstat]   sys_fstat,
[SYS_chdir]   sys_chdir,
[SYS_dup]     sys_dup,
[SYS_getpid]  sys_getpid,
[SYS_sbrk]    sys_sbrk,
[SYS_sleep]   sys_sleep,
[SYS_uptime]  sys_uptime,
[SYS_open]    sys_open,
[SYS_write]   sys_write,
[SYS_mknod]   sys_mknod,
[SYS_unlink]  sys_unlink,
[SYS_link]    sys_link,
[SYS_mkdir]   sys_mkdir,
[SYS_close]   sys_close,
};
```

根据系统调用号，也就是宏 `SYS_exec`，会调用对应的函数 `sys_exec`
