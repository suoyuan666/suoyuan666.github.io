---
title: "musl libc 阅读记录: printf"
author: suo yuan
date: 2023-04-22T03:42:51Z
draft: false
categories:
  - 源码阅读
tags:
  - musl libc
description:
  "不自量力阅读 musl libc 的记录"
---

<!--more-->
不自量力阅读 musl libc的记录
<!--more-->

# printf

## printf function

函数原型

```c
int printf(const char *restrict fmt, ...);
```

这里是使用了可变参数，`printf()`函数的大部分也是在对可变参数做处理，把处理好的结果传给另一个函数。关于处理可变参数的那些函数的作用可以在Linux manual pages中查到。

```bash
$ man 3 va_list
$ man 3 stdarg
```

> The va_start() macro initializes ap for subsequent use by va_arg() and va_end(), and must be called first.

处理了可变参数后，随即就调用了`vfprintf()`函数，通过传参的方式把处理的结果传过去了。

## vfprintf function

函数原型

```c
int vfprintf(FILE *restrict f, const char *restrict fmt, va_list ap);
```


函数内部首先定义了一批局部变量，随即使用`va_copy()`去复制一个ap出来，随即使用`printf_core()`向文件描述符0写数据从而测试参数是否存在什么问题。

```c
va_copy(ap2, ap);
if (printf_core(0, fmt, &ap2, nl_arg, nl_type) < 0) {
	va_end(ap2);
	return -1;
}
```

---

关于我说的这个第一次`printf_core()`函数的作用，有人发邮件问过musl libc的开发者，开发者给出的回复是：

> First call to printf_core() checks to see if there are any major&nbsp;problems with the format string.

当说到第二次的调用也可以做到check的效果时，开发者回复：

> POSIX says that to the extent possible, all functions are supposed to either fail with no side effects or succeed with side effects. There are some functions that can fail with side effects, but we make some effort to minimize that. By testing the format string first, if it is broken, we can fail without side effects. If only the second call tested that, you would get a partial output before failure.

---

至于为什么要使用`va_copy()`再整个va_list出来，我认为大抵是为了保证函数内部的封闭性，我这里说的封闭性就是尽量不使用外部的变量，va\_list传进来貌似是指针形式传递进来的，为了不影响到外部的变量，故而复制一份出来。

之后便是给f上个锁，再保存一下之前的错误位，然后把错误位设置为0

```c
FLOCK(f);
olderr = f->flags & F_ERR;
f->flags &= ~F_ERR;
```

而后看f的buf size是否为0，为0的话就临时把之前定义好的intelnal_buf作为f的buf使用。

```c
	if (!f->buf_size) {
		saved_buf = f->buf;
		f->buf = internal_buf;
		f->buf_size = sizeof internal_buf;
		f->wpos = f->wbase = f->wend = 0;
	}
```

之后再做一个判断，就要开始真正往stdout写数据了

```c
if (!f->wend && __towrite(f)) ret = -1;
else ret = printf_core(f, fmt, &ap2, nl_arg, nl_type);
```

之后就是对f原本buf的恢复

```c
if (saved_buf) {
	f->write(f, 0, 0);
	if (!f->wpos) ret = -1;
	f->buf = saved_buf;
	f->buf_size = 0;
	f->wpos = f->wbase = f->wend = 0;
}
```

然后再判一遍f的error，并恢复错误位

```c
if (ferror(f)) ret = -1;
f->flags |= olderr;
```

最后解开f的锁，结束掉ap2，然后return。

### printf_core function

函数原型

```c
static int printf_core(FILE *f, const char *fmt, va_list *ap, union arg *nl_arg, int *nl_type);
```

首先依旧是定义了一批局部变量，然后开始循环处理参数

首先判断l和cnt时候会造成整数溢出

```c
if (l > INT_MAX - cnt) goto overflow;
```

然后更新cnt，并且判断s是否为0

```c
cnt += l;
if (!*s) break;
```

之后是处理**%%**这样的情况

```c
for (a=s; *s && *s!='%'; s++);
for (z=s; s[0]=='%' && s[1]=='%'; z++, s+=2);
if (z-a > INT_MAX-cnt) goto overflow;
l = z-a;
if (f) out(f, a, l);
if (l) continue;
```

随后是对参数位置的处理

对此，Linux manual pages上是这么写的：

>  By default, the arguments are used in the order given, where each '\*' (see Field width and Precision  below)  and each conversion specifier asks for the next argument (and it is an error if insufficiently many arguments are given).  One can also specify explicitly which argument is taken, at each place where an argument is required, by writing "%m$" instead of '%' and "\*m$" instead of '\*', where the decimal integer m denotes the position in the argument list of the desired argument, indexed  starting from 1.

```c
if (isdigit(s[1]) && s[2]=='$') {
	l10n=1;
	argpos = s[1]-'0';
	s+=3;
} else {
	argpos = -1;
	s++;
}
```

这里的l10n变量是表示是否启用本地化

之后是对flags的读取

```c
for (fl=0; (unsigned)*s-' '<32 && (FLAGMASK&(1U<<*s-' ')); s++)
	fl |= 1U<<*s-' ';
```

这里的FLAGMASK是define的宏：

```c
#define FLAGMASK (ALT_FORM | ZERO_PAD | LEFT_ADJ | PAD_POS | MARK_POS | GROUPED)
```

其中像ALT_FORM这样的也都是define的宏，整个展开就是：

```c
#define FLAGMASK ((1U << '#' - ' ') | (1U << '0' - ' ') | (1U << '-' - ' ') | (1U << ' ' - ' ') |
 (1U << '+' - ' ') | (1U << '\'' - ' '))
```

然后读取field width

>  An  optional decimal digit string (with nonzero first digit) specifying a minimum field width.  If the converted value has fewer characters than the field width, it will be padded with spaces on the left (or right, if the left-adjustment flag has been given).  Instead of a decimal digit string one may write "*" or "*m$" (for some decimal integer  m)  to  specify that the field width is given in the next argument, or in the m-th argument, respectively, which must be of type int.

```c
if (*s=='*') {
	if (isdigit(s[1]) && s[2]=='$') {
		l10n=1;
		if (!f) nl_type[s[1]-'0'] = INT, w = 0;
		else w = nl_arg[s[1]-'0'].i;
		s+=3;
	} else if (!l10n) {
		w = f ? va_arg(*ap, int) : 0;
		s++;
	} else goto inval;
	if (w<0) fl|=LEFT_ADJ, w=-w;
} else if ((w=getint(&s))<0) goto overflow;
```

可以看到，除了精度，它还处理了改变参数顺序的一种方法，并通过三目运算符判断f时候为0来决定是做测试还是正常work，这样的处理在后面也有用到。

之后是处理精度

> An  optional  precision,  in the form of a period ('.')  followed by an optional decimal digit string.  Instead of a decimal digit string one may write "*" or "*m$" (for some decimal integer m) to specify that the precision is given in the next argument, or in the m-th argument, respectively, which must be of type int.  If the  precision is given as just '.', the precision is taken to be zero.

```c
if (*s=='.' && s[1]=='*') {
	if (isdigit(s[2]) && s[3]=='$') {
		if (!f) nl_type[s[2]-'0'] = INT, p = 0;
		else p = nl_arg[s[2]-'0'].i;
		s+=4;
	} else if (!l10n) {
		p = f ? va_arg(*ap, int) : 0;
		s+=2;
	} else goto inval;
	xp = (p>=0);
} else if (*s=='.') {
	s++;
	p = getint(&s);
	xp = 1;
} else {
	p = -1;
	xp = 0;
}
```


之后对处理format

```c
st=0;
do {
	if (OOB(*s)) goto inval;
	ps=st;
	st=states[st]S(*s++);
} while (st-1<STOP);
if (!st) goto inval;
```

states是一个二维数组，如果format没有经过修饰（只是d, f这样的）就不会有第二次循环，修饰了就会再次进入循环。

之后检查参数类型是否有效，并保存参数的值

```c
if (st==NOARG) {
	if (argpos>=0) goto inval;
} else {
	if (argpos>=0) {
		if (!f) nl_type[argpos]=st;
		else arg=nl_arg[argpos];
	} else if (f) pop_arg(&arg, st, ap);
	else return 0;
}
```

可以这里先判了一手，如果参数类型没啥问题再判断参数位置是否被设定过。

这里的`pop_arg()`函数就是读取参数到arg里。

之后判断这次调用只是做测试还是真的要打印，并且判一回f是否有问题

```c
if (!f) continue;
if (ferror(f)) return -1;
```

再做一些处理，再此之前先定义一波变量

```c
z = buf + sizeof(buf);
prefix = "-+   0X0x";
pl = 0;
t = s[-1];
```

处理的是将ls, lc干成S, C
因为'-'和'0'是互斥的，所以也要处理一下。

```c
if (ps && (t&15)==3) t&=~32;
if (fl & LEFT_ADJ) fl &= ~ZERO_PAD;
```

之后就是针对不同类型的处理了，由于类型太多，源码就不贴过来了，我也不准备都看一遍类型都是怎么处理的。

比如这里关于整数的处理

```c
case 'd': case 'i':
	pl=1;
	if (arg.i>INTMAX_MAX) {
		arg.i=-arg.i;
	} else if (fl & MARK_POS) {
		prefix++;
	} else if (fl & PAD_POS) {
		prefix+=2;
	} else pl=0;
case 'u':
	a = fmt_u(arg.i, z);
	}
	if (xp && p<0) goto overflow;
	if (xp) fl &= ~ZERO_PAD;
	if (!arg.i && !p) {
		a=z;
		break;
	}
	p = MAX(p, z-a + !arg.i);
	break;
```

这里首先处理一波溢出的情况，然后就是对flag的处理。

switch那块完事了之后，回接着再做一些判断

```c
if (p < z-a) p = z-a;
if (p > INT_MAX-pl) goto overflow;
if (w < pl+p) w = pl+p;
if (w > INT_MAX-cnt) goto overflow;
```

最后终于是要输出了

```c
pad(f, ' ', w, pl+p, fl);
out(f, prefix, pl);
pad(f, '0', w, pl+p, fl^ZERO_PAD);
pad(f, '0', p, z-a, 0);
out(f, a, z-a);
pad(f, ' ', w, pl+p, fl^LEFT_ADJ);
```

这次是针对各种flag和width的填充，当然在倒数第二步输出了真正的data。

### out function

`out()`就一行代码

```c
if (!ferror(f)) __fwritex((void *)s, l, f);
```

可以看到这里调用了`__fwritex()`函数，这是一个hidden的函数，实现在**fwrite.c**中。

### __fwritex function

首先再次做了一波判断

```c
if (!f->wend && __towrite(f)) return 0;
```

其次先判断f是否有足够的空间容纳要写的数据，如果没有调用write syscall

```c
if (l > f->wend - f->wpos) return f->write(f, s, l);
```

如果有足够的空间，就先判断一手f的行缓冲模式(line buf flag)是否设置，如果是行缓冲模式，会先把数据写到buf里，如果遇到了`\n`就写到f里，换行符后面的部分会通过调用`memcpy`写入buf里。如果不是行缓冲，就先把数据都写入buf里。

关于刚刚说的这个，可以在iSO C标准中找到，下面这个摘抄自我找的C17标准文档：

> When a stream is line buffered, characters are intended to be transmitted to or from the host environment as a block when a new-line character is encountered.

行缓冲里有个关于n和i的判断，这里为什么有小于关系，下面是Linux manual pages

```bash
$ man 2 write
```

> Note that a successful write() may transfer fewer than count bytes. Such partial writes can occur for various reasons; for example, because there was insufficient space on  the  disk  device  to  write  all of the requested bytes, or because a blocked write() to a socket, pipe, or similar was interrupted by a signal handler after it had transferred some, but before it had transferred all of the requested bytes.

如果数据被写入了buf里面，就只能等到f被关闭的时候（如果源码中没有指定大抵就是程序退出的时候）就会把buf里的数据写出去

> A file may be disassociated from a controlling stream by closing the file. Output streams are flushed (any unwritten buffer contents are transmitted to the host environment) before the stream is disassociated from the file.

> If the main function returns to its original caller, or if the exit function is called, all open files are closed (hence all output streams are flushed) before program termination.

上面这段同样摘抄自我找的C17标准文档
