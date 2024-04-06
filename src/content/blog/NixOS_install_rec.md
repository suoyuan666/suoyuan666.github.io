---
title: 我的NixOS安装记录
author: suo yuan
pubDatetime: 2024-04-06T12:59:51
featured: false
draft: false
tags:
  - NixOS
  - Linux
  - intro
description: "我这次安装NixOS做的额外的工作，也就是除官方文档之外的安装步骤。这里我用WM用的是Hyprland"
---

# 我的NixOS安装记录

## 背景

在上个月，我还在使用着Gentoo Linux，那时我还在想应该可以一直使用下去，结果后来有个组件需要用到systemd，于是我准备从openrc换到systemd，同时因为pipewire也很依赖systemd，我用openrc的同时用pipewire总有一点不太得劲。但是我的环境也许有些独特了，或者是我自身实力不够，反正我无法以一种较为优雅的方式从openrc换到systemd。

后来我就想到了NixOS，曾经我被它那些新鲜的特性搞得不知道从何下手（虽然现在我也不太能下手）。

## 关于UEFI

我不好评价为什么我改成grub之后，grub-install根本没有写入，我改回了systemd-boot就行了。后来我在搜相关问题的时候发现有人指出需要这个设置：

```nix
boot.loader.efi.canTouchEfiVariables = true;
```

由于我这个电脑现在是Windows 11 + NixOS，所以我需要使用grub才可以

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

Hyprland默认就是Wayland，但是对于一些尚未完全准备充分的（比如Chromium内核的软件）软件需要加`environment.sessionVariables.NIXOS_OZONE_WL = "1";`。但是对于老版本的Electorn应用来说，哪怕这个环境变量启用了也于事无补。

众所周知，Chromium目前启用了Wayland之后就需要附加命令行参数的方式才能正常使用输入法。目前我只使用了Brave和vscodium需要这一点。

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

这里可以看到使用的是vscode，而不是vscodium，因为vscodium还没有这些配置选项，所以就用vscode，替换掉vscode的package这样用了。
