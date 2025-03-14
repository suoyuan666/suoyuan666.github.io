---
title: "xv6-riscv 源码阅读 —— 用户态: utils"
author: suo yuan
pubDatetime: 2024-12-05T03:02:34Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 读一遍，这是用户态的部分实用程序，cat ls 什么的"
summary: "尝试把 xv6-riscv 读一遍，这是用户态的部分实用程序，cat ls 什么的"
---

# xv6-riscv 源码阅读 —— 用户态: utils

我挑了几个常用的程序读了一下，这不代表常用的都在这里（比如 `rm` 也很常用，但我没有写），这里有 xv6-riscv 中的 `cat`、`echo`、`ls`、`grep` 和 `wc` 的源码阅读。

## cat

> cat is a standard Unix utility that reads files sequentially, writing them to standard output.
>
> cat 是一个标准的 Unix 实用程序，它顺序读取文件，并将它们写入标准输出。

cat 的 `main()` 函数很简单

```c
int
main(int argc, char *argv[])
{
  int fd, i;

  if(argc <= 1){
    cat(0);
    exit(0);
  }

  for(i = 1; i < argc; i++){
    if((fd = open(argv[i], O_RDONLY)) < 0){
      fprintf(2, "cat: cannot open %s\n", argv[i]);
      exit(1);
    }
    cat(fd);
    close(fd);
  }
  exit(0);
}
```

就是判断是否附加了文件名，如果没附加就从标准输入读取，这个是应用于类似管道这种情景。如果有附加文件名，就尝试只读打开并将文件描述符传给 `cat()` 函数做进一步处理。

`cat()` 函数则是直接调用 `read()` 系统调用读最多 512 字节出来，并调用 `write()` 系统调用打印出来。

```c
void
cat(int fd)
{
  int n;

  while((n = read(fd, buf, sizeof(buf))) > 0) {
    if (write(1, buf, n) != n) {
      fprintf(2, "cat: write error\n");
      exit(1);
    }
  }
  if(n < 0){
    fprintf(2, "cat: read error\n");
    exit(1);
  }
}
```

这里的 `buf` 是一个全局变量 `char buf[512]`。

## echo

> In computing, echo is a command that outputs the strings that are passed to it as arguments. It is a command available in various operating system shells and typically used in shell scripts and batch files to output status text to the screen[1] or a computer file, or as a source part of a pipeline.
>
> 在计算机中，echo 是一个输出作为参数传递给它的字符串的命令。它是各种操作系统 shell 中可用的命令，通常在 shell 脚本和批处理文件中使用，将状态文本输出到屏幕或计算机文件，或作为管道的源部分。

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

int
main(int argc, char *argv[])
{
  int i;

  for(i = 1; i < argc; i++){
    write(1, argv[i], strlen(argv[i]));
    if(i + 1 < argc){
      write(1, " ", 1);
    } else {
      write(1, "\n", 1);
    }
  }
  exit(0);
}
```

代码很短，也很容易懂，没有说的必要

## ls

> In computing, ls is a command to list computer files and directories in Unix and Unix-like operating systems.
>
> 在计算机中，ls 是 Unix 和类 Unix 操作系统中列出计算机文件和目录的命令

```c
int
main(int argc, char *argv[])
{
  int i;

  if(argc < 2){
    ls(".");
    exit(0);
  }
  for(i=1; i<argc; i++)
    ls(argv[i]);
  exit(0);
}
```

`main` 函数只是遍历输入的参数，如果没有提供参数，就默认查看当前目录

```c
void
ls(char *path)
{
  char buf[512], *p;
  int fd;
  struct dirent de;
  struct stat st;

  if((fd = open(path, O_RDONLY)) < 0){
    fprintf(2, "ls: cannot open %s\n", path);
    return;
  }

  if(fstat(fd, &st) < 0){
    fprintf(2, "ls: cannot stat %s\n", path);
    close(fd);
    return;
  }

  switch(st.type){
  case T_DEVICE:
  case T_FILE:
    printf("%s %d %d %d\n", fmtname(path), st.type, st.ino, (int) st.size);
    break;

  case T_DIR:
    if(strlen(path) + 1 + DIRSIZ + 1 > sizeof buf){
      printf("ls: path too long\n");
      break;
    }
    strcpy(buf, path);
    p = buf+strlen(buf);
    *p++ = '/';
    while(read(fd, &de, sizeof(de)) == sizeof(de)){
      if(de.inum == 0)
        continue;
      memmove(p, de.name, DIRSIZ);
      p[DIRSIZ] = 0;
      if(stat(buf, &st) < 0){
        printf("ls: cannot stat %s\n", buf);
        continue;
      }
      printf("%s %d %d %d\n", fmtname(buf), st.type, st.ino, (int) st.size);
    }
    break;
  }
  close(fd);
}
```

`struct stat` 描述了文件的状态，按照 xv6 的定义:

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

根据 [man page](https://man7.org/linux/man-pages/man3/stat.3type.html)，实际的 `struct stat` 要比上面的定义复杂的多

```c
struct stat {
    dev_t      st_dev;      /* ID of device containing file */
    ino_t      st_ino;      /* Inode number */
    mode_t     st_mode;     /* File type and mode */
    nlink_t    st_nlink;    /* Number of hard links */
    uid_t      st_uid;      /* User ID of owner */
    gid_t      st_gid;      /* Group ID of owner */
    dev_t      st_rdev;     /* Device ID (if special file) */
    off_t      st_size;     /* Total size, in bytes */
    blksize_t  st_blksize;  /* Block size for filesystem I/O */
    blkcnt_t   st_blocks;   /* Number of 512 B blocks allocated */

    /* Since POSIX.1-2008, this structure supports nanosecond
        precision for the following timestamp fields.
        For the details before POSIX.1-2008, see VERSIONS. */

    struct timespec  st_atim;  /* Time of last access */
    struct timespec  st_mtim;  /* Time of last modification */
    struct timespec  st_ctim;  /* Time of last status change */

#define st_atime  st_atim.tv_sec  /* Backward compatibility */
#define st_mtime  st_mtim.tv_sec
#define st_ctime  st_ctim.tv_sec
};
```

可以简单的看出：`ls` 函数的大致先通过 `open` 系统调用获得相应的文件描述符，之后根据它获取文件的状态，根据这个文件的类型再做处理

```c
switch(st.type){
case T_DEVICE:
case T_FILE:
  printf("%s %d %d %d\n", fmtname(path), st.type, st.ino, (int) st.size);
  break;

case T_DIR:
  if(strlen(path) + 1 + DIRSIZ + 1 > sizeof buf){
    printf("ls: path too long\n");
    break;
  }
  strcpy(buf, path);
  p = buf+strlen(buf);
  *p++ = '/';
  while(read(fd, &de, sizeof(de)) == sizeof(de)){
    if(de.inum == 0)
      continue;
    memmove(p, de.name, DIRSIZ);
    p[DIRSIZ] = 0;
    if(stat(buf, &st) < 0){
      printf("ls: cannot stat %s\n", buf);
      continue;
    }
    printf("%s %d %d %d\n", fmtname(buf), st.type, st.ino, (int) st.size);
  }
  break;
}
```

如果该文件是设备或者文件的话，就直接输出相关信息，如果是目录则需要遍历目录中的文件，并将相关信息打印出来

`struct dirent` 描述了一个目录项的信息

```c
// Directory is a file containing a sequence of dirent structures.
#define DIRSIZ 14

struct dirent {
  ushort inum;
  char name[DIRSIZ];
};
```

第一个是这个目录项的序号

```c
char*
fmtname(char *path)
{
  static char buf[DIRSIZ+1];
  char *p;

  // Find first character after last slash.
  for(p=path+strlen(path); p >= path && *p != '/'; p--)
    ;
  p++;

  // Return blank-padded name.
  if(strlen(p) >= DIRSIZ)
    return p;
  memmove(buf, p, strlen(p));
  memset(buf+strlen(p), ' ', DIRSIZ-strlen(p));
  return buf;
}
```

`fmtname` 用于将真正的文件名返回，在 `ls` 对 `T_DIR` 的处理中可以看出:

```c
if(strlen(path) + 1 + DIRSIZ + 1 > sizeof buf){
  printf("ls: path too long\n");
  break;
}
strcpy(buf, path);
p = buf+strlen(buf);
*p++ = '/';
while(read(fd, &de, sizeof(de)) == sizeof(de)){
  if(de.inum == 0)
    continue;
  memmove(p, de.name, DIRSIZ);
  p[DIRSIZ] = 0;
  if(stat(buf, &st) < 0){
    printf("ls: cannot stat %s\n", buf);
    continue;
  }
  printf("%s %d %d %d\n", fmtname(buf), st.type, st.ino, (int) st.size);
}
```

这会构造一个 `当前目录/当前文件` 的形式，比如用户输入 `ls dir`，那么这里的 `buf` 就是 `dir/file`。

如果是 `T_FILE`，那传入的参数就是 `ls` 的参数。

```c
for(p=path+strlen(path); p >= path && *p != '/'; p--)
    ;
p++;
```

`fmtname` 中的这个 `for` 循环就用来从末尾开始找到第一个 `/`，之后 `p++` 用来将 `p` 指向 `/` 后的第一个字符。

之后就会对返回值的处理。

## grep

> Simple grep.  Only supports ^ . * $ operators.

> grep is a command-line utility for searching plaintext datasets for lines that match a regular expression.
>
> grep 是一个命令行实用程序，用于在纯文本数据集中搜索与正则表达式匹配的行。

xv6 的 grep 很简单，只是将匹配的输出，并且并没有支持完整的正则表达式。现实世界中，grep 不仅会输出匹配到内容的那一行，会将匹配到的内容高亮显示。

```c
int
main(int argc, char *argv[])
{
  int fd, i;
  char *pattern;

  if(argc <= 1){
    fprintf(2, "usage: grep pattern [file ...]\n");
    exit(1);
  }
  pattern = argv[1];

  if(argc <= 2){
    grep(pattern, 0);
    exit(0);
  }

  for(i = 2; i < argc; i++){
    if((fd = open(argv[i], O_RDONLY)) < 0){
      printf("grep: cannot open %s\n", argv[i]);
      exit(1);
    }
    grep(pattern, fd);
    close(fd);
  }
  exit(0);
}
```

可以看出，这里就是简单的获取 grep 的匹配表达式，之后根据参数的个数再做不同的处理。

```c
void
grep(char *pattern, int fd)
{
  int n, m;
  char *p, *q;

  m = 0;
  while((n = read(fd, buf+m, sizeof(buf)-m-1)) > 0){
    m += n;
    buf[m] = '\0';
    p = buf;
    while((q = strchr(p, '\n')) != 0){
      *q = 0;
      if(match(pattern, p)){
        *q = '\n';
        write(1, p, q+1 - p);
      }
      p = q+1;
    }
    if(m > 0){
      m -= p - buf;
      memmove(buf, p, m);
    }
  }
}
```

这里的 `while` 循环就是对每一行进行处理，先通过 `strchr` 找到第一个换行符，将这个换行符赋为 `0`，之后在匹配结束后再换回来。之后再将未匹配的内容复制到 `buf` 的开头，并且 `m` 是这段内容的大小，所以下次调用 `read` 时从 `buf + m` 写入，不会影响到未匹配的那段内容，并且由于循环中上来将 `buf[m] = '\0'`，导致上次未清除的内容不会影响到这次的匹配。

```c
// Regexp matcher from Kernighan & Pike,
// The Practice of Programming, Chapter 9, or
// https://www.cs.princeton.edu/courses/archive/spr09/cos333/beautiful.html

int matchhere(char*, char*);
int matchstar(int, char*, char*);

int
match(char *re, char *text)
{
  if(re[0] == '^')
    return matchhere(re+1, text);
  do{  // must look at empty string
    if(matchhere(re, text))
      return 1;
  }while(*text++ != '\0');
  return 0;
}

// matchhere: search for re at beginning of text
int matchhere(char *re, char *text)
{
  if(re[0] == '\0')
    return 1;
  if(re[1] == '*')
    return matchstar(re[0], re+2, text);
  if(re[0] == '$' && re[1] == '\0')
    return *text == '\0';
  if(*text!='\0' && (re[0]=='.' || re[0]==*text))
    return matchhere(re+1, text+1);
  return 0;
}

// matchstar: search for c*re at beginning of text
int matchstar(int c, char *re, char *text)
{
  do{  // a * matches zero or more instances
    if(matchhere(re, text))
      return 1;
  }while(*text!='\0' && (*text++==c || c=='.'));
  return 0;
}
```

这段就是具体匹配的部分。

## wc

> wc (short for word count) is a command in Unix, Plan 9, Inferno, and Unix-like operating systems. The program reads either standard input or a list of computer files and generates one or more of the following statistics: newline count, word count, and byte count. If a list of files is provided, both individual file and total statistics follow.
>
> wc（word count 的缩写）是 Unix、Plan 9、Inferno 和类 Unix 操作系统中的命令。该程序读取标准输入或计算机文件列表，并生成以下一项或多项统计数据：换行数、字数和字节数。如果提供了文件列表，则会显示单个文件和总体统计信息。

```c
int
main(int argc, char *argv[])
{
  int fd, i;

  if(argc <= 1){
    wc(0, "");
    exit(0);
  }

  for(i = 1; i < argc; i++){
    if((fd = open(argv[i], O_RDONLY)) < 0){
      printf("wc: cannot open %s\n", argv[i]);
      exit(1);
    }
    wc(fd, argv[i]);
    close(fd);
  }
  exit(0);
}
```

显而易见的 `main` 函数，和上面的都类似

```c
void
wc(int fd, char *name)
{
  int i, n;
  int l, w, c, inword;

  l = w = c = 0;
  inword = 0;
  while((n = read(fd, buf, sizeof(buf))) > 0){
    for(i=0; i<n; i++){
      c++;
      if(buf[i] == '\n')
        l++;
      if(strchr(" \r\t\n\v", buf[i]))
        inword = 0;
      else if(!inword){
        w++;
        inword = 1;
      }
    }
  }
  if(n < 0){
    printf("wc: read error\n");
    exit(1);
  }
  printf("%d %d %d %s\n", l, w, c, name);
}
```

这就是不断读取文本到 buffer 中，之后遍历每个字符并记录。