---
title: "CS144-2024-lab_2: the TCP receiver"
author: suo yuan
date: 2024-07-29T22:02:52Z
draft: false
categories:
  - 刷课_Lab
tags:
  - CS144_lab
description: "CS144 课程 Lab Assignment 中的 Checkpoint 2: the TCP receive"
---

<!--more-->
CS144 课程 Lab Assignment 中的 Checkpoint 2: the TCP receive
<!--more-->

# CS144-2024-lab_2: the TCP receiver

## Translating between 64-bit indexes and 32-bit seqnos

> As a warmup, we’ll need to implement TCP’s way of representing indexes. Last week you created a Reassembler that reassembles substrings where each individual byte has a 64-bit stream index, with the first byte in the stream always having index zero. A 64-bit index is big enough that we can treat it as never overflowing. In the TCP headers, however, space is precious, and each byte’s index in the stream is represented not with a 64-bit index but with a 32-bit “sequence number,” or “seqno"
>
> 作为热身，我们需要实现 TCP 表示索引的方式。上周，您创建了一个 Reassembler，它可以重组子字符串，其中每个字节都有一个 64 位流索引，流中的第一个字节始终具有索引零。64 位索引足够大，我们可以将其视为永不溢出。然而，在 TCP 标头中，空间是宝贵的，流中每个字节的索引不是用 64 位索引表示的，而是用 32 位“序列号”或“seqno”表示的

```cpp
Wrap32 Wrap32::wrap( uint64_t n, Wrap32 zero_point )
{
  return Wrap32 { static_cast<uint32_t>(zero_point.raw_value_ + n) };
}

uint64_t Wrap32::unwrap( Wrap32 zero_point, uint64_t checkpoint ) const
{
  auto diff =  this->raw_value_ - zero_point.raw_value_;
  if (checkpoint >= diff) {
    auto rsm = checkpoint - diff + (1UL << 31);
    return diff + (rsm / (1UL << 32)) * (1UL  << 32);
  }
  return diff;
}
```

从 absolute seqno 转成 seqno 还是很简单的，一行就能处理。但是 seqno 转成 absolute seqno 需要做一些处理，因为 seqno 是 32 bit，所以 seqno 的值可能对应到 absolute seqno，可能大了几个 `UINT32_MAX`。

## Implementing the TCP receiver

> ongratulations on getting the wrapping and unwrapping logic right! We’ll shake your hand (or, post-covid, elbow-bump) if this victory happens at the lab session. In the rest of this lab, you’ll be implementing the TCPReceiver. It will (1) receive messages from its peer’s sender and reassemble the ByteStream using a Reassembler, and (2) send messages back to the peer’s sender that contain the acknowledgment number (ackno) and window size. We’re expecting this to take about 15 lines of code in total.>
> 恭喜您正确掌握了 wrap 和 unwrap 逻辑！如果在实验环节中取得这一胜利，我们将与您握手（或者，在疫情后，碰肘）。在本实验的其余部分，您将实现 TCPReceiver。它将 (1) 从其对等方的发送方接收消息并使用重组器重组字节流，以及 (2) 将包含确认号 (ackno) 和 window size 的消息发送回对等方的发送方。我们预计这总共需要大约 15 行代码。

我在 TCPReceiver 类中添加了几个成员变量:

```cpp
  TCPReceiverMessage curr_tcm_ {
    std::nullopt,
    static_cast<uint16_t>( writer().total_capacity() > UINT16_MAX ? UINT16_MAX : writer().total_capacity() ),
    false };
  Wrap32 zero_sno_ { 0 };
  uint64_t curr_sno_ { 0 };
```

我懒得修改代码提供的构造函数了，就直接在这里构造好得了，第二个写这么长是为了防止溢出。

之后 `TCPReceiver::receive()` 和 `TCPReceiver::send()` 的实现就是这样:

```cpp
void TCPReceiver::receive( TCPSenderMessage message )
{
  if ( message.RST ) {
    reader().set_error();
  }
  if ( message.SYN ) {
    curr_tcm_.ackno = message.seqno;
    zero_sno_ = message.seqno;
  }
  if ( curr_tcm_.ackno.has_value() ) {
    const auto buf_bytes_prev = writer().bytes_pushed();
    curr_sno_ = message.seqno.unwrap( zero_sno_, curr_sno_ );
    if ( !message.SYN && curr_sno_ == 0 && !message.payload.empty() ) {
      message.payload.clear();
    }
    if ( curr_sno_ != 0 ) {
      curr_sno_ -= 1;
    }
    reassembler_.insert( curr_sno_, message.payload, message.FIN );
    const auto buf_bytes_next = writer().bytes_pushed();
    curr_tcm_.ackno.value()
      = curr_tcm_.ackno.value() + static_cast<uint32_t>( message.SYN ) + ( buf_bytes_next - buf_bytes_prev );
    if ( writer().is_closed() ) {
      curr_tcm_.ackno.value() = curr_tcm_.ackno.value() + 1;
    }
  }
}

TCPReceiverMessage TCPReceiver::send() const
{
  return { curr_tcm_.ackno,
           static_cast<uint16_t>( writer().available_capacity() > UINT16_MAX ? UINT16_MAX
                                                                             : writer().available_capacity() ),
           reader().has_error() || writer().has_error() };
}
```

我看别人博客上提供的代码没有内部对非 SYN 且 sqno 为 0 且内容不为空做判定的，我这个显得还是太小家子气了，不过有个测试是这个，我这是为了过那个测试用的（

我说的是下面这个 if 判断:

```cpp
if ( !message.SYN && curr_sno_ == 0 && !message.payload.empty() ) {
  message.payload.clear();
}
```
