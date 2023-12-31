import os from 'os'
import path from 'path'
import { Page } from 'playwright'
import { ApiRecorder } from './actionApiRecorder'
import { LaunchContext } from './contextBuilder'

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
    executablePath: opts.executablePath,
  }
  const apiRecorder = new ApiRecorder(opts)
  const launchContext = new LaunchContext(options, !!undefined, options.executablePath, true)
  const {
    browser, context, launchOptions, contextOptions, homePage,
  } = await launchContext.launch(url)

  // 去掉playwright inspector
  launchOptions.headless = true
  launchOptions.executablePath = options.executablePath

  // @ts-ignore
  await context._enableRecorder({
    language: 'javascript',
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: path.resolve(path.resolve(os.tmpdir(), 'cherryDfSession'), 'state.json'),
    startRecording: true,
    outputFile: undefined,
  })

  if (process.env.PWTEST_CLI_EXIT) { await Promise.all(context.pages().map((p) => p.close())) }

  await apiRecorder.handlePage(homePage)
  context.on('page', async (page: Page) => {
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

  await context.close()
  await browser.close()
  return recorderApis
}

// 转移实现录制
export async function live(url: string, opts: any) {
  const options = {
    target: 'test',
    browser: 'chromium',
    timeout: '6666666',
    saveStorage: path.resolve(path.resolve(os.tmpdir(), 'cherryDfSession'), 'state.json'),
    // loadStorage: './state.json',
    device: opts.device,
    executablePath: opts.executablePath,
  }
  const launchContext = new LaunchContext(options, !!undefined, options.executablePath, true)
  const {
    browser, context, launchOptions, contextOptions,
  } = await launchContext.launch(url)

  launchOptions.executablePath = options.executablePath
  // @ts-ignore
  await context._enableRecorder({
    language: 'javascript',
    launchOptions,
    contextOptions,
    device: options.device,
    saveStorage: undefined,
    startRecording: true,
    outputFile: undefined,
  })
  const script = await new Promise((resolve) => {
    process.on('message', (msg: any) => {
      if (msg.type === 'live_finished') resolve(msg.script)
    })
  })
  console.log('脚本', script)
  await context.close()
  await browser.close()
  return script
}
