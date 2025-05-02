---
title: "常用软件记录"
author: suo yuan
date: 2024-03-01T03:42:51Z
draft: false
categories:
  - 杂谈
tags:
  - misc
  - linux
  - intro
description: "自己常用软件的记录及点评"
---

<!--more-->
自己常用软件的记录及点评
<!--more-->

# 常用软件记录

这里会记录尝试用的软件以便于后续使用，平台上会分为 Windows，GNU/Linux和 Android，Windows 用的不多，因为和 GNU/Linux 重了的话我会在GNU/Linux 体现出来。

## Windows

[NVIDIA Broadcast](https://www.nvidia.com/en-us/geforce/broadcasting/broadcast-app/) 这个软件仅在 Windows 上可用，虽然我会给相机和麦克风开一些功能，不过目前也不太能用到说实话。

[VMware](https://www.vmware.com/) 分为 [VMware Workstation Player](https://www.vmware.com/products/workstation-player/workstation-player-evaluation.html) 和 [VMware Workstation Pro](https://www.vmware.com/products/workstation-pro/workstation-pro-evaluation.html)。前者免费使用，~~后者需要付费，虽然也可以知道体验一会的方法就是了~~ VMware Workstation Pro 现在已经免费分发了。这是一个体验不错的虚拟机平台，提供了 Windows 版本和 Linux 版本，但是我也只是在 Windows 中使用它了。

[Visual Studio](https://visualstudio.microsoft.com/) 是 Windows 上体验还不错的 IDE，就是对我来说功能有些繁杂了🫠。不过我在 Windows 上目前还不太习惯用这个 IDE，还是用 vscode 连 WSL 上的 Linux 虚拟机。

[WingetUI](https://github.com/marticliment/WingetUI) 是一个图形化的 winegt 管理软件，不过它还支持 pip，npm 什么的。不过我主要用来更新 winget 的包。

[Everything](https://www.voidtools.com/) 是一个高效地文件搜集工具，支持很多高级搜集的玩法，不过我一般都输入文件名来搜（逃

[Geek Uninstaller](https://geekuninstaller.com/) 是一个更有效的卸载软件的解决方案，可以在卸载后检索是否有残留的文件或注册表。

[LocalSend](https://github.com/localsend/localsend) 是用于局域网内互相传文件的，支持 Windows，macOS，Linux，Android 和 iOS。我没有 iOS 和 macOS的设备，所以很多时候我的需求都是 Windows 和 Android，或者是 Linux 和 Android 之间传文件，实际上这种情景可以用 [adb](https://developer.android.com/tools/adb) 来传文件，我曾经使用 Arch Linux 的时候，还是习惯于使用 `adb` 传文件的，但是在 Windows 下，我总是不习惯使用终端操作，所以会使用这个软件来传文件。

## GNU/Linux

### Browser

[FireFox](https://www.mozilla.org/en-US/firefox/browsers/) 应该大多数人用的发行版的软件库中都会有自己构建的版本，也不用从这里下载了。我一般是搭配 [Arkenfox](https://github.com/arkenfox/user.js) 项目和一些插件（如[Ublock Origin](https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/)）使用。作为一个难得非 Chromium 内核的项目，FireFox 到现在总有一种落日余晖的样子，[Mozilla 宣言](https://www.mozilla.org/zh-CN/about/manifesto/)还是说的很好的，上次看到类似的还是[网络独立宣言](https://en.wikipedia.org/wiki/A_Declaration_of_the_Independence_of_Cyberspace)。不过 FireFox 在安全性方面倒貌似一直在被吐槽的样子：比如这个关于 FireFox 和 Chromium 对比的文章：[Firefox and Chromium](https://madaidans-insecurities.github.io/firefox-chromium.html)；和 GrapheneOS 中对自己在浏览器选择的叙述：[Usage guide | GrapheneOS: Web browsing](https://grapheneos.org/usage#web-browsing)。不过在 GNU/Linux 中，Firefox 在 Wayland 桌面协议下的运行还基本正常，基于 Chromium 内核的浏览器现在默认还不是 Wayland。不过貌似 Mozilla 的工作重心已经不再是 Firefox 了？

[Brave](https://github.com/brave/brave-browser) 是基于 Chromium 内核做的浏览器，内置 Brave 自己做的 [adblock-rust](https://github.com/brave/adblock-rust)，并且还做了很多其他对增强隐私方面的改动。在[一个浏览器默认情况下的隐私保护比较](https://privacytests.org/)中可以发现 Brave 的隐私保护做的比其他浏览器要好一些。不过 Brave 也被吐槽过（比如把网站显示的别人家的广告替换成自家的，虽然这是它盈利的手段）。[Hacker News的讨论中](https://news.ycombinator.com/item?id=26332183)中有提到一些。还有就是所有基于 Chromium 内核的软件在 Wayland 上都会存在一点点问题，比如默认没有使用 Wayland，使用了的话可能窗口缩放不太对并且 Fcitx5 使用不了等。

### Develop Tools

[vscodium](https://github.com/VSCodium/vscodium) 去除了 Microsoft 加入的遥测跟踪等在他们看来不 FOSS 的东西，因此它的插件商店下载不到微软官方出的一些插件（比如 Remote-ssh 等），微软官方的 C/C++ 这个插件虽然无法从插件商店下载到，但可以手动从 [GitHub 上下载插件](https://github.com/microsoft/vscode-cpptools)，然后导入到 vscodium 中正常使用。但是 Remote-ssh 导入后是无法使用的。我使用的 [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) 替代微软官方的 cpptools，结果本地的 `clangd` 所在目录不被 vscodium 检测，我还得在设置里手动指定是 _/usr/lib/llvm/17/bin/clangd_。不过 cpptools 在我认知中还是有东西的，比如对 GDB 的支持 😇，所以如果用 `clangd` 的话可以尝试全面拥抱 clang/llvm，用 `lldb`（逃。而且 cpptools 还支持对 Doxygen 注释格式的解析，clangd 还不支持这个功能。

[Bear](https://github.com/rizsotto/Bear) 可以生成一个 `clang` 工具链解析的编译记录文件。用来让 vscode 的 `clangd` 解析并理清项目的编译依赖关系。

[strace](https://github.com/strace/strace) 可以 trace 系统调用，虽然我其实用的不多，不过偶尔还是有些用处的（比如我曾经好奇 `neofetch` 是从哪里 fetch 到这些信息的，但是我又懒得去看源代码，于是就 trace 了一下 neofetch 的系统调用，看看它 open 了哪些文件）。相应的还有 `ltrace`，`ftrace` 什么的，前者可以 trace 动态链接库函数的调用，后者 trace 的是内核函数好像。不过这俩个我就完全没用过了。

[QEMU](https://www.qemu.org/) 基本大多数使用的发行版的软件包仓库都会自带。通常会搭配 [libvirt](https://libvirt.org/) 和 [virt-manager](https://virt-manager.org/) 来使用，libvirt 可以更好的管理 QEMU，而 virt-manager 则作为libvirt 的前端供用户使用。

### Video & Music

[SMPlayer](https://www.smplayer.info/) 是 `mpv` 的前端，界面不好看，不过我播放视频的时候都全屏播放了，也就太没在意这个。

[YesPlayMusic](https://github.com/qier222/YesPlayMusic) 是一个很漂亮的网易云第三方客户端，去除了一些社区相关的功能。它集成了一些第三方音乐源，可以播放其他源的音乐。不过它使用了 Electorn，如果介意的话，可以选择使用其他的软件。

[listen1_desktop](https://github.com/listen1/listen1_desktop) 是一个那种全网综合的音乐播放器，就是界面我感觉不咋好看。

### Input Method

[fcitx5](https://github.com/fcitx/fcitx5) 是一个输入法框架。都什么年代了还在用 fcitx4，都来用 fcitx5（bushi）。fcitx5 我会搭配 [fcitx5-rime](https://github.com/fcitx/fcitx5-rime) 使用，因为我倾向于用[雾凇拼音](https://github.com/iDvel/rime-ice)。不过很多人喜欢使用 fcitx + 搜狗输入法，但是搜狗仍不支持 fcitx5。

[ibus](https://github.com/ibus/ibus) 是 GNOME 默认使用的输入法框架，目前我使用 GNOME 这个桌面环境的时候就会用 ibus，一般也是搭配 [ibus-rime](https://github.com/rime/ibus-rime) 使用，理由同上。

### Misc

[KeePassXC](https://keepassxc.org/) 是一个本地存储的密码管理器，我升级到 KDE Plasma 6 之后居然是无法正常以 Wayland 协议运行这个它，不过好像附加了 `QT_WAYLAND_FORCE_DPI=physical` 环境变量就可以？

[flatpak](https://www.flatpak.org) 是个好东西，我有一些软件就是从 flathub 上搜索有没有，然后用 flatpak 下载的（比如wemeet，linuxqq）。使用的话最好可以再下载 [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)，可以对 flatpak 上下载软件进行更加精细的权限控制。

[IntelOne Mono](https://github.com/intel/intel-one-mono) 是一个在我看来很酷的字体🤗，它用它鲜明的形体在我心中占据了很大的位置，很长一段时间，我看其他字体没有那样鲜明的花括号总感觉不是很得劲。

[gnome-tweaks](https://gitlab.gnome.org/GNOME/gnome-tweaks) 对于使用 GNOME 的我来说，真的是个好软件🥹。GNOME 自带的设置（`gnome-control-center`）并不可以分数缩放，我只能使用 `gnome-tweaks`，大多数发行版都是 `gnome-tweaks` 这个软件包名，不过有的可能前面带个 `gnome3-`。

[lsd](https://github.com/lsd-rs/lsd) 是更加 modern 的 ls 的实现，使用的 Rust 编写，在 list 的同时还可以显示图标，而且还是彩色输出，而且文件大小还会带单位输出。

### GNOME extensions

[AppIndicator and KStatusNotifierItem Support](https://extensions.gnome.org/extension/615/appindicator-support/) 实现了 GNOME 上的应用托盘，应用托盘还是有点必要的（目前在我看来是这样）。

[Blur my Shell](https://extensions.gnome.org/extension/3193/blur-my-shell/) 可以让 gnome-shell 启用模糊效果，还是有些意思的。

[Caffeine](https://extensions.gnome.org/extension/517/caffeine/) 可以让你 ban 掉你的屏保一段时间，生活中总会偶尔遇到希望长时间不要休眠，但是自身还不想老操作该电脑以防止休眠这样的情况，我自认为就是在这时候会用到。

[Extension List](https://extensions.gnome.org/extension/3088/extension-list/) 可以让你直接在屏幕右上角启用插件，或者进入插件的设置等等。

[GSConnect](https://extensions.gnome.org/extension/1319/gsconnect/) 是 GNOME 上的 KDE connect 的完全实现。

[Input Method Panel](https://extensions.gnome.org/extension/261/kimpanel/)实现了一套输入法面板，如果你和我一样在 Wayland 下的GNOME中使用着 Fcitx5 的话就可以用到这个了，而且这个装完之后，托盘的图标也跟着改了，挺不错的。

## Android

### Browser

[Mull](https://f-droid.org/packages/us.spotco.fennec_dos/) 这个浏览器基于 FireFox，不过内置了 [Arkenfox](https://github.com/arkenfox/user.js) 项目，加强了 Firefox 的隐私保护功能，搭配 [Ublock Origin](https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/) 更好一些。

[Brave](https://brave.com/) 是基于 Chromium 内核做的浏览器，内置 Adblock 还是什么拦截广告的插件，效果还不错。有些评价参见 GNU/Linux 中对 Brave 的描述。

[Bromite](https://github.com/bromite/bromite) 是基于 Chromium 内核做的，集成了广告拦截和对隐私保护做了一些改动，具体可以看这个项目的 README。

### 2FA

[Aegis](https://github.com/beemdevelopment/Aegis) 是一个 2FA 客户端，不过我也不常用双因素验证。

### Root/Xposed

[Magisk](https://github.com/topjohnwu/Magisk) 很出名了，也就不过多介绍了。

[KernelSU](https://github.com/tiann/KernelSU) 的优点在于使用GKI2内核的手机基本可以从 GitHub Release 页面上下载打好 patch 的 boot 镜像从而直接刷入，不同于 Magisk 的是，ksu 运行在内核态，貌似可以更好的隐藏自身，并且不像 Magisk 那样不打 hide 就暴露 su 给对方，ksu 是选择给特定应用权限，并且可以通过 [App Profile](https://kernelsu.org/zh_CN/guide/app-profile.html) 更加细致化权限的授予。不过 Magisk 有集成的 Zygisk 和 system-hosts，而 ksu 需要模块才能拥有对应的功能：[ZygiskNext](https://github.com/Dr-TSNG/ZygiskNext) 和 [Ownersystemless-hosts-KernelSU-module ](https://github.com/symbuzzer/systemless-hosts-KernelSU-module)。ksu 还自带一个救砖功能：[救砖](https://kernelsu.org/zh_CN/guide/rescue-from-bootloop.html)。~~不过可惜的是 ZygiskNext 项目已经停更了。~~（ZygiskNext 目前是发行闭源二进制包）

[LSPosed](https://github.com/LSPosed/LSPosed) 是一个现代化的 xposed 框架，lsp 本身也很出名了，可惜停更了。

### IM

[微信](https://weixin.qq.com/)这个B软件我是真不想用，但又不得不用。

[QQ](https://im.qq.com/index/) 这个B软件同样也不想用，但是也还是得用。

[Telegram-FOSS](https://github.com/Telegram-FOSS-Team/Telegram-FOSS) 采用了更加 FOSS 的组件构建了一个 Telegram 的客户端。这个软件可以当一个云盘用还是可以的，虽然这个B软件也很扯淡。我倒希望能用一个和个人信息无关的IM，可惜没什么人用啊，虽然可能很多人用了之后就应该会变成个人信息相关了。

### Anti-Ad

[AdAway](https://github.com/AdAway/AdAway) 是一个可以使用 root 权限下替换 hosts 文件来做到拦截广告的目的的软件，它同样有个 VPN 模式，不过我没用过，说起 VPN 模式，[RethinkDNS](https://github.com/celzero/rethink-app) 就是 VPN 模式的，看起来蛮不错，可惜我的 VPN 模式已经有软件了。adaway 的功能主要就是替换 hosts 文件，不过 hosts 文件必须写死了 URL，无法做到匹配子域名等功能，对于 anti-ad 这样的软件来说，还是很难绷的。

[blocker](https://github.com/lihenggui/blocker) 是一款操作 Android 应用程序四大组件的程序，比如一些广告，分析的服务直接可以禁掉。感觉 [Appmanager](https://github.com/MuntashirAkon/AppManager) 也能做到这一点，但是不像这位提供了规则仓库用于直接统一杀掉。

### App store

[Neo-Store](https://github.com/NeoApplications/Neo-Store) 是一个第三方的 F-Droid 客户端，它颜值上要更加好看，并且还支持后台安装。

[Aurora Store](https://f-droid.org/packages/com.aurora.store/) 是一个第三方的 Google Play 客户端，支持匿名浏览。

[Obtainium](https://github.com/ImranR98/Obtainium) 是一个使用类似 RSS 订阅的方式管理各种不同软件来源的软件。比如 GitHub，GitLab，Codeberg 等上面的 Android 软件仓库都可以跟踪管理。Neo-Store 上的软件有的和 GitHub Release 上发布新版本会隔一段时间，所以我倾向于使用 Obtainium 去跟踪开源软件的更新，除非它只能在 F-Droid 上下载。

### Video

[PipePipe](https://github.com/InfinityLoop1308/PipePipe) 可以匿名播放 Youtube/BiliBili 等网站的视频，也可以关注那些 up主，可以将 Youtube 和 BiliBili 上的视频收藏到一个收藏夹里，可以的。但无法看到动态，这导致了我不怎么太使用这个软件。

[mpv-android](https://github.com/mpv-android/mpv-android) 是使用 `libmpv` 的视频播放器，由于我在使用 GNU/Linux 发行版的时候基本都会选择使用 `mpv` 作为视频播放器的后端，所以手机 Android 上也如此了。

### Misc

[StorageRedirect](https://sr.rikka.app/zh-hans/download/)。存储空间隔离就应该被 Android 实现成为自带的功能。貌似 [GrapheneOS](https://grapheneos.org/) 的 [storage-scopes](https://grapheneos.org/usage#storage-scopes) 实现了类似的功能，可惜GrapheneOS 是给 Google Pixel 构建的，我目前还没用过 Google Pixel。

[App Ops](https://appops.rikka.app/zh-hans/download/) 是一个很精细的权限控制软件，系统软件或是用户软件的权限都可以被调控，希望也可以成为默认的隐私控制面板。

[KDE Connect](https://kdeconnect.kde.org/) 是一个手机和电脑联动的软件，从名字也能看出，这是 KDE Plasma 的东西。GNOME有个插件 [GSConnect](https://extensions.gnome.org/extension/1319/gsconnect/) 旨在实现一个 GNOME 上的 KDE connect。

### Input Method

[fcitx5-android](https://github.com/fcitx5-android/fcitx5-android) 是 Fcitx5 在 Android 上的移植。我要用的话一般搭配 RIME 插件，然后使用[雾凇拼音](https://github.com/iDvel/rime-ice)，不过这样的体验不如 PC 端的。
