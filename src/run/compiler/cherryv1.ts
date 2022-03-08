// 用于编译第一代脚本
import path from 'path'
import fs from 'fs'
import * as cherry from '../../inprocess'

export class Page {
  url: string
  constructor() {
    this.url = 'baidu'
  }
  async create(url: string) {
    // 基础,这里想要通过代码控制，首先需要和浏览器进行通讯
    // 最简便的方法为获取到全局对象, 否则根本无法进行沟通
    // 光获取是不行的，还需要本次测试的唯一标识，这个标识如何获取到
    // @ts-ignore
    console.log('create', url, __cherryRun.gid)
    // @ts-ignore
    const launchOptions = {
      headless: false,
      executablePath: undefined,
    }
    const browserType = (cherry as any).chromium
    const browser = await browserType.launch(launchOptions)

    const contextOptions = {
      deviceScaleFactor: 1,
    }
    const context = await browser.newContext(contextOptions)
    // 创建 context的时候会有一个gid，但这和测试的不太相同，首先我们确认是否需要这样一个gid
    // 这主要体现在并行测试上，因为我们没有全局的test。因此不能再这个时候给他gid。

    const page = await context.newPage()
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await page.goto(url)
    }
  }

  async change(index: number) {
    console.log('change')
  }
}

export class Dom {
  async click(sign:string) {
    // @ts-ignore
    console.log('create click', __cherryRun.gid, sign)
  }

  async set(value:string, sign:string) {
    console.log('create set')
  }

  async fill(sign:string, value:string) {
    console.log('create fill')
  }
}
