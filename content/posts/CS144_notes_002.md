---
title: "字节序 & IPV4 地址 & ARP 协议"
author: suo yuan
date: 2024-07-25T06:28:24Z
draft: false
tags:
  - CS144_notes
description: "CS114 课程的课程笔记"
---

<!--more-->
CS114 课程的课程笔记
<!--more-->

# 字节序 & IPV4 地址 & ARP 协议

## 字节排版和格式

假设要发送 1024 ，十六进制是 0x0400 来表示。

在小端法表示中，最低有效字节位于最低地址，也就是 0x00, 0x04 这么存储。

在大端法表示中，最高有效字节位于最低地址，也就是 0x04, 0x00 这么存储。

但通信双方处理器使用的的字节序未必一致。例如 Intel 和 AMD x86 处理器使用小端法，不过一些处理器支持双端法，然后由操作系统决定到底用小端还是大端。

协议规范规定了使用大端，互联网所有协议都使用大端字节序。

如果自身机器是小端字节序的话，可以写个测试:

假设 TCP 端口为 80，存一个变量 `http_port = 80`

```c
uint16_t http_port = 80;
if (packet->port == http_port) { ... } // ERROR
```

此时就可以比对，`http_port` 是小端存储，但 `packet->port` 则是大端，虽然实际上要存储的值都是 80，但测试失败。

为了简化这个过程，C 提供了一些库函数: `htons()`, `ntohs()`, `htonl()`, `ntohl()`

- htons: host to network short
- ntohl: network to host long

```c
#include <arpa/inet.h>

uint http_port = 80;
uint16_t packet_port = ntohs(packet->port)

if (packet_port == http_port) { ... } // OK
```

对于小端字节序表示来说，`ntohs()` 和 `htons()` 会调换字节的顺序，对于大端字节序来说，二者什么也不做，只是将参数返回。

## IPV4 地址

IPV4 地址长度为 32 位。通常分成4组写，例如: 192.168.1.1

除了 IP 地址的标示，还有网络掩码 (netmask)。例如网络掩码 255.255.255.0，表示 IP 地址 和自己的前三个八位字节匹配的在同一网络中。而 255.255.252.0 则表示前 22 位相同的和自己在同一网络中。

这就可以对两个 IP 地址和它们自己的掩码按位与来判断是否在同一网络中

```c
if ((A & netmask) == (B & netmask)) { ... }
```

可以使用 `ip addr` 查看自己的 IP 地址，有些发行版默认不装 [net-tools](https://net-tools.sourceforge.io/) 也就无法使用 `ipconfig`，但应该会带 [iproute2](https://git.kernel.org/pub/scm/network/iproute2/iproute2.git)。

### 地址结构

传统分为三种

- 0 network(1 -> 7) host(8 -> 31)
- 1 0 network(2 -> 15) host(16 -> 31)
- 1 1 0 network(3 -> 23) host(24 -> 31)

其中，network 部分表示为 administrative domain，比如 MIT，Stanford，host 部分具体指是该网络的哪个设备。

但这种方式无法应对早就膨胀的互联网主机数量。

现在 IPV4 已经结构化，称为 CIDR (Classless Inter-Domain Routing)。CIDR 可以自定义前缀长度，其大小为 2 的幂次。当说到 CIDR 地址时，也就是在说就是网络掩码的长度，例如 `192.168.1.0/24`，表示长度为 24 的网络掩码，表示其容纳了 256 个地址，`/16` 是长度为16的网络掩码，描述了 65536 个地址。

[IANA](https://en.wikipedia.org/wiki/Internet_Assigned_Numbers_Authority) (Internet Assigned Numbers Authority)组织负责分配 IP 地址，其背后是 [ICANN](https://en.wikipedia.org/wiki/ICANN) (Internet Corporation for Assigned Names and Numbers)，ICANN 将工作委托给了 IANA。IANA 向区域互联网注册机构 (Regional Internet Registries, RIRs)分发了 `/8` (1600 万个地址)，每个州有自己的 RIR，目前总共有五个 RIR。

> - 美洲互联网号码注册管理机构（American Registry for Internet Numbers，ARIN）管理北美、南极洲和部分加勒比地区事务
> - 欧洲IP网络资源协调中心（RIPE Network Coordination Centre，RIPE NCC）管理欧洲、中东和中亚地区事务
> - 亚太网络信息中心（Asia-Pacific Network Information Centre，APNIC）管理亚洲和太平洋地区事务
> - 拉丁美洲及加勒比地区互联网地址注册管理机构（Latin American and Caribbean Internet Address Registry，LACNIC）管理拉丁美洲和部分加勒比地区事务
> - 非洲网络信息中心（African Network Information Centre，AfriNIC）管理非洲事务

## Longest Prefix Match

路由器通过转发表决定转发数据包的链路，当数据包到达时，路由器会在转发表找到和该地址最匹配的条目，并以此决定转发链路。

最长前缀匹配 (Longest Prefix Match, LPM)是 IP 路由用来决定转发地址的算法。

## ARP, Address Resolution Protocol

ARP 协议是网络层使用，用于发现与其直连的网络地址的 link 地址。设备自己有 IP 地址，但是它需要将数据报发送到哪个 link 上，ARP 协议解决了这个问题。每一层服务都有每一层用于标识的地址，IP 是网络层的地址，而 link 地址标示了特定的网卡，例如，Ethernet 地址是 48 bit。

48 bit 的 Ethernet 地址以冒号分隔的 6 个组形式写入，例如: `0:18:e7:f3:ce:1a`。

假设下面这个场景:

![ARP协议图一](/img/CS144/gateway.png)

中间的网关有两个网卡，分别连 A 和 B 两个主机。网关本身就是位于 A 所属的这部分网络中，但网关在只有一个 IP 地址的情况下无法正常工作。所以网卡或路由器具有多个接口，也就具有多个 IP 地址。

![ARP协议图二](/img/CS144/new_gateway.png)

假设 A 要向 B 发送数据包。首先判断目的地是否和自己处于同一网络内，网络掩码会表明这一点。
所以 A 需要通过网关来发包，该数据报网络层目标是 `171.43.22.5`，但链路层的目标为网关的地址 `0:18:e7:f3:ce:1a`。当网关收到数据报后，网关会为它的下一跳确定为节点 B，然后将其放到 B 的链路层帧中。

这里存在一个问题，A 知道需要通过 `192.168.0.1` 的网关发送数据包，所以它需要有和 `192.168.0.1` 关联的 link 地址，但如何获取这个地址。

这里通过一种方式将网络层地址映射到其对应的链路层地址。这里使用的就是 ARP 协议执行此操作。

ARP 是一种简单的 "request-reply" 的协议。

每个节点都保留在网络中 IP 地址到链路层地址映射的缓存，如果节点需要将数据报发送到它没有映射的 IP 地址，就需要发送一个请求，内容类似 “谁的 IP 地址是 XXX”，对应 IP 地址的节点再给出回应“我是这个地址”，这个回应就带着链路层地址。收到这个回复后，节点就可以建立映射缓存并发包。一个节点发出请求，网络中的每个节点都会收到该数据包。

ARP 请求时包含请求者的 IP 地址和链路层地址，以便于收到的一方可以插入或更新自己的映射缓存。这种映射缓存保存的时间取决于其操作系统。

![ARP协议图](/img/CS144/arp_protocal.png)

- Hardware: 此请求或响应应用于哪个链路层
- Protocol: 此请求或响应针对的网络协议
- opcode: 该数据报是请求还是响应
- length 指长度，比如 Ethernet 48 bit 长度就是 6，而 IPV4 地址长度则是 4。

这些字段都会以大端字节序来存储。

最开始 ARP 规范认为回应者应该单播发给请求者，但现在广播更加普遍。
