import fs from 'fs'
import path from 'path'
import TestControl from '../../test_control/testControl'
import { __sleep } from '../../utils/suger'
import Resolver from './resolver'
import { Page as PageType } from '../../../types/types'

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
      sleep: __sleep,
      __cherryRun: {
        gid: this.testId,
      },
    }
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
    const page = await context.newPage()
    this.control.updatePage(page) //  这块后续看是否需要
    this.control.updateContext(page)
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await page.goto(url)
    }
  }

  async to(url:string) {
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.runContext?.goto(url)
    }
  }

  async change(index: number) {
    console.log('change')
  }

  async changeIframe(index: number) {
    if (this.control.runContext && (<PageType> this.control.runContext).frames) {
      this.control.updateContext((<PageType> this.control.runContext).frames()[++index])
    } else {
      throw new Error('Unable to switch ifarme! not frames.')
    }
  }
}

class Dom {
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
  }

  async click(sign:string) {
    // @ts-ignore
    await this.control?.runContext?.click(sign)
  }

  async set(value:string, sign:string) {
    await this.control?.runContext?.fill(sign, value)
  }

  async fill(sign:string, value:string) {
    await this.control?.runContext?.fill(sign, value)
  }
}
