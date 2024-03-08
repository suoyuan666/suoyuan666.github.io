---
title: Arch Linux上配置Clash代理
author: suo yuan
pubDatetime: 2023-06-05T03:42:51Z
featured: false
draft: false
tags:
  - Arch Linux
description:
  "Arch Linux配置clash代理"
---

# Arch Linux上配置Clash代理

---
后来的更新：

Clash官方项目已经死掉了，虽然应该是可以通过一些方式安装相关软件，不过这样用不会再更新的代理软件还是有点难绷的。

---

换到Arch Linux后，我考虑使用[AUR上的clash-verge](https://aur.archlinux.org/packages?O=0&K=clash-verge)，但是不是很好用，正好之前也有弃用这些第三方GUI的想法，于是就选择安装[clash](https://github.com/Dreamacro/clash)和[clash-dashboard](https://github.com/Dreamacro/clash-dashboard)，clash-dashboard是一个简陋的用来web ui面板。

根据[Clash wiki的描述](https://dreamacro.github.io/clash/premium/introduction.html)，clash-for-windows以及clash-verge这样的客户端上的TUN功能是由Clash Premium core带来的，由于我个人原因，我选择了Clash core，而我又暂时懒得学习iptables之类的搞透明代理，所以我先选择设置环境变量来欺骗自己（KDE设置里的代理不够全局😢，印象中GNOME上的设置代理还是比较好用的😕）。

编辑~/.xprofile文件写入环境变量：

```shell
export all_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export rsync_proxy=http://127.0.0.1:7890
export no_proxy=127.0.0.1,localhost
export ftp_proxy=http://127.0.0.1:7890
```

根据[Arch zhwiki上的内容](https://wiki.archlinuxcn.org/wiki/Xprofile)可以知道这是在dm登录进去会执行的脚本。

## 基础配置

首先是安装它俩，clash是在官方软件仓库中的，而clash-dashboard只能在[AUR中得到](https://aur.archlinux.org/packages/clash-dashboard-git)（或者你从GitHub看Readme安装也可以）。

按照[Clash官方文档中的叙述](https://dreamacro.github.io/clash/introduction/service.html)应该在/etc/systemd/system/目录下创建文件clash.service，文件内容是：

```text
[Unit]
Description=Clash daemon, A rule-based proxy in Go.
After=network-online.target

[Service]
Type=simple
Restart=always
ExecStart=/usr/bin/clash -d /etc/clash

[Install]
WantedBy=multi-user.target
```

之后执行

```shell
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now clash.service
```

systemctl enable的时候如果没有后缀名默认是service，所以你不复制的话可以不用手敲.service（）。

我选择安装AUR上的clash-dashboard，使用`yay -Ql`可以发现安装在了usr/share/clash-dashboard-git目录下。

可以使用`wget url -O /etc/clash/config.yaml`把机场提供的配置文件下载下来。

其中可能修改配置文件的（我认为配置文件应该没写，大抵应该得说在文件中添加）：

```yaml
external-ui: /usr/share/clash-dashboard-git/
```

## 定时更新配置文件

我这里选择的不是corn计划任务，是systemd提供的corn的替代品。根据[Arch zhwiki](https://wiki.archlinuxcn.org/wiki/Systemd/%E5%AE%9A%E6%97%B6%E5%99%A8)简单写了写

首先编写一个用于执行更新命令的service文件，我也就放在了clash.service同级目录中

```text
[Unit]
Description=Get clash config.yaml.

[Service]
Type=oneshot
ExecStart=/bin/bash -c "wget --no-proxy \"https://xxx.xx\" -O config_tmp.yaml                            &&\
sed -z -i 's/port: 7890\\nsocks-port: 7891/mixed-port: 7890/' config_tmp.yaml                            &&\
sed -i 's/allow-lan: .*$/allow-lan: false/' config_tmp.yaml                                              &&\
sed -i '/external-controller: :9090/a external-ui: \/usr\/share\/clash-dashboard-git\/' config_tmp.yaml  &&\
sed -i 's/Rule/Global/' config_tmp.yaml                                                                  &&\
mv config_tmp.yaml /etc/clash/config.yaml"

[Install]
WantedBy=multi-user.target
```

这么多sed就是因为配置文件我需要改一改，替换一些东西（悲），并且还需要添加ui目录（也就是clash-dashboard）

然后在同级目录编写一个同名的.timer文件：

```
[Unit]
Description=Run unit to get config.yaml which needed by clash

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

这里设置了是每天的凌晨零点执行一遍这个脚本，如果这个时候因为没开机的原因没执行上就在下一次开机执行它。具体可以参考上面给的wiki。

然后接着

```shell
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now xxx.timer
```

通过`systemctl list-timers`可以查看已有的定时器。