---
title: "CS106L: Templates"
author: suo yuan
date: 2024-02-03T03:42:51Z
draft: false
categories:
  - Cpp
  - 刷课笔记
tags:
  - CS106L notes
  - Cpp notes
description: "CS106L 中关于 Templates 的部分"
---

<!--more-->
CS106L 中关于 Templates 的部分
<!--more-->

# Templates

## Templates Function

template 应该算得上很自然的想法（🤔 又或者是套娃的另一次应用），我认为这就是对函数的进一层抽象，它将函数的逻辑抽象成与类型无关，比如

```cpp
template <typename T>
T min(T a, T b) {
    return (a < b) ? a : b;
}
```

```cpp
template <typename Type=int>
Type myMin(Type a, Type b) {
    return a < b ? a : b;
}
```

这里的 `typename` 没有指明类型，实际上可以写成 `class T`，这样这个函数就不会接受 int 之类的类型。那个 `=int` 表示其默认类型（虽然我还没认识到写它的意义）。

可以针对性的再写一个特定类型的模板函数:

```cpp
template <> void print_msg<float>() {
  std::cout << "print_msg called with float type!\n";
}

template <bool T> int add3(int a) {
  if (T) {
    return a + 3;
  }

  return a;
}
```

```cpp
auto minvar = min<int>(1, 2);
```

隐式存在一个问题在于参数的类型未必能被识别出来（有些类型的定义方式差不多）。不过貌似编译器这时候会报错。

从一个实际的类型推广到一个模板，这个过程被称为 _Concept Lifting_。对于隐式类型的来说，这种提升可能会导致传入一些不可以工作的类型（比如函数内部使用了 `=` 赋值，但 stream 是不可以这样做的）

毕竟有了函数指针，其实可以把抽象做的更细一些。比如 _Predicate Functions_

![predicate_functions](/img/CS106L/predicate_functions.png)

```cpp
template <typename InputIt, typename UniPred>
int count_occurrences(InputIt begin, InputIt end, UniPred pred) {
    int count = 0;
    for (auto iter = begin; iter != end; ++iter) {
        if (pred(*iter)) count++;
    }
    return count;
}
bool isVowel(char c) {
    std::string vowels = "aeiou";
    return vowels.find(c) != std::string::npos;
}

std::string str = "Xadia";
count_occurrences(str.begin(), str.end(), isVowel);
```

C++20 允许开发者显示指定其 template 类型的要求，具体可以参见文档：[Constraints and concepts (since C++20)](https://en.cppreference.com/w/cpp/language/constraints) 和 [Requires expression (since C++20)](https://en.cppreference.com/w/cpp/language/requires)

## Lamdba & Algorithms

Lamda function:

```cpp
auto func = [capture-clause](parameters)->return-value{
    // body
}
```

C++14 开始，这个 `return-value` 是可选的。

![lamdbaintro](/img/CS106L/lamdbaintro.png)

```cpp
[] // captures nothing
[limit] // captures lower by value
[&limit] // captures lower by reference
[&limit, upper] // captures lower by reference, higher by value
[&, limit] // captures everything except lower by reference
[&] // captures everything by reference
[=] // captures everything by value
```

```cpp
auto isMoreThan = [limit] (int n) { return n > limit; };
isMoreThan(6); //true
```

有了这个之后，也就不需要像之前那样定义*Predicate Functions*了，可以直接写 lamdba。

STL 的一些 algorithm 不能用于开发者自定义的类型（比如寻找最小值之类的），这时候需要用到 lambda 函数。

比如对于这样的 vector:

```cpp
std::vector<Student> vecstu{{1, 2, 3.0}, {2, 2, 5.0}};
```

直接使用 `std::minmax_element()` 是无法通过编译的

```cpp
auto [min, max] = std::minmax_element(vecstu.begin(), vecstu.end());
```

额，根据我看到的录像那里，其开发环境是没有在编译前给出预警的。但是我的 vscode 在只给了两个参数的时候：

```text
In template: invalid operands to binary expression ('Student' and 'Student') clang(typecheck_invalid_operands)
```

这时候就可以加一个 lamdba 函数，并传给 `minmax_element()`

```cpp
auto compareStudent = [](Student &s1, Student &s2){
    return s1.averge < s2.averge;
};
```

```cpp
auto [min, max] = std::minmax_element(vecstu.begin(), vecstu.end(), compareStudent);
```

在 `std::copy` 这个函数中，如果传入的 iterator 指向的 container 没有足够的空间，那么就会复制到为初始化的内存中，这时候应该传入一个 iterator adaptor。这种函数可以给 iterator 加点料（比如 `back_inserter()` 会让返回的 iterator 在赋值不存在的空间时扩展 container）。

引用上一章一开始给出的代码：

```cpp
int main() {
    std::vector<int> vec(20);
    std::generate(vec.begin(), vec.end(), rand);
    std::sort(vec.begin(), vec.end());
    std::copy(vec.begin(), vec.end(), std::ostream_iterator<int>(cout, "\n"));
}
```
