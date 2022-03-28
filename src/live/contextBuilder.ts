import fs from 'fs'
import path from 'path'
import os from 'os'
import { BrowserType } from '../client/browserType'
import { Browser } from '../client/browser'
import * as cherry from '../../index'
import { BrowserContext } from '../client/browserContext'
import { Page } from '../client/page'

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
export class LaunchContext {
  private _options: Options
  private _headless: boolean = false
  private _executablePath?: string
  private _persistent: boolean = false
  private _browserClosed: boolean = false
  private _statePath:string

  constructor(options: Options, headless: boolean, executablePath?: string, persistent: boolean = false) {
    this._options = options
    this._headless = headless
    this._executablePath = executablePath
    this._persistent = persistent
    this._statePath = path.resolve(path.resolve(os.tmpdir(), 'cherryDfSession'), 'state.json')
  }
  async launch(url: string | undefined) {
    const browserType = this._lookupBrowserType()
    const launchOptions = this._buildLaunchOptions()
    const contextOptions = this._buildContextOptions()

    const browser = await browserType.launch(launchOptions) // Viewport size
    if (this._persistent && fs.existsSync(this._statePath) !== false) {
      contextOptions.storageState = this._statePath
    }
    const context = await browser.newContext(contextOptions)
    // 监听关闭事件
    this._bindEvent(context, browser)
    // 打开新页面
    const homePage: Page = await this._openPage(context, url)
    delete launchOptions.headless
    delete launchOptions.executablePath
    delete contextOptions.deviceScaleFactor
    return {
      browserName: browserType.name(),
      browser,
      context,
      contextOptions,
      launchOptions,
      homePage,
    }
  }
  _bindEvent(context: BrowserContext, browser: Browser) {
    context.on('page', async (page) => {
      page.on('dialog', () => { }) // Prevent dialogs from being automatically dismissed.
      page.on('close', async () => {
        console.log('page close', context.pages())
        const hasPage = browser.contexts().some((context) => context.pages().length > 0)
        if (hasPage) return // Avoid the error when the last page is closed because the browser has been closed.
        await this._closeBrowser(context, browser).catch((e) => console.log(e))
      })
    })
  }
  _lookupBrowserType(): BrowserType {
    const options = this._options
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

  _buildLaunchOptions() {
    const launchOptions: any = {
      headless: this._headless,
      executablePath: this._executablePath,
    }

    if (this._options.proxyServer) {
      launchOptions.proxy = {
        server: this._options.proxyServer,
      }
      if (this._options.proxyBypass) launchOptions.proxy.bypass = this._options.proxyBypass
    }
    return launchOptions
  }
  _buildContextOptions() {
    const contextOptions: any = this._options.device ? { ...cherry.devices[this._options.device] } : {}
    if (!this._headless) { contextOptions.deviceScaleFactor = os.platform() === 'darwin' ? 2 : 1 }
    // In headful mode, use host device scale factor for things to look nice.
    // In headless, keep things the way it works in Playwright by default.
    // Assume high-dpi on MacOS. TODO: this is not perfect.
    // Viewport size
    if (this._options.viewportSize) {
      try {
        const [width, height] = this._options.viewportSize.split(',').map((n) => parseInt(n, 10))
        contextOptions.viewport = { width, height }
      } catch (e) {
        console.log('Invalid window size format: use "width, height", for example --window-size=800,600')
        process.exit(0)
      }
    }

    if (this._options.geolocation) {
      try {
        const [latitude, longitude] = this._options.geolocation.split(',').map((n) => parseFloat(n.trim()))
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

    if (this._options.userAgent) { contextOptions.userAgent = this._options.userAgent }

    if (this._options.lang) { contextOptions.locale = this._options.lang }

    if (this._options.colorScheme) { contextOptions.colorScheme = this._options.colorScheme as 'dark' | 'light' }

    if (this._options.loadStorage) { contextOptions.storageState = this._options.loadStorage }

    if (this._options.ignoreHttpsErrors) { contextOptions.ignoreHTTPSErrors = true }

    return contextOptions
  }
  async _closeBrowser(context: BrowserContext, browser?: Browser) {
    // We can come here multiple times. For example, saving storage creates
    // a temporary page and we call closeBrowser again when that page closes.
    if (this._browserClosed) return
    this._browserClosed = true
    if (this._options.saveTrace) {
      await context.tracing.stop({
        path: this._options.saveTrace,
      })
    }
    if (this._options.saveStorage) {
      await context.storageState({
        path: this._options.saveStorage,
      }).catch((e) => null)
    }

    await context.close()
    await browser?.close()
  }

  async _openPage(context: BrowserContext, url: string | undefined): Promise<Page> {
    let page: Page
    if (context.pages().length > 0) {
      page = context.pages()[0]
    } else {
      page = await context.newPage()
    }
    if (url) {
      if (fs.existsSync(url)) { url = `file://${path.resolve(url)}` } else if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:')) { url = `http://${url}` }
      await page.goto(url)
    }
    return page
  }
}
