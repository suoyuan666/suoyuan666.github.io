## 关于我

- 操作系统与编译器爱好者 😗
- INTJ 🤔
- 开发环境:
    - Gentoo Linux
    - Neovim/Visual Studio Code
- 编程语言:
    - C/C++
    - Python/Shell
    - ~~Rust/Zig ?~~

### 开源贡献

转到[开源贡献](../open-source/)部分

### 个人项目

#### os-cpp : 使用 C++20 编写的 RISC-V 为后端的操作系统

os-cpp 是一个使用 C++20 标准语法编写，目标 CPU 架构为 RISC-V 的类 Unix 操作系统

实现的不是很好，我暂时没有经历去优化了，而且后续的方向应该是用 Zig 去重写一遍

我一开始是因为相比于 C 来说更喜欢 C++ 的一些 feature，但后来发现如果想要把我在应用开发的习惯带过来的话，一些类型系统或者是 STL 相关的东西都需要我来实现，这似乎比我一开始想象的有一些困难，所以只实现了一个很简单的 kernel、shell 和 cat、ls 之类的 utils

项目链接: https://github.com/suoyuan666/os-cpp

#### gdbrpc: 一个用于和远程 GDB 交互的 Python RPC 框架

gdbrpc 提供了一组 Python API 用于和 GDB 远程交互，可以更方便的远程向 GDB 发送命令

项目链接: https://github.com/suoyuan666/gdbrpc

#### gdbmcp: 一个用于让 LLM 和 GDB 通信的 MCP Server

gdbmcp 主要就是利用 gdbrpc 实现远程通信，我简单封装成了 connect、kill 这几个会话管理的 tool，再加上一个执行 gdb command 的，基本也够用

项目链接: https://github.com/suoyuan666/gdbmcp

