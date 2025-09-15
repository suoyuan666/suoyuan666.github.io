## 关于

- 普通本科 大三在读 在一个应该算是科班的地方里学习的野路子 学校菜菜 我也菜菜 🫡
- 算是一个操作系统爱好者 😗
- INTJ 🤔
- 开发环境:
  - Fedora Silverblue && Windows 11 双系统
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
    - [ ] Stanford CS162: Operating System
        - [CS 162: Operating Systems and System Programming](https://cs162.org/)
        - [Welcome to Pintos](https://pkuflyingpig.gitbook.io/pintos)
    - [x] Stanford CS106L: Standard C++ Programming
        - [CS106L: Standard C++ Programming](https://web.stanford.edu/class/cs106l/)
    - [ ] Stanford CS144: Computer Network
        - [CS 144: Introduction to Computer Networking,](https://cs144.github.io/)
    - [ ] PKU 编译原理实践
        - [北大编译实践在线文档](https://pku-minic.github.io/online-doc/)
    - [ ] USTC 编译原理和技术
        - [USTC 编译原理和技术 2025](https://ustc-compiler-2025.github.io/homepage/)
    - [ ] KAIST CS420: Compiler Design
        - [KAIST CS420: Compiler Design](https://github.com/kaist-cp/cs420)
    - [ ] ASU CSE466: Computer Systems Security
        - [CSE 466 - Fall 2024](https://pwn.college/cse466-f2024/)
    - [ ] MIT 6.824: Distributed System
        - [6.5840: Distributed Systems](https://pdos.csail.mit.edu/6.824/)
        - [简介 | MIT6.824](https://mit-public-courses-cn-translatio.gitbook.io/mit6-824)
    - [ ] KAIST CS220: Programming Principles
        - [KAIST CS220: Programming Principles](https://github.com/kaist-cp/cs220)
- [ ] 把 [xv6-riscv 源码阅读](../series/xv6-riscv_源码阅读/)的坑填上
    - 已经完成了用户态的部分，现在就差内核态了
    - ~~现在正在赶 os-cpp 的进度，应该得等到 os-cpp 写的差不多了再更新了~~
    - 等我有时间的吧

### Project

#### ReleaseButler: 基于 GitHub 类 Ports 构建系统

Ports 是 *BSD 使用的一种系统，可以自动下载源代码、解压缩、打补丁、编译和安装软件。ReleaseButler 基于该理念，能够自动检测 Linux 发行版并构建软件，同时记录安装信息，方便用户快速重现配置环境。

- 设计并实现系统检测功能，确保跨 Linux 发行版的兼容性
- 开发了软件环境复现功能，显著提升了开发效率

项目链接: https://github.com/suoyuan666/ReleaseButler

#### os-cpp : 使用 C++20 编写的 RISC-V 为后端的操作系统

os-cpp 是一个使用 C++20 标准，目标 CPU 架构为 RISC-V 的类 Unix 操作系统

项目链接: https://github.com/suoyuan666/os-cpp
