---
title: NVIDIA 在 GNU/Linux 发行版上工作的技巧
author: suo yuan
pubDatetime: 2024-07-19T01:21:25
featured: false
draft: false
tags:
  - linux
  - intro
description: "就是如何在 GNU/Linux 发行版中舒服的使用 NVIDIA 驱动"
---

# NVIDIA 在 GNU/Linux 发行版上工作的技巧

## Wayland 下 正常启动

根据 [NVIDIA Transitions Fully Towards Open-Source GPU Kernel Modules](https://developer.nvidia.com/blog/nvidia-transitions-fully-towards-open-source-gpu-kernel-modules/) 这篇 NVIDIA 的博客，目前 NVDIIA 准备在后续的版本完全换到 NVIDIA 开源内核模块（对 Turing 更高的版本来说），所以我也跟着使用了 nvidia-open。

对于 Wayland 来说，NVIDIA 需要启用 DRM ([Direct Rendering Manager](https://en.wikipedia.org/wiki/Direct_Rendering_Manager)) kernel mode setting，即在内核参数中附加 `nvidia_drm.modeset=1`，这个需要在 **/etc/default/grub** 文件中写明:

在下面这行中添加 `nvidia_drm.modeset=1`。

```txt
GRUB_CMDLINE_LINUX="..."
```

之后运行 `grub-mkconfig -o /boot/grub/grub.cfg`，如果你的 boot 分区和我不一致就去找一下你那个 boot 分区在哪吧。

如果你使用的是 `systemd-boot`，我并不知道 `systemd-boot` 该如何附加内核参数，可以去找找相关 wiki。

我在使用 KDE Plasma 6.1.2 + nvidia-open 555.58.02，附加了这个参数仍然无法正常进入桌面，但可以进入 SDDM 登录管理器，后来在 [Arch Linux 的论坛中的一个帖子](https://bbs.archlinux.org/viewtopic.php?id=293741)看到了一个解决办法——再多附加一个内核参数 `nvidia_drm.fbdev=1`。

所以我附加的内容就是:

```txt
GRUB_CMDLINE_LINUX="nouveau.modeset=0 nvidia_drm.modeset=1 nvidia_drm.fbdev=1"
```

这里第一个是为了禁用 nouveau 驱动，我印象中装了 NVIDIA 官方驱动后，默认就是禁用状态，不过我习惯添加这个了。

实际上我还做了一步：之前我发现 NVIDIA 貌似会在窗口管理器启动之后加载，于是我尝试提前将 NVIDIA 启动，即在 **/etc/mkinitcpio.conf** 文件中新加一些模块，类似这样:

```txt
MODULES=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)
```

之后执行 `mkinitcpio -P`，重新生成一遍 initramfs。

## 正常休眠

我发现休眠也不好使了，这让我很难受。我的问题是这样：休眠后启动需要花费很长时间，这段时间就是黑屏，终于不是黑屏了之后还不完全显示锁屏界面，我凭借着记忆解锁后，只有那些已打开的窗口能正常显示，连锁屏壁纸都不正常显示，`Ctrl + Alt + T` 倒还能正常启动终端，我用 `journalctl` 查看了下系统日志，去 [Arch Wiki 上](https://wiki.archlinux.org/title/NVIDIA/Troubleshooting#Black_screen_returning_from_suspend)找到了我的问题，就是日志显示:

```txt
archlinux kernel: NVRM: GPU at PCI:0000:08:00: GPU-926ecdb0-adb1-6ee9-2fad-52e7214c5011
archlinux kernel: NVRM: Xid (PCI:0000:08:00): 13, pid='<unknown>', name=<unknown>, Graphi>
archlinux kernel: NVRM: Xid (PCI:0000:08:00): 13, pid='<unknown>', name=<unknown>, Graphi>
archlinux kernel: NVRM: Xid (PCI:0000:08:00): 13, pid='<unknown>', name=<unknown>, Graphi>
archlinux kernel: NVRM: Xid (PCI:0000:08:00): 13, pid='<unknown>', name=<unknown>, Graphi>
archlinux kernel: NVRM: Xid (PCI:0000:08:00): 13, pid='<unknown>', name=<unknown>, Graphi>
```

这是 Arch Wiki 上提供的，正常这里的 _archlinux_ 应该显示你的主机名，而 PCI 端口等信息也会不一致。

解决办法就是再搞个内核参数以保留 video memory。来源: https://wiki.archlinux.org/title/NVIDIA/Tips_and_tricks#Preserve_video_memory_after_suspend

我新建了一个 **/etc/modprobe.d/nvidia-power-management.conf** 文件

```txt
options nvidia NVreg_PreserveVideoMemoryAllocations=1
```

之后执行 `systemctl enable nvidia-resume.service` 并重启即可。

根据 Arch wiki 所述，这个不能和 NVIDIA 早启动一起使用，但实际上我一起用了，感觉没什么问题。
