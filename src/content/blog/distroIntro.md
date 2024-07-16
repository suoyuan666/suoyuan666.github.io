---
title: "面向 beginner: GNU/Linux 发行版浅评与介绍"
author: suo yuan
pubDatetime: 2023-12-01T03:42:51Z
featured: false
draft: false
tags:
  - Linux
  - intro
description: "介绍了大部分主流发行版"
---

# 面向 beginner: GNU/Linux 发行版浅评与介绍

这里我会介绍常见的几个 GNU/Linux 发行版，这里我可能会假定你对计算机领域的一些知识比较了解了。

选择 GNU/Linux 发行版很大程度上你是在选择软件包管理器，系统的更新策略。软件就在那里不会改变，OS 之间的不同很大程度上看的是使用什么软件包管理器，比如是直接装二进制软件包还是从源代码开始编译，系统的更新策略一般分成随版本的更新，比如 Ubuntu 的 LTS ( Long-term support )应该是会推送五年的安全更新，之后就要换更新的 LTS 版本了；或者滚动更新，这样会一直向前更新，也就不会有版本的概念。部分发行版会同时推出这两种半分的发行版。

这里我先简单介绍一下为什么我特地加上 GNU/Linux，这就表明了一些 de-gnu 的 Linux 发行版不会在这里（在我看来，de-gnu 也就是在系统中去掉 GNU 的软件），而且我也没用过这样的发行版。说实话，我很少看到 de-gnu 这样的字眼，GNU 对开源世界的贡献十分大，我很少会看到有人会批驳它什么，我更多的看到的是 de-google，指在移动端避免 GMS 等服务。

> There really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called “Linux” distributions are really distributions of GNU/Linux.
>
> -- https://www.gnu.org/gnu/linux-and-gnu.html

从这里看到，GNU 认为应该将以 GNU 为基础的 “Linux 发行版” 都叫成 GNU/Linux，因为 Linux 指代的应该是 Linux kernel，而非一整套系统。GNU 工具链确实是基本上所有 Linux 发行版的必备了，不过依旧存在一些一定程度上要 de-gnu 的 Linux 发行版。

这里我先说一下 GNU 为什么这么重要，**以下的部分内容是我的个人看法** 。我认为很大的原因是 GNU 的软件都很不错，而且出现的也足够早，这就是原因。在 Linux kernel 还没发布的时候，GNU 项目早就开始写了，它们的目的是要写一个完全自由的操作系统。它们先开始写一些操作系统必备的程序，比如文本编辑器，编译器等等，但当最后写操作系统内核的时候，由于想要实现一个微内核，导致调试起来很困难，从而极大的拖慢了开发进度。这个时候 Linux kernel 就已经发布出来，并且可以运行 GNU 的各种程序。

GNU 这部分十分重要，而且一定程度上没太多替代品。Linux 发行版运行必备的 [libc](https://en.wikipedia.org/wiki/C_standard_library) 基本上都在用 GNU 开发的 glibc，编译器用的是 `gcc`，一些核心程序 用的是 [GNU core utilities](https://www.gnu.org/software/coreutils/)，这些都是很难避免的，你也许可以避免 glibc ——选择使用 [musl libc](https://www.musl-libc.org/) 或者其他 libc，可以不用 gcc，选择使用 clang/llvm，不使用 GNU core utilities 而使用 [BusyBox](https://www.busybox.net/)。但很少有这么做的，一方面是 glibc 现在很全面，并且还有一些不属于 ISO C 标准的部分。

> The GNU C Library - The project provides the core libraries for the GNU system and GNU/Linux systems, as well as many other systems that use Linux as the kernel. These libraries provide critical APIs including ISO C11, POSIX.1-2008, BSD, OS-specific APIs and more. These APIs include such foundational facilities as open, read, write, malloc, printf, getaddrinfo, dlopen, pthread_create, crypt, login, exit and more.
>
> -- https://www.gnu.org/software/libc/

从 [glibc 的文档](https://sourceware.org/glibc/manual/latest/html_node/Standards-and-Portability.html) 可以看出 glibc 除了对 ISO C 标准的支持外，还包括：

- POSIX (The Portable Operating System Interface)
- Berkeley Unix
- SVID (The System V Interface Description)
- XPG (The X/Open Portability Guide)

这导致一些软件可能用到一些非标准的函数，使用 musl libc 的时候无法正常运行它们。

[Alpine Linux](https://alpinelinux.org/) 就是使用的 musl libc 替换了 glibc，用 busybox 替换了 gnu-coreutils，不过软件支持的还不是很多。

我不会介绍这种 Linux 发行版，GNU 对现在的开源社区影响深远，不是想要移除就那么简单移除的。

---

下面这些段落写于 2024 年 2 月

如果你并不是虚拟机安装 Linux 发行版的话，我认为应该还是要思考该类系统是否符合你的需求再说，当然如果你并不在意就当我没说。

现在来说，NVIDIA 显卡驱动在 Wayland 桌面协议下的使用还有一堆事情，~~你会发现 night light 不可用，屏幕色温你根本无法调节。~~ (目前已经可以调节了)。已知现在 Linux 发行版中能选择的桌面协议要么是之前的 X11，要么是 Wayland，其中 X11 是之前搞的，Wayland 是新项目旨在取代 X11，所以还需要 XWayland 去运行只支持 X11 的应用，但是这样就无法体验到 Wayland 带来的好处了（比如 Wayland 较 X11 要安全一些）。如果你用的 NVIDIA 显卡，而且如果是新卡的话大概率使用 nvidia-driver 这个 NVIDIA 官方提供的闭源驱动，~~那么 Wayland 下并不能完美的运行 XWayland 模拟的应用。~~（现在可以完美运行了）

下边这段关于 NVIDIA 的 XWayland 显示同步的内容写于 2024 年 4 月 26 日

~~NVIDIA 已经提交了 XWayland 显示同步的相关补丁，主流的桌面环境已经合并相关补丁，等到 NVIDIA 发布 560 版本的驱动应该就可用了。（貌似是 555 版本，而非 560）~~确实是 555 版本。

~~现在还不支持 HDR~~（现在有了实验性支持）。浏览器对硬件解码的支持不是很完美。关于视频硬解加速，NVIDIA 有自己的一套 NVDEC，其他显卡用另一套 VAAPI ([nvidia-vaapi-driver](https://github.com/elFarto/nvidia-vaapi-driver) 可以让 NVIDIA 的 NVDEC 以 VAAPI 解码，但只支持解码，编码尚不支持，编码的话就还是用 NVDEC 了)。FireFox 还支持了 VAAPI，但不支持 NVDEC，Chromium 内核的浏览器目前仍然处于实验状态，而且也是只支持 VAAPI，ChromiumOS 和其他 Linux 发行版的文档会有说明可以尝试添加哪些参数启用这个功能。Chromium 内核的浏览器默认还不是 Wayland。

我不好评价 GNU/Linux 玩游戏会是怎样的体验，不过 Valve 公司基于 wine 搞了一个 [Proton](<https://en.wikipedia.org/wiki/Proton_(software)>)，只要在 Steam Play 中勾选为所有应用启用 Steam Play 就可以玩那些只支持 Windows 平台的游戏了，但不好评价是否能一定起作用，Steam Deck 上搭载的系统 Steam OS 是基于 Arch Linux 做的，所以游戏方面也不至于那么难绷。有个非官方的网站 [protondb](https://www.protondb.com/)，可以在这上面搜索一下特定游戏的评价，有玩家会在上面分享这个游戏运行起来的体验如何，并且还有给出他运行这个游戏的发行版的相关信息，如果是不太好运行的游戏，也许还会分享他们是如何让这个游戏跑起来的。

国内软件的适配还不是很好，听说腾讯会议虽然支持了 Wayland，但是 Wayland 下的运行，窗口分享和摄像头都不能正常工作。QQ 虽然存在 Linux 平台的版本，但仍然有一些小问题等待修复。微信则是根本没有相应的版本，大体上办法只有两种：搞个 Windows 的虚拟机运行微信，如果是 VirtualBox 或者 VMWare 这样的虚拟机管理软件直接开剪切板共享什么的，或者原生态一点就自己装 spice 驱动也可以，但还是不太贴合正常用户日常的使用，而且一整个虚拟机的占用也是有点难绷；还有就是用 wine 去模拟 Windows 的微信，直接上来就`wine wechat.exe`这样的其实并不能完美的运行，会有很多小问题，这时候就可以参考别人的项目，但貌似还是天生存在一些小问题无法解决——wine 的微信不允许你传大于 1MB 的图片，并且小程序也用不了。

更新于 2024年3月初：wechat for linux 已经有原生的实现了，目前看来还不错，就是默认情况下只能被 UOS 还是哪几位国产操作一些小功能还是欠缺的，我一直认为对消息的回复是个很有必要的功能，但是目前我只看到了复制转发和删除，和 linuxqq 一样（悲）。

更多的可以参考我新写的一篇文章：[为什么你应该(不)使用 GNU/Linux 作为日用操作系统](../whywinorlinux/)

---

## OS

这里说的系不代表某个 OS 就是基于 Linux kernel 做的了，它可能也基于别的发行版，只不过我不知道了。下面关于发行版的截图大部分来自 Wikipedia 的图片，有一部分来自其在社交媒体上的官方账号发送的图片，当然也有几张是我自己截的。因为我自己懒得再装一遍，所以有的图片用的别人的，如果有机会装他们的发行版我就替换一下。

### Debian 系

首先介绍 Debian 系，因为如果有国内软件是被官方支持开发 Linux 版本的，那么至少会给一个 deb 包（deb 就是 Debian 系使用的软件包格式）。Debian 系使用 dpkg 作为软件包管理器。

#### Debian Linux

官网链接：https://www.debian.org/

老牌 OS 了，在我认知中比 Debian 历史更加久远的应该就是 Slackware。不过我本机没装过，虚拟机装过。我在安装 Kali Linux 的时候遇到了 no-free firmware 的问题，听别人讲貌似 Debian Linux 也会出现，不过这也是有些解决办法的，而且 firmware 这个检测是在对磁盘操作之前，不行了就不装这个系统，全身而退。Debian 听说就是稳定，其实稳定就带来了使用的不是新版本的软件，毕竟时间方面，新版本没有经历过考验。不过听说如果给 Debian 添加一个 testing 软件源就可以尝鲜新版本了。

---

2024年3月更新：

我在去年的时候在我的笔记本电脑上装 Debian 了，没有遇到 no-free firmware 的问题，安装体验还是不错的。不过我不是很喜欢选了 GNOME 后，把 GNOME 它们一些实用程序也给装上（比如视频和音乐播放器），我也许会用到，但不喜欢上来就装上。

而且我暂时没找到一个比较好的管理我在 GitHub 上下载的 deb 包的方案，遂放弃。

---

Debian 默认不安装类似 sudo 这样的执行特权命令的程序，所以需要你自己安装，然后自己写相应的配置文件。（这个我有点忘了是不是了，sudo 这样的软件是很有必要的，老生常谈的就是尽量减少攻击面之类的，直接 su 切换到 root 用户去执行*和系统相关的命令*是很危险的行为）

Debian Linux 应该是随版本更新，不过貌似 testing 软件源可以让它作为滚动更新而存在。

![Debian_12_Bookworm_GNOME_Desktop](../img/introdistro/Debian_12_Bookworm_GNOME_Desktop_English.png)

图为 Debian 12 下的 GNOME 桌面。

#### Ubuntu Linux

官网链接：https://ubuntu.com/

基于 Debian 的 OS，听说号称要做 Linux 中的 Windows，莫非它做到了独裁？我将系统启动慢，软件启动慢归结于 Ubuntu 强推自家 snap 的问题，而且 Ubuntu 是我安装系统时体验最差的操作系统了（不过我也没装过太多回 OS），启动速度慢，安装的速度也不咋地（这个可能是我自己网络的问题），而且默认安装的就是 GNOME 桌面环境，不允许安装的时候做出选择，桌面环境(DE, Desktop Environment)这个后续再谈。当然有使用不同 DE 的 Ubuntu，但得下载对应系统的镜像文件了，比如使用 KDE Plasma 的叫做 KUbuntu。这个 KUbuntu 大抵是比较适合作为一些新手（我指的是从 Windows 换到 GNU/Linux）的，因为 KDE 和 Windows 桌面的使用习惯在我看来是差不多的（甚至 KDE 有一个主题就是旨在模仿 Win11）。

再解释一下为什么认为 KUbuntu 大抵是比较适合作为一些新手，因为 Debian/Ubuntu 有着大量的用户群体，这里在我国貌似也不例外（可能是这样，我并不知道全国使用 GNU/Linux 发行版的这个具体情况，所以只能说可能是如此）。很多软件如若要有一个针对 GNU/Linux 平台的版本，那么很大概率就是 Debian/Ubuntu 了，而且一些教程如若提到了在 GNU/Linux 平台下该如何操作的话，大多至少都会假定你使用的是 Debian/Ubuntu 发行版。

![Ubuntu_22.04_LTS_Jammy_Jellyfish](../img/introdistro/Ubuntu_22.04_LTS_Jammy_Jellyfish.png)

图为 Ubuntu 22.04 LTS 版本的桌面图片，可以看到这里的 Gnome 和上面 Debian 的不太一样，Ubuntu 的 GNOME 做了他们自己的修改。

Ubuntu 认知中是随版本更新。

但我说实话，我一直不认为安装 Ubuntu 作为自己的日用操作系统是个什么好主意，因为在我看来它只有一个好的地方——对安全启动的支持还不错。如果是虚拟机安装就当我没说，虚拟机安装主要为了方便，能快点装完开始干活就好。

#### Kali Linux

官网链接：https://www.kali.org/

基于 Debian testing 源的 Kali Linux 安装界面类似 Debian 的系统安装界面，我曾经尝试给我的笔记本安装 Kali Linux，但是体验不是很好，因为我卡在了 no-free firmware，导致网络无法使用（悲），解决办法还是有的，我看 Kali 论坛上有人提出下载好对应的 firmware 再移动到系统安装盘内，不过我懒的整了。Kali Linux 是否是一个可日用的操作系统，我无法评价（因为我没试过），不过对于一些做 CyberSecurity 方面的人来说，也许 Kali Linxu 对他们的诱惑还是有的，这里我想说它对你的诱惑如果仅仅是默认自带的那些配置好的软件的话，大可不必，自己配置不会花太多时间（如果是虚拟机安装当我没说）。Kali Linux 对 DE 做了美化，我认为美化的还是不错的。有一点值得说一下，Kali Linux 不需要更换软件源的网址，大多数 GNU/Linux 发行版因为网络问题都需要更换软件源，除了国内公司搞的（比如 Deepin/UOS 或者 openKylin 之类）或者 Kali Linux、OpenSUSE Linux，其他的貌似都得换源。

如果是为了那些软件的话，有一些发行版有针对 CyberSecurity 的衍生发行版，比如 Arch Linux 有个[BlackArch](https://www.blackarch.org/)，其搞了很多相关的工具，在 Arch Linux 上加个 blackarch 源就行了。

机缘巧合之下，我安装了 Kali Linux 虚拟机，故而下边两张 Kali Linux 的桌面截图的第一张就是我截的了。

![Kali_Linux_Xfce](../img/introdistro/Kali_Linux_Xfce.png)

![VirtualBox_Kali_Linux_GNOME_44](../img/introdistro/VirtualBox_Kali_Linux_GNOME_44.png)

第一张图片是 Xfce 桌面，第二张是 GNOME 桌面，这里没有太表现出来 Kali Linux 中对各家 DE 的美化。不过能看出来 Terminal 中对 Shell 的美化。

你可以和 Debian 的那张图片对比一下就可以发现不同之处。Debian 那个使用的是 bash 并且没有看出有什么美化，尤其是 PS1 变量（就是**debian@debian**那个东西）就是默认的设置，但是 Kali Linux 默认除了 bash 之外还安装了 zsh 并且将 zsh 作为其默认的 shell。并且它对 zsh 做了一些配置，比如那个**kali@kali**，zsh 默认并不是这样的，这是 Kali Linux 自己的配置，而且默认还有对历史命令的猜测和对你输入的命令颜色上的美化，这是靠两个 zsh 的插件实现的。

插件[zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)

插件[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)

写到这里突然发现我无法真正确定 Kali Linux 上的 zsh 是通过这两个插件得到的这个效果，但是这俩插件很受欢迎，大多数发行版对都是默认不装 zsh 的，所以你装 zsh，网上的美化教程大多都会提到装上这两个插件。

我本身是 bash 作为 shell 环境，也懒得整 zsh，我就贴一个 fish shell 官网的截图，zsh 这两个插件就是旨在还原 fish shell 的效果

![fish_shell](../img/introdistro/fish_autosuggestions.png)

可以看到 ssh 后面是灰色的，这就是对历史命令的读取，只需要一个右键就可以直接根据这条历史命令补全当前输入的命令，并且 cat 和 ssh 之类的都有颜色，这是语法高亮，那两个插件就是还原这个效果。

Kali Linux 我记得是滚动更新。

#### Deepin

官网链接：https://www.deepin.org/

Deepin 操作系统作为我国国产的操作系统，我自然是要体验一番的（虽然只使用了一天左右吧），V20.x 都是基于 Debian 的，截止目前，Deepin 的 V23 还没有发布 stable 版本，V23 开始就要自己做包管理器，也就是不再基于任何 GNU/Linux 操作系统。Deepin 操作系统是我比较推荐新手使用的，不过我自己没使用过太久，所以可能这个 OS 没有我想象中那么新手友好。作为一款国产的操作系统，一些没有推出 Linux 版本的国内软件它有自带的解决方案（虽然我没记错的话，应该是用 wine 模拟的，wine 是一个类 Unix 平台中运行 exe 程序的解决方案），Deepin 自带的软件商店可以点击一下就安装了，还是比较方便的。Deepin 默认使用自家的 DE——DDE,这个 DE 我自认为不咋好看。

> Wine 通过提供一个兼容层来将 Windows 的系统调用转换成与 POSIX 标准的系统调用。它还提供了 Windows 系统运行库的替代品和一些系统组件（像 Internet Explorer，注册表，Windows Installer）的替代品

上面这段摘自[维基百科对 wine 的介绍](https://zh.wikipedia.org/wiki/Wine)。

目前使用 Deepin 这类国内公司发行的 GNU/Linux 发行版应该还有一个好处 —— Linux 版本的微信目前只支持这些发行版。

![Deepin_with_20.9](../img/introdistro/DEEPIN_DDE_20_9.jpg)

Deepin 应该是随版本更新。

### RedHat 系

这个名字也不知道对不对。Redhat 使用的大概是 rpm 包管理器。

#### Fedora

官网链接：https://fedoraproject.org/

Fedora Linux 我没有本机安装过，不知道怎么样。作为一个商业公司的产品，软件版本比较新但没有特别新，比起 Arch Linux 自然旧了一些，总体来说还是挺新的。Fedora Linux 我也说不出来啥，主要在于，除非 Fedora 有个 Fedora-zh 软件源我没发现，那么国内软件对其支持不好这一点将会是部分用户尝试 Fedora Linux 的绊脚石（我认为，因为这曾经绊住了我），不过可能用 flatpak 应该是可以解决这个问题，flatpak 就是一个容器化的包管理器，其中的 flathub 作为 flatpak 的软件仓库存在一些国内软件。

---

23 年 12 月更新：

我尝试真机安装了 Fedora 39，体验还可以，flatpak 确实可以解决问题。我第一次安装 nvidia-driver-535 可以那么完美的运行（当然我说的是在 Xorg 下）。Fedora 默认就装上了 flatpak，还安装了 libreoffice。

---

![Fedora_Workstation_39_Desktop](../img/introdistro/Fedora_Workstation_38_Desktop.png)

这里可以发现和 Debian 差不多，Kali Linux 那张没有体现出其对 GNOME 的主题美化。三家的 GNOME 都差不多，因为版本没有差出那么多，三家发行版其软件仓库中的软件版本可能不同，但仅局限于此。

Fedora 39 搭载的是 GNOME 45，Terminal 用的是 gnome-terminal，我认为还是不错的，gnome-console 这个 Terminal 可设置选项太少了（泪目）

Fedora 默认会开 lzo 算法的 zram，我不理解作为一个较为激进的发行版为什么不选择 zstd 算法来压缩。

Fedora Linux 是随版本更新。

### Arch 系

Arch 系使用 pacman 作为软件包管理器。不过 Arch Linux 提供了[AUR，Arch User Reposiory](https://aur.archlinux.org/)，这是一个用户软件仓库，提供了 Arch Linux 官方仓库没有的软件，比如 linuxqq，一些国产软件都在 AUR 里可以找到，不过 AUR 不过是一个构建软件的脚本，对应软件得在 AUR 的 PKGBUILD 中写好的网址去拿对应的包。如果是国内软件安装还好说，其他的比如有些从 GitHub 拿的就得配置好网络了。Arch 有个 archlinuxcn 软件仓库，有一些额外的软件可以直接安装，中科大有 archlinuxcn 的软件源。 AUR 应该是 GNU/Linux 平台中软件包数量很多的平台了，能超过它的可能只有 NixOS 的（在我的认知中）。

#### Arch Linux

官网链接：https://archlinux.org/

Arch Linux 我只用了五个月左右就换成 Gentoo Linux 了，时间不长，我也不清楚滚动更新带来的滚挂能不能出现，反正我没遇到过，不过这个问题讨论之前应该定义一下什么是滚挂，之前我有过一回在登陆管理器登进去就黑屏，后来看到了错误日志发现貌似是 nouveau 的问题，我在 kernel 启动参数禁用 nouveau 就好了。这种算不算挂，应该不算吧。不过可以尝试安装 TimeShift 定时做快照给自己一个心理安慰，我当时整来着，就是快照就没有用过。

Arch Linux 是我推荐在 Deepin 待过一会就尝试的操作系统，虽然这个系统需要使用命令来安装，没有安装界面，所以可能有些困难，不过[Arch Wiki](https://wiki.archlinux.org/title/Main_page)写的还是不错的，可以结合着别人的安装指南来看，wiki 和指南一起看，虚拟机尝试一手，就差不多了。这样的命令安装也许能让你对你的操作系统更有一个掌握的感觉（自认为）。

而且我认为有一个 Arch Linux 的启动盘是有必要的，因为这样能一定程度上解决一些你需要进入系统才能解决的类似无法进入系统的问题。

![KDE5](../img/introdistro/KDE_5.png)

这里放一个 KDE Plasma 桌面的截图，之后也就不放截图了，因为后续的发行版没有对桌面环境有什么太出彩的美化，这里放截图纯属因为还没放过 KDE Plasma 的截图（）。

很多软件在 AUR 上都有对应的 BUILD 脚本，这一块的生态是我选择 Arch Linux 的一个很重要的原因（

Arch Linux 是滚动更新。

#### Manjaro Linux

官网链接：https://manjaro.org

Manjaro 是基于 Arch Linux 做的 OS，比 Arch 仓库的软件推送慢了两周还是多长时间来着，旨在提供比 Arch 更稳定的软件（这个是听说）。Manjaro 的优势或许就在于它有一个安装界面，可以点点点就开始安装了，不需要输入命令。我看到过一个吐槽 Manjaro Linux 的，认为这降低了 Arch Linux 的门槛，反而让一些因此才使用的用户无法应对使用中可能遇到的问题。当然我并不认为这会有大不了的（）。我曾经在某年冬天就抱着要装 Manjaro 双系统的想法，当然后来我是 Arch Linux 单系统（逃）。

Manjaro Linux 是滚动更新。

### OpenSUSE 系

说是系，我目前还不知道哪个系统是基于 OpenSUSE 做的。OpenSUSE 使用 zypper 作为软件包管理器。

#### OpenSUSE Linux

官网链接：https://www.opensuse.org/

OpenSUSE Linux 提供了滚动更新和版本更新两种更新方式，这对应它两个版本。有个类似 AUR 的用户软件仓库 OBS，不过我不是很了解 OBS，也不再多说什么了。OpenSUSE Linux 有别的 OS 都没有的 Yast 客户端，这个 GUI 软件可以完成很多特权操作，比如安装软件啥的（我没有太试过 OpenSUSE,我也没有太用过 Yast）。而且 OpenSUSE 的软件源网址貌似可以自动给你选一个近的软件源去下载软件，可以让你使用官方源的时候也保持着还不错的速度。

就像上一段开头说的那样，OpenSUSE Linux 提供了滚动更新和依版本更新两种方式，分别是 OpenSUSE Tumbleweed 和 OpenSUSE Leap。

### Gentoo 系

Gentoo 系使用 emerge 软件包管理器，软件大多都是从源码开始安装。部分大型软件提供了二进制软件包版本。

#### Gentoo Linux

官网链接：https://www.gentoo.org

Gentoo Linux 的软件版本相较于 Arch Linux 没有那么新，而且对国内用户的支持没有那么友好，只有 gentoo 官方源才有镜像源，官方网站上还只有三个，实际上不止有三个，我比较推荐不在那三个之列的中科大源。~~Gentoo 官方软件仓库没有 fcitx5（如果你不知道 fcitx5 是什么，我会在 DE 介绍那里说一下），要用的话推荐添加 gentoo-zh 软件仓库安装 fcitx5~~（现在 Gentoo Linux 的官方软件仓库已经有 fcitx5 及其周边软件了），其他一些国内软件 gentoo-zh 仓库也有收录，由于这个仓库是在 GitHub 上的，所以需要解决了网络问题才能同步最新 gentoo-zh 的软件信息。

Gentoo Linux 的安装并不完全依赖于它的安装介质，比如我是使用 Arch Linux 的系统安装盘去装的 Gentoo。

emerge 的优点在于提供了 USE 变量，它允许用户自己决定软件的功能支持以确定依赖关系。Arch Linux 可能可以认为是可以定制你的系统，Gentoo Linux 就是可以定制你的软件。

> USE 是 Gentoo 为用户提供的最具威力的变量之一。很多程序通过它可以选择编译或者不编译某些可选的支持。例如，一些程序可以在编译时加入对 GTK+或是对 Qt 的支持。其它的程序可以在编译时加入或不加入对于 SLL 的支持。有些程序甚至可以在编译时加入对 framebuffer 的支持（svgalib）以取代 X11（X 服务器）。
>
> 大多数的发行版会使用尽可能多的支持特性编译它们的软件包，这既增加了软件的大小也减慢了启动时间，而这些还没有算上可能会涉及到的大量依赖性问题。Gentoo 可以让你自己定义软件编译的选项，而这正是 USE 要做的事。、
>
> 在 USE 变量里你可以定义关键字，它被用来对应相应的编译选项。例如，ssl 将会把 SSL 支持编译到程序中以支持它。-X 会移除其对于 X 服务器的支持（注意前面的减号）。gnome gtk -kde -qt5 将会以支持 GNOME（和 GTK+）但不支持 KDE（和 Qt）的方式编译软件，使系统为 GNOME 做完全调整（如果架构支持）。

摘自 [Gentoo amd64 安装手册](https://wiki.gentoo.org/wiki/Handbook:AMD64/Full/Installation/zh-cn#.E9.85.8D.E7.BD.AE_USE_.E5.8F.98.E9.87.8F)

当然还有很多变量，比如 CFLAGS, L10N, VIDEO_CARDS 这些，可以指定编译选项，本地语言和显卡设备

Gentoo Linux 的 USE 变量是一把双刃剑，完全靠用户自己。比如我曾经以为我只需要安装一个小软件，结果它的依赖还是它（我没细看）需要编译器的的几个 USE 变量也开启才行，结果我就还得把编译器以及依赖都编译一遍 😇。当然如果你都配置好了，日常使用的体验还是可以的。

Gentoo Linux 这种源代码发行的系统，优势在于软件都是自己的机器编译安装，你可以自定义 CFLAGS，从隐私或安全角度来说都还不错，就是我的机器性能没那么强劲（哭

Gentoo Linux 是少数可以让你选择非 systemd 作为系统 init 系统的 Linux 发行版，但在这个世界，使用非 systemd 作为自己桌面操作系统的 init 系统就像用 linux-libre 作为自己的系统内核一样难绷。

Gentoo Linux 是滚动更新。

### Nix 系

Nix 系使用的是 Nix 作为包管理器，这是一个[是一个纯函数式包管理器，旨在使软件包管理可靠且可重现](https://wiki.archlinuxcn.org/wiki/Nix)。特点在于不遵守 FHS 标准，每个软件的每个版本都有一个独特的哈希值标明，并且通过符号链接的方式自由选择某些软件的某个版本作为当前使用版本，所以可以避免所谓依赖地狱这样的问题。Nix 系大抵只有 NixOS 吧，有个和 Nix 包管理器差不多的叫作[GNU Guix](https://en.wikipedia.org/wiki/GNU_Guix)，基于这个包管理器也有一个 OS，就是 Guix OS。

FHS (Filesystem Hierarchy Standard)标准规定了文件系统中每个部分的大致用途和名称，比如/etc 存放配置文件，/bin 存放可执行文件，/lib 存放可执行文件使用的链接库。

依赖地狱(Dependency hell)这个问题我自身没遇到过，这个问题虽然有多种表现形式，但是我认为大体上你最多可能看到其中的一种情况——你安装了软件 A，其依赖于软件 B 3.2 版本，之后你又想安装软件 C，但是它依赖于软件 B >= 3.4 版本，这时候版本之间就发生了冲突。

其实软件包管理器一定程度上解决了依赖地狱的一些问题，当然有的软件包管理器貌似没有版本的概念，也就没有刚刚我说的这个问题的存在。

Nix 靠将每个软件包都安装在`/nix/store`文件夹中并附上一个唯一的哈希值作为标记，保证了软件包依赖的独立性，不同软件的相同的依赖会因为这个哈希值而被标识为是对方的依赖，从而解决了依赖地狱的问题。当然，这样的方式也造成了磁盘空间的占用。Nix 存在着大量的软链接，其通过链接的方式做到指定当前环境的每个软件的版本是多少。

#### NixOS

官网链接：https://nixos.org/

NixOS 提供两种安装方式——图形化安装和手动安装。图形化安装就像 Fedora 这样的发行版一样提供一个带 DE 的 LiveCD 环境，不过这种安装受到我国网络环境的限制，不过都有 DE 了，是否在设置里设定一下代理，或者像 clash 这样的代理工具开 tun 模式可以完成下载软件的步骤 🤔。反正我是手动安装的。该系统的特点是大部分的配置可以写在`/etc/nixos/configuration.nix`中，比如对软件，services，用户的管理等等。在安装软件的时候可能涉及到从诸如 GitHub 之类的网站下载补丁或者源码，所以做好网络环境的配置是必要的。

但是安装软件的是否可能涉及到从 GitHub 之类的网站下载东西，或者如果你使用 NUR 的话（我不清楚 NUR 是否有国内源），NUR 仓库在 GitHub 上，所以你需要配置好网络环境才行。

之后我发现，Nix 这种特性在我安装交叉编译链的时候有那么一点点不友好，我难以忍受我需要为了 riscv 结构的 qemu 装那么多软件（逃）。当然 NixOS 有很多有意思的 feature，所以可能存在一个更加好的方式去安装交叉编译链，只不过我不知道了。

NixOS 不遵守 FHS 标准，所以正常的 chroot 也不好进去，使用它们自己提供的程序即可，我记得是叫做`nix-enter`。

NixOS 的 flakes 和 home-manager 结合可以更好的声明你的系统配置，很多东西都可以用这些声明文件自动生成。但是现在的问题是文档质量不足，太多的东西都需要直接看 nixpkgs 中的源代码，虽然现在有[NixOS Search](https://search.nixos.org/options)和[MyNixOS](https://mynixos.com/)可以搜索相关的部分细节，但也不是很够。如果要全面的了解还是需要去看源码是怎么写的。

---

只要你不是安装那种不能选择 DE 的发行版，那么选择一个 DE 就是你不得不做的一件事。

---

## DE

> 桌面环境将各种组件捆绑在一起，以提供常见的图形用户界面元素，如图标、工具栏、壁纸和桌面小部件。此外，大多数桌面环境包括一套集成的应用程序和实用程序。最重要的是，桌面环境提供了他们自己的窗口管理器，然而通常可以用另一个兼容的窗口管理器来代替。

桌面环境我只浅谈一下 KDE Plasma, GNOME 和 Xfce。我在下面谈到了对 Wayland 的支持问题，如果你是 NVIDIA 独显驱动用户的话，GNOME 是禁用 Wayland 的，KDE plasma 不禁用。

如果你要使用 Wayland，输入法框架方面就不能选择 fcitx，只能选择 fcitx5 了。~~ibus 我没用过，不知道怎么样。我一直是 fcitx5 用户（逃）~~ ibus 直接装就是支持 Wayland 的。我引入了输入法框架这个名词，但是没有太多解释，我这里就放一个 [Arch zhWiki 中输入法条目的链接](https://wiki.archlinuxcn.org/wiki/%E8%BE%93%E5%85%A5%E6%B3%95)。

当然，各家 DE 都是有美化的空间的，具体你可以去搜一搜相关的美化教程，我本人是懒得做这些事情，所以也就没什么好说的了。

一个桌面环境（DE）一般包括一个窗口管理器（WM）还有一堆相关的软件：文件管理，查看图片视频音频等，设置，文本编辑；还会有一些小组件：poklit 前端组件（我认为这类似 Windows 的那个 UAC，只不过 Windows 弹出那个窗口要求你是否要运行的时候点击即可，这个需要你输入密码），xdg-desktop-portal 组件（这是用来允许应用程序互相通信用的，比如选择文件，屏幕共享之类的），电源管理组件（这个我不知道是不是所有 DE 都会有，反正主流的桌面环境一般都会有），还有一些我一时间也想不起来了。

在我看来，KDE Plasma 优秀的地方在于：

- 家族有很多软件，并且其中存在很多有用的软件。
- 设置里存在很多可设置选项，可以调控的地方有很多很多很多
- 社区驱动，对很多系统的支持都不错

在我看来，GNOME 的优秀的地方在于：

- 比 KDE Plasma 更漂亮的外观
- 对 Wayland 的支持优于 Plasma（不过 Plasma 现在出到 6 了，我还没用过 Plasma6，不知道目前二者差距如何）
- 也许因为貌似大部分代码由商业公司贡献，导致更加激进？RedHat 甚至发起过提案要让 GNOME 只使用 Wayland，RedHat 开发的 Fedora 在 Fedora 42 版本（目前正在开发中）貌似就要这么做了。

但 GNOME 难绷的地方在于：

- 只支持 text-input-v3（Wayland 输入法协议第 3 版）导致我的中文输入法在 Electorn 应用上会无效（如果使用 Wayland 的话）
- 貌似基本上大部分是商业公司的开发者贡献代码
- 去除了系统托盘的支持，也许你不知道系统托盘是什么，就是 Windows 下边那个任务栏在时钟旁边的那堆应用小图标。

如果你都不喜欢，可以安装一个你喜欢的窗口管理器（基于 Xorg 的有 i3，dwm 等；基于 Wayland 的有 Hyprland，sway 等），然后那些软件和小组件都由你来自己手动安装，这样的一套桌面环境可以调整的地方会更多（也更加折腾），并且可以更符合你个人的习惯。

### KDE plasma

KDE Plasma 是相当受欢迎的 DE 了，而且一定程度上和 Win10 的桌面有些像，所以对于一些人来说可能会比较熟悉。KDE 设置提供了很多选项，可以说 KDE 可以设置的地方很多。KDE 的音频控制组件貌似不是很支持 pipewire，我知道的是 Arch Linux 用户可以安装 pipewire-pulse 兼容层解决这个问题，Gentoo 虽然也有这个，但貌似不是很好使的样子（后来好使了，不清楚我这两回之间有什么操作上的差异）。KDE 自带一些监控硬件参数的状态栏组件还是比较不错的，Xfce 也有类似的，GNOME 就没有这东西了（GNOME 也有 SystemMonitor 提供这个功能，但无法在状态栏上显示）。甚至 GNOME 默认是没有系统托盘的，这个还需要安装相应的插件来实现。

KDE Plasma 目前貌似还存在一个问题—— Wayland 下的部分应用无法正确显示图标，而是显示一个 Wayland 默认图标。这个问题不清楚在 Plasma 6 中是否还存在。

KDE Plasma 支持 Wayland 输入法协议第一版，这使得用户基本不会在 Wayland 会话中遇到中文输入法不好使的情况。这里我说的是 Electorn 的应用，Chromium 可以通过 `--gtk-version=4` 开启对 Wayland 输入法协议第三版的支持（这是我的理解）可以在 GNOME 下使用中文输入法（GNOME 只支持第三版的协议），但 Electorn 仍不支持 gtk4，导致在 GNOME 下无法切换到中文输入法。

---

2024年4月更新：

我安装了 KDE Plasma6，对 Wayland 的支持要优于 Plasma5，并且不显示应用图标而显示 Waylnad 默认图标的问题也不会出现了

---

我认为 KDE Plasma 什么都不错，就是颜值差了些。

### GNOME

GNOME 默认使用 Wayland，当然如果检测到机器使用 NVIDIA 独显驱动，那就不会用 Wayland 了。我认为 GNOME 默认还是挺不错的，我指的是颜值。

Electron 和 Chromium 不同的是，你未必能够解决无法输入中文这个问题（在 Wayland 中），你可以通过传递 flag 的方式用以 Wayland 启动软件，但由于 Electron 目前还不支持 gtk4 导致无法在 GNOME 桌面环境中输入中文（如果用 Wayland 的话）。

有的发行版的 GDM 是不可以和 NVIDIA 闭源驱动搭配正常工作的。我说的就是 NixOS 的 gdm，我在使用 GNOME 的时候使用的 lightdm 起的 gnome，但 gdm 和 gnome 是一套的，所以我猜测 GNOME 下 `Win + L` 不可以锁屏是因为 dm 不是 gdm 的原因？dm 是用来从 tty shell 上启动到桌面环境的图形化界面。

GDM 貌似就是检测到是 NVIDIA 驱动就不启动 Wayland 会话，但应该是你给 NVIDIA 驱动用什么“DRM 内核级显示模式”启动的话就可以上 Wayland 了。（不好评价真假，因为我忘了）

有一点我认为比较难绷的是，GNOME 的设置里没有分数缩放这个功能，屏幕的缩放只能是整数的，只能在*优化*这个软件（软件包名应该叫 gnome-tweaks，有的发行版可能有个 gnome3-前缀）。我不好评价 gnome-tweaks 那里的那个选项该不该认为是分数缩放，但反正，差不多吧。

GNOME 的 night-light 只有根据地区设置和手动修改，没有一直开启（可能除了那俩选项还有别的，但反正没有一直开启），我只能手动修改，时间设置为 0:00 ~ 23:59 这个时间段

这句话写于 23年10月18日：Redhat 试图让 GNOEME 之后至支持 Wayland，不知道什么时候能实现，当然 Wayland 被认为是下一代的桌面协议，应该是得替换掉 Xorg 的，性能上不清楚，安全性上好像是会好一些，而且 Wayland 好像原生支持分数缩放，Xorg 还不支持这个，桌面环境的分数缩放都是自己的功能？

### Xfce

Xfce 这个 DE 有点就是简洁消耗小。Xfce 家族的软件都不是那么花哨，其大小也还不错，所以一些 WM 用户可能会选择安装 Xfce 家族的部分软件。你尝试装的时候就会发现 Xfce 需要装的软件真的少，所以功能也不是很多，当然核心的那些都有，没有什么问题。KDE Plasma 和 GNOME 都默认 Waylnd 了，Xfce 还是在下个版本才默认 Wayland 还是对 Wayland 有良好的支持来着？

## WM

WM（WIndow Manager,窗口管理器）是比 DE 更低级的东西，一般可以带来更低的消耗，尤其是平铺式的 WM 可以带来更好的视觉体验。由于 WM 大多数时候都是需要键盘就行，我还听到一个言论就是使用 WM 更不容易得鼠标手（）。

WM 不会自带很多东西，比如应用程度启动器，壁纸，窗口渲染，声音和亮度调节，polkit 前端组件等等，这些都需要你去自己装上，当然有的 WM 可能会自带窗口渲染或是其他什么的。那些 DE 也都有自家的 Terminal，虽然 WM 也可能自家有 Terminal（比如开发 dwm 的组织也开发了 st Terminal）不过不会自动安装，这个也需要自己装上。

WM 我只浅谈一下 i3wm, dwm 和 Hyprland。

### i3wm

这是一个知名的 WM 了，基于 X11，我用的时候是在用户目录的.xinitrc 文件中写了`exec i3`通过 startx 命令在 tty shell 启动 i3wm。配置文件在用户目录的.config/i3 文件夹中。Kali Linux 中对 i3WM 好像有个美化看起来有些意思，我懒得装 Kali Linux 的虚拟机了，看官网 Blog 中的图片感觉还有些意思。

这里插一嘴，所以这里有个新玩法，即只让一个软件运行以求更好的性能，也是在.xinitrc 写`exec <program>`然后 startx 运行。

### dwm

这是比 i3wm 消耗更低的 wm,也是我比较推荐的 wm 了，缺点就是配置文件也是需要参与到编译环节的，每次更改配置文件都得重新编译 dwm。dwm 比 i3wm 还要简洁，所以你需要补丁才行。dwm 也是基于 X11 的。这里就要所说 Gentoo Linux 了，Gentoo 的 dwm 提供了一个 USE 变量 savedconfig，这会让 Gentoo 把默认的配置文件放到一个目录中，每次你更改这个文件再`emerge dwm`就行，它会读取那个目录的文件参与编译。

### Hyparland

Hyprland 是基于 Wayland 做的 WM，官网对 NVIDIA 独显驱动用户的使用列了一个非官方的解决方案。不过我选择使用 Intel 核显体验一手，当时 Hyprland 戳我的点就是官网主页列的截图。

![Hyprland](../img/introdistro/hyprland.png)

真的好帅啊，当然 Hyparland 默认不是这样的，你需要安装其他的软件进行进一步的配置。

我尝试使用了几周，期间写的配置文件让我存放到 GitHub 仓库内了。
