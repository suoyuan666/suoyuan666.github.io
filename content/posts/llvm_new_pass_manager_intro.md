---
title: "LLVM 初探: 2. LLVM New Pass Manager"
author: suo yuan
date: 2026-02-07T18:24:48Z
draft: false
tags:
  - LLVM
  - Compiler
categories:
  - LLVM 初探
description: "这是我学习 LLVM 开发的笔记，本篇是第二篇，简单介绍了如何使用 New Pass Manager 编写自己的 Pass"
summary: "这是我学习 LLVM 开发的笔记，本篇是第二篇，简单介绍了如何使用 New Pass Manager 编写自己的 Pass"
---

# LLVM 初探: 2. LLVM New Pass Manager

> 2026 年 2 月 10 日修改
>   - 找到了我自己编译的 LLVM 23.git 不可用的解决办法了
>   - 修改一些阅读起来有些困难的地方

[上一篇](../llvm_ir_intro/)我们简单了解了 LLVM IR，现在我来介绍 LLVM New Pass Manager，这是现在 LLVM 推行的 Pass 注册方式。

LLVM 的优化器部分会利用 New Pass Manager 把 LLVM IR 优化一遍，这里每个优化都叫一个 Pass，比如 [mem2reg](https://llvm.org/docs/Passes.html#mem2reg-promote-memory-to-register) 优化就属于一种 Pass，它将栈上局部变量（`alloca` 指令）提升为 SSA 虚拟寄存器，需要注意的是 mem2reg 只处理栈上的局部变量，不处理堆内存、全局变量等其他内存访问

Pass 总共分为三种

- Analysis Passes
    - 这里的 Pass 只是分析，比如 Basic Block 之间的先后流程分析，循环分析，别名分析等
    - 分析通常不会修改 IR，New Pass Manager 提供了缓存以方便后续重复获取分析结果
    - 缓存的分析结果可能因为 Transform Pass 修改 IR 而失效，这时需要重新计算
- Transform Passes
    - 指令替换，比如常量传播，死代码消除等等
    - 可能会修改 IR，需要在 Pass 结束时通过 `PreservedAnalyses` 告诉 LLVM 哪些分析结果仍然有效（后面会详细介绍）
    - 注意：Transform Pass 不一定总会修改 IR，在某些情况下可能什么都不做
- Utility Passes
    -  不属于上述分类都会划分到这里，一般用于调试等目的，比如打印 CFG

我来简单说一下 New Pass Manager 的好处，因为 New Pass Manager 又不是最近才出现的，我也没用过之前的 Legacy Pass Manager，所以就简单说一下。

New Pass Manager 相比 Legacy Pass Manager 的主要改进：
1. **按需拉取依赖**：Legacy PM 需要在 `getAnalysisUsage()` 中预先静态声明所有依赖的分析 Pass，而 NPM 改为在 `run()` 函数中通过 `FAM.getResult<AnalysisPass>()` 动态按需获取，只有真正需要时才会计算
2. **细粒度缓存失效**：Legacy PM 的缓存管理较为粗粒度，NPM 通过 `PreservedAnalyses` 可以精确标记哪些分析结果被保留，哪些需要重新计算
3. **统一的 Pass 接口**：都通过继承 `PassInfoMixin` 或 `AnalysisInfoMixin` 并实现 `run()` 方法，不再需要复杂的虚函数继承体系

接下来我会介绍一个简单的 Analysis 和 Transform Pass，我们会用一个阶乘函数的 LLVM IR 为例

```llvm
@.str = private unnamed_addr constant [8 x i8] c"rs: %d\0A\00", align 1

define dso_local noundef i32 @main() local_unnamed_addr {
entry:
  %retval = call noundef i32 @factorial(i32 noundef 4)
  %call = call noundef i32 (ptr, ...) @printf(ptr noundef @.str, i32 noundef %retval)
  ret i32 0
}

declare i32 @printf(ptr noundef, ...)

define dso_local noundef i32 @factorial(i32 noundef %n) local_unnamed_addr {
entry:
  %cmp_zero = icmp eq i32 %n, 0
  br i1 %cmp_zero, label %end, label %if.header

if.header:
  %cmp = icmp sle i32 %n, 2
  br i1 %cmp, label %end, label %if.body
 
if.body:
  %num = phi i32 [%inc, %loop.body], [2, %if.header]
  %curr_rs = phi i32 [%retval2, %loop.body], [1, %if.header]
  %cmp_end = icmp sle i32 %num, %n
  br i1 %cmp_end, label %loop.body, label %end

loop.body:
  %inc = add nsw i32 %num, 1
  %retval2 = mul i32 %num, %curr_rs
  br label %if.body

end:
  %retval = phi i32 [1, %entry], [%n, %if.header], [%curr_rs, %if.body]
  ret i32 %retval
}
```

这个 LLVM IR 可以被 `lli` 直接解释执行

```bash
$ lli factorial.ll
rs: 24
```

## NPM demo: 1. 遍历 Basic Block 和 Instruction

接下来展示一个遍历 Basic Block 和 Instruction 的 Analysis Pass 的例子

```cpp
#include <llvm/ADT/ArrayRef.h>
#include <llvm/ADT/StringRef.h>
#include <llvm/Analysis/LoopAnalysisManager.h>
#include <llvm/Analysis/LoopInfo.h>
#include <llvm/Config/llvm-config.h>
#include <llvm/IR/Analysis.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Instruction.h>
#include <llvm/IR/Instructions.h>
#include <llvm/IR/PassManager.h>
#include <llvm/Passes/PassBuilder.h>
#include <llvm/Plugins/PassPlugin.h>
#include <llvm/Support/raw_ostream.h>

struct AnalysisCore : llvm::AnalysisInfoMixin<AnalysisCore> {
  using Result = struct {
    unsigned block_counts;
    unsigned phi_counts;
    unsigned max_loop_deep;
  };
  Result run(llvm::Function &Func, llvm::FunctionAnalysisManager &);

  static bool isRequired() { return true; }
  static llvm::AnalysisKey Key;
};

struct PrintfDetail : llvm::PassInfoMixin<PrintfDetail> {
  llvm::PreservedAnalyses run(llvm::Function &Func,
                              llvm::FunctionAnalysisManager &FAM);
  static bool isRequired() { return true; }
};

llvm::AnalysisKey AnalysisCore::Key;

AnalysisCore::Result AnalysisCore::run(llvm::Function &Func,
                                       llvm::FunctionAnalysisManager &FAM) {
  unsigned block_count{0};
  unsigned phi_count{0};
  unsigned max_loop_deep{0};
  auto &info = FAM.getResult<llvm::LoopAnalysis>(Func);

  for (auto &block : Func) {
    block_count += 1;
    max_loop_deep = std::max(max_loop_deep, info.getLoopDepth(&block));
    for (auto &instruction : block) {
      if (instruction.getOpcode() == llvm::Instruction::PHI) {
        phi_count += 1;
      }
    }
  }
  return {block_count, phi_count, max_loop_deep};
}

llvm::PreservedAnalyses PrintfDetail::run(llvm::Function &Func,
                                          llvm::FunctionAnalysisManager &FAM) {
  const auto result = FAM.getResult<AnalysisCore>(Func);
  llvm::outs() << "block counts: " << result.block_counts
               << ", phi counts: " << result.phi_counts
               << ", max_loop_deep: " << result.max_loop_deep << "\n";
  return llvm::PreservedAnalyses::all();
}

void PassBuilderCallbacks(llvm::PassBuilder &PB) {
  PB.registerPipelineParsingCallback(
      [](llvm::StringRef Name, llvm::FunctionPassManager &FPM,
         llvm::ArrayRef<llvm::PassBuilder::PipelineElement>) {
        if (Name == "print-my-detail") {
          FPM.addPass(PrintfDetail());
          return true;
        }
        return false;
      });
  PB.registerAnalysisRegistrationCallback(
      [](llvm::FunctionAnalysisManager &AM) {
        AM.registerPass([&] { return AnalysisCore(); });
      });
}

llvm::PassPluginLibraryInfo getPrintfDetailPluginInfo() {
  return {LLVM_PLUGIN_API_VERSION, "PrintfDetail", LLVM_VERSION_STRING,
          PassBuilderCallbacks};
}

extern "C" LLVM_ATTRIBUTE_WEAK ::llvm::PassPluginLibraryInfo
llvmGetPassPluginInfo() {
  return getPrintfDetailPluginInfo();
}
```

当然还需要搭配着 CMake 来使用:

```cmake
cmake_minimum_required(VERSION 3.20)

project(my-llvm-pass-plugin)

list(APPEND CMAKE_PREFIX_PATH "${MY_LLVM_INSTALL_DIR}/lib/cmake/llvm/")

find_package(LLVM CONFIG)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

add_definitions(${LLVM_DEFINITIONS})
include_directories(${LLVM_INCLUDE_DIRS})

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -stdlib=libc++")

if(NOT LLVM_ENABLE_RTTI)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-rtti")
endif()

add_library(pass-plugin SHARED analysis.cpp)
```

> 需要解释一下，我这里的 CMakeLists.txt 中加入了 `-stdlib=libc++` 是因为我系统用的是 LLVM 的 libc++，我系统的 Clang 的配置里就会让它编译的软件用上 libc++，所以我需要保证我编译的 Clang 的行为也是如此
>
> 并且我这个代码应该是 LLVM 22.1 之后才能编译通过，目前 LLVM stable 的版本中，PassPlugin.h 是在 llvm/Passes 下的，对应的 commit URL 是 https://github.com/llvm/llvm-project/commit/f54df0d09e19ec6b205cb0af45c7ecea2fd8aeff

这里的 `MY_LLVM_INSTALL_DIR` 就是 LLVM 的安装位置了，我的就是上一篇编译的 LLVM 23.git，位于 ~/.bin/ 下，所以 `cmake -S . -B build -DMY_LLVM_INSTALL_DIR=` 指定一下就好了。

之后调用 `opt`，`opt` 会作为 driver 调用 LLVM 优化相关的组件

```bash
$ opt -load-pass-plugin ./build/libpass-plugin.so -passes="print-my-detail" /path/to/factorial.ll --disable-output
block counts: 1, phi counts: 0, max_loop_deep: 0
block counts: 5, phi counts: 3, max_loop_deep: 1
```

这里的 `opt` 命令行参数说明：
- `-load-pass-plugin <path>` - 加载我们编译的 Pass 插件动态库（`.so` 文件）
- `-passes="<pass-pipeline>"` - 指定要执行的 Pass 流水线，可以用逗号分隔多个 Pass，如 `"pass1,pass2"`
- `--disable-output` - 不输出优化后的 IR，只执行 Pass（我们的 Pass 只是打印信息，不需要输出 IR）

可以看出这就是我上面那个阶乘程序 IR 的信息，有两个是因为总共就两个函数，第一个 main 函数基本没什么，而第二个有五个 basic block，有三个 phi 函数，这也都能和结果对的上。

现在我来解释一下代码都做了什么

### 使用 New Pass Manger

从下往上看，这里有

```cpp
extern "C" LLVM_ATTRIBUTE_WEAK ::llvm::PassPluginLibraryInfo
llvmGetPassPluginInfo() {
  return getPrintfDetailPluginInfo();
}
```

这个函数定义是写死的，只有这样才能被识别，`opt` 会调用这个 `llvmGetPassPluginInfo` 从而注册上我们自己的 callback

```cpp
llvm::PassPluginLibraryInfo getPrintfDetailPluginInfo() {
  return {LLVM_PLUGIN_API_VERSION, "PrintfDetail", LLVM_VERSION_STRING,
          PassBuilderCallbacks};
}
```

这里的 `LLVM_PLUGIN_API_VERSION` 在 22.1 之前应该一直都是 1，LLVM 22.1 [有一个 commit 拓展了 PassPlugin](https://github.com/llvm/llvm-project/commit/cd806d7e7689731aa4444c2b113e4ed9dd89c6fd)，从而改成了 2

`opt` 会校验这里的 API_VERSION 的，所以需要保持一致，这里的 PassBuilderCallbacks 具体的注册逻辑了，`opt` 会执行这个函数

```cpp
void PassBuilderCallbacks(llvm::PassBuilder &PB) {
  PB.registerPipelineParsingCallback(
      [](llvm::StringRef Name, llvm::FunctionPassManager &FPM,
         llvm::ArrayRef<llvm::PassBuilder::PipelineElement>) {
        if (Name == "print-my-detail") {
          FPM.addPass(PrintfDetail());
          return true;
        }
        return false;
      });
  PB.registerAnalysisRegistrationCallback(
      [](llvm::FunctionAnalysisManager &AM) {
        AM.registerPass([&] { return AnalysisCore(); });
      });
}
```

这里注册了两个，第一个是 `opt` 的 Pass 解析的 callback，第二个是注册了一个 Function 层级的 Analysis Pass，也就是这个 Pass 会被每个函数过一遍，这里需要介绍 Pass 不同层级了:

```txt
Module
  ├─ CGSCC (可选，用于过程间分析，对调用图的强连通分量进行遍历)
  ├─ Function (对每个函数执行)
      └─ Loop (对函数内的循环嵌套结构执行)
```

LLVM 的 Pass 层级是分层执行的，Module Pass 对整个编译单元执行一次，Function Pass 对每个函数分别执行，Loop Pass 则对函数内的循环结构执行。CGSCC（Call Graph SCC，调用图强连通分量）Pass 是可选的，用于需要过程间分析的场景，它按照调用图的拓扑顺序处理函数

当然这里也就是把这两个函数调用 `push_back` 到一个全局变量里等待后续调用，比如在开始解析你的 `-passes=print-my-detail` 时，`opt` 会调用 LLVM 库查找各种 Pass 是否有名称符合的，每个层级的 Pass 都有一个收集 callback 的全局变量，如果这个变量有元素就调用一遍，所以我们编写的这个函数会在那个时候被调用，如果 `Name == "print-my-detail` 那么就 addPass 并 `return true` 表示找到了，否则就会报找不到这个 Pass

所以在我们的这个例子中，你甚至可以删掉这个 `Name` 比较，直接添加并 `return true`，你会发现你随便输入一个之前不存在的 Pass Name，就会执行这个 Pass

`llvm::StringRef` 是 LLVM 内部使用字符串的方式，LLVM 基本上不推荐使用 `std::string`、`std::vector` 那些，我刚刚说的调用 `push_back` 是 LLVM 内部的类型 `llvm::SmallVector`

接下来就是 `PrintfDetail` 的定义了

```cpp
struct PrintfDetail : llvm::PassInfoMixin<PrintfDetail> {
  llvm::PreservedAnalyses run(llvm::Function &Func,
                              llvm::FunctionAnalysisManager &FAM);
  static bool isRequired() { return true; }
};

llvm::PreservedAnalyses PrintfDetail::run(llvm::Function &Func,
                                          llvm::FunctionAnalysisManager &FAM) {
  const auto result = FAM.getResult<AnalysisCore>(Func);
  llvm::outs() << "block counts: " << result.block_counts
               << ", phi counts: " << result.phi_counts
               << ", max_loop_deep: " << result.max_loop_deep << "\n";
  return llvm::PreservedAnalyses::all();
}
```

这里还是比较简单的，就是调用了 `FAM.getResult` 获取我们 Analysis Pass 的分析结果并打印出来，这里定义一个结构体并继承自 `llvm::PassInfoMixin` 就是 New Pass Manager 的 Pass 定义方式。

这里 `return llvm::PreservedAnalyses::all()` 表示没有影响任何分析结果。

接下来看 `AnalysisCore` 的定义


```cpp
struct AnalysisCore : llvm::AnalysisInfoMixin<AnalysisCore> {
  using Result = struct {
    unsigned block_counts;
    unsigned phi_counts;
    unsigned max_loop_deep;
  };
  Result run(llvm::Function &Func, llvm::FunctionAnalysisManager &);

  static bool isRequired() { return true; }
  static llvm::AnalysisKey Key;
};

llvm::AnalysisKey AnalysisCore::Key;

AnalysisCore::Result AnalysisCore::run(llvm::Function &Func,
                                       llvm::FunctionAnalysisManager &FAM) {
  unsigned block_count{0};
  unsigned phi_count{0};
  unsigned max_loop_deep{0};
  auto &info = FAM.getResult<llvm::LoopAnalysis>(Func);

  for (auto &block : Func) {
    block_count += 1;
    max_loop_deep = std::max(max_loop_deep, info.getLoopDepth(&block));
    for (auto &instruction : block) {
      if (instruction.getOpcode() == llvm::Instruction::PHI) {
        phi_count += 1;
      }
    }
  }
  return {block_count, phi_count, max_loop_deep};
}
```

这里的 `Result` 和 `Key` 的定义都必需的，一定被定义成这个名字。

`Key` 用来区分不同的 Analysis Pass，而 `Result` 这声明了这个 Analysis Pass 要收集的信息的结构。

### 关于使用 LLVM 内置 Analysis

这里使用了 LLVM 内置的 `LoopAnalysis` 来获取循环信息。LLVM 提供了许多常用的内置分析，例如：

- `LoopAnalysis` - 循环分析，识别函数内的循环结构和嵌套深度
- `DominatorTreeAnalysis` - 支配树分析，用于判断 Basic Block 之间的支配关系
- `PostDominatorTreeAnalysis` - 后支配树分析
- `AAManager` - 别名分析管理器
- `ScalarEvolutionAnalysis` - 标量演化分析，用于分析循环归纳变量

这些分析可以直接通过 `FAM.getResult<AnalysisName>(Func)` 获取，Manager 会自动处理依赖关系。比如 `LoopAnalysis` 内部依赖 `DominatorTree`，但我们不需要手动请求，Manager 会自动计算。

从这里也可以看出 New Pass Manager 的好处，我可以在这里直接按需拿到对这个函数的 LoopAnalysis，然后就得到了这个函数的循环信息。

对函数遍历就是遍历 Basic Block，而 Basic Block 就是由 Instruction 组成的，从这两个 `for` 循环中也能很容易看出来。

## NPM demo: 2. 插入和修改 LLVM IR

这里我会介绍两个 Transform Pass 的例子，一个是把 LLVM IR 中对整数的加法换成一个等效的运算，另一个是插入一个全局变量的定义，在每个 Basic Block 的开头把这个变量加一。

> 不过第一个还勉强能说是代码混淆，第二个更是什么用也没有，谁 Profile 会这么生硬的统计一个程序运行时的 Basic Block 执行次数... PGO 插桩也不这么干，而且还是一个全局变量。
>
> 这里简单说一下，因为我对 PGO 插桩逻辑有所了解，PGO 插桩是对一些关键的 "边" 进行插桩，也就是只插入部分 Basic Block，其他 Basic Block 的执行次数都能通过插入的 Basic Block 的执行次数算出来，我有计划在未来单开一篇介绍当前 PGO 优化的现状，不过那是未来了。
>
> PGO 也不是只插入一个全局的整型变量用来计数，这样根本区分不了。

我这里就不叙述先前的注册部分了，直接看 Pass 的定义

```cpp
struct MyTransfrom : llvm::PassInfoMixin<MyTransfrom> {
  llvm::PreservedAnalyses run(llvm::Function &Func,
                              llvm::FunctionAnalysisManager &FAM) {
    bool Changed{false};

    llvm::SmallVector<llvm::BinaryOperator *> OpVec{};

    for (auto &Block : Func) {
      for (auto &Instruction : Block) {
        auto *BinaryOp = llvm::dyn_cast<llvm::BinaryOperator>(&Instruction);

        if (BinaryOp && BinaryOp->getOpcode() == llvm::Instruction::Add &&
            BinaryOp->getType()->isIntegerTy()) {
          OpVec.push_back(BinaryOp);
        }
      }
    }

    for (auto BinaryOp : OpVec) {
      const auto LHS = BinaryOp->getOperand(0);
      const auto RHS = BinaryOp->getOperand(1);

      llvm::IRBuilder<> IRBuilder{BinaryOp};

      auto XorExp = IRBuilder.CreateXor(LHS, RHS);
      auto *AndExp = IRBuilder.CreateAnd(LHS, RHS);
      auto *MulExp = IRBuilder.CreateMul(
          llvm::ConstantInt::get(BinaryOp->getType(), 2), AndExp);
      auto *NewAddExp =
          llvm::cast<llvm::BinaryOperator>(IRBuilder.CreateAdd(XorExp, MulExp));

      NewAddExp->setHasNoSignedWrap(BinaryOp->hasNoSignedWrap());
      NewAddExp->setHasNoUnsignedWrap(BinaryOp->hasNoUnsignedWrap());

      BinaryOp->replaceAllUsesWith(NewAddExp);
      BinaryOp->eraseFromParent();

      Changed = true;
    }

    return Changed ? llvm::PreservedAnalyses::none()
                   : llvm::PreservedAnalyses::all();
  }

  static bool isRequired() { return true; }
};
```

下面这段代码，我就是遍历每个指令，并尝试转换成二元运算符，`llvm::dyn_cast<>` 会在转换失败时返回 `nullptr`，之后就是判断是否是加法，且操作的是整数就收集起来，这是因为不能在遍历的时候修改当前正在迭代的指令（否则这个迭代器会失效）


```cpp
for (auto &Block : Func) {
  for (auto &Instruction : Block) {
    auto *BinaryOp = llvm::dyn_cast<llvm::BinaryOperator>(&Instruction);

    if (BinaryOp && BinaryOp->getOpcode() == llvm::Instruction::Add &&
        BinaryOp->getType()->isIntegerTy()) {
      OpVec.push_back(BinaryOp);
    }
  }
}
```

```cpp
for (auto BinaryOp : OpVec) {
  const auto LHS = BinaryOp->getOperand(0);
  const auto RHS = BinaryOp->getOperand(1);

  llvm::IRBuilder<> IRBuilder{BinaryOp};

  auto XorExp = IRBuilder.CreateXor(LHS, RHS);
  auto *AndExp = IRBuilder.CreateAnd(LHS, RHS);
  auto *MulExp = IRBuilder.CreateMul(
          llvm::ConstantInt::get(BinaryOp->getType(), 2),
          AndExp);
  auto *NewAddExp =
      llvm::cast<llvm::BinaryOperator>(IRBuilder.CreateAdd(XorExp, MulExp));

  NewAddExp->setHasNoSignedWrap(BinaryOp->hasNoSignedWrap());
  NewAddExp->setHasNoUnsignedWrap(BinaryOp->hasNoUnsignedWrap());

  BinaryOp->replaceAllUsesWith(NewAddExp);
  BinaryOp->eraseFromParent();

  Changed = true;
}
```

这里具体的逻辑，就是把 `a + b` 改成 `(a ^ b) + 2 * (a & b)`，具体的基本都能从函数名称看出来什么意思，我就不过多叙述了，唯一值得一提的是这个函数的返回值

```cpp
return Changed ? llvm::PreservedAnalyses::none()
               : llvm::PreservedAnalyses::all();
```

### 关于 PreservedAnalyses

`PreservedAnalyses` 是 New Pass Manager 中用于标记哪些分析结果在 Transform Pass 执行后仍然有效的机制，这直接影响后续 Pass 是否需要重新计算分析结果。

常用的返回值：
- `PreservedAnalyses::all()` - 所有分析结果都保持有效（没有修改 IR，或修改不影响任何分析）
- `PreservedAnalyses::none()` - 所有分析结果都失效（保守的做法，确保正确性）
- `PreservedAnalyses::CFGAnalyses()` - CFG 相关的分析（如支配树、循环信息）仍然有效

上面这个返回值其实稍微有些严苛了，因为我只是改变了 Block 内部的加法指令，并没有修改 CFG（没有增删 Basic Block，没有修改跳转），所以至少 CFG 相关的分析结果是可以保留的。你会在下面的 Transform Pass 中看到更精确的写法

```cpp
struct MyProfile : llvm::PassInfoMixin<MyProfile> {
  llvm::PreservedAnalyses run(llvm::Module &Module,
                              llvm::ModuleAnalysisManager &MAM) {
    auto IntType = llvm::Type::getInt32Ty(Module.getContext());
    auto ProfileCount = Module.getOrInsertGlobal("__my_tran", IntType);

    if (auto *GV = llvm::dyn_cast<llvm::GlobalVariable>(ProfileCount)) {
      if (!GV->hasInitializer()) {
        GV->setInitializer(llvm::ConstantInt::get(IntType, 0));
        GV->setLinkage(llvm::GlobalValue::PrivateLinkage);
      }
    }

    for (auto &Func : Module) {
      for (auto &Block : Func) {
        auto &Instruction = *Block.getFirstInsertionPt();
        llvm::IRBuilder<> IRBuilder{&Instruction};
        auto AtomicExp = IRBuilder.CreateAtomicRMW(
            llvm::AtomicRMWInst::Add, ProfileCount,
            llvm::ConstantInt::get(IntType, 1), llvm::MaybeAlign(4),
            llvm::AtomicOrdering::Monotonic);
      }
    }

    llvm::PreservedAnalyses PA{};
    PA.preserveSet<llvm::CFGAnalyses>();
    return PA;
  }

  static bool isRequired() { return true; }
};
```

这是一个 Module 层级的 Pass，因为这里我会插入一个全局变量的定义，所以这并不是 Function 层级能解决的，当然也可以在 Function Pass 里这么做，只需要调用 `Func.getParent()` 就能得到对应的 Module 了，拿到 Module 也可以做和我上面这个一样的操作。
