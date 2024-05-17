---
title: "CMake简单使用"
author: suo yuan
pubDatetime: 2024-05-12T14:23:43.439Z
featured: false
draft: false
tags:
  - Cpp notes
  - intro
description: "我第一次尝试使用CMake管理自己的C++项目的记录"
---

# CMake 简单使用

由于想要编写一个C++的项目，所以开始学习`cmake`管理项目的编译工作。我这里会把 **src** 和 **include** 分开，并且尝试使用[Google test](https://github.com/google/googletest)做一些项目的简单测试。

```bash
$ tree -L 3
.
├── CMakeLists.txt
├── src
│   ├── CMakeLists.txt
│   ├── cppcurl.cpp
│   ├── include
│   │   ├── cppcurl.h
│   │   ├── os-detect.h
│   │   └── pack_core.h
│   ├── main.cpp
│   ├── os-detect.cpp
│   └── pack_core.cpp
├── test
│   ├── CMakeLists.txt
│   └── main_test.cpp
└── third_party
    ├── CMakeLists.txt
    ├── googletest
    │   ├── BUILD.bazel
    │   ├── ci
    │   ├── CMakeLists.txt
    │   ├── CONTRIBUTING.md
    │   ├── CONTRIBUTORS
    │   ├── docs
    │   ├── fake_fuchsia_sdk.bzl
    │   ├── googlemock
    │   ├── googletest
    │   ├── googletest_deps.bzl
    │   ├── LICENSE
    │   ├── MODULE.bazel
    │   ├── README.md
    │   ├── WORKSPACE
    │   └── WORKSPACE.bzlmod
    └── json
        ├── BUILD.bazel
        ├── ChangeLog.md
        ├── CITATION.cff
        ├── cmake
        ├── CMakeLists.txt
        ├── docs
        ├── include
        ├── LICENSE.MIT
        ├── LICENSES
        ├── Makefile
        ├── meson.build
        ├── nlohmann_json.natvis
        ├── Package.swift
        ├── README.md
        ├── single_include
        ├── tests
        ├── tools
        ├── WORKSPACE.bazel
        └── wsjcpp.yml
```

上面这个就是我项目的基础结构，**src** 存放项目的源代码，**src/include** 从存放一些自定义的头文件，**test** 目录存放用于开发测试的代码文件，**third_party** 目录存放第三方库文件。

我根目录的 **CMakeLists.txt** 文件的内容是：

```CMakeLists
cmake_minimum_required(VERSION 3.11)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

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
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wall -Wextra -Werror")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -O0 -ggdb -fno-omit-frame-pointer -fno-optimize-sibling-calls")
    enable_testing()
    add_subdirectory(test)
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    message(STATUS "Configuring Release build")
    # something come form https://airbus-seclab.github.io/c-compiler-security/clang_compilation.html
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O2 -pipe -fPIE -Wall -Wextra -Wpedantic -Werror -Wthread-safety")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fstack-clash-protection -fstack-protector-all -fcf-protection=full")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -flto -fvisibility=hidden -fsanitize=cfi")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -fsanitize=integer -fsanitize-minimal-runtime -fno-sanitize-recover")
endif()

if(EMSCRIPTEN)
    add_compile_options(-fexceptions)
    add_link_options(-fexceptions)
endif()

file(TO_CMAKE_PATH "${PROJECT_BINARY_DIR}/CMakeLists.txt" PATH_TO_CMAKELISTS_TXT)

if(EXISTS "${PATH_TO_CMAKELISTS_TXT}")
    message(FATAL_ERROR "Run CMake from a build subdirectory! \"mkdir build ; cd build ; cmake ..\" \
    Some junk files were created in this folder (CMakeCache.txt, CMakeFiles); you should delete those.")
endif()

# Compiler flags.
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

message(STATUS "CMAKE_CXX_FLAGS: ${CMAKE_CXX_FLAGS}")
message(STATUS "CMAKE_CXX_FLAGS_DEBUG: ${CMAKE_CXX_FLAGS_DEBUG}")
message(STATUS "CMAKE_EXE_LINKER_FLAGS: ${CMAKE_EXE_LINKER_FLAGS}")
message(STATUS "CMAKE_SHARED_LINKER_FLAGS: ${CMAKE_SHARED_LINKER_FLAGS}")

add_executable(ReleaseButler "src/main.cpp")

set(
    RB_SRC_INCLUDE_DIR
    ${PROJECT_SOURCE_DIR}/src/include
)

include_directories(${RB_SRC_INCLUDE_DIR})

set(ReleaseButler_LIBS
    pack_core
)

find_package(Boost  REQUIRED)
# include_directories(${Boost_INCLUDE_DIR})

target_link_libraries(ReleaseButler ${Boost_LIBRARY} ${ReleaseButler_LIBS})
```

这里我对Debug模式和Release模式都设置了不同的编译选项，我因为个人的原因很希望Release模式编译出来的是尽可能安全些的，所以找了一些安全方面的编译选项。我这里在开头就强制编译器是clang的原因就是Release模式的一些编译选项有些是gcc没有的。

**third_party** 目录下的 **CMakeLists.txt** 只又一行内容，就是为了加入 **googletest**

```CMakeLists
set(JSON_BuildTests OFF CACHE INTERNAL "")

add_subdirectory(googletest)
add_subdirectory(json)
```

**test** 目录下还有些东西，因为遇到额外添加 **googletest** 中的include到编译过程中，还要启用testing

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

# find_package(pack_core REQUIRED)

target_link_libraries(${TEST_TARGET_NAME} PRIVATE gtest gtest_main pack_core)

set_target_properties(${TEST_TARGET_NAME} PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

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

在项目的根目录下，执行下边的语句:

```bash
$ cmake --build build  -j `nproc`
[ 15%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest.dir/src/gtest-all.cc.o
[ 15%] Building CXX object src/CMakeFiles/pack_core.dir/cppcurl.cpp.o
[ 23%] Building CXX object src/CMakeFiles/pack_core.dir/os-detect.cpp.o
[ 30%] Building CXX object src/CMakeFiles/pack_core.dir/pack_core.cpp.o
[ 30%] Built target pack_core
[ 38%] Building CXX object CMakeFiles/ReleaseButler.dir/src/main.cpp.o
[ 46%] Linking CXX static library ../../../lib/libgtest.a
[ 46%] Built target gtest
[ 61%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest_main.dir/src/gtest_main.cc.o
[ 61%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock.dir/src/gmock-all.cc.o
[ 69%] Linking CXX static library ../../../lib/libgtest_main.a
[ 69%] Built target gtest_main
[ 76%] Linking CXX static library ../../../lib/libgmock.a
[ 76%] Built target gmock
[ 84%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock_main.dir/src/gmock_main.cc.o
[ 92%] Linking CXX executable ReleaseButler
[ 92%] Built target ReleaseButler
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

这里有一个问题，我使用的是Visual Studio Code写代码，用clangd插件提高C/C++的编程，我一开始用`ln -s`给 **build/compile_commands.json** 文件在根目录建一个软链接，但是clangd的没有成功解析出 **test/main_test.cpp** 文件的头文件位置，后来我安装了bear，特地`bear -- cmake`生成了一个 **compile_commands.json** 才成功解析。
