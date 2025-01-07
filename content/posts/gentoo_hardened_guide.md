---
title: "Gentoo Linux 安全加固指南"
author: suo yuan
date: 2025-01-07T10:00:36Z
lastmod: 2025-01-07T22:25:02Z
draft: false
tags:
  - gentoo-linux
  - linux
description: "我本次安装 Gentoo Linux 所做的一些安全加固手段"
summary: "我本次安装 Gentoo Linux 所做的一些安全加固手段"
---

# Gentoo Linux 安全加固指南

> - 2025 年 1 月 8 号修改
>   - 添加了 VSCodium 的 bwrap 启动参数，修改了 sysctl 和内核启动参数部分

我一直在寻求一个尽可能不影响日常使用的同时尽量做到安全的操作系统。单论安全性，我认为 [Qubes OS](https://www.qubes-os.org/) 就很不错，但日常使用起来不是很方便。在我看来，Qubes OS 很不错，但是网络配置看起来不是很容易，并且社区貌似不是很大。我目前认为 Gentoo Linux 是一个选择，但由于 Gentoo Linux 编译真的很费时间，所以我放假回来才开始尝试一些功能。

## 硬盘加密

我现在认为硬盘加密是一个必备的选择。我选择了 Luks2 的 argon2id 算法，这导致我需要使用 systemd-boot，GRUB 对 Luks2 的支持有限。

在硬盘分区时，根据 [Rootfs_encryption](https://wiki.gentoo.org/wiki/Rootfs_encryption)，直接执行：

```bash
$ cryptsetup --type luks2 --cipher aes-xts-plain64 --hash sha512 --iter-time 5000 --key-size 256 --pbkdf argon2id --use-urandom --verify-passphrase luksFormat /dev/block
```

如何你想使用 GRUB 作为 bootloader（比如你有引导 windows 启动项的需求等，那就不能使用 luks2，应该选择用 luks 的算法。

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

安全启动是个耳熟能详的名词，我在刚接触到给自己的笔记本电脑安装 GNU/Linux 发行版的教程的时候，一般都是在 BIOS 中关闭快速启动和安全启动，一般社区支持的发行版无法在开启安全启动的情况下安装，部分商业公司支持的（如 Fedora，OpenSUSE，Deepin 等）发行版可以直接启动安装。

安全启动是 UEFI 下才有的安全验证机制，旨在确保引导的文件是可信的。

只需要在安装的过程中对照着手册，看到安全启动的部分就跟着手册来就行。

这里有一点，Shim 被硬编码为使用 grubx64.efi，但是由于我使用的 systemd-boot 作为 bootloader，没有 grubx64.efi，所以我选择了将 systemd-bootx64.efi 复制一个 grubx64.efi 出来。

```bash
$ cp /efi/EFI/systemd/systemd-bootx64.efi /efi/EFI/systemd/grubx64.efi
```

## bwrap

应用沙盒就这两位我还算熟悉，[Firejail](https://github.com/netblue30/firejail) 和 [Bubblewrap](https://github.com/containers/bubblewrap)。前者有令人诟病的 setuid 安全隐患，后者没有 Firejail 那样有社区提供好的沙盒模板（即部分应用自动就可以沙盒化，如 git，firefox 等）

我选择了 Bubblewrap（也就是标题中的 bwrap），目前只用到了 FireFox 和 VSCodium 上，我目前的目标是，让使用的图形化软件基本都套一层 bwrap（除了终端模拟器还没这个想法）

这是 FireFox 的

```bash
$ bwrap \
--symlink usr/lib /lib \
--symlink usr/lib64 /lib64 \
--symlink usr/bin /bin \
--symlink usr/bin /sbin \
--ro-bind /usr/lib /usr/lib \
--ro-bind /usr/lib64 /usr/lib64 \
--ro-bind /usr/bin /usr/bin \
--ro-bind /usr/lib64/firefox /usr/lib64/firefox \
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
--ro-bind /etc/fonts /etc/fonts \
--ro-bind /etc/resolv.conf /etc/resolv.conf \
--ro-bind /usr/share/ca-certificates /usr/share/ca-certificates \
--ro-bind /etc/ssl /etc/ssl \
--ro-bind /etc/ca-certificates.conf /etc/ca-certificates.conf \
--dir "$XDG_RUNTIME_DIR" \
--ro-bind "$XDG_RUNTIME_DIR/pulse" "$XDG_RUNTIME_DIR/pulse" \
--ro-bind "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1" \
--dev /dev \
--dev-bind /dev/dri /dev/dri \
--ro-bind /sys/dev/char /sys/dev/char \
--ro-bind /sys/devices/pci0000:00 /sys/devices/pci0000:00 \
--proc /proc \
--tmpfs /tmp \
--bind /home/example/.mozilla /home/example/.mozilla \
--bind /home/example/Downloads /home/example/Downloads \
--setenv HOME /home/example \
--setenv GTK_THEME Papirus:light \
--setenv MOZ_ENABLE_WAYLAND 1 \
--setenv PATH /usr/bin \
--hostname RESTRICTED \
--unshare-all \
--share-net \
--die-with-parent \
--new-session \
/usr/bin/firefox
```

VSCodium

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
--ro-bind /usr/share/glib-2.0 /usr/share/glib-2.0 \
--ro-bind /usr/share/fonts /usr/share/fonts \
--ro-bind /usr/share/icons /usr/share/icons \
--ro-bind /usr/share/mime /usr/share/mime \
--ro-bind /usr/share/X11/xkb /usr/share/X11/xkb \
--ro-bind /etc/fonts /etc/fonts \
--ro-bind /opt/vscodium/ /opt/vscodium/ \
--dir "$XDG_RUNTIME_DIR" \
--ro-bind "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1" \
--dev /dev \
--dev-bind /dev/dri /dev/dri \
--ro-bind /sys/dev/char /sys/dev/char \
--ro-bind /sys/devices/pci0000:00 /sys/devices/pci0000:00 \
--proc /proc \
--tmpfs /tmp \
--bind /home/example/.config/VSCodium /home/example/.config/VSCodium \
--bind /home/example/.vscode-oss /home/example/.vscode-oss \
--bind /home/example/Downloads /home/example/Downloads \
--bind /home/example/Documents /home/example/Documents \
--bind /home/example/codpjt /home/example/codpjt \
--bind /home/example/git_repo /home/example/git_repo \
--setenv HOME /home/example \
--setenv GTK_THEME Papirus:light \
--setenv LD_LIBRARY_PATH /usr/lib/gcc/x86_64-pc-linux-gnu/14 \
--hostname RESTRICTED \
--unshare-all \
--share-net \
--new-session \
/opt/vscodium/codium --enable-features=UseOzonePlatform --ozone-platform=wayland --enable-wayland-ime --wayland-text-input-version=3 --use-gl=egl
```

## sysctl

我参考了一些文章给出的 sysctl 配置，新建目录 /etc/sysctl.d/，并新建文件 00-hardened.conf，文件内容如下：

```conf
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

## 内核命令行参数

```txt
page_alloc.shuffle=1 pti=on vsyscall=none module.sig_enforce=1 lockdown=confidentiality quiet loglevel=0 
intel_iommu=on amd_iommu=force_isolation efi=disable_early_pci_dma iommu=force iommu.passthrough=0 iommu.strict=1 
spectre_v2=on spec_store_bypass_disable=on tsx=off tsx_async_abort=full mds=full l1tf=full,force kvm.nx_huge_pages=force
```

第一行中的启动参数是开启一些常见的安全防护机制，比如页表隔离，模块签名验证等，其实有更多的参数可以写，比如 `slab_nomerge` 和 `randomize_kstack_offset=on` 这些，不过由于我使用的内核是 hardened USE 变量的 gentoo-kernel，这些已经在编译的时候开启了，我就不在这里写了。

第二行是开启 IOMMU 防护

第三行是开启 Spectre 漏洞缓解机制
