---
title: "CS106L: Streams & Type"
author: suo yuan
date: 2024-02-01T03:42:51Z
draft: false
categories:
  - Cpp
tags:
  - CS106L notes
  - Cpp notes
description: "CS106L 中关于 Streams 和 type 的部分"
---

<!--more-->
CS106L 中关于 Streams 和 type 的部分
<!--more-->

# Streams

## String Stream

使用 Stream 缘于程序需要与外部资源交互。

```cpp
#include <iostream>
#include <sstream>

using namespace std;

int main() {
    ostringstream oss("Ito En Green Tea");
    cout << oss.str() <<endl;

    oss << 16.9 << " Ounce ";
    cout << oss.str() << endl;

    return 0;
}
```

使用 g++ 编译并运行：

```bash
$ g++ -std=c++17 test.cpp -o test
$ ./test
Ito En Green Tea
16.9 Ounce n Tea
```

因为 stream 创建后，指针处于头部，所以写入的时候会从头部开始覆盖写入，如果给 `oss()` 传入其他参数可以控制这个模式，比如改成 `ostringstream oss("Ito En Green Tea", stringstream::ate);` 之后，指针会指向尾端。

```c
istringstream iss(oss.str());
double ammount;
string struint;
iss >> ammount >> struint;
```

`iss` 在输出的时候会根据空格分隔这个 stream。

对于移动 stream 指针的需求，可以使用下边这份代码：

```c
#include <iostream>
#include <sstream>

using namespace std;

int main() {
    ostringstream oss("Ito En Green Tea ");

    oss << 16.9;
    fpos pos = oss.tellp() + streamoff(3);
    oss.seekp(pos);
    oss << "Black";

    cout << oss.good() << endl;

    return 0;
}
```

`i/ostringstream` 都有快速的错误检查，分别为`good()`、`fail()`、`eof()`、`bad`。

- good: ready for read/write.
- fail: previous operation failed, all future operation frozen.
- eof: previous operation reached the end of buffer content.
- bad: external error, likely irrecoverable.

`iss.good()` 就会返回一个 bool 表示该 stream 是否出错。类似：

```cpp
iss >> ch;
if(iss.fail())  throw domain_error(...);
```

还有一种隐式转换成 bool 的写法会更简短，二者是等价的：

```c
if(!(iss >> ch))  throw domain_error(...);
```

比如一个将 string 转为 int 的函数可以这么写：

```cpp
int stringToInteger(const string& str){
    istringstream iss(str);
    int result; char remain;
    if(!(iss >> result) || iss >> remain)
        throw domain_error(...);
    return result;
}
```

什么时候应该使用 string stream

- 处理字符串的时候
- 格式化输出或输入（一些 stream manipulators，比如 endl, hex, uppercase 之类的）
- 解析成不同的类型

## Input stream & Output steam

- cin, standard input stream
- cout, standard output stream (buffered)
- cerr, standard error stream (unbuffered)
- clog, standard error stream (buffered)

```cpp
int age;
string name;
string home;

cout << "What is your name?" << endl;
cin >> name;
cout << "What is your age?" << endl;
cin >> age;
cout << "Where are you from?" <<endl;
cin >> home;

cout << "Hello, " << name << " (age " << age << " from " << home << ")" <<endl;
```

对于上面这段代码，如果你输入 Avery Wang，程序会直接走到终点：

```bash
$ g++ -std=c++17 -Wall test.cpp -o test
$ ./test
What is your name ?
Avery Wang
What is your age ?
Where are you from ?
Hello, Avery (age 0 from )
```

`cin` 会读到下一个空白符，所以第一个 `cin` 只会把 `Avery` 读进去，并且指针更新到了那个空白符的位置，之后 `cin >> age` 的时候，由于 buffer 不为空，所以会直接尝试把 `Wang` 读成 int，但是失败了，这时候 fail bit 打开，之后的 `cin` 也不会进行了。

这就是`cin`带来的问题了：

1. `cin` 会读一整行到 buufer 中，但是会用空格符分隔开递出。
2. buffer 中可能会有残余的数据导致用户无法及时地被提示应该输入
3. `cin` fail 了之后就再也不会执行 `cin` 了

如果使用`getline()`，就可以避免这个问题。

```cpp
getline(cin, name, '\n');
```

第三个参数就是一个标记，`getline()` 会读到这个字符之前（也就是不包括这个字符），并把指针更新到这个字符之后。但如果你把第三个 `home` 变量的读取也改成了 `getline()` 读取，程序运行的时候会跳过它，因为 `cin >> age` 把指针更新到了 `\n` 之前，而 `getline()` 会直接读到 `\n` 之前（也就是空数据）。就像这样：

|     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
|  A  |  v  |  e  |  r  |  y  | \_  |  W  |  a  |  n  |  g  | \n  |  2  |  0  | \n  |

这里的`_`指的是空格符。

可以在第二个 `getline()` 之前加上一句 `cin.ignore()` 跳过一个字符（也就是`\n`）来解决这个问题。

`std::cout` 是 `std::ostream` 定义的全局的 constant 对象，`std::ostream` 会将输入的数据类型都转成 string 并发送到 stream，而 `std::cout` 是会将这个 output stream 发送到 console 上。

`std::cin` 是 `std::istream` 定义的全局 constant 对象。这里的 `>>` 会一直读取用户的输入直到 _whitespace_，这里的 whitespace 是指 Tab, space, newline。

## File Stream

`std::ofstream`，只能用 `<<` 操作符传递数据，它会将数据类型转成 string 并发送到 file stream 上。

`std::ifstream`，只能用 `>>` 操作符传递数据。

```cpp
std::ofstream out("out.txt");
// out is now an ofstream that outputs to out.txt
out << 5 << std::endl; // out.txt contains 5

std::ifstream in("out.txt");
// in is now an ifstream that reads from out.txt
string str;
in >> str; // first word in out.txt goes into str
```

---

Uniform initialization: 使用大括号来初始化变量，适用于所有类型

```cpp
std::vector<int> vec{1,3,5};
std::pair<int, string> numSuffix1{1,"st"};
Student s{"Frankie", "MN", 21};
possible!
int x{5};
string f{"Frankie"};
```

但要注意对 vector 大括号和括号之间的区别：

```cpp
std::vector<int> vec1(3,5);
// makes {5, 5, 5}, not {3, 5}!
//uses a std::initializer_list (more later)
std::vector<int> vec2{3,5};
// makes {3, 5}
```

---

# Type

## Type alias

类型别名是一个很有用的东西，比如对于下边这样的代码：

```cpp
std::unordered_map<forward_list<Student>, unordered_set>::iterator begin = studentMap.cbegin();
std::unordered_map<forward_list<Student>, unordered_set>::iterator end = studentMap.cend();
```

可以使用别名简化

```cpp
using map_iterator = std::unordered_map<forward_list<Student>, unordered_set>::iterator;
map_iterator begin = studentMap.cbegin();
map_iterator end = studentMap.cend();
```

C++引入了 `auto` 关键字，`auto` 的本质是要让编译器找出这个类型。

```cpp
auto begin = studentMap.cbegin();
auto end = studentMap.cend();
```

又比如这样：

```cpp
auto func = [](auto i) {return i*2};
```

这是一个 lamdba 函数，你并不知道这是什么类型，编译器会自动为此创建一个类的实例，由于开发者不知道编译器会为这个类起什么名字，所以需要用 `auto`。

## When `auto` should be used

AAA 原则： almost always auto

- 在代码上下文清晰的时候使用`auto`
- 当用确切的类型定义不重要的时候使用`auto`
- 当严重破坏了可读性的时候不要使用`auto`

```cpp
pair<int, int> findPriceRange(int dist){
    int min = static_cast<int>(dist * 0.08 + 100);
    int max = static_cast<int>(dist * 0.36 + 750);
    return make_pair(min, max);
}

int main() {
    int dist = 6452;
    auto [min, max] = findPriceRange(dist);
    cout << "You can find price between: "
         << min << " and " << max <<endl;
    return 0;
}
```

这样的代码更加的现代一些，`findPriceRange()` 函数只需要传一个参数`dist`，返回 `min` 和 `max` 的 pair，这样也更加自然（对比传入三个参数：dist, min, max）。

像上面这个代码寻找区间的代码写成库函数给开发者调用的话是很不友好的，因为返回值没有做出更好的区分表明到底谁是 min，谁是 max，这时候可以使用结构体来对返回值进行一层抽象。不过在 C++中，结构体定义变量的时候 `struct` 关键字是可选的，比如：

```cpp
struct Student{
    int number;
    int age;
};

Student st{1, 2};
std::cout << "age: " << st.age << ", number: " << st.number << std::endl;
```

在 C 中，这需要`typedef`才能实现

Structured binding：一次性将复合类型变量的元素取值操作完成

```cpp
auto p = std::make_pair(“s”, 5);
string a = s.first;
int b = s.second;
```

使用了 Structured binding 就可以写成下边这样：

```cpp
auto p = std::make_pair(“s”, 5);
auto [a, b] = p;
```

C++ 默认赋值是 copy 的，如果函数传参涉及修改原数据应该用 `&` 引用，如果在其函数内部会出现对这种参数的赋值，也需要加 `&` ：

```cpp
void shift(vector<pair<int, int>>& nums) {
    for (auto& [num1, num2]: nums) {
        num1++;
        num2++;
    }
}
```
