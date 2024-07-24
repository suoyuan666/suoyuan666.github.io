---
title: "CS144-2024-lab_1: stitching substrings into a byte stream"
author: suo yuan
pubDatetime: 2024-07-24T00:17:57Z
featured: false
draft: false
tags:
  - CS144_lab
description: "CS144 课程 Lab Assignment 中的  Checkpoint 1: stitching substrings into a byte stream"
---

# CS144-2024-lab_1: stitching substrings into a byte stream

> As part of the lab assignment, you will implement a TCP receiver: the module that receives datagrams and turns them into a reliable byte stream to be read from the socket by the application—just as your webget program read the byte stream from the webserver in Checkpoint 0
>
> 作为实验任务的一部分，你将实现一个 TCP 接收器：接收数据报并将其转化为可靠字节流的模块，以便应用程序从 socket 中读取--就像你的 webget 程序在 Checkpoint 0 中从网络服务器读取字节流一样。

在 `Reassembler` 类中添加下面这些字段:

```cpp
  std::unordered_map<uint64_t, char> buffer_ {};
  uint64_t used_index {0};
  uint64_t wcount_ {0};
  bool fetch_last {false};
  uint64_t max_length {0};
```

对于 `insert()` 和 `bytes_pending()` 的实现:

```cpp
void Reassembler::insert( uint64_t first_index, string data, bool is_last_substring )
{
  auto& write = output_.writer();
  const auto& available_capacity = write.available_capacity();
  if (available_capacity == 0) {
    return;
  }

  const auto &dlen = static_cast<int>(data.length());
  for (auto i = 0; i < dlen; ++i){
    const auto index = first_index + i;
    if (buffer_.contains(index)) {
      continue;
    }
    if (index < used_index + available_capacity) {
      buffer_.insert({index, data.at(i)});
      wcount_ += 1;
    }
  }

  if (is_last_substring) {
    fetch_last = true;
    max_length = first_index + dlen;
  }

  std::string str {};
  for (; buffer_.contains(used_index); ++used_index ) {
    str.push_back(std::move(buffer_.at(used_index)));
    --wcount_;
  }
  write.push(std::move(str));
  if (fetch_last && used_index == max_length) {
    buffer_.clear();
    write.close();
  }
}

uint64_t Reassembler::bytes_pending() const
{
  return wcount_;
}
```

不过这样得不到太高的速度，我等下次尝试优化一下吧（逃

```bash
$ cmake --build build -j`nproc` --target check1
Test project /home/zuos/codPjt/Cpp/minnow/build
Connected to MAKE jobserver
      Start  1: compile with bug-checkers
 1/17 Test  #1: compile with bug-checkers ........   Passed    2.79 sec
      Start  3: byte_stream_basics
 2/17 Test  #3: byte_stream_basics ...............   Passed    0.01 sec
      Start  4: byte_stream_capacity
 3/17 Test  #4: byte_stream_capacity .............   Passed    0.01 sec
      Start  5: byte_stream_one_write
 4/17 Test  #5: byte_stream_one_write ............   Passed    0.02 sec
      Start  6: byte_stream_two_writes
 5/17 Test  #6: byte_stream_two_writes ...........   Passed    0.01 sec
      Start  7: byte_stream_many_writes
 6/17 Test  #7: byte_stream_many_writes ..........   Passed    0.04 sec
      Start  8: byte_stream_stress_test
 7/17 Test  #8: byte_stream_stress_test ..........   Passed    0.26 sec
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
14/17 Test #15: reassembler_win ..................   Passed    6.99 sec
      Start 37: compile with optimization
15/17 Test #37: compile with optimization ........   Passed    1.80 sec
      Start 38: byte_stream_speed_test
             ByteStream throughput: 0.66 Gbit/s
16/17 Test #38: byte_stream_speed_test ...........   Passed    0.18 sec
      Start 39: reassembler_speed_test
             Reassembler throughput: 0.12 Gbit/s
17/17 Test #39: reassembler_speed_test ...........   Passed    1.19 sec

100% tests passed, 0 tests failed out of 17

Total Test time (real) =  13.40 sec
Built target check1
```
