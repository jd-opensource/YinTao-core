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
    const cookies = new Cookies(this.control)
    const utils = new Utils(this.control)
    return {
      page: new Page(this.control),
      dom: new Dom(this.control),
      sleep: __sleep,
      cookies: cookies.parse.bind(cookies),
      hint: () => { console.log('hint Temporary does not support!') },
      clearCookie: cookies.clearCookie.bind(cookies),
      execJavaScript: utils.execJavaScript.bind(utils),
      __cherryRun: {
        gid: this.testId,
      },
    }
  }
}

interface PageOptions {
    referer?: string;
    timeout?: number;
    waitUntil?: 'load'|'domcontentloaded'|'networkidle'|'commit';
}

class Page {
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
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
    }
    const context = await this.control.browser.newContext(contextOptions)
    this.control.setBrowserContext(context)
    const page = await context.newPage()
    this.control.updatePage(page) //  这块后续看是否需要
    this.control.updateContext(page)
  }

  async to(url:string, options?: PageOptions) {
    if (this.control.currentPage === undefined) {
      await this._createContext()
    }

    if (url) {
      if (fs.existsSync(url)) url = `file://${path.resolve(url)}`; else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) url = `http://${url}`
      await this.control?.currentPage?.goto(url, options)
    }
  }

  async screenshot(path:string) {
    await this.control.currentPage?.screenshot({ path, type: 'jpeg' })
  }

  async back() {
    await this.control?.currentPage?.goBack()
  }
  async forward() {
    await this.control?.currentPage?.goForward()
  }

  async getURL():Promise<string> {
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

  async changeIframe(index: number) {
    if (this.control.runContext && (<PageType> this.control.runContext).frames) {
      if (index == -1) {
        this.control.updateContext(this.control.currentPage as PageType)
      } else {
        this.control.updateContext((<PageType> this.control.runContext).frames()[++index])
      }
    } else {
      throw new Error('Unable to switch ifarme! not frames.')
    }
  }
}

class Utils {
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
  }

  async execJavaScript(body:string) {
    this.control.runContext?.evaluate(body)
  }
}

class Cookies {
  control:TestControl
  constructor(testControl:TestControl) {
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

  async parse(type:string, value: string | object, data:string) {
    switch (type) {
      case 'setAll': {
        const url = value as string
        let cookieData = data
        cookieData = cookieData.slice(0, 7) === 'Cookie:' ? cookieData.slice(7) : cookieData
        const kvs = cookieData.split(';')
        const cookieList:any[] = []
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
  control:TestControl
  constructor(testControl:TestControl) {
    this.control = testControl
  }

  async click(sign:string) {
    // @ts-ignore
    await this.control?.runContext?.click(sign)
  }

  async set(value:string, sign:string) {
    await this.control?.runContext?.type(sign, value)
  }

  async reSet(value:string, sign:string) {
    await this.control?.runContext?.fill(sign, value)
  }

  async wait(sign:string, ms? :number) {
    await this.control?.runContext?.waitForSelector(sign, { timeout: ms })
  }

  async hover(sign:string) {
    await this.control?.runContext?.hover(sign)
  }

  async exist(sign:string) :Promise<boolean> {
    return !!await this.control?.runContext?.isVisible(sign)
  }

  async fill(sign:string, value:string) {
    await this.control?.runContext?.fill(sign, value)
  }

  async upload(sign:string, files: string | string[]) :Promise<void> {
    if (files instanceof Array) {
      for (const _path of files) {
        if (fs.existsSync(_path) === false) {
          throw new Error(`Invalid file path: ${_path}`)
        }
      }
    } else if (fs.existsSync(files) === false) {
      throw new Error(`Invalid file path: ${files}`)
    }
    await this.control?.runContext?.setInputFiles(sign, files)
  }
}
