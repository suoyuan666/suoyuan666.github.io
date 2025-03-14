---
title: "CS106L: Class"
author: suo yuan
pubDatetime: 2024-02-04T03:42:51Z
draft: false
categories:
  - Cpp
  - 刷课笔记
tags:
  - CS106L notes
  - Cpp notes
description: "CS106L 中关于类的部分"
---

<!--more-->
CS106L 中关于类的部分
<!--more-->

# Class

> A struct simply feels like an open pile of bits with very little in the way of encapsulation or functionality. A class feels like a living and responsible member of society with intelligent services, a strong encapsulation barrier, and a well defined interface
>
> - Bjarne Stroustrup

## 构造函数初始化列表

```cpp
Student(std::string name, std::string state, int age):
    name(name), state(state), age(age){ }
```

函数体内部还是可以写代码的

## 关于 delete

array 作为一个基础的类型，当开发者手动为此创建内存之后也可以之后手动释放掉：

```cpp
//int * is the type of an array variable
int *my_int_array;
//this is how you initialize an array
my_int_array = new int[10];
//this is how you index into an array
int one_element = my_int_array[0];
delete [] my_int_array;
```

delete 一般在类的析构函数中出现（需要手动掉释放这块内存）

![inter](/img/CS106L/interface_javavscpp.png)

这里那个虚函数等于 0 的意义在于，让继承它的类必须实现该函数，否则编译失败。这种虚函数叫作纯虚函数（_pure virtual function_

一个类存在一个纯虚函数就叫作抽象类，抽象类不能被实例化。

如何子类不想要实现自己的构造函数，可以：

![cons](/img/CS106L/consbase.png)

如果是析构函数可能有点麻烦，如果有一个基类（这个类的析构函数不是虚函数）的指针指向派生类，并且这时候要 `delete` 这个指针就不会调用派生类的析构函数。如果基类的析构函数实现为虚函数，那么才可以正常调用派生类的析构函数释放内存。

![de](/img/CS106L/decons.png)

![demo](/img/CS106L/domesnap.png)

如果基类的虚函数有实现了，并且派生类想要调用，可以这么写：

```cpp
t.Drink::make();
```

## Template classes

> Fundamental Theorem of Software Engineering: Any problem can be solved by adding enough layers of indirection

模板类之前也见到过：`std::vector<int>`。

```cpp
//Example: Structs
template<typename First, typename Second> struct MyPair {
    First first;
    Second second;
};

template<typename First, typename Second> class MyPair {
    public:
        First getFirst();
        Second getSecond();
        void setFirst(First f);
        void setSecond(Second f);
    private:
        First first;
        Second second;
};
template<class First, class Second> class MyPair {
    public:
        /*...*/
    private:
        First first;
        Second second;
};
```

而其部分函数的实现，也需要加 template：

```cpp
template<typename First, typename Second>
First MyPair::getFirst(){
    return first;
}
```

模板类的成员函数和其他函数并不一样，编写的时候最好在一起，而不是像其他普通的编写一样，分为.h 和.cpp 两个文件。因为模板类的成员函数需要编译时的实例化，需要具体的参数生成对应函数的实现。

模板类可以针对特定类型写一个版本：

```cpp
template<>
class FooSpecial<float> {
  public:
    FooSpecial(float var) : var_(var) {}
    void print() {
      std::cout << "hello float! " << var_ << std::endl;
    }
  private:
    float var_;
};
```

## const keyword

const 函数不可以修改类的元素后者传给它的参数。

```cpp
int * const p;
```

```cpp
(*p)++ // ok

p++ // error
```

const-interface：所有成员函数都可以在定义类的时候被 const 标记

```cpp
class StrVector {
    public:
        using iterator = std::string*;
        const size_t kInitialSize = 2;
        /*...*/
        size_t size() const;            //here
        bool empty() const;             //here
        std::string& at(size_t indx);
        void insert(size_t pos, const std::string& elem);
        void push_back(const std::string& elem);
        iterator begin();
        iterator end();
        /*...*/
```

这种标记是一种 `const` 成员函数，它保证了函数内部不会修改 `this` 实例。

## Operators

### 运算符重载

![operator_list](/img/CS106L/operators_list.png)

```cpp
std::vector<std::string> strvec{"Hello", "World"};
std::cout << strvec[0];
strvec[1] += "!";
```

上面这段代码相当于：

```cpp
std::vector<std::string> strvec{"Hello", "World"};
std::cout.operator<<(strvec.operator[](0));
strvec.operator[](1).operator+=("!");
```

或者是这样：

```cpp
std::vector<std::string> strvec{"Hello", "World"};
operator<<(std::cout, strvec.operator[](0));
operator+=(strvec.operator[](1), "!");
```

每个运算符都有一个与之对应的函数

对于操作符重载时的返回值问题，有的虽然看起来不会有返回值其实也是有的，例如 `i += z`，返回值就应该是 `i`，所以 `(i += z) += y` 这样的操作也是可以的。

像 `+=` 这种都是类自己的成员函数，会被这个类型的变量所调用，所以对这种运算符重载，参数表只有一个参数，通过 `*this` 还是可以访问到那个变量。

假设实现 `+` 运算符的重载：

![plusoverload](/img/CS106L/plusoverloadtest.png)

将重载的函数实现成成员函数还是非成员函数的一般规则：

- 由于 C++的语义原因，一些操作符必须被实现为成员函数（例如`[]`, `()`, `->`, `=`）
- 还有一些必须实现为非成员函数（例如 `<<`，开发者不能覆盖掉 STL 库的实现，所以需要实现为非成员函数）
- 如果是一元操作符（例如 `++`）就实现为成员函数。
- 如果是二元操作符，而且对这两个变量的操作是一致的（即要么都修改，要么都不修改），就实现成非成员函数（例如 `+`, `<`）。
- 如果是二元操作符，但是对这两个变量的操作不一致，就实现为成员函数（例如 `+=`）。

如果非成员函数涉及到访问类的私有变量，可以考虑 `friends`

![friends](/img/CS106L/friendsfuncapp.png)

**Principle of Least Astonishment (POLA)**

- 设计一个操作符主要是为了模仿传统意义上该操作符的用法
  - 比如之前提到的 `+=` 需要有一个返回值
- 对称的运算符需要实现为非成员函数
  - 这里说的对称的意思感觉就是运算符两边的表达式可以互换，举的例子是 `a + 1` 这样的，如果是成员函数的话 `1 + a` 就不能调用对应函数了。
- 如果重载了一个运算符，它相关那一套都需要重载。
  - 这里的一套就是上面介绍有哪些运算符中那个分类，一套说的是那里面的一类。

## Special Member Functions

![spm](/img/CS106L/spmsintro.png)

它们特殊在如果开发者不自己实现的话，编译器会自动生成，但是编译器自动生成的有时候未必能满足开发者的需要。

这些函数就是：构造函数，析构函数，复制构造函数，复制运算符。其中，复制构造函数会创建一个新的变量（也是在创建新变量的时候被调用的）。

### Copy Semantics

编译器默认生成的复制构造函数会把很多信息都复制一遍，所以新变量和旧变量的指针会指向同一个内存，复制运算符会把要覆写的变量清空然后重新全部复制一遍。

```cpp
Student(const Student& other) noexcept:
    name(other.name), state(other.state), age(other.age){
        //body
}
```

重载复制运算符的时候就不能像上面这样写初始化列表了，毕竟它不是构造函数（

当这个类有一些自己独有的资源时（比如指针，文件流），应该写自己的复制构造函数。

当要实现（删除）一个复制构造函数或者复制运算符或者析构函数的时候，你应该实现（删除）这三个所有。

### Move Semantics

移动语义代表了 C++ 的一大哲学——尽量不要牺牲效率。

例如 `std::vector` 中有一个与 `push_back()` 类似的函数：`emplace_back()`。它和 `push_back()` 不同的是，它可以将参数在内部直接构造插入，而不是像 `push_back()` 需要创建一个已有的变量。[cppreference 网站关于它的条目中](https://en.cppreference.com/w/cpp/container/vector/emplace_back) 有一个例子：

```cpp
#include <vector>
#include <cassert>
#include <iostream>
#include <string>

struct President
{
    std::string name;
    std::string country;
    int year;

    President(std::string p_name, std::string p_country, int p_year)
        : name(std::move(p_name)), country(std::move(p_country)), year(p_year)
    {
        std::cout << "I am being constructed.\n";
    }

    President(President&& other)
        : name(std::move(other.name)), country(std::move(other.country)), year(other.year)
    {
        std::cout << "I am being moved.\n";
    }

    President& operator=(const President& other) = default;
};

int main()
{
    std::vector<President> elections;
    std::cout << "emplace_back:\n";
    auto& ref = elections.emplace_back("Nelson Mandela", "South Africa", 1994);
    assert(ref.year == 1994 && "uses a reference to the created object (C++17)");

    std::vector<President> reElections;
    std::cout << "\npush_back:\n";
    reElections.push_back(President("Franklin Delano Roosevelt", "the USA", 1936));

    std::cout << "\nContents:\n";
    for (President const& president: elections)
        std::cout << president.name << " was elected president of "
                  << president.country << " in " << president.year << ".\n";

    for (President const& president: reElections)
        std::cout << president.name << " was re-elected president of "
                  << president.country << " in " << president.year << ".\n";
}
```

可以看到：

```cpp
auto& ref = elections.emplace_back("Nelson Mandela", "South Africa", 1994);
reElections.push_back(President("Franklin Delano Roosevelt", "the USA", 1936));
```

![lvalue_rvalue](/img/CS106L/lravlue.png)

![lrref](/img/CS106L/lrref.png)

移动构造函数和移动符号的函数原型如下：

```cpp
Student(Student&& other) noexcept;
Student& operator=(Student&& rhs) noexcept;
```

但是虽然参数列表里面写的是 `&&` 右值引用，但是在函数体内部，这个引用本身是一个左值，常规的 `=` 不再是移动而是复制。为了让复制变成移动，需要用到 `std::move()`，它会接受一个左值并返回相应的右值。经验之谈：在类成员函数中，如果接受一个 `const &` 参数并在函数内部将其赋值给其他变量，那么通常可以使用 `std::move`，除此之外不要使用它。

如果一个类定义了复制构造函数和复制运算符，那么应该也实现一份移动构造函数和移动运算符。

![comvas](/img/CS106L/comvas.png)

![comv](/img/CS106L/comvco.png)
