---
title: "译文: C++ 对象的生命周期"
author: suo yuan
date: 2024-10-24T01:49:02Z
draft: false
tags:
  - cpp notes
categories:
  - cpp
description: "一篇讲 C++ 对象生命周期的译文"
summary: "一篇讲 C++ 对象生命周期的译文"
---


# 译文: C++ 对象的生命周期

---

本篇为 https://basit.pro/cpp-object-lifecycle/ 的译文

如果文章作者介意翻译转载，需要删除掉，可以选择以一些我能看到的方式（如评论）告知我

---

关于 RAII/C++ 的大多数讨论都没涉及到维持对象存在所需的隐含条件。在实现自定义的容器，以及内存分配器和 "tag discriminated unions" 的时候就需要这些隐含条件(如 [`Result<T, E>`](https://github.com/lamarrr/ashura/blob/ec183d8cb6109c263e5b6b0f070079bf3db65230/ashura/std/result.h#L29), [`Option<T>`](https://github.com/lamarrr/ashura/blob/ec183d8cb6109c263e5b6b0f070079bf3db65230/ashura/std/option.h#L25), [`std::variant<T...>`](https://en.cppreference.com/w/cpp/utility/variant))

---

译者注: 

tag discriminated unions 指的是使用一个 tag 区分联合体中的类型。`std::variant` 就是一个类型安全的联合体

> 一个 std::variant 的实例在任意时刻要么保有它的可选类型之一的值，要么在错误情况下无值

---

这些通常被称为“不安全”操作，因为它们确实需要了解对象生命周期不变量或生命周期。我假设您对汇编有一定的了解，因为如果没有它们，就很难理解本文中的一些操作

**NOTE**: 我们不会讨论异常，也不会讨论极端情况、不必要的复杂性、code path explosions 以及它们引入的限制

C++对象的生命周期如下所示:

```txt
  allocate placement memory
             ||
             ||                     ============
             \/                     ||        ||
====>  construct object  ===> assign object <===
||           ||                     ||
||           \/                     ||
====== destruct object  <=============
             ||
             \/
 deallocate placement memory
```

违反此生命周期将导致 **未定义的行为** ，通常是: 内存泄漏、double-free、未初始化的内存上的读/写、未对齐的读/写、nullptr 取消引用、越界读/写等

我用于测试容器中生命周期违规的经验法则是确保构造数量等于破坏数量。我们将用于演示其中一些概念的类型定义如下:

```cpp
struct Counter {
    uint32_t num_constructs = 0;
    uint32_t num_destructs = 0;

    void log() {
        printf("num_constructs = %" PRIu32 " \nnum_destructs =  %" PRIu32 "\n",
               num_constructs, num_destructs);
    }
} counter;

struct Obj {
    // default-construction
    Obj() { counter.num_constructs++; }
    // copy-construction
    Obj(Obj const& t) : data{t.data} { counter.num_constructs++; }
    // move-construction
    Obj(Obj&& t) : data{t.data} { counter.num_constructs++; }
    // copy-assignment
    Obj& operator=(Obj const& t) {
        data = t.data;
        return *this;
    }
    // move-assignment
    Obj& operator=(Obj&& t) {
        data = t.data;
        return *this;
    }
    // destruction
    ~Obj() { counter.num_destructs++; }
    uint32_t data = 1;
};
```

```cpp
struct Animal {
    virtual void react() = 0;
};

struct Cat : Animal {
    void react() override { printf("purr...\n"); }
};

struct Dog : Animal {
    void react() override { printf("woof!\n"); }
};
```

**内存分配**

一个对象的内存可能来自于栈(例如 `alloca`, `malloca`)或者堆(例如 `sbrk`, `malloc`, `kalloc`)。对于放在这里的对象存在一些基本要求:

- 成功分配后，分配器返回的内存必须是有效且尚未被使用过的。否则会存在 double-free 问题。

**SEE**: GCC 的 [`__attribute__((malloc(...)))`](https://gcc.gnu.org/onlinedocs/gcc/Common-Function-Attributes.html) 和 MSVC 的 [`__restrict`](https://learn.microsoft.com/en-us/cpp/cpp/restrict?view=msvc-170) 可以为编译器的可达性分析启用全局 aliasing 优化。

---

译者注:

这二位都是用于表明该对象指向一个单独的内存，当编译器知道指针不会指向相同的区域时，可以做一些更加激进的优化，也就是所谓的 aliasing 优化。

对于 aliasing 优化来说，GCC 的 `O2` 优化就会默认启用一些。

aliasing 后续会被译为别名

---

**NOTE**: `malloc(0)` 和 `realloc(ptr, 0, 0)` 不需要返回 `nullptr`，并且是实现定义行为。实现可能会决定为 0 大小的分配返回相同或不同的非空（可能是 sentinel）内存地址。

- 通用分配器 **应该** 至少支持 `alignof(max_align_t)` 的对齐，其中 [`max_align_t`](https://en.cppreference.com/w/c/types/max_align_t) 大多是 `double`（8字节）或 `long double`（16字节），就像 `malloc` 的情况一样。 `max_align_t` 是最大对齐整型标量类型。

**NOTE**: C11 引入了`aligned_alloc` 用于 over-aligned allocations (超出 `alignof(max_align_t)` )，这通常是 `SIMD` 向量操作 (`SSE/AVX` 的128 位、256 位和 512 位扩展)所必需的，因为 `SIMD` 的宽寄存器运行于 over-aligned memory addresses。 MSVC 的 C 运行时尚不支持 `aligned_alloc` ，但提供 [`_aligned_malloc`](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/aligned-malloc?view=msvc-170) 和 [`_aligned_free`](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/aligned-free?view=msvc-170)。

## 构造对象

这是对象生命周期开始的地方。对于 non-trivially 可构造类型，这意味着在放置内存上放置新对象；对于 trivially 可构造类型，这意味着在对象放置内存上进行任何内存写入操作

对象的放置内存地址的大小 **必须** 至少为对象的大小，并且内存中的对象放置地址 **必须** 与对象对齐的倍数对齐。如果在大小不合适的内存位置构造对象，则可能导致未定义的行为(越界读取)。不适当对齐的放置内存可能会导致未对齐的读写(未定义的行为，在某些 CPU 架构上可能会因 `SIGILL` 导致应用程序崩溃或导致性能下降)。读取未初始化/未构造的对象是未定义的行为并且是灾难性的

Placement-new 有一些重要的目的：

- 初始化虚拟(基类和继承的)类的虚函数调度表(简单的构造，即 `memset` 或 `memcpy` 是不够的)
- 初始化类/结构、其基类及其成员

让我们看看实际案例:

[Godbolt](https://godbolt.org/z/fq9KdP1eo)

```cpp
int * x = (int*) malloc(4);
(*x)++; // undefined behavior
```

上面的代码由于未初始化地读取内存 x 处的 `int` 而引发了未定义的行为。启用优化后，编译器可以主动决定忽略增量操作

fix:

```cpp
int * x = (int*) malloc(4);
* x = 0;
(*x)++;
```

因为 `int` 是一个 trivially 的可构造类型(即没有特殊的构造语义)，没有不变量，所以它可以通过写入内存地址来简单地构造，并且 `int` “对象”将隐式存在于内存地址 x 处。要在地址 x 构造一个 `int` 或普通可构造对象，您还可以使用：

- placement new
- memcpy/memmove
- memset/memset_explicit

现在，让我们看一下具有更复杂构造语义 (non-trivially-constructible) 的类型:

[Godbolt](https://godbolt.org/z/Kn3bccore)

```cpp
Obj* obj = (Obj*) malloc(sizeof(Obj));
obj->data++; // undefined behavior, data is random value
printf("data: %" PRIu32 "\n", obj->data);
counter.log(); // num_constructs = 0, num_destructs = 0
```

从上面的日志中，您可以看到对象从未在地址 obj 处构造，因此，obj 处尚不存在 Obj 类型的对象，并且在该状态下使用/销毁该对象是未定义的行为。这可能会导致许多违反合同/未定义的行为，例如双重释放、越界读/写。

fix:

[Godbolt](https://godbolt.org/z/1M58e85Mh)

```cpp
Obj* obj = (Obj*) malloc(sizeof(Obj));
new (obj) Obj{};  // constructs object of type Obj at the address
obj->data++;  // ok: data is increased from default value of 1 to 2
printf("data: %" PRIu32 "\n", obj->data);
counter.log();  // num_constructs = 1, num_destructs = 0
```

placement new 在地址 obj 处构造了 Obj 类型的对象，现在包含有效的成员数据

Placement-new 还用于初始化虚函数表指针，使对象可在 virtual dispatch 中使用。如果某个对象不是使用 Placement-new 构造的，则编译器的可达性分析**可能**会判定该对象在内存地址中不存在，从而调用未定义的行为。举例说明：

[Godbolt](https://godbolt.org/z/aMMGe1n8o)

```cpp
Cat * cat = (Cat*) malloc(sizeof(Cat));
memset(cat, 0, sizeof(Cat));
cat->react(); // static dispatches to Cat::react()
Animal * animal = cat;
animal->react(); // undefined behavior
```

调用 `cat->react()`，通过静态调度正确调用 `Cat::react`。然而，通过类型擦除的调用 `Animal->react()` 从其基类方法 `Animal::react` dynamic dispatch，编译器**可以**决定简单地删除/忽略它，因为它是未定义的行为(调用空函数指针)，如果在调试模式下或编译器的可达性分析无法看到 `memset`，则可能会导致 segmentation fault

为了检查为什么会发生这种情况，让我们看一下使用自定义 dynamic dispatch/v-table 来实现虚类:

```cpp
struct Animal{
 void (*react)(void *);
};

struct Cat{
  Animal animal{
    .react = &react
  };
 static void react(void *);
};
```

为了发生 virtual dispatchl，需要调用函数指针 `Animal::react`，但在前面的示例中，`Animal::react` 会被 `memset` 调用初始化为 0，当 `Animal->react()` 时，这是未定义的行为调用

为了修复前面的示例，我们需要通过 Placement-new 调用正确初始化实现定义的虚函数调度表，即：

[Godbolt](https://godbolt.org/z/z3rds6hPc)

```cpp
Cat * cat = (Cat*) malloc(sizeof(Cat));
new (cat) Cat{}; // initializes v-table
cat->react(); // static dispatches to Cat::react()
Animal * animal = cat;
animal->react(); // OK
```

虚函数调用 `animal->react()` 现在可以正确分派到 `Cat::react`

**NOTE**: C++ 标准没有指定如何实现 virtual dispatch/虚函数表，因此没有可移植的方法来可靠地操作运行时的虚函数表。

复制和移动构造意味着源地址已经用对象构造，并且目标地址是包含需要初始化的未初始化对象/内存的暂存存储器。请注意，复制和移动构造**不应**调用源对象或目标对象的析构函数

对象构造也分为几类，即：

- [non-trivial construction](https://en.cppreference.com/w/cpp/types/is_constructible)
- [non-trivial copy construction](https://en.cppreference.com/w/cpp/types/is_copy_constructible)
- [non-trivial move construction](https://en.cppreference.com/w/cpp/types/is_move_constructible)
- [trivial construction](https://en.cppreference.com/w/cpp/types/is_constructible)
- [trivial copy construction](https://en.cppreference.com/w/cpp/types/is_copy_constructible)
- [trivial move construction](https://en.cppreference.com/w/cpp/types/is_move_constructible)

## 分配对象

复制和移动分配要求内存地址处已经存在一个对象，并且我们想为其分配另一个对象。这意味着源地址和目标地址都包含有效的初始化对象。对象分配分为几类，即：

- [copy assignment (T& operator=(U const&))](https://en.cppreference.com/w/cpp/types/is_copy_assignable)
- [move assignment (T& operator=(U &&))](https://en.cppreference.com/w/cpp/types/is_move_assignable)
- [trivial copy assignment](https://en.cppreference.com/w/cpp/types/is_copy_assignable)
- [trivial move assignment](https://en.cppreference.com/w/cpp/types/is_move_assignable)

trivial 赋值意味着可以将对象分配给另一个对象而无需特殊操作，这意味着它可以按字节复制，即通过 `memcpy` 或 `memmove`

## 销毁对象

销毁要求内存位置存在有效的对象。销毁内存地址处的对象意味着该内存地址处将不存在任何对象，并且内存处于未初始化状态

不同于 trivial 对象的构造和分配，trivial 的销毁没什么操作

- [non-trivial destruction (~T())](https://en.cppreference.com/w/cpp/types/is_destructible)
- [trivial destruction](https://en.cppreference.com/w/cpp/types/is_destructible)

## 释放内存

释放内存要求放置内存上的任何对象都已被销毁。内存返回到其分配器，并且**不应**再被引用或使用

## 应用

### Strict Aliasing, Dead-store, and Dead-load Optimizations

Strict aliasing 是一个很重要的假设，它可以启用被称为 dead-load 和 dead-store 的编译器优化

```cpp
struct A {
    int value = 0;
};

struct B {
    int value = 0;
};

A * a = get_A();
B * b = get_B();

a->value = 6;
b->value = 2;
return a->value;
```

在这里，我们首先写入 `a`，然后写入 `b`，考虑到 `a` 可能是 `b` 的 `reinterpret_cast`，那么我们就不能假设 `a` 的值仍然是 `6`，因为有可能两者都指向相同或不同的对象。虽然这种规模的影响并不明显，但当编译器的可达性分析无法证明它们是不同的对象时，它就会变得难绷

按照规则来说，类型 A 不能别名（reinterpret_cast）类型 B，那么我们总是可以执行优化并假设两个对象不同，因此无法从类型 A 观察到类型 B 的突变

然而，我们仍然需要一个后门，以防我们需要按字节从 `a` 复制到 `b`，规则的例外是 `char`、`unsigned char` 和 `signed char` 可以别名任何对象，否则由 [`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast) 封装，这意味着我们可以为 `char`、`unsigned char` 或`signed char` 中的任何类型的任何对象设置别名，这称为 [strict aliasing 规则](https://gist.github.com/shafik/848ae25ee209f698763cffee272a58f8)

为了说明 strict aliasing 规则，让我们看看生成的汇编代码:

[Godbolt](https://godbolt.org/z/M18z53b35)

```cpp
A * a = get_A();
B * b = get_B();

a->value = 6;
b->value = 2;
return a->value;
```

从上面的示例中我们可以看到，编译器能够对表达式 `a->value` 执行 dead-load 优化，并且只假设该值保持为 6，如果 `a` 可以别名 `b`，那这就是不可能的

然而，如果我们真的需要为这两种类型起别名，我们可以使用名称奇怪的函数 [`std::launder`](https://en.cppreference.com/w/cpp/utility/launder) ，这会干扰编译器的可达性分析

[Godbolt](https://godbolt.org/z/8rM6YbM75)

```cpp
A* a = get_A();
B* b = get_B();
B* a_b = std::launder<B>((B*)a);
a_b->value = 6;
b->value = 2;
return a->value;
```

从生成的汇编代码中，编译器被迫从 `a_b` 执行冗余加载，因为它可能是 `b` 的别名，因为它的起源已被 `std::launder` 隐藏。这就像洗钱一样，因此得名:)

**NOTE**: 这里使用 `std::launder` 是未定义的行为，因为不存在类型 B 的对象，也没有在地址 `a` 处构造该对象

一些语言/方言在可变性和别名方面有一种更激进的别名优化/规则，即 Rust 的可变引用 (& mut) 和 [`Circle`](https://github.com/seanbaxter/circle) 的可变引用，它只需要一次将一个可变引用绑定到一个对象，这允许即使在一个范围内的相同类型的对象之间，也存在更具争议性和激进的优化。这与非标准限制限定符 (GCC/Clang：`__restrict__` 和 MSVC：`__restrict`)相当

举例说明:

[Godbolt](https://godbolt.org/z/ahd6xT8Gx)

```cpp
int fn(A* a1, A* a2) {
    a1->value = 6;
    a2->value = 2;
    return a1->value;
}
```

正如我们之前所说，`a1` 可以与 `a2` 别名/重叠，因为它们是相同的类型，并且即使在相同类型内，也没有关于可变性的限制，因此读取表达式 `a1->value` 不会被优化，我们仍然需要加载值，如果我们可以确定对象实际上没有别名/重叠，那么这将是多余的。虽然这种影响在小对象上可能不会被注意到，但由于数据依赖性，它在多个元素的数组上会很明显，并导致性能急剧下降

为了优化这一点，我们将使用 restrict 属性，这意味着具有 attribute/qualifier 的对象不会为该范围内的其他对象别名。

[Godbolt](https://godbolt.org/z/TK94KjTjx)

```cpp
int fn(A* RESTRICT a1, A* RESTRICT a2) {
    a1->value = 6;
    a2->value = 2;
    return a1->value;
}
```

## Union

虽然大多数“modern C++”代码库会由于联合体的约束困难或使用它们很容易产生错误而完全禁止联合体，但它们仍然是许多数据结构(如 `Option<T>`、`Result<T, E>`) 的重要组成部分

联合用于多个对象之一可以存在于一个位置的情况。有效地为受约束的对象动态性/多态性提供空间

鉴于联合地址中只能存在一个对象，对象生命周期规则仍然适用，违反该规则将导致未定义的行为:

- union 中必须至少存在一个指定的变体
- 任何访问的对象都必须已被构造
- 在某个时间点，union 中只能存在或构造一个对象，要在 union 中构造另一个对象，必须先销毁先前构造的对象。

尽管 Union 中的变体类型可能存在别名，但 strict aliasing 规则仍然适用于它们，即变体类型 A 不能为不同的变体类型 B 起别名

[Godbolt](https://godbolt.org/z/jYMozMnTx)

```cpp
union Which {
    char c = 0;
    Cat cat;
};

void react(Animal* a) { a->react(); }

Which w;  // only c is initialized
react(&w.cat);  // SISGSEGV because we accessed `cat` without initializing it
```

fix:

[Godbolt](https://godbolt.org/z/7G8s7vTP9)

```cpp
Which w;  // only c is initialized
// w.c.~char() - trivial, but char doesn't have a destructor
new (&w.cat) Cat{};  // now cat is initialized, we can access it
react(&w.cat);       // purr...
```

正如您在上面的示例中看到的，我们不能简单地假装使用 union 的其他变体，我们需要维护对象生命周期，首先删除 `c` (在本例中很简单，因此无操作)，然后使用构造 `cat` 放置 `new` (重要)，它将通过初始化 Cat 对象的 v-table 来解决 UB

对于认为 C++ 联合体功能与 C 类似的 C 开发人员来说，这是一种常见的做法。另请注意，如果联合包含 non-trivial 类型，则需要手动且显式地实现构造、销毁、赋值和移动操作

## `std::aligned_storage` (C++ 23 已弃用)

对齐存储意味着对象的按字节表示，对象的生命周期上下文在外部管理或由外部事实源确定，因此仍然需要用户显式且正确地管理所表示对象的生命周期，它们可以工作与 `union` 类似，但需要注意的是它们是非类型化的

对齐存储通常用于实现容器类型，特别是在包含已初始化和未初始化对象时，例如: Open-Addressing (Linear-Probing Hashmaps), (ECS) Sparse Sets, Static-Capacity Vectors, Stack-allocated vectors, pre-allocated/bump/arena allocators

**NOTE**: `std::aligned_storage` 在 [C++ 23 (P1413R3)](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p1413r3.pdf) 被删除

## `Option<T>` (`std::optional<T>`)

`Option<T>` 意味着类型 `T` 的对象可能存在也可能不存在，这意味着该对象可能初始化或者未初始化，并且其存在由有区别的枚举/布尔值识别。实现 `Option<T>` 需要正确维护值类型 `T` 的生命周期。即构造次数与销毁次数相同，对象的构造函数在被视为存在于选项中之前被调用

## `Result<T, E>` (`std::expected<T, E>`)

`Result<T, E>` 暗示 `Result` 的放置地址处存在类型 `T` 或类型 `E` 的对象，它通过枚举或布尔值进行区分。就像 `Option<T>` 一样，`Result<T, E>` 维护值类型 `T` 和 `E` 的生命周期

## Trivial Relocation

Trivial 重定位是即将推出的 C++ 26 功能，我最兴奋的是它进一步扩展了 C++ 对象生命周期，并为进一步优化提供了空间

重定位是从源对象移动到未初始化目标以及破坏源中留下的对象表示的组合(破坏性 move)

```cpp
void relocate(A * src, A * dst){
    new (dst) A{ std::move(*src) };
    src->~A();
}
```

Trivial 重定位意味着可以将对象安全地从一个内存地址移动到另一个未初始化的内存地址，而无需调用对象的移动构造函数和析构函数，本质上捕获“移动到目标并销毁源”操作。这意味着我们可以使用逐位复制，通常通过 `memcpy` 或 `memmove`，本质上是“微不足道的”，只要我们在重定位后不将源内存地址视为包含有效对象即可

```cpp
void trivial_relocate(A * src, A * dst){
    memcpy(dst, src, sizeof(A));
}
```

请注意，trivial 重定位并不总是意味着移动构造函数和析构函数是 trivial

```cpp
struct MyStr {
    char* data_ = nullptr;
    size_t size_ = 0;
    MyStr() {}
    MyStr(char const* data, size_t num) : data_{(char*)malloc(num)}, size_{num} { memcpy(data_, data, num);  }
    MyStr(MyStr const&) = delete;
    MyStr& operator=(MyStr&&) = delete;
    MyStr& operator=(MyStr const&) = delete;
    MyStr(MyStr&& a) : data_{a.data_}, size_{a.size_} {
        a.data_ = nullptr;
        a.size_ = 0;
    }
    ~MyStr() { free(data); }
};
```

`MyStr` 与许多容器类型一样，没有 trivial 的移动构造函数和析构函数，但它们的对象表示可以轻松地重新定位

对于本地包含的小型对象，non-trivial 重定位可能不会对性能产生太大影响，因为编译器通常能够优化移动构造函数和析构函数生成的代码，但对于实现像 `std::vector` 这样的通用容器类型，其中这些对象中的一些经常被移动(即在 `push_back`、`insert`、将元素从一个容器移动到另一个容器期间)，trivial 重定位 (`memcpy`/`memmove`) 会比执行会产生冗余操作的 non-trivial 的移动构造函数和析构函数执行得更好，就像将 `MyStr::num_` 设置为 `nullptr` 并将 `MyStr::size_` 设置为 `0` (如 `MyStr::MyStr(Mystr &&)`的 `std::vector<MyStr>` 中所示)。这是 C++ 对象模型要求移动构造函数将源对象保留在 valid 但未指定状态以便析构函数仍然正确运行的结果

另请注意，如果您的分配器支持 `realloc`，则 trivial 的重定位意味着增加向量类型的容量可能会分解为 zero-cost `realloc`(如果页面内有足够的空间，操作系统通常只需要扩展分配的条目)而不是分配一个新的单独内存，将对象移动到该内存，销毁源内存中的残留对象，然后释放源内存

Trivial 的重定位会将我们的 C++ 对象生命周期模型扩展到:

```txt
  allocate placement memory
             ||
             ||
             ||   =============================> relocate object
             ||   ||                                   ||
             ||   ||               ============        ||
             \/   ||               ||        ||        ||
====>  construct object ===> assign object <===        ||
||           ||                    ||                  ||
||           \/                    ||                  ||
====== destruct object  <============                  ||
             ||                                        ||
             \/                                        ||
 deallocate placement memory <===========================
```

- [P2786R0: Trivial relocatability options, Proposal for an alternative approach to trivial relocatability](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2786r0.pdf)
- [STL algorithms for trivial relocation](https://quuxplusone.github.io/blog/2023/03/03/relocate-algorithm-design/)
- [C++ Trivial Relocation Through Time - Mungo Gill - ACCU 2023](https://www.youtube.com/watch?v=DZ0maTWD_9g)
