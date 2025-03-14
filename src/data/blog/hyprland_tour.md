---
title: "使用 Hyprland"
author: suo yuan
pubDatetime: 2024-09-13T10:50:42Z
lastmod: 2024-09-28T15:20:50Z
draft: false
categories:
  - Linux_杂谈
tags:
  - Linux
  - Intro
description: "目前也用 Hyprland 几个月了，故而写了这篇面向准备使用 Hyprland 的人群"
summary: "目前也用 Hyprland 几个月了，故而写了这篇面向准备使用 Hyprland 的人群"
---

# 使用 Hyprland

目前也用 Hyprland 几个月了，故而写了这篇面向准备使用 Hyprland 的人群。

[Hyprland](https://github.com/hyprwm/Hyprland) 是由 C++ 编写，少数不使用 [wlroots](https://gitlab.freedesktop.org/wlroots/wlroots) 的平铺式窗口管理器。默认足够漂亮，并且也还好用。好用指的是实现了 text-input-v1，并且支持将 XWayland 的缩放设置为 0 而不是跟着全局的缩放走。实现了 text-input-v1 就可以让 Electron 的软件在跑在 Wayland 下也可以使用 fcitx 中文输入法。

Hyprland 是在 0.42 版本开始完全不依赖于 wlroots 的，[0.43](https://github.com/hyprwm/Hyprland/releases/tag/v0.43.0) 就把编译所需的 C++ 标准提到 C++ 26 了，不过本身我 C++ 的水平不是很高，我本身对 C++ 26 也没有太多的关注，我又不是个语言律师，也不好评价这个决定。不得不说，这一定程度上把编译工具链的要求提高了一些。

Hyprland 的功耗比 sway 大一些。

## 配置文件

Hyprland 安装自带的默认配置文件基本还可以，对一些基础的东西都做了设置。你需要设置的大多是环境变量的设置，窗口规则以及自动启动的软件。

我目前对窗口规则只设置了一点，也是遇到了需要设定的软件再添加。

```conf
windowrulev2 = opacity 0.90, class:.*
windowrulev2 = opacity 1, class: brave-browser
windowrulev2 = opacity 1, class: firefox
windowrulev2 = opacity 1, class: Terraria.bin.x86_64
windowrulev2 = opacity 1, class: org.gnome.Epiphany

windowrulev2 = float, class: xdg-desktop-portal-*
windowrulev2 = float, class: localsend
windowrulev2 = float, title: Bookmarks backup
windowrulev2 = float, title: ^(Library)(.*)$
windowrulev2 = size 50% 50%, class: localsend
windowrulev2 = size 50% 50%, class: xdg-desktop-portal-*
windowrulev2 = size 50% 50%, class: ^(wofi)$
windowrulev2 = size 50% 50%, title: Bookmarks backup
windowrulev2 = size 50% 50%, title: ^(Library)(.*)$
```

这里我只是将所有窗口都不透明度设置为 0.9，并且将一些额外需要设定的应用（比如浏览器和游戏）的不透明度还是拉满。

有些窗口我并不希望是全屏显示，所以我额外设置它们的 size。

对于环境变量，我只是额外设定了 fcitx5 的环境变量。

```conf
env = LIBVA_DRIVER_NAME, nvidia
env = NVD_BACKEND, direct
env = QT_QPA_PLATFORM, wayland

env = QT_QPA_PLATFORMTHEME, qt6ct
env = XDG_CURRENT_DESKTOP, Hyprland
env = XDG_SESSION_TYPE, wayland
env = XDG_SESSION_DESKTOP, Hyprland
env = EDITOR, /usr/bin/nvim

env = LANG,zh_CN.UTF-8
env = QT_IM_MODULE, fcitx
env = XMODIFIERS, @im=fcitx
env = SDL_IM_MODULE, fcitx
env = INPUT_METHOD, fcitx
env = GLFW_IM_MODULE, ibus
```

`LIBVA_DRIVER_NAME` 是配合 [nvidia-vaapi-driver](https://github.com/elFarto/nvidia-vaapi-driver) 用的。`LANG` 是当前系统的语言，我通过这个设置系统语言为中文，但是我在 **.bashrc** 文件重新设置回英文了。

对于自动启动的应用，只需要这么写:

```conf
exec-once = /usr/bin/wlsunset -t 2500 -T 3000
exec-once = /usr/bin/mako
exec-once = /usr/bin/fcitx5 -d
exec-once = /usr/bin/blueman-applet
exec-once = /usr/bin/swaybg -i "/home/zuos/Pictures/magic_planet.png" -m fill
exec-once = /usr/bin/waybar -c /home/zuos/.config/waybar/waybar.json
exec-once = /usr/bin/hyprctl setcursor "Tela" 24
exec-once = /usr/bin/gsettings set org.gnome.desktop.interface icon-theme 'Papirus'
exec-once = /usr/bin/gsettings set org.gnome.desktop.interface font-name 'Noto Sans Mono CJK SC 12'
```

[wlsunset](https://sr.ht/~kennylevinsen/wlsunset/) 是一个设置屏幕色温的软件，我需要一个支持设置 night light 的软件，所以我选择了这位。

[mako](https://github.com/emersion/mako) 是一个通知组件，[blueman](https://github.com/blueman-project/blueman) 是一个蓝牙连接相关的 GUI 软件，`blueman-applet` 可以启动它的系统托盘。

[swaybg](https://github.com/swaywm/swaybg) 用于设置壁纸，Hyprlan 存在一个 [hyprpaper](https://github.com/hyprwm/hyprpaper) 设置壁纸的软件，但是其功能我不是很需要。

`hyprctl` 是随安装 Hyprland 就带的，可以获取当前桌面窗口类等信息，并且可以设置鼠标主题和大小，我这里就是干这个用的。

后面两个 `gsettings` 就是设置图标主题和字体主题。


## 需要额外用到的软件

可以参考 [Hyprland wiki](https://wiki.hyprland.org/Useful-Utilities/)。

类似 waybar, wofi, mako, hyprlock 这些的配置文件，可以参考我的 dotfiles: https://github.com/suoyuan666/dotfiles

## tricks

剪切板管理器可能不是谁都能用到，但是 [wl-clpboadr](https://github.com/bugaevc/wl-clipboard) 是值得装的，毕竟 neovim 就认那几个剪切板工具。

设置系统为中文后，很有可能部分软件直接把下载路径直接设置为 **$HOME/下载**，但这还对我来说很难受，可以安装 `xdg-user-dirs`，之后在`LANG=en_US.UTF-8` 的环境下执行一编 `xdg-user-dirs-update`。

XWayland 的分数缩放还是很难搞，不过 Hyprland 可以直接将 XWayland 的缩放设置为 0，如果和我一样，是一个 electron 应用跑在 XWayland 下的话，可以选择附加 `--force-device-scale-factor=1.6`，这样就可以设置一个正常的缩放了。

没有默认安装一个可以设置打开方式的 GUI 软件，可以使用类似 `xdg-settings get default-web-browser` 的方式设置。
