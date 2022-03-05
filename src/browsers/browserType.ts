import fs from 'fs'
import os from 'os'
import path from 'path'
import browserTools from 'testcafe-browser-tools'
import { launchProcess, envArrayToObject } from '../utils/processLauncher'
import { existsAsync } from '../utils/suger'
import PipeTransport from '../server/pipeTransport'
import { CallMetadata, SdkObject } from '../server/instrumentation'
import { registry } from '../utils/registry';

export type BrowserName = 'chromium' | 'firefox' | 'webkit';
export const DEFAULT_TIMEOUT = 30000
export default abstract class BrowserType extends SdkObject {
  private _name: BrowserName
  readonly _playwrightOptions: any

  constructor(browserName: BrowserName, options: any) {
    super(options.rootSdkObject, 'browser-type')
    // this.attribution.browserType = this
    this._playwrightOptions = options
    this._name = browserName
  }

  executablePath(): string {
    return 'C:\\Users\\zhouyuan11\\AppData\\Local\\ms-playwright\\chromium-975608\\chrome-win\\chrome.exe'
  }
  name(): string {
    return this._name
  }

  // async launch(metadata: CallMetadata, options: any, protocolLogger?: any): Promise<any> {
  //   options = this._validateLaunchOptions(options)
  //   const controller = new ProgressController(metadata, this)
  //   controller.setLogName('browser')
  //   const browser = await controller.run((progress) => {
  //     const seleniumHubUrl = (options as any).__testHookSeleniumRemoteURL || process.env.SELENIUM_REMOTE_URL
  //     if (seleniumHubUrl) { return this._launchWithSeleniumHub(progress, seleniumHubUrl, options) }
  //     return this._innerLaunchWithRetries(progress, options, undefined, helper.debugProtocolLogger(protocolLogger)).catch((e) => { throw this._rewriteStartupError(e) })
  //   }, TimeoutSettings.timeout(options))
  //   return browser
  // }

  async _launchProcess(options:any, userDataDir?: string) {
    const {
    //   ignoreDefaultArgs,
    //   ignoreAllDefaultArgs,
    //   args = [],
      executablePath = null,
      handleSIGINT = true,
      handleSIGTERM = true,
      handleSIGHUP = true,
    } = options

    let executable: string = ''
    if (executablePath) {
      if (!(await existsAsync(executablePath))) { throw new Error(`Failed to launch ${this._name} because executable doesn't exist at ${executablePath}`) }
      executable = executablePath
    } else {
      const registryExecutable = registry.findExecutable(options.channel || this._name);
      if (!registryExecutable || registryExecutable.browserName !== this._name)
        throw new Error(`Unsupported ${this._name} channel "${options.channel}"`);
      executable = registryExecutable.executablePathOrDie(this._playwrightOptions.sdkLanguage);
      await registryExecutable.validateHostRequirements(this._playwrightOptions.sdkLanguage);
    }

    const browserArguments = []

    const env = options.env ? envArrayToObject(options.env) : process.env

    const tempDirectories :string[] = [] // 存放缓存和用户数据
    if (options.downloadsPath) { await fs.promises.mkdir(options.downloadsPath, { recursive: true }) }
    if (options.tracesDir) { await fs.promises.mkdir(options.tracesDir, { recursive: true }) }

    const artifactsDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cherry-artifacts-'))
    tempDirectories.push(artifactsDir)

    if (userDataDir) {
      // Firefox bails if the profile directory does not exist, Chrome creates it. We ensure consistent behavior here.
      if (!await existsAsync(userDataDir)) { await fs.promises.mkdir(userDataDir, { recursive: true, mode: 0o700 }) }
    } else {
      userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `cherry_${this._name}dev_profile-`))
      tempDirectories.push(userDataDir)
    }
    let transport: any | undefined
    let browserProcess: any | undefined
    console.log('startChrome')
    // 首先获取启动命令
    const { launchedProcess, gracefullyClose, kill } = await launchProcess({
      command: executable,
      args: browserArguments,
      env,
      handleSIGINT,
      handleSIGTERM,
      handleSIGHUP,
      log: (message: string) => {
        console.log('start chrome:', message)
      },
      stdio: 'pipe',
      tempDirectories,
      attemptToGracefullyClose: async () => {
        if ((options as any).__testHookGracefullyClose) { await (options as any).__testHookGracefullyClose() }
        // We try to gracefully close to prevent crash reporting and core dumps.
        // Note that it's fine to reuse the pipe transport, since
        // our connection ignores kBrowserCloseMessageId.
        this._attemptToGracefullyCloseBrowser(transport!)
      },
      onExit: (exitCode, signal) => {
        if (browserProcess && browserProcess.onclose) { browserProcess.onclose(exitCode, signal) }
      },
    })

    async function closeOrKill(timeout: number): Promise<void> {
      let timer: NodeJS.Timer
      try {
        await Promise.race([
          gracefullyClose(),
          new Promise((resolve, reject) => timer = setTimeout(reject, timeout)),
        ])
      } catch (ignored) {
        await kill().catch(() => {}) // Make sure to await actual process exit.
      } finally {
        clearTimeout(timer!)
      }
    }
    browserProcess = {
      onclose: undefined,
      process: launchedProcess,
      close: () => closeOrKill((options as any).__testHookBrowserCloseTimeout || DEFAULT_TIMEOUT),
      kill,
    }

    // let wsEndpoint: string | undefined
    if (options.useWebSocket) {
    // 常规走else
    //   transport = await WebSocketTransport.connect(progress, wsEndpoint!)
    } else {
      const stdio = launchedProcess.stdio as unknown as [NodeJS.ReadableStream, NodeJS.WritableStream, NodeJS.WritableStream, NodeJS.WritableStream, NodeJS.ReadableStream]
      transport = new PipeTransport(stdio[3], stdio[4])
    }
    return { browserProcess, artifactsDir, transport }
  }

  abstract _attemptToGracefullyCloseBrowser(transport: any): void;
}
