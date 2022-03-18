import fs from 'fs'
import os from 'os'
import path from 'path'
import * as cherry from '../../index'
import { BrowserContext } from '../client/browserContext'
import { BrowserType } from '../client/browserType'
import { Browser } from '../client/browser'
import { Page } from '../client/page'
import { BrowserContextOptions, LaunchOptions } from '../client/types'
import { ApiRecorder } from './actionApiRecorder'

type Options = {
  browser: string;
  channel?: string;
  colorScheme?: string;
  device?: string;
  geolocation?: string;
  ignoreHttpsErrors?: boolean;
  lang?: string;
  loadStorage?: string;
  proxyServer?: string;
  proxyBypass?: string;
  saveStorage?: string;
  saveTrace?: string;
  timeout: string;
  timezone?: string;
  viewportSize?: string;
  userAgent?: string;
};

/**
 * 接口（包含动作）录制
 * @param url 
 * @param opts {callback:Function}
 * @returns 
 */
 export async function apiLive(url: string, opts: any) {
  const options = {
    target: 'test',
    browser: 'chromium',
    timeout: '6666666',
    // loadStorage: './state.json',
    device: undefined,
  }
  const apiRecorder = new ApiRecorder(opts)
  const { context, launchOptions, contextOptions } = await launchContext(options, !!undefined, undefined)
  // 去掉playwright inspector
  launchOptions.headless = true
  await context._enableRecorder({
    language: 'test',
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: undefined,
    startRecording: true,
    outputFile: undefined
  })
  
  const pagea = await openPage(context, url)
  await apiRecorder.handlePage(pagea)
  context.on('page', async (page:Page) => {
    await apiRecorder.handlePage(page)
  })
  process.on('message', (msg: any) => {
    if (msg.type === 'lastAction') {
      apiRecorder.setLastAction(msg.action)
    }
  })

  await new Promise((resolve) => {
    process.on('message', (msg: any) => {
      if (msg.type === 'live_finished') resolve(msg.script)
    })
  })

  const recorderApis = await apiRecorder.getApis()
  console.log('录制的接口：', recorderApis)

  context.close()
  return recorderApis
}

// 转移实现录制
export async function live(url: string, opts: any) {
  const options = {
    target: 'test',
    browser: 'chromium',
    timeout: '6666666',
    // loadStorage: './state.json',
    device: undefined,
  }
  const { context, launchOptions, contextOptions } = await launchContext(options, !!undefined, undefined)
  // 启动辅助浏览器
  const assistContext = (await launchContext(options, true, undefined)).context
  // const assistContext = (await launchContext(options, true, undefined)).context // 正式部署使用，true 为开启无痕
  await context._enableRecorder({
    language: 'test',
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: undefined,
    startRecording: true,
    outputFile: undefined,
  })
  const pagea = await openPage(context, url)
  const assistPage = await openPage(assistContext, url)

  // 不能在这里注册，录制时的新页面无法写入
  pagea.exposeBinding('_fix_action', (context:any, args) => {
    // 虽然修复需要时间，但并不需要等待
    console.log('收到了修正: fix_action', args)
    const { signs, id, info } = args
    // 首先这种外侧肯定用不了,太慢而且含有检查
    // 因此必须在页面内部实现，
    // 先应该具备修复能力，在页面内修改ide中的内容
    console.log('尝试检查', assistPage.$(signs[0]))
    // assistPage.evaluate((args) => {
    //   // 使用辅助页面进行修正
    //   // 首先需要保证playwight 的原生定位能得到修正
    //   // 或者全部使用原生校验
    //   console.log('内部的函数', args)
    //   for (const sign of signs) {
    //     // console.log('sign')
    //     // 尝试通过sign获取到对应的元素，需要相关方法
    //   }
    // }, args)
  })
  if (process.env.PWTEST_CLI_EXIT) { await Promise.all(context.pages().map((p) => p.close())) }

  const script = await new Promise((resolve) => {
    process.on('message', (msg:any) => {
      if (msg.type === 'live_finished') resolve(msg.script)
    })
  })
  console.log('脚本', script)
  context.close()
  return script
}

export async function openPage(context: BrowserContext, url: string | undefined): Promise<Page> {
  const page = await context.newPage()
  if (url) {
    if (fs.existsSync(url)) { url = `file://${path.resolve(url)}` } else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) { url = `http://${url}` }
    await page.goto(url)
  }
  return page
}

function lookupBrowserType(options: Options): BrowserType {
  let name = options.browser
  if (options.device) {
    const device = cherry.devices[options.device]
    name = device.defaultBrowserType
  }
  let browserType: any
  switch (name) {
    case 'chromium': browserType = cherry.chromium; break
    // case 'webkit': browserType = cherry.webkit; break
    // case 'firefox': browserType = cherry.firefox; break
    case 'cr': browserType = cherry.chromium; break
    // case 'wk': browserType = cherry.webkit; break
    // case 'ff': browserType = cherry.firefox; break
  }
  if (!browserType) { throw new Error(`not find browserType: ${options.browser}`) }
  return browserType
}

async function launchContext(options:Options, headless:boolean, executablePath?:string, isClose = false): Promise<{ browser: Browser, browserName: string, launchOptions: LaunchOptions, contextOptions: BrowserContextOptions, context: BrowserContext }> {
  const browserType = lookupBrowserType(options)
  const launchOptions :any = {
    headless,
    executablePath,
  }

  if (options.proxyServer) {
    launchOptions.proxy = {
      server: options.proxyServer,
    }
    if (options.proxyBypass) launchOptions.proxy.bypass = options.proxyBypass
  }

  const contextOptions :any = options.device ? { ...cherry.devices[options.device] } : {}

  if (!headless) { contextOptions.deviceScaleFactor = os.platform() === 'darwin' ? 2 : 1 }
  // In headful mode, use host device scale factor for things to look nice.
  // In headless, keep things the way it works in Playwright by default.
  // Assume high-dpi on MacOS. TODO: this is not perfect.

  const browser = await browserType.launch(launchOptions) // Viewport size

  // Viewport size
  if (options.viewportSize) {
    try {
      const [width, height] = options.viewportSize.split(',').map((n) => parseInt(n, 10))
      contextOptions.viewport = { width, height }
    } catch (e) {
      console.log('Invalid window size format: use "width, height", for example --window-size=800,600')
      process.exit(0)
    }
  }

  if (options.geolocation) {
    try {
      const [latitude, longitude] = options.geolocation.split(',').map((n) => parseFloat(n.trim()))
      contextOptions.geolocation = {
        latitude,
        longitude,
      }
    } catch (e) {
      console.log('Invalid geolocation format: user lat, long, for example --geolocation="37.819722,-122.478611"')
      process.exit(0)
    }
    contextOptions.permissions = ['geolocation']
  }

  if (options.userAgent) { contextOptions.userAgent = options.userAgent }

  if (options.lang) { contextOptions.locale = options.lang }

  if (options.colorScheme) { contextOptions.colorScheme = options.colorScheme as 'dark' | 'light' }

  if (options.loadStorage) { contextOptions.storageState = options.loadStorage }

  if (options.ignoreHttpsErrors) { contextOptions.ignoreHTTPSErrors = true }

  const context = await browser.newContext(contextOptions)
  let closingBrowser = false
  async function closeBrowser() {
    // We can come here multiple times. For example, saving storage creates
    // a temporary page and we call closeBrowser again when that page closes.
    if (closingBrowser) return
    closingBrowser = true
    if (options.saveTrace) {
      await context.tracing.stop({
        path: options.saveTrace,
      })
    }
    if (options.saveStorage) {
      await context.storageState({
        path: options.saveStorage,
      }).catch((e) => null)
    }
    await browser.close()
  }
  context.on('page', (page) => {
    page.on('dialog', () => {}) // Prevent dialogs from being automatically dismissed.

    page.on('close', () => {
      const hasPage = browser.contexts().some((context) => context.pages().length > 0)
      if (hasPage) return // Avoid the error when the last page is closed because the browser has been closed.
      // if (isClose) {
      closeBrowser().catch(() => null) // 这里会关闭进程，如果调度不想处理这里，需要解开注释内容
      // }
    })
  })
  delete launchOptions.headless
  delete launchOptions.executablePath
  delete contextOptions.deviceScaleFactor
  return {
    browser,
    browserName: browserType.name(),
    context,
    contextOptions,
    launchOptions,
  }
}
