---
title: "CS144-2024-lab_1: stitching substrings into a byte stream"
author: suo yuan
date: 2024-07-24T00:17:57Z
draft: false
tags:
  - CS144_lab
description: "CS144 课程 Lab Assignment 中的  Checkpoint 1: stitching substrings into a byte stream"
---

<!--more-->
CS144 课程 Lab Assignment 中的  Checkpoint 1: stitching substrings into a byte stream
<!--more-->

# CS144-2024-lab_1: stitching substrings into a byte stream

> As part of the lab assignment, you will implement a TCP receiver: the module that receives datagrams and turns them into a reliable byte stream to be read from the socket by the application—just as your webget program read the byte stream from the webserver in Checkpoint 0
>
> 作为实验任务的一部分，你将实现一个 TCP 接收器：接收数据报并将其转化为可靠字节流的模块，以便应用程序从 socket 中读取--就像你的 webget 程序在 Checkpoint 0 中从网络服务器读取字节流一样。

在 `Reassembler` 类中添加下面这些字段:

```cpp
  std::deque<char> buffer_ {};
  std::deque<bool> buf_enable_ {false};
  uint64_t used_index_ {0};
  uint64_t wcount_ {0};
  bool fetch_last_ {false};
  uint64_t max_length_ {0};
```

对于 `insert()` 和 `bytes_pending()` 的实现:

```cpp
void Reassembler::insert( uint64_t first_index, string data, bool is_last_substring )
{
  const auto limit = std::min( data.size(), used_index_ + output_.writer().available_capacity() - first_index );

  if (buffer_.size() < first_index + limit) {
    buffer_.resize(first_index + limit);
    buf_enable_.resize(first_index + limit);
  }

  for ( uint64_t i = 0; i < limit; ++i ) {
    if (buf_enable_.at(first_index + i)) {
      continue;
    }
    buffer_[first_index + i] = data.at(i);
    buf_enable_[first_index + i] = true;
    wcount_ += 1;
  }

  if ( is_last_substring ) {
    fetch_last_ = true;
    max_length_ = first_index + data.size();
  }
  for (; used_index_ < buf_enable_.size() && buf_enable_.at(used_index_); ++used_index_) {
    output_.writer().push( std::string { buffer_.at( used_index_ ) } );
    --wcount_;
  }
  if ( fetch_last_ && used_index_ == max_length_ ) {
    buffer_.clear();
    buf_enable_.clear();
    output_.writer().close();
  }
}

uint64_t Reassembler::bytes_pending() const
{
  return wcount_;
}
```

~~不过这样得不到太高的速度，我等下次尝试优化一下吧（逃~~

我就是 C++ 菜狗，优化也优化不了什么，换了个数据结构，一开始用 `std::unordered_map<uint64_t, char>`，查找很方便，但是插入擦除貌似就不是很行了，我选择用了 `std::deque<char>` 和 `std::deque<bool>` 来代替，需要一个 bool 类型的 `std::deque<>` 是因为我为了让插入字符的位置就是该字符实际的索引位置，直接 `resize` 放大 buffer 的大小，我想通过 `std::deque<bool> buf_enable_` 标示一下哪个位是真实有效的，哪个是还没有值的。

```bash
$ cmake --build build -j`nproc` --target check1
Test project /home/zuos/codPjt/Cpp/minnow/build
Connected to MAKE jobserver
      Start  1: compile with bug-checkers
 1/17 Test  #1: compile with bug-checkers ........   Passed    0.17 sec
      Start  3: byte_stream_basics
 2/17 Test  #3: byte_stream_basics ...............   Passed    0.01 sec
      Start  4: byte_stream_capacity
 3/17 Test  #4: byte_stream_capacity .............   Passed    0.01 sec
      Start  5: byte_stream_one_write
 4/17 Test  #5: byte_stream_one_write ............   Passed    0.01 sec
      Start  6: byte_stream_two_writes
 5/17 Test  #6: byte_stream_two_writes ...........   Passed    0.01 sec
      Start  7: byte_stream_many_writes
 6/17 Test  #7: byte_stream_many_writes ..........   Passed    0.04 sec
      Start  8: byte_stream_stress_test
 7/17 Test  #8: byte_stream_stress_test ..........   Passed    0.25 sec
      Start  9: reassembler_single
 8/17 Test  #9: reassembler_single ...............   Passed    0.01 sec
      Start 10: reassembler_cap
 9/17 Test #10: reassembler_cap ..................   Passed    0.01 sec
      Start 11: reassembler_seq
10/17 Test #11: reassembler_seq ..................   Passed    0.01 sec
      Start 12: reassembler_dup
11/17 Test #12: reassembler_dup ..................   Passed    0.02 sec
      Start 13: reassembler_holes
12/17 Test #13: reassembler_holes ................   Passed    0.01 sec
      Start 14: reassembler_overlapping
13/17 Test #14: reassembler_overlapping ..........   Passed    0.01 sec
      Start 15: reassembler_win
14/17 Test #15: reassembler_win ..................   Passed    5.40 sec
      Start 37: compile with optimization
15/17 Test #37: compile with optimization ........   Passed    0.11 sec
      Start 38: byte_stream_speed_test
             ByteStream throughput: 0.59 Gbit/s
16/17 Test #38: byte_stream_speed_test ...........   Passed    0.19 sec
      Start 39: reassembler_speed_test
             Reassembler throughput: 0.30 Gbit/s
17/17 Test #39: reassembler_speed_test ...........   Passed    0.50 sec

100% tests passed, 0 tests failed out of 17

Total Test time (real) =   6.78 sec
Built target check1
```

后来我换成 clang++ 编译，速度还有所提升

```bash
$ cmake --build build -j`nproc` --target check1
Test project /home/zuos/codPjt/Cpp/minnow/build
Connected to MAKE jobserver
      Start  1: compile with bug-checkers
 1/17 Test  #1: compile with bug-checkers ........   Passed    0.19 sec
      Start  3: byte_stream_basics
 2/17 Test  #3: byte_stream_basics ...............   Passed    0.01 sec
      Start  4: byte_stream_capacity
 3/17 Test  #4: byte_stream_capacity .............   Passed    0.02 sec
      Start  5: byte_stream_one_write
 4/17 Test  #5: byte_stream_one_write ............   Passed    0.02 sec
      Start  6: byte_stream_two_writes
 5/17 Test  #6: byte_stream_two_writes ...........   Passed    0.01 sec
      Start  7: byte_stream_many_writes
 6/17 Test  #7: byte_stream_many_writes ..........   Passed    0.04 sec
      Start  8: byte_stream_stress_test
 7/17 Test  #8: byte_stream_stress_test ..........   Passed    0.20 sec
      Start  9: reassembler_single
 8/17 Test  #9: reassembler_single ...............   Passed    0.01 sec
      Start 10: reassembler_cap
 9/17 Test #10: reassembler_cap ..................   Passed    0.01 sec
      Start 11: reassembler_seq
10/17 Test #11: reassembler_seq ..................   Passed    0.01 sec
      Start 12: reassembler_dup
11/17 Test #12: reassembler_dup ..................   Passed    0.02 sec
      Start 13: reassembler_holes
12/17 Test #13: reassembler_holes ................   Passed    0.01 sec
      Start 14: reassembler_overlapping
13/17 Test #14: reassembler_overlapping ..........   Passed    0.01 sec
      Start 15: reassembler_win
14/17 Test #15: reassembler_win ..................   Passed    4.12 sec
      Start 37: compile with optimization
15/17 Test #37: compile with optimization ........   Passed    0.10 sec
      Start 38: byte_stream_speed_test
             ByteStream throughput: 0.72 Gbit/s
16/17 Test #38: byte_stream_speed_test ...........   Passed    0.16 sec
      Start 39: reassembler_speed_test
             Reassembler throughput: 0.35 Gbit/s
17/17 Test #39: reassembler_speed_test ...........   Passed    0.43 sec

100% tests passed, 0 tests failed out of 17

Total Test time (real) =   5.36 sec
Built target check1
```
