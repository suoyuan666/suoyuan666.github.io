---
title: "Gentoo Linux 安全加固指南"
author: suo yuan
date: 2025-01-07T10:00:36Z
lastmod: 2025-01-28T01:11:53Z
draft: false
categories:
  - Linux_杂谈
tags:
  - gentoo-linux
  - linux
description: "我本次安装 Gentoo Linux 所做的一些安全加固手段"
summary: "我本次安装 Gentoo Linux 所做的一些安全加固手段"
---

# Gentoo Linux 安全加固指南

> - 2025 年 1 月 8/9/10 号修改
>   - 添加了 VSCodium 的 bwrap 启动参数
>   - 修改了 sysctl 和内核启动参数部分
>   - 添加了 Chromium 的 bwrap 启动参数
>   - 添加了 NetworkManager 部分
> - 2025 年 1 月 13 号修改
>   - 修改了bwrap 中 FireFox 部分，让它可以响应 `xdg-open`
>   - 添加了禁止核心转储 (core dump) 的段落
>   - 添加了面向安全的编译选项部分
> - 2025 年 1 月 19 号修改
>   - 添加了 NetworkManager 下开启 IPV6 隐私扩展的描述
>   - 修改了 编译选项 的部分
> - 2025 年 1 月 27/28 号修改
>   - 在 sysctl 和内核参数部分添加了更多的解释
>   - 修改了文章中部分语句不通，不好理解的地方

我一直在寻求一个尽可能不影响日常使用的同时尽量做到安全的操作系统。

单论安全性，我认为 [Qubes OS](https://www.qubes-os.org/) 很不错，但是网络配置看起来不是很容易，并且社区貌似不是很大。

Fedora Silverblue 也是个不错的选择，原子更新，桌面应用大多是从 Flatpak 安装，不过我对 Fedora 官方软件仓库没有我想要的软件这一情况一直有些介意，虽然有 COPR 源，但我不是特别想用。

NixOS 也是个选择，同样是不可变发行版，nixpkg 提供了很多软件包，包括 linux-hardened、hardened-malloc 等，NixOS 官方有一套 security profile，不过我还没尝试，印象中是使用了 linux-hardened 内核，启用了一些安全相关的 sysctl 设置，将内存分配器改成 scudo（好像还启用了 AppArmor？）

我目前认为 Gentoo Linux 是一个不错的选择，但由于 Gentoo Linux 编译真的很费时间，所以我放假回来才开始尝试一些我以前想过但没尝试的功能。

## 硬盘加密

我现在认为硬盘加密是一个必须的选择。我选择了 Luks2 的 argon2id 算法，这导致我需要使用 systemd-boot，GRUB 对 Luks2 的支持有限。

在硬盘分区时，根据 [Rootfs_encryption](https://wiki.gentoo.org/wiki/Rootfs_encryption)，直接执行：

```bash
$ cryptsetup --type luks2 --cipher aes-xts-plain64 --hash sha512 --iter-time 5000 --key-size 256 --pbkdf argon2id --use-urandom --verify-passphrase luksFormat /dev/block
```

如何你想使用 GRUB 作为 bootloader（比如你有引导 windows 启动项的需求等），那就不能使用 luks2，应该选择用 luks 的算法。

```bash
$ cryptsetup luksOpen /dev/block root
$ mkfs.xfs -L rootfs /dev/mapper/root
$ mount --label rootfs /mnt/gentoo
```

这样就可以将其格式化成 XFS 文件系统了，我没有使用 SWAP 分区，我选择了使用 ZRAM 做交换分区，不过加密的 SWAP 倒也是个选择，只是我没这么做。

之后你需要附加相关命令行参数用于解锁：

```bash
$ lsblk -o name,uuid

NAME        UUID
sdb                                           
├─nvme0n1p1 BDF2-0139
├─nvme0n1p2 b0e86bef-30f8-4e3b-ae35-3fa2c6ae705b
└─nvme0n1p3 4bb45bd6-9ed9-44b3-b547-b411079f043b
  └─root    cb070f9e-da0e-4bc5-825c-b01bb2707704
```

假设输出是上面这样，那么应该在 **/etc/dracut.conf.d/luks.conf** 下写入：

```txt
kernel_cmdline+=" root=UUID=cb070f9e-da0e-4bc5-825c-b01bb2707704 rd.luks.uuid=4bb45bd6-9ed9-44b3-b547-b411079f043b "
```

## 安全启动

安全启动是个耳熟能详的名词，我在刚接触到给自己的笔记本电脑安装 GNU/Linux 发行版的教程的时候，一般都会说明首先要在 BIOS 中关闭快速启动和安全启动，部分社区支持的发行版无法在开启安全启动的情况下安装（不过可以安装时/后开启安全启动的支持），商业公司支持的（如 Fedora，OpenSUSE，Deepin 等）发行版应该是都可以直接启动安装。

安全启动是 UEFI 下才有的安全验证机制，旨在确保引导的操作系统是可信的。

只需要在安装的过程中对照着手册，看到安全启动的部分就跟着手册来就行。

这里有一点，Shim 被硬编码为使用 grubx64.efi，但是由于我使用的 systemd-boot 作为 bootloader，没有 grubx64.efi，所以我选择了将 systemd-bootx64.efi 复制一个 grubx64.efi 出来。

```bash
$ cp /efi/EFI/systemd/systemd-bootx64.efi /efi/EFI/systemd/grubx64.efi
```

## bwrap

沙盒程序就这两位我还算熟悉，[Firejail](https://github.com/netblue30/firejail) 和 [Bubblewrap](https://github.com/containers/bubblewrap)。前者有令人诟病的 setuid 安全隐患，后者没有 Firejail 那样有社区提供好的沙盒模板（即部分应用可以运行一个命令直接获得沙盒化，如 git，firefox 等）

我选择了 Bubblewrap（也就是标题中的 bwrap），目前只用到了浏览器和我的代码编辑器上，我目前的目标是，让使用的图形化软件基本都套一层 bwrap（除了终端模拟器）

对于到底应该 `--ro-bind` 什么文件，可以用 `strace -e openat` 看一下该程序到底尝试打开什么文件，然后决定到底要不要映射过去

### FireFox

```bash
bwrap \
   --new-session \
   --symlink /usr/lib64 /lib64 \
   --ro-bind /usr/lib /usr/lib \
   --ro-bind /usr/lib64 /usr/lib64 \
   --ro-bind /usr/bin /usr/bin \
   --bind "$XDG_RUNTIME_DIR" "$XDG_RUNTIME_DIR" \
    xdg-dbus-proxy \
    unix:path=/var/run/user/$UID/bus \
    /run/user/$UID/.dbus-proxy/session-bus-proxy-6271 \
    --filter \
    --own="org.mpris.MediaPlayer2.firefox.*" \
    --own="org.mozilla.firefox.*" \
    --own="org.mozilla.firefox_beta.*" &

bwrap \
  --symlink usr/lib /lib \
  --symlink usr/lib64 /lib64 \
  --symlink usr/bin /bin \
  --symlink usr/bin /sbin \
  --ro-bind /usr/lib /usr/lib \
  --ro-bind /usr/lib64 /usr/lib64 \
  --ro-bind /usr/bin /usr/bin \
  --ro-bind /opt/bin /opt/bin \
  --ro-bind /usr/share/applications /usr/share/applications \
  --ro-bind /usr/share/gtk-3.0 /usr/share/gtk-3.0 \
  --ro-bind /usr/share/icu /usr/share/icu \
  --ro-bind /usr/share/drirc.d /usr/share/drirc.d \
  --ro-bind /usr/share/fonts /usr/share/fonts \
  --ro-bind /usr/share/glib-2.0 /usr/share/glib-2.0 \
  --ro-bind /usr/share/glvnd /usr/share/glvnd \
  --ro-bind /usr/share/icons /usr/share/icons \
  --ro-bind /usr/share/mime /usr/share/mime \
  --ro-bind /usr/share/X11/xkb /usr/share/X11/xkb \
  --ro-bind /usr/share/icons /usr/share/icons \
  --ro-bind /usr/share/mime /usr/share/mime \
  --ro-bind /usr/share/vulkan /usr/share/vulkan \
  --ro-bind /usr/share/egl /usr/share/egl \
  --ro-bind /usr/share/nvidia /usr/share/nvidia \
  --ro-bind /usr/share/ca-certificates /usr/share/ca-certificates \
  --ro-bind /etc/ld.so.conf /etc/ld.so.conf \
  --ro-bind /etc/ld.so.cache /etc/ld.so.cache \
  --ro-bind /etc/fonts /etc/fonts \
  --ro-bind /etc/resolv.conf /etc/resolv.conf \
  --ro-bind /etc/ssl /etc/ssl \
  --ro-bind /etc/ca-certificates.conf /etc/ca-certificates.conf \
  --dir "$XDG_RUNTIME_DIR" \
  --bind "$XDG_RUNTIME_DIR/pulse" "$XDG_RUNTIME_DIR/pulse" \
  --ro-bind /run/user/$UID/bus /run/user/$UID/bus \
  --ro-bind "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1" \
  --dev /dev \
  --dev-bind /dev/dri /dev/dri \
  --dev-bind /dev/shm /dev/shm \
  --dev-bind /dev/nvidia0 /dev/nvidia0 \
  --dev-bind /dev/nvidiactl /dev/nvidiactl \
  --dev-bind /dev/nvidia-uvm /dev/nvidia-uvm \
  --dev-bind /dev/nvidia-modeset /dev/nvidia-modeset \
  --ro-bind /sys /sys \
  --proc /proc \
  --tmpfs /tmp \
  --ro-bind $HOME/.config/dconf $HOME/.config/dconf \
  --ro-bind $HOME/.config/user-dirs.dirs $HOME/.config/user-dirs.dirs \
  --bind $HOME/.mozilla $HOME/.mozilla \
  --bind $HOME/Downloads $HOME/Downloads \
  --setenv GTK_THEME Papirus:light \
  --setenv MOZ_ENABLE_WAYLAND 1 \
  --setenv PATH /usr/bin \
  --hostname RESTRICTED \
  --unshare-all \
  --share-net \
  --die-with-parent \
  --new-session \
  /usr/bin/firefox $@
```

Chromium 的编译时间实在太长了（虽然 FireFox 的也没差到哪去，开启了 LTO 和 PGO 之后编译时间感人），我又用回来了这位

由于我有了其他软件从系统默认浏览器打开链接的需求，所以就用 xdg-dbus-proxy 设置了相关服务，并且我 waybar 的 mpris 组件也能显示 FireFox 播放的媒体了。

我使用了 nvidia-vaapi-driver，所以设备上暴露了一些 nvidia 的，这个 /dev/nvidia-uvm 一开始是没有的，我运行了 `vainfo` 之后就会出现，所以现在有一个抽象的事情就是我会先在 foot 上执行一遍 vainfo，之后打开 FireFox。这套是可以用上 nvidia-vaapi-driver 的硬件视频解码的，如果 FireFox 能支持 nvenc 就更好了。

### VSCodium

vscodium 基本照搬的 下面的 Chromium 的配置

```bash
bwrap \
--symlink usr/lib /lib \
--symlink usr/lib64 /lib64 \
--symlink usr/bin /bin \
--symlink usr/bin /sbin \
--ro-bind /usr/bin /usr/bin \
--ro-bind /usr/lib /usr/lib \
--ro-bind /usr/lib64 /usr/lib64 \
--ro-bind /usr/share/applications /usr/share/applications \
--ro-bind /usr/share/gtk-3.0 /usr/share/gtk-3.0 \
--ro-bind /usr/share/icu /usr/share/icu \
--ro-bind /usr/share/drirc.d /usr/share/drirc.d \
--ro-bind /usr/share/fonts /usr/share/fonts \
--ro-bind /usr/share/glib-2.0 /usr/share/glib-2.0 \
--ro-bind /usr/share/glvnd /usr/share/glvnd \
--ro-bind /usr/share/icons /usr/share/icons \
--ro-bind /usr/share/mime /usr/share/mime \
--ro-bind /usr/share/X11/xkb /usr/share/X11/xkb \
--ro-bind /usr/share/icons /usr/share/icons \
--ro-bind /usr/share/locale /usr/share/locale \
--ro-bind /usr/share/zoneinfo /usr/share/zoneinfo \
--ro-bind /usr/share/vulkan /usr/share/vulkan \
--ro-bind /usr/share/verilator /usr/share/verilator \
--ro-bind /usr/include /usr/include \
--ro-bind /etc/ssl /etc/ssl \
--ro-bind /etc/ca-certificates.conf /etc/ca-certificates.conf \
--ro-bind /etc/fonts /etc/fonts \
--ro-bind /etc/resolv.conf /etc/resolv.conf \
--ro-bind /etc/chromium /etc/chromium \
--ro-bind /etc/localtime /etc/localtime \
--ro-bind /etc/ld.so.conf /etc/ld.so.conf \
--ro-bind /etc/ld.so.cache /etc/ld.so.cache \
--ro-bind /opt/vscodium/ /opt/vscodium/ \
--dir "$XDG_RUNTIME_DIR" \
--ro-bind "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1" \
--dev /dev \
--dev-bind /dev/dri /dev/dri \
--ro-bind /sys/dev/char /sys/dev/char \
--ro-bind /sys/devices/pci0000:00 /sys/devices/pci0000:00 \
--proc /proc \
--tmpfs /tmp \
--bind $HOME/.config/VSCodium $HOME/.config/VSCodium \
--bind $HOME/.vscode-oss $HOME/.vscode-oss \
--bind $HOME/Downloads $HOME/Downloads \
--bind $HOME/Documents $HOME/Documents \
--bind $HOME/codpjt $HOME/codpjt \
--bind $HOME/git_repo $HOME/git_repo \
--setenv GTK_THEME Papirus:light \
--hostname RESTRICTED \
--unshare-all \
--share-net \
--new-session \
/opt/vscodium/codium --ozone-platform=wayland --use-gl=angle --use-angle=vulkan --enable-features=AcceleratedVideoEncoder,AcceleratedVideoDecodeLinuxGL,VaapiOnNvidiaGPUs,VaapiIgnoreDriverChecks,Vulkan,DefaultANGLEVulkan,VulkanFromANGLE --ignore-gpu-blocklist --disable-gpu-driver-bug-workaround --enable-wayland-ime
```

### Chromium

```bash
bwrap \
--symlink usr/lib /lib \
--symlink usr/lib64 /lib64 \
--symlink usr/bin /bin \
--symlink usr/bin /sbin \
--ro-bind /usr/lib /usr/lib \
--ro-bind /usr/lib64 /usr/lib64 \
--ro-bind /usr/bin /usr/bin \
--ro-bind /etc/ssl /etc/ssl \
--ro-bind /etc/ca-certificates.conf /etc/ca-certificates.conf \
--ro-bind /etc/fonts /etc/fonts \
--ro-bind /etc/resolv.conf /etc/resolv.conf \
--ro-bind /etc/chromium /etc/chromium \
--ro-bind /etc/localtime /etc/localtime \
--ro-bind /etc/ld.so.conf /etc/ld.so.conf \
--ro-bind /etc/ld.so.cache /etc/ld.so.cache \
--ro-bind /usr/share/applications /usr/share/applications \
--ro-bind /usr/share/gtk-3.0 /usr/share/gtk-3.0 \
--ro-bind /usr/share/icu /usr/share/icu \
--ro-bind /usr/share/drirc.d /usr/share/drirc.d \
--ro-bind /usr/share/fonts /usr/share/fonts \
--ro-bind /usr/share/glib-2.0 /usr/share/glib-2.0 \
--ro-bind /usr/share/glvnd /usr/share/glvnd \
--ro-bind /usr/share/icons /usr/share/icons \
--ro-bind /usr/share/mime /usr/share/mime \
--ro-bind /usr/share/X11/xkb /usr/share/X11/xkb \
--ro-bind /usr/share/icons /usr/share/icons \
--ro-bind /usr/share/mime /usr/share/mime \
--ro-bind /usr/share/zoneinfo /usr/share/zoneinfo \
--ro-bind /usr/share/pixmaps /usr/share/pixmaps \
--ro-bind /usr/share/locale /usr/share/locale \
--ro-bind /usr/share/vulkan /usr/share/vulkan \
--dev /dev \
--dev-bind /dev/dri /dev/dri \
--proc /proc \
--ro-bind /sys/dev/char /sys/dev/char \
--ro-bind /sys/devices/pci0000:00 /sys/devices/pci0000:00 \
--ro-bind /run/dbus /run/dbus \
--dir "$XDG_RUNTIME_DIR" \
--ro-bind "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1" \
--ro-bind "$XDG_RUNTIME_DIR/pipewire-0" "$XDG_RUNTIME_DIR/pipewire-0" \
--ro-bind "$XDG_RUNTIME_DIR/pulse" "$XDG_RUNTIME_DIR/pulse" \
--tmpfs /tmp \
--dir $HOME/.cache \
--bind $HOME/.config/chromium $HOME/.config/chromium \
--bind $HOME/Downloads $HOME/Downloads \
--unshare-all \
--share-net \
--die-with-parent \
--new-session \
/usr/bin/chromium
```

使用 FireFox 的时候还在用我的 NVIDIA 显卡驱动，由于 FireFox 官方并不支持 NVENC 视频解码（虽然可以通过安装 media-libs/nvidia-vaapi-driver 实现翻译）

由于使用 FireFox 打开部分网站速度不佳，我选择了 Chromium（由于 media-libs/libpng 依赖问题，我把 FireFox 删除了）

使用 Chromium 的时候是 Intel 的核显驱动，安装了 media-libs/libva-intel-media-driver 软件包，这套 bwrap 参数可以让 Chromium 用到显卡的视频解码，由于 Gentoo 的 Chromium 会读取 /etc/chromium/ 下的文件作为 Chromium 启动时的命令行参数，所以我把参数都放到那里了

我这套选项可能有的有些多余，不过我懒得再裁剪了

```txt
--ozone-platform=wayland --use-gl=angle --use-angle=vulkan --enable-features=AcceleratedVideoEncoder,AcceleratedVideoDecodeLinuxGL,VaapiOnNvidiaGPUs,VaapiIgnoreDriverChecks,Vulkan,DefaultANGLEVulkan,VulkanFromANGLE --ignore-gpu-blocklist --disable-gpu-driver-bug-workaround --enable-wayland-ime --wayland-text-input-version=3
```

## sysctl

我参考了一些文章给出的 sysctl 配置，新建目录 /etc/sysctl.d/，并新建文件 99-hardened.conf，文件内容如下：

```conf
kernel.core_pattern=|/bin/false
kernel.kptr_restrict=2
kernel.dmesg_restrict=1
kernel.unprivileged_bpf_disabled=1
net.core.bpf_jit_harden=2
dev.tty.ldisc_autoload=0
vm.unprivileged_userfaultfd=0
kernel.kexec_load_disabled=1
kernel.sysrq=4

net.ipv4.tcp_syncookies=1
net.ipv4.tcp_rfc1337=1
net.ipv4.tcp_timestamps=0
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.secure_redirects=0
net.ipv4.conf.default.secure_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv6.conf.default.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.default.send_redirects=0
net.ipv4.icmp_echo_ignore_all=1
net.ipv4.conf.all.accept_source_route=0
net.ipv4.conf.default.accept_source_route=0
net.ipv6.conf.all.accept_source_route=0
net.ipv6.conf.default.accept_source_route=0
net.ipv6.conf.all.use_tempaddr=2
net.ipv6.conf.default.use_tempaddr=2
net.ipv6.conf.all.accept_ra=0
net.ipv6.conf.default.accept_ra=0

kernel.yama.ptrace_scope=1
vm.mmap_rnd_bits=32
vm.mmap_rnd_compat_bits=16
fs.protected_symlinks=1
fs.protected_hardlinks=1
fs.protected_fifos=2
fs.protected_regular=2
```

`kernel.yama.ptrace_scope=1` 貌似是默认的？为了更安全可以选择 `2` 或 `3`，我印象中 2 是不允许非 root 用户做这件事，而 3 这是不允许该行为

我设置为 1 是允许父子进程关系才可以查看进程的内存和运行状态等信息，这是因为我仍然有调试软件的需求，如果没有的话设置死也是个选择 🤔

可以安装 [checksec](https://github.com/slimm609/checksec) 查看当前运行的 kernel 的安全性（当然，该工具检查的并不全面）

```bash
$ checksec --kernel 
* Kernel protection information:

  Description - List the status of kernel protection mechanisms. Rather than
  inspect kernel mechanisms that may aid in the prevention of exploitation of
  userspace processes, this option lists the status of kernel configuration
  options that harden the kernel itself against attack.

  Kernel config:
/proc/config.gz

  Vanilla Kernel ASLR:                    Full
  NX protection:                          Enabled
  Protected symlinks:                     Enabled
  Protected hardlinks:                    Enabled
  Protected fifos:                        Enabled
  Protected regular:                      Enabled
  Ipv4 reverse path filtering:            Enabled
  Kernel heap randomization:              Enabled
  GCC stack protector support:            Enabled
  GCC stack protector strong:             Enabled
  SLAB freelist randomization:            Enabled
  Virtually-mapped kernel stack:          Enabled
  Restrict /dev/mem access:               Enabled
  Restrict I/O access to /dev/mem:        Enabled
  Exec Shield:                            Unsupported
  YAMA:                                   Active

  Hardened Usercopy:                      Enabled
  Harden str/mem functions:               Enabled

* X86 only:            
  Address space layout randomization:     Enabled

* SELinux:                                Disabled

  SELinux infomation available here: 
    http://selinuxproject.org/
```

这里除了 SELinux 没有开启之外，其他都是通过检查的

印象中还有一个项目，它检查内核配置比这个更全面，除了基本的这些之外，还有 [KSPP](https://kspp.github.io/) (Kenrel Self Protection Project) 和 PAX 等项目的建议，不过我没用它

`checksec` 还可以检查指定的可执行文件的安全配置情况

```bash
$ checksec --file=/usr/bin/sway
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH	    Symbols	     FORTIFY	 Fortified  Fortifiable	FILE
Full RELRO      Canary found      NX enabled    PIE enabled     No RPATH   No RUNPATH   No Symbols	Partial	9		18		/usr/bin/sway
```

## 内核命令行参数

```txt
page_alloc.shuffle=1 pti=on vsyscall=none module.sig_enforce=1 lockdown=confidentiality quiet loglevel=0
intel_iommu=on amd_iommu=force_isolation efi=disable_early_pci_dma iommu=force iommu.passthrough=0 iommu.strict=1
spectre_v2=on spec_store_bypass_disable=on tsx=off tsx_async_abort=full mds=full l1tf=full,force kvm.nx_huge_pages=force
```

第一行中的启动参数是开启一些常见的安全防护机制，比如页表隔离，模块签名验证等，其实有更多的参数可以写，比如 `slab_nomerge` 和 `randomize_kstack_offset=on` 这些，不过由于我使用的内核是 hardened USE 变量的 gentoo-kernel，这些已经在编译的时候开启了，我就不在这里写了

第二行是开启一些 IOMMU 防护

第三行是开启 Spectre 等 CPU 漏洞的缓解机制

如果要检查当前运行的 CPU 是否受到已知漏洞的影响，可以运行

```bash
$ grep -r . /sys/devices/system/cpu/vulnerabilities/
```

## NetworkManager

NetworkManager 是目前大多数用户使用的桌面环境都在用的网络管理工具，它既可以管理有线网络，也可以管理无线网络。

应该开启 NetworkManager 的 MAC 地址随机化

在 /etc/NetworkManager/conf.d/ 下创建 99-macrandomize.conf

```conf
[device]
wifi.scan-rand-mac-address=yes

[connection]
wifi.cloned-mac-address=random
ethernet.cloned-mac-address=random
```

我使用的是 Hyprland 窗口管理器，这些窗口管理器基本都有一个缺陷 —— 没有自家的 keyring 服务（GNOME 有 gnome-keyring，KDE Plasma 有 kwallet）

我安装了 gnome-base/gnome-keyring，并且运行了 `systemctl --user enable --now gnome-keyring-daemon`

之后我安装了 gnome-extra/nm-applet 用来连接 WIFI，并使用网络编辑，在 WIFI 安全性中改成仅为该用户存储密码

如果要安装 gnome-extra/nm-applet 的话，最好启用 `appindicator` USE 变量

之后是开启 IPV6 隐私扩展

新建 /etc/NetworkManager/conf.d/ip6-privacy.conf，其内容为

```conf
[connection]
ipv6.ip6-privacy=2
```

在 /etc/NetworkManager/system-connections/ 下编辑已有的连接

```conf
...
[ipv6]
method=auto
ip6-privacy=2
...
```

添加这个 `ip6-privacy=2`

## 浏览器配置

FireFox 我推荐 [arkenfox/user.js](https://github.com/arkenfox/user.js) 项目，搭配 [uBlock Origin](https://github.com/gorhill/uBlock)

如果为了防止被网站跟踪，可以选择使用 Mullvad Browser，这位是和 Tor Project 联合开发，并去除了 Tor 的部分

Chromium 的话，我选择根据 [Policy Templates](https://www.chromium.org/administrators/policy-templates/) 配置一些策略

```json
{
  "PrivacySandboxAdMeasurementEnabled": false,
  "PrivacySandboxAdTopicsEnabled": false,
  "PrivacySandboxPromptEnabled": true,
  "PrivacySandboxSiteEnabledAdsEnabled": false,

  "AudioSandboxEnabled": true,
  "NetworkServiceSandboxEnabled": true,

  "AutoplayAllowed": false,
  "BlockThirdPartyCookies": true,
  "SavingBrowserHistoryDisabled": true,

  "EncryptedClientHelloEnabled": true,
  "HttpsUpgradesEnabled": true,
  
  "WebRtcIPHandling": "disable_non_proxied_udp",

  "SafeBrowsingEnabled": true,
  "SafeBrowsingProtectionLevel": 2,
  "SafeBrowsingProxiedRealTimeChecksAllowed": true,

  "CACertificateManagementAllowed": 2
}
```

写完可以用 `jq` 验证一下 JSON 格式对不对 `cat test.json | jq`

我在 Chromium 上依旧在使用 uBlock Origin，也不知道 Chromium 什么时候开始停止支持 Mainfest V2 标准的浏览器扩展

## 禁用 core dump

禁用 core dump 貌似是为了防止有写私密数据也被 dump 下来了。不过就我个人而言，我只是很讨厌这种在我不知道的时候 dump 的行为，不知不觉运行 `coredumpctl` 一看，python、firefox 这些软件都 dump 过，难绷。

新建 /etc/systemd/coredump.conf.d/disable.conf 中写入

```conf
[Coredump]
Storage=none
ProcessSizeMax=0
```

上面 sysctl 的 `kernel.core_pattern=|/bin/false` 也是在禁用 core dump

不得不说，禁用了之后，我自己开发的软件 core dump 了也没存。有一说一，core dump 还是有助于开发的，等之后我手动临时开启试试看吧。

## 面向安全的编译选项

在我最先写这个文章的时候，我就想写这部分，但是由于我对 GCC 和 LLVM 的了解还太少，导致我有些迟疑（当然，现在也了解不多，只是感觉应该加上而已）

```conf
COMMON_FLAGS="-O3 -pipe -march=x86-64-v3 -flto=thin -fstack-protector-strong -fstack-clash-protection -fcf-protection=full -D_FORTIFY_SOURCE=3"
RUSTFLAGS="${RUSTFLAGS} -C target-cpu=native"
CFLAGS="${COMMON_FLAGS}"
CXXFLAGS="${COMMON_FLAGS}"
FCFLAGS="${COMMON_FLAGS}"
FFLAGS="${COMMON_FLAGS}"
LDFLAGS="-Wl,-O3,-z,now,--as-needed,--lto-O3,--icf=safe,--gc-sections"
```

我使用的是 LLVM/systemd profile，所以这里用了 thinlto

上面就是我个人的编译选项了，我本身就开启了 `hardened` USE 变量，说实话，这里的部分 USE 变量是重复的

只要开启了 `hardened` USE 变量，这里面有些选项是默认就加上的

> 运行 `clang --version` 可以看到
>
> Configuration file: /etc/clang/x86_64-pc-linux-gnu-clang.cfg
>
>从那个文件中可以看到它依赖于 @gentoo-common.cfg @gentoo-common-ld.cfg 和 @gentoo-cet.cfg
>
> 我这里的 -fstack-clash-protection -fstack-protector-strong -fcf-protection=all 在在上面的文件中

`fstack-protector-*` 都是对栈溢出的防御，而 `fcf-protection` 则是对控制流劫持（也不知道是不是这个名字，就是 ROP 之类的）攻击的防御

LLVM 中也有一个应对 ROP 这种攻击的技术，就是 [CFI](https://clang.llvm.org/docs/ControlFlowIntegrity.html)，CFI 必须在开启了 LTO 的情况下才能使用（我印象中 KCFI 不需要 LTO，它被用在操作系统内核等底层软件，检测的范围更小），我感觉为特定的软件开 CFI，倒也可以接受。Linux kernel 有专门的 CFI 的选项，Chromium 也实施了 CFI。

CFI 还分前端和后端，我也没太仔细研究，也不太清楚区别

我使用了 `O3` 编译，虽然说 O3 的提升空间不大，不过我个人希望试试看。

`march=x86-64-v3` 表示了我本机 CPU 的指令集是这位，其实用 `march=native` 就行，编译器会自动选择适合的指令集

`D_FORTIFY_SOURCE=3` 用于应用 libc 的一种强化措施，主要用于检测某些库函数的缓冲区溢出问题。具体可以参考 glibc 的文档：https://www.gnu.org/software/libc/manual/html_node/Source-Fortification.html

## SELinux/AppArmor

TODO 我自己还没太准备学习这二位
