import fs from 'fs'
import os from 'os'
import path from 'path'
import expect, { any } from 'expect' // expect-doc: https://jestjs.io/docs/using-matchers
import axios from 'axios'
import { rsort } from 'semver'
import Resolver from './resolver'
import { CherryResult, RunOptions } from '..'
import * as cherry from '../../../index'
import { __retry_time, __sleep } from '../../utils/suger'
import TestControl from '../../test_control/testControl'
import { download, mkdirIfNeeded } from '../../utils/utils'
import { reportRunImage, reportRunLog, reportRunResult, reportTrace } from '../../utils/remoteReport'
import {
  FCherryPage, FCherryDom, FCherryCookies, FCherryAssert, FCherryKeyboard, FCherryMouse, FCherryBrowser,FCherryImage
} from './parse'
import { remoteCvSiftMatch } from './callMemoteCv'
import { PageScreenshotOptions,Response,BrowserContextOptions,devices } from 'playwright'

/**
 * @method 向主进程传递消息
 * @param type 消息类型
 * @param data 消息内容
 */
async function processSend(type:string,data:any) {
  return new Promise((resolver, reject) => {
    // @ts-ignore
    process.send({
      type,
      data,
    }, undefined, undefined, () => {
      resolver(true)
    })
  })
}

function waitForResult(callback: ()=>Promise<boolean>,timeout = 3000) :Promise<boolean> {
  const end_time = new Date().getTime() + timeout
  const interval = 200; // 检测间隔
  return new Promise((resolve,reject)=>{
    const intervalId = setInterval(async () => {
      const result = await callback();
      if (result) {
        clearInterval(intervalId);
        resolve(true)
      } else if (new Date().getTime() > end_time) {
        clearInterval(intervalId);
        resolve(false)
      }
    }, interval);
  })
}

/**
 * @method ai错误诊断
 * @param err 错误文案
 * @returns 
 */
function aiDiagnosis(err:string) {
  let aiMsg = ''
  if(err.includes('Timeout') && err.includes('waiting for selector')) {
      aiMsg = '\n ai诊断: 命令执行超时,原因为长时间未找到定位元素,通常是因为定位元素不准确导致,请检查并手动调整sign参数。\n 元素定位参考: https://dqa.jd.com/cherry/guide/exam/select.html'
  }
  return err + aiMsg
}

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
        if (error.stack.includes('virtual_test')) {
          throw error
        }

        if (error.message.includes('Timeout'))
        throw new Error(`${key} instruction fail ${aiDiagnosis(error.message)}`)
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
  cherryResult: any

  constructor(testControl: TestControl, runOptins: RunOptions) {
    super()
    this.testId = testControl.id
    this.control = testControl
    // this.cherryResult = {}
    this.runOptins = runOptins

    const _this = this
    const handler = {
      get(trapTarget, key, receiver) {
        return function (...args) {
          if (key == 'log' || key == 'error' || key == 'warn') {
            args.unshift(key)
            _this.runOptins.__log_body.push(args.join(' '))
            processSend('log', args.join(' '))
          }
          trapTarget[key](...args)
        }
      },
    }
    this.console = new Proxy(console, handler)
  }

  registerGlobalApi() {
    const utils = new Utils(this.control)
    const errorSend = new ErrorSend(this)

    return {
      console: this.console,
      page: new Page(this),
      keyboard: new Keyboard(this),
      mouse: new Mouse(this),
      browser: new Browser(this),
      expect,
      env:process.env,
      dom: new Dom(this),
      img: new Img(this),
      errorSend: errorSend.errorSend.bind(errorSend),
      sleep: __sleep,
      axios,
      cookies: new Cookies(this),
      locator: (sign, options) => this.control.runContext?.locator(sign, options),
      hint: () => { console.log('hint Temporary does not support!') },
      asyncReport: asyncReport.bind(this),
      execJavaScript: utils.execJavaScript.bind(utils),
      assert: new assert(this),
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

const getImageStream =  async (url) => {
  const response = await axios.get(url, {responseType : "stream"});
  if (response.status === 200) {
      return response.data
  } 
}

class Img implements FCherryImage {
  parse: V1Parse

  constructor(v1parse: V1Parse) {
    this.parse = v1parse
  }
  
  async click(imgPath: string): Promise<void> {
      console.log('进行图片点击,图片为:', imgPath)
      if (imgPath == null || imgPath == '') throw new Error("img.click指令图片不能为空!")
      // todu: 页面加载时截图回获取不到,需要加时间内重试 await __sleep(1000)
      const screenshotBuffer = await this.parse.control.currentPage?.screenshot({type:"png"})
      if (screenshotBuffer) {
        var waldoMat
        if(/^https?:\/\//.test(imgPath)) {
          // 将图片转buff
          waldoMat = await getImageStream(imgPath)
        } else {
          waldoMat = fs.createReadStream(path.resolve(imgPath))
        }
        let res = await remoteCvSiftMatch(waldoMat,screenshotBuffer)
        if (res.status == 200) {
          const {x,y} = res.data
          if(x && y) {
            await this.parse.control.currentPage?.mouse.click(x, y)
          } else {
            throw new Error(`坐标获取失败,无法点击${x},${y}`)
          }
        } else {
          console.log("图像点击失败-",res.data)
        }
      }
    }

  async exist(imgPath: string): Promise<boolean> {
    return true
  }
}
class assert implements FCherryAssert {
  control: TestControl
  console:Console
  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.console = v1parse.console
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
  true(value:any, errorHint:string | undefined='') {
    try{
      expect(value).toBeTruthy()
    }catch(e) {
      if(!!errorHint) {
        this.console.error(errorHint)
      }
      throw e
    }
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
  const { result, image, log, trace } = this.runOptins?.remoteReport || {}
  // delete reported case
  if (this.runOptins.storage && this.runOptins.storage.__caseList) {
    this.runOptins.storage.__caseList.shift()
  }
  if (result) {
    const resultData: CherryResult = this.cherryResult || {
      duration: new Date().getTime() - (this.runOptins._startTime as number),
      success: true,
      code: 2000,
      msg: 'success',
      divertor: [],
    }
    await reportRunResult(result, resultData, { args, ...this.runOptins.storage })
    if (this.cherryResult != undefined) {
      this.cherryResult = undefined
    }
  }

  if (image) {
    await processSend('clearScreenImages', [])
    await reportRunImage(image, this.runOptins._screenImages, { args, ...this.runOptins.storage })
    this.runOptins._screenImages = []
  }
  if (log) {
    await reportRunLog(log, this.runOptins.__log_body.join('\n'), { args, ...this.runOptins.storage })
    this.runOptins.__log_body = [] // 上报后清空日志
  }

  if(trace) {
    try {
      let trace_path = path.join(os.tmpdir(), 'cherryDfSession',  new Date().getTime() + '.zip')
      if(this.control.browserContext) {
        await this.control.browserContext.tracing.stop({ path: trace_path})
        await reportTrace(trace,trace_path,{ args, ...this.runOptins.storage })
        fs.unlinkSync(trace_path)
        await this.control.browserContext.tracing.start({ screenshots: true, snapshots: true }) 
      }else{
        /**
         * 处理方式:(目前采用第一种)
         *  1. 由于未挂载页面导致不能正确追踪,并且此时追踪并为开启，因此可以直接忽略本次上报，因为并没有追踪内容。
         *  2. 默认打开空白页面，使追踪逻辑连贯，上报空追踪内容。
         */
        this.console.log("停止追踪异常,browserContext丢失! 可能为上报前为挂载页面导致.")
      }
    } catch (error) {
      this.console.log("error: 中途关闭追踪失败,",error)
    }
 
  }
  // this.runOptins = undefined
}

class Browser implements FCherryBrowser {
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

  // @ts-ignore
  route(url: string|RegExp|((url: URL) => boolean), handler: ((route: Route, request: Request) => void), options?: {
    times?: number;
  }) {
    this.control.browserContext?.route(url, wrapHandler(handler), options)
  }
}

class Keyboard implements FCherryKeyboard {
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

class Mouse implements FCherryMouse {
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

  @throwStack()
  async move(x: number, y: number) {
    await this.control.currentPage?.mouse.move(x, y)
  }

  @throwStack()
  async dragTo(point: {x:number,y:number}, targetPoint: {x:number,y:number}) {
    const page = this.control.currentPage
    if(page) {
      await page.mouse.move(point.x,point.y)
      await page.mouse.down({button:'left'})
      await page.mouse.move(targetPoint.x,targetPoint.y)
      await page.mouse.up({button:'left'})
    }else{
      console.error("页面出现异常丢失")
    }
  }
}

class Page implements FCherryPage {
  control: TestControl
  parse: V1Parse
  defaultContextOptions: BrowserContextOptions
  console:Console

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.parse = v1parse
    this.defaultContextOptions = {}
    this.console = v1parse.console
  }

  async setDevice(name:string) {
    const deviceOptions = devices[name]
    if (deviceOptions === undefined) {
      throw new Error(`The lack of the preset ${name}`)
    }
    deviceOptions.hasTouch = false // must false fix mobile https://jstp.m.jd.com/device/list don't click
    this.defaultContextOptions = { ...this.defaultContextOptions, ...deviceOptions }
  }

  @throwStack()
  async waitForResponse(urlOrPredicate: string|RegExp|((response: Response) => boolean|Promise<boolean>), options?: {
      timeout?: number;
    }) {
    if (!this.control.currentPage) throw new Error('miss currentPage. you must pre join any page')
    return await this.control.currentPage.waitForResponse(urlOrPredicate, options)
  }

  @throwStack()
  async waitPopup(opt:any) :Promise<void> {
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

  setBrowserCofing( browserCofing: BrowserContextOptions) {
    this.defaultContextOptions = {...browserCofing}
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
      const contextOptions : BrowserContextOptions = {
        deviceScaleFactor: 1,
        // eslint-disable-next-line no-unsafe-optional-chaining
        viewport,
        ...this.defaultContextOptions,
        storageState: {
          cookies: this.parse.runOptins.cookies as any,
          origins: [],
        },
        userAgent: this.defaultContextOptions.userAgent || undefined
      }
      
      this.console.log('userAgent', contextOptions.userAgent)
      const context = await this.control.browser.newContext(contextOptions)
      context.setDefaultTimeout(10000) // 设置页面内容末日超时10s
      context.setDefaultNavigationTimeout(30000) // 设置页面加载默认超时30s
      this.control.setBrowserContext(context)
      if(this.parse.runOptins.remoteReport?.trace) {
        await context.tracing.start({ screenshots: true, snapshots: true }) // 启动追踪
        console.log("启动执行自动追踪!")
      }
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

  /**
   * @method 获取页面视图宽高
   */
  async getViewSize() :Promise<{width:number,height:number} | null > {
    if(this.control.currentPage) {
      return this.control.currentPage.viewportSize()
    }
    return null
  }
  
  async refresh(options:PageOptions) {
    this.control.currentPage?.reload(options)
  }

  @throwStack()
  async hasText(text:string,options?:{
    timeout:number
  }):Promise<boolean> {
    options = {
      timeout: options?.timeout || 3000
    }
    
    const _hastext = async () => {
      const locator = this.control.runContext?.locator('body')
      const htmlText = await locator?.innerHTML() || ''
      if (htmlText.includes(text) == false) {
        return false
      }
      return true
    }
    return await waitForResult(_hastext,options.timeout)
  }

  @throwStack()
  async to(url: string, options?: PageOptions) {
    if (this.control.currentPage === undefined) {
      await this._createContext()
    }

    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      if(this.control && this.control.currentPage) {
        let res = await this.control.currentPage.goto(url, options)
        if (res == null) {
          this.console.log('page.to 命令异常,无法切换到目标地址:',url)
        } else {
          this.control.updateContext(this.control.currentPage) // 切换页面后重制以退出iframe
          this.console.log('page.to 命令执行完成。 页面返回的状态码为:', res.status())
        }
      } else {
        this.console.log('page.to 命令异常,未获取到正常上下文! 可以尝试在该命令前方添加sleep函数等待上下文缓冲!')   
      }
    }
  }

  @throwStack()
  async screenshot(imgPath: string,options:PageScreenshotOptions={}) {
    // todo: sercer run don't save disk
    options.path = os.type() === 'Linux' ? undefined : imgPath
    if(this.control.currentPage) {

      // 判断传递的是路径还是文件吗，如果为文件名则默认存放在临时目录
      if( options.path && /^[^./][\w.-]*\.[\w]+$/.test(imgPath)) {
        const downloadPath = path.join(os.tmpdir(), 'cherryDfSession', this.control.id + options.path)
        options.path = downloadPath
      }
      
      const page = this.control.currentPage
      const buffer = await page.screenshot(options)
      this.console.log('screenshot img path:', path.resolve(options.path || imgPath), " image size:", buffer?.length || 0)
      if (!buffer || buffer && buffer.length < 100) {
        this.console.error(`screenshot截图失败-路径: ${imgPath}`)
      } else {
        const screenImage = {
          path: path.resolve(imgPath),
          buffer,
          name: path.basename(imgPath),
        }
  
        this.parse.runOptins._screenImages.push(screenImage) // 用于异步上报
        await processSend('addScreenImages', screenImage)
      }
    }else{
      throw new Error("异常,缺少正确的上下文环境!")
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
        let frame = _this.control.currentPage?.frame(index)
        if (!frame) {
          // 按照路径尝试匹配
          const frames = _this.control.currentPage?.frames()
          for (const _frame of frames || []) {
            if (_frame.url().includes(index)) {
              frame = _frame
              break
            }
          }
        }
        if (frame) {
          _this.control.updateContext(frame)
        } else {
          throw new Error(`miss iframe name: ${index}`)
        }
      } else if (_this.control.currentPage && _this.control.currentPage.frames) {
        const changeFrame = _this.control.currentPage?.frames()[index]
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

class Cookies implements FCherryCookies {
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

class Dom implements FCherryDom {
  control: TestControl
  console:Console
  // 增加paras定义Byzwj
  parse: V1Parse
  runOptins: RunOptions

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.console = v1parse.console
    this.runOptins = v1parse.runOptins
    // 增加parase 定义 Byzwj
    this.parse = v1parse
  }

  /**
   * @method 拖拽元素到指定元素中
   */
  async dragTo(sign:string, target: string) {
    if(!this.control.currentPage) return
    await this.control.currentPage.locator(sign).dragTo(this.control.currentPage.locator(target));
  }

  // 按元素滚动条设置页面高度以截全图
  @throwStack()
  async setIonViewport(sign:string) {
    if(!this.control.currentPage) return

    const page = this.control.currentPage
    const currentViewport = await page.viewportSize();

    const tweets = page.locator(sign);
    const pixelAmountRenderedOffscreen = await tweets.evaluate(node => node.scrollHeight - node.clientHeight)

    if(currentViewport == null || !pixelAmountRenderedOffscreen) return

    await page.setViewportSize({
      width: currentViewport.width,
      height: currentViewport.height + pixelAmountRenderedOffscreen + 100
    })
  }

  /**
   * @method screenshot
   * @description 截图指定元素内容
   */
  @throwStack()
  async screenshot(sign:string, options: PageScreenshotOptions = {}) {
    const _imgPath :string = options.path || ''
    options.path = os.type() === 'Linux' ? undefined : options.path

    var buffer
    // @ts-ignore 原生并不支持对dom截全屏
    if(options.fullPage) {
      const currentViewport = await this.control.currentPage?.viewportSize();
      if(!currentViewport) { this.console.error('dom screenshot error: 无法获取页面视图宽高!'); return}
      await this.setIonViewport(sign)
      buffer = await this.control.currentPage?.locator(sign).screenshot(options);
      
      // 恢复原始页面
      await this.control.currentPage?.setViewportSize({
        width: currentViewport.width,
        height: currentViewport.height
      })
    }else{
      buffer = await this.control.currentPage?.locator(sign).screenshot(options);
    }


    if (!buffer || buffer && buffer.length < 100) {
      this.console.error(`screenshot截图失败-路径: ${options.path}`)
    } else {
      const screenImage = {
        path: path.resolve(_imgPath),
        buffer,
        name: path.basename(_imgPath),
      }
      this.parse.runOptins._screenImages.push(screenImage) // 用于异步上报
      await processSend('addScreenImages', screenImage)
    }
  
  }

  @throwStack()
  async viewTo(sign:string) {
    const locator = await this.control?.runContext?.locator(sign)
    const count = await locator?.count()
    if (count !== 1) throw new Error(`sign get ${count} elements not run viewTo`)
    locator?.scrollIntoViewIfNeeded()
  }

  @throwStack()
  async click(sign: string, options?: {
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
      await this.control.runContext.click(sign, options)
    } else {
      throw new Error('Cannot make any click, please check your is opened any page?')
    }
  }

  @throwStack()
  async set(value: string, sign: string) {
    await this.control?.runContext?.type(sign, value)
  }

  @throwStack()
  async check(sign: string, options?: {
    force?: boolean | undefined
    noWaitAfter?: boolean | undefined
    position?: {
        x: number
        y: number
    } | undefined
    strict?: boolean | undefined
    timeout?: number | undefined
    trial?: boolean | undefined
}) {
    await this.control?.runContext?.check(sign, options)
  }

  @throwStack()
  async tap(sign: string, options?: {
    force?: boolean | undefined
    noWaitAfter?: boolean | undefined
    position?: {
        x: number
        y: number
    } | undefined
    strict?: boolean | undefined
    timeout?: number | undefined
    trial?: boolean | undefined
}) {
    if(this.control?.currentPage) {
      await this.control.currentPage.locator(sign).tap(options)
    }else{
      throw new Error("tap err: 未获取到正确的上下文环境!")
    }
  }

  @throwStack()
  async getAttributes(sign:string, attr:string) {
    const locator = this.control.runContext?.locator(sign)
    if (!locator) throw new Error(`custom not find sign:', ${sign}`)
    let result
    switch (attr) {
      case 'innerText': {
        result = await locator.innerText()
        break
      }
      case 'value': {
        result = await locator.inputValue()
        break
      }
      case 'checked': {
        result = await locator.isChecked()
        break
      }
      default: {
        result = await locator.getAttribute(attr)
        console.log("getAttributes 默认分支:", result)
      }
    }
    return result
  }

  @throwStack()
  async reSet(value: string, sign: string) {
    await this.control?.runContext?.fill(sign, value)
  }

  @throwStack()
  async wait(sign: string, ms: number = 5000) {
    await this.control?.runContext?.waitForSelector(sign, { timeout: ms })
  }

  @throwStack()
  async hover(sign: string, options?: {
    force?: boolean
    modifiers?: Array<"Alt"|"Control"|"Meta"|"Shift">
    position?: {
      x: number
      y: number
    };
    strict?: boolean
    timeout?: number
    trial?: boolean
  }) {
    await this.control?.runContext?.hover(sign)
  }

  @throwStack()
  async exist(sign: string, option:{state:"attached"|"detached"|"visible"|"hidden",timeout:number}) : Promise<boolean> {
    if(this.control && this.control.runContext) {
      const page = this.control.runContext
      try {
        await page.locator(sign).waitFor(option)
        return true
      } catch (error) {
        return false
      }
    }else{
      throw new Error("错误的上下文,找不到正确的执行环境")
    }
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
  async select(sign:string, value: {
    value?: string,
    label?:string,
    index?:number,
  }, options?:{
    force?:boolean,
    noWaitAfter?: boolean,
    strict?:boolean,
    timeout?:number
  }) {
    await this.control?.runContext?.selectOption(sign, value, options)
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

// 标记错误且不影响程序执行
class ErrorSend {
  control: TestControl
  console:Console
  // 增加paras定义Byzwj
  parse: V1Parse
  runOptins: RunOptions

  constructor(v1parse: V1Parse) {
    this.control = v1parse.control
    this.console = v1parse.console
    this.runOptins = v1parse.runOptins
    // 增加parase 定义 Byzwj
    this.parse = v1parse

    this.console.log("ErrorSend 初始化完成")
  }

  @throwStack()
  async errorSend(sign: string) : Promise<any> {
    const errorSendImage = `${sign}.jpg`
    const page = new Page(this.parse)
    try {
      page.screenshot(errorSendImage)
    } catch (error) {
      this.console.error("errorSend截图失败:", error.message)
    }
    this.runOptins.__log_body.push(`主动触发错误上报，请查看错误日志`)

    this.parse.cherryResult = {
      duration: new Date().getTime() - (this.parse.runOptins._startTime as number),
      success: false,
      code: 400,
      msg: sign,
      divertor: [],
      error: {
        name: '主动将用例置为失败',
        message: sign,
      },
    }
  }
}