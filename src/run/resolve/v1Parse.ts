import fs from 'fs'
import os from 'os'
import path from 'path'
import expect from 'expect'
import axios from 'axios'
import Resolver from './resolver'
import { Result, RunOptions } from '..'
import * as cherry from '../../../index'
import { __sleep } from '../../utils/suger'
import TestControl from '../../test_control/testControl'
import { download, mkdirIfNeeded } from '../../utils/utils'
import { Page as PageType, Route, Request } from '../../../types/types'
import { reportRunImage, reportRunLog, reportRunResult } from '../../utils/remoteReport'

// 初版driver脚本解析
export default class V1Parse extends Resolver {
  testId: string
  control: TestControl
  runOptins: RunOptions

  constructor(testControl: TestControl, runOptins: RunOptions) {
    super()
    this.testId = testControl.id
    this.control = testControl
    this.runOptins = runOptins
  }

  registerGlobalApi() {
    const cookies = new Cookies(this.control)
    const utils = new Utils(this.control)
    return {
      page: new Page(this),
      keyboard: new Keyboard(this),
      mouse: new Mouse(this),
      browser: new Browser(this),
      dom: new Dom(this.control),
      sleep: __sleep,
      axios,
      cookies: cookies.parse.bind(cookies),
      locator: (sign, options) => this.control.runContext?.locator(sign, options),
      hint: () => { console.log('hint Temporary does not support!') },
      clearCookie: cookies.clearCookie.bind(cookies),
      asyncReport: asyncReport.bind(this),
      execJavaScript: utils.execJavaScript.bind(utils),
      assert: new assert(this.control),
      __cherryRun: {
        gid: this.testId,
      },
    }
  }
}

interface PageOptions {
  referer?: string;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
}

class assert {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  async all(text:string) {
    const locator = this.control.runContext?.locator('body')
    expect(await locator?.innerHTML()).toContain(text)
  }

  async location(url:string) {
    const pageUrl = this.control.runContext?.url()
    expect(pageUrl).toBe(url)
  }

  async title(title:string) {
    const pageTitle = await this.control.currentPage?.title()
    expect(pageTitle).toBe(title)
  }

  async custom(sign: string, attr: string, will: any, opreate: number) {
    const locator = this.control.runContext?.locator(sign)
    if (!locator) throw new Error(`custom not find sign:', ${sign}`)
    const result = await locator[attr]()
    switch (opreate) {
      case 0: {
        expect(result).toBe(will)
        break
      }
      case 1: {
        expect(result).not.toBe(will)
        break
      }
      case 2: {
        expect(result).toMatch(will)
        break
      }
      case 3: {
        expect(result).not.toMatch(will)
        break
      }
    }
  }
}

/**
 * @method 远程上报case执行（用于合并任务进度上报）
 * @param this
 * @param args
 */
async function asyncReport(this: V1Parse, ...args: any) {
  // @ts-ignore
  const { result, image, log } = this.runOptins?.remoteReport || {}
  if (result) {
    // 首先想要回掉结果，前提是拿到执行结果
    // 我们怎么获取到执行结果
    const resultData: Result = {
      duration: new Date().getTime() - (this.runOptins._startTime as number),
      success: true,
      code: 2000,
      msg: 'success',
      divertor: [],
    }
    await reportRunResult(result, resultData, { args, ...this.runOptins.storage })
  }
  if (image) {
    await reportRunImage(image, this.runOptins._screenImages, { args, ...this.runOptins.storage })
    // 上传完毕要清除掉数组
    this.runOptins._screenImages = []
  }

  if (log) {
    await reportRunLog(log, "success", { args, ...this.runOptins.storage })
  }

  // 去除已上报的case
  if (this.runOptins.storage && this.runOptins.storage.__caseList) {
    this.runOptins.storage.__caseList.shift()
  }
}

class Browser {
  control: TestControl
  parse: any

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
  }

  on(event:string, callback:any) {
    this.control.browserContext?.on(event as any, callback)
  }

  route(url: string|RegExp|((url: URL) => boolean), handler: ((route: Route, request: Request) => void), options?: {
    times?: number;
  }) {
    this.control.browserContext?.route(url, handler, options)
  }
}

class Keyboard {
  control: TestControl
  parse: V1Parse
  defaultContextOptions: Object

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.defaultContextOptions = {}
  }

  async press(key: string, options?: {
    /**
     * Time to wait between `keydown` and `keyup` in milliseconds. Defaults to 0.
     */
    delay?: number;
  }) {
    await this.control.currentPage?.keyboard.press(key, options)
  }

  async down(key:string) {
    await this.control.currentPage?.keyboard.down(key)
  }

  async up(key:string) {
    await this.control.currentPage?.keyboard.up(key)
  }

  async type(text: string, options?: {
    /**
     * Time to wait between key presses in milliseconds. Defaults to 0.
     */
    delay?: number;
  }) {
    await this.control.currentPage?.keyboard.type(text, options)
  }
}

class Mouse {
  control: TestControl
  parse: V1Parse
  defaultContextOptions: Object

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.defaultContextOptions = {}
  }

  async click(x: number, y: number, options?: {
    /**
     * Defaults to `left`.
     */
    button?: "left"|"right"|"middle";

    /**
     * defaults to 1. See [UIEvent.detail].
     */
    clickCount?: number;

    /**
     * Time to wait between `mousedown` and `mouseup` in milliseconds. Defaults to 0.
     */
    delay?: number;
  }) {
    await this.control.currentPage?.mouse.click(x, y, options)
  }

  async down(options?: {
    /**
     * Defaults to `left`.
     */
    button?: "left"|"right"|"middle";

    /**
     * defaults to 1. See [UIEvent.detail].
     */
    clickCount?: number;
  }) {
    await this.control.currentPage?.mouse.down(options)
  }

  async up(options?: {
    /**
     * Defaults to `left`.
     */
    button?: "left"|"right"|"middle";

    /**
     * defaults to 1. See [UIEvent.detail].
     */
    clickCount?: number;
  }) {
    await this.control.currentPage?.mouse.up(options)
  }

  async wheel(deltaX: number, deltaY: number) {
    await this.control.currentPage?.mouse.wheel(deltaX, deltaY)
  }
}

class Page {
  control: TestControl
  parse: V1Parse
  defaultContextOptions: Object

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.defaultContextOptions = {}
  }

  setDevice(name:string) {
    // 设置名称
    const deviceOptions = cherry.devices[name]
    if (deviceOptions === undefined) {
      throw new Error(`The lack of the preset ${name}`)
    }
    this.defaultContextOptions = { ...this.defaultContextOptions, ...deviceOptions }
  }

  async create(url: string, options?: PageOptions) {
    // 这个控制器必须存在
    if (this.control == undefined) throw new Error('control not find by gid')
    await this._createContext()
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.currentPage?.goto(url, options)
    }
  }

  async _createContext() {
    const contextOptions = {
      deviceScaleFactor: 1,
      ...this.defaultContextOptions,
    }
    const context = await this.control.browser.newContext(contextOptions)
    context.setDefaultTimeout(5000) // 5s
    context.setDefaultNavigationTimeout(10000) // 10s
    this.control.setBrowserContext(context)
    const page = await context.newPage()
    this.control.updatePage(page) //  这块后续看是否需要
    this.control.updateContext(page)
  }

  /**
   * @method 设置页面宽高
   */
  async setViewSize(width: number, height: number) {
    await this.control?.currentPage?.setViewportSize({ width, height })
  }

  async refresh(options:PageOptions) {
    this.control.currentPage?.reload(options)
  }

  async to(url: string, options?: PageOptions) {
    if (this.control.currentPage === undefined) {
      await this._createContext()
    }

    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.currentPage?.goto(url, options)
    }
  }

  async screenshot(imgPath: string) {
    // 服务运行不落磁盘
    const buffer = await this.control.currentPage?.screenshot({ path: os.type() === 'Linux' ? undefined : imgPath, type: 'jpeg' })
    if (buffer) {
      this.parse.runOptins._screenImages.push({
        path: path.resolve(imgPath),
        buffer,
        name: path.basename(imgPath),
      })
    }
  }

  async back() {
    await this.control?.currentPage?.goBack()
  }
  async forward() {
    await this.control?.currentPage?.goForward()
  }

  async getURL(): Promise<string> {
    return this.control?.currentPage?.url() as string
  }

  async change(index: number) {
    const pages = this.control.browserContext?.pages()
    if (pages && pages.length > 0) {
      this.control.updatePage(pages[index])
      this.control.updateContext(pages[index])
    }
    await this.control.currentPage?.bringToFront()
  }

  async changeIframe(index: number| string) {
    if (index == -1) { // 切出iframe
      this.control.updateContext(this.control.currentPage as PageType)
    }

    if (typeof index === 'string') {
      const frame = this.control.currentPage?.frame(index)
      if (!frame) {
        throw new Error(`miss iframe name: ${index}`)
      }
      this.control.updateContext(frame)
    } else if (this.control.runContext && (<PageType> this.control.runContext).frames) {
      this.control.updateContext((<PageType> this.control.runContext).frames()[++index])
    } else {
      throw new Error('Unable to switch ifarme! not frames.')
    }
  }
}

class Utils {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  async execJavaScript(body: string) {
    this.control.runContext?.evaluate(body)
  }
}

class Cookies {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  /**
  * @description 根据url解析doman
  */
  getDomain(url: string): string {
    const urlReg = /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/
    const cc = url.match(urlReg)
    if (cc !== null && cc.length > 1) {
      const coms = cc[0].split('.')
      if (coms.length > 2) {
        coms.shift()
        return `.${coms.join('.')}`
      }
    }
    return ''
  }

  async parse(type: string, value: string | object, data: string) {
    switch (type) {
      case 'setAll': {
        const url = value as string
        let cookieData = data
        cookieData = cookieData.slice(0, 7) === 'Cookie:' ? cookieData.slice(7) : cookieData
        const kvs = cookieData.split(';')
        const cookieList: any[] = []
        kvs.map(async (kv) => {
          let value; let
            name
          const datas = kv.split('=')
          if (datas.length == 2) {
            name = datas[0].trim()
            value = datas[1]
          } else { // 特殊值,一组cookie可能包含多个=号
            name = kv.slice(0, kv.indexOf('=')).trim()
            value = kv.slice(kv.indexOf('=') + 1)
          }
          const domain = this.getDomain(url)
          if (domain != '') {
            const cookie = { // 追加
              url,
              name,
              value,
            }
            cookieList.push(cookie)
          } else {
            console.error('getDomain domain error:', domain, url)
          }
        })
        console.log('要设置的cookieList', cookieList)
        await this.control.browserContext?.addCookies(cookieList)
        break
      }
      case 'set': {
        await this.control.browserContext?.addCookies(value as any)
      }
    }
  }

  async clearCookie() {
    await this.control.browserContext?.clearCookies()
  }
}

class Dom {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  async click(sign: string) {
    // @ts-ignore
    await this.control?.runContext?.click(sign)
  }

  async set(value: string, sign: string) {
    await this.control?.runContext?.type(sign, value)
  }

  async reSet(value: string, sign: string) {
    await this.control?.runContext?.fill(sign, value)
  }

  async wait(sign: string, ms?: number) {
    await this.control?.runContext?.waitForSelector(sign, { timeout: ms })
  }

  async hover(sign: string) {
    await this.control?.runContext?.hover(sign)
  }

  async exist(sign: string): Promise<boolean> {
    return !!await this.control?.runContext?.isVisible(sign)
  }

  async fill(sign: string, value: string) {
    await this.control?.runContext?.fill(sign, value)
  }

  async select(sign:string, value: any) {
    await this.control?.runContext?.selectOption(sign, value)
  }

  async upload(sign: string, files: string | string[]): Promise<void> {
    if (files instanceof Array) {
      for (const _path of files) {
        if (fs.existsSync(_path) === false) {
          throw new Error(`Invalid file path: ${_path}`)
        }
      }
    } else {
      if (/http[s]{0,1}:\/\/([\w.]+\/?)\S*/.test(files)) {
        /**
         * todo: https://playwright.dev/docs/api/class-page#page-set-input-files
         * 链接上传使用object避免落磁盘
         */
        const downloadPath = path.join(os.tmpdir(), 'cherryDfSession', this.control.id + path.basename(files))
        await mkdirIfNeeded(downloadPath)
        await download(files, downloadPath)
        files = downloadPath
      } else if (fs.existsSync(files) === false) {
        throw new Error(`Invalid file path: ${files}`)
      }
      await this.control?.runContext?.setInputFiles(sign, files)
    }
  }
}
