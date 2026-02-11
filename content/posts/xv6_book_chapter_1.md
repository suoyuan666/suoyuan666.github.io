---
title: "Xv6 book: Operating system interfaces"
author: suo yuan
date: 2023-03-04T03:42:51Z
draft: false
tags:
  - Xv6_RISC-V
description:
  "Xv6 book 的第一章节"
---

<!--more-->
Xv6 book 的第一章节
<!--more-->

# Operating system interfaces

每个运行的程序叫做进程，它们在内存都包含指令、数据和栈。指令实现了程序的运算，数据是运算所依赖的变量，栈体现了程序的过程调用。一个计算机通常有很多进程，但只有一个内核。

当程序需要调用内核服务时会调用一个 system call（调用操作系统的接口）。System call 会进入内核，内核执行服务并返回。进程可以在用户空间和内核空间间交替执行。
操作系统内核使用 CPU 提供的硬件保护机制确保每个进程执行时只能访问自己的内存。内核需要在硬件特权下执行以实现这些保护，用户程序不具备这些特权。当用户程序调用一个 system call 时，硬件提升权限级别并且开始执行内核中准备好的函数。

内核提供的系统调用集合是用户程序看到的接口。xv6 提供了 Unix 内核传统上提供的服务和 system call 的子集。

## 进程和内存

一个xv6的进程由用户空间内存（代码、数据和栈）和内核私有的进程状态组成。Xv6 分时进程：它将等待执行的进程集中切换到可用的 CPU。Xv6 会在进程没有执行时保存该进程的 CPU 寄存器，并在下次运行该进程时恢复它们。

一个进程使用 `fork` 系统调用创建。`fork` 为新进程提供了一份调用者进程内存（指令和数据）的副本。`fork` 在新进程和原来的进程都有返回值，在原来的进程中返回新进程的PID，新进程返回0。原来的进程和新进程通常被成为父进程和子进程。

|系统调用|描述|
|:--|:--|
|int fork()|创建一个进程，返回子进程的 PID|
|int exit(int status)|终止当前进程，`status` 给 wait()，没有返回|
|int wait(int \*status)|等待子进程退出，退出状态在 `*status`，返回子进程 PID|
|int kill(int pid)|终止PID所指的进程，返回 0 或 -1（如果出错了的话）|
|int sleep(int n)|暂停 n 个时钟周期|
|int exec(char \*file, char \*argv[])|加载文件和参数并执行，出错的话有返回值|
|char \*sbrk(int n)|将进程的内存增加 n 个字节，返回新内存的位置|
|int open(char \*file, int flags)|打开一个文件，`flags` 表示读写操作，返回文件描述符|
|int write(int fd, char \*buf, int n)|将 n 个字节从 `buf` 写入文件描述符 `fd`，返回 n|
|int read(int fd, char \*buf, int n)|读 n 个字节到 `buf`，返回读取的数目或 0（文件结尾）|
|int close(int fd)|释放打开的文件描述符|
|int dup(int fd)|返回和原文件描述符所指一样的一个新的文件描述符|
|int pipe(int p[])|创建一个管道，将读写文件描述符放在 `p[0]` 和 `p[1]` 上|
|int chdir(char \*dir)|更改当前目录|
|int mkdir(char \*dir)|创建新目录|
|int mknod(char \*file, int, int)|创建设备文件|
|int fstat(int fd, struct stat \*st)|将关于一个打开的文件的信息放入 `*st`|
|int stat(char \*file, struct stat \*st)|将关于命名文件的信息放入 `*st`|
|int link(char \*file1, char \*file2)|为文件 file1 创建别名 file2|
|int unlink(char \*file)|删除文件|

`exit` 系统调用导致调用进程停止执行并释放资源（比如内存和打开的文件）。它使用一个整型变量 `status` 作为参数，通常 0 代表成功，1 代表失败。

`wait` 系统调用返回本进程的已退出的子进程的 PID，并将子进程的退出状态复制传递给 `wait` 的地址。如果调用者的子进程一个都没退出，`wait`就等。如果调用者没有子进程，`wait` 会返回 -1。如果父进程不关心子进程的状态，它可以传递一个0地址给`wait`。

`exec` 系统调用以存储在文件系统的文件为新的内存映像替换调用者的内存。这个文件有格式要求，xv6 使用 ELF 格式。`exec` 成功调用的话不会返回到调用程序。`exec` 接受两个参数：包含可执行文件的文件名和字符串参数数组。

Xv6 的 shell 程序就是用了以上三个系统调用实现了执行程序。shell 从用户读取一行输入，然后调用 `fork` 创建 shell 进程的副本。父进程调用 `wait`，子进程调用 `exec()` 运行命令。当子进程 `exit` 后，父进程的 `wait` 也就有了结果。

```c
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
```

`runcmd` 是对 `exec` 的封装

---

- 为什么不把 `fork` 和 `exec` 两个系统调用结合一起成为一个新的系统调用
- 之后介绍的shell的I/O重定向就利用到了分成两个的妙处。内核通过使用虚拟内存技术（比如写时复制）优化了 `fork` 的实现

---

Xv6 隐式地为分配大多数用户空间内存。对于在运行时需要更多的内存的进程（`malloc`）可以调用 `sbrk(n)` 去将内存增长 n 个字节，`sbrk` 返回新内存的位置。

## I/O和文件描述符

文件描述符是一个整数，表示进程可以从中读取的内核管理对象。进程可以通过打开文件、设备或通过创建一个管道，或者通过复制现有文件描述符去获得一个文件描述符。

xv6 使用文件描述符作为每个进程的索引，每个进程都有一个从 0 开始的文件描述符私有空间。按照规定，进程从文件描述符0（标准输入）读取，向文件描述符1（标准输出）写入，将错误信息写到文件描述符2（标准错误）。shell 确保它总是打开3个文件描述符：

```c
// Ensure that three file descriptors are open.
while((fd = open("console", O_RDWR)) >= 0){
    if(fd >= 3){
        close(fd);
        break;
    }
}
```

`read` 和 `write` 系统调用从文件描述符命名的文件读写字节。

`read(fd, buf, n)` 从文件描述符 `fd` 读 n 个字节复制到 `buf` 中，并返回读取的字节数。引用文件的文件描述符都有一个与之关联的偏移量。`read` 从当前的文件偏移量中读数据，然后按照所读取的字节数再进行偏移，后续读取将返回第一次读取返回的字节之后的字节。当没有字节可读的时候，`read` 返回 0 以示到达文件结尾。

`write(fd, buf, n)` 将 n 个字节从 `buf` 写入文件描述符 `fd`，并返回写入的字节数。和 `read` 一样，`write` 在当前文件偏移量处写数据，然后按照写入的字节数增加这个偏移量，每次写入都从前一次写入停止的地方开始。

下面的程序片段（构成 `cat` 程序的本质）将数据从标准输入复制到标准输出，如果发生错误，它将向标准错误写入一条消息：

```c
char buf[512];
int n;
for(;;){
    n = read(0, buf, sizeof buf);
    if(n == 0)
		break;
    if(n < 0){
        fprintf(2, "read error\n");
        exit(1);
    }
    if(write(1, buf, n) != n){
        fprintf(2, "write error\n");
        exit(1);
	}
}
```

`close` 系统调用释放一个文件描述符，从而自由地调用 `open`、`pipe` 或 `dup` 系统调用。

文件描述符和 `fork` 交互使得 I/O 重定向易于实现。新分配的文件描述符是当前进程编号最低的未使用的文件描述符。

`fork` 将父进程的文件描述符和其内存一起复制。`exec` 替换进程的内存，但保留其文件表。这种行为允许 shell 通过 `fork` 实现 I/O 重定向。下面就是对 `cat < input.txt` 命令的翻译

```c
char *argv[2];
argv[0] = "cat";
argv[1] = 0;
if(fork() == 0) {
    close(0);
    open("input.txt", O_RDONLY);
    exec("cat", argv);
}
```

子进程关闭文件描述符 0 后，`open` 将对新打开的使用该文件描述符。`cat` 使用引用了 input.txt 的标准输入文件描述符执行。

Xv6 的 shell 中的 I/O 重定向代码是这样工作的：

```c
  case REDIR:
    rcmd = (struct redircmd*)cmd;
    close(rcmd->fd);
    if(open(rcmd->file, rcmd->mode) < 0){
      fprintf(2, "open %s failed\n", rcmd->file);
      exit(1);
    }
    runcmd(rcmd->cmd);
    break;
```

`open` 的第二个参数由一组 `flag` 组成，这用来控制 `open` 的操作。值定义在 **kernel/fcntl.h** 中

```c
#define O_RDONLY  0x000
#define O_WRONLY  0x001
#define O_RDWR    0x002
#define O_CREATE  0x200
#define O_TRUNC   0x400
```

只读、只写、可读可写、不存在文件就创建、将文件截断为 0 长度。

虽然 `fork` 复制了文件描述符的表，但是每个文件描述所对应的文件的偏移量是共享的。

`dup` 系统调用复制一个现有的文件描述符，返回一个引用相同 I/O 对象的新文件描述符。两个文件描述符共享一个偏移量。如下就是一个写 hello word 的代码：

```c
fd = dup(1);
write(1, "hello ", 6);
write(fd, "world\n", 6);
```

除了上述情况之外，文件描述符不共享变量，即使它们是由同一个文件产生的。`dup` 允许 shell 实现下列命令：

```bash
ls existing-file non-existing-file > tmp1 2>&1
```

其中 `2>&1` 告诉 shell 一个文件描述符 2，existing-file 的名称和 non-existing-file 的错误信息将会显示在文件 tmp1 中。不过 xv6 的 shell 不支持这个写法。

## 管道

管道 (pipe)是一个小的内核缓冲区，作为一对文件描述符公开给进程。这一对文件描述符一个用于读取，一个用于写入。数据写入管道的一端可以让其在另一端被读取。这为进程提供了一种通信方式。

下面的示例代码使用管道将标准输入和 `wc` 程序连在一起

```c
int p[2];
char *argv[2];

argv[0] = "wc";
argv[1] = 0;

pipe(p);
if(fork() == 0) {
  close(0);
  dup(p[0]);
  close(p[0]);
  close(p[1]);
  exec("/bin/wc", argv);
} else {
  close(p[0]);
  write(p[1], "hello world\n", 12);
  close(p[1]);
}
```

程序调用 `pipe` 创建管道，并在数组 `p` 中记下读写文件描述符。`fork` 之后，父子进程都有引用管道的文件描述符。子进程调用 `close` 和 `dup` 使文件描述符 0 引用管道的读取端的文件描述符，关闭 `p` 记录的文件描述符，调用 `exec` 运行 `wc`。父进程关闭管道的读取端，往写入端写数据，然后关闭它。

如果没有数据可用，管道的 `read` 将会等待写入数据或者关闭所有引用写入端的文件描述符，后者 `read` 将返回 0。`read` 在不会有新数据到来之前会一会等待是上面在执行 `wc` 之前关闭管道的写入端的一个重要原因，如果 `wc` 的文件描述符之一指向管道的写入端，`wc` 将永远不会结束。

Xv6 的 shell 以下面的代码实现了诸如 `greo fork sh.c | wc -l` 之类的管道。

```c
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
```

## 文件系统

Xv6 系统提供了数据文件和目录。这些目录形成一个树。使用 `chdir` 系统调用可以更改进程的当前目录。下面两个代码用于打开同一个文件。

```c
//No.1 :
chdir("/a");
chdir("b");
open("c", O_RDONLY);
//No.2 :
open("/a/b/c", O_RDONLY);
```

系统调用 `mkdir` 可以创建新目录，`open` 使用 `O_CREATE` 可以创建新的文件，`mknod` 可以创建新的设备文件

```c
mkdir("/dir");
fd = open("/dir/file", O_CREATE|O_WRONLY);
close(fd);
mknod("/console", 1, 1);
```

`mknod` 创建一个引用设备的特殊文件。与设备文件关联的是主设备号和次设备号（`mknod`的两个参数），它们唯一地标识一个内核设备。当一个进程要打开一个设备文件时，内核转移 `read` 和 `write` 系统调用给内核设备的实现，而不是传递给文件系统。

文件名称不同于文件本身，同一个底层文件（叫做 inode）可以由多个名称（叫做 link）。每个 link 由目录的一个条目组成，该条目包含文件名和对  inode 的引用。Inode 保存有关文件的 `metadata`，包括其类型（文件、目录还是设备）、长度、文件内容在磁盘中的位置以及指向那个文件的 link 的数量。

`fstat` 系统调用从文件描述符引用的 inode 中检索信息。

```c
#define T_DIR     1   // Directory
#define T_FILE    2   // File
#define T_DEVICE  3   // Device

struct stat {
  int dev;     // File system's disk device
  uint ino;    // Inode number
  short type;  // Type of file
  short nlink; // Number of links to file
  uint64 size; // Size of file in bytes
};
```

`link` 系统调用创建对相同inode引用的另一个名称称作为一个已有文件。下面的代码创建一个由 a 和 b 两个名字的新文件：

```c
open("a", O_CREATE|O_WRONLY);
link("a", "b");
```

对 a 的 I/O 操作也会作用到b上面。每个 inode 由一个唯一的 inode 编号标识。执行完上面的两行代码后，可以通过检查 `fstst` 的结果来确定 a 和 b 引用相同的内容：二者返回相同的 inode号 (ino)，并且 `nlink` 计数为 2。

`unlink` 系统调用从文件系统中删除一个名称。只有当文件的 link 数量为 0 并且没有文件描述符引用它时，文件的 inode 和占用磁盘空间才会被释放。

```c
fd = open("/tmp/xyz", O_CREATE|O_RDWR);
unlink("/tmp/xyz");
```

上面的代码时创建临时 inode 的惯用方法，当进程关闭 fd 或退出时就会被清掉。

Unix 提供了可以在 shell 作为用户级程序调用的一些对文件操作的程序，例如 `mkdir`、`ln`和`rm`。这种设计允许通过添加新的用户级程序去扩展命令行，但是 Unix 时代其他系统经常在 shell 中实现这些命令，并在内核中实现 shell。

`cd` 是一个例外，它内置在 shell中。因为它会更改 shell 本身的当前工作目录。如果 `cd` 作为一个常规命令运行，shell 去 `fork` 一个子进程去运行 `cd`，这无法影响到父进程。

```c
if(buf[0] == 'c' && buf[1] == 'd' && buf[2] == ' '){
      // Chdir must be called by the parent, not the child.
      buf[strlen(buf)-1] = 0;  // chop \n
      if(chdir(buf+3) < 0)
        fprintf(2, "cannot cd %s\n", buf+3);
      continue;
    }
```

## 现实状况

Unix 结合了“标准”文件描述符、管道和便于操作的 shell 语法，这是编写程序的一个重大进步。这个想法引发了一种 software tools 的文化，这种文化很大程度上让 Unix 变得强大和流行。

Unix 系统调用接口已经通过 POSIX (Portable Operating System Interface)标准进行了标准化。Xv6 并不和 POSIX 兼容，前者少了很多系统调用，并且许多系统调用的实现也不一样。

和 Xv6 相比，现代操作系统内核提供了更多的系统调用和更多种类的内核服务。现代内核持续迅速地发展，提供了许多超越 POSIX 的特性。

Xv6 没有用户的概念，所有进程都以 root 权限运行。
