---
title: "Blog 迁移记录"
author: suo yuan
pubDatetime: 2024-03-08T14:23:43.439Z
draft: false
tags:
  - blog
description: "本次更换博客框架的相关记录"
---

<!--more-->
本次更换博客框架的相关记录
<!--more-->

# Blog 迁移记录

我最早使用的是`hexo`作为博客框架，期间也换过很多主题，但没有一种主题是让我很满意的。我自己前端学的也没有多好，所以并没有自己做一个主题的想法。

后来我看到有人使用 [GitBook](https://www.gitbook.com/) 写Blog，但我不喜欢使用 gitbook，于是准备使用和它差不多的 [mdBook](https://github.com/rust-lang/mdBook)，这位是用 Rust 开发，同时也是 [The Rust Programming Language](https://doc.rust-lang.org/stable/book/) 所使用的软件，但我用的时候才发现，这位默认的颜值不咋好看，而且搜索功能简陋（不支持 CJK）。

于是我选择了 [MkDocs](https://www.mkdocs.org/)，这位是我刷到 [CTF Wiki](https://ctf-wiki.org/) 的时候找到的文档生成软件。简单搜索发现它有一个 [Material for MkDocs](https://github.com/squidfunk/mkdocs-material) 主题，于是就换到了这里。不过这位其实有些问题——它不是Blog，所以当用它作为我的 Blog 站点生成器的时候，总有一种别扭的感觉。

前几天看到一个前端框架：[astro](https://github.com/withastro/astro)。看了一下主题感觉真的好漂亮，并且貌似性能也还好？我使用的是 [astro-paper](https://github.com/satnaing/astro-paper) 这个主题。

不过这个主题没有友链，于是我自己简单的修改了一下：

我简单看了一下，它的 **src/components/Header.astro** 文件用于显示上边栏，于是：

找到下边这行并修改成我给的这样：

```astro
posts" | "tags" | "about" | "search" | "friends";
```

```astro
<li>
  <a href="/tags/" class={activeNav === "tags" ? "active" : ""}> Tags </a>
</li>
<li>
  <a href="/about/" class={activeNav === "about" ? "active" : ""}> About </a>
</li>
```

在上面这块代码的下边添加：

```astro
<li>
  <a href="/friends/" class={activeNav === "friends" ? "active" : ""}>
    Friends
  </a>
</li>
```

在 **src/pages** 文件夹下新建 **friends/index.astro** 文件并添加以下内容：

```astro
---
import Layout from "@layouts/Layout.astro";
import Main from "@layouts/Main.astro";
import Header from "@components/Header.astro";
import Footer from "@components/Footer.astro";
import LinkButton from "@components/LinkButton.astro";
import { SITE } from "@config";
---

<Layout title={`Friends | ${SITE.title}`}>
  <Header activeNav="friends" />
  <Main pageTitle="Friends" pageDesc="Friendly link collection.">
    <LinkButton
      className="underline decoration-dashed underline-offset-4 hover:text-skin-accent"
      href="https://xxxx.xxx"
    />
  </Main>

  <Footer />
</Layout>
```

这样就可以添加友链了。

不过这样的实现方式太粗糙了，不过我暂时也没太想出来什么比较好的解决方案。
