---
title: "xv6-riscv 源码阅读 —— mkfs"
author: suo yuan
pubDatetime: 2025-01-20T05:38:31Z
draft: false
categories:
  - 源码阅读 
series:
  - xv6-riscv_源码阅读
tags:
  - Xv6_RISC-V
description: "尝试把 xv6-riscv 读一遍，这是 mkfs 部分，用来生成硬盘镜像的"
summary: "尝试把 xv6-riscv 读一遍，这是 mkfs 部分，用来生成硬盘镜像的"
---
# mkfs

mkfs 用来生成硬盘镜像文件 fs.img

从 Makefile 中就可以看出，`make qemu` 只有两个依赖：

```Makefile
qemu: $K/kernel fs.img
```

编译好的内核，以及一个 fs.img

其中，fs.img 这个目标是这样生成的：

```Makefile
fs.img: mkfs/mkfs README $(UPROGS)
	mkfs/mkfs fs.img README $(UPROGS)
```

```txt
Disk layout:
[ boot block | sb block | log | inode blocks | free bit map | data blocks ]
```

```c
int
main(int argc, char *argv[])
{
  int i, cc, fd;
  uint rootino, inum, off;
  struct dirent de;
  char buf[BSIZE];
  struct dinode din;


  static_assert(sizeof(int) == 4, "Integers must be 4 bytes!");

  if(argc < 2){
    fprintf(stderr, "Usage: mkfs fs.img files...\n");
    exit(1);
  }

  assert((BSIZE % sizeof(struct dinode)) == 0);
  assert((BSIZE % sizeof(struct dirent)) == 0);

  fsfd = open(argv[1], O_RDWR|O_CREAT|O_TRUNC, 0666);
  if(fsfd < 0)
    die(argv[1]);

  // 1 fs block = 1 disk sector
  nmeta = 2 + nlog + ninodeblocks + nbitmap;
  nblocks = FSSIZE - nmeta;

  sb.magic = FSMAGIC;
  sb.size = xint(FSSIZE);
  sb.nblocks = xint(nblocks);
  sb.ninodes = xint(NINODES);
  sb.nlog = xint(nlog);
  sb.logstart = xint(2);
  sb.inodestart = xint(2+nlog);
  sb.bmapstart = xint(2+nlog+ninodeblocks);

  printf("nmeta %d (boot, super, log blocks %u inode blocks %u, bitmap blocks %u) blocks %d total %d\n",
         nmeta, nlog, ninodeblocks, nbitmap, nblocks, FSSIZE);

  freeblock = nmeta;     // the first free block that we can allocate

  for(i = 0; i < FSSIZE; i++)
    wsect(i, zeroes);

  memset(buf, 0, sizeof(buf));
  memmove(buf, &sb, sizeof(sb));
  wsect(1, buf);

  rootino = ialloc(T_DIR);
  assert(rootino == ROOTINO);

  bzero(&de, sizeof(de));
  de.inum = xshort(rootino);
  strcpy(de.name, ".");
  iappend(rootino, &de, sizeof(de));

  bzero(&de, sizeof(de));
  de.inum = xshort(rootino);
  strcpy(de.name, "..");
  iappend(rootino, &de, sizeof(de));

  for(i = 2; i < argc; i++){
    // get rid of "user/"
    char *shortname;
    if(strncmp(argv[i], "user/", 5) == 0)
      shortname = argv[i] + 5;
    else
      shortname = argv[i];
    
    assert(index(shortname, '/') == 0);

    if((fd = open(argv[i], 0)) < 0)
      die(argv[i]);

    // Skip leading _ in name when writing to file system.
    // The binaries are named _rm, _cat, etc. to keep the
    // build operating system from trying to execute them
    // in place of system binaries like rm and cat.
    if(shortname[0] == '_')
      shortname += 1;

    assert(strlen(shortname) <= DIRSIZ);
    
    inum = ialloc(T_FILE);

    bzero(&de, sizeof(de));
    de.inum = xshort(inum);
    strncpy(de.name, shortname, DIRSIZ);
    iappend(rootino, &de, sizeof(de));

    while((cc = read(fd, buf, sizeof(buf))) > 0)
      iappend(inum, buf, cc);

    close(fd);
  }

  // fix size of root inode dir
  rinode(rootino, &din);
  off = xint(din.size);
  off = ((off/BSIZE) + 1) * BSIZE;
  din.size = xint(off);
  winode(rootino, &din);

  balloc(freeblock);

  exit(0);
}
```

其中，

```c
nmeta = 2 + nlog + ninodeblocks + nbitmap;
nblocks = FSSIZE - nmeta;
```

`nmeta` 是元信息的数目，用 `FSSIZE` 减去 `nmeta` 则是用来得到具体数据存储区域的部分

```c
uint
xint(uint x)
{
  uint y;
  uchar *a = (uchar*)&y;
  a[0] = x;
  a[1] = x >> 8;
  a[2] = x >> 16;
  a[3] = x >> 24;
  return y;
}
```

该函数作用是将传入的 uint 的字节序转换成小端，如果本身运行程序的平台就是小端的，则不会有任何改动

```c
void
wsect(uint sec, void *buf)
{
  if(lseek(fsfd, sec * BSIZE, 0) != sec * BSIZE)
    die("lseek");
  if(write(fsfd, buf, BSIZE) != BSIZE)
    die("write");
}
```

这里就是先 seek 一段偏移量，之后在写入

```c
void
iappend(uint inum, void *xp, int n)
{
  char *p = (char*)xp;
  uint fbn, off, n1;
  struct dinode din;
  char buf[BSIZE];
  uint indirect[NINDIRECT];
  uint x;

  rinode(inum, &din);
  off = xint(din.size);
  // printf("append inum %d at off %d sz %d\n", inum, off, n);
  while(n > 0){
    fbn = off / BSIZE;
    assert(fbn < MAXFILE);
    if(fbn < NDIRECT){
      if(xint(din.addrs[fbn]) == 0){
        din.addrs[fbn] = xint(freeblock++);
      }
      x = xint(din.addrs[fbn]);
    } else {
      if(xint(din.addrs[NDIRECT]) == 0){
        din.addrs[NDIRECT] = xint(freeblock++);
      }
      rsect(xint(din.addrs[NDIRECT]), (char*)indirect);
      if(indirect[fbn - NDIRECT] == 0){
        indirect[fbn - NDIRECT] = xint(freeblock++);
        wsect(xint(din.addrs[NDIRECT]), (char*)indirect);
      }
      x = xint(indirect[fbn-NDIRECT]);
    }
    n1 = min(n, (fbn + 1) * BSIZE - off);
    rsect(x, buf);
    bcopy(p, buf + off - (fbn * BSIZE), n1);
    wsect(x, buf);
    n -= n1;
    off += n1;
    p += n1;
  }
  din.size = xint(off);
  winode(inum, &din);
}
```

`iappend` 用于将内容附加到 inode 中

> inode 是文件的抽象表示，每个文件都存在一个唯一编号 `i` 和文件数据
>
> `ls` 的 `-i` 参数用来显示文件的 inode 编号
> 在 xv6 中，inode 的前 `NDIRECT` 个数据块直接被 inode 结构体的成员引用，而之后的数据块被间接引用（`inode` 引用了一个数据块，它存放了真正存放数据的数据块的地址）

使用十六进制编辑器查看 fs.img，可以印证之前看到的代码

![hyx_fs_inode](/img/xv6-riscv-read/hyx_fs_inode.png)

这里就是 inode 数据，第一个 `.` 和第二个 `..` 之所以编号都为 1，因为在 `main` 函数中，编号都用的 `rootino`，而在调用 `iappend` 的时候大小传入的 `sizeof(de)` 为 16，这里也是两个文件信息占一行，也就是 32 字节。

这里的首地址是 0xb800，也就是 46 * 1024，这就是数据存储区域的开始，也是根目录这个 inode 的数据，而在下一个 block，也就是 47 * 1024 = 0xbc00 的位置，存放着第一个文件 README 的文本内容
