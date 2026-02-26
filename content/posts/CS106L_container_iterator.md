---
title: "CS106L: Containers & Iterators"
author: suo yuan
date: 2024-02-02T03:42:51Z
draft: false
categories:
  - cpp
tags:
  - CS106L notes
  - cpp notes
description: "CS106L 中关于 container 和 iterators 的部分"
---

<!--more-->
CS106L 中关于 container 和 iterators 的部分
<!--more-->

# Containers

STL 是一个历史相较悠久并且一直在更新的一个标准库，它提供了很多算法供开发者使用

```cpp
int main() {
    std::vector<int> vec(20);
    std::generate(vec.begin(), vec.end(), rand);
    std::sort(vec.begin(), vec.end());
    std::copy(vec.begin(), vec.end(), std::ostream_iterator<int>(cout, "\n"));
}
```

这 5 行代码，就完成了对 vector 元素的随机化赋值并排序，然后输出到 console 上这一系列的工作。

## Sequence Containers

这是一种数据结构，提供了对元素序列的访问

```cpp
std::vector<T>
std::deque<T>
std::list<T>
std::array<T>
std::foraword_list<T>
```

![stdvsvector](/img/CS106L/stdvsvector.png)

如果越界访问，`vec.at(i)` 会抛出一个异常，而 `vec[i]` 会是一个 undefined behavior

Sequence Containers 是一种特殊的 Containers，因为它是顺序的。

正如关于数组和链表之间老生长谈的对比一样，在 vector 的前面添加一个元素还是很难绷的，C++提供了另一种数据结构处理这种情况：`std::deque<T>`

vector 有 `push_back()` 函数添加变量，deque 除了 `push_back()` 有 `push_front()` 可以在前面插入

A **deque** is a **d**ouble **e**nded **que**ue

deque 的实现是将多个 vector 作为枝干，一个 vector 作为主干。如果你从后插入，那就将元素插入最后面枝叶里面，如果最后面那个满了就给主干多加一个，如果主干满了不能加枝叶了那就换一个更长的主干。插入前面是类似的操作。

有两种经典的数据结构——栈和队列，在这里它们被称为 _Container Adaptors_。它们会通过对 Container 做一些调整来适应它们自身数据结构的定义。在 C++ 文档中，它们的描述都会有这么一句：

> The std::stack class is a container adaptor that gives the programmer the functionality of a stack - specifically, a LIFO (last-in, first-out) data structure.
> The std::queue class is a container adaptor that gives the functionality of a queue - specifically, a FIFO (first-in, first-out) data structure.

正如 C++ 设计哲学所说的那句赋予开发者完全的掌控权，所以 stack 虽然是默认用 deque 实现的，但开发者可以自己选择使用什么 container（比如 vector）实现的 stack。（在文档中也有叙述：[std::stack](https://en.cppreference.com/w/cpp/container/stack)

额，按照我的理解，这句话所说的代码应该是这么写：

```cpp
std::stack<int, std::vector<int>> st;
```

查找 vector 可以使用`std::find`

## Associative Containers

```cpp
std::map<T1, T2>
std::set<T>
std::unordered_map<T1, T2>
std::unordered_set<T>
```

正如前面所说，Sequence Containers 是顺序的，可以通过索引来访问，而 Associative Containers 是不能通过索引来访问的。

虽然是不能通过索引访问，但是 `std::map<T1, T2>` 和 `std::set<T>` 会按照大小顺序排列。如果这里存储的是开发者自定义的类型，可以定义用于比较两个实例的大小的小于号帮助它按照顺序排列。vector 会有 sort 函数用于排序，这里面也是会存在这个问题，如果 vector 存储的是开发者自定义的类型，要么是实现这个类型的小于号，要么使用 lamdba 函数

![stdvsset](/img/CS106L/stdvsset.png)

![stdvsmap](/img/CS106L/stdvsmap.png)

`map.at(key)` 和 `may[key]` 区别类似之前提到的，前者不存在的话会抛出异常，后者默认创建它。

可以通过`map.count(key)` 来查看是否存在。C++20 也支持了`var.contains()` 来查找：[std::set<Key,Compare,Allocator>::contains](https://en.cppreference.com/w/cpp/container/set/contains)，[std::map<Key,T,Compare,Allocator>::contains](https://en.cppreference.com/w/cpp/container/map/contains)。

map 的 key 重复出现的话被称为 _multimap_

## Iterators

它允许开发者迭代访问任何 containers

比如 `map.begin()`，它会返回一个 iterator，这个 iterator 指向第一个元素。就像这样：

```cpp
std::map<int, int>::iterator it = mymap.begin();
```

`++it` 会让这个 iterator 指向下一个元素。`*it` 可以访问这个 iterator 实际指向的值，这里也可以发现 iterator 和指针是差不多玩意。

map 的 iterator 和其他的 container 有些不同——因为 map 有两个值，它的 iterator 实际上是 `std::pair<string, int>`

```cpp
std::map<std::string, int> mymap;
mymap.insert({"test", 1});
for(const auto& thing : mymap){
    std::cout << thing.first <<std::endl;
}
```

在 vector 中，iterator 可以通过 `begin() + 3` 这样的方式挪动，但 `std::list` 等就不可以这么做，这是因为 container 的实现略有不同，但是 iterators 的实现就为了消除 containers 的区别从而用一种通用的方式调用 container。所以存在 5 种 iterator。

1. Input
2. Output
3. Forward
4. Bidirectional
5. Random Access

上述的这几种 iterator 都有上面所介绍的那些功能（`++it`什么的）

第一种 input iterator 只能被读，只能向前走，而且只能+1，比如 `find()` 或者 `count()` 这样的只需要遍历的地方中就会用到它，C++文档中也有描述：

![cppreference4find](/img/CS106L/cppreference4find.png)

Output iterator 和 input iterator 类似，只不过是只写的。`copy`这个函数会用到这个

![cppreference4copy](/img/CS106L/cppreference4copy.png)

Forward iterator 同时具有 output iterator 和 input iterator 的特点，即 RW 它都拿到了。`replace()` 函数会用到这个，还有就是之前 Sequence Containers 上提到的`std::foraword_list<T>`

![cppreference4replace](/img/CS106L/cppreference4replace.png)

Bidirectional iterator 具有 Forward iterator 的功能，并且这个可以 `--`。在 `std::map`，`std::set`，`std::list`，或者`reverse()` 中会看到

![cppreference4reverse](/img/CS106L/cppreference4reverse.png)

Random access iterator 具有 Bidirectional iterator 的功能并且不受递增递减的约束，而是可以随意访问。在`std::vertor`，`std::string`，pointer 中都会使用它，所以这个是最常用的。
