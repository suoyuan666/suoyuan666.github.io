---
title: "TCP & UDP & ICMP"
author: suo yuan
pubDatetime: 2024-07-26T00:01:22Z
draft: false
categories:
  - 刷课笔记
tags:
  - CS144_notes
description: "CS114 课程的课程笔记"
---

<!--more-->
CS114 课程的课程笔记
<!--more-->

## TCP 服务

TCP (Transmission Control Protocol4) 提供了 可靠的，端到端的，双向的字节流服务。TCP 是传输层的协议。

将两个主机之间的 TCP 通信称为连接 (connection)。在连接的两端，TCP 会保留一个状态机去跟踪连接在做什么。

A 主机和 B 主机需要三次握手后建立 TCP 连接。

1. A 向 B 发送一条信息表示 A 处的 TCP 层 希望和 B 建立连接，该消息称为 SYN 消息。因为 A 还会发送其将用来识别字节流中的字节的基数，如果发送 0 ，表示将会从 0 开始。
2. B 会回复一个 SYN-ACK，B 发出 SYN 信号，因为 B 确认 A 的请求并同意建立连接。B 的 TCP 层还会发送一个 SYN 给 A，以表示它希望建立连接，并且发送一个数字以表明字节流起始编号。
3. A 回复一个 ACK，表示它正在接收通信请求。

当 A 和 B 完成相互之间的数据发送之后，它们需要关闭连接，并在之后都开始清理与状态机关联的状态。

1. A 上的 TCP 层可以通过发送 FIN 信息以关闭连接。
2. B 确认 A 不再有要发送的数据，并停止从 A 中获取数据。
   - 但 B 可能仍有新数据要发送，并且还没有准备管理连接，所以回复的 ACK 还可以将新数据从 B 发送到 A。B 可以一致向 A 发送新数据。
   - 等 B 把数据都发送完了，就发送自己的 FIN 给 A。
3. A 再发送一个 ACK 进行确认，以确认连接现已关闭。

现在就是正式关闭，状态也可以安全移除。

通过以下四个方式保证了可靠地发送:

1. 当 TCP 层接收到数据时，它将确认 ACK 给发送方使其知道数据已送达。
2. checksum 检测损坏的数据，TCP header 带有一个 checksum，覆盖了报头和内部的数据，以检测在途中是否存坏。
3. 序列号检测丢失的数据，每个段的 header 都包含字节序列中的序列号。例如双方都同一序列号从 1000 开始，则第一个段的序号就是 1000，如果这个段有 500 字节数据，那下一个段的序列号应该是 1500。
   - 如果段丢失，就能通过序列号发现，这时候就需要发送方重发数据。
4. 流量控制以防止接收器超速运行。
   - 防止 A 发包速度比 B 处理快多了，B 处理不过来的情况。
   - 在 TCP 中，接收方不断询问发送方是否可以继续发送，也就是告诉发送方其缓冲区并还有多少空间可以接收新数据。

TCP 按照正确的顺序将数据传送到应用程序。

TCP 会尝试平衡所有 TCP 连接之间的网络容量，也就是 Congestion Control。

- Flag
  - ACK, 确认序列号有效
  - SYN, 正在发送同步信号，这是三次握手的一部分
  - FIN, 表示连接一个方向的关闭
  - PSH, 告诉另一端 TCP 立即传送数据，而不是等待更多的数据
    - 对于携带与时间相关的数据（比如按键）来说有用

## UDP 服务

UDP (User Datagram Protocol)并不保证可靠的到达，只提供简单的送达功能。

使用 IPV4 时，UDP 数据包中 checksum 字段是可选的，可以全为 0 表示不包含该字段。checksum 还会包含 IP
数据包中的一些信息，如源地址，目的地址，协议 ID 等。这违反了分层原理，这是为了允许 UDP 检测传递到错误地址的数据包。

UDP 不需要先建立连接，可以直接发包，所以更适合那些简单的请求-应答的服务，比如 DNS, DHCP, NTP 等。

## ICMP 服务

ICMP (Internet Control Message Protocol) 用于报错以及诊断问题。

- 在主机间传达有关网络层的信息
- 报告错误，并帮助诊断错误

ICMP位于 IP 之上，是一种传输层协议，并不可靠，它没有重发，也不会保留消息的状态。

假设 A 向 B 发包，但是路由器找不到 B，就会发送一个 ICMP 包给 A 表示找不到。

路由器会将 IP 数据报中的header 放到自己的 header 中。之后加上类型和 code 以标记错误。最后将这些放到新的 IP 数据报中。

- ping
  - ping 直接调用 ICMP，它发送 ICMP 回显请求。ping 了对方后，对方也会发送一个 ICMP 回来。
- tarceroute
  - traceroute 的目标是在 A 到 B 的路径中找到路由器，并测量从 A 到每个路由器的数据包的往返时间
  - 这是通过 UDP 实现的。
    - A 发送 UDP 信息，并且这个 IP 数据报的 TTL 是 1，第一个路由器收到后递减 TTL 直接到 0，就会丢包，然后发回一个 ICMP 信息以通知 TTL 过期。这时就可以知道第一个路由器的信息，并且还可以测量时间。
    - 之后再发送一个 TTL 为 2 的数据报，以此类推。
    - 并且这个 UDP 包会请求对方的一个不太可能使用的端口，以让对方也是发送一个 ICMP 回来表示该端口无法访问。

## 端到端原则

1984 年， Saltzer, Reed, and Clark paper 的一篇文章指出：端到端原则指的是网络虽然可以完成更多的事情，但只是帮助，不能完全依靠网络，尽可能由终端主机实现功能。

在 IETF 的 [RFC 1958](https://www.rfc-editor.org/rfc/rfc1958#page-3) 中有更简短的描述：网络的工作就是尽可能高效灵活地传输数据包，除此之外的工作都应该在主机上实现。
