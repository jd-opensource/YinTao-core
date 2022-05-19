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
import { FCherryPage, FCherryDom,FCherryCookies,FCherryAssert,FCherryKeyboard,FCherryMouse,FCherryBrowser } from './parse'

/**
 *  @method 将内部堆栈以外部脚本抛出
 */
function throwStack() {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const methodFun = descriptor.value
    descriptor.value = async function (...args) {
      try {
        return await methodFun.apply(this, args)
      } catch (error) {
        throw new Error(`${key} instruction fail ${error.message}`)
      }
    }
  }
}

// 初版driver脚本解析
export default class V1Parse extends Resolver {
  private testId: string
  control: TestControl
  runOptins: RunOptions
  console: Console
  private __log_body: any[]

  constructor(testControl: TestControl, runOptins: RunOptions) {
    super()
    this.testId = testControl.id
    this.control = testControl
    runOptins.__log_body = []
    this.runOptins = runOptins
    this.__log_body = []

    const _this = this
    const handler = {
      get(trapTarget, key, receiver) {
        return function (...args) {
          if (key == 'log' || key == 'error' || key == 'warn') {
            args.unshift(key)
            _this.runOptins.__log_body?.push(args.join(' '))
          }
          trapTarget[key](...args)
        }
      },
    };
    this.console = new Proxy(console,handler)
  }

  registerGlobalApi() {
    const utils = new Utils(this.control)
    return {
      console:this.console,
      page: new Page(this),
      keyboard: new Keyboard(this),
      mouse: new Mouse(this),
      browser: new Browser(this),
      expect,
      dom: new Dom(this),
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

class assert implements FCherryAssert{
  control: TestControl
  constructor(testControl: TestControl) {
    this.control = testControl
  }

  @throwStack()
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

  @throwStack()
  async location(url:string) {
    const pageUrl = this.control.runContext?.url()
    expect(pageUrl).toBe(url)
  }

  @throwStack()
  async title(title:string) {
    const pageTitle = await this.control.currentPage?.title()
    expect(pageTitle).toContain(title)
  }

  @throwStack()
  async custom(sign: string, attr: string, will: any, opreate: number) {
    const locator = this.control.runContext?.locator(sign)
    if (!locator) throw new Error(`custom not find sign:', ${sign}`)
    let result
    if (attr == 'innerText') {
      result = await locator.innerText()
    } else if (attr == 'value') {
      result = await locator.inputValue()
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
 * @method 远程上报case执行(用于合并任务进度上报)
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

class Browser implements FCherryBrowser{
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

  //@ts-ignore
  route(url: string|RegExp|((url: URL) => boolean), handler: ((route: Route, request: Request) => void), options?: {
    times?: number;
  }) {
    this.control.browserContext?.route(url, wrapHandler(handler), options)
  }
}

class Keyboard implements FCherryKeyboard{
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

class Mouse implements FCherryMouse{
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

class Page implements FCherryPage{
  control: TestControl
  parse: V1Parse
  defaultContextOptions: Object
  console:Console

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.defaultContextOptions = {}
    this.console = v1parse.console
  }

  async setDevice(name:string) {
    const deviceOptions = cherry.devices[name]
    if (deviceOptions === undefined) {
      throw new Error(`The lack of the preset ${name}`)
    }
    deviceOptions.hasTouch = false // must false fix mobile https://jstp.m.jd.com/device/list don't click
    this.defaultContextOptions = { ...this.defaultContextOptions, ...deviceOptions }
  }

  @throwStack()
  async waitForResponse(urlOrPredicate: string|RegExp|((response: Response) => boolean|Promise<boolean>), options?: {
      timeout?: number;
    }){
    if(!this.control.currentPage) throw new Error('miss currentPage.')
    return await this.control.currentPage.waitForResponse(urlOrPredicate, options)
  }

  @throwStack()
  async waitPopup(opt:any) :Promise<void>{
    const page = await this.control.currentPage?.waitForEvent('popup', opt)
    if (page) {
      this.control.updatePage(page)
      this.control.updateContext(page)
    } else {
      this.console.log('not find popup page')
    }
  }

  @throwStack()
  async waitForEvent(event:"framenavigated", opt:any) {
    const page = await this.control.currentPage?.waitForEvent(event, opt)
    if (event === 'framenavigated' && page) {
      this.control.updateContext(page)
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
    let viewport
    if (this.parse.runOptins.screen) {
      viewport = {
        width: Math.floor(this.parse.runOptins.screen.width * 0.98),
        height: Math.floor(this.parse.runOptins.screen.height * 0.9),
      }
    }

    if (!this.control.browserContext) {
      const contextOptions = {
        deviceScaleFactor: 1,
        // eslint-disable-next-line no-unsafe-optional-chaining
        viewport,
        ...this.defaultContextOptions,
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
    this.console.log('screenshot img path:', path.resolve(imgPath))
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

  async change(rule: number | string) {
    let page
    const pages = this.control.browserContext?.pages()
    if (!pages || pages.length == 0) throw new Error('not page can be change!')
    if (typeof rule === 'number') {
      if (rule >= pages.length) {
        throw new Error(`not find page index ${rule}`)
      } else if (pages.length > 0) {
        page = pages[rule]
      }
    } else if (typeof rule === 'string') {
      page = pages.find((page) => page.url().includes(rule))
    }

    this.control.updatePage(page)
    this.control.updateContext(page)
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
      } else if (_this.control.currentPage && (<PageType> _this.control.currentPage).frames) {
        const changeFrame = (<PageType> _this.control.currentPage).frames()[index]
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

class Cookies implements FCherryCookies{
  control: TestControl
  parse: V1Parse
  console:Console
  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.console = v1parse.console
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
  async clear() {
    await this.control.browserContext?.clearCookies()
  }
}

class Dom implements FCherryDom{
  control: TestControl
  console:Console

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.console = v1parse.console
  }

  @throwStack()
  async viewTo(sign:string) {
    const locator = await this.control?.runContext?.locator(sign)
    const count = await locator?.count()
    if (count !== 1) throw new Error(`sign get ${count} elements not run viewTo`)
    locator?.scrollIntoViewIfNeeded()
  }

  @throwStack()
  async click(sign: string,  options?: {
    button?: "left"|"right"|"middle";
    clickCount?: number;
    delay?: number;
    force?: boolean;
    modifiers?: Array<"Alt"|"Control"|"Meta"|"Shift">;
    noWaitAfter?: boolean;
    position?: {
      x: number;
      y: number;
    };
    strict?: boolean;
    timeout?: number;
    trial?: boolean;
  }) {
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
    const locator = this.control.runContext?.locator(sign)
    if (!locator) throw new Error(`custom not find sign:', ${sign}`)
    let result
    if (attr == 'innerText') {
      result = await locator.innerText()
    } else if (attr == 'value') {
      result = await locator.inputValue()
    } else {
      result = await locator.getAttribute(attr)
    }
    return result
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
  async dispatchEvent(sign:string, event:string, eventInit: any, options:any) {
    await this.control?.runContext?.dispatchEvent(sign, event, eventInit, options)
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
