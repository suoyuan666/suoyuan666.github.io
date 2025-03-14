---
title: "xv6-riscv 源码阅读 —— 用户态: libc"
author: suo yuan
pubDatetime: 2025-01-17T11:45:06Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 读一遍，这是用户态的 libc 部分，一个小小小小小型的标准库"
summary: "尝试把 xv6-riscv 读一遍，这是用户态的 libc 部分，一个小小小小小型的标准库"
---

# ulibc

xv6-riscv 实现了一个简单基础的 libc

```Makefile
ULIB = $U/ulib.o $U/usys.o $U/printf.o $U/umalloc.o
```

由此可知，其由 ulib.c、printf.c、umalloc.c 和 usys.pl 组成

## printf.c

首先，`printf` 基本就是对可变参数进行了处理，并调用 `vprintf`

```c
void
printf(const char *fmt, ...)
{
  va_list ap;

  va_start(ap, fmt);
  vprintf(1, fmt, ap);
}
```

`va_list` 来自 `#include <stdarg.h>`

```c
// Print to the given fd. Only understands %d, %x, %p, %s.
void
vprintf(int fd, const char *fmt, va_list ap)
{
  char *s;
  int c0, c1, c2, i, state;

  state = 0;
  for(i = 0; fmt[i]; i++){
    c0 = fmt[i] & 0xff;
    if(state == 0){
      if(c0 == '%'){
        state = '%';
      } else {
        putc(fd, c0);
      }
    } else if(state == '%'){
      c1 = c2 = 0;
      if(c0) c1 = fmt[i+1] & 0xff;
      if(c1) c2 = fmt[i+2] & 0xff;
      if(c0 == 'd'){
        printint(fd, va_arg(ap, int), 10, 1);
      } else if(c0 == 'l' && c1 == 'd'){
        printint(fd, va_arg(ap, uint64), 10, 1);
        i += 1;
      } else if(c0 == 'l' && c1 == 'l' && c2 == 'd'){
        printint(fd, va_arg(ap, uint64), 10, 1);
        i += 2;
      } else if(c0 == 'u'){
        printint(fd, va_arg(ap, int), 10, 0);
      } else if(c0 == 'l' && c1 == 'u'){
        printint(fd, va_arg(ap, uint64), 10, 0);
        i += 1;
      } else if(c0 == 'l' && c1 == 'l' && c2 == 'u'){
        printint(fd, va_arg(ap, uint64), 10, 0);
        i += 2;
      } else if(c0 == 'x'){
        printint(fd, va_arg(ap, int), 16, 0);
      } else if(c0 == 'l' && c1 == 'x'){
        printint(fd, va_arg(ap, uint64), 16, 0);
        i += 1;
      } else if(c0 == 'l' && c1 == 'l' && c2 == 'x'){
        printint(fd, va_arg(ap, uint64), 16, 0);
        i += 2;
      } else if(c0 == 'p'){
        printptr(fd, va_arg(ap, uint64));
      } else if(c0 == 's'){
        if((s = va_arg(ap, char*)) == 0)
          s = "(null)";
        for(; *s; s++)
          putc(fd, *s);
      } else if(c0 == '%'){
        putc(fd, '%');
      } else {
        // Unknown % sequence.  Print it to draw attention.
        putc(fd, '%');
        putc(fd, c0);
      }

      state = 0;
    }
  }
}
```

ulib 实现的 `vprintf` 是比较简单的，只支持部分占位符

`c0 = fmt[i] & 0xff` 的用处我暂时还没清晰的看到，无论是否和 `0xff` 按位与，都是那个值。

之后看当前打印的字符是占位符的 `%` 还是正常字符，正常字符就调用 `putc`，`putc` 会直接调用 `write` 系统调用从而打印出来。

> 系统调用
>
> 系统调用是操作系统内核暴露给应用程序的接口，Unix 通过 `write` 系统调用向指定的文件描述符写入内容
>
> 在自己的终端上执行 `man 2 write` 可以查看 Linux kernel 的 `write` 系统调用的接口描述
>
> ssize_t write(int fd, const void buf[.count], size_t count);

xv6-riscv 的系统调用和 libc 的函数原型都定义在了 user/user.h 文件中

```c
int write(int, const void*, int);
```

如果是占位符，就将 `state` 的值修改，这样等下一轮循环的时候，就会根据 `state` 的值跳到正确的处理逻辑。

这里利用了 `printint(int fd, int xx, int base, int sgn)` 和 `va_arg(ap, type)` 完成将值根据占位符做格式转换并输出的目的

```c
static void
printint(int fd, int xx, int base, int sgn)
{
  char buf[16];
  int i, neg;
  uint x;

  neg = 0;
  if(sgn && xx < 0){
    neg = 1;
    x = -xx;
  } else {
    x = xx;
  }

  i = 0;
  do{
    buf[i++] = digits[x % base];
  }while((x /= base) != 0);
  if(neg)
    buf[i++] = '-';

  while(--i >= 0)
    putc(fd, buf[i]);
}
```

`va_arg` 会根据参数指定的类型把参数列表的值返回出来。`base` 是指当前值的进制表示，`sgn` 指是否为 `signed`

这个函数也比较简单，就是根据是否为 `signed` 从而判断是否存在负数的问题，之后把数字每一位都赋给 `buf`，然后遍历 `buf` 的每个字符，都调用一遍 `putc`。

## umalloc.c

这部分的代码实现来自 K&R 的 malloc 的实现

涉及到了一些自定义的类型：

```c
typedef long Align;

union header {
  struct {
    union header *ptr;
    uint size;
  } s;
  Align x;
};

typedef union header Header;

static Header base;
static Header *freep;
```

```c
void*
malloc(uint nbytes)
{
  Header *p, *prevp;
  uint nunits;

  nunits = (nbytes + sizeof(Header) - 1)/sizeof(Header) + 1;
  if((prevp = freep) == 0){
    base.s.ptr = freep = prevp = &base;
    base.s.size = 0;
  }
  for(p = prevp->s.ptr; ; prevp = p, p = p->s.ptr){
    if(p->s.size >= nunits){
      if(p->s.size == nunits)
        prevp->s.ptr = p->s.ptr;
      else {
        p->s.size -= nunits;
        p += p->s.size;
        p->s.size = nunits;
      }
      freep = prevp;
      return (void*)(p + 1);
    }
    if(p == freep)
      if((p = morecore(nunits)) == 0)
        return 0;
  }
}
```

`nunits` 的计算中，`(nbytes + sizeof(Header) -1)/sizeof(Header)` 是为了向上取整，再 `+1` 是给 `Header` 预留空间

`(prevp = freep)` 会产生一个返回值，也就是赋的值，所以这段代码用来做初始化工作

之后的 `for` 循环中

```c
for(p = prevp->s.ptr; ; prevp = p, p = p->s.ptr){
  if(p->s.size >= nunits){
    if(p->s.size == nunits)
        prevp->s.ptr = p->s.ptr;
    else {
      p->s.size -= nunits;
      p += p->s.size;
      p->s.size = nunits;
    }
    freep = prevp;
    return (void*)(p + 1);
  }
  if(p == freep)
    if((p = morecore(nunits)) == 0)
      return 0;
}
```

这里就是遍历释放的列表，然后如果能大小合适就给它，如果不合适的话，就调用 `morecore` 分配一次在 `free` 掉，之后在下一轮循环分配给它。

```c
static Header*
morecore(uint nu)
{
  char *p;
  Header *hp;

  if(nu < 4096)
    nu = 4096;
  p = sbrk(nu * sizeof(Header));
  if(p == (char*)-1)
    return 0;
  hp = (Header*)p;
  hp->s.size = nu;
  free((void*)(hp + 1));
  return freep;
}
```

这里涉及到 `sbrk` 系统调用，用于获取内存空间


```c
void
free(void *ap)
{
  Header *bp, *p;

  bp = (Header*)ap - 1;
  for(p = freep; !(bp > p && bp < p->s.ptr); p = p->s.ptr)
    if(p >= p->s.ptr && (bp > p || bp < p->s.ptr))
      break;
  if(bp + bp->s.size == p->s.ptr){
    bp->s.size += p->s.ptr->s.size;
    bp->s.ptr = p->s.ptr->s.ptr;
  } else
    bp->s.ptr = p->s.ptr;
  if(p + p->s.size == bp){
    p->s.size += bp->s.size;
    p->s.ptr = bp->s.ptr;
  } else
    p->s.ptr = bp;
  freep = p;
}
```

`for` 循环用来找到要回收的地址的相近的节点

而之后的两组 `if` 都是为了回收这部分地址，我画了一个简单的草图用于方便理解

![free_p_with_bp](/img/xv6-riscv-read/user/free_p_with_bp.svg)

从这里需要 `-1` 也能看出之前计算 `nunits` 最后 `+1` 操作的用处

## ulib.c

ulib.c 中基本就是一些字符操作相关的函数了，比如 `strlen`、`memset`、`atoi` 之类的

基本都是一些简单的实现，没什么可说的

## usys.pl

```perl
#!/usr/bin/perl -w

# Generate usys.S, the stubs for syscalls.

print "# generated by usys.pl - do not edit\n";

print "#include \"kernel/syscall.h\"\n";

sub entry {
    my $name = shift;
    print ".global $name\n";
    print "${name}:\n";
    print " li a7, SYS_${name}\n";
    print " ecall\n";
    print " ret\n";
}
	
entry("fork");
entry("exit");
entry("wait");
entry("pipe");
entry("read");
entry("write");
entry("close");
entry("kill");
entry("exec");
entry("open");
entry("mknod");
entry("unlink");
entry("fstat");
entry("link");
entry("mkdir");
entry("chdir");
entry("dup");
entry("getpid");
entry("sbrk");
entry("sleep");
entry("uptime");
```

这涉及到一个古老的脚本语言 [Perl](https://en.wikipedia.org/wiki/Perl)

该脚本会生成一份汇编代码文件

```asm
# generated by usys.pl - do not edit
#include "kernel/syscall.h"
.global fork
fork:
 li a7, SYS_fork
 ecall
 ret
.global exit
exit:
 li a7, SYS_exit
 ecall
 ret
.global wait
wait:
 li a7, SYS_wait
 ecall
 ret
.global pipe
pipe:
 li a7, SYS_pipe
 ecall
 ret
.global read
read:
 li a7, SYS_read
 ecall
 ret
.global write
write:
 li a7, SYS_write
 ecall
 ret
.global close
close:
 li a7, SYS_close
 ecall
 ret
.global kill
kill:
 li a7, SYS_kill
 ecall
 ret
.global exec
exec:
 li a7, SYS_exec
 ecall
 ret
.global open
open:
 li a7, SYS_open
 ecall
 ret
.global mknod
mknod:
 li a7, SYS_mknod
 ecall
 ret
.global unlink
unlink:
 li a7, SYS_unlink
 ecall
 ret
.global fstat
fstat:
 li a7, SYS_fstat
 ecall
 ret
.global link
link:
 li a7, SYS_link
 ecall
 ret
.global mkdir
mkdir:
 li a7, SYS_mkdir
 ecall
 ret
.global chdir
chdir:
 li a7, SYS_chdir
 ecall
 ret
.global dup
dup:
 li a7, SYS_dup
 ecall
 ret
.global getpid
getpid:
 li a7, SYS_getpid
 ecall
 ret
.global sbrk
sbrk:
 li a7, SYS_sbrk
 ecall
 ret
.global sleep
sleep:
 li a7, SYS_sleep
 ecall
 ret
.global uptime
uptime:
 li a7, SYS_uptime
 ecall
 ret
```

用来处理系统调用跳转的，RISC-V 规定了 `a7` 寄存器用于存放系统调用号，而 `ecall` 用于调用系统调用，amd64 结构也有类似的指令 `syscall`
