---
title: "C++ 项目编写初步入门"
author: suo yuan
date: 2024-05-12T14:23:43.439Z
draft: false
categories:
  - cpp
tags:
  - cpp notes
  - CMake
description: "我第一次尝试使用 CMake 等工具管理自己的 C++ 项目的记录"
---

<!--more-->
我第一次尝试使用 CMake 等工具管理自己的 C++ 项目的记录
<!--more-->

# C++ 项目编写初步入门

由于想要编写一个 C++ 的项目，所以开始学习 `cmake` 管理项目的编译工作。我这里会把 **src** 和 **include** 分开，并且尝试使用[Google test](https://github.com/google/googletest)做一些项目的简单测试。

并且我尝试使用 `clang-tidy` 和 `clang-format` 格式化我的代码，`doxygen` 生成项目 API 文档。

```bash
$ tree -a -L 2
.
├── build/
├── CMakeLists.txt
├── compile_commands.json -> build/compile_commands.json
├── doc
│   ├── doxygen-awesome-css/
│   ├── html/
│   └── man/
├── Doxyfile
├── LICENSE
├── README.md
├── README_ZH_CN.md
├── src
│   ├── CMakeLists.txt
│   ├── core
│   │   ├── CMakeLists.txt
│   │   └── pack_core.cpp
│   ├── curl_cpp
│   │   ├── CMakeLists.txt
│   │   └── cppcurl.cpp
│   ├── include
│   │   ├── cppcurl.h
│   │   ├── env.h
│   │   ├── log.h
│   │   ├── misc.h
│   │   ├── os-detect.h
│   │   └── pack_core.h
│   ├── main.cpp
│   └── utils
│       ├── CMakeLists.txt
│       ├── env.cpp
│       ├── log.cpp
│       └── os-detect.cpp
├── test
│   ├── CMakeLists.txt
│   └── main_test.cpp
└── third_party
    ├── argparse/
    ├── CMakeLists.txt
    ├── googletest/
    └── json/
```

上面这个就是我项目的基础结构，**src** 存放项目的源代码，**src/include** 从存放一些自定义的头文件，**test** 目录存放用于开发测试的代码文件，**third_party** 目录存放第三方库文件。

这里 `tree -a -L 2` 的输出，实际上我对它做了一些修改的工作，这里最后一级的文件夹我都加了 `/` 做区分，并且我认为不太重要的（如 **.build**, **.git** 文件夹）都删掉了它的下一级内容，并添加 `/` 表示它是文件夹。

## CMake 简单使用

> CMake is cross-platform free and open-source software for build automation, testing, packaging and installation of software by using a compiler-independent method. CMake is not a build system itself; it generates another system's build files. It supports directory hierarchies and applications that depend on multiple libraries. It can invoke native build environments such as Make, Qt Creator, Ninja, Android Studio, Apple's Xcode, and Microsoft Visual Studio. It has minimal dependencies, requiring only a C++ compiler on its own build system.
>
> [CMake](https://cmake.org/) 是跨平台的自由开源软件，用于使用独立于编译器的方法构建自动化、测试、打包和安装软件。 CMake 本身并不是一个构建系统，它只是生成另一个系统的构建文件。它支持依赖于多个库的目录层次结构和应用程序。它可以调用本机构建环境，例如 Make、Qt Creator、Ninja、Android Studio、Apple 的 Xcode 和 Microsoft Visual Studio。它具有最小的依赖性，仅需要其自己的构建系统上的 C++ 编译器。

上面这段话来自 [WikiPedia](https://en.wikipedia.org/wiki/CMake)

我根目录的 **CMakeLists.txt** 文件的内容是：

```CMakeLists
cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(ReleaseButler
    VERSION 2024.5
    DESCRIPTION "package manager on GitHub"
    LANGUAGES CXX
)

add_subdirectory(src)
add_subdirectory(third_party)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    message(STATUS "Setting build type to `Debug` as none was specified.")
    set(CMAKE_BUILD_TYPE "Debug")
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    enable_testing()
    add_subdirectory(test)
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wall -Wextra -Werror")
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    message(STATUS "Configuring Release build")
    # something come form https://airbus-seclab.github.io/c-compiler-security/clang_compilation.html
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O2 -pipe -fPIE -Wall -Wextra -Wpedantic -Werror")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fstack-clash-protection -fstack-protector-all -fcf-protection=full")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -flto")
    if (CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fsanitize=integer -fsanitize-minimal-runtime -fno-sanitize-recover")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -Wthread-safety  -fvisibility=hidden -fsanitize=cfi")
    elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fsanitize=address -fsanitize=undefined")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fstack-protector-strong -D_FORTIFY_SOURCE=2")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -Wl,-z,relro,-z,now,-z,noexecstack")
    endif()
endif()

file(TO_CMAKE_PATH "${PROJECT_BINARY_DIR}/CMakeLists.txt" PATH_TO_CMAKELISTS_TXT)
if(EXISTS "${PATH_TO_CMAKELISTS_TXT}")
    message(FATAL_ERROR "Run CMake from a build subdirectory! \"mkdir build ; cd build ; cmake ..\" \
    Some junk files were created in this folder (CMakeCache.txt, CMakeFiles); you should delete those.")
endif()

# Compiler flags.
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

message(STATUS "CMAKE_CXX_FLAGS: ${CMAKE_CXX_FLAGS}")
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    message(STATUS "CMAKE_CXX_FLAGS_DEBUG: ${CMAKE_CXX_FLAGS_DEBUG}")
elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
    message(STATUS "CMAKE_CXX_FLAGS_RELEASE: ${CMAKE_CXX_FLAGS_RELEASE}")
endif()
message(STATUS "CMAKE_EXE_LINKER_FLAGS: ${CMAKE_EXE_LINKER_FLAGS}")
message(STATUS "CMAKE_SHARED_LINKER_FLAGS: ${CMAKE_SHARED_LINKER_FLAGS}")
```

这里我对 Debug 模式和 Release 模式都设置了不同的编译选项，我因为个人的原因很希望 Release 模式编译出来的是尽可能安全些的，所以找了一些安全方面的编译选项。
由于 clang 实现了 CFI 保护，所以我这里检测当前编译环境的编译器如果是 clang 的话就启用该支持。 如果检测到是 GCC 环境的话也会启用相应的支持。

根目录下的 **CMakeLists.txt** 只是设置好相关的编译选项和一些基础设置，而后添加各个子目录的 **CMakeLists.txt**。

**third_party** 目录下的 **CMakeLists.txt** 判断如果是 Debug 的话就添加 googletest 库，并且把其他第三方库添加进去。

```CMakeLists
set(JSON_BuildTests OFF CACHE INTERNAL "")

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_subdirectory(googletest)
endif()

add_subdirectory(argparse)
```

**test** 目录下还有些东西，因为遇到额外添加 **googletest** 中的 include 到编译过程中，还要启用 testing

```CMakeLists
cmake_minimum_required(VERSION 3.11)

set(TEST_TARGET_NAME main_test)

set(TEST_SOURCE_FILES
    main_test.cpp
)

add_executable(${TEST_TARGET_NAME} ${TEST_SOURCE_FILES})

set(
    TEST_INCLUDE_DIR
    ${PROJECT_SOURCE_DIR}/src/include
    ${PROJECT_SOURCE_DIR}/third_party/googletest/googletest/include
)

include_directories(${TEST_INCLUDE_DIR})

target_link_libraries(${TEST_TARGET_NAME} PRIVATE gtest gtest_main ${ReleaseButler_LIBS})

add_test(NAME ${TEST_TARGET_NAME} COMMAND ${TEST_TARGET_NAME})
```

**test** 目录下的示例程序:

```cpp
#include "gtest/gtest.h"

#include "gtest/gtest.h"
#include "pack_core.h"

TEST(ExampleTest, Install) {
    EXPECT_EQ(Install("https://github.com/fastfetch-cli/fastfetch", "fastfetch-linux-amd64.deb", "true"), true);
}

auto main(int argc, char **argv) -> int {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
```

**src** 目录下的 **CMakeLists.txt** 设置了可执行文件的具体配置:

```CMakeLists
add_subdirectory(core)
add_subdirectory(curl_cpp)
add_subdirectory(utils)

set(PROGRAM_NAME releasebutler)

add_executable(${PROGRAM_NAME} "main.cpp")

set(
    RB_SRC_INCLUDE_DIR
    ${PROJECT_SOURCE_DIR}/src/include
)

set(
    RB_THIRD_PARTY_INCLUDE_DIR
    ${PROJECT_SOURCE_DIR}/third_party/argparse/include
)

include_directories(${RB_SRC_INCLUDE_DIR} ${RB_THIRD_PARTY_INCLUDE_DIR})

set(ReleaseButler_LIBS
    core
    utils
    curl_cpp
)

target_link_libraries(${PROGRAM_NAME} ${ReleaseButler_LIBS})
```

这里设置好了可执行文件的名称，以及它依赖的库文件，并在最开始添加相关库的子目录进去，先把子目录的 lib 编译好。

下边贴一个 **src/core/CMakeLists.txt** 的内容:

```CMakeLists.txt
set (
    RB_CORE_SRC_INCLUDE
    ${PROJECT_SOURCE_DIR}/src/include
)

set (
    RB_CORE_TP_INCLUDE
    ${PROJECT_SOURCE_DIR}/third_party/json/single_include/nlohmann
)

set (
    RB_CORE_SRC
    pack_core.cpp
)

include_directories(${RB_CORE_SRC_INCLUDE} ${RB_CORE_TP_INCLUDE})

add_library(
    core
    OBJECT
    ${RB_CORE_SRC}
)
```

可以看到就是简单的设置 include 路径并编译成 object

在项目的根目录下，执行下边的语句:

```bash
$ cmake --build build -j `nproc`
[  5%] Building CXX object src/utils/CMakeFiles/utils.dir/log.cpp.o
[ 11%] Building CXX object src/utils/CMakeFiles/utils.dir/os-detect.cpp.o
[ 17%] Building CXX object src/utils/CMakeFiles/utils.dir/env.cpp.o
[ 23%] Building CXX object src/core/CMakeFiles/core.dir/pack_core.cpp.o
[ 29%] Building CXX object src/curl_cpp/CMakeFiles/curl_cpp.dir/cppcurl.cpp.o
[ 35%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest.dir/src/gtest-all.cc.o
[ 35%] Built target curl_cpp
[ 35%] Built target core
[ 35%] Built target utils
[ 41%] Building CXX object src/CMakeFiles/releasebutler.dir/main.cpp.o
[ 47%] Linking CXX static library ../../../lib/libgtest.a
[ 47%] Built target gtest
[ 58%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock.dir/src/gmock-all.cc.o
[ 58%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest_main.dir/src/gtest_main.cc.o
[ 64%] Linking CXX executable releasebutler
[ 64%] Built target releasebutler
[ 70%] Linking CXX static library ../../../lib/libgtest_main.a
[ 70%] Built target gtest_main
[ 76%] Building CXX object test/CMakeFiles/main_test.dir/main_test.cpp.o
[ 82%] Linking CXX executable main_test
[ 82%] Built target main_test
[ 88%] Linking CXX static library ../../../lib/libgmock.a
[ 88%] Built target gmock
[ 94%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock_main.dir/src/gmock_main.cc.o
[100%] Linking CXX static library ../../../lib/libgmock_main.a
[100%] Built target gmock_main
```

这样在 **build/test** 目录下就会生成一个用于测试的程序。执行即可

```bash
$ ./build/test/main_test
[==========] Running 1 test from 1 test suite.
[----------] Global test environment set-up.
[----------] 1 test from ExampleTest
[ RUN      ] ExampleTest.Addition
[       OK ] ExampleTest.Addition (0 ms)
[----------] 1 test from ExampleTest (0 ms total)

[----------] Global test environment tear-down
[==========] 1 test from 1 test suite ran. (0 ms total)
[  PASSED  ] 1 test.
```

这里有一个问题，我使用的是 Visual Studio Code 写代码，用 `clangd` 插件提高 C/C++ 的编程体验，我一开始用 `ln -s` 给 **build/compile_commands.json** 文件在根目录建一个软链接，但是 `clangd` 的没有成功解析出 **test/main_test.cpp** 文件的头文件位置，后来我安装了bear，特地 `bear -- cmake` 生成了一个 **compile_commands.json** 才成功解析。

不过后来又好使了，不好评价那时候发生了什么。

## `clang-tidy` 和 `clang-format`

> `clang-tidy` is a clang-based C++ “linter” tool. Its purpose is to provide an extensible framework for diagnosing and fixing typical programming errors, like style violations, interface misuse, or bugs that can be deduced via static analysis. `clang-tidy` is modular and provides a convenient interface for writing new checks.
>
> `clang-tidy` 是一个基于 `clang` 的 C++ “linter” 工具。其目的是提供一个可扩展的框架，用于诊断和修复典型的编程错误，例如样式违规、接口误用或可以通过静态分析推断出的错误。 `clang-tidy` 是模块化的，并提供了一个方便的接口来编写新的检查。

[clang-tidy](https://clang.llvm.org/extra/clang-tidy/) 是一个静态语法扫描器。我第一次听说它就是在一个文章中，那篇文章介绍了 C++ 目前面临的困境，其中一个就是 C++ 的学习者还在对着已经过时的语法学习，根本不怎么了解 "modern cpp"。之后那篇文章介绍 `clang-tidy` 一定程度上正在解决这个问题，我对它的理解就是会检查源文件的语法是否符合 `clang-tidy` 认为的好写法，它根据多种规则来检查。但是 `clang-tidy` 内置的部分规则是没有必要的，比如要求类的成员函数的首字母需要大写（至少我认为没什么必要，甚至我写函数就没有大写的习惯，宏写的函数除外，不过宏写的到底能不能叫函数🤔）。

`clang-tidy` 支持项目根目录下存在一个 **.clang-tidy** 文件，该文件可以指定规则，检查的范围，对一些规则作具体的设置。

[clang-format](https://clang.llvm.org/docs/ClangFormat.html) 就是一个专门的代码格式化工具了，`clang-format` 内置了多种代码风格，可以指定某个风格并做一些额外的修改，当然也是写在项目的根目录下的 **.clang-format**。

下面是我 **.clang-tidy** 文件的内容：

```txt
Checks: '
        bugprone-*,
        clang-analyzer-*,
        google-*,
        modernize-*,
        performance-*,
        portability-*,
        readability-*,
        -bugprone-easily-swappable-parameters,
        -bugprone-implicit-widening-of-multiplication-result,
        -bugprone-narrowing-conversions,
        -bugprone-reserved-identifier,
        -bugprone-signed-char-misuse,
        -bugprone-suspicious-include,
        -bugprone-unhandled-self-assignment,
        -clang-analyzer-cplusplus.NewDelete,
        -clang-analyzer-cplusplus.NewDeleteLeaks,
        -clang-analyzer-security.insecureAPI.rand,
        -clang-diagnostic-implicit-int-float-conversion,
        -google-readability-avoid-underscore-in-googletest-name,
        -modernize-avoid-c-arrays,
        -modernize-use-nodiscard,
        -readability-convert-member-functions-to-static,
        -readability-identifier-length,
        -readability-function-cognitive-complexity,
        -readability-magic-numbers,
        -readability-make-member-function-const,
        -readability-qualified-auto,
        -readability-identifier-naming,
        -readability-redundant-access-specifiers,
        -bugprone-exception-escape,
        -performance-avoid-endl,
        -readability-use-anyofallof,
        '
CheckOptions:
  - { key: readability-identifier-naming.ClassCase,           value: CamelCase  }
  - { key: readability-identifier-naming.EnumCase,            value: CamelCase  }
  - { key: readability-identifier-naming.FunctionCase,        value: CamelCase  }
  - { key: readability-identifier-naming.GlobalConstantCase,  value: UPPER_CASE }
  - { key: readability-identifier-naming.MemberCase,          value: lower_case }
  - { key: readability-identifier-naming.MemberSuffix,        value: _          }
  - { key: readability-identifier-naming.NamespaceCase,       value: lower_case }
  - { key: readability-identifier-naming.StructCase,          value: CamelCase  }
  - { key: readability-identifier-naming.UnionCase,           value: CamelCase  }
  - { key: readability-identifier-naming.VariableCase,        value: lower_case }
WarningsAsErrors: '*'
HeaderFilterRegex: '/(src|test)/include'
AnalyzeTemporaryDtors: true
```

下面则是 **.clang-format** 的内容

```txt
BasedOnStyle: Google
ColumnLimit: 80
```

我对代码格式化还没有什么太高的需求，等我以后再好好研究如何更好的格式化吧。

## `doxygen` 使用

`doxygen` 是一个根据源文件的注释生成项目 API 文档的软件。我认为一定程度上这逼迫者我写注释😶‍🌫️。这个文档格式可以是 HTML，LaTeX，man pages 等，

`doxygen` 是根据 **Doxyfile** 生成相关文档的。在项目的根目录下打开终端输入 `doxygen -g` 即可产生一份带有注释信息的 **Doxyfile**，可以根据注释了解一下 **Doxyfile** 的写法。

下面是我 **Doxyfile** 的内容：

```Doxyfile
PROJECT_NAME           = "ReleaseButler"
PROJECT_NUMBER         = "1.0"
PROJECT_BRIEF          = "😙 package manager on GitHub 😙"

# Project section
# BRIEF_MEMBER_DESC = NO

HTML_STYLESHEET = doc/doxygen-awesome-css/doxygen-awesome.css

# 输入
INPUT                  = src README.md README_ZH_CN.md
FILE_PATTERNS          = *.cpp *.h
RECURSIVE              = YES

# 输出格式
GENERATE_HTML          = YES
HTML_OUTPUT            = doc/html
GENERATE_LATEX         = NO
GENERATE_XML           = NO
GENERATE_RTF           = NO
GENERATE_MAN           = YES
MAN_OUTPUT            = doc/man

# 文档风格
OUTPUT_LANGUAGE        = English

# 文档内容
EXTRACT_ALL            = YES

# 注释风格
JAVADOC_AUTOBRIEF      = YES
QT_AUTOBRIEF           = NO

# 其他
GENERATE_TREEVIEW      = YES
GENERATE_LATEX         = NO
GENERATE_HTMLHELP      = NO
DISTRIBUTE_GROUP_DOC   = NO
USE_MDFILE_AS_MAINPAGE = README.md
```

`doxygen` 生成的 HTML 网页好难看啊😢，所以我特地找了一个主题 [doxygen-awesome-css](https://github.com/jothepro/doxygen-awesome-css)，这样还能相对好看一些。

`doxygen` 对注释格式也有些要求，这是我写的一个注释：

```cpp
/**
 * @brief Simple encapsulation of std::getenv
 *
 * @param name Name of the environment variable
 * @return The value of the environment variable
 */
[[nodiscard]] auto get_env2str(std::string_view name) -> std::string;
```

`@brief` 是简要说明，`@param` 是参数说明，`@return` 是对返回值的说明。其实还有 `@note` 等字段，也可以用来标示一种信息。

而且实际上 `clangd` 目前不支持对 Doxygen 这样格式的注释的解析，导致 Visual Studio Code 读自己写的注释是没有什么好渲染的。
不过貌似微软官方的 C/C++ 插件可以解析 Doxygen 的注释，并渲染出来，但我习惯使用 `clangd` 了。
