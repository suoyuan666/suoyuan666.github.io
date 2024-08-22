---
title: "CS106L: Type & RAII"
author: suo yuan
date: 2024-02-05T03:42:51Z
draft: false
categories:
  - Cpp
  - 刷课笔记
tags:
  - CS106L notes
  - Cpp notes
description: "CS106L 中关于 Type 和 RAII 的部分"
---

<!--more-->
CS106L 中关于 Type 和 RAII 的部分
<!--more-->

# Type & RAII

## Type & `std::optional`

### Type Conversion

C++提供了更好的类型转换（相比于 C 那样直接写括号的强制类型转换）

[static_cast](https://en.cppreference.com/w/cpp/language/static_cast) 和 [dynamic_cast](https://en.cppreference.com/w/cpp/language/dynamic_cast)

```cpp
class Base {
    // ...
};

class Derived : public Base {
    // ...
};

Derived derivedObj;
Base* basePtr = static_cast<Base*>(&derivedObj);
```

就像这个 `static_cast`，会在编译时检验转换是否合法。

### `std::optional`

`std::optional` interface：

- `.value()`
  - 返回包含的值或抛出 `bad_optional_access` 错误。
- `.value_or(valueType val)`
  - 返回包含的值或默认值 val（参数）。
- `.has_value()`
  - 如果存在包含的值，则返回 true；否则返回 false。

```cpp
std::optional<Student> lookupStudent(string name){ /*something*/ }
std::optional<Student> output = lookupStudent(“Keith”);
if(student.has_value()){
    cout << output.value().name << “ is from “ <<
    output.value().state << endl;
} else {
    cout << “No student found” << endl;
}
```

使用 `std::optional` 返回值的优点：

- 函数签名可以创建更具信息性的合约（contracts）。
- 类的函数调用具有保证和可用的行为。

缺点：

- 你需要在每个地方使用 `.value()`。
- （在 C++中）仍然可能出现 bad_optional_access 错误。
- （在 C++中）optional 也可能具有 undefined behavior（`*optional` 与 `.value()` 执行相同的操作，没有错误检查）。
- 在许多情况下，开发者希望有 `std::optional<T&>`，但实际上并没有这个类型。

`std::optional` 的 monadic 接口（C++23）：

- `.and_then(function f)`
  - 如果存在包含的值，则返回调用 `f(value)` 的结果，否则返回 null_opt（f 必须返回 optional 类型）。
- `.transform(function f)`
  - 如果存在包含的值，则返回调用 `f(value)` 的结果，否则返回 null_opt（f 必须返回 optional<valueType> 类型）。
- `.or_else(function f)`
  - 如果存在值，则返回该值，否则返回调用 `f` 的结果

那样代码就可以这么写：

```cpp
std::optional<Student> lookupStudent(string name){/*something*/}
std::optional<Student> output = lookupStudent(“Keith”);
auto func = (std::optional<Student> stu)[] {
    return stu ? stu.value().name + “is from “ + to_string(stu.value().state) : {};
}

cout << output.and_then(func).value_or(“No student found”);
```

## RAII

### intro

> The best example of why I shouldn't be in marketing. I didn't have a good day when I named that -- Bjarne Stroustrup (daddy of C++)

```cpp
std::string EvaluateSalaryAndReturnName(int idNumber){
    Employee*e = new Employee(idNumber);

    if(e->Title() == "CEO" || e->Salary() > 100000){
        std::cout << e->First() << " "
                  << e->Last() << " is overpaid" <<std::endl;
    }
    auto result = e->First() + " " + e->Last();
    delete e;
    return result;
}
```

对于这个函数，有很多地方可能导致内存泄露，即在 `delete` 之前的异常退出该函数从而导致在 heap 上的内存没有 free。所以我们需要 `try-catch`。

**关于异常安全**

不抛出异常：`noexcept` 关键字保证函数不会因为异常而导致一些 undefined behavior。这会出现在析构函数，swap，移动构造函数之类的。

在 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html#Exceptions) 中，Google 提到不建议使用异常。

理由：

> On their face, the benefits of using exceptions outweigh the costs, especially in new projects. However, for existing code, the introduction of exceptions has implications on all dependent code. If exceptions can be propagated beyond a new project, it also becomes problematic to integrate the new project into existing exception-free code. Because most existing C++ code at Google is not prepared to deal with exceptions, it is comparatively difficult to adopt new code that generates exceptions.
> Given that Google's existing code is not exception-tolerant, the costs of using exceptions are somewhat greater than the costs in a new project. The conversion process would be slow and error-prone. We don't believe that the available alternatives to exceptions, such as error codes and assertions, introduce a significant burden.
> Our advice against using exceptions is not predicated on philosophical or moral grounds, but practical ones. Because we'd like to use our open-source projects at Google and it's difficult to do so if those projects use exceptions, we need to advise against exceptions in Google open-source projects as well. Things would probably be different if we had to do it all over again from scratch.
> This prohibition also applies to exception handling related features such as `std::exception_ptr` and `std::nested_exception`.

来自 ChatGPT@Poe 的中文翻译：

> 在表面上，使用异常的好处超过了成本，尤其是在新项目中。然而，对于现有的代码来说，引入异常会对所有相关的代码产生影响。如果异常可以传播到新项目之外，将新项目整合到现有的无异常代码中也会带来问题。由于 Google 大部分现有的 C++代码都没有准备好处理异常，采用生成异常的新代码相对困难。
> 考虑到 Google 现有的代码不具备异常容忍性，使用异常的成本要略高于在新项目中的成本。转换过程将会缓慢且容易出错。我们认为，异常的替代方案（如错误码和断言）并不会引入重大负担。
> 我们反对使用异常的建议并非基于哲学或道德的立场，而是出于实际考虑。因为我们希望在 Google 使用我们的开源项目，但如果这些项目使用异常，那么在使用过程中会变得困难。如果我们从头开始重新做，情况可能会有所不同。
> 这个禁令也适用于与异常处理相关的特性，如 `std::exception_ptr` 和 `std::nested_exception`。

### RAII

**RAII**: **R**esource **A**cquisition **I**s **I**nitialization

这个技术还有几个叫法：

**SBRM**: **S**cope **B**ased Memo**r**y **M**anagement

**CADRE**: **C**onstructor **A**cquires, **D**estructor **Re**leases

从后两个的全拼能看出来，RAII 就是利用了类在超出作用域范围的时候就自动调用析构函数这一点，将 `new` 和 `delete` 放到构造函数和析构函数中。

比如在 open 一个文件的时候，不应该先用 `ifstream` 创建一个变量，然后调用 `open` 函数，而是直接 `ifstream input("test.txt)`，这就是 RAII 的写法，这样也不需要在后面写 `input.close()` 了。

锁也有类似的：`lock_guard`

![lock](/img/CS106L/lockraii.png)

在 [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) 也有相关描述:

[R.11: Avoid calling new and delete explicitly](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-newdelete)

### Smart Pointers

```cpp
std::unique_ptr<typename Tp>;
std::shared_ptr<typename Tp>;
std::weak_ptr<typename Tp>;
```

**unique_ptr**

`unique_ptr`，唯一持有自己的资源并在被销毁的时候用析构函数释放。唯一持有为了防止复制后发生重复的 free。

```cpp
void rawPtrFn(){
    Node* n = new Node();
    // do something
    delete n;
}

// use unique_ptr
void rawPtrFn(){
    std::unique_ptr<Node> n(new Node);
    //do something
}
```

`unique_ptr` 无法被复制，但可以通过 `std::move` 移动：

```cpp
std::unique_ptr<Point> u3 = std::make_unique<Point>(2, 3);
std::unique_ptr<Point> u4 = std::move(u3);
```

**shared_ptr**

`shared_ptr` 可以复制，当所有指向这个资源的 `shared_ptr` 都死掉后就 free 掉这块内存。`shared_ptr` 用引用计数实现了这一点。

**weak_ptr**

`weak_ptr` 类似于 `shared_ptr`，但是没有引用计数。
