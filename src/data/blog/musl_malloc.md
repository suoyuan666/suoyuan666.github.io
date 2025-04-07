---
title: "musl libc 阅读记录: malloc"
author: suo yuan
pubDatetime: 2025-04-07T01:42:21Z
draft: false
categories:
  - 源码阅读
tags:
  - musl libc
description:
  "不自量力阅读 musl libc 的记录，这个 malloc 还没完全读完，读了个大概"
---

# musl libc 中 malloc 的实现

本文说的 musl libc 是 musl libc 1.25，截止到 2025 年 4 月 6 日，该版本依旧是最新版。

## 介绍

malloc 是 C 语言中用于在内存中动态分配内存块的标准库函数

musl libc 的 malloc 默认使用的是 src/malloc/mallocng 文件夹下的实现，在 configure 脚本中可以看到:

```sh
srcdir=
prefix=/usr/local/musl
exec_prefix='$(prefix)'
bindir='$(exec_prefix)/bin'
libdir='$(prefix)/lib'
includedir='$(prefix)/include'
syslibdir='/lib'
tools=
tool_libs=
build=
target=
optimize=auto
debug=no
warnings=yes
shared=auto
static=yes
wrapper=auto
gcc_wrapper=no
clang_wrapper=no
malloc_dir=mallocng
```

这些都是默认的选项，其中 `malloc_dir` 被指定为 mallocng。该脚本支持 `--with-malloc=` 指定 musl libc 的另一个 malloc 实现

## malloc 实现

```c
void *malloc(size_t n)
{
	if (size_overflows(n)) return 0;
	struct meta *g;
	uint32_t mask, first;
	int sc;
	int idx;
	int ctr;

	if (n >= MMAP_THRESHOLD) {
		size_t needed = n + IB + UNIT;
		void *p = mmap(0, needed, PROT_READ|PROT_WRITE,
			MAP_PRIVATE|MAP_ANON, -1, 0);
		if (p==MAP_FAILED) return 0;
		wrlock();
		step_seq();
		g = alloc_meta();
		if (!g) {
			unlock();
			munmap(p, needed);
			return 0;
		}
		g->mem = p;
		g->mem->meta = g;
		g->last_idx = 0;
		g->freeable = 1;
		g->sizeclass = 63;
		g->maplen = (needed+4095)/4096;
		g->avail_mask = g->freed_mask = 0;
		// use a global counter to cycle offset in
		// individually-mmapped allocations.
		ctx.mmap_counter++;
		idx = 0;
		goto success;
	}

	sc = size_to_class(n);

	rdlock();
	g = ctx.active[sc];

	// use coarse size classes initially when there are not yet
	// any groups of desired size. this allows counts of 2 or 3
	// to be allocated at first rather than having to start with
	// 7 or 5, the min counts for even size classes.
	if (!g && sc>=4 && sc<32 && sc!=6 && !(sc&1) && !ctx.usage_by_class[sc]) {
		size_t usage = ctx.usage_by_class[sc|1];
		// if a new group may be allocated, count it toward
		// usage in deciding if we can use coarse class.
		if (!ctx.active[sc|1] || (!ctx.active[sc|1]->avail_mask
		    && !ctx.active[sc|1]->freed_mask))
			usage += 3;
		if (usage <= 12)
			sc |= 1;
		g = ctx.active[sc];
	}

	for (;;) {
		mask = g ? g->avail_mask : 0;
		first = mask&-mask;
		if (!first) break;
		if (RDLOCK_IS_EXCLUSIVE || !MT)
			g->avail_mask = mask-first;
		else if (a_cas(&g->avail_mask, mask, mask-first)!=mask)
			continue;
		idx = a_ctz_32(first);
		goto success;
	}
	upgradelock();

	idx = alloc_slot(sc, n);
	if (idx < 0) {
		unlock();
		return 0;
	}
	g = ctx.active[sc];

success:
	ctr = ctx.mmap_counter;
	unlock();
	return enframe(g, idx, n, ctr);
}
```

上面就是 malloc 的具体实现了，函数上来先判断了申请的内存是否超出了能申请的上界，如果确实超过，就返回 0。

之后则是经典的判断临界点了，它会判断 `n` 是否超过了 `MMAP_THRESHOLD` 宏，这个宏的值是 `131051`，也就是 `0x1ffec`，所以接下来有分两路，`n` 的值是否大于 `MMAP_THRESHOLD`。

### 如果 `n` 大于 `MMAP_THRESHOLD`

```c
size_t needed = n + IB + UNIT;
void *p = mmap(0, needed, PROT_READ|PROT_WRITE,
    MAP_PRIVATE|MAP_ANON, -1, 0);
if (p==MAP_FAILED) return 0;
wrlock();
step_seq();
g = alloc_meta();
if (!g) {
    unlock();
    munmap(p, needed);
    return 0;
}
g->mem = p;
g->mem->meta = g;
g->last_idx = 0;
g->freeable = 1;
g->sizeclass = 63;
g->maplen = (needed+4095)/4096;
g->avail_mask = g->freed_mask = 0;
// use a global counter to cycle offset in
// individually-mmapped allocations.
ctx.mmap_counter++;
idx = 0;
goto success;
```

这是全部代码逻辑，如果你有点听说过 malloc 的实现，那么对这段可能有点眼熟，大概就是分配空间，填充元数据，之后跳到统一处理函数的工作。

这里申请内存的部分就是这两句:

```c
size_t needed = n + IB + UNIT;
void *p = mmap(0, needed, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANON, -1, 0);
```

这里计算了申请大小+元数据的大小，之后使用 `mmap` 分配一块内存区域。之后就涉及到了元数据的分配

#### 元数据的分配

元数据的分配，需要知道以下几个数据结构

```c
```c
struct meta {
	struct meta *prev, *next;
	struct group *mem;
	volatile int avail_mask, freed_mask;
	uintptr_t last_idx:5;
	uintptr_t freeable:1;
	uintptr_t sizeclass:6;
	uintptr_t maplen:8*sizeof(uintptr_t)-12;
};

struct meta_area {
	uint64_t check;
	struct meta_area *next;
	int nslots;
	struct meta slots[];
};

struct malloc_context {
	uint64_t secret;
#ifndef PAGESIZE
	size_t pagesize;
#endif
	int init_done;
	unsigned mmap_counter;
	struct meta *free_meta_head;
	struct meta *avail_meta;
	size_t avail_meta_count, avail_meta_area_count, meta_alloc_shift;
	struct meta_area *meta_area_head, *meta_area_tail;
	unsigned char *avail_meta_areas;
	struct meta *active[48];
	size_t usage_by_class[48];
	uint8_t unmap_seq[32], bounces[32];
	uint8_t seq;
	uintptr_t brk;
};

```

分配函数如下:

```c
struct meta *alloc_meta(void)
{
	struct meta *m;
	unsigned char *p;
	if (!ctx.init_done) {
#ifndef PAGESIZE
		ctx.pagesize = get_page_size();
#endif
		ctx.secret = get_random_secret();
		ctx.init_done = 1;
	}
	size_t pagesize = PGSZ;
	if (pagesize < 4096) pagesize = 4096;
	if ((m = dequeue_head(&ctx.free_meta_head))) return m;
	if (!ctx.avail_meta_count) {
		int need_unprotect = 1;
		if (!ctx.avail_meta_area_count && ctx.brk!=-1) {
			uintptr_t new = ctx.brk + pagesize;
			int need_guard = 0;
			if (!ctx.brk) {
				need_guard = 1;
				ctx.brk = brk(0);
				// some ancient kernels returned _ebss
				// instead of next page as initial brk.
				ctx.brk += -ctx.brk & (pagesize-1);
				new = ctx.brk + 2*pagesize;
			}
			if (brk(new) != new) {
				ctx.brk = -1;
			} else {
				if (need_guard) mmap((void *)ctx.brk, pagesize,
					PROT_NONE, MAP_ANON|MAP_PRIVATE|MAP_FIXED, -1, 0);
				ctx.brk = new;
				ctx.avail_meta_areas = (void *)(new - pagesize);
				ctx.avail_meta_area_count = pagesize>>12;
				need_unprotect = 0;
			}
		}
		if (!ctx.avail_meta_area_count) {
			size_t n = 2UL << ctx.meta_alloc_shift;
			p = mmap(0, n*pagesize, PROT_NONE,
				MAP_PRIVATE|MAP_ANON, -1, 0);
			if (p==MAP_FAILED) return 0;
			ctx.avail_meta_areas = p + pagesize;
			ctx.avail_meta_area_count = (n-1)*(pagesize>>12);
			ctx.meta_alloc_shift++;
		}
		p = ctx.avail_meta_areas;
		if ((uintptr_t)p & (pagesize-1)) need_unprotect = 0;
		if (need_unprotect)
			if (mprotect(p, pagesize, PROT_READ|PROT_WRITE)
			    && errno != ENOSYS)
				return 0;
		ctx.avail_meta_area_count--;
		ctx.avail_meta_areas = p + 4096;
		if (ctx.meta_area_tail) {
			ctx.meta_area_tail->next = (void *)p;
		} else {
			ctx.meta_area_head = (void *)p;
		}
		ctx.meta_area_tail = (void *)p;
		ctx.meta_area_tail->check = ctx.secret;
		ctx.avail_meta_count = ctx.meta_area_tail->nslots
			= (4096-sizeof(struct meta_area))/sizeof *m;
		ctx.avail_meta = ctx.meta_area_tail->slots;
	}
	ctx.avail_meta_count--;
	m = ctx.avail_meta++;
	m->prev = m->next = 0;
	return m;
}
```

如果不考虑一些特殊情况的话，简单来看，那就是初始化完毕的 `ctx`，查询是否有 freelist 的存在，有就从这里分配，如果没有就看自己是否还可以分配，可以的话就通过下边这段代码获取新的元数据存储区

```c
ctx.avail_meta_count--;
m = ctx.avail_meta++;
m->prev = m->next = 0;
return m;
```

所以这里存在两个特殊情况，一个是这个 `ctx` 的初始化，另一个就是 `ctx.avail_meta_count` 为 0 的情况。

**如果 `ctx.avail_meta_count` 为 0**

```c
int need_unprotect = 1;
if (!ctx.avail_meta_area_count && ctx.brk!=-1) {
    uintptr_t new = ctx.brk + pagesize;
    int need_guard = 0;
    if (!ctx.brk) {
        need_guard = 1;
        ctx.brk = brk(0);
        // some ancient kernels returned _ebss
        // instead of next page as initial brk.
        ctx.brk += -ctx.brk & (pagesize-1);
        new = ctx.brk + 2*pagesize;
    }
    if (brk(new) != new) {
        ctx.brk = -1;
    } else {
        if (need_guard) mmap((void *)ctx.brk, pagesize,
            PROT_NONE, MAP_ANON|MAP_PRIVATE|MAP_FIXED, -1, 0);
        ctx.brk = new;
        ctx.avail_meta_areas = (void *)(new - pagesize);
        ctx.avail_meta_area_count = pagesize>>12;
        need_unprotect = 0;
    }
}
if (!ctx.avail_meta_area_count) {
    size_t n = 2UL << ctx.meta_alloc_shift;
    p = mmap(0, n*pagesize, PROT_NONE,
        MAP_PRIVATE|MAP_ANON, -1, 0);
    if (p==MAP_FAILED) return 0;
    ctx.avail_meta_areas = p + pagesize;
    ctx.avail_meta_area_count = (n-1)*(pagesize>>12);
    ctx.meta_alloc_shift++;
}
p = ctx.avail_meta_areas;
if ((uintptr_t)p & (pagesize-1)) need_unprotect = 0;
if (need_unprotect)
    if (mprotect(p, pagesize, PROT_READ|PROT_WRITE)
        && errno != ENOSYS)
        return 0;
ctx.avail_meta_area_count--;
ctx.avail_meta_areas = p + 4096;
if (ctx.meta_area_tail) {
    ctx.meta_area_tail->next = (void *)p;
} else {
    ctx.meta_area_head = (void *)p;
}
ctx.meta_area_tail = (void *)p;
ctx.meta_area_tail->check = ctx.secret;
ctx.avail_meta_count = ctx.meta_area_tail->nslots
    = (4096-sizeof(struct meta_area))/sizeof *m;
ctx.avail_meta = ctx.meta_area_tail->slots;
```

上面这些就是处理逻辑了。

在 `ctx.avail_meta_area_count` 还不为 0 的时候，就不需要考虑那两个 `if` 判断，先看如果 `ctx` 的 `meta_area` 还有空位的情况。

```c
p = ctx.avail_meta_areas;
if ((uintptr_t)p & (pagesize-1)) need_unprotect = 0;
if (need_unprotect)
    if (mprotect(p, pagesize, PROT_READ|PROT_WRITE)
        && errno != ENOSYS)
        return 0;
ctx.avail_meta_area_count--;
ctx.avail_meta_areas = p + 4096;
if (ctx.meta_area_tail) {
    ctx.meta_area_tail->next = (void *)p;
} else {
    ctx.meta_area_head = (void *)p;
}
ctx.meta_area_tail = (void *)p;
ctx.meta_area_tail->check = ctx.secret;
ctx.avail_meta_count = ctx.meta_area_tail->nslots
    = (4096-sizeof(struct meta_area))/sizeof *m;
ctx.avail_meta = ctx.meta_area_tail->slots;
```

如果有空位，就分 4096 字节过去，然后判断 `ctx.meta_area_tail` 这个尾节点是否存在，存在的话直接追加，不存在把拿到的这个地址设为头节点。

之后就是剩余元信息的计数的计算: `(4096 - sizeof(struct meta_area)) / sizeof *m`

这里剪去 `sizeof(struct meta_area)` 的原因是为了把 `slots` 之前的那些数据减掉，这里涉及到一个较为冷门概念 —— 柔性数组，这种不指定存储个数的数组被定义为结构体定义的最后一个成员的时候，`sizeof` 计算是不会算上这个数组的大小，这种数组需要运行时动态分配空间，也就是现在这样。

接下来就是 `ctx.avail_meta_area_count` 为 0 的情况了。

先看第二个 if 判断。

```c
if (!ctx.avail_meta_area_count) {
    size_t n = 2UL << ctx.meta_alloc_shift;
    p = mmap(0, n*pagesize, PROT_NONE,
        MAP_PRIVATE|MAP_ANON, -1, 0);
    if (p==MAP_FAILED) return 0;
    ctx.avail_meta_areas = p + pagesize;
    ctx.avail_meta_area_count = (n-1)*(pagesize>>12);
    ctx.meta_alloc_shift++;
}
```

这段代码很容易看懂，就是分配一块内存给 `ctx.avail_meta_areas` 使用。

书接上回，回到 `malloc()` 那里，在 `g` 被刚刚讲的 `alloc_meta()` 函数分配空间之后，就到了写这次 `malloc()` 元数据的部分

```c
g = alloc_meta();
if (!g) {
    unlock();
    munmap(p, needed);
    return 0;
}
g->mem = p;
g->mem->meta = g;
g->last_idx = 0;
g->freeable = 1;
g->sizeclass = 63;
g->maplen = (needed+4095)/4096;
g->avail_mask = g->freed_mask = 0;
// use a global counter to cycle offset in
// individually-mmapped allocations.
ctx.mmap_counter++;
idx = 0;
goto success;
```

这里的 needed + 4095 是为了向上取整。

等元数据写完后，就跳到了 `success` 这个 label

```c
success:
	ctr = ctx.mmap_counter;
	unlock();
	return enframe(g, idx, n, ctr);
```

这里值得一说的就是 `enframe()` 了

```c
static inline void *enframe(struct meta *g, int idx, size_t n, int ctr)
{
	size_t stride = get_stride(g);
	size_t slack = (stride-IB-n)/UNIT;
	unsigned char *p = g->mem->storage + stride*idx;
	unsigned char *end = p+stride-IB;
	// cycle offset within slot to increase interval to address
	// reuse, facilitate trapping double-free.
	int off = (p[-3] ? *(uint16_t *)(p-2) + 1 : ctr) & 255;
	assert(!p[-4]);
	if (off > slack) {
		size_t m = slack;
		m |= m>>1; m |= m>>2; m |= m>>4;
		off &= m;
		if (off > slack) off -= slack+1;
		assert(off <= slack);
	}
	if (off) {
		// store offset in unused header at offset zero
		// if enframing at non-zero offset.
		*(uint16_t *)(p-2) = off;
		p[-3] = 7<<5;
		p += UNIT*off;
		// for nonzero offset there is no permanent check
		// byte, so make one.
		p[-4] = 0;
	}
	*(uint16_t *)(p-2) = (size_t)(p-g->mem->storage)/UNIT;
	p[-3] = idx;
	set_size(p, end, n);
	return p;
}
```

该函数的返回值当然不难猜出，就是用户最终得到的地址，所以函数就是根据传入的 `g` 等参数，计算一个用户可访问的地址，并将其返回。

现在还有一个问题，为什么 `mmap` 分配的时候，分配的是 `n + IB + UNIT` 而不是 `n`。

一方面，可以从代码中看出来，在该函数的开头有这样一句:

```c
unsigned char *p = g->mem->storage + stride*idx;
```

这个 `p` 是最终要返回的值，可以看出 `p` 是用 `g->mem->storage` 再加上偏移量得到的，所以多申请的 `IB + UNIT` 大概率和 `g->mem` 有关

```c
struct group {
	struct meta *meta;
	unsigned char active_idx:5;
	char pad[UNIT - sizeof(struct meta *) - 1];
	unsigned char storage[];
};
```

这个结构体就是 `g->mem` 中 `mem` 的类型定义。其中 `pad` 占 7 字节，加上之前的一个指针和一个位域，总共占 16 字节，但 `IB` 是 4，`UNIT` 是 16。

这个 `pad` 成员的作用就是把 `struct group` 的大小填充为 16 字节，和 `UNIT` 一致。

### 如果 `n` 小于 `MMAP_THRESHOLD`

对于只分配一小块内存的情况， malloc 的处理逻辑如下所示

```c
sc = size_to_class(n);

rdlock();
g = ctx.active[sc];

// use coarse size classes initially when there are not yet
// any groups of desired size. this allows counts of 2 or 3
// to be allocated at first rather than having to start with
// 7 or 5, the min counts for even size classes.
if (!g && sc>=4 && sc<32 && sc!=6 && !(sc&1) && !ctx.usage_by_class[sc]) {
    size_t usage = ctx.usage_by_class[sc|1];
    // if a new group may be allocated, count it toward
    // usage in deciding if we can use coarse class.
    if (!ctx.active[sc|1] || (!ctx.active[sc|1]->avail_mask
        && !ctx.active[sc|1]->freed_mask))
        usage += 3;
    if (usage <= 12)
        sc |= 1;
    g = ctx.active[sc];
}

for (;;) {
    mask = g ? g->avail_mask : 0;
    first = mask&-mask;
    if (!first) break;
    if (RDLOCK_IS_EXCLUSIVE || !MT)
        g->avail_mask = mask-first;
    else if (a_cas(&g->avail_mask, mask, mask-first)!=mask)
        continue;
    idx = a_ctz_32(first);
    goto success;
}
upgradelock();

idx = alloc_slot(sc, n);
if (idx < 0) {
    unlock();
    return 0;
}
g = ctx.active[sc];
```

TODO: 等待更新
