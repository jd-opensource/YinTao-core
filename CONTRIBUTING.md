# 为 Cherry Core 做贡献

### 目录

-   [Cherry社区](#Cherry社区)
-   [从源代码构建Cherry Core](#从源代码构建Cherry-Core)
    -   [准备工作](#准备工作)
    -   [创建 Cherry Core](#创建-Cherry-Core)
-   [测试新版本](#测试新版本)
    -   [报告错误和问题](#报告错误和问题)
        -   [创建一个简单示例](#创建一个简单示例)
    -   [寻求社区支持](#寻求社区支持)
-   [贡献代码](#贡献代码)
-   [指南](#指南)

## Cherry社区

`CherryCore` 由京东集团-京东零售-商业提升事业部-广告架构部-技术效能部下开发团队维护。`CherryCore` 是一个开源项目，没有团队的积极支持是不可能的。我们感谢并鼓励您的贡献。

`Coding` 活动帮助 `CherryCore` 团队衡量我们的用户最想要什么。[提交问题](https://coding.jd.com/cherry/cherry-core/issues/new) ，分享您对 `CherryCore` 未来的想法。为现有问题添加投票和评论，以帮助我们确定工作的优先级。也可以加入咚咚群（1024606726）和我们一起讨论。

## 从源代码构建Cherry Core

如果你想测试 `CherryCore` 的开发版本，或者为项目贡献代码，你需要知道如何从 [源代码](https://coding.jd.com/cherry/cherry-Core) 构建框架。

#### 准备工作

`CherryCore` 是一个 [Node.js](https://nodejs.org/en/) 应用程序.我们建议使用最新的稳定版本。 它支持 [所有积极维护](https://github.com/nodejs/Release#release-schedule) 的 `Node.js` 框架版本。 安装过程需要[node package manager](https://www.npmjs.com/) (npm) 软件实用程序。

运行以下 `shell` 命令以检查您的操作系统是否包含 `node` 和 `npm`：

```sh
node -v; yarn -v

# 安装yarn
npm i -g  yarn
```

如果您的系统不包含 `Node.js`， 请从[Node.js 官网](https://nodejs.org/en/) 下载并安装它。

您还需要在计算机上安装[Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) 。安装说明取决于您的操作系统——有关详细信息，请参阅[Git 网站](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) 。

#### 创建 Cherry Core

1. [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)  [Cherry Core 仓库](https://coding.jd.com/cherry/cherry-core).

    ```sh
    git clone https://coding.jd.com/cherry/cherry-core.git
    ```
    
2. 切换到仓库的根目录。安装依赖项，请运行以下 `shell` 命令：

    ```sh
    yarn
    # 编译代码
    yarn build
    # 安装浏览器环境
    yarn run install
    ```

3. 运行以下 `shell` 命令来构建项目：
    ```sh
    yarn build    # 打包windows, mac

    yarn build:linux  #  打包linux( 请异步至虚拟机或linux服务器编译 )
    ```
   
## 测试新版本

在我们在发布新版本的 `CherryCore` 之前，我们会彻底测试它们。我们邀请您参与此过程。

请不要在生产环境中使用 `CherryCore` 的开发版本。

### 报告错误和问题

如果您遇到错误，请检查[Issues](https://coding.jd.com/cherry/cherry-Core/issues/) 以获取现有错误报告。如果不存在该问题的报告，请提交一个新问题。

#### 创建一个简单示例
在您的错误报告中包含一个简单示例很重要。一个好的示例可确保问题易于重现和排除故障，同时尽可能小且尽可能简单。

一个最小的工作示例应该：

-   简单易懂。复杂的场景很难重现。
-   排除无助于重现问题的代码。删除不影响结果的操作。
-   包括一整套相关数据：测试页面的 URL、启动选项列表以及启动测试所遵循的步骤。

### 寻求社区支持

如果您需要有关 `CherryCore` 的帮助，或者想帮助其他用户，请加入咚咚群（1024606726）。

## 贡献代码

提交代码时，请按照以下步骤操作。
1. 搜索问题列表以查看您要处理的错误或功能是否存在或创建新问题。
2. 要解决已经描述的问题，请检查计划与您讨论以确保解决。目前没有人在处理它发表的有关您希望解决此问题的说明，并包含有关您如何执行此操作的详细信息。核心团队成员可能需要与您讨论建议开始修复的细节。在他们批准后，发表评论说您已处理此问题。
3. 在您的开发机器上安装 `Node.js`。
4.  `Fork CherryCore` 并在你的 `fork` 中创建一个分支。使用问题编号命名此分支，例如, `gh852`, `gh853`.
5. 在本地副本的根目录中，运行：
   run:

    ```sh
    npm install
    ```

   or (for [Yarn](https://yarnpkg.com/) users):

    ```sh
    yarn
    ```
6. 编写代码并提交您的修改到分支。
7. 如果您要代码修复错误，请在测试中添加适当的部分。要查找这些部分，请在测试 Regression中搜索。
   对于新功能，添加单元/功能测试。
8. 获取上游更改，并将分支重新设置到 `master` 上
9. 运行测试以检查一切是否正常。
    ```sh
    yarn test
    ```
10. 将改动推送到你的 `fork` 上，并打开 `pull` 请求。

在提交拉取请求之前，它必须满足以下条件：

- 拉取请求名称应描述您实施的更改
- 拉取请求描述应包含适当的问题编号的关闭指令
- 所有现有的和新的测试都必须通过
- 必须在没有错误的情况下进行 linted 代码（请参见制造说明）

## 指南

CherryCore 团队遵循一套写作指南，使我们的文档易于阅读。提交书面内容时请遵守以下规则：

-   避免双重否定。
-   避免误导或模棱两可的词语和行话。
-   避免在代词及其先行词之间进行模糊和混乱的引用。
-   是描述性的而不是规定性的。
-   让你的句子简短而简单。确保每个句子只表达一个想法。
-   不要重复相同的信息。
-   如果可能，包括交互式示例（代码示例、屏幕截图等）。

