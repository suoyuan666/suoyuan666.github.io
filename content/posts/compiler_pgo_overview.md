---
title: "打破静态优化的局限：PGO 优化的前世今生"
author: suo yuan
date: 2026-03-22T08:44:36Z
draft: false
tags:
  - Compiler
description: "我因为工作原因了解了一下 PGO 的现状，所以我想写一篇新手友好但又有深度的关于 PGO 优化的文章"
summary: "我因为工作原因了解了一下 PGO 的现状，所以我想写一篇新手友好但又有深度的关于 PGO 优化的文章"
---

# 打破静态优化的局限：PGO 优化的前世今生

我因为工作原因了解了一下 PGO 的现状，所以我想写一篇新手友好但又有深度的关于 PGO 优化的文章。我计划在本篇我要介绍 PGO 目前所有的方法和原理，同时尽量能引用 GCC 和 LLVM 的源代码。不过有的地方我没有具体看过源代码，不过我会在未来更新这里的。

可能我有的地方说错了，如果是的话请给我发邮件，感谢。

[PGO](https://en.wikipedia.org/wiki/Profile-guided_optimization) (Profile Guided Optimization) 是利用性能数据的优化手段。PGO 全称翻译成中文可能可以叫作性能数据导向的优化？不过我觉得有些麻烦，我还是直接称呼为 PGO 吧。

PGO 是难得的动态分析后用于优化程序的优化手段。对于 C/C++ 来说，由于程序编译后无法修改，所以我们有很多静态分析的优化手段，但静态分析时无法完全想象到程序运行时的情况，所以就有了 PGO 的用处，我们可以收集程序运行时的数据从而更好的辅助编译期去做优化。

接下来先让我简单说一下程序优化的手段

## 程序优化概述

首当其冲的是编译期提供的各种静态分析优化。如果你使用过 `gcc` 或者 `clang` （我本人没怎么用过 `msvc`）的话一定了解过各种优化选项，比如 `-O1`、`-O2` 等等，这些都是为了性能做的优化，数字越大表示越可以为了性能而牺牲程序大小。

还有为了程序大小而做的优化，这里主要针对的是嵌入式设备，因为嵌入式设备的存储空间没有那么大，所以需要 `-Os` 和 `-Oz` 这样为了存储空间占用优化的选项。

其次还有 `-Og`，它会限制优化的行为从而对调试更加友好，这里的用处也就是编程开发时了，不优化的话程序执行太慢，优化的话可能会影响调试。

为了性能分析主要有三个选项，就是 `-O1/2/3`，`-O3` 就是最高的优化设置了，超过 `-O3` 和 `-O3` 的效果是一致的。数字越大，编译器越会使用激进的方式去优化程序。这里说的激进一方面是不会考虑源代码的实际排布，另一方面则是不考虑程序生成的大小。

一般的优化我们是能理解的，比如经典的常量折叠和死代码消除这种，如果是多个数学表达式，我们可以不去求解，这样可以在保证源代码可读性的前提下并不影响性能。我是喜欢这种写法的，我倾向于不怎么计算一个纯常数参与的算术表达式的值再写到源代码中，不然要是计算出来一个看不懂是什么数字，我还得使用注释标明。

但有的死代码消除是曲解了开发者的本意的，熟悉 C 语言编程的家人们可能知道我要介绍的就是 `volatile` 关键字了。`volatile` 再大家看来显而易见的用处就是标明这个变量不能被优化，一个很通常的用处就是防止编译器把对这个变量的访问优化掉或者是优化为对寄存器的读取。因为有可能这个变量所指向的内存可能会被其他程序读写，所以对这个变量的访问必须都需要真的访问到了内存并且不能被消除。

> 不过有一个广为人知的误解就是 `volatile` 可以用来保证线程安全，实际上 `volatile` 并不是做这个的。
>
> `volatile` 有时还会被用来标明不能优化掉这个内联汇编指令。

这也是访问可见性的问题。一个变量不能被分析的一个原因就是它参与到了一个外部函数的运算中，当我们不知道这个函数不会存在副作用的情况下，我们就不能消除掉这个变量。

副作用指的是修改了变量的值、修改了文件状态以及访问了 volatile 对象，以及会做出上述操作的函数都算会有副作用。

激进的优化还有一点，那就是内联优化。一个函数被内联优化，也就是这个函数将直接被插入到调用者的函数体内。

这样做的好处是省略了 `call` 和 `ret` 的步骤，这样就可以省略几个指令直接执行，由于是顺序执行，这样 I-cache (instruction cache) 也会更好命中一些。

正如我上面说的，越激进的优化会更加不考虑程序生成的大小，这里说的就是编译器可以进行更加激进的内联优化。

一个函数被内联会导致所有关于这个函数的调用点的代码大小都会增加，可以想象的是这可能是一个疯狂的决定。而且内联不一定会提高性能，程序太大会导致加载速度变慢，同时我们要意识到的是 cache 的大小是有限的，一味的内联优化未必会带来好结果。这也是一些说 `-O3` 不一定会比 `-O2` 优化好多少的说的论据之一。

静态优化是有局限的，因为它永远也不完全知道程序运行时的真正情况。但实际上程序不是生成了就可以了，有很多因素都和运行时相关，一个重要的点就是 cache 以及分支预测。一个程序到底是哪些函数会被多次执行，分支判断时到底哪个条件分支更容易执行，哪个函数更加耗时等等，这些都是运行时才能知道的，并且针对不同的应用场景可能有不同的情况。

一般来说，我们需要使用各种 profile 工具去知晓这些并微调我们的代码，想办法解决对性能影响最关键部分的处理，看看能不能把计算精省略。但还有一点就是把性能数据直接把性能数据喂给编译器从而让编译器更好的排布程序代码布局。

## PGO

上面说的把性能数据反哺到编译过程的优化手段就是 PGO

大体来说，PGO 总共能做到下面三方面的优化:

- 代码重排
- 间接调用消除
- 数值运算优化

**代码重排**

代码重排就是把一个执行频率高的代码集中到前面，这样程序在一开始执行时就可以顺通无阻，这样的好处就是对 I-cache 友好。

**间接调用消除**

这里同样是为了 cache 考虑的。间接调用不同于直接的函数调用，间接调用指的是函数指针和虚函数。

函数指针的出现很影响 I-cache，因为一个指针存储的数值是不知道的，它可以随意指向任意位置并且没人能管它。这样的话我们实际上就不好提前知道下一步这个函数指针能带我们去哪里，cache 也就是无从谈起了。

间接调用就是要去掉这个影响，我们可以通过运行时分析提前知道这个指针存储的数值，从而提前对它进行匹配，甚至可以在这里也内联展开。

> 说起间接调用，以指针为代表的另一个东西也是对 cache 不友好的，那就是链表，尤其是那种全局变量的链表，说不定什么时候就需要申请个内存要挂在上面那种。
>
> 链表因为都是指针相连，同样也是 cache 不友好的。数组的话，CPU 可以在读取这个变量后接着多读周围内存从而让下一次读取更快速，但链表基本是利用不了这个优势的。
>
> 当然如果不是我说的那种全局的链表，运行时的时候时不时会来在某个地方申请个内存挂在上面的那种，我认为还好。比如你要是一次性申请了一个大块内存，链表的每个元素都依次存储，这样和数组差不多的形式其实也不是那么 cache 不友好。

**数值运算优化**

如果一个算术表达式多次是 2 的幂次，那么编译器就可以单独处理，毕竟这样可能可以把乘除法运算优化为左移右移。

还有对内存访问的优化，这里说的是 memcpy/malloc 这种。如果编译器可以根据实际上这个函数调用的参数生成更加高效的函数

## PGO 支持现状

不同的编译器对 PGO 支持是不同的，在我看来，LLVM 是要优于 GCC 的。Google 和 Meta 在 PGO 上的工作也基本都是在 LLVM 这里贡献，虽然也都会陆续支持 GCC（

使用 PGO 分为两步，第一步是得到性能数据，第二步是把性能数据提供给编译器。

根据得到性能数据的方法不同，PGO 大致分为插桩和不插桩的方法。

- 使用编译器插桩收集性能数据
- 使用 perf 这种专业的 profiler 收集数据

插桩后收集的性能数据是最好的，但插桩对性能影响很大，但只有把这个插桩后的程序在正确的场景下跑一遍才能得到。对于应用程序来说，只要正常跑一遍并退出，性能数据就自动 dump 下来了。

### Instrument PGO

GCC 要使用 PGO 优化的话，就是使用 `-fprofile-generate` 参数编译出插桩后的版本。

运行编译后的应用程序就会在同级目录下生成 .gcda 文件结尾的性能数据文件。之后再使用 `-fprofile-use` 即可生成优化后的程序。

gcda 是 GCC 性能数据的格式，属于是 [GCC GCOV](https://gcc.gnu.org/onlinedocs/gcc/Gcov.html) 体系下的，GCOV 还有一个用处就是测试代码覆盖率，这里则会生成 gcno 文件。

LLVM 和 GCC 使用上几乎没有区别。同样都是 `-fprofile-generate` 和 `-fprofile-use` 两板斧。这里不同的是输出的性能文件，GCC 使用的 .gcda 和源代码文件相关，也就是如果你的源代码有一个 utils/write.cpp，那么就会生成一个 utils/write.cpp.gcda 文件。LLVM 则是一个单文件 .profraw，我们需要使用 `llvm-profdata merge *.profraw -o default.profdata` 转换成 `-fprofile-use` 接受的数据格式。这里的 `default.profdata` 可以是任意名字，但 LLVM 默认接受的是这个文件名，如果是其他的就需要 `-fprofile-use=<filepath>` 手动指定了。

GCC 和 LLVM 的计数器更新方式也有方式，我们可以指定使用原子的更新方式，或者是不使用。

这里插桩，实际上是插入一些关键边。因为对于一个函数来说，除了 Entry Block 和 Exit Block 来说，其他的 Block 实际的入度和出度是一致的。虽然对于静态的 CFG 来说存在分支汇聚点，但实际上运行时的 Block 之可能来自一个点，不可能同时会从两个地方来。

所以函数内的 Block 之间的边不需要全部都插入计数器，我们只需要插入一个关键的地方，也就是我们认为运行频率不那么高但又能保证能推算出整个边执行频率的边即可。

对于 GCC 来说，每个函数开头都会插入一个对 TLS 变量的访问，这是为了记录间接调用。

我在上面已经提到了间接调用对 CPU 并不友好，所以我们可以尝试去掉间接调用的影响。在 libgcc/libgcov-profiler.c 下你会看到:

```cpp
/* These two variables are used to actually track caller and callee.  Keep
   them in TLS memory so races are not common (they are written to often).
   The variables are set directly by GCC instrumented code, so declaration
   here must match one in tree-profile.c  */

#if defined(HAVE_CC_TLS) && !defined (USE_EMUTLS)
__thread
#endif
struct indirect_call_tuple __gcov_indirect_call;
```

这个数据结构存储 callee 和 counter，GCC 会在所有函数指针的调用之前把这个指针存储的函数地址记录下来，并在每个函数的开头插入一个对这个变量的访问，如果检测到不为 `NULL`，那么就可以知道 caller 和 callee 的关系。

```cpp
static inline void
__gcov_indirect_call_profiler_body (gcov_type value, void *cur_func,
				    int use_atomic)
{
  /* If the C++ virtual tables contain function descriptors then one
     function may have multiple descriptors and we need to dereference
     the descriptors to see if they point to the same function.  */
  if (cur_func == __gcov_indirect_call.callee
      || (__LIBGCC_VTABLE_USES_DESCRIPTORS__
	  && *(void **) cur_func == *(void **) __gcov_indirect_call.callee))
    __gcov_topn_values_profiler_body (__gcov_indirect_call.counters, value,
				      use_atomic);

  __gcov_indirect_call.callee = NULL;
}

void
__gcov_indirect_call_profiler_v4 (gcov_type value, void *cur_func)
{
  __gcov_indirect_call_profiler_body (value, cur_func, 0);
}
```

如果检测到不为 `NULL`，那么就会调用 `__gcov_indirect_call_profiler_v4`，这都是 GCC 插入的代码。

在 gcc/tree-profile.cc 下的 `gimple_gen_ic_profiler` 函数中可以看到这个插桩的处理:

```cpp
  /* Insert code:

    stmt1: __gcov_indirect_call.counters = get_relevant_counter_ptr ();
    stmt2: tmp1 = (void *) (indirect call argument value)
    stmt3: __gcov_indirect_call.callee = tmp1;

    Example:
      f_1 = foo;
      __gcov_indirect_call.counters = &__gcov4.main[0];
      PROF_fn_9 = f_1;
      __gcov_indirect_call.callee = PROF_fn_9;
      _4 = f_1 ();
   */

  tree gcov_type_ptr = build_pointer_type (get_gcov_type ());

  tree counter_ref = build3 (COMPONENT_REF, gcov_type_ptr,
			     ic_tuple_var, ic_tuple_counters_field, NULL_TREE);

  stmt1 = gimple_build_assign (counter_ref, ref_ptr);
  tmp1 = make_temp_ssa_name (ptr_type_node, NULL, "PROF_fn");
  stmt2 = gimple_build_assign (tmp1, unshare_expr (value->hvalue.value));
  tree callee_ref = build3 (COMPONENT_REF, ptr_type_node,
			     ic_tuple_var, ic_tuple_callee_field, NULL_TREE);
  stmt3 = gimple_build_assign (callee_ref, tmp1);

  gsi_insert_before (&gsi, stmt1, GSI_SAME_STMT);
  gsi_insert_before (&gsi, stmt2, GSI_SAME_STMT);
  gsi_insert_before (&gsi, stmt3, GSI_SAME_STMT);
```

之后在 `gimple_gen_ic_func_profiler` 中有:

```cpp

  /* Insert code:

     if (__gcov_indirect_call.callee != NULL)
       __gcov_indirect_call_profiler_v3 (profile_id, &current_function_decl);

     The function __gcov_indirect_call_profiler_v3 is responsible for
     resetting __gcov_indirect_call.callee to NULL.  */

  gimple_stmt_iterator gsi = gsi_start_bb (cond_bb);
  void0 = build_int_cst (ptr_type_node, 0);

  tree callee_ref = build3 (COMPONENT_REF, ptr_type_node,
			    ic_tuple_var, ic_tuple_callee_field, NULL_TREE);

  tree ref = force_gimple_operand_gsi (&gsi, callee_ref, true, NULL_TREE,
				       true, GSI_SAME_STMT);

  gcond *cond = gimple_build_cond (NE_EXPR, ref,
				   void0, NULL, NULL);
  gsi_insert_before (&gsi, cond, GSI_NEW_STMT);

  gsi = gsi_after_labels (update_bb);

  cur_func = force_gimple_operand_gsi (&gsi,
				       build_addr (current_function_decl),
				       true, NULL_TREE,
				       true, GSI_SAME_STMT);
  tree_uid = build_int_cst
	      (gcov_type_node,
	       cgraph_node::get (current_function_decl)->profile_id);
  stmt1 = gimple_build_call (tree_indirect_call_profiler_fn, 2,
			     tree_uid, cur_func);
  gsi_insert_before (&gsi, stmt1, GSI_SAME_STMT);
```

为了防止数据竞争问题，GCC 使用 `__thread` 修饰 `__gcov_indirect_call` 保证这个变量变成 TLS 的。libgcc 将这个变量处理成 TLS 的，GCC 也必须是 `--enable-tls` 编译的才可以，不过现在大家编译应用程序的 GCC 应该都是支持 TLS 的。

但 GCC 的 counter 更新并不一定是安全的，你可以在 libgcc 中看到如下注释:

```cpp
/* Update one value profilers (COUNTERS) for a given VALUE.

   CAVEAT: Following function is not thread-safe, only total number
   of executions (COUNTERS[2]) is update with an atomic instruction.
   Problem is that one cannot atomically update two counters
   (COUNTERS[0] and COUNTERS[1]), for more information please read
   following email thread:
   https://gcc.gnu.org/ml/gcc-patches/2016-08/msg00024.html.  */

void
__gcov_topn_values_profiler_atomic (gcov_type *counters, gcov_type value)
{
  __gcov_topn_values_profiler_body (counters, value, 1);
}
```

只要你附加了 `-fprofile-update=atomic` 就会使用 `_atomic` 版本，那么 counter 的更新就应该是原子的，但这里标明并不一定，我会简单解释一下为什么。

这里涉及到 counters 的结构了，这里的 `gcov_type *counters` 指向的 counters 总共有三个元素，也就是这里提到的 `COUNTERS[0]`、`COUNTERS[1]` 和 `COUNTERS[2]`

- `COUNTERS[0]`: 所有 counter 的值的加和，比如就有两个计数器有值，分别是 2 和 3，那么 `COUNTERS[0]` 就是 5
- `COUNTERS[1]`: 所有 counter 的数量
- `COUNTERS[2]`: 指向 counter 的指针，整个 counters 是一个链表。

下面我会简单介绍一下 libgcc 中关于 topn counter 的记录处理:

```c
/* Add key value pair VALUE:COUNT to a top N COUNTERS.  When INCREMENT_TOTAL
   is true, add COUNT to total of the TOP counter.  If USE_ATOMIC is true,
   do it in atomic way.  Return true when the counter is full, otherwise
   return false.  */

static inline unsigned
gcov_topn_add_value (gcov_type *counters, gcov_type value, gcov_type count,
		     int use_atomic, int increment_total)
{
  if (increment_total)
    {
      /* In the multi-threaded mode, we can have an already merged profile
	 with a negative total value.  In that case, we should bail out.  */
      if (counters[0] < 0)
    	return 0;
      gcov_counter_add (&counters[0], 1, use_atomic);
    }

  struct gcov_kvp *prev_node = NULL;
  struct gcov_kvp *minimal_node = NULL;
  struct gcov_kvp *current_node  = (struct gcov_kvp *)(intptr_t)counters[2];

  while (current_node)
    {
      if (current_node->value == value)
	{
	  gcov_counter_add (&current_node->count, count, use_atomic);
	  return 0;
	}

      if (minimal_node == NULL
	  || current_node->count < minimal_node->count)
    	minimal_node = current_node;

      prev_node = current_node;
      current_node = current_node->next;
    }

  if (counters[1] == GCOV_TOPN_MAXIMUM_TRACKED_VALUES)
    {
      if (--minimal_node->count < count)
	{
	  minimal_node->value = value;
	  minimal_node->count = count;
	}

      return 1;
    }
  else
    {
      struct gcov_kvp *new_node = allocate_gcov_kvp ();
      if (new_node == NULL)
    	return 0;

      new_node->value = value;
      new_node->count = count;

      int success = 0;
      if (!counters[2])
	{
#if GCOV_SUPPORTS_ATOMIC
	  if (use_atomic)
	    {
	      struct gcov_kvp **ptr = (struct gcov_kvp **)(intptr_t)&counters[2];
	      success = !__sync_val_compare_and_swap (ptr, 0, new_node);
	    }
	  else
#endif
	    {
	      counters[2] = (intptr_t)new_node;
	      success = 1;
	    }
	}
      else if (prev_node && !prev_node->next)
	{
#if GCOV_SUPPORTS_ATOMIC
	  if (use_atomic)
	    success = !__sync_val_compare_and_swap (&prev_node->next, 0,
						    new_node);
	  else
#endif
	    {
	      prev_node->next = new_node;
	      success = 1;
	    }
	}

      /* Increment number of nodes.  */
      if (success)
        gcov_counter_add (&counters[1], 1, use_atomic);
    }

  return 0;
}
```

我不得不先吐槽一下这个代码格式乍一看是真难看，不过细看也好看不到哪去。难道是我的复制出现了问题，GitHub 那里显示的比我这里要好一些。

我来个省流版，介绍一下这个函数是要在做什么。

首先，如果 `increment_total` 为 `1` 就要把 `COUNTERS[0]` 加 1，但实际上这个函数的 caller 都得通过下面这个函数来调用，也就是 merge 操作的时候不需要加

```c
static inline void
__gcov_topn_values_profiler_body (gcov_type *counters, gcov_type value,
				  int use_atomic)
{
  gcov_topn_add_value (counters, value, 1, use_atomic, 1);
}
```

之后呢，就是核心的对 counter 的加 1 了，这个函数的大半部分都是在处理这件事。首先是 counters 到底是否经历过初始化，如果没有就需要先初始化。

但如果 counter 不是 `NULL`，就要搜索当前要加 1 的计数器的 value 是否已经有计数器了。如果有的话皆大欢喜，如果没有就把最小的 counter 的计数减 1 再和当前要记录的计数相比，如果更小就发生替换。这里也就是一个退让原则，把计数最小的 counter 去掉，用新记录的。

在这个函数就能看出我介绍的 `COUNTERS` 数组三个元素都是做什么的了。所以这里的问题就是，这三个元素都是有用处的，每个 `COUNTERS` 的更新都是原子的，但难绷的是三个元素的更新总的来看并不是一个原子操作。

在 gcc/profile.cc 的 compute_value_histograms 中你会看到

```cpp
/* TOP N counter uses variable number of counters.  */
if (topn_p)
{
  unsigned total_size;
  if (act_count[t])
    total_size = 2 + 2 * act_count[t][1];
  else
    total_size = 2;
```

这里 `2 * act_count[t][1]` 的原因就是 `COUNTERS[1]` 记录了计数器实际的数量，要 `2 *` 的原因是因为有 value 和 count，而另外的 `2` 就是 `COUNTERS[0]` 和 `COUNTERS[1]` 了，之后编译器会根据这个读取计数器的实际的值。

但 LLVM 没有这个问题，下面是 compiler-rt 中对此的处理:

```c
static COMPILER_RT_ALWAYS_INLINE void
instrumentTargetValueImpl(uint64_t TargetValue, void *Data,
                          uint32_t CounterIndex, uint64_t CountValue) {
  __llvm_profile_data *PData = (__llvm_profile_data *)Data;
  if (!PData)
    return;
  if (!CountValue)
    return;
  if (!PData->Values) {
    if (!allocateValueProfileCounters(PData))
      return;
  }

  ValueProfNode **ValueCounters = (ValueProfNode **)PData->Values;
  ValueProfNode *PrevVNode = NULL;
  ValueProfNode *MinCountVNode = NULL;
  ValueProfNode *CurVNode = ValueCounters[CounterIndex];
  uint64_t MinCount = UINT64_MAX;

  uint8_t VDataCount = 0;
  while (CurVNode) {
    if (TargetValue == CurVNode->Value) {
      CurVNode->Count += CountValue;
      return;
    }
    if (CurVNode->Count < MinCount) {
      MinCount = CurVNode->Count;
      MinCountVNode = CurVNode;
    }
    PrevVNode = CurVNode;
    CurVNode = CurVNode->Next;
    ++VDataCount;
  }

  if (VDataCount >= VPMaxNumValsPerSite) {
    /* Bump down the min count node's count. If it reaches 0,
     * evict it. This eviction/replacement policy makes hot
     * targets more sticky while cold targets less so. In other
     * words, it makes it less likely for the hot targets to be
     * prematurally evicted during warmup/establishment period,
     * when their counts are still low. In a special case when
     * the number of values tracked is reduced to only one, this
     * policy will guarantee that the dominating target with >50%
     * total count will survive in the end. Note that this scheme
     * allows the runtime to track the min count node in an adaptive
     * manner. It can correct previous mistakes and eventually
     * lock on a cold target that is alread in stable state.
     *
     * In very rare cases,  this replacement scheme may still lead
     * to target loss. For instance, out of \c N value slots, \c N-1
     * slots are occupied by luke warm targets during the warmup
     * period and the remaining one slot is competed by two or more
     * very hot targets. If those hot targets occur in an interleaved
     * way, none of them will survive (gain enough weight to throw out
     * other established entries) due to the ping-pong effect.
     * To handle this situation, user can choose to increase the max
     * number of tracked values per value site. Alternatively, a more
     * expensive eviction mechanism can be implemented. It requires
     * the runtime to track the total number of evictions per-site.
     * When the total number of evictions reaches certain threshold,
     * the runtime can wipe out more than one lowest count entries
     * to give space for hot targets.
     */
    if (MinCountVNode->Count <= CountValue) {
      CurVNode = MinCountVNode;
      CurVNode->Value = TargetValue;
      CurVNode->Count = CountValue;
    } else
      MinCountVNode->Count -= CountValue;

    return;
  }

  CurVNode = allocateOneNode();
  if (!CurVNode)
    return;
  CurVNode->Value = TargetValue;
  CurVNode->Count += CountValue;

  uint32_t Success = 0;
  if (!ValueCounters[CounterIndex])
    Success =
        COMPILER_RT_BOOL_CMPXCHG(&ValueCounters[CounterIndex], 0, CurVNode);
  else if (PrevVNode && !PrevVNode->Next)
    Success = COMPILER_RT_BOOL_CMPXCHG(&(PrevVNode->Next), 0, CurVNode);

  if (!Success && !hasStaticCounters) {
    free(CurVNode);
    return;
  }
}
```

这里就是原子的，因为它不像 GCC 那样需要有 `COUNTERS[0]` 和 `COUNTERS[1]`，这里就是数据格式设计上的差异了。

### AutoFDO & Propeller

AutoFDO 是 Google 提出的性能优化手段，它要解决的问题是插桩的 PGO 会导致性能严重受到影响。有的时候我们可能无法接受用一个插桩后的版本在生产环境上跑一遍，但我们可以使用 perf 这个工具得出待优化数据的 profile

根据 Google 的数据，AutoFDO 大概能优化 20%，根据不同的应用和场景来说，其实这个也未必能真的那么好用。不过[貌似 Android 要引入 AutoFDO 了](https://android-developers.googleblog.com/2026/03/BoostingAndroidPerformanceIntroducingAutoFDO.html)。

虽然 AutoFDO 被 GCC 和 LLVM 同时支持，不过似乎还是 LLVM 更好一些。我看 Linux 文档标明，Linux 的 AutoFDO 只支持 LLVM:

> The support requires a Clang compiler LLVM 17 or later.
>
> -- https://docs.kernel.org/dev-tools/autofdo.html

Propeller 是 AutoFDO 配套的工具。不过严格的来说 Propeller 属于是 PLO，即 Post-Link Optimization，因为 Propeller 是对链接后的应用程序进行进一步的排布。

因为是用 perf 得出的性能数据，所以 AutoFDO 不需要编译插桩后的版本。

Linux 支持 AutoFDO 和 Propeller 并不支持 Instrument PGO，因为 Linus 本人认为插桩带来的性能影响是不可接受的，如果插桩比 perf 好很多就应该优化 perf

在 2024 年的 Linux Plumbers Conference 中，Google 介绍 AutoFDO 和 Propeller: https://lwn.net/Articles/995397/

### BOLT

BOLT 是 Meta 开发的工具，也属于是 Post-Link Optimization，都是把已经链接好的应用程序进行重新排布并链接。BOLT 虽然是 LLVM 下面的项目，不过好像也支持 GCC

在 2024 年的 Linux Plumbers Conference 同样也有来自 Meta BOLT 的介绍: https://lwn.net/Articles/993828/

在 [2025 年 US LLVM Developers' Meeting](https://www.llvm.org/devmtg/2025-10/) 中，来自 Arm 的工程师介绍了 BOLT 和其他 PGO 技术

### CSIR PGO

下面要介绍的事情就和 GCC 无关了，都是 LLVM 所支持的。

CSIR PGO 要解决的问题是函数内联完全展开可能并不是应该的。

> CSIR PGO 有时候也可能直接叫 CS PGO，叫做 CSIR PGO 是因为在 LLVM 中，Instrument PGO 叫做 IR PGO
>
> 与 IR PGO 相对的是 Front-end 的，Front-end 主要用于代码覆盖率统计，因为这会和源代码相关，但 IR-PGO 由于为了性能优化不会考虑什么源代码信息。

IR PGO 存在的问题是，我们收集的函数的运行频率很高就可能会把所有这个函数的调用点都内联展开，但实际上，不同的函数执行被内联的函数时的策略可能并不一样。

考虑三个函数分别是 `funca`、`funcb` 和 `hot`。这个 `hot` 函数会被 `funca` 和 `funcb` 调用。但问题是 `funca` 和 `funcb` 调用 `hot` 时的路径并不一致，但我们统计的时候只能知道 `hot` 内部执行的频率，不知道哪里时 `funca` 执行多的，哪个是 `funcb` 执行多的。

所以 CSIR PGO 会在 `-fprofile-use` 之后再插桩一遍。这次已经是内联后，就可以获取到准确的上下文信息了，我们就可以做出更好的优化。

### CSS PGO

CSS PGO 是 Meta 提出，RFC 讨论在: https://groups.google.com/g/llvm-dev/c/1p1rdYbL93s

CSS PGO 要解决的是 AutoFDO 对 perf 过于依赖的问题。perf 跑的是可以运行的程序，这就导致一个问题，它永远也不知道源代码到底是什么样子的。

一个简单的事情就是，AutoFDO 只能在已经内联优化后的结果做裁减，因为你使用了 perf，你就不知道内联前的样子，不然内联优化不是白做了，而且调试信息也未必真的十分准确。CSS PGO 要解决的就是这个问题。

### Temporal Profiling Extension for IRPGO

同样由 Meta 提出，这里要使用的场景是移动设备上进行内联优化并不一定会提高性能，因为程序的体积增大会减慢加载时间。

Meta 想要把优化的中心放在启动速度优化上，在不怎么增大程序的同时通过把先使用的函数都放到前面从而减少 Page Fault 的次数。
