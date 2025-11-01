---
title: "Thread Sanitizer 分析"
author: suo yuan
date: 2025-10-17T9:44:28Z
draft: false
tags:
  - life
description: "这是我对 Thread Sanitizer 的分析讲解"
summary: "这是我对 Thread Sanitizer 的分析讲解"
---

# Thread Sanitizer 分析

Sanitizer 最早是由 Google 提出，一开始只有 ASAN (Address Sanitizer)，后来有了 Leak Sanitizer、Memory Sanitizer、Thread Sanitizer、Undefined Behavior Sanitizer

这几个 Sanitizer 中，我对 ASAN 最为熟悉一些，ASAN 可以检测越界访问、double free、内存泄漏等问题。C/C++ 这种名声在外的内存不安全的编程语言，当然应该使用 ASAN 这种内存检测手段排查问题。

ASAN 对内存和性能都有影响，所以不建议在 Release 版本中开启该功能，应该在 Debug 中开启。而 Linux 还有 [Kernel Address Sanitizer](https://www.kernel.org/doc/html/latest/dev-tools/kasan.html)
~~不过本文要讲述的当然不是 ASAN 的实现原理，我只是单纯说一下而已~~

TSAN，即 Thread Sanitizer 检测的是线程并发时的数据竞争问题，同时还可以检测死锁。TSAN 会造成比 ASAN 更严重的性能损耗，根据 [Clang 的文档](https://clang.llvm.org/docs/ThreadSanitizer.html)，TSAN 将会减速 5 ~ 15 倍，而带来的内存损耗是 5 ~ 10 倍，并且目前仍出于测试阶段。

TSAN 的核心是检测对相同内存访问之间的 happened-before 关系是否成立，即检测不同的访问之间是否存在顺序关系。

首先，我先介绍一下 vector clock 与 happened-before 关系的检测，之后介绍 TSAN 的实现

## Vector Clock

Vector Clock 是分布式中的概念，用来确定事件之间的顺序关系。

Vector Clock 可以简单的理解成一个 clock 组成的数组，其中有一个表示当前线程的 clock，其他的都是其他线程的。Vector Clock 存在以下规则

1. 初始值为 0
2. 每进行一个内部操作，自己线程所属的 clock 会加 1
3. 每向外发送和接受信息时，自己线程所属的 clock 加 1
4. 当接收到其他线程发送的 vector clock 时，需要与自己的 vector clock 中的每个 clock 比大小以更新自己的 vector clock

## Happened-before

什么是 Happened-before？[Happened-before](https://en.wikipedia.org/wiki/Happened-before) 所描述的就是两个事件之间的关系。

结合 Vector Clock 的话，我们可以通过每个事件的 Vector Clock 判断事件之间时候存在顺序关系，尤其是对不同的执行进程来说。

![happened-before](./images/tsan_rtl/happened-before.png)

从这里就能看出，我说的不同的执行进程是什么意思。P1 和 P2 之间的操作无法确定顺序关系，而 Vector Clock 的引入就是为了确定在不同执行进程中的事件的顺序关系。因为这里有通知操作（即 P1 和 P2 中的箭头），所以 sp3 之后的事件一定发生在了 ep2 之后，因为在通知的时候，P2 就得到了当时 P1 的 Vector Clock。

## 数据竞争检测

从这里就能看出利用了 Happened-before 的 TSAN 到底在做什么了，即记录下线程和内存的 Vector Clock，从而比较线程自己的 Vector Clock 和内存的 Vector Clock 时候存在顺序关系

那么什么是通知？获取锁和释放锁的时候会模拟通知的操作。锁也要有一个 Vector Clock，在释放锁的时候，线程的 Vector Clock 会覆盖掉锁的 Vector Clock，释放锁的时候会把锁的 Vector Clock 归并到线程里。

这里说的归并操作指的就是遍历自己和对方的 Vector Clock，依次比较每个元素，把数值大的放到自己的 Vector Clock 中。

![tsan-happend-before](./images/tsan_rtl/tsan-happend-before.png)

这张图展示了 TSAN 是如何使用 Vector Clock 判断访问事件之间的 Happened-before 关系的。这里的线程、锁和变量都有自己的 Vector Clock，这里的 Clock 是两个元素的原因就是有两个线程，Vector Clock 中左边的是 Thread A 的 local time，而右边的就是 Thread B 的 local time

在一开始，Thread A 先获取锁，由于锁的 Vector Clock 为 0，所以没有体现出归并的效果。之后 Thread A 又写了变量，这让变量的 Vector Clock 得以更新，之后释放锁时，锁的 Vector Clock 也被更新了。

> 这里我说的更新不是指只更新某个元素（比如 Thread A 访问的，只更新 Thread A 的 local time 就行了），而是直接覆盖

而 Thread B 获取锁时，也同样需要和锁的 Vector Clock 归并处理，此时由于锁的 Vector Clock 是 `(3, 0)`，所以 Thread B 的 Vector Clock 就变成了 `(3, 5)`

> 这里说的归并也就是遍历两个 Vector Clock，把每个元素的最大值放到一起

而 `(3, 5)` 是不小于 `(3, 0)` 的，也就可以通过检查。

如果说没有锁的参与，那么 Thread B 的 Vector Clock 就没办法被更新为 `(3, 5)` 而是 `(0, 5)`，那么比较时就能发现不满足 Happened-before，也就认为存在数据竞争

## 死锁检测

TSAN 本身就会劫持各种锁的调用，这里说的死锁检测就是每个线程都维护一个有向无环图，每个节点就是锁，边表示持有一个锁的情况下可以获取另一个锁

如果加入一个边导致成环，那么就认为存在死锁

## TSAN 实现

目前 LLVM compiler-rt 中的 TSAN 是 TSAN v3 算法，我对 v1 不太了解，v2 和 v3 有些类似，我这里当然介绍的是最新的实现。

首先，TSAN 不可能把所有线程的 clock 全都记录下来，毕竟每个线程都需要一份，每块内存需要一份，每个同步的锁也需要一份的话需要消耗很大的空间。目前来说，线程和锁持有一个固定大小的 vector clock，而针对内存来说，只会记录最近 4 次的访问记录。

TSAN 对 8 字节内存记录 4 次相关的访问记录，这 8 字节是一个 shadow cell，即每 shadow cell 有 4 个 shadow，其中 shadow 的结构为：

|字段|大小|
|:--|:--|
|offset|8 bits|
|sid|8 bits|
|clock|14 bits|
|is read|1 bit|
|is atomic|1 bit|

clock 被实现为一个 14 bit 大小的无符号整数，这是为了给 shadow 的类型 2 bit 的空间，这样 shadow 整体就占 4 字节。每 8 字节的内存要配 16 字节的 shadow memory

14 bit 并不算大（现在 time_t 都要 64 bit 了），所以 clock 随着运行时间的增长是很容易溢出的。这里需要介绍的是为什么是 sid 而不是 tid

sid 说的是 slot id，TSAN 全局会维护一组 slot，所有 TSAN 中涉及到线程的操作都需要和一个 slot 绑定并上锁，而线程维护的 Vector Clock 也是和全局的 slot 个数保持一致

ThreadState 是存储在 TLS 中的，而如果 TSAN 发现这个 ThreadState 绑定的 slot 的 clock 要溢出了之后就要重新绑定一个新的 slot 并上锁。全局的 slot 共有 256 个，如果已经没有可以分配的 slot 了，那么就要开启重置工作：重置所有的 slot、shadow memory 等。

TSAN 的插桩并不会在线程创建、锁的创建时插桩，所以 compiler-rt 需要主动劫持 pthread 库函数。

TSAN 会注册名为 `pthread_create` 等和那些库函数同名的弱符号，并将这个符号指向 TSAN 劫持的函数。

```cpp
typedef int (*pthread_create_type)(void* th, void* attr,
                                   void* (*callback)(void*), void* param);
namespace __interception {
pthread_create_type real_pthread_create;
}
extern "C" int pthread_create(void* th, void* attr, void* (*callback)(void*),
                              void* param);
extern "C" int __interceptor_trampoline_pthread_create(void* th, void* attr,
                                                       void* (*callback)(void*),
                                                       void* param);
extern "C" int __interceptor_pthread_create(void* th, void* attr,
                                            void* (*callback)(void*),
                                            void* param)
    __attribute__((visibility("default"))) __attribute__((weak))
    __attribute__((alias("___interceptor_pthread_create")));

asm(".text\n"
    ".weak "
    "pthread_create"
    "\n"
    ".set "
    "pthread_create"
    ", "
    "__interceptor_trampoline_pthread_create"
    "\n"
    ".globl "
    "__interceptor_trampoline_pthread_create"
    "\n"
    ".type  "
    "__interceptor_trampoline_pthread_create"
    ", "
    "@function"
    "\n"
    "__interceptor_trampoline_pthread_create"
    ":\n"
    ".cfi_startproc"
    "\n"
    "jmp"
    " "
    "__interceptor_"
    "pthread_create@plt"
    "\n"
    ".cfi_endproc"
    "\n"
    ".size  "
    "__interceptor_trampoline_pthread_create"
    ", "
    ".-"
    "__interceptor_trampoline_pthread_create"
    "\n");
```

TSAN 在运行时启动的时候会找到所有真的库函数，并存储到提前写好的位置，用于在劫持的函数中调用真实的库函数。

TSAN 要劫持的函数有：

```cpp
TSAN_INTERCEPTOR(unsigned, sleep, unsigned sec) {
TSAN_INTERCEPTOR(int, usleep, long_t usec) {
TSAN_INTERCEPTOR(int, nanosleep, void *req, void *rem) {
TSAN_INTERCEPTOR(int, pause, int fake) {
TSAN_INTERCEPTOR(int, atexit, void (*f)()) {
TSAN_INTERCEPTOR(int, __cxa_atexit, void (*f)(void *a), void *arg, void *dso) {
TSAN_INTERCEPTOR(int, on_exit, void(*f)(int, void*), void *arg) {
TSAN_INTERCEPTOR(int, setjmp, void *env);
TSAN_INTERCEPTOR(int, _setjmp, void *env);
TSAN_INTERCEPTOR(int, sigsetjmp, void *env);
TSAN_INTERCEPTOR(void, longjmp_symname, uptr *env, int val) {
TSAN_INTERCEPTOR(void, siglongjmp_symname, uptr *env, int val) {
TSAN_INTERCEPTOR(void, _longjmp, uptr *env, int val) {
TSAN_INTERCEPTOR(void*, malloc, uptr size) {
TSAN_INTERCEPTOR(void*, __libc_memalign, uptr align, uptr sz) {
TSAN_INTERCEPTOR(void *, calloc, uptr n, uptr size) {
TSAN_INTERCEPTOR(void*, realloc, void *p, uptr size) {
TSAN_INTERCEPTOR(void *, reallocarray, void *p, uptr n, uptr size) {
TSAN_INTERCEPTOR(void, free, void *p) {
TSAN_INTERCEPTOR(void, free_sized, void *p, uptr size) {
TSAN_INTERCEPTOR(void, free_aligned_sized, void *p, uptr alignment, uptr size) {
TSAN_INTERCEPTOR(void, cfree, void *p) {
TSAN_INTERCEPTOR(uptr, malloc_usable_size, void *p) {
TSAN_INTERCEPTOR(char *, strcpy, char *dst, const char *src) {
TSAN_INTERCEPTOR(char*, strncpy, char *dst, char *src, usize n) {
TSAN_INTERCEPTOR(char*, strdup, const char *str) {
TSAN_INTERCEPTOR(void*, memalign, uptr align, uptr sz) {
TSAN_INTERCEPTOR(void*, aligned_alloc, uptr align, uptr sz) {
TSAN_INTERCEPTOR(void*, valloc, uptr sz) {
TSAN_INTERCEPTOR(void*, pvalloc, uptr sz) {
TSAN_INTERCEPTOR(int, posix_memalign, void **memptr, uptr align, uptr sz) {
TSAN_INTERCEPTOR(int, pthread_create,
TSAN_INTERCEPTOR(int, pthread_join, void *th, void **ret) {
TSAN_INTERCEPTOR(int, pthread_detach, void *th) {
TSAN_INTERCEPTOR(void, pthread_exit, void *retval) {
TSAN_INTERCEPTOR(int, pthread_tryjoin_np, void *th, void **ret) {
TSAN_INTERCEPTOR(int, pthread_timedjoin_np, void *th, void **ret,
TSAN_INTERCEPTOR(int, pthread_mutex_init, void *m, void *a) {
TSAN_INTERCEPTOR(int, pthread_mutex_destroy, void *m) {
TSAN_INTERCEPTOR(int, pthread_mutex_lock, void *m) {
TSAN_INTERCEPTOR(int, pthread_mutex_trylock, void *m) {
TSAN_INTERCEPTOR(int, pthread_mutex_timedlock, void *m, void *abstime) {
TSAN_INTERCEPTOR(int, pthread_mutex_unlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_mutex_clocklock, void *m,
TSAN_INTERCEPTOR(int, __pthread_mutex_lock, void *m) {
TSAN_INTERCEPTOR(int, __pthread_mutex_unlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_spin_init, void *m, int pshared) {
TSAN_INTERCEPTOR(int, pthread_spin_destroy, void *m) {
TSAN_INTERCEPTOR(int, pthread_spin_lock, void *m) {
TSAN_INTERCEPTOR(int, pthread_spin_trylock, void *m) {
TSAN_INTERCEPTOR(int, pthread_spin_unlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_init, void *m, void *a) {
TSAN_INTERCEPTOR(int, pthread_rwlock_destroy, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_rdlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_tryrdlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_timedrdlock, void *m, void *abstime) {
TSAN_INTERCEPTOR(int, pthread_rwlock_wrlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_trywrlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_rwlock_timedwrlock, void *m, void *abstime) {
TSAN_INTERCEPTOR(int, pthread_rwlock_unlock, void *m) {
TSAN_INTERCEPTOR(int, pthread_barrier_init, void *b, void *a, unsigned count) {
TSAN_INTERCEPTOR(int, pthread_barrier_destroy, void *b) {
TSAN_INTERCEPTOR(int, pthread_barrier_wait, void *b) {
TSAN_INTERCEPTOR(int, pthread_once, void *o, void (*f)()) {
TSAN_INTERCEPTOR(int, __fxstat, int version, int fd, void *buf) {
TSAN_INTERCEPTOR(int, __fxstat64, int version, int fd, void *buf) {
TSAN_INTERCEPTOR(int, fstat, int fd, void *buf) {
TSAN_INTERCEPTOR(int, fstat64, int fd, void *buf) {
TSAN_INTERCEPTOR(int, open, const char *name, int oflag, ...) {
TSAN_INTERCEPTOR(int, open64, const char *name, int oflag, ...) {
TSAN_INTERCEPTOR(int, creat, const char *name, int mode) {
TSAN_INTERCEPTOR(int, creat64, const char *name, int mode) {
TSAN_INTERCEPTOR(int, dup, int oldfd) {
TSAN_INTERCEPTOR(int, dup2, int oldfd, int newfd) {
TSAN_INTERCEPTOR(int, dup3, int oldfd, int newfd, int flags) {
TSAN_INTERCEPTOR(int, eventfd, unsigned initval, int flags) {
TSAN_INTERCEPTOR(int, signalfd, int fd, void *mask, int flags) {
TSAN_INTERCEPTOR(int, inotify_init, int fake) {
TSAN_INTERCEPTOR(int, inotify_init1, int flags) {
TSAN_INTERCEPTOR(int, socket, int domain, int type, int protocol) {
TSAN_INTERCEPTOR(int, socketpair, int domain, int type, int protocol, int *fd) {
TSAN_INTERCEPTOR(int, connect, int fd, void *addr, unsigned addrlen) {
TSAN_INTERCEPTOR(int, bind, int fd, void *addr, unsigned addrlen) {
TSAN_INTERCEPTOR(int, listen, int fd, int backlog) {
TSAN_INTERCEPTOR(int, close, int fd) {
TSAN_INTERCEPTOR(int, __close, int fd) {
TSAN_INTERCEPTOR(void, __res_iclose, void *state, bool free_addr) {
TSAN_INTERCEPTOR(int, pipe, int *pipefd) {
TSAN_INTERCEPTOR(int, pipe2, int *pipefd, int flags) {
TSAN_INTERCEPTOR(int, unlink, char *path) {
TSAN_INTERCEPTOR(void*, tmpfile, int fake) {
TSAN_INTERCEPTOR(void*, tmpfile64, int fake) {
TSAN_INTERCEPTOR(void, abort, int fake) {
TSAN_INTERCEPTOR(int, rmdir, char *path) {
TSAN_INTERCEPTOR(int, closedir, void *dirp) {
TSAN_INTERCEPTOR(int, epoll_create, int size) {
TSAN_INTERCEPTOR(int, epoll_create1, int flags) {
TSAN_INTERCEPTOR(int, epoll_ctl, int epfd, int op, int fd, void *ev) {
TSAN_INTERCEPTOR(int, epoll_wait, int epfd, void *ev, int cnt, int timeout) {
TSAN_INTERCEPTOR(int, epoll_pwait, int epfd, void *ev, int cnt, int timeout,
TSAN_INTERCEPTOR(int, epoll_pwait2, int epfd, void *ev, int cnt, void *timeout,
TSAN_INTERCEPTOR(int, sigsuspend, const __sanitizer_sigset_t *mask) {
TSAN_INTERCEPTOR(int, sigblock, int mask) {
TSAN_INTERCEPTOR(int, sigsetmask, int mask) {
TSAN_INTERCEPTOR(int, pthread_sigmask, int how, const __sanitizer_sigset_t *set,
TSAN_INTERCEPTOR(int, raise, int sig) {
TSAN_INTERCEPTOR(int, kill, int pid, int sig) {
TSAN_INTERCEPTOR(int, pthread_kill, void *tid, int sig) {
TSAN_INTERCEPTOR(int, gettimeofday, void *tv, void *tz) {
TSAN_INTERCEPTOR(int, getaddrinfo, void *node, void *service,
TSAN_INTERCEPTOR(int, fork, int fake) {
TSAN_INTERCEPTOR(int, vfork, int fake) {
TSAN_INTERCEPTOR(int, clone, int (*fn)(void *), void *stack, int flags,
TSAN_INTERCEPTOR(int, dl_iterate_phdr, dl_iterate_phdr_cb_t cb, void *data) {
TSAN_INTERCEPTOR(void *, __tls_get_addr, void *arg) {
TSAN_INTERCEPTOR(uptr, __tls_get_addr_internal, void *arg) {
TSAN_INTERCEPTOR(void, _lwp_exit) {
TSAN_INTERCEPTOR(void, thr_exit, ThreadID *state) {
```

TSAN 对每个架构的 shadow memory 都有单独设定

```cpp
/*
C/C++ on linux/x86_64 and freebsd/x86_64
0000 0000 1000 - 0200 0000 0000: main binary and/or MAP_32BIT mappings (2TB)
0200 0000 0000 - 1000 0000 0000: -
1000 0000 0000 - 3000 0000 0000: shadow (32TB)
3000 0000 0000 - 3800 0000 0000: metainfo (memory blocks and sync objects; 8TB)
3800 0000 0000 - 5500 0000 0000: -
5500 0000 0000 - 5a00 0000 0000: pie binaries without ASLR or on 4.1+ kernels
5a00 0000 0000 - 7200 0000 0000: -
7200 0000 0000 - 7300 0000 0000: heap (1TB)
7300 0000 0000 - 7a00 0000 0000: -
7a00 0000 0000 - 8000 0000 0000: modules and main thread stack (6TB)

C/C++ on netbsd/amd64 can reuse the same mapping:
 * The address space starts from 0x1000 (option with 0x0) and ends with
   0x7f7ffffff000.
 * LoAppMem-kHeapMemEnd can be reused as it is.
 * No VDSO support.
 * No MidAppMem region.
 * No additional HeapMem region.
 * HiAppMem contains the stack, loader, shared libraries and heap.
 * Stack on NetBSD/amd64 has prereserved 128MB.
 * Heap grows downwards (top-down).
 * ASLR must be disabled per-process or globally.
*/
struct Mapping48AddressSpace {
  static const uptr kMetaShadowBeg = 0x300000000000ull;
  static const uptr kMetaShadowEnd = 0x380000000000ull;
  static const uptr kShadowBeg = 0x100000000000ull;
  static const uptr kShadowEnd = 0x300000000000ull;
  static const uptr kHeapMemBeg = 0x720000000000ull;
  static const uptr kHeapMemEnd = 0x730000000000ull;
  static const uptr kLoAppMemBeg   = 0x000000001000ull;
  static const uptr kLoAppMemEnd = 0x020000000000ull;
  static const uptr kMidAppMemBeg  = 0x550000000000ull;
  static const uptr kMidAppMemEnd = 0x5a0000000000ull;
  static const uptr kHiAppMemBeg = 0x7a0000000000ull;
  static const uptr kHiAppMemEnd   = 0x800000000000ull;
  static const uptr kShadowMsk = 0x700000000000ull;
  static const uptr kShadowXor = 0x000000000000ull;
  static const uptr kShadowAdd = 0x100000000000ull;
  static const uptr kVdsoBeg       = 0xf000000000000000ull;
};
```

这些内存只是申请而已，用到了才会真正分配
