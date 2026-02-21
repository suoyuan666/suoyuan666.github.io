---
title: "面向 beginner: GNU/Linux 发行版浅评与介绍"
author: suo yuan
date: 2023-12-01T03:42:51Z
lastmod: 2025-05-02T08:57:47Z
draft: false
categories:
  - Linux_杂谈
tags:
  - Linux
  - intro
description: "介绍了大部分主流的 GNU/Linux 发行版"
---
# 面向 beginner: GNU/Linux 发行版浅评与介绍

---
> - 2025 05 02 更新:
>     - 修改了一些语法问题，添加了 Fedora Silverblue 的介绍，删除了一些过时的评价。
> - 2026 02 17 更新：
>     - 以现在的视角修改了一些表述过时的地方
> - 2026 02 21 更新：
>     - 添加了一点点说明使其更加完整
---

本文将介绍几个常见的 GNU/Linux 发行版，并假定读者对计算机领域有一定的了解。

首先，我们需要知道为什么会有发行版这个概念。

因为 Linux 指的都是 Linux kernel 本身，但我们日常使用肯定不是 Linux kernel 一个操作系统内核就完事了。一个操作系统内核会负责软件和硬件的交互以及正在运行的程序的管理，但不会提供桌面环境，不会提供一个名叫 "设置" 的应用让你设置屏幕亮度，不会提供 "应用商店" 让你安装应用。

因为 Linux kernel 只是一个 OS kernel，所以我们需要更多的软件才能够正常使用，比如我们需要一个让用户能够管理无线网络的程序、需要一个浏览器、需要文本编辑器、需要一个桌面环境显示出图形化的程序...

而这些发行版就是做这个的，把不同的软件组合到一起发行，让用户有一个开箱即用的体验。

这里也可以解释为什么说 GNU/Linux 发行版，这代表这类发行版都使用了 Linux kernel 和 GNU 的软件。

> There really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called “Linux” distributions are really distributions of GNU/Linux.
>
> -- https://www.gnu.org/gnu/linux-and-gnu.html

从这里看到，GNU 认为应该将以 GNU 为基础的 “Linux 发行版” 都叫成 GNU/Linux，因为 Linux 指代的应该是 Linux kernel，而非一整套系统。GNU 工具链几乎是所有 Linux 发行版的必备组件，不过依旧存在一些一定程度上要 de-gnu 的 Linux 发行版。当然，我们应该尊重发行版官方给出的名称，例如 Debian 而非 Debian Linux。

其次，选择 GNU/Linux 发行版这件事，很大程度上等同于选择什么软件包管理器，选择什么样的系统更新策略。

因为软件就在那里不会改变，这与发行版无关，发行版之间的不同的原因可以认为是使用的软件包管理器导致的。软件包管理器大概可分成两种类型：直接装二进制软件包和从拉取源代码开始编译。系统的更新策略一般分成随版本的更新，比如 Ubuntu 的 LTS ( Long-term support ) 是推送五年的安全更新，之后就要换更新的 LTS 版本了；以及滚动更新，这样会一直向前更新，也就不会有版本的概念。

这里我再先说一下 GNU 为什么这么重要，**以下的部分内容是我的个人看法** 。我认为很大的原因是 GNU 的软件都很不错，而且出现的也足够早，这就是原因。在 Linux kernel 还没发布的时候，GNU 项目早就开始写了，它们的目的是要写一个完全自由的操作系统。它们先开始写一些操作系统必备的程序，比如文本编辑器，编译器等等，但当最后写操作系统内核的时候，由于想要实现一个微内核 GNU Hurd，但是微内核调试更为困难，这极大的拖慢了开发进度。这个时候 Linux kernel 就已经发布出来，并且可以运行 GNU 的各种程序。

gcc 本身也支持一些额外功能，比如嵌套函数，glibc 使用了 gcc 这个特性导致其无法使用 clang/llvm 编译，不过最新版的 glibc 似乎实验性支持了使用 clang 编译？我没细看

根据 [Comparison of C/POSIX standard library implementations for Linux](https://www.etalabs.net/compare_libcs.html)，musl libc 的字符串和内存分配相关的函数性能不如 glibc。

[Alpine Linux](https://alpinelinux.org/) 就是使用的 musl libc 替换了 glibc，用 busybox 替换了 gnu-coreutils，不过软件支持的还不是很多。

我不会介绍这种 de-GNU 的 Linux 发行版。

---

如果你并不是虚拟机安装 Linux 发行版的话，我认为应该还是要思考该类系统是否符合你的需求再说，当然如果你并不在意就当我没说。

浏览器对硬件解码的支持不是很完美。视频硬解加速方面，NVIDIA 采用自家的 NVDEC 方案，而其他显卡通常使用 VAAPI。[nvidia-vaapi-driver](https://github.com/elFarto/nvidia-vaapi-driver) 可将 NVIDIA 的 NVDEC 映射为 VAAPI 解码。FireFox 支持 VAAPI 但不支持 NVDEC，Chromium 内核的浏览器同样只支持 VAAPI。

我不好评价 GNU/Linux 玩游戏会是怎样的体验。Valve 公司基于 wine 开发了 [Proton](<https://en.wikipedia.org/wiki/Proton_(software)>)，只要在 Steam Play 中勾选为所有应用启用 Steam Play 就可以玩那些只支持 Windows 平台的游戏了，Steam Deck 上搭载的系统 Steam OS 是基于 Arch Linux 做的，所以使用 GNU/Linux 玩游戏方面也不至于那么难绷。

非官方的网站 [protondb](https://www.protondb.com/)，这上面可以搜索到一些游戏的评价，有玩家会在上面分享这个游戏在他使用的发行版运行起来的体验如何，并且还有给出他运行这个游戏的发行版的相关信息，如果是不太好运行的游戏，也许还会分享他们是如何让这个游戏跑起来的。

国内常用软件中仍有一部分对 GNU/Linux 发行版的适配支持不好，比如网易云音乐

更多的可以参考我新写的一篇文章：[为什么你应该(不)使用 GNU/Linux 作为日用操作系统](../whywinorlinux/)

---

## OS

### Debian 相关

首先介绍 Debian，因为如果有国内软件是被官方支持开发 Linux 版本的，那么至少会给一个 deb 包（也就是用 .deb 作为后缀，deb 就是 Debian 系使用的软件包格式）。Debian 系使用 dpkg 作为软件包管理器。

#### Debian

官网链接：https://www.debian.org/

历史相对来说极其悠久的 GNU/Linux 发行版，在我认知中比 Debian 历史更加久远的应该就是 Slackware

Debian 被认为是稳定的操作系统，这个稳定就带来了使用的不是新版本的软件的特点，毕竟时间方面，新版本没有经历过考验。不过如果给 Debian 添加一个 testing 软件源就可以尝鲜新版本了。

Debian 默认不安装类似 sudo 这样的执行特权命令的程序，所以需要你自己安装，然后自己写相应的配置文件。（sudo 这样的软件是很有必要的，老生常谈的就是尽量减少攻击面之类的，直接 su 切换到 root 用户去执行*和系统相关的命令*是很危险的行为）

Debian 采用版本发布周期，不过印象中 testing 分支可以让它变成滚动更新。

> 个人认为，Debian 的特点在于稳定，但缺乏让我感到眼前一亮的 feature，除了稳定本身

#### Ubuntu

官网链接：https://ubuntu.com/

基于 Debian 的操作系统。

Ubuntu 默认安装 GNOME 桌面环境，安装过程中不提供桌面环境选择。桌面环境（DE，Desktop Environment）后续再谈。

当然有使用不同 DE 的 Ubuntu，但得下载对应系统的镜像文件了，比如使用 KDE Plasma 的叫做 KUbuntu。这个 KUbuntu 大抵是比较适合作为一些新手（我指的是从 Windows 换到 GNU/Linux）的，因为 KDE 和 Windows 桌面的使用习惯在我看来是差不多的（甚至 KDE 有一个主题就是旨在模仿 Win11）。

再解释一下为什么认为 KUbuntu 大抵是比较适合作为一些新手，因为 Debian/Ubuntu 有着大量的用户群体，这里在我国貌似也不例外（可能是这样，我并不知道全国使用 GNU/Linux 发行版的这个具体情况，所以只能说可能是如此）。很多软件如若要有一个针对 GNU/Linux 平台的版本，那么很大概率就是 Debian/Ubuntu 了，而且一些教程如若提到了在 GNU/Linux 平台下该如何操作的话，大多至少都会考虑到读者可能使用的是 Debian/Ubuntu 发行版。

Ubuntu 随版本更新。

> 个人认为，安装 Ubuntu 作为日用操作系统并非最佳选择，因为 Debian 是更合适的选择。两个发行版都使用了 dpkg，那为什么不用社区支持的 Debian。我唯一认可的场景是快速安装以立即开始工作，否则我认为直接安装 Debian 更好。

#### Kali Linux

官网链接：https://www.kali.org/

基于 Debian testing 源的 Kali Linux 安装界面类似 Debian 的系统安装界面。

Kali Linux 是否适合作为日常操作系统，我无法评价（我没有长期用过，不过官方文档提到过不推荐日常使用，因为他们做了很多客制化可能导致一些软件无法正常运行）。

> While Kali Linux is architected to be highly customizable, do not expect to be able to add random unrelated packages and repositories that are “out of band” of the regular Kali software sources and have it Just Work. In particular, there is absolutely no support whatsoever for the apt-add-repository command, LaunchPad, or PPAs. Trying to install Steam on your Kali Linux desktop is an experiment that will not end well. Even getting a package as mainstream as NodeJS onto a Kali Linux installation can take a little extra effort and tinkering.
>
> https://www.kali.org/docs/introduction/should-i-use-kali-linux/#is-kali-linux-right-for-you


Kali Linux 对桌面环境的美化做得不错。值得一提的是，Kali Linux 通常不需要更换软件源，而大多数 GNU/Linux 发行版因网络延迟可能需要更换软件源。不过，国内公司开发的发行版（如 Deepin/UOS、openKylin）以及 Kali Linux、OpenSUSE、Fedora 等，其官方源在国内的访问速度尚可，不一定需要更换。

Kali Linux 采用滚动更新模式。

> 个人认为 Kali Linux 没有必要安装，因为它主要是安全工具的集合，使用其他发行版搭配所需工具也能达到类似效果。

#### Deepin 23 之前

官网链接：https://www.deepin.org/

Deepin 作为我国国产的操作系统，我自然是要体验一番的（虽然只使用了一天左右吧），Deepin V20.x 都是基于 Debian 做的。Deepin 23 开始，包管理器就不再使用 Debian 的 dpkg 而是开始自己做了，所以标题写的是 Deepin 23 之前。

Deepin 操作系统是我比较推荐新手使用的，不过我自己没使用过太久，所以可能这个 OS 没有我想象中那么新手友好。作为一款国产的操作系统，一些没有推出 Linux 版本的国内软件它有自带的解决方案（虽然我没记错的话，应该是用 wine 模拟的，wine 是一个类 Unix 平台中运行 exe 程序的解决方案），Deepin 自带的软件商店可以点击一下就安装了，还是比较方便的。Deepin 默认使用自家的 DE——DDE，这个 DE 我自认为不咋好看。

> Wine 通过提供一个兼容层来将 Windows 的系统调用转换成与 POSIX 标准的系统调用。它还提供了 Windows 系统运行库的替代品和一些系统组件（像 Internet Explorer，注册表，Windows Installer）的替代品

上面这一小段摘自[维基百科对 wine 的介绍](https://zh.wikipedia.org/wiki/Wine)。

Deepin 是随版本更新。

### Fedora Linux 相关

Fedora Linux 有 Fedora Workstation、Fedora Spins、Fedora Coreos 等，这里介绍两位。

#### Fedora Workstation

官网链接：https://fedoraproject.org/workstation/

Fedora 的最大特点是软件版本比较新。宣传特色就是为开发者设计和注重隐私和安全。

确实是为开发者设计，默认安装了 QEMU 和 GNOME BOX 可以用来安装虚拟机，还安装了 podman 用于安装一些容器。

Fedora 默认启用 firewalld 防火墙，使用了 [SELinux](https://fedoraproject.org/wiki/SELinux) 安全模块，安装时可选全盘加密，开箱即用的安全启动支持，软件仓库中的软件编译时也都开启了 NX、PIE、fstack-protector、ASLR 等选项，内核也开启了一些安全选项编译。

不过不要看我说了上面一小段来介绍它的安全特色，大多数发行版基本和它差不太多（除了 SELinux 和 firewalld 之外

Fedora 40 开始，会为每个 Wi-Fi 连接生成独立的 MAC 地址以保护隐私：https://fedoraproject.org/wiki/Changes/StableSSIDMACAddress

Fedora 原本提案要使用 systemd 服务编写中的一些安全相关的代码加强系统服务的安全性，但该提案最终并没有通过

[Enable systemd service hardening features for default system services](https://fedoraproject.org/wiki/Changes/SystemdSecurityHardening)

Fedora 和 GNOME 配合的很好，接受 GNOME 的更新也是最新的那一批。

Fedora Workstation 使用 GNOME 桌面环境，安装时不可选桌面环境。如果想要安装其他桌面环境的 Fedora，要么安装后再使用包管理器更换（不推荐），要么选择其他桌面环境的 Fedora，在官网最下边有其他桌面环境和用途的 Fedora Linux。

Fedora Linux 是随版本更新。

> - Fedora 默认会开 lzo 算法的 zram，这点可以的。
>
> - Fedora 的软件足够的新，有时候也会引入了一些"先进"的东西
>     - pipewire 作为现代化的音视频服务框架，是 Fedora 率先引入
>     - systemd 这个大家都在用的 init 系统，也是 Fedora 先用
>     - Wayland 显示协议也是 Fedora 率先做出了支持
>         - RedHat 曾在 GNOME 上发起提案让 GNOME 只保留对 Wayland 的支持，并在那时在 Fedora 上率先不默认提供非 Wayland 的 GNOME
> - 新技术总是需要试验田的，Fedora 往往就扮演了这个角色

#### Fedora Silverblue

Fedora Silverblue 是一种不可变发行版。在保留了 Fedora Workstation 的特色之后，增加了不可变特性。

这里的不可变指的是系统资源不可变（/usr 下的文件可读挂载）。用户的操作基本都要在容器中，尽量和主系统隔离。软件的更新安装等操作是原子的，并且便于回滚到上次版本。Fedora Silverblue 默认保留最近两次的更新快照。

Fedora Silverblue 底层使用 ostree，它类似 git，在系统更新拉取远端的 base image 时，就类似于拉取一个 commit。而 rpm-ostree 建立在 ostree 上层，可以从 rpm 构建 commit，并在已有的 commit 上修改。所以更新时就是拉取远端的 commit，之后再重载用户所做的应用添加和删除操作。

Fedora Silverblue 鼓励使用容器化和系统主机隔离，系统默认安装了 [toolbox](https://github.com/containers/toolbox) 用来创建一个虚拟化的环境。

但值得注意的是 toolbox 的虚拟化不意味着强隔离，它拥有对用户 home 目录的读写权限，这只是一个用来安装 CLI 工具（如 neovim、gcc）的好办法。

对于图形化软件，推荐使用 flatpak 安装。

> 我个人很推荐 Fedora Silverblue，它非常适合个人桌面 PC 的日常使用。

### Arch Linux 相关

Arch Linux 相关的发行版使用 pacman 作为软件包管理器。Arch Linux 提供了 [AUR](https://aur.archlinux.org/)，这是一个用户软件仓库，提供了 Arch Linux 官方仓库没有的软件，例如 linuxqq 等国产软件。但 AUR 本质上是一个构建脚本（PKGBUILD）的集合，软件仍需从脚本中指定的网址下载。国内软件安装尚可，但从 GitHub 等境外源获取软件时需要配置网络。

archlinuxcn 软件仓库提供一些额外软件用于国内用户使用，中科大有对应的镜像源。AUR 是 GNU/Linux 平台中软件包数量极多的仓库之一，可能只有 NixOS 的仓库能超越它。

#### Arch Linux

官网链接：https://archlinux.org/

Arch Linux 是我推荐在 Deepin 待过一会就尝试的操作系统，虽然这个系统需要使用命令来安装，没有安装界面，所以可能有些困难。不过[Arch Wiki](https://wiki.archlinux.org/title/Main_page)写的还是不错的，可以结合着别人的安装指南来看，wiki 和指南一起看，虚拟机尝试一手，就差不多了。

这样的命令安装也许能让你对你的操作系统更有一个掌握的感觉。

而且我认为有一个 Arch Linux 的启动盘是有些必要的，因为这样能一定程度上解决一些你需要进入系统才能解决的类似无法进入系统的问题。

很多软件在 AUR 上都有对应的 BUILD 脚本，这一块的生态是我选择 Arch Linux 的一个很重要的原因

Arch Linux 给了用户很高的自由度，用户可以自己选择使用什么增强安全的方式。

Arch Linux 提供了 [archinstall](https://github.com/archlinux/archinstall) 可以更方便地安装系统

Arch Linux 是滚动更新。

> 我使用 Arch Linux 大约五个月后转向了 Gentoo Linux，时间不长，因此未亲历滚动更新可能导致的“滚挂”。首先需要明确“滚挂”的定义：我曾遇到一次登录管理器进入后黑屏的情况，查看错误日志发现是 nouveau 驱动问题，通过在 kernel 启动参数中禁用 nouveau 解决。此类问题是否算作“滚挂”？我认为不算。用户可安装 TimeShift 定期创建快照作为备份，不过我个人安装后并未实际使用过。
>
> 我很久之前一直纠结于一个问题，那就是我似乎不能看到 Arch Linux 官方软件包的打包日志，但是 Arch Linux 官方的打包似乎把责任都推给了那些核心开发者身上，由开发者打包并使用 GPG 签名保证用户下载的时候不出现问题。但这似乎太信任那些开发者了，我更希望有一个大家都能监控的网站能清晰透明地看到构建过程。
>
> 我刚刚发现 Arch Linux 在这方面也做出了努力: https://wiki.archlinux.org/title/Reproducible_builds
>
> 在 https://reproducible.archlinux.org/ 上就能看到是否能重现，部分软件包是失败的，不过怎么 linux 6.18.9.arch1-2 都在失败的列表里，话说这都 2026 年 2 月 21 日了，Arch Linux 的 linux 怎么是 6.18.9，还没有上 6.19.3 啊。


#### Manjaro

官网链接：https://manjaro.org

Manjaro 是基于 Arch Linux 的发行版，其软件仓库的更新比 Arch 晚两周。Manjaro 的优势在于提供图形化安装界面，用户可通过点击完成安装，无需输入命令。我看到过一个吐槽 Manjaro Linux 的言论，说 Manjaro 降低了使用 Arch Linux 的门槛，反而让一些用户难以应对使用中可能遇到的问题。当然我并不认为这有太大问题。我曾经在某年冬天计划安装 Manjaro 双系统，但后来直接安装了 Arch Linux 单系统。

Manjaro 提供了图形化的驱动管理工具，方便用户安装专有驱动。

Manjaro Linux 是滚动更新。

### OpenSUSE 相关

OpenSUSE 使用 zypper 作为软件包管理器。

#### OpenSUSE

官网链接：https://www.opensuse.org/

OpenSUSE 提供了滚动更新和版本更新两种更新方式，这对应它两个版本。有个类似 AUR 的用户软件仓库 OBS，不过我不是很了解 OBS，也不再多说什么了。OpenSUSE Linux 有别的 OS 都没有的 Yast 客户端，这个 GUI 软件可以完成很多特权操作，类似 Windows 的控制面板。而且 OpenSUSE 的软件源网址貌似可以自动给你选一个近的软件源去下载软件，可以让你使用官方源的时候也保持着还不错的速度。

就像上一段开头说的那样，OpenSUSE 提供了滚动更新和依版本更新两种方式，分别是 OpenSUSE Tumbleweed 和 OpenSUSE Leap。

OpenSUSE 默认启用了 Apparmor，GRUB 启动引导界面有自己的皮肤，虽然我认为这个皮肤不怎么好看。

之前在 Fedora 那里提到了 Fedora 没有通过加强 systemd 服务的提案，但 OpenSUSE 的安全特色之一就是这个。

OpenSUSE 还提供了 x86-64-v3 指令集的软件包。相比于普通的 x86-64，x86-64-v3 典型的就是有 SIMD 的增强，使用 x86-64-v3 编译的软件性能可能会有点提升。目前市面上大家买的 x86-64 CPU，都会支持 x86-64-v3，如果是一些服务器 CPU，可能还支持 x86-64-v4

为了兼容性，一些发行版可能使用 x86-64 为目标编译而不是 x86-64-v3

### Gentoo Linux 相关

Gentoo 使用 portage 软件包管理器，软件大多都是从源码开始安装。部分大型软件提供了二进制软件包版本。

#### Gentoo Linux

官网链接：https://www.gentoo.org

所谓的元发行版，由于软件仓库分发的是源码而不是软件本身（需要用户自己在自己的电脑或者是用户个人的服务器上编译），给了用户其他发行版都没有的自由。

这个自由是选择的自由。

Gentoo Linux 是少数允许你选择非 systemd 作为 init 系统的发行版，但在当前环境下，使用非 systemd 作为桌面操作系统的 init 系统，就像使用 linux-libre 作为内核一样难以想象。不过，非 systemd 的 init（如 openrc）仍然可用，而 linux-libre 的实际使用情况我比较怀疑。

> 曾经我认为我是用 openrc 的场景就是用 Gentoo Linux 的时候把 musl libc 作为系统的 libc，因为 systemd v259 之前只支持 glibc，不过 systemd 在 v259 之后就实验性的加入了对 musl libc 的支持

我不知道你是否对部分发行版打包的策略有意见，比如某些软件你希望直接上 O3 + lto 编译（虽然这些都是理论上的性能提升，用户难以直接感知到变化），但是为了稳定，少有软件会选择这个编译策略，但是 Gentoo Linux 可以让你的想法成真。

或者你不满软件的一些行为，但是你的 patch 一时还难以合并过去。portage 支持编译时应用用户自己的 patch。

> Fedora 41 选择了使用 O3 编译 Python，自称有 1.4 倍的性能提升
>
> https://fedoraproject.org/wiki/Changes/Python_built_with_gcc_O3

portage 的优点在于提供了 USE 变量，它允许用户自己决定软件的功能支持以确定依赖关系。Arch Linux 可能可以认为是可以定制你的系统，Gentoo Linux 就是可以定制你的软件。

> USE 是 Gentoo 为用户提供的最具威力的变量之一。很多程序通过它可以选择编译或者不编译某些可选的支持。例如，一些程序可以在编译时加入对 GTK+或是对 Qt 的支持。其它的程序可以在编译时加入或不加入对于 SLL 的支持。有些程序甚至可以在编译时加入对 framebuffer 的支持（svgalib）以取代 X11（X 服务器）。
>
> 大多数的发行版会使用尽可能多的支持特性编译它们的软件包，这既增加了软件的大小也减慢了启动时间，而这些还没有算上可能会涉及到的大量依赖性问题。Gentoo 可以让你自己定义软件编译的选项，而这正是 USE 要做的事。、
>
> 在 USE 变量里你可以定义关键字，它被用来对应相应的编译选项。例如，ssl 将会把 SSL 支持编译到程序中以支持它。-X 会移除其对于 X 服务器的支持（注意前面的减号）。gnome gtk -kde -qt5 将会以支持 GNOME（和 GTK+）但不支持 KDE（和 Qt）的方式编译软件，使系统为 GNOME 做完全调整（如果架构支持）。

摘自 [Gentoo amd64 安装手册](https://wiki.gentoo.org/wiki/Handbook:AMD64/Full/Installation/zh-cn#.E9.85.8D.E7.BD.AE_USE_.E5.8F.98.E9.87.8F)

当然还有很多变量，比如 CFLAGS, L10N, VIDEO_CARDS 这些，可以指定编译选项，本地语言和显卡设备

Gentoo Linux 这种源代码发行的系统，优势在于软件都是自己的机器编译安装，从隐私或安全角度来说都还不错，可惜我的机器性能没那么强劲。

Gentoo Linux 的安装并不完全依赖于它的安装介质，比如也可以使用 Arch Linux 的 livecd 去安装。

> 个人认为，Gentoo Linux 存在一个问题，那就是社区相比于 Arch Linux 和 Nix OS 的规模来说不够庞大，官方软件仓库甚至有软件包没有维护者，当然比较重要的一般不会没有人，最低也只是缺少维护者，比如 Gentoo 的 GNOME 就缺少维护者，导致 Gentoo 的 GNOME 的整体升级比较慢

Gentoo Linux 是滚动更新。

### Nix 相关

Nix 系使用 Nix 作为包管理器，这是一种[纯函数式包管理器，旨在使软件包管理可靠且可重现](https://wiki.archlinuxcn.org/wiki/Nix)。其特点是不遵守 FHS 标准，每个软件的每个版本都有唯一的哈希值标识，并通过符号链接自由选择软件版本，从而避免依赖地狱问题。Nix 系发行版主要有 NixOS，另有一个类似的包管理器 [GNU Guix](https://en.wikipedia.org/wiki/GNU_Guix)，基于它也有一个发行版 Guix OS。

FHS (Filesystem Hierarchy Standard)标准规定了文件系统中每个部分的大致用途和名称，比如/etc 存放配置文件，/bin 存放可执行文件，/lib 存放可执行文件使用的链接库。

依赖地狱(Dependency hell)这个问题我自身没遇到过，这个问题虽然有多种表现形式，但是我认为大体上你最多可能看到其中的一种情况——你安装了软件 A，其依赖于软件 B 3.2 版本，之后你又想安装软件 C，但是它依赖于软件 B >= 3.4 版本，这时候版本之间就发生了冲突。

其实软件包管理器一定程度上解决了依赖地狱的一些问题，当然有的软件包管理器貌似没有版本的概念，也就没有刚刚我说的这个问题的存在。

Nix 靠将每个软件包都安装在 `/nix/store` 文件夹中并附上一个唯一的哈希值作为标记，保证了软件包依赖的独立性，不同软件的相同的依赖会因为这个哈希值而被标识为是对方的依赖，从而解决了依赖地狱的问题。当然，这样的方式也造成了磁盘空间的占用。Nix 存在着大量的软链接，其通过链接的方式做到指定当前环境的每个软件的版本是多少。

#### NixOS

官网链接：https://nixos.org/

NixOS 提供两种安装方式——图形化安装和手动安装。图形化安装就像 Fedora 这样的发行版一样提供一个带 DE 的 LiveCD 环境，不过这种安装受到我国网络环境的限制，不过都有 DE 了，是否在设置里设定一下代理，或者像 clash 这样的代理工具开 tun 模式可以完成下载软件的步骤 🤔。反正我是手动安装的。该系统的特点是大部分的配置可以写在 `/etc/nixos/` 中的文件中，比如对软件，services，用户的管理等等。在安装软件的时候可能涉及到从诸如 GitHub 之类的网站下载补丁或者源码，所以做好网络环境的配置是必要的。

安装软件时可能涉及从 GitHub 等网站下载资源，如果你使用 NUR（我不确定 NUR 是否有国内镜像源），由于 NUR 仓库托管在 GitHub，配置好网络环境是必要的。

不过，Nix 的这种特性在安装交叉编译链时可能显得不够友好，例如为 RISC-V 64 架构安装 QEMU 会引入大量依赖。当然 NixOS 有许多有趣的功能，可能存在更好的交叉编译链安装方式，只是我尚未了解。

NixOS 不遵守 FHS 标准，因此常规的 chroot 不易操作，需使用其自带的工具 `nixos-enter`

NixOS 的 flakes 和 home-manager 结合可以更好的声明你的系统配置，很多东西都可以用这些声明文件自动生成。但是现在的问题是文档质量不足，太多的东西都需要直接看 [nixpkgs](https://github.com/NixOS/nixpkgs) 中的源代码，虽然现在有 [NixOS Search](https://search.nixos.org/options) 和 [MyNixOS](https://mynixos.com/) 可以搜索相关的部分细节，但也不是很够。如果要全面的了解还是需要去看源码是怎么写的。

---

除非你选择不安装桌面环境（直接使用窗口管理器），否则选择一款合适的 DE 是安装后的一项重要决策。

---

## DE

> 桌面环境将各种组件捆绑在一起，以提供常见的图形用户界面元素，如图标、工具栏、壁纸和桌面小部件。此外，大多数桌面环境包括一套集成的应用程序和实用程序。最重要的是，桌面环境提供了他们自己的窗口管理器，然而通常可以用另一个兼容的窗口管理器来代替。

桌面环境我只浅谈一下 KDE Plasma, GNOME 和 Xfce。~~我在下面谈到了对 Wayland 的支持问题，如果你是 NVIDIA 独显驱动用户的话，GNOME 是禁用 Wayland 的，KDE plasma 不禁用。~~（GDM 会 检查 NVIDIA 是否开启了一些参数以选择是否禁用 Wayland，总体来说是可用的）

如果你要使用 Wayland，输入法框架方面就不能选择 fcitx，只能选择 fcitx5 了。ibus 直接装就是支持 Wayland 的。我引入了输入法框架这个名词，但是没有太多解释，我这里就放一个 [Arch zhWiki 中输入法条目的链接](https://wiki.archlinuxcn.org/wiki/%E8%BE%93%E5%85%A5%E6%B3%95)。

当然，各家 DE 都是有美化的空间的，具体你可以去搜一搜相关的美化教程，我本人是懒得做这些事情，所以也就没什么好说的了。（我认为美化的空间都很有限）

一个桌面环境（DE）一般包括一个窗口管理器（WM）还有一堆相关的软件：文件管理，查看图片视频音频等，设置，文本编辑器等

在我看来，KDE Plasma 优秀的地方在于：

- 家族有很多软件，并且其中存在很多有用的软件。
- 设置里存在很多可设置选项，可以调控的地方很多很多很多
- 社区驱动，对很多系统的支持都不错

在我看来，GNOME 的优秀的地方在于：

- 比 KDE Plasma 更漂亮的外观
- 也许因为貌似大部分代码由商业公司贡献，导致更加激进？
    - GNOME 50 都要去除掉 X11 只保留 Wayland 的支持了，但 KDE Plasma 貌似还没这个想法

但 GNOME 难绷的地方在于：

- 貌似基本上大部分是商业公司的开发者贡献代码
- 去除了系统托盘的支持，也许你不知道系统托盘是什么，就是 Windows 下边那个任务栏在时钟旁边的那堆应用小图标

如果你都不喜欢，可以安装一个你喜欢的窗口管理器（基于 Xorg 的有 i3，dwm 等；基于 Wayland 的有 Hyprland，sway，wayfire 等），然后那些软件和小组件都由你来自己手动安装，这样的一套桌面环境可以调整的地方会更多（也更加折腾），并且可以更符合你个人的习惯。

### KDE plasma

KDE Plasma 是相当受欢迎的 DE 了，而且一定程度上和 Win10 的桌面有些像，所以对于一些人来说可能会比较熟悉。KDE 设置提供了很多选项，可以说 KDE 可以设置的地方很多。KDE 的音频控制组件对 pipewire 的支持可能不够完善，Arch Linux 用户可以安装 pipewire-pulse 兼容层来解决，Gentoo 虽也提供此兼容层，但似乎不太稳定（后来变得可用，不清楚期间有何操作差异）。

KDE Plasma 功能全面，但外观设计可能不如其他桌面环境。

### GNOME

GNOME 默认使用 Wayland，我认为 GNOME 默认还是挺不错的，我指的是颜值。

GNOME 的分数缩放仍然是实验性功能，Fedora 41 默认启用，其他的发行版可以自行使用 `gsettings` 或者 [dconf 编辑器](https://apps.gnome.org/DconfEditor/)设置

GNOME 的 night-light 只有根据地区设置和手动修改，没有一直开启（可能除了那俩选项还有别的，但反正没有一直开启），我只能手动修改，时间设置为 0:00 ~ 23:59 这个时间段。GNOME 46 就可以通过都设置同一个时间段达到全局开启的效果了好像？我这句话的意思不是说 GNOME 46 开始可以了，是我恰好用了这个版本，发现这个版本可以。

GNOME 47 支持了可选的 Xorg 支持，Fedora 41 也是默认提供的 GNOME Wayland。

### Xfce

Xfce 这个 DE 有点就是简洁消耗小。Xfce 家族的软件都不是那么花哨，其大小也还不错，所以一些 WM 用户可能会选择安装 Xfce 家族的部分软件。你尝试装的时候就会发现 Xfce 需要装的软件真的少，所以功能也不是很多，当然核心的那些都有，没有什么问题。

KDE Plasma 和 GNOME 都默认 Waylnd 了，Xfce 还是在下个版本才默认 Wayland 还是对 Wayland 有良好的支持来着？

## WM

WM（Window Manager，窗口管理器）是比 DE 更低层的组件，通常资源消耗更低，尤其是平铺式 WM 能提供更高效的视觉体验。由于 WM 大多依赖键盘操作，有人声称使用 WM 更不易患上鼠标手。

WM 通常不包含许多组件，例如应用程序启动器、壁纸设置、窗口渲染、声音与亮度调节、polkit 前端组件等，这些都需要用户自行安装。当然，某些 WM 可能自带窗口渲染或其他功能。桌面环境通常提供自家的终端模拟器，而 WM 也可能有配套的终端（如开发 dwm 的组织也开发了 st），但不会自动安装，需要手动安装。

窗口管理器会少一些小组件：

- poklit 前端组件
  - 类似 Windows 的 UAC，只不过 Windows 弹出那个窗口要求你是否要运行的时候点击即可，这个需要你输入密码
- xdg-desktop-portal 组件
    - 用来允许应用程序互相通信用，比如选择文件，屏幕共享之类
- 电源管理 && 空闲管理
    - 空闲管理指的是用于控制过一段时间锁屏休眠的东西
- 音量 & 亮度控制等
- 状态栏


WM 我只浅谈一下 i3wm, dwm，sway 和 Hyprland

### i3wm

这是一个知名的 WM 了，基于 X11，我用的时候是在用户目录的.xinitrc 文件中写了 `exec i3` 通过 startx 命令在 tty shell 启动 i3wm。配置文件在用户目录的.config/i3 文件夹中。Kali Linux 中对 i3WM 好像有个美化看起来有些意思，我懒得装 Kali Linux 的虚拟机了，看官网 Blog 中的图片感觉还有些意思。

这里插一嘴，所以这里有个新玩法，即只让一个软件运行以求更好的性能，也是在 .xinitrc 写 `exec <program>` 然后 startx 运行。

### dwm

这是比 i3wm 消耗更低的 wm，也是我比较推荐的 wm 了，缺点就是配置文件也是需要参与到编译环节的，每次更改配置文件都得重新编译 dwm。dwm 比 i3wm 还要简洁，所以你需要补丁才行。dwm 也是基于 X11 的。这里就要所说 Gentoo Linux 了，Gentoo 的 dwm 提供了一个 USE 变量 savedconfig，这会让 Gentoo 把默认的配置文件放到一个目录中，每次你更改这个文件再 `emerge dwm` 就行，它会读取那个目录的文件参与编译。

### sway

sway 是 Wayland 版本的 i3，i3 的配置文件可以直接拿来用。

开发更加保守，NVIDIA 需要附加 `--unsupported-gpu` 选项才能使用。

sway 依赖于 wlroots 这个 compositor，很多 Wayland 的窗口管理器都使用的这位。Hyprland 0.42 之前也是使用的它，后来自己写了一个。

sway 不支持 XWayland 分数缩放，而 Hyprland 允许将 XWayland 缩放设为 0（即不跟随全局缩放），用户可单独为每个 XWayland 应用配置缩放。sway 未提供此选项。

### Hyparland

Hyprland 是基于 Wayland 做的 WM，Hyprland 戳我的点就是官网主页列的截图，真的好帅啊，当然那都不是 Hyprland 安装后就能有的样子，都需要安装其他的软件进行进一步的配置。

我尝试使用了几周，期间写的配置文件让我存放到 GitHub 仓库内了。

Hyprland 可以很好的设置环境变量，并且自带对窗口的美化。目前的最新版（0.42）移除了对 wlroots 的依赖，而是使用自己的一套。

Hyprland 的优势在于实现了 text-input-v1 协议，并支持将 XWayland 缩放设为 0（不跟随全局缩放），方便用户单独调整 XWayland 应用的缩放比例。

Hyprland 的文档中许多解决方案针对 Arch Linux 和 NixOS。
