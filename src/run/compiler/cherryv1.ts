// 用于编译第一代脚本
import path from 'path'
import fs from 'fs'
import * as cherry from '../../../index'
import TestControl from '../../test_control/testControl'

declare namespace NodeJS {
  interface Global {
    __cherryRun: {
      gid:string
    }
  }
}

// eslint-disable-next-line
declare var global: NodeJS.Global & typeof globalThis

function getControl(id: string) {
  return cherry.testControl.get(id)
}

export class Page {
  url: string
  constructor() {
    this.url = 'baidu'
  }
  async create(url: string) {
    const gid = global.__cherryRun.gid
    const control = getControl(gid)
    // 这个控制器必须存在
    if (control == undefined) throw new Error(`control not find by gid: ${gid}`)
    const contextOptions = {
      deviceScaleFactor: 1,
    }
    const context = await control.browser.newContext(contextOptions)
    control.updateContext(context)
    // 创建 context的时候会有一个gid，但这和测试的不太相同，首先我们确认是否需要这样一个gid
    // 这主要体现在并行测试上，因为我们没有全局的test。因此不能再这个时候给他gid。
    const page = await context.newPage()
    control.updatePage(page)
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
    const control = getControl(global.__cherryRun.gid)
    await control?.currentPage?.click(sign)
  }

  async set(value:string, sign:string) {
    const control = getControl(global.__cherryRun.gid)
    await control?.currentPage?.fill(sign, value)
    console.log('create set')
  }

  async fill(sign:string, value:string) {
    const control = getControl(global.__cherryRun.gid)
    await control?.currentPage?.fill(sign, value)
  }
}
