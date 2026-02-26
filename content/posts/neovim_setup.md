---
title: "我的 neovim 配置"
author: suo yuan
date: 2024-07-31T22:55:02Z
lastmod: 2024-09-10T23:17:14Z
draft: false
tags:
  - neovim
description: "尝试配置 neovim，具体就是安装了一些插件，这里没有太详细介绍我的配置，等之后有时间我再补上"
---

<!--more-->
尝试配置 neovim，具体就是安装了一些插件，这里没有太详细介绍我的配置，等之后有时间我再补上
<!--more-->

# 我的 neovim 配置

先放个我配置后的样子:

![neovim_view](/img/neovim_intro/neovim_view.png)

## 背景

我在第一次接触 GNU/Linux 的时候，就有听说过 vi/vim，那时候我还只知道如何在 insert, normal 等模式中切换，如何保存并退出文件。甚至我那时候还不知道有 GNU nano，后来知道了 nano 这个软件后，简单的编辑文件的工作我就会使用 nano，基本不会太用到 vim 了。

后来我使用了一些 WM 来当成桌面（比如 i3, dwm），我在搜集资料时接触到了更多使用这些 WM 还使用 vim/neovim 的用户（只能说使用 WM 的大多更习惯使用终端）。不过我不是这时候听说 neovim 的，我已经忘了怎么听说 neovim 的了。

但在我希望使用 Wayland 的桌面之后，我就一定程度上有了更多使用 vim 操作的想法。这个想法是在我使用 GNOME 桌面环境时候产生的，因为 GNOME 的 mutter 只实现了 text-input-v3，导致不支持 text-input-v3 的 VSCodium 无法正常使用 fcitx5，这让我输入中文的时候很难受。于是我就有了使用 neovim 的想法，因为终端是可以输入中文的（不过也许现在可以考虑下 zed 🤔），至于为什么选择 neovim，因为听说比 vim 好用（我记得比较多的是 vimrc 和 lua 的对比，但是我本身没有配置 vim 的经历，所以我没有这种比较）。

使用 neovim 给我比较好的两个印象，一个 normal 模式和 insert 模式的光标是不一样的，看着还不错，另一个是 `:s` 搜索替换时，键入替换后的字符串后，当前界面那些要替换的字符会自动跟着修改，我印象中vim 默认不是这样的。

![neovim 搜索替换](/img/neovim_intro/neovim_be.png)

## 使用的插件

大致上是使用了这些插件:

- 管理插件，用于插件的安装安装配置更新等工作
  - [folke/lazy.nvim](https://github.com/folke/lazy.nvim)
- 管理 lsp
  - [williamboman/mason.nvim](https://github.com/williamboman/mason.nvim)
- lsp 相关配置
  - [neovim/nvim-lspconfig](https://github.com/neovim/nvim-lspconfig)
- 代码补全相关
  - [hrsh7th/nvim-cmp](https://github.com/hrsh7th/nvim-cmp)
  - [hrsh7th/cmp-nvim-lsp](https://github.com/hrsh7th/cmp-nvim-lsp)
  - [hrsh7th/cmp-nvim-lsp-signature-help](https://github.com/hrsh7th/cmp-nvim-lsp-signature-help)
  - [hrsh7th/cmp-path](https://github.com/hrsh7th/cmp-path)
  - [hrsh7th/cmp-cmdline](https://github.com/hrsh7th/cmp-cmdline)
  - [hrsh7th/cmp-buffer](https://github.com/hrsh7th/cmp-buffer)
  - [rafamadriz/friendly-snippets](https://github.com/rafamadriz/friendly-snippets)
  - [L3MON4D3/LuaSnip](https://github.com/L3MON4D3/LuaSnip)
  - [saadparwaiz1/cmp_luasnip](https://github.com/saadparwaiz1/cmp_luasnip)
- UI 相关
  - [folke/trouble.nvim](https://github.com/folke/trouble.nvim)
  - [nvim-treesitter/nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
  - [rebelot/heirline.nvim](https://github.com/rebelot/heirline.nvim)
  - [romgrk/barbar.nvim](https://github.com/romgrk/barbar.nvim)
  - [nvim-neo-tree/neo-tree.nvim](https://github.com/nvim-neo-tree/neo-tree.nvim)
  - [nvim-notify](https://github.com/rcarriga/nvim-notify)
- utils
  - [nvim-telescope/telescope.nvim](https://github.com/nvim-telescope/telescope.nvim)
  - [akinsho/toggleterm.nvim](https://github.com/akinsho/toggleterm.nvim)
  - [lewis6991/gitsigns.nvim](https://github.com/lewis6991/gitsigns.nvim)
- 调试器集成
  - [mfussenegger/nvim-dap](https://github.com/mfussenegger/nvim-dap)
  - [rcarriga/nvim-dap-ui](https://github.com/rcarriga/nvim-dap-ui)

调试器就这些是因为我目前就打算先配置 C/C++ 的调试环境，用的是我本机的 gdb，也就没想装一个类似 `mason` 这样的插件来下载调试器。

代码补全相关中，`nvim-cmp` 是用来补全的插件，那些以 `nvim-cmp` 为前缀的都是具体要补全的项，比如 `nvim-cmp-lsp` 是根据 lsp 的补全，`nvim-cmp-path` 是根据路径的补全，`nvim-cmp-buffer` 是根据当前打开的文件内容的补全等等，`LuaSnip` 是一个代码片段引擎（neovim 0.10 之后内置了一个代码片段引擎，可以使用那个，具体可以参考[我的配置文件](https://github.com/suoyuan666/dotfiles/blob/main/.config/nvim/lua/plugins/config/cmp.lua)，`friendly-snippets` 则是一个实用代码片段集合。

UI 相关中，`rebelot/heirline` 是用于显示底部的状态栏的，虽然这个插件也能定制顶部的 TabLine，但是我懒得去学了，直接用的 `romgrk/barbar`。

调试器方面，dap 给我的感觉类似于 lsp 一样，不过我没仔细了解，[nvim-dap 中有文档](https://github.com/mfussenegger/nvim-dap/wiki/Debug-Adapter-installation) 描述了支持的调试器。我根据文档配置了 gdb 的调试环境。

## tricks

一开始我配置完底部状态栏有个问题，每个窗口都有一个单独的状态栏，但我不需要这样，后来我在 Youtube 上找到个博主自称需要添加这行代码就可以解决:

```lua
vim.opt.laststatus = 3
```

真的是这样，泪目

lsp 的错误诊断无法在插入模式下使用，后来在 Stack Overflow 的一个帖子上找到了答案

```lua
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
  vim.lsp.diagnostic.on_publish_diagnostics, {
    update_in_insert = true,
  }
)
```

当开了多个窗口的时候，`q` 只能退出当前的窗口，可以使用 `qa`，这样可以直接退出全部窗口。

我后来尝试调试窗口怎么样的时候，发现开多个窗口，窗口之间的线不明显，看起来很不得劲。

可以输入 `: highlight WinSeparator guibg=none` 解决，这是把那块的背景设为空，我不是这么解决的，我是把 `guifg` 设成一个亮色。

如果是在配置文件中持久化这个设置，则是:

```lua
vim.api.nvim_set_hl(0, "WinSeparator", { fg = "#F8EDEC" })
```

## 具体配置

```bash
$ tree
.
├── init.lua
├── lazy-lock.json
└── lua
    ├── config
    │   ├── colorscheme.lua
    │   ├── keymap.lua
    │   ├── lazy.lua
    │   └── option.lua
    ├── lsp
    │   └── clangd.lua
    └── plugins
        ├── cmp.lua
        ├── config
        │   ├── cmp.lua
        │   ├── comment.lua
        │   ├── lsp.lua
        │   ├── none-ls.lua
        │   ├── telescope.lua
        │   ├── treesitter.lua
        │   ├── ui_bar_dark.lua
        │   ├── ui_bar_light.lua
        │   ├── ui_bar.lua
        │   └── ui_fs_tree.lua
        ├── debug.lua
        ├── lsp.lua
        ├── ui.lua
        └── util.lua

6 directories, 22 files
```

这是我的目录架构，**lua/lsp** 这个目录实际上还没用上，我把 **clangd.lua** 的内容挪到 **lua/plugins/config/lsp.lua** 下了。

**init.lua** 的内容很简单:

```lua
require('config.option')
require('config.keymap')
require('config.lazy')
require('config.colorscheme')
```

**init.lua** 的作用就是加载各种配置文件，本身没有什么设置。这里的 `.` 代表一个目录层级，**init.lua** 貌似直接去 **lua** 文件夹内找了，所以直接写 `config`。

**lua/config/option.lua** 的内容是:

```lua
-- Hint: use `:h <option>` to figure out the meaning if needed
vim.opt.clipboard = 'unnamedplus' -- use system clipboard
-- vim.opt.completeopt = { 'menu', 'menuone', 'noselect' }
vim.opt.mouse = 'a' -- allow the mouse to be used in Nvim

vim.opt.tabstop = 2 -- number of visual spaces per TAB
vim.opt.softtabstop = 2 -- number of spacesin tab when editing
vim.opt.shiftwidth = 2 -- insert 2 spaces on a tab
vim.opt.expandtab = true -- tabs are spaces, mainly because of python
vim.api.nvim_set_keymap('v', '<Tab>', '>gv', { noremap = true, silent = true })
vim.api.nvim_set_keymap('v', '<S-Tab>', '<gv', { noremap = true, silent = true })

vim.opt.number = true -- show absolute number
vim.opt.cursorline = true -- highlight cursor line underneath the cursor horizontally
vim.opt.splitbelow = true -- open new vertical split bottom
vim.opt.splitright = true -- open new horizontal splits right
vim.opt.showmode = true -- we are experienced, wo don't need the "-- INSERT --" mode hint
vim.opt.laststatus = 3

vim.opt.incsearch = true -- search as characters are entered
vim.opt.hlsearch = false -- do not highlight matches
vim.opt.ignorecase = true -- ignore case in searches by default
vim.opt.smartcase = true -- but make it case sensitive if an uppercase is entered

vim.opt.termguicolors = true
vim.o.cmdheight = 0
vim.api.nvim_create_autocmd("BufWritePost", {
  callback = function()
    vim.notify("File saved!", "info", { title = "Notification" })
  end,
})
```

这里面大多抄别人的配置文件，所以有注释，我自己写的懒得写注释了（

内容基本上是设置剪切板为系统剪切板，设置缩进为 2，开启行号等等。后几行是针对通知插件设置的，将最下栏的高度设置为 0，使其不显示，并把保存设为一个通知。

**lua/config/keymap.lua** 设置了一些快捷键，由于太长，我就不粘贴了。

**lua/config/lazy.lua** 设置了 LazyVim 插件，我直接抄的 [LazyVim 官网提供的配置方案](https://www.lazyvim.org/configuration/lazy.nvim)。

**lua/config/colorscheme.lua** 设置了 neovim 的颜色主题。

```lua
local colorscheme_dark = 'catppuccin-mocha'
local colorscheme_light = 'catppuccin-latte'

local is_ok, _ = pcall(vim.cmd, "colorscheme " .. colorscheme_dark)
if not is_ok then
  vim.notify('colorscheme ' .. colorscheme_light .. ' not found!')
  return
end
vim.api.nvim_set_hl(0, "WinSeparator", { fg = "#F8EDEC" })
```

我特地暗色和亮色的都拿了，方便我改终端背景颜色的时候改 neovim 的，我甚至为此还搞了两套底下这个 bar 的配置，不过亮色的那个配置很糊弄就是了。
