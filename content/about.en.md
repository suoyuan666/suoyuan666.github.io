## About Me

- Senior undergraduate student. CS major but self-taught. 🤐
- Enthusiast of Operating Systems & Compilers. 😗
    - Currently learning LLVM development
- INTJ 🤔
- **Dev Environment:**
  - Dual Boot: Gentoo Linux && Windows 11
     - Mainly Gentoo. I plan to eventually migrate all Windows-exclusive apps to a Windows VM.
     - Preparing to switch from Gentoo Linux to NixOS
          - Because my laptop has limited performance, compiling large software takes a significant amount of time
          - The official Gentoo Linux developers cannot maintain all the official repository packages in a timely manner; some packages have no maintainers, and updates for some packages are not carried out promptly
  - Neovim/Visual Studio Code
- **Programming Languages:**
  - C/C++
  - Python/Shell
  - ~~Java/C#/Rust ?~~

### Projects

#### os-cpp: A RISC-V OS written in C++20

os-cpp is a Unix-like operating system targeting the RISC-V architecture, written using standard C++20 syntax.

The implementation isn't perfect, and I don't have the energy to optimize it right now. The future plan is to rewrite it in Zig.

**Why C++?** Originally, I preferred C++ features over C. However, I realized that bringing my application development habits to kernel dev meant I had to implement the type system and STL-related components myself. This turned out to be harder than anticipated. As a result, only a very basic kernel, shell, and utils (like `cat`, `ls`) were implemented.

Project Link: https://github.com/suoyuan666/os-cpp

#### gdbrpc: A Python RPC framework for remote GDB interaction

gdbrpc provides a set of Python APIs for interacting with a remote GDB instance, making it more convenient to send commands remotely.

Project Link: https://github.com/suoyuan666/gdbrpc

#### gdbmcp: An MCP Server for LLM-GDB communication

gdbmcp leverages `gdbrpc` to enable remote communication. I wrapped basic session management tools (like `connect`, `kill`) and a general GDB command executor. It's simple but gets the job done.

Project Link: https://github.com/suoyuan666/gdbmcp
