---
title: 我的 NixOS 安装记录
author: suo yuan
date: 2024-04-06T12:59:51
draft: false
categories:
  - Linux_杂谈
tags:
  - NixOS
  - Linux
description: "我这次安装 NixOS 做的额外的工作，也就是除官方文档之外的安装步骤。这里我用 WM 用的是 Hyprland"
---

<!--more-->
我这次安装 NixOS 做的额外的工作，也就是除官方文档之外的安装步骤。这里我用 WM 用的是 Hyprland
<!--more-->

# 我的 NixOS 安装记录

## 背景

在上个月，我还在使用着 Gentoo Linux，那时我还在想应该可以一直使用下去，结果后来有个组件需要用到 `systemd`，于是我准备从 `openrc` 换到 `systemd`，同时因为 `pipewire` 也很依赖 `systemd`，我用 `openrc` 的同时用 `pipewire` 总有一点不太得劲。但是我的环境也许有些独特了，或者是我自身实力不够，反正我无法以一种较为优雅的方式从 `openrc` 换到 `systemd`。

后来我就想到了 NixOS，曾经我被它那些新鲜的特性搞得不知道从何下手（虽然现在我也不太能下手）。

## 关于 UEFI

我不好评价为什么我改成 `grub` 之后，`grub-install` 根本没有写入，我改回了 `systemd-boot` 就行了。后来我在搜相关问题的时候发现有人指出需要这个设置：

```nix
boot.loader.efi.canTouchEfiVariables = true;
```

由于我这个电脑现在是 Windows 11 + NixOS，所以我需要使用 `grub` 才可以

```nix
boot.loader.efi.canTouchEfiVariables = true;
boot.loader = {
  systemd-boot.enable = false;
  grub = {
    enable = true;
    device = "nodev";
    efiSupport = true;
    useOSProber = true;
  };
};
```

Hyprland 默认就是 Wayland，但是对于一些尚未完全准备充分的（比如 Chromium 内核的软件）软件需要加 `environment.sessionVariables.NIXOS_OZONE_WL = "1";`。但是对于老版本的 Electorn 应用来说，哪怕这个环境变量启用了也于事无补。

众所周知，Chromium 目前启用了 Wayland 之后就需要附加命令行参数的方式才能正常使用输入法。目前我只使用了 Brave 和 vscodium 需要这一点。

```nix
home.packages = with pkgs;[
  (
    (brave.override {
      commandLineArgs = [
        "--enable-wayland-ime"
        "--ozone-platform=wayland"
        "--enable-features=UseOzonePlatform"
        # "--use-gl=egl"
      ];
    }).overrideAttrs
    (old: {
      # inherit (pkgs.guangtao-sources.brave) src pname version;
    })
  )
];

programs.vscode = {
  enable = true;
  enableExtensionUpdateCheck = false;
  enableUpdateCheck = false;
  extensions = with pkgs.vscode-extensions; [
    yzhang.markdown-all-in-one
    pkief.material-icon-theme
    llvm-vs-code-extensions.vscode-clangd
    vadimcn.vscode-lldb
    usernamehw.errorlens
    astro-build.astro-vscode
  ];
  userSettings = {
    "window.titleBarStyle" = "custom";
    "editor.fontFamily" = "Intel One Mono";
    "editor.fontSize" = 17;
    "telemetry.telemetryLevel" = "off";
    "workbench.iconTheme" = "material-icon-theme";
    "workbench.colorTheme" = "Quiet Light";
  };
  package =
    (pkgs.vscodium.override
      {
        commandLineArgs = [
          "--ozone-platform-hint=auto"
          "--ozone-platform=wayland"
          "--enable-wayland-ime"
        ];
      });
};
```

这里可以看到使用的是 vscode，而不是 vscodium，因为 vscodium 还没有这些配置选项，所以就用 vscode，替换掉 vscode 的 package 这样用了。

我将我自己在使用 NixOS 时的 _configuration.nix_ 等文件上传到了 GitHub 仓库中: https://github.com/suoyuan666/NixOS_configfiles
