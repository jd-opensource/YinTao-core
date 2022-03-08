import fs from 'fs'
import path from 'path'
import TestControl from '../../test_control/testControl'
import Resolver from './resolver'

// 初版driver脚本解析
export default class V1Parse extends Resolver {
  testId:string
  control:TestControl
  constructor(testControl:TestControl) {
    super()
    this.testId = testControl.id
    this.control = testControl
  }

  registerGlobalApi() {
    return {
      page: new Page(this.control),
      dom: new Dom(this.control),
      __cherryRun: {
        gid: this.testId,
      },
    }
  }

  unRegisterGlobalApi() {
    delete global.page
    delete global.dom
    delete global.__cherryRun
  }
}

class Page {
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
  }
  async create(url: string) {
    // 这个控制器必须存在
    if (this.control == undefined) throw new Error('control not find by gid')
    const contextOptions = {
      deviceScaleFactor: 1,
    }
    const context = await this.control.browser.newContext(contextOptions)
    this.control.updateContext(context)
    // 创建 context的时候会有一个gid，但这和测试的不太相同，首先我们确认是否需要这样一个gid
    // 这主要体现在并行测试上，因为我们没有全局的test。因此不能再这个时候给他gid。
    const page = await context.newPage()
    this.control.updatePage(page)
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await page.goto(url)
    }
  }

  async change(index: number) {
    console.log('change')
  }
}

class Dom {
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
  }

  async click(sign:string) {
    // @ts-ignore
    await this.control?.currentPage?.click(sign)
  }

  async set(value:string, sign:string) {
    await this.control?.currentPage?.fill(sign, value)
  }

  async fill(sign:string, value:string) {
    await this.control?.currentPage?.fill(sign, value)
  }
}
