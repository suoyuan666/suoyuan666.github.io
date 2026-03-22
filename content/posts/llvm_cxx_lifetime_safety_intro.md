---
title: "Clang C++ 生命周期安全分析: 从设计原理到诊断优化"
author: suo yuan
date: 2026-03-20T05:04:56Z
draft: false
tags:
  - LLVM
  - Compiler
description: "关于 Clang C++ Lifetime Safety Analysis 的设计与实现，以及我对该分析的一个小改进"
summary: "关于 Clang C++ Lifetime Safety Analysis 的设计与实现，以及我对该分析的一个小改进"
---

# Clang C++ 生命周期安全分析: 从设计原理到诊断优化

## 概述

Clang Lifetime Safety Analysis 借鉴于 Rust 的 [Polonius](https://github.com/rust-lang/polonius) 借用检查器，并为 C++ 做了一些适配。关于 Polonius 的介绍可以看 [An alias-based formulation of the borrow checker](https://smallcultfollowing.com/babysteps/blog/2018/04/27/an-alias-based-formulation-of-the-borrow-checker/) 这篇文章。总的来说，Lifetime Safety Analysis 要解决 Clang 现有的生命周期检查的一个问题，那就是无法在 CFG 中跨 Block 检查更加完整的生命周期问题。

Lifetime Safety Analysis 完全是编译时的检查，它是在 CFG 构建后做的检查。我会在后续介绍当前的实现，总的来说这样检查的显著优势就是没有运行时性能损耗。

下面是一个简单的示例:

```cpp
#include <iostream>
#include <string>
#include <string_view>

int main() {
  std::string_view a;
  {
    std::string str{"str"};
    a = str;
  }
  std::cout << "a: " << a << "\n";
  return 0;
}
```

只需要附加 `-Wlifetime-safety` 编译即可:

```bash
$ clang++ -Wlifetime-safety test.cpp 
test.cpp:9:9: warning: object whose reference is captured does not live long enough [-Wlifetime-safety-use-after-scope]
    9 |     a = str;
      |         ^~~
test.cpp:10:3: note: destroyed here
   10 |   }
      |   ^
test.cpp:11:25: note: later used here
   11 |   std::cout << "a: " << a << "\n";
      |                         ^
1 warning generated.
```

这里就是一个 use after free 问题，因为 `str` 的生命周期被 `{}` 限制住了，所以使用 a 的时候，`str` 已经死掉了。

接下来我会先介绍一下基本概念，之后介绍当前 Lifetime Safety Analysis 的设计与实现以及我为 Lifetime Safety 做得一个小增强。本文目标是让对编译原理有一些基本概念的人也能看懂。

## 基础概念讲解

首先我们先介绍一些核心概念：Loan、Origin 和 Fact

- Loan 会在创建了指针或者引用这种本身不存储资源的地方创建，也就是表示一个借用
- Origin 表示一个变量可能的值的来源，因为一个指针可能潜在持有多个 Loan，毕竟这是编译期分析而不是运行时分析
- Fact 就是一个事件，比如发生了变量销毁、借用，读取等等，Lifetime Safety Analysis 会在各个 Fact 做检查

现在我来简单介绍一下 CFG 和 Block 是什么。

CFG 即 Control Flow Graph，表示程序可能执行的途径，图的节点就是 Basic Block，关于 Basic Block 的介绍，我在 [LLVM 初探: 1. LLVM IR](../llvm_ir_intro) 中已经介绍过了，这里再次说一下 Basic Block 的特征:

1. **单入口**：只能从第一条指令进入
2. **单出口**：只能从最后一条指令离开
3. **顺序执行**：块内的指令按顺序执行，没有分支跳转

也就是说一个程序或者叫作一个编译单元会被分为多个 Basic Block，而 Basic Block 之间的执行路径就形成了 CFG

## Lifetime Safety Analysis 设计

Lifetime Safety Analysis 要做的事情就是在 CFG 构建好之后分析每个变量持有的资源来源，也就是分为引用和非引用。

一个变量可能本身就持有一个资源，那么它的值的来源是毋庸置疑的。并且它只要使用了那么就不会存在生命周期没有的情况，因为它持有的资源和它的生命周期绑定，这也是 RAII 所带来的好处。

但一个变量可能本身不绑定资源，而是引向一块资源，或者直接说是指针吧。指针是一个强大的东西，但它带来的问题是，指针这个变量的生命周期和指针所指向的资源的生命周期并不一定是是一致的。虽然这是指针本身的自由，但这也带来很多麻烦。

> 指针还有一个问题，但我认为这大概是 C 语言类型系统的问题，那就是类型转换真的太容易了，指针没有真正可靠的来源信息。或许是因为 C 语言提供的内存模型过于简单，导致我们几乎总是以一个更加底层的视角思考问题，从而忽视了这个问题。
>
> “把指针都当成 `void *` 怎么了，就这么硬干一辈子也没有问题啊”  🤪
>
> 但正因为没有来源信息，我们存在 [alias pointer](https://en.wikipedia.org/wiki/Aliasing_(computing)) 的问题。为此我们添加了 [restrict](https://en.cppreference.com/w/c/language/restrict.html) 关键字用于声明不会同时存在多个指针指向同一份内存的情况，[GCC 会在 O2 优化以后就假设不存在这种情况](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html#index-fstrict-aliasing)。
>
> Apple 去年还为 LLVM 贡献了一个 C 语言的安全检测，旨在限制指针能访问的内存范围: [-fbounds-safety: Enforcing bounds safety for C](https://clang.llvm.org/docs/BoundsSafety.html)
>
> 扯远了，我这里只是简单吐槽一下使用指针时可能会遇到的问题。

Lifetime Safety Analysis 会在 CFG 中遍历并记录各种 Facts 及其相关信息。这样方便后续分析，只要从 CFG 中抽象出了各种 Fact，后续分析就可以直接遍历 Fact 而省去匹配语句的处理。

在得到了 Facts 后，我们需要继续遍历每个 CFG Block 中的 Fact，从而创建好 Origin 和 Loan 以及它们之间的关系。并且我们需要知道哪个 Origin 是参与到计算的，哪些 Origin 是可以忽略的。

得到了这些我们就可以做具体的安全检查了，比如经典的 use after free 问题，那就是在一个资源销毁的事件中，当前存活的 Origin 持有的 Loan 恰好有这个被销毁的资源，那么就认为是 use after free

## Lifetime Safety Analysis 实现

目前 Lifetime Safety Analysis 的源码在 clang/lib/Analysis/LifetimeSafety/ 下

```txt
clang/lib/Analysis/LifetimeSafety/
├── Checker.cpp
├── CMakeLists.txt
├── Dataflow.h
├── Facts.cpp
├── FactsGenerator.cpp
├── LifetimeAnnotations.cpp
├── LifetimeSafety.cpp
├── LifetimeStats.cpp
├── LiveOrigins.cpp
├── LoanPropagation.cpp
├── Loans.cpp
├── MovedLoans.cpp
└── Origins.cpp
```

这里大致可分为四类：首先是一些数据结构的抽象，如 Origins、Loans 和 Facts；其次是 Facts 的生成器 FactsGenerator；然后是各种分析，包括 LoanPropagation、LiveOrigins 和 MovedLoans 三个分析；最后是具体的分析校验。

```txt
+-------------------------+
|     FactsGenerator      |
+-------------------------+
          |
          |
          v
+-------------------------+
| LoanPropagationAnalysis |
+-------------------------+
          |
          |
          v
+-------------------------+
|   LiveOriginsAnalysis   |
+-------------------------+
          |
          |
          v
+-------------------------+
|   MovedLoansAnalysis    |
+-------------------------+
          |
          |
          v
+-------------------------+
|     LifetimeChecker     |
+-------------------------+

```

具体流程就是上面这样。

首先我们得到了 CFG 后，就调用 FactsGenerator 的函数记录好 CFG 中每个 Fact 及其相关信息。

```cpp
void LifetimeSafetyAnalysis::run() {
  llvm::TimeTraceScope TimeProfile("LifetimeSafetyAnalysis");

  const CFG &Cfg = *AC.getCFG();
  if (LSOpts.MaxCFGBlocks > 0 && Cfg.getNumBlockIDs() > LSOpts.MaxCFGBlocks) {
    DEBUG_WITH_TYPE(
        "LifetimeSafety", std::string FuncName = "<unknown>";
        if (const Decl *D = AC.getDecl()) if (const auto *ND =
                                                  dyn_cast<NamedDecl>(D))
            FuncName = ND->getQualifiedNameAsString();
        llvm::dbgs() << "LifetimeSafety: Skipping function " << FuncName
                     << "due to large CFG: " << Cfg.getNumBlockIDs()
                     << " blocks (threshold: " << LSOpts.MaxCFGBlocks << ")\n");
    return;
  }

  FactMgr = std::make_unique<FactManager>(AC, Cfg);

  FactsGenerator FactGen(*FactMgr, AC);
  FactGen.run();
```

这里的 `LSOpts.MaxCFGBlocks` 是出于性能考虑，Lifetime Safety Analysis 支持设置检测的最大 Block 数量，毕竟这个分析可能很耗时间。

```cpp
  // Iterate through the CFG blocks in reverse post-order to ensure that
  // initializations and destructions are processed in the correct sequence.
  for (const CFGBlock *Block : *AC.getAnalysis<PostOrderCFGView>()) {
    CurrentBlockFacts.clear();
    EscapesInCurrentBlock.clear();
    if (Block == &Cfg.getEntry())
      CurrentBlockFacts.append(PlaceholderLoanFacts.begin(),
                               PlaceholderLoanFacts.end());
    for (unsigned I = 0; I < Block->size(); ++I) {
      const CFGElement &Element = Block->Elements[I];
      if (std::optional<CFGStmt> CS = Element.getAs<CFGStmt>())
        Visit(CS->getStmt());
      else if (std::optional<CFGInitializer> Initializer =
                   Element.getAs<CFGInitializer>())
        handleCXXCtorInitializer(Initializer->getInitializer());
      else if (std::optional<CFGLifetimeEnds> LifetimeEnds =
                   Element.getAs<CFGLifetimeEnds>())
        handleLifetimeEnds(*LifetimeEnds);
      else if (std::optional<CFGFullExprCleanup> FullExprCleanup =
                   Element.getAs<CFGFullExprCleanup>()) {
        handleFullExprCleanup(*FullExprCleanup);
      }
    }
```

之后就是遍历各种语句从而创建出 Fact，方便后续分析，下面是 Facts 的类型:

```cpp
  enum class Kind : uint8_t {
    /// A new loan is issued from a borrow expression (e.g., &x).
    Issue,
    /// A loan expires as its underlying storage is freed (e.g., variable goes
    /// out of scope).
    Expire,
    /// An origin is propagated from a source to a destination (e.g., p = q).
    /// This can also optionally kill the destination origin before flowing into
    /// it. Otherwise, the source's loan set is merged into the destination's
    /// loan set.
    OriginFlow,
    /// An origin is used (eg. appears as l-value expression like DeclRefExpr).
    Use,
    /// An origin that is moved (e.g., passed to an rvalue reference parameter).
    MovedOrigin,
    /// A marker for a specific point in the code, for testing.
    TestPoint,
    /// An origin that escapes the function scope (e.g., via return).
    OriginEscapes,
    /// An origin is invalidated (e.g. vector resized).
    InvalidateOrigin,
  };
```

在 Facts 都创建好后，就是刚刚提到的三个分析上场了，它们内部都有一个继承自 `DataflowAnalysis` 的具体实现方法，这三个分析都是线性扫描分析，但是不同的分析对 CFG 的扫描顺序并不一样。

不只是对 CFG Block 的扫描顺序不同，具体来说是三个模板参数: `template <typename Derived, typename LatticeType, Direction Dir>`

```cpp
/// LoanPropagationAnalysis
class AnalysisImpl
    : public DataflowAnalysis<AnalysisImpl, Lattice, Direction::Forward> {

/// LiveOriginsAnalysis
class AnalysisImpl
    : public DataflowAnalysis<AnalysisImpl, Lattice, Direction::Backward> {

/// MovedLoansAnalysis
class AnalysisImpl
    : public DataflowAnalysis<AnalysisImpl, Lattice, Direction::Forward> {
```

不同的分析对与 CFG Block 的遍历顺序不同，并且它们收集的 `Lattice` 也不同。在下面 Facts 分析中我会提到它们收集的 `Lattice` 具体在收集什么。

### Facts 分析

LoanPropagationAnalysis 属于是前向分析，也就是顺序地遍历 CFG Block 中每一个 Facts，并判断是否需要传播 Loan

```cpp
  /// A new loan is issued to the origin. Old loans are erased.
  Lattice transfer(Lattice In, const IssueFact &F) {
    OriginID OID = F.getOriginID();
    LoanID LID = F.getLoanID();
    LoanSet NewLoans = LoanSetFactory.add(LoanSetFactory.getEmptySet(), LID);
    return setLoans(In, OID, NewLoans);
  }

  /// A flow from source to destination. If `KillDest` is true, this replaces
  /// the destination's loans with the source's. Otherwise, the source's loans
  /// are merged into the destination's.
  Lattice transfer(Lattice In, const OriginFlowFact &F) {
    OriginID DestOID = F.getDestOriginID();
    OriginID SrcOID = F.getSrcOriginID();

    LoanSet DestLoans =
        F.getKillDest() ? LoanSetFactory.getEmptySet() : getLoans(In, DestOID);
    LoanSet SrcLoans = getLoans(In, SrcOID);
    LoanSet MergedLoans = utils::join(DestLoans, SrcLoans, LoanSetFactory);

    return setLoans(In, DestOID, MergedLoans);
  }
```

这里的 transfer 就是 LoanPropagationAnalysis 中遇到 IssueFact 和 OriginFlowFact 的处理。

如果是 IssueFact，就意味着存在新的 Loan，那么此时就需要新建一个 Loan 存储起来，这里所要做的就是把之前这个 Origin 和 Loan 的关系清除，直接新建一个 LoanSet 并添加当前的 `LID`

- LoanSet 表示多个 Loan，是因为考虑到一个变量静态分析时可能会持有多个资源，因为存在分支的情况。
- Lattice 就是存储了当前所有的 Origin 和 LoanSet 的映射，方便后续分析使用。

而对 OriginFlowFact 的处理就能体现出我上面介绍的 LoanSet 的理念了。如果当前赋值能完全覆盖之前的值，则 LoanSet 存储为空集合，否则的话 LoanSet 就会存储之前的 Loan 加上本次赋值的 Loan

LiveOriginsAnalysis 则是后向分析，也就是逆序分析 CFG Block。因为一个指针就算持有了已经被释放的资源，但只要它不被使用，那么就不会有问题，所以 LiveOriginsAnalysis 要确定 Origin 的存活是否有意义

```cpp
  /// A read operation makes the origin live with definite confidence, as it
  /// dominates this program point. A write operation kills the liveness of
  /// the origin since it overwrites the value.
  Lattice transfer(Lattice In, const UseFact &UF) {
    Lattice Out = In;
    for (const OriginList *Cur = UF.getUsedOrigins(); Cur;
         Cur = Cur->peelOuterOrigin()) {
      OriginID OID = Cur->getOuterOriginID();
      // Write kills liveness.
      if (UF.isWritten()) {
        Out = Lattice(Factory.remove(Out.LiveOrigins, OID));
      } else {
        // Read makes origin live with definite confidence (dominates this
        // point).
        Out = Lattice(Factory.add(Out.LiveOrigins, OID,
                                  LivenessInfo(&UF, LivenessKind::Must)));
      }
    }
    return Out;
  }

  /// Issuing a new loan to an origin kills its liveness.
  Lattice transfer(Lattice In, const IssueFact &IF) {
    return Lattice(Factory.remove(In.LiveOrigins, IF.getOriginID()));
  }

  /// An OriginFlow kills the liveness of the destination origin if `KillDest`
  /// is true. Otherwise, it propagates liveness from destination to source.
  Lattice transfer(Lattice In, const OriginFlowFact &OF) {
    if (!OF.getKillDest())
      return In;
    return Lattice(Factory.remove(In.LiveOrigins, OF.getDestOriginID()));
  }
```

在 UseFact 中就可以看出来这个用处，如果只是被写了，那么之前这个变量持有着被释放的资源也没什么，但如果是被读取，那么它就需要活着。

在经历了 LoanPropagationAnalysis 和 LiveOriginsAnalysis 后，紧接着来的是 MovedLoansAnalysis，这也是前向分析。它主要要处理的是移动语义的情况，也就是 MovedOriginFact

```cpp
  /// Marks all live loans sharing the same access path as the moved origin as
  /// potentially moved.
  Lattice transfer(Lattice In, const MovedOriginFact &F) {
    MovedLoansMap MovedLoans = In.MovedLoans;
    OriginID MovedOrigin = F.getMovedOrigin();
    LoanSet ImmediatelyMovedLoans = LoanPropagation.getLoans(MovedOrigin, &F);
    auto IsInvalidated = [&](const AccessPath &Path) {
      for (LoanID LID : ImmediatelyMovedLoans) {
        const Loan *MovedLoan = LoanMgr.getLoan(LID);
        auto *PL = dyn_cast<PathLoan>(MovedLoan);
        if (!PL)
          continue;
        if (PL->getAccessPath() == Path)
          return true;
      }
      return false;
    };
    for (auto [O, _] : LiveOrigins.getLiveOriginsAt(&F))
      for (LoanID LiveLoan : LoanPropagation.getLoans(O, &F)) {
        const Loan *LiveLoanPtr = LoanMgr.getLoan(LiveLoan);
        auto *PL = dyn_cast<PathLoan>(LiveLoanPtr);
        if (!PL)
          continue;
        if (IsInvalidated(PL->getAccessPath()))
          MovedLoans =
              MovedLoansMapFactory.add(MovedLoans, LiveLoan, F.getMoveExpr());
      }
    return Lattice(MovedLoans);
  }
```

这里要做的是检查当前存活的 Origin 所持有的 Loan 是否被移动语义释放掉了。

## 关于 use after free 检测中我做的一个杂项小改进

TODO: 虽然我本地测试通过，但是我的代码还没合并。等到合并我再更新这里。

## 参考文档

- [[RFC] Intra-procedural Lifetime Analysis in Clang](https://discourse.llvm.org/t/rfc-intra-procedural-lifetime-analysis-in-clang/86291)
- [Lifetime Safety Analysis](https://clang.llvm.org/docs/LifetimeSafety.html)
