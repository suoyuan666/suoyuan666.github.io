---
title: "xv6-riscv 源码阅读 —— 用户态: sh"
author: suo yuan
pubDatetime: 2024-11-25T06:31:16Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 读一遍，这是用户态的 sh 部分，一个十分简单的 shell"
summary: "尝试把 xv6-riscv 读一遍，这是用户态的 sh 部分，一个十分简单的 shell"
---

## 概述

sh 是一个简单的 shell 程序，只支持很基本的 shell 功能。

> 什么是 shell ？
>
> In computing, a shell is a computer program that exposes an operating system's services to a human user or other programs. In general, operating system shells use either a command-line interface (CLI) or graphical user interface (GUI), depending on a computer's role and particular operation. It is named a shell because it is the outermost layer around the operating system.
>
> 在计算机中，shell 是一种向人类用户或其他程序公开操作系统服务的计算机程序。一般来说，操作系统的 shell 使用命令行界面 (CLI) 或图形用户界面 (GUI)，具体取决于计算机的角色和特定操作。它被命名为 shell，因为它是操作系统的最外层。
>
> Most operating system shells are not direct interfaces to the underlying kernel, even if a shell communicates with the user via peripheral devices attached to the computer directly. Shells are actually special applications that use the kernel API in just the same way as it is used by other application programs. A shell manages the user–system interaction by prompting users for input, interpreting their input, and then handling output from the underlying operating system (much like a read–eval–print loop, REPL).[3] Since the operating system shell is actually an application, it may easily be replaced with another similar application, for most operating systems
>
> 大多数操作系统的 shell 都不是底层内核的直接接口，即便 shell 通过直接连接到计算机的外围设备与用户通信也是如此。 Shell 实际上是特殊的应用程序，它们使用内核 API 的方式与其他应用程序使用的方式相同。 shell 通过提示用户输入、解释其输入，然后处理来自底层操作系统的输出（很像读取-评估-打印循环，REPL）来管理用户与系统的交互。由于操作系统 shell 实际上是一个应用程序，因此对于大多数操作系统来说，它可以很容易地被另一个类似的应用程序替换。
>
> -- https://en.wikipedia.org/wiki/Shell_(computing)

Shell 可以读取用户的输入，并解释执行。这里面至少涉及到了两个会被 shell 直接调用的系统调用（相对而言的间接就是通过库函数间接调用的系统调用）：

- `int fork()`: 创建一个进程，返回子进程的 PID
- `int exec(char *file, char *argv[])`: 加载文件和参数并执行传入的 `file`

## 正文

```c
int
main(void)
{
  static char buf[100];
  int fd;

  // Ensure that three file descriptors are open.
  while((fd = open("console", O_RDWR)) >= 0){
    if(fd >= 3){
      close(fd);
      break;
    }
  }

  // Read and run input commands.
  while(getcmd(buf, sizeof(buf)) >= 0){
    if(buf[0] == 'c' && buf[1] == 'd' && buf[2] == ' '){
      // Chdir must be called by the parent, not the child.
      buf[strlen(buf)-1] = 0;  // chop \n
      if(chdir(buf+3) < 0)
        fprintf(2, "cannot cd %s\n", buf+3);
      continue;
    }
    if(fork1() == 0)
      runcmd(parsecmd(buf));
    wait(0);
  }
  exit(0);
}
```

`main()` 函数会先关闭除那些标准 I/O 文件描述符的文件描述符。之后就开始读取输入。并且检测如果是调用的 `cd` 的话就直接处理好，注释也写明了，因为 `cd` 的行为会影响到当前的状态，所以需要由父进程来做，而不是像其他程序直接开个子进程调用就完事。cd 会调用 `chdir()` 系统调用来切换当前路径。

如果不是 cd，那就调用 `fork()` 创建子进程，在子进程中调用 `parsecmd()` 解析该命令，并将结果传递给 `runcmd()`，而父进程则是等待子进程退出。

这里的 `fork1()` 是对 `fork()` 的简单封装，多加了一个错误处理的检测。

`parsecmd()` 函数是这样:

```c
struct cmd*
parsecmd(char *s)
{
  char *es;
  struct cmd *cmd;

  es = s + strlen(s);
  cmd = parseline(&s, es);
  peek(&s, es, "");
  if(s != es){
    fprintf(2, "leftovers: %s\n", s);
    panic("syntax");
  }
  nulterminate(cmd);
  return cmd;
}
```

要执行的命令的类型被封装成了 `struct cmd` 结构体:

```c
struct cmd {
  int type;
};
```

因为输入的命令序列有不同类别，所以后续还有对 `struct cmd` 封装的结构体

```c
struct execcmd {
  int type;
  char *argv[MAXARGS];
  char *eargv[MAXARGS];
};

struct redircmd {
  int type;
  struct cmd *cmd;
  char *file;
  char *efile;
  int mode;
  int fd;
};

struct pipecmd {
  int type;
  struct cmd *left;
  struct cmd *right;
};

struct listcmd {
  int type;
  struct cmd *left;
  struct cmd *right;
};

struct backcmd {
  int type;
  struct cmd *cmd;
}
```

这里涉及到另一个函数 `struct cmd* parseline(char **ps, char *es)`:

```c
struct cmd*
parseline(char **ps, char *es)
{
  struct cmd *cmd;

  cmd = parsepipe(ps, es);
  while(peek(ps, es, "&")){
    gettoken(ps, es, 0, 0);
    cmd = backcmd(cmd);
  }
  if(peek(ps, es, ";")){
    gettoken(ps, es, 0, 0);
    cmd = listcmd(cmd, parseline(ps, es));
  }
  return cmd;
}
```

这里就是对输入的命令序列简单做是否是需要挂在后台或者是否是一组 list。

> 一个命令后面接 `&` 表明这是后台执行的，shell 不需要等待其返回，现在我们使用的 shell（如 bash） 返回后台程序的进程号，但 xv6 的这个简单 shell 没有这个功能。
>
> 而 `;` 则类似 `&&`，都是将多个命令组成一个序列，不过 `&&` 会根据前面程序的运行结果以决定是否要执行后面的。

这里调用的 `backcmd()` 和 `listcmd()` 都做一些类似的工作，都是在 cmd 这个链表加新元素。


```c
struct cmd*
backcmd(struct cmd *subcmd)
{
  struct backcmd *cmd;

  cmd = malloc(sizeof(*cmd));
  memset(cmd, 0, sizeof(*cmd));
  cmd->type = BACK;
  cmd->cmd = subcmd;
  return (struct cmd*)cmd;
}

struct cmd*
listcmd(struct cmd *left, struct cmd *right)
{
  struct listcmd *cmd;

  cmd = malloc(sizeof(*cmd));
  memset(cmd, 0, sizeof(*cmd));
  cmd->type = LIST;
  cmd->left = left;
  cmd->right = right;
  return (struct cmd*)cmd;
}
```

这里还有对 `parsepipe()` 的调用

```c
struct cmd*
parsepipe(char **ps, char *es)
{
  struct cmd *cmd;

  cmd = parseexec(ps, es);
  if(peek(ps, es, "|")){
    gettoken(ps, es, 0, 0);
    cmd = pipecmd(cmd, parsepipe(ps, es));
  }
  return cmd;
}
```

从名字就能看出是和管道相关

> 管道连接两组命令序列，并把左边的标准输出连接给右边的标准输出。经典的例子应该属于是 `cat xxx.txt | grep xxx`，不过这里的用法当然是不合适的，管道本身有 buffer，不如直接 `grep xxx xxx.txt` 这样直接。

可以看到它是先调用 `parseexec()`，之后再做是否是管道的判断。

```c
struct cmd*
parseexec(char **ps, char *es)
{
  char *q, *eq;
  int tok, argc;
  struct execcmd *cmd;
  struct cmd *ret;

  if(peek(ps, es, "("))
    return parseblock(ps, es);

  ret = execcmd();
  cmd = (struct execcmd*)ret;

  argc = 0;
  ret = parseredirs(ret, ps, es);
  while(!peek(ps, es, "|)&;")){
    if((tok=gettoken(ps, es, &q, &eq)) == 0)
      break;
    if(tok != 'a')
      panic("syntax");
    cmd->argv[argc] = q;
    cmd->eargv[argc] = eq;
    argc++;
    if(argc >= MAXARGS)
      panic("too many args");
    ret = parseredirs(ret, ps, es);
  }
  cmd->argv[argc] = 0;
  cmd->eargv[argc] = 0;
  return ret;
}
```

这里先加了一个 `EXEC` 类型的元素，并且判断是否存在重定向

> 重定向是将文件描述符的输出重新绑定到另一个位置。
>
> 常见的类似 `echo 111 > test.txt`
>
> 这里的 `echo 111` 本来是往标准输出打印 111，但是 `>` 将内容重定向到 test.txt 中，就相当于是往 test.txt 文件中写入 `111`
>
> 或者 `find / -name aaa 2>/dev/null` 这样的命令，`2>/dev/null`，是将标准错误输出（也就是文件描述符 2）重定向到 `/dev/null`，
>
> `/dev/null` 是一个特殊的设备，类似一个黑洞，任何向 `/dev/null` 的写入都是无效的。类似的设备还有`/dev/random` 之类的。
> find 根目录的时候需要 `2>/dev/null` 的原因是普通用户权限不如 root，有些目录不能被普通用户访问，所以为了不显示那些权限拒绝的信息，需要这个重定向。权限拒绝的 log 类似这样:

```bash
find: ‘/etc/nftables’: Permission denied
```

> 我们日常很容易有一个需求，即向高权限可写的文件中写入一小段内容。写入一小段内容，`echo` 就可以满足我们的需求，但是直接在 `echo` 前加入 `sudo` 是不可行的，需要 `echo aaa | sudo tee /test.txt` 这样，`tee` 会从标准输入读取内容，并将其写入文件中。

> `while` 循环中则是对每个命令行参数遍历并保存起来。这里判断 `tok` 是否为 `a`，则是因为 `gettoken()` 设定好的:

```c
char whitespace[] = " \t\r\n\v";
char symbols[] = "<|>&;()";

int
gettoken(char **ps, char *es, char **q, char **eq)
{
  char *s;
  int ret;

  s = *ps;
  while(s < es && strchr(whitespace, *s))
    s++;
  if(q)
    *q = s;
  ret = *s;
  switch(*s){
  case 0:
    break;
  case '|':
  case '(':
  case ')':
  case ';':
  case '&':
  case '<':
    s++;
    break;
  case '>':
    s++;
    if(*s == '>'){
      ret = '+';
      s++;
    }
    break;
  default:
    ret = 'a';
    while(s < es && !strchr(whitespace, *s) && !strchr(symbols, *s))
      s++;
    break;
  }
  if(eq)
    *eq = s;

  while(s < es && strchr(whitespace, *s))
    s++;
  *ps = s;
  return ret;
}
```

在默认情况下，ret 会被设置成 `'a'`

下面的则是对重定向的处理:

```c
struct cmd*
parseredirs(struct cmd *cmd, char **ps, char *es)
{
  int tok;
  char *q, *eq;

  while(peek(ps, es, "<>")){
    tok = gettoken(ps, es, 0, 0);
    if(gettoken(ps, es, &q, &eq) != 'a')
      panic("missing file for redirection");
    switch(tok){
    case '<':
      cmd = redircmd(cmd, q, eq, O_RDONLY, 0);
      break;
    case '>':
      cmd = redircmd(cmd, q, eq, O_WRONLY|O_CREATE|O_TRUNC, 1);
      break;
    case '+':  // >>
      cmd = redircmd(cmd, q, eq, O_WRONLY|O_CREATE, 1);
      break;
    }
  }
  return cmd;
}
```

如果存在重定向的语法，并且语法没有错误，那么就会调用 `redircmd`，从而构造一个用于重定向的 `struct cmd*`，如果没有重定向，就什么也不做，直接把参数的 `cmd` 返回。

```c
struct cmd*
redircmd(struct cmd *subcmd, char *file, char *efile, int mode, int fd)
{
  struct redircmd *cmd;

  cmd = malloc(sizeof(*cmd));
  memset(cmd, 0, sizeof(*cmd));
  cmd->type = REDIR;
  cmd->cmd = subcmd;
  cmd->file = file;
  cmd->efile = efile;
  cmd->mode = mode;
  cmd->fd = fd;
  return (struct cmd*)cmd;
}
```

如果语法错误就会调用 `panic("missing file for redirection")`，就像这样:

```bash
$ make qemu
qemu-system-riscv64 -machine virt -bios none -kernel kernel/kernel -m 128M -smp 3 -nographic -global virtio-mmio.force-legacy=false -drive file=fs.img,if=none,format=raw,id=x0 -device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0

xv6 kernel is booting

hart 2 starting
hart 1 starting
init: starting sh
$ aa>     
missing file for redirection
$
```

在判断完重定向后，就进入了参数的读取工作:

```c
while(!peek(ps, es, "|)&;")){
  if((tok=gettoken(ps, es, &q, &eq)) == 0)
    break;
  if(tok != 'a')
    panic("syntax");
  cmd->argv[argc] = q;
  cmd->eargv[argc] = eq;
  argc++;
  if(argc >= MAXARGS)
    panic("too many args");
  ret = parseredirs(ret, ps, es);
}
```

这里的 `eargv` 用于指向当前 argv 的子字符串的下一个分隔符，我这段话表达的不是很好，可以看下面的图片:

![xv6-user-sh-eargv](/img/xv6-riscv-read/user/xv6-user-sh-eargv.png)

正常的 `argv` 并不是这个样子，我们日常写 C 语言的时候，如果你尝试使用过 `int main(int argc, char *argv[])` 这个函数原型的话，应该知道 argv 不会将前面的 `echo` 这些带上。

为了让 `argv` 正常使用，`eargv` 会在之后派上用场。

在读取了之后，会对 `argv[argc]` 和 `eargv[argc]` 赋 `0`，也是为了重新对 `argv` 整理而考虑。

如果 `parsepipe` 对 `parseexec` 的调用之后发现没有管道，就直接返回。`parseline` 类似。

而在 `parsecmd` 中，在 `cmd` 生成后，还需要重新对 `eargv` 赋 `0` 从而让 `argv` 可以被正常读取。

```c
switch(cmd->type){
case EXEC:
  ecmd = (struct execcmd*)cmd;
  for(i=0; ecmd->argv[i]; i++)
    *ecmd->eargv[i] = 0;
  break;
```

`eargv` 指向每一个分隔符，被赋 `0` 之后就可以让 `argv` 读到 `0` 就停止，达到了让 `argv` 可以被正确读取的目的。

在对 `cmd` 的处理都完事后，就到了 `runcmd` 的部分:

```c
// Execute cmd.  Never returns.
void
runcmd(struct cmd *cmd)
{
  int p[2];
  struct backcmd *bcmd;
  struct execcmd *ecmd;
  struct listcmd *lcmd;
  struct pipecmd *pcmd;
  struct redircmd *rcmd;

  if(cmd == 0)
    exit(1);

  switch(cmd->type){
  default:
    panic("runcmd");

  case EXEC:
    ecmd = (struct execcmd*)cmd;
    if(ecmd->argv[0] == 0)
      exit(1);
    exec(ecmd->argv[0], ecmd->argv);
    fprintf(2, "exec %s failed\n", ecmd->argv[0]);
    break;

  case REDIR:
    rcmd = (struct redircmd*)cmd;
    close(rcmd->fd);
    if(open(rcmd->file, rcmd->mode) < 0){
      fprintf(2, "open %s failed\n", rcmd->file);
      exit(1);
    }
    runcmd(rcmd->cmd);
    break;

  case LIST:
    lcmd = (struct listcmd*)cmd;
    if(fork1() == 0)
      runcmd(lcmd->left);
    wait(0);
    runcmd(lcmd->right);
    break;

  case PIPE:
    pcmd = (struct pipecmd*)cmd;
    if(pipe(p) < 0)
      panic("pipe");
    if(fork1() == 0){
      close(1);
      dup(p[1]);
      close(p[0]);
      close(p[1]);
      runcmd(pcmd->left);
    }
    if(fork1() == 0){
      close(0);
      dup(p[0]);
      close(p[0]);
      close(p[1]);
      runcmd(pcmd->right);
    }
    close(p[0]);
    close(p[1]);
    wait(0);
    wait(0);
    break;

  case BACK:
    bcmd = (struct backcmd*)cmd;
    if(fork1() == 0)
      runcmd(bcmd->cmd);
    break;
  }
  exit(0);
}
```

对于普通的命令（即 `EXEC` 类型），直接调用 `exec` 执行就好了，如果没有正常执行，就调用 `fprintf` 输出执行失败，毕竟 `exec` 系统调用会替换当前执行的程序，如果每成功替换，就会继续执行 `fprintf`。

是管道的处理值得一提:

```c
pcmd = (struct pipecmd*)cmd;
if(pipe(p) < 0)
  panic("pipe");
if(fork1() == 0){
  close(1);
  dup(p[1]);
  close(p[0]);
  close(p[1]);
  runcmd(pcmd->left);
}
if(fork1() == 0){
  close(0);
  dup(p[0]);
  close(p[0]);
  close(p[1]);
  runcmd(pcmd->right);
}
close(p[0]);
close(p[1]);
wait(0);
wait(0);
break;
```

首先会调用 `pipe` 系统调用，这会产生一个管道。

这里的 `fork1` 是对 `fork` 系统调用的简单封装:

```c
int
fork1(void)
{
  int pid;

  pid = fork();
  if(pid == -1)
    panic("fork");
  return pid;
}
```

对于管道类型的命令来说，sh 会 fork 两个进程，对每个进程做类似的事情:

```c
if(fork1() == 0){
  close(1);
  dup(p[1]);
  close(p[0]);
  close(p[1]);
  runcmd(pcmd->left);
}
if(fork1() == 0){
  close(0);
  dup(p[0]);
  close(p[0]);
  close(p[1]);
  runcmd(pcmd->right);
}
```

第一个进程中，`close` 关闭当前进程的标准输出，并使用 `dup` 系统调用复制传入的文件描述符，因为 `1` 文件描述符被关闭了，所以分配的新的文件描述符就是 `1`。

第二个进程也会做类似的操作，只不过是关闭的标准输入。

两个进程在把管道的文件描述符复制了之后，就把管道的文件描述符都关闭，并运行对应的命令，由于 `exec` 后的程序会继承文件描述符，所以正常像文件描述符 1（也就是标准输出）的输出，会被传递给管道的另一端，另一端会从标准输入的文件描述符读到。

自此，sh 的代码就大概说完了。