import fs from 'fs'
import os from 'os'
import path from 'path'
import expect from 'expect'
import axios from 'axios'
import Resolver from './resolver'
import { Result, RunOptions } from '..'
import * as cherry from '../../../index'
import { __retry_time, __sleep } from '../../utils/suger'
import TestControl from '../../test_control/testControl'
import { download, mkdirIfNeeded } from '../../utils/utils'
import {
  Page as PageType, Route, Request, Response,
} from '../../../types/types'
import { reportRunImage, reportRunLog, reportRunResult } from '../../utils/remoteReport'

/**
 *  @method 将内部堆栈以外部脚本抛出
 */
function throwStack() {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const methodFun = descriptor.value
    descriptor.value = async function (...args) {
      try {
        await methodFun.apply(this, args)
      } catch (error) {
        throw new Error(`${key} instruction fail ${error.message}`)
      }
    }
  }
}

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
    const utils = new Utils(this.control)
    return {
      page: new Page(this),
      keyboard: new Keyboard(this),
      mouse: new Mouse(this),
      browser: new Browser(this),
      expect,
      dom: new Dom(this.control),
      sleep: __sleep,
      axios,
      cookies: new Cookies(this),
      locator: (sign, options) => this.control.runContext?.locator(sign, options),
      hint: () => { console.log('hint Temporary does not support!') },
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

/**
 * warn: event Function must use this parcel
 * export: window.on('ready',wrapHandler(callback))
 */
function wrapHandler(fn) {
  return function (evt) {
    new Promise((resolve) => {
      resolve(fn(evt))
    }).catch((e) => {
      handleError(e)
    })
  }
}

function handleError(err) {
  if (!(err instanceof Error)) {
    err = Error(err)
  }
  console.log(`error handler: ${err.message}`, "yellow")
}

class assert {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  async all(text:string, times:number = 6) {
    const _this = this
    const __wait_call = async (func:()=> Promise<boolean>, number:number, sleep:number) => {
      while (number > 0) {
        number--
        if (await func()) {
          return
        }
        await __sleep(sleep)
      }
      throw new Error(`assert.all error: not find ${text}`)
    }
    await __wait_call(async () => {
      const locator = _this.control.runContext?.locator('body')
      const htmlText = await locator?.innerHTML() || ''
      return htmlText.includes(text)
    }, times, 500)
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
    let result
    if (attr == 'innerText') {
      result = await locator.innerText()
    } else {
      result = await locator.getAttribute(attr)
    }
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
  const { result, image, log } = this.runOptins?.remoteReport || {}
  if (result) {
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
    this.runOptins._screenImages = []
  }

  if (log) {
    await reportRunLog(log, "success", { args, ...this.runOptins.storage })
  }

  // delete reported case
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
    // Todo: callback maybe throw error, but it not block run
    this.control.browserContext?.on(event as any, wrapHandler(callback))
  }

  route(url: string|RegExp|((url: URL) => boolean), handler: ((route: Route, request: Request) => void), options?: {
    times?: number;
  }) {
    this.control.browserContext?.route(url, wrapHandler(handler), options)
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

  @throwStack()
  async press(key: string, options?: {
    /**
     * Time to wait between `keydown` and `keyup` in milliseconds. Defaults to 0.
     */
    delay?: number;
  }) {
    await this.control.currentPage?.keyboard.press(key, options)
  }

  @throwStack()
  async down(key:string) {
    await this.control.currentPage?.keyboard.down(key)
  }

  @throwStack()
  async up(key:string) {
    await this.control.currentPage?.keyboard.up(key)
  }

  @throwStack()
  async type(text: string, options?: {
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

  @throwStack()
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

  @throwStack()
  async down(options?: {
    button?: "left"|"right"|"middle"; // Defaults to `left`.
    clickCount?: number; // defaults to 1. See [UIEvent.detail].
  }) {
    await this.control.currentPage?.mouse.down(options)
  }

  @throwStack()
  async up(options?: {
    button?: "left"|"right"|"middle"; // Defaults to `left`.
    clickCount?: number; // defaults to 1. See [UIEvent.detail].
  }) {
    await this.control.currentPage?.mouse.up(options)
  }

  @throwStack()
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
    const deviceOptions = cherry.devices[name]
    if (deviceOptions === undefined) {
      throw new Error(`The lack of the preset ${name}`)
    }
    this.defaultContextOptions = { ...this.defaultContextOptions, ...deviceOptions }
  }

  async waitForResponse(urlOrPredicate: string|RegExp|((response: Response) => boolean|Promise<boolean>), options?: {
    timeout?: number;
  }) {
    return await this.control.currentPage?.waitForResponse(urlOrPredicate, options)
  }

  async waitPopup() {
    const page = await this.control.currentPage?.waitForEvent('popup')
    if (page) {
      this.control.updatePage(page)
      this.control.updateContext(page)
    } else {
      console.log('not find popup page')
    }
  }

  @throwStack()
  async create(url: string, options?: PageOptions) {
    // must exist
    if (this.control == undefined) throw new Error('control not find by gid')

    await this._createContext()
    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.currentPage?.goto(url, options)
    }
  }

  async _createContext() {
    if (!this.control.browserContext) {
      const contextOptions = {
        deviceScaleFactor: 1,
        ...this.defaultContextOptions,
        hasTouch: false, // must false fix mobile https://jstp.m.jd.com/device/list don't click
        storageState: {
          cookies: this.parse.runOptins.cookies as any,
          origins: [],
        },
      }
      const context = await this.control.browser.newContext(contextOptions)
      context.setDefaultTimeout(5000) // 5s
      context.setDefaultNavigationTimeout(10000) // 10s
      this.control.setBrowserContext(context)
    }
    const context = this.control.browserContext
    const page = await context?.newPage()
    if (page == undefined) throw new Error('page is undefined')
    this.control.updatePage(page)
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

  @throwStack()
  async to(url: string, options?: PageOptions) {
    if (this.control.currentPage === undefined) {
      await this._createContext()
    }

    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.currentPage?.goto(url, options)
    }
  }

  @throwStack()
  async screenshot(imgPath: string) {
    // todo: sercer run don't save disk
    const buffer = await this.control.currentPage?.screenshot({ path: os.type() === 'Linux' ? undefined : imgPath, type: 'jpeg' })
    if (buffer) {
      this.parse.runOptins._screenImages.push({
        path: path.resolve(imgPath),
        buffer,
        name: path.basename(imgPath),
      })
    }
  }

  @throwStack()
  async back() {
    await this.control?.currentPage?.goBack()
  }

  @throwStack()
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

  async changeIframe(index: number| string, ms:number = 3000) {
    const _this = this
    const __changeIframe = function (index: number| string) {
      if (index == -1 && _this.control.currentPage) { // 切出iframe
        return _this.control.updateContext(_this.control.currentPage)
      }

      if (typeof index === 'string') {
        const frame = _this.control.currentPage?.frame(index)
        if (!frame) {
          throw new Error(`miss iframe name: ${index}`)
        }
        _this.control.updateContext(frame)
      } else if (_this.control.runContext && (<PageType> _this.control.runContext).frames) {
        const changeFrame = (<PageType> _this.control.runContext).frames()[index]
        if (changeFrame !== undefined) {
          _this.control.updateContext(changeFrame)
        } else {
          throw new Error(`not exist index of ${index} frame`)
        }
      } else {
        throw new Error('Unable to switch ifarme! not frames.')
      }
    }
    await __retry_time(__changeIframe, ms, index)
  }
}

class Utils {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  @throwStack()
  async execJavaScript(body: string) {
    return await this.control.runContext?.evaluate(body)
  }
}

class Cookies {
  control: TestControl
  parse: V1Parse
  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
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

  @throwStack()
  async set(value:any[]) {
    this.parse.runOptins.cookies = this.parse?.runOptins?.cookies.concat(value)
    if (this.control.browserContext) {
      await this.control.browserContext.addCookies(value as any)
    }
  }

  async setAll(url:string, cookieText:string) {
    const cookieList :any[] = []
    cookieText = cookieText.slice(0, 7) === 'Cookie:' ? cookieText.slice(7) : cookieText
    const kvs: string[] = cookieText.match(/([^;=]+)=([^;]+)/g) || []
    const domain = this.getDomain(url)
    for (const kv of kvs) {
      const [, name, value] = kv.match(/^\s*([^=]+)=(.+)/) as Array<string>
      const cookie = {
        domain,
        name,
        path: '/',
        value,
      }
      cookieList.push(cookie)
    }
    this.parse.runOptins.cookies = this.parse?.runOptins?.cookies?.concat(cookieList)
    if (this.control.browserContext) {
      await this.control.browserContext?.addCookies(cookieList)
    }
  }

  @throwStack()
  async clearCookie() {
    await this.control.browserContext?.clearCookies()
  }
}

class Dom {
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  @throwStack()
  async click(sign: string, options:any) {
    if (this.control && this.control.runContext) {
      await this.control?.runContext?.click(sign, options)
    } else {
      throw new Error('click obj not ok')
    }
  }

  @throwStack()
  async set(value: string, sign: string) {
    await this.control?.runContext?.type(sign, value)
  }

  @throwStack()
  async getAttributes(sign:string, attr:string) {
    return await this.control?.runContext?.getAttribute(sign, attr)
  }

  @throwStack()
  async reSet(value: string, sign: string) {
    await this.control?.runContext?.fill(sign, value)
  }

  @throwStack()
  async wait(sign: string, ms?: number) {
    await this.control?.runContext?.waitForSelector(sign, { timeout: ms })
  }

  @throwStack()
  async hover(sign: string) {
    await this.control?.runContext?.hover(sign)
  }

  @throwStack()
  async exist(sign: string, ms:number = 2000) : Promise<boolean> {
    const __wait_time = async (func:any, ms:number, args: any = undefined) => {
      let count = parseInt(((ms / 1000) * 2) as any, 10)
      while (count > 0) {
        count--
        const result = await func(args)
        if (result || count === 0) {
          return result
        }
        await __sleep(500)
      }
    }
    return await __wait_time(this.control?.runContext?.isVisible.bind(this.control.runContext), ms, sign) as boolean
  }

  /**
   * @method 输入框填充文本
   * @param {string} sign  mixture selector resource location
   * @param {string} value  input text
   * @param {Object} options selected config
   */
  @throwStack()
  async fill(sign: string, value: string, options?: {
    force?: boolean; // jump chencks Defaults to `false`
    noWaitAfter?: boolean; // When true, the call requires selector to resolve to a single element.
    strict?: boolean; // When true, the call requires selector to resolve to a single element.
    timeout?: number; // Maximum time in milliseconds, defaults to 30 seconds, pass `0` to disable timeout. The default value can be changed by
  }) {
    await this.control?.runContext?.fill(sign, value, options)
  }

  @throwStack()
  async select(sign:string, value: any) {
    await this.control?.runContext?.selectOption(sign, value)
  }

  @throwStack()
  async upload(sign: string, files: string | string[]): Promise<void> {
    if (Array.isArray(files)) {
      for (const index in files) {
        const filepath = files[index]
        if (/http[s]{0,1}:\/\/([\w.]+\/?)\S*/.test(filepath)) {
          const downloadPath = path.join(os.tmpdir(), 'cherryDfSession', this.control.id + path.basename(filepath))
          await mkdirIfNeeded(downloadPath)
          await download(filepath, downloadPath)
          files[index] = downloadPath
        } else if (fs.existsSync(filepath) === false) {
          throw new Error(`Invalid file path: ${filepath}`)
        }
      }
    } else if (/http[s]{0,1}:\/\/([\w.]+\/?)\S*/.test(files)) {
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
