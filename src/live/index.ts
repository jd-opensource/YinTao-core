// import { live as live2 } from '@cherry-next/cherry-core/lib/live'
import fs from 'fs'
import path from 'path'
import * as cherry from '../../index'
import { BrowserContext } from '../client/browserContext'
import { BrowserType } from '../client/browserType'
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

// 转移实现录制
export default async function live(url: string, opts: any) {
  const options = {
    target: 'test',
    browser: 'chromium',
    timeout: '6666666',
    device: undefined,
  }
  const { context, launchOptions, contextOptions } = await launchContext(options, !!undefined, undefined)
  await context._enableRecorder({
    language: 'test',
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: undefined,
    startRecording: true,
    outputFile: undefined,
  })
  await openPage(context, url)
  if (process.env.PWTEST_CLI_EXIT) { await Promise.all(context.pages().map((p) => p.close())) }
  const script = 'dsadsa'
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

async function launchContext(options, headless, executablePath, isClose = false) {
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
  // In headful mode, use host device scale factor for things to look nice.
  // In headless, keep things the way it works in Playwright by default.
  // Assume high-dpi on MacOS. TODO: this is not perfect.
  const browser = await browserType.launch(launchOptions) // Viewport size

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
      if (isClose) {
        closeBrowser().catch(() => null)
      }
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
