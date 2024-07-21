---
title: "CS144-2024-lab_0: networking warmup"
author: suo yuan
pubDatetime: 2024-07-21T01:21:25
featured: false
draft: false
tags:
  - CS144_lab
description: "CS144 课程 Lab Assignment 中的  Checkpoint 0: networking warmup"
---

# CS144-2024-lab_0: networking warmup

## 环境搭建

官方给出了四种环境方式，由于我本机就是 Arch Linux。第一个 lab 我是用的自己的本机做的。我安装了一个 Debian 12 的虚拟机，我准备用那个虚拟机做后续需要用到虚拟机的 lab。

也比较简单，装完后执行以下下述命令装一些必要的软件即可:

```bash
$ sudo apt update && sudo apt install git cmake gdb build-essential clang \
clang-tidy clang-format pkg-config glibc-doc tcpdump tshark clangd
```

我这里去掉了 `gcc-doc`，因为当初安装提示没有这个软件包，而且我也没认识到特地本机装 `GCC` 的文档的意义何在，我还加了 `clangd`，因为我习惯用 `clangd` 了。

## Networking by hand

`telnet` 过去之后最好把 `GET /hello HTTP/1.1` 这些直接粘贴过去，自己手敲容易超时导致断开连接。

我只尝试了 `telnet cs144.keithw.org http`

## Writing webget

```cpp
void get_URL( const string& host, const string& path )
{
  string raw =  "GET " + path + " HTTP/1.1\r\n" +
                "Host: " + host + "\r\n" +
                "Connection: close\r\n\r\n";
  Address addr{host, "http"};
  TCPSocket tcosocket{};
  tcosocket.connect(addr);
  if (tcosocket.write(raw) != raw.length()) {
    cerr << "write error\n";
  }
  while (!tcosocket.eof()) {
    string rs{""};
    tcosocket.read(rs);
    cout << rs;
  }
}
```

我这么写总感觉有些问题。

之前 `raw` 最后两个 `\r\n`，我只有一个，每次都是 408 超时，后来再这样加一个换行就没事了，难绷。

## An in-memory reliable byte stream

首先在 **byte_stream.hh** 中多定义几个字段和函数，最后 `ByteStream` 类是这样:

```cpp
class ByteStream
{
public:
  explicit ByteStream( uint64_t capacity );
  ByteStream& operator=(const ByteStream& val);
  ByteStream(ByteStream& val);
  ByteStream& operator=(ByteStream&& val);
  ByteStream(ByteStream&& val);

  // Helper functions (provided) to access the ByteStream's Reader and Writer interfaces
  Reader& reader();
  const Reader& reader() const;
  Writer& writer();
  const Writer& writer() const;

  void set_error() { error_ = true; };       // Signal that the stream suffered an error.
  bool has_error() const { return error_; }; // Has the stream had an error?

protected:
  // Please add any additional state to the ByteStream here, and not to the Writer and Reader interfaces.
  uint64_t capacity_;
  uint64_t wcount_ {0};
  uint64_t rcount_ {0};
  std::deque<char> buffer_ {};
  bool closeed_ {false};
  bool error_ {};
};
```

这里特地加了复制移动那些函数，是因为测试用例需要用，要不是编译报错，我也没想到需要写（逃。

在 **byte_stream.cc** 中实现那些函数:

```cpp
#include "byte_stream.hh"
#include <cstdint>
#include <string>
#include <string_view>

using namespace std;

ByteStream::ByteStream( uint64_t capacity ) : capacity_( capacity ) {}

ByteStream::ByteStream( ByteStream& val )
  : capacity_( val.capacity_ )
  , wcount_( val.wcount_ )
  , rcount_( val.rcount_ )
  , buffer_(val.buffer_)
  , closeed_( val.closeed_ )
{}

ByteStream& ByteStream::operator=(const ByteStream& val) {
  this->capacity_ = val.capacity_;
  this->buffer_ = val.buffer_;
  this->wcount_ = val.wcount_;
  this->rcount_ = val.rcount_;
  this->closeed_ = val.closeed_;
  return *this;
}

ByteStream::ByteStream(ByteStream&& val )
  : capacity_( std::move(val.capacity_) )
  , wcount_( std::move(val.wcount_) )
  , rcount_( std::move(val.rcount_) )
  , buffer_(std::move(val.buffer_))
  , closeed_( std::move(val.closeed_) )
{}

ByteStream& ByteStream::operator=(ByteStream&& val) {
  this->capacity_ = std::move(val.capacity_);
  this->buffer_ = std::move(val.buffer_);
  this->wcount_ = std::move(val.wcount_);
  this->rcount_ = std::move(val.rcount_);
  this->closeed_ = std::move(val.closeed_);
  return *this;
}

bool Writer::is_closed() const
{
  return closeed_;
}

void Writer::push( string data )
{
  if (is_closed() || has_error()) {
    return;
  }

  if (data.length() > available_capacity()) {
    data.erase(available_capacity(), data.size() - available_capacity());
  }
  for (auto c : data) {
    buffer_.emplace_back(c);
  }
  wcount_ += data.length();
}

void Writer::close()
{
  closeed_ = true;
}

uint64_t Writer::available_capacity() const
{
  return capacity_ - (wcount_ - rcount_);
}

uint64_t Writer::bytes_pushed() const
{
  return wcount_;
}

bool Reader::is_finished() const
{
  return closeed_ && (wcount_ == rcount_);
}

uint64_t Reader::bytes_popped() const
{
  return rcount_;
}

string_view Reader::peek() const
{
  return {&buffer_.front(), 1};
}

void Reader::pop( uint64_t len )
{
  buffer_.erase(buffer_.begin(), buffer_.begin() + len);
  rcount_ += len;
}

uint64_t Reader::bytes_buffered() const
{
  return wcount_ - rcount_;
}
```

`push` 的实现还是有些丑陋了，但我一时间也不知道怎么改了。

## 测评

```bash
$ cmake --build build --target check0
Test project /home/zuos/codPjt/Cpp/minnow/build
Connected to MAKE jobserver
      Start  1: compile with bug-checkers
 1/10 Test  #1: compile with bug-checkers ........   Passed    0.93 sec
      Start  2: t_webget
 2/10 Test  #2: t_webget .........................   Passed    2.25 sec
      Start  3: byte_stream_basics
 3/10 Test  #3: byte_stream_basics ...............   Passed    0.01 sec
      Start  4: byte_stream_capacity
 4/10 Test  #4: byte_stream_capacity .............   Passed    0.01 sec
      Start  5: byte_stream_one_write
 5/10 Test  #5: byte_stream_one_write ............   Passed    0.01 sec
      Start  6: byte_stream_two_writes
 6/10 Test  #6: byte_stream_two_writes ...........   Passed    0.01 sec
      Start  7: byte_stream_many_writes
 7/10 Test  #7: byte_stream_many_writes ..........   Passed    0.04 sec
      Start  8: byte_stream_stress_test
 8/10 Test  #8: byte_stream_stress_test ..........   Passed    0.26 sec
      Start 37: compile with optimization
 9/10 Test #37: compile with optimization ........   Passed    0.74 sec
      Start 38: byte_stream_speed_test
             ByteStream throughput: 0.61 Gbit/s
10/10 Test #38: byte_stream_speed_test ...........   Passed    0.19 sec

100% tests passed, 0 tests failed out of 10

Total Test time (real) =   4.44 sec
Built target check0
```
