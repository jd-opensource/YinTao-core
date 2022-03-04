# cherry-core


<div align=center><img width="150" height="150" src="https://raw.githubusercontent.com/rr13k/cherry/master/strawberry.ico"/></div>

<p align="center">
<a href="https://coding.jd.com/cherry/cherry-core/"><img alt="Tests" src="https://badgen.net/badge/cherry/core/pink?icon=github"></a>
<a href="https://coding.jd.com/cherry/cherry-core/"><img alt="Test Dependencies" src="https://badgen.net/badge/webUi/auto/red?icon=github" /></a>
<a href="https://coding.jd.com/cherry/cherry-core/"><img alt="NPM Version" src="https://badgen.net/github/status/micromatch/micromatch/4.0.1" style="max-width:100%;"></a>
<a href="https://coding.jd.com/cherry/cherry-core/"><img alt="NPM Version" src="https://badgen.net/badge/license/MIT/blue" style="max-width:100%;"></a>
</p>

<div align=center>
    <i>cherry 执行引擎
    </br>js/ts脚本执行输出</i>
</div>
<br/>

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [主流程](#主流程)
    - [跨平台的系统通知](#跨平台的系统通知)
- [开发规范](#开发规范)
- [问题跟踪](#问题跟踪)
- [贡献](#贡献)
- [徽章](#徽章)
- [执照](#执照)
- [Creators](#Creators)
- [帮助](#帮助)


## Background
  hi, 准备开始UI自动化了吗？

  觉得难吗?

  建议你从这个库开始!
> 用简单的逻辑描述你的工作，剩下的交给我


  
## Install

推荐使用  `yarn`。十分简单。
```shell
yarn add @cherry/cherry-core
```

## Usage

```sh
cherry main.js # default use cherry-drier
cherry -b   # get local browsers
->  usable browsers: [ 'chrome', 'ie', 'firefox', 'edge', 'edge-legacy' ]
cherry chrome  main.js // use other browser
```

## 主流程

- 采用 `cli` 脚本维度进行执行。这样可以以多进程维度同时执行多个测试。
初始启动浏览器，进入待执行界面。
- 等待脚本文件执行， `page.to` 起始挂载 运行的首个测试地址。整个脚本内容为单个 `case/flow`
- 同样采用合并脚本的形式执行串联任务。
- 运行时需提供当前执行状态，是以并合执行还是普通单文件。以使用户单文件情况下也可正常调试。
- 日志逻辑相同。


> 起始命令用 `page.create` 新窗口不影响老的用例，但依旧可以继承老数据。 

### 跨平台的系统通知
> node-notifier  https://github.com/mikaelbr/node-notifier

## 开发规范

1. 复杂函数必须采用中文注释，不建议使用函数同名中文注释，注释仅表达坑点，而非实现。
2. 字符串强制使用 ' 单引号，禁止非必要的;符号。
3. 引用对象必须给明，强制类型，禁止传递any等不明确内容。
4. 新功能必须添加单元测试，上线前单元测试必须通过。
5. 禁止在非必要的时候写大函数，避免代码臃肿，单一使用的地方禁止封装函数(除非它可能被调用)。

## 问题跟踪

使用我们的 `Coding Issues` 页面 [报告错误](https://coding.jd.com/cherry/cherry-core/issues/new) 并 [提出改进建议](https://coding.jd.com/cherry/cherry-core/issues/new)

## 贡献

阅读我们的[贡献指南](https://coding.jd.com/cherry/cherry-core/blob/master/CONTRIBUTING.md) ，了解如何为项目做出贡献。

## 徽章

向大家展示您正在使用 `CherryCore`: ![Tested with CherryCore](https://img.shields.io/badge/tested%20with-CherryCore-2fa4cf.svg)

要显示此徽章，请将以下代码添加到您的存储库自述文件中：

```html
<a href="https://coding.jd.com/cherry/cherry-core/">
    <img alt="Tested with CherryCore" src="https://img.shields.io/badge/tested%20with-CherryCore-2fa4cf.svg">
</a>
```

## 执照

>Code released under the [MIT license](LICENSE).

## Creators

> 京东集团-京东零售-商业提升事业部-广告架构部-技术效能部

## 帮助

> zhouyuan11@jd.com
