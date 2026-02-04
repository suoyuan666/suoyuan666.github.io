---
title: "Kernel Concurrency Sanitizer 分析"
author: suo yuan
date: 2025-10-17T21:44:28Z
draft: false
description: "这是我对 Kernel Concurrency Sanitizer 的分析讲解"
summary: "这是我对 Kernel Concurrency Sanitizer 的分析讲解"
---

KCSAN (Kernel Concurrency Sanitizer) 是 Linux 应对数据竞争问题的检测机制。

为什么 Linux 不像 KASAN 一样实现一个 KTSAN 呢，因为 KTSAN 会造成大量的内存浪费。Google 曾经尝试过实现 KTSAN，当时 TSAN 使用的还是 TSAN v2 算法，1 页就要有 4 页的 shadow memory，根据 Linux KCSAN 的文档描述，可能会造成数十 GB 的内存损耗，于是就没有使用。

KCSAN 只是检测算法和 TSAN 不同，但都依赖于 `-fsanitize=thread` 对内存访问进行插桩。

KCSAN 的检测机制是利用编译器对内存访问插桩，并且随机的在某次访问记录本次访问记录，并将当前的线程停住一段随机的时间，增大其他线程访问该内存的概率。

如果在此期间发现其他线程要访问这块内存，或者这块内存对应的值被修改了，就报告存在数据竞争。

## 数据竞争检测

KCSAN 会将内存访问编码为一个 watchpoint，每次内存访问都要检查本次内存访问时候有对应的 watchpoint，如果存在就代表发生了数据竞争。

watchpoint 的编码机制是：

```c
static inline long
encode_watchpoint(unsigned long addr, size_t size, bool is_write)
{
        return (long)((is_write ? WATCHPOINT_WRITE_MASK : 0) |
                      (size << WATCHPOINT_ADDR_BITS) |
                      (addr & WATCHPOINT_ADDR_MASK));
}
```

从这可以看出，地址的最高位代表类型，后面跟着的 12 bit 是 size（因为一页是 2^12 字节），剩下的是地址的原有内容。这会导致地址高位的精度缺失，但这不会导致误报。

因为根据地址查找 watchpoint 的逻辑是看这个地址所在页的页号相关，只有它们的页号接近的情况下，才能因为地址精度缺失导致误报。即使真的出现了这个情况，在真正报告数据竞争时也可以剔除掉，所以不会导致误报。这种误报也基本是针对 32 位系统来说，因为目前来看，64 位的地址高位还没有被用到。

```c
static __always_inline int watchpoint_slot(unsigned long addr)
{
        return (addr / PAGE_SIZE) % CONFIG_KCSAN_NUM_WATCHPOINTS;
}
```

KCSAN 会设置一个随机数，并且每次访问都 -1，直到减到负数就开始设置 watchpoint，并重置这个随机数

设置 watchpoint 可能会失败，因为当前可能没有 watchpoint 的空间了（watchpoint 被存储在一个数组中）

如果设置成功，那么就让这个线程让出执行，让其他线程访问。每次访问时都会检测本次访问的地址时候存在一个对应的 watchpoint，如果存在的话就尝试将这个 watchpoint 重置，重置成功就代表这次访问就是导致数据竞争的一员。

让出线程之前会读取这个地址的值，等后续 delay 结束后会再次读取，并比较时候相等。这是为了抓到 watchpoint 完好无损，但确实有线程修改了这块内存地情况，KCSAN 将其称为 unknown origin

> A common reason for reports of this type are missing instrumentation in the racing thread, but could also occur due to e.g. DMA accesses. Such reports are shown only if `CONFIG_KCSAN_REPORT_RACE_UNKNOWN_ORIGIN=y`, which is enabled by default.

## 报告处理

一般的报告就是：

```txt
==================================================================
BUG: KCSAN: data-race in test_kernel_read / test_kernel_write

write to 0xffffffffc009a628 of 8 bytes by task 487 on cpu 0:
 test_kernel_write+0x1d/0x30
 access_thread+0x89/0xd0
 kthread+0x23e/0x260
 ret_from_fork+0x22/0x30

read to 0xffffffffc009a628 of 8 bytes by task 488 on cpu 6:
 test_kernel_read+0x10/0x20
 access_thread+0x89/0xd0
 kthread+0x23e/0x260
 ret_from_fork+0x22/0x30

value changed: 0x00000000000009a6 -> 0x00000000000009b2

Reported by Kernel Concurrency Sanitizer on:
CPU: 6 PID: 488 Comm: access_thread Not tainted 5.12.0-rc2+ #1
Hardware name: QEMU Standard PC (i440FX + PIIX, 1996), BIOS 1.14.0-2 04/01/2014
==================================================================
```

对于 unknown origin 的数据竞争，就会：

```txt
==================================================================
BUG: KCSAN: data-race in test_kernel_rmw_array+0x71/0xd0

race at unknown origin, with read to 0xffffffffc009bdb0 of 8 bytes by task 515 on cpu 2:
 test_kernel_rmw_array+0x71/0xd0
 access_thread+0x89/0xd0
 kthread+0x23e/0x260
 ret_from_fork+0x22/0x30

value changed: 0x0000000000002328 -> 0x0000000000002329

Reported by Kernel Concurrency Sanitizer on:
CPU: 2 PID: 515 Comm: access_thread Not tainted 5.12.0-rc2+ #1
Hardware name: QEMU Standard PC (i440FX + PIIX, 1996), BIOS 1.14.0-2 04/01/2014
==================================================================
```

这里提一下为什么编码后的 watchpoint 即使存在高位地址精度丢失也不会导致误报的原因

因为报告数据竞争是在 delay 之后被调用，即 `kcsan_setup_watchpoint` 调用 `kcsan_report_know_origin`，而 `kcsan_setup_watchpoint` 持有原有的 `addr`，所以 `kcsan_report_know_origin` 可以根据 `addr` 检查一遍，下方代码的 `ai->ptr` 就是 `addr`

```c
/* Should always have a matching access based on watchpoint encoding. */
if (WARN_ON(!matching_access((unsigned long)other_info->ai.ptr & WATCHPOINT_ADDR_MASK, other_info->ai.size,
                             (unsigned long)ai->ptr & WATCHPOINT_ADDR_MASK, ai->size)))
        goto discard;

if (!matching_access((unsigned long)other_info->ai.ptr, other_info->ai.size,
                     (unsigned long)ai->ptr, ai->size)) {
        /*
         * If the actual accesses to not match, this was a false
         * positive due to watchpoint encoding.
         */
        atomic_long_inc(&kcsan_counters[KCSAN_COUNTER_ENCODING_FALSE_POSITIVES]);
        goto discard;
}
```

## 特殊处理：弱内存模型

对于以 ARM/RISC-V 架构为代表的 weak/relaxed memory model 的 CPU 来说，其 CPU 内部的内存访问顺序不是确定的，CPU 内部会为了优化，对 load 和 store 的顺序重新排列。

![weak-memory](./images/kcsan_rtl/weak-memory.png)

> 图片来源: https://www.cl.cam.ac.uk/~pes20/ppc-supplemental/test7.pdf

KCSAN 支持对内存访问重排的模拟，不过也只是支持延迟了内存访问的模拟。

KCSAN 会记录当前的内存访问信息，并在接下来的每次内存访问中都试图在检测的末尾重新发起一边对这个已记录的内存访问的数据竞争检测，即模拟这个访问被推迟的情况。直到遇到了内存屏障或者当前函数的结尾，KCSAN 才会停止对这个内存访问推迟的模拟。
