---
title: "TCP 的错误检测 & 流量控制 & 状态转换"
author: suo yuan
pubDatetime: 2024-08-12T22:28:09Z
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

# TCP 的错误检测 & 流量控制 & 状态转换

## 错误检测

通常使用三种检测手段：校验和，循环冗余码CRC和消息认证码。例如，Ethernet 附加循环冗余码，TLS 附加消息认证，IP 附加校验和

- 校验和
  - 计算快速，由软件做校验和运算也不会有太大的消耗
  - 并不可靠，如果两个错误的码相互抵消，比如一个位错误地加 2，另一个位错误地减 2，校验和就捕获不到这个错误。
- CRC
  - 很多链路层会使用，计算代价更加大
  - 比校验和更可靠
  - 一般来说，链路层使用了 CRC，TCP/IP 甚至可以不使用校验和，n 位的 CRC 可以检测任何小于等于 n 位长度的错误。
- 消息验证码 (message authentication code，MAC)
  - 就是消息摘要算法
  - TLS 使用
  - 很可靠，但不容易排错

### 校验和

IP，TCP，UDP 都使用补码校验和，一些较老一些的计算机使用的是二进制算数版本。

将校验和字段设为 0，后取数据包的 16 bit 相加，0x8000 + 0x8000 = 0x0001。最后取反，如果结果为 0xffff，那就不取反，直接用 0xffff。0 表示没有校验和。

校验的时候是将校验和和数据都再加一次，看看是不是 0xffff。

早期 Internet 通过软件实现校验和

### CRC

如果是 n 为的数据，需要以某种方式分成 c 为错误检测数据，c 比 n 小得多。

如果有 1500 字节的 Ethernet 就携带 4 字节 32 bit CRC，USB 和蓝牙使用 16 bit。

CRC 无法检测所有错误，有 $2^{-c}$ 几率无法检测到。例如对于 8 bit的 CRC 而言，两个不同的数据的 CRC 相同的概率就是 $\frac{1}{256}$，即 0.4%。

对于一个多项式 M，其每一位都是 1 的系数，即 `M = 1001 = x^4 + 1`。

当计算 CRC 时，需要使用 CRC 算法定义的生成多项式 G。例如 CRC-16 算法的生成多项式 0x8005 = x^16 + x^15 + x^2 + 1。由于历史原因，生成多项式的比其位数长一位（其第一项始终为 1）。

计算 CRC：获许消息 M，用 CRC 长度的 0 填充它，将这个值和 G 相除，其余数就是 CRC。将 CRC 附加到消息上，得到 M' = M + CRC。如果 M' 和 G 的余数是 0，则通过测试。

### MAC

1. 不同长度的输入，产生固定长度的输出
2. 散列后的密文不可逆
3. 散列后的结果唯一（不太严谨）
4. 哈希碰撞
5. 一般用于检验数据完整性（签名sign）
6. 消息摘要算法也叫单向散列函数、哈希函数

MAC 和其他消息摘要算法（如 MD5，SHA256 等）不同的是多了一个密钥。

## 流量控制

流量控制要解决通信双方处理数据包的速度不一致的问题。最简单的就是 stop and wait，但现在都会选择 sliding window。

### stop and wait

就是发送方发一个就等待这个包的 ack，超时了就重发。

### sliding window

sliding window 就是维护一个 window，window size 就是一次性能发送或接收的数据包的数量。

并且可以只发一个 ack 包确认发送的所有数据包。

超时重发有两种选择:

- window 里的包全部重发
- 只重发第一个

如果接收方的 window size 为 1 的话，就需要全部重发，因为接收方没有缓存。一般发送的量不多的时候会选择全部重发的策略。

## TCP header

![tcp header](/img/CS144/tcp_header.png)

- window
  告诉对方自己的 window size
- Flags
  - U
    - 表明该数据应该优先被处理
  - P
    - 表明应该立即将已接收的数据传递给应用程序，而不是等待缓冲区填满
  - A,R,S,F
    - ack, reset, syn, fin
- offset
  - tcp header 的长度
- padding
  - 帮助 header 对齐

## TCP 状态图

![TCP状态图](/img/CS144/Tcp_state_diagram_fixed.svg)

> 图片来自 https://en.wikipedia.org/wiki/File:Tcp_state_diagram_fixed.svg

蓝色的线表示服务器，红色的是客户端。

服务器打开就进入 `LISTEN` 状态，关闭就回到 `CLOSED` 状态

客户端先发送 SYN 进入 `SYN SENT` 状态，服务器收到后发送 SYN ACK 进入 `SYN RECEIVED` 状态。

客户端收到了 SYN ACK 再发送 ACK 并进入 `ESTABLISHED` 状态，服务器收到了 ACK 包后也会进入这个状态，自此双方建立连接。

但同时还有一种路径，就是虚线那条，服务器 `LISENSE` 状态可以主动发 SYN 包，客户端处于 `SYN SENT` 状态收到后再向服务器发送一个 `SYN ACK` 包，这样是双方都发送了 SYN，并收到了对方的 ACK。

下面的就是关于连接的关闭，服务器收到 FIN 之后回一个 ACK，服务器这里需要把数据发送完后 close，之后再发送 FIN。

客户端这里 close 之后就发送一个 FIN，并且再收到 FIN-ACK 或者 FIN 的时候就开始清理资源准备 close，如果只收到了 ACK，表示对方数据还没发送完，则继续等待
