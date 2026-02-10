## 关于

- 普通本科 大四在读 在一个应该算是科班的地方里学习的野路子 学校菜菜 我也菜菜 🫡
- 算是一个操作系统爱好者与编译器爱好者 😗
    - 不过目前主要在 OS 上
- INTJ 🤔
- 开发环境:
  - Gentoo Linux && Windows 11 双系统
     - 主要是 Gentoo Linux，我计划以后把 Windows 才能运行的应用都跑在我的 Windows 虚拟机里
  - Neovim/Visual Studio Code
- 编程语言:
  - C/C++
  - Python/Shell
  - ~~Java/C#/Rust ?~~

### Task

- [ ] 刷课
    - [x] MIT 6.1810: Operating System Engineering
        - [6.1810](https://pdos.csail.mit.edu/6.828/)
    - [ ] NJU ICS PA: 计算机系统基础课程实验
        - [南京大学 计算机科学与技术系 计算机系统基础 课程实验 2025](https://nju-projectn.github.io/ics-pa-gitbook/ics2025/)
    - [x] Stanford CS106L: Standard C++ Programming
        - [CS106L: Standard C++ Programming](https://web.stanford.edu/class/cs106l/)
    - [ ] UFMG DCC888: Static Program Analysis
        - [Static Program Analysis - DCC888](https://homepages.dcc.ufmg.br/~fernando/classes/dcc888/)
    - [ ] ASU CSE466: Computer Systems Security
        - [CSE 466 - Fall 2024](https://pwn.college/cse466-f2024/)
- [ ] 把 [xv6-riscv 源码阅读](../series/xv6-riscv_源码阅读/)的坑填上
    - 已经完成了用户态的部分，现在就差内核态了
    - 等我有时间的吧（短期内应该不会了

### Project

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

