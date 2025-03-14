---
title: "CS144-2024-lab_3: the TCP sender"
author: suo yuan
pubDatetime: 2024-08-12T07:40:42Z
draft: false
categories:
  - 刷课_Lab
tags:
  - CS144_lab
description: "CS144 课程 Lab Assignment 中的 Checkpoint 3: the TCP sender"
---

<!--more-->
CS144 课程 Lab Assignment 中的 Checkpoint 3: the TCP sende
<!--more-->

# CS144-2024-lab_3: the TCP sender

> This week, you’ll implement the “sender” part of TCP, responsible for reading from a ByteStream (created and written to by some sender-side application), and turning the stream into a sequence of outgoing TCP segments. On the remote side, a TCP receiver transforms those segments (those that arrive—they might not all make it) back into the original byte stream, and sends acknowledgments and window advertisements back to the sender.
>
> 本周，您将实现 TCP 的 sender 部分，负责从字节流（由某个 sender 应用程序创建和写入）中读取数据，并将该流转换为一系列传出的 TCP 段。在远程端，TCP receiver 将这些段（到达的段 — 它们可能不会全部到达）转换回原始字节流，并将 ack 和 window 发送回 sender。

它说了一长串要求，大致翻译过来是这样:

- 跟踪 receiver 的 window （接收传入的 `TCPReceiverMessage` 及其 ackno 和 window size）
- 从 `ByteStream` 读取数据，创建新的 TCPSenderMessage（如果需要，包括 SYN 和 FIN 标志）并发送它们。 sender 应继续发送段，直到 window 已满或 `ByteStream` 没有更多内容可发送。
- 跟踪哪些段已发送但尚未被 receiver 确认——我们称这些段为“未完成”( _outstanding_ )段
- 如果已发送了足够长的时间，但尚未得到确认，则重新发送未完成的段
- 每隔几毫秒，TCPSender 的 `tick()` 方法就会被调用，并带有一个参数，该参数告诉它自上次调用该方法以来已经过去了多少毫秒。使用它来跟踪 TCPSender 已存活的总毫秒数。请不要尝试从操作系统或 CPU 调用任何有关时间的函数—— `tick()` 是您了解时间流逝的唯一途径。这可以使事情保持确定性和可测试性。
- 构造 TCPSender 时，会为其提供一个参数，告知其重传超时 (RTO) 的初始值。RTO 是重新发送未完成的 TCP 段之前要等待的毫秒数。RTO 的值会随时间而变化，但初始值保持不变。起始代码将 RTO 的初始值保存在名为 `initial_RTO_ms` 的成员变量中。
- 您将实现 retransmission timer：可以在特定时间启动的警报，一旦 RTO 过去，警报就会响起。强调，这种时间流逝的概念来自于调用的 `tick()` 方法，而不是通过获取实际的时间。
- 每次发送包含数据的段（序列空间中的长度非零）时（无论是第一次还是重新传输），如果计时器未运行，则启动它，以便它在 RTO 毫秒后过期（对于 RTO 的当前值）。
- 当所有未完成的数据都得到确认后，停止 retransmission timer。
  - 重新传输 TCP receiver 尚未完全确认的最早（序列号最低）段。您需要将未完成的段存储在某个内部数据结构中，以便执行此操作。
  - 如果当前 window size 非零
    - 增加连续重传的次数，因为你刚刚重传了一些东西。你的 TCPConnection 将使用此信息来决定连接是否无望（连续重传次数过多）并需要中止
    - 将 RTO 的值加倍。这被称为“指数退避” (exponential backoff)——它会减慢糟糕网络上的重传速度，以避免进一步阻碍工作。
  - 重置 retransmission timer ，设置为 RTO 毫秒后过期（考虑到可能刚刚将 RTO 的值加倍）。
- 当 receiver 向 sender 发出确认成功收到新数据的确认消息时（确认消息所反映的绝对序列号比任何先前的确认消息都大）
  - 将 RTO 重新设置为其初始值。
  - 如果 sender 有任何未完成的数据，则重新启动重传计时器，以便它在 RTO 毫秒后过期（对于 RTO 的当前值）。
  - 将连续重传次数重置为零。

对于 `push()`:

- 要求 `TCPSender` 从出站字节流中填充 window ：它从流中读取并发送尽可能多的 `TCPSenderMessage`，注意 window 中要有可用空间。它通过调用提供的 `transmit()` 函数来发送它们。
- 您需要确保您发送的每个 `TCPSenderMessage` 都完全适合 receiver 的 window 。使每条单独的消息尽可能大，但不要大于`TCPConfig::MAX_PAYLOAD_SIZE`。
- 您可以使用 `TCPSenderMessage::sequence_length()` 方法来计算一个段占用的序列号总数。请记住，SYN 和 FIN 标志也各自占用一个序列号。
- 如果 window 大小为零该怎么办？
  - 如果 receiver 已宣布 window 大小为零，则 `push()` 应假装 window 大小为 1。 sender 最终可能会发送一个字节，该字节被 receiver 拒绝（并且不确认），但这也可能促使 receiver 发送新的确认段，其中显示其 window 中已打开更多空间。没有这个， sender 永远不会知道它被允许再次开始发送。这是您的实现在零大小 window 的情况下应该具有的唯一特殊情况行为。TCPSender 实际上不应该记住错误的 window 大小 1。特殊情况仅在 `push()` 中处理。另外，请注意，即使 window 大小为 1（或 20 或 200）， window 仍可能已满。满 window 与零大小 window 不同。

对于 `receive()`:

- `receive()` 接收一条 `TCPReceiverMessage`，消息传达了窗口的新左边界 (ackno) 和右边界 (ackno + window size)。 `TCPSender` 应检查其尚未确认的段集合，并移除所有已完全被确认的段 (即 ackno 大于该段中所有的序列号)。

对于 `tick()`:

- 返回自上次调用该方法以来过去的时间。sender 可能需要重新传输 outstanding segment；它可以调用 `transmit()` 函数来执行此操作。(提醒：请不要尝试在代码中使用现实世界中的有关时间的函数；时间流逝的唯一参考来自 `tick()` 中传递的自上次调用以来的参数)

对于 `make_empty_message()`:

- TCP sender 应该生成并发送一个长度为零的消息，同时正确设置序列号。这在某些情况下很有用，例如对端想要发送一个 TCPReceiverMessage（例如，因为它需要确认来自对端 sender 的某些内容）并且需要生成一个 TCPSenderMessage 与其配对时。
- 注意：像这样的段不占用任何序列号，因此不需要将其记录为“未确认”，并且不会被重传。

## 我的实现

在 **tcp_sender.hh** 中，给 `TCPSender` 添加一些成员变量

```cpp
  bool syn_send_ {false};
  bool fin_send_ {false};
  bool keep_rto_ {false};
  uint64_t re_try_count_ {0};
  uint64_t past_time_ {0};
  uint64_t count_c_ {0};
  std::optional<uint64_t> window_size_;
  std::list<struct msg_with_time> buffer_;
```

这里的 `struct msg_with_time` 是我自己定义的:

```cpp
struct msg_with_time {
  TCPSenderMessage msg;
  bool keep_rto;
};
```

`msg_with_time` 结构体中的 `keep_rto` 是用来处理 window size 为 0 的特殊情况，它们的 RTO 不应该翻倍，所以多了个 `keep_rto_` 和 `keep_rto`。

下面则是具体的实现:

```cpp
#include "tcp_sender.hh"
#include "tcp_config.hh"
#include "tcp_sender_message.hh"
#include "wrapping_integers.hh"
#include <algorithm>
#include <cstdint>
#include <deque>
#include <memory>
#include <optional>
#include <ranges>

using namespace std;

uint64_t TCPSender::sequence_numbers_in_flight() const
{
  return count_c_;
}

uint64_t TCPSender::consecutive_retransmissions() const
{
  return re_try_count_;
}

void TCPSender::push( const TransmitFunction& transmit )
{
  auto has_cap { false };
  if ( window_size_.has_value() ) {
    if ( window_size_.value() == 0 ) {
      window_size_ = 1;
      keep_rto_ = true;
    }
    if ( window_size_.value() > sequence_numbers_in_flight() ) {
      has_cap = true;
    }
  } else if ( sequence_numbers_in_flight() == 0 ) {
    has_cap = true;
  }

  if ( has_cap
       && ( ( input_.reader().bytes_buffered() > 0 )
            || ( input_.reader().bytes_buffered() == 0
                 && ( !syn_send_ || ( input_.writer().is_closed() && !fin_send_ )
                      || input_.reader().has_error() ) ) ) ) {

    auto limit = std::min( TCPConfig::MAX_PAYLOAD_SIZE, input_.reader().bytes_buffered() );
    if ( window_size_.has_value() ) {
      limit = std::min( limit, window_size_.value() - sequence_numbers_in_flight() );
    }

    const auto fill_enable
      = limit != 0 && window_size_.has_value() && window_size_.value() >= TCPConfig::MAX_PAYLOAD_SIZE;
    for ( auto i = fill_enable ? input_.reader().bytes_buffered() / limit : 0; ( fill_enable ? i > 0 : i == 0 );
          --i ) {
      uint64_t length { 0 };
      buffer_.push_back( { { isn_, false, {}, false, input_.reader().has_error() }, keep_rto_ } );

      if ( input_.reader().bytes_popped() == 0 && !syn_send_ ) {
        buffer_.back().msg.SYN = true;
        syn_send_ = true;
        ++length;
        ++count_c_;
      }

      while ( !input_.reader().has_error() && input_.reader().bytes_buffered() > 0 && length < limit ) {
        const auto& str_t = input_.reader().peek();
        buffer_.back().msg.payload += str_t;
        ++length;
        ++count_c_;
        input_.reader().pop( 1 );
      }

      if ( ( window_size_.has_value() ? window_size_.value() > sequence_numbers_in_flight() : limit == 0 )
           && input_.writer().is_closed() && !fin_send_ && input_.reader().bytes_buffered() == 0 ) {
        fin_send_ = true;
        buffer_.back().msg.FIN = true;
        ++length;
        ++count_c_;
      }

      isn_ = isn_ + length;
      transmit( buffer_.back().msg );
      if ( keep_rto_ ) {
        keep_rto_ = false;
      }
    }
  }
}

TCPSenderMessage TCPSender::make_empty_message() const
{
  return { isn_, false, {}, false, input_.reader().has_error() };
}

void TCPSender::receive( const TCPReceiverMessage& msg )
{
  if ( msg.RST ) {
    input_.writer().set_error();
    return;
  }

  window_size_ = msg.window_size;

  if ( msg.ackno.has_value() ) {
    uint64_t length { 0 };
    std::deque<std::shared_ptr<Wrap32>> buf_col;
    for ( auto& val : std::ranges::reverse_view( buffer_ ) ) {
      if ( ( val.msg.seqno + length + val.msg.sequence_length() ) == msg.ackno.value() ) {
        buf_col.push_back( std::make_shared<Wrap32>( val.msg.seqno ) );
        length += val.msg.sequence_length();
      }
    }
    if (!buf_col.empty()) {
      past_time_ = 0;
    }
    for (const auto& val : buf_col) {
      buffer_.erase(std::find_if(buffer_.begin(), buffer_.end(), [&val](const struct msg_with_time& arg){
        return arg.msg.seqno == *val;
      }));
    }
    count_c_ -= length;
  }

  if ( re_try_count_ != 0 ) {
    initial_RTO_ms_ /= ( 2 * re_try_count_ );
  }
  re_try_count_ = 0;
}

void TCPSender::tick( uint64_t ms_since_last_tick, const TransmitFunction& transmit )
{
  past_time_ += ms_since_last_tick;
  for ( auto& val : buffer_ ) {
    if ( past_time_ >= initial_RTO_ms_ ) {
      past_time_ = 0;
      if ( !val.keep_rto ) {
        initial_RTO_ms_ *= 2;
        ++re_try_count_;
      }
      transmit( val.msg );
      break;
    }
  }
}
```

我承认我写的代码还是很难绷的，等有时间我再优化一下看看。

```bash
$ cmake --build build -j11 --target check3
[0/1] cd /home/zuos/codpjt/cpp/cs144_minnow_lab/build && /usr/bin/ctest...ure --timeout 12 -R '^byte_stream_|^reassembler_|^wrapping|^recv|^send'             ByteStream throughput: 0.65 Gbit/s
             Reassembler throughput: 0.33 Gbit/s
[1/1] cd /home/zuos/codpjt/cpp/cs144_minnow_lab/build && /usr/bin/ctest...ure --timeout 12 -R '^byte_stream_|^reassembler_|^wrapping|^recv|^send'
Test project /home/zuos/codpjt/cpp/cs144_minnow_lab/build
      Start  1: compile with bug-checkers
 1/36 Test  #1: compile with bug-checkers ........   Passed    2.60 sec
      Start  3: byte_stream_basics
 2/36 Test  #3: byte_stream_basics ...............   Passed    0.01 sec
      Start  4: byte_stream_capacity
 3/36 Test  #4: byte_stream_capacity .............   Passed    0.01 sec
      Start  5: byte_stream_one_write
 4/36 Test  #5: byte_stream_one_write ............   Passed    0.01 sec
      Start  6: byte_stream_two_writes
 5/36 Test  #6: byte_stream_two_writes ...........   Passed    0.01 sec
      Start  7: byte_stream_many_writes
 6/36 Test  #7: byte_stream_many_writes ..........   Passed    0.04 sec
      Start  8: byte_stream_stress_test
 7/36 Test  #8: byte_stream_stress_test ..........   Passed    0.20 sec
      Start  9: reassembler_single
 8/36 Test  #9: reassembler_single ...............   Passed    0.01 sec
      Start 10: reassembler_cap
 9/36 Test #10: reassembler_cap ..................   Passed    0.01 sec
      Start 11: reassembler_seq
10/36 Test #11: reassembler_seq ..................   Passed    0.02 sec
      Start 12: reassembler_dup
11/36 Test #12: reassembler_dup ..................   Passed    0.02 sec
      Start 13: reassembler_holes
12/36 Test #13: reassembler_holes ................   Passed    0.01 sec
      Start 14: reassembler_overlapping
13/36 Test #14: reassembler_overlapping ..........   Passed    0.01 sec
      Start 15: reassembler_win
14/36 Test #15: reassembler_win ..................   Passed    4.22 sec
      Start 16: wrapping_integers_cmp
15/36 Test #16: wrapping_integers_cmp ............   Passed    0.01 sec
      Start 17: wrapping_integers_wrap
16/36 Test #17: wrapping_integers_wrap ...........   Passed    0.01 sec
      Start 18: wrapping_integers_unwrap
17/36 Test #18: wrapping_integers_unwrap .........   Passed    0.01 sec
      Start 19: wrapping_integers_roundtrip
18/36 Test #19: wrapping_integers_roundtrip ......   Passed    0.46 sec
      Start 20: wrapping_integers_extra
19/36 Test #20: wrapping_integers_extra ..........   Passed    0.07 sec
      Start 21: recv_connect
20/36 Test #21: recv_connect .....................   Passed    0.01 sec
      Start 22: recv_transmit
21/36 Test #22: recv_transmit ....................   Passed    0.19 sec
      Start 23: recv_window
22/36 Test #23: recv_window ......................   Passed    0.01 sec
      Start 24: recv_reorder
23/36 Test #24: recv_reorder .....................   Passed    0.01 sec
      Start 25: recv_reorder_more
24/36 Test #25: recv_reorder_more ................   Passed    8.67 sec
      Start 26: recv_close
25/36 Test #26: recv_close .......................   Passed    0.01 sec
      Start 27: recv_special
26/36 Test #27: recv_special .....................   Passed    0.01 sec
      Start 28: send_connect
27/36 Test #28: send_connect .....................   Passed    0.01 sec
      Start 29: send_transmit
28/36 Test #29: send_transmit ....................   Passed    0.27 sec
      Start 30: send_retx
29/36 Test #30: send_retx ........................   Passed    0.01 sec
      Start 31: send_window
30/36 Test #31: send_window ......................   Passed    0.19 sec
      Start 32: send_ack
31/36 Test #32: send_ack .........................   Passed    0.01 sec
      Start 33: send_close
32/36 Test #33: send_close .......................   Passed    0.01 sec
      Start 34: send_extra
33/36 Test #34: send_extra .......................   Passed    0.09 sec
      Start 37: compile with optimization
34/36 Test #37: compile with optimization ........   Passed    0.80 sec
      Start 38: byte_stream_speed_test
35/36 Test #38: byte_stream_speed_test ...........   Passed    0.17 sec
      Start 39: reassembler_speed_test
36/36 Test #39: reassembler_speed_test ...........   Passed    0.45 sec

100% tests passed, 0 tests failed out of 36

Total Test time (real) =  18.68 sec
```
