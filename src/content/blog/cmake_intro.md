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
├── compile_commands.json
├── src
│   ├── include
│   │   ├── cppcurl.h
│   │   ├── errmsg.h
│   │   └── os-detect.h
│   ├── main.cpp
│   └── os-detect.cpp
├── test
│   ├── CMakeLists.txt
│   └── main_test.cpp
└── third_party
    ├── CMakeLists.txt
    └── googletest
        ├── BUILD.bazel
        ├── ci
        ├── CMakeLists.txt
        ├── CONTRIBUTING.md
        ├── CONTRIBUTORS
        ├── docs
        ├── fake_fuchsia_sdk.bzl
        ├── googlemock
        ├── googletest
        ├── googletest_deps.bzl
        ├── LICENSE
        ├── MODULE.bazel
        ├── README.md
        ├── WORKSPACE
        └── WORKSPACE.bzlmod
```

上面这个就是我项目的基础结构，**src** 存放项目的源代码，**src/include** 从存放一些自定义的头文件，**test** 目录存放用于开发测试的代码文件，**third_party** 目录存放第三方库文件。

我根目录的 **CMakeLists.txt** 文件的内容是：

```CMakeLists
cmake_minimum_required(VERSION 3.11)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # For clang-tidy.
set(CMAKE_CXX_STANDARD 20) # Compile as C++20.
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(project)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
        message(STATUS "Setting build type to `Debug` as none was specified.")
        set(CMAKE_BUILD_TYPE "Debug")
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
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wall -Wextra -Werror")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wno-unused-parameter -Wno-attributes") # TODO: remove
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -O0 -ggdb -fsanitize=${BUSTUB_SANITIZER} -fno-omit-frame-pointer -fno-optimize-sibling-calls")
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

message(STATUS "CMAKE_CXX_FLAGS: ${CMAKE_CXX_FLAGS}")
message(STATUS "CMAKE_CXX_FLAGS_DEBUG: ${CMAKE_CXX_FLAGS_DEBUG}")
message(STATUS "CMAKE_EXE_LINKER_FLAGS: ${CMAKE_EXE_LINKER_FLAGS}")
message(STATUS "CMAKE_SHARED_LINKER_FLAGS: ${CMAKE_SHARED_LINKER_FLAGS}")

enable_testing()

add_executable(project "src/main.cpp")
set(RB_THIRD_PARTY_INCLUDE_DIR
        ${PROJECT_SOURCE_DIR}/third_party
)
set(
    RB_SRC_INCLUDE_DIR
    ${PROJECT_SOURCE_DIR}/src/include
)
include_directories(${RB_SRC_INCLUDE_DIR} ${RB_THIRD_PARTY_INCLUDE_DIR})

add_subdirectory(third_party)
add_subdirectory(test)
```

**third_party** 目录下的 **CMakeLists.txt** 只又一行内容，就是为了加入 **googletest**

```CMakeLists
add_subdirectory(googletest)
```

**test** 目录下还有些东西，因为遇到额外添加 **googletest** 中的include到编译过程中，还要启用testing

```CMakeLists
cmake_minimum_required(VERSION 3.11)

set(TEST_TARGET_NAME main_test)

file(GLOB_RECURSE TEST_SOURCES "*.cpp")

add_executable(${TEST_TARGET_NAME} ${TEST_SOURCES})

include_directories(${PROJECT_SOURCE_DIR}/third_party/googletest/googletest/include)

target_link_libraries(${TEST_TARGET_NAME} gtest gtest_main)

set_target_properties(${TEST_TARGET_NAME} PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

add_test(NAME ${TEST_TARGET_NAME} COMMAND ${TEST_TARGET_NAME})
```

**test** 目录下的示例程序:

```cpp
#include "gtest/gtest.h"

// 定义一个测试用例
TEST(ExampleTest, Addition) {
    // 在这里编写测试逻辑
    int result = 1 + 2;
    // 使用 Google Test 提供的断言来验证结果是否符合预期
    EXPECT_EQ(result, 3); // 期望结果为 3
}

// 可以定义更多的测试用例

// main 函数用于运行所有测试用例
auto main(int argc, char **argv) -> int {
    // 初始化 Google Test 框架
    ::testing::InitGoogleTest(&argc, argv);
    // 运行所有测试用例，并返回测试结果
    return RUN_ALL_TESTS();
}
```

在项目的根目录下，执行下边的语句:

```bash
$ cmake --build build --config Debug --target all -j `nproc`
[  8%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest.dir/src/gtest-all.cc.o
[ 16%] Building CXX object CMakeFiles/ReleaseButler.dir/src/main.cpp.o
[ 25%] Linking CXX executable ReleaseButler
[ 25%] Built target ReleaseButler
[ 33%] Linking CXX static library ../../../lib/libgtest.a
[ 33%] Built target gtest
[ 41%] Building CXX object third_party/googletest/googletest/CMakeFiles/gtest_main.dir/src/gtest_main.cc.o
[ 50%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock.dir/src/gmock-all.cc.o
[ 58%] Linking CXX static library ../../../lib/libgtest_main.a
[ 58%] Built target gtest_main
[ 66%] Building CXX object test/CMakeFiles/main_test.dir/main_test.cpp.o
[ 75%] Linking CXX static library ../../../lib/libgmock.a
[ 75%] Built target gmock
[ 83%] Building CXX object third_party/googletest/googlemock/CMakeFiles/gmock_main.dir/src/gmock_main.cc.o
[ 91%] Linking CXX executable main_test
[ 91%] Built target main_test
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
