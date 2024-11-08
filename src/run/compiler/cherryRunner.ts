import vm from 'vm'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { VirtualFile } from './index'
import V1Parse from '../resolve/v1Parse'
import TestControl from '../../test_control/testControl'
import { CherryResult } from '..'
import { __sleep } from '../../utils/suger'
import { reportTrace } from '../../utils/remoteReport'
import fs from 'fs'
import ip from "ip"
import { chromium, firefox, LaunchOptions, webkit }  from 'playwright'
import { reportVideo } from '../../utils/remoteReport'

// cherry解析器实例
var resolver

// 异常中断时
process.on('uncaughtException', async (err) => {
  try{
    console.log("code uncaughtException error:", err)
    const errResult: CherryResult = {
      duration: 0,
      success: false,
      serverIp: ip.address(),
      msg: err?.message || '',
      divertor: [],
      log: err.message,
      error: err,
      code: 4044,
    }
  
    if (resolver){
      resolver.runOptins.__log_body.push(err.stack)
      errResult.log = `${resolver.runOptins.__log_body?.join('\n')}\n`
    }
    await sendResult(errResult)
  }catch(e) {
    console.log("Deadly recursion error:", e)
  }
  setTimeout(() => {
    process.exit(1)
  }, 300);
})

const sendResult = async (result) => {
  return new Promise((resolve,reject)=>{
    // @ts-ignore
    process.send({ type: "result", data: result }, undefined, undefined, () => {
      resolve(true)
    })
  })
}

interface RunScriptOptions {
  /** 当前脚本所在文件夹路径 */
  dirname: string;
  /**
   * 需要运行的代码所在的虚拟文件名称
   *  - 默认为`virtual-san-box.js`
   */
  filename?: string;
  /**
   * 外部 require 函数
   *  - 沙箱内置了 require 函数，和`dirname`选项关联
   *  - 如果此项不填，或者是在运行中失败，会回退到内置的 require 函数
   */
  require?: any;
  /** 全局参数 */
  globalParams?: Record<string, any>;
}

/** 拟造模块接口 */
interface FakeModule {
  exports: {
    default: any;
  };
}

/** 运行结果 */
interface RunResult<T> {
  output: T;
  error?: any;
}

interface RunError {
  /** 原始错误信息 */
  message: string;
  /** 原始错误堆栈信息 */
  stack: string;
  /** 错误位置信息 */
  location?: {
    /** 发生错误的文件路径 */
    filePath: string;
    /**
     * 行号
     *  - 首行为`1`
     */
    line: number;
    /**
     * 列号
     *  - 首列为`1`
     */
    column?: number;
    /** 错误文本的长度 */
    length?: number;
    /** 错误行字符串 */
    lineText?: string;
  };
}

/** 解析错误信息 */
function getErrorMessage(e: Error): RunError {
  const err: RunError = {
    message: e.message,
    stack: e.stack ?? '',
  }

  // 前三行分别是错误文件路径，错误行文本，错误列文本
  const [fileText, lineText, errorText] = err.stack.split('\n')

  if (!fileText) {
    return err
  }

  const lineNumberMatch = fileText.match(/:\d+$/)

  if (lineNumberMatch) {
    err.location = {
      filePath: fileText.substring(0, lineNumberMatch.index),
      // eslint-disable-next-line radix
      line: Number.parseInt(lineNumberMatch[0].substring(1)),
    }
  } else {
    return err
  }

  if (lineText) {
    err.location.lineText = lineText
  }

  if (errorText) {
    const columnMatch = errorText.match(/\^+$/)

    if (columnMatch) {
      err.location.column = (columnMatch.index ?? 0) + 1
      err.location.length = columnMatch[0].length
    }
  }

  return err
}

/** 运行代码 */
export default async function runScript<T = any>(code: string, options: RunScriptOptions): Promise<RunResult<T>> {
  const {
    dirname,
    filename,
    require: requireOut,
    globalParams = {},
  } = options

  const filePath = path.join(dirname, filename || '')
  const requireIn = createRequire(filePath)

  var NodeDebugger = {}
  if (os.type() !== 'Linux') { // 支持在本地运行时,启动调试程序 TODO: 应该添加debug参数共同限制，只有当开启debug再开调试
    NodeDebugger = {
      breakOnSigint: true, // 接收SIGINT信号
      inspectorOptions: { enabled: true, port: 9229 }
    }
    
    console.log('open debugger on ws prod 9229!')
  }

  const baseScriptOptions = {
    displayErrors: true,
    lineOffset: 0,
    columnOffset: 0,
    filename: filePath,
    // 启用调试器，并将端口设置为 9229
    ...NodeDebugger
  }

  const fake: FakeModule = {
    exports: {},
  } as any

  const requireCb = !requireOut
    ? requireIn
    : (id: string) => {
      let result: any

      try {
        result = requireOut(id)
      } catch (e) {
        // ..
      }

      if (!result) {
        result = require(id)
      }

      return result
    }

  /** 运行代码的全局上下文 */
  const context = {
    ...globalParams,
    module: fake,
    exports: fake.exports,
    require: requireCb,
    __dirname: dirname,
    __filename: filePath,
  }

  /** 运行错误 */
  let err: RunError | undefined
  try {
    err = await new Promise((resolve, reject) => {
      new vm.Script(code, baseScriptOptions)
        .runInNewContext(context, baseScriptOptions)
        .then(() => resolve(undefined))
        .catch((e) => {
          reject(e)
        })
    })
  } catch (e: any) {
    err = getErrorMessage(e)
  }
  return {
    output: fake.exports.default ?? fake.exports,
    error: err,
  }
}

/**
* @method 执行前的前置处理
*/
async function bootstrap(browserType, runOption: any) {
  let browserCore
  switch (browserType){
    case 'firefox':
      browserCore = firefox
      break
    case 'edge':
    case 'safari':
    case 'webkit':
      browserCore = webkit
      break
    case 'chromium':
    default:
      browserCore = chromium
  }

  const launchOptions: LaunchOptions = {
    headless: runOption?.headless || false, // 是否无头模式，默认为显示
    executablePath: runOption?.executablePath || undefined,
  }
  // hostDns server
  launchOptions.proxy = runOption.proxy
  const browser = await browserCore.launch(launchOptions)

  console.log("run browser launch config: ", JSON.stringify(launchOptions))
  // set control
  const control = new TestControl(runOption.id, browser)
  // cherry.testControl.set(runOption.id, control)
  // script parse
  return new V1Parse(control, runOption)
}

async function GetStartScript():Promise<string[]> {
  return new Promise((resolve,reject) => {
    process.on('message', (msg: any) => {
      resolve(msg)
    })
  })
}

(async () => {
  process.on('message', (msg: any) => {
    if (msg.kill) {
      console.log('child process exit success!')
      process.exit()
    }
  })
  const [code,runOptionString] = await GetStartScript()
  const runOption = JSON.parse(runOptionString) || {}

  console.log("browser runOption:", JSON.stringify(runOption))
  const userBrowser = runOption.browser
  console.log("use browser:", userBrowser)
  resolver = await bootstrap(userBrowser, runOption) // 初始化引导,理论可以传多个配合看后续设计
  const runCode = `(async()=>{${code}\n;})()`
  let result: any

  const resultData: any = await runScript(runCode, {

    globalParams: resolver?.registerGlobalApi() || {},
    dirname: __dirname,
    filename: VirtualFile,

  }).catch((res) => {
    sendResult(res)

    setTimeout(() => {
      console.log("执行出错280")
      process.exit(1)
    }, 300);
  })
  // 判断是否有errorSend命令
  // eslint-disable-next-line prefer-const
  console.log('自定义错误结果-resolerCherryResult:', JSON.stringify(resolver.cherryResult))

  // 关闭追踪
  if (resolver.runOptins.remoteReport?.trace && resolver.control && resolver.control.browserContext) {
    console.log("测试关闭追踪逻辑")
    let trace_path: string | undefined = resolver.runOptins.remoteReport?.trace
    let online_os = false // 是否上传至服务器
    if (/http[s]{0,1}:\/\/([\w.]+\/?)\S*/.test(resolver.runOptins.remoteReport.trace)) { // 如果为http地址则进行上报
      // 如果未http地址则,存储到临时目录中
      trace_path = path.join(os.tmpdir(), 'cherryDfSession', resolver.control.id + '.zip')
      online_os = true
    }

    try {
      await resolver.control?.browserContext?.tracing.stop({ path: trace_path }) // 关闭跟踪 './trace.zip'
      console.log(`停止追踪成功, 存储的位置-: ${trace_path}`)
      if (online_os && trace_path) {
        // const buffer = fs.readFileSync(trace_path) // 读取内容，将内容上传到路径中
        await reportTrace(resolver.runOptins.remoteReport.trace, trace_path, resolver.runOptins.storage)
        // 上传后将本地文件删除
        fs.unlinkSync(trace_path)
      } else if (os.type() === 'Linux' && !online_os && trace_path) { // 当远程执行时,且地址为本地路径则需要删除文件，放置恶意打满磁盘
        fs.unlinkSync(trace_path)
        console.log("删除恶意追踪文件!")
      }
    } catch (error) {
      console.log("追踪关闭执行错误", error)
      resolver.runOptins.__log_body?.push(`trace save error: ${error}`)
    }
  }

  // 关闭页面以上传视频
  if ( runOption.audio && !!runOption.audio.url.trim() ) {
    let pages = await resolver.control?.browserContext?.pages() || []
    console.log("获取到的页面数量:", pages.length)
    for(let page of pages) {
      const video = await page.video()
      await page.close() // 视频上传前需要关闭页面
      let video_path = await video?.path() // 读取视频文件
      console.log("视频文件路径:", video_path)
      let as_video_path = path.join(os.tmpdir(), 'cherryDfSession', resolver.control.id + '_video' + '.webm')
      // 必须使用saveAs再另存一个目录否则, 视频大小将为0
      await video.saveAs(as_video_path)
      if (video_path) {
        await reportVideo(runOption.audio.url,video_path, runOption.storage)
      }
      // 上传完成后删除文件
      await page.video()?.delete()
      // 删除as的audio文件
      fs.unlinkSync(as_video_path)
    }
  }
  // eslint-disable-next-line prefer-const
  result = resolver.cherryResult || resultData
  if (result.error !== undefined) {
    console.log("运行错误:", result.error)
    const imgPath = path.resolve(os.tmpdir(), '__cherry_auto_error.jpg') // 获取系统临时目录

    let screenshotPath: string | undefined = imgPath
    if (os.type() === 'Linux') { // 远程执行,失败自动截图
      // 增加调试方式,将错误图片落磁盘
      screenshotPath = runOption.storage?.debugImage ? "/tmp/cherry_auto.jpeg" : undefined
    }
    let buffer
    try {
      buffer = await resolver.control?.currentPage?.screenshot({ path: screenshotPath, type: 'jpeg' })
      if (!buffer || buffer && buffer.length < 100) {
        console.log(`screenshot截图失败-路径: ${imgPath}`, " img-size:", buffer.length)
        resolver.runOptins.__log_body?.push(`错误自动截图失败screenshot-路径: ${imgPath},mg-size:,${buffer.length}`)
      } else { // 错误截图成功
        resolver.runOptins.__log_body?.push(`run error auto screenshot path : file://${imgPath}`)
      }
    } catch (error) {
      resolver.runOptins.__log_body?.push("执行<自动截图失败>:" + error,'<ai: 通常为未打开页面导致,请检查page.to等命令是否正常执行>')
    }
    if (buffer) {
      const screenImage = {
        path: imgPath,
        buffer,
        name: '__cherry_auto_error.jpg',
      }
      resolver.runOptins._screenImages.push(screenImage)
      // 直接发送内容避免非必要落本地磁盘
      await new Promise((resolver, reject) => {
        // @ts-ignore
        process.send({
          type: 'addScreenImages',
          data: screenImage,
        }, undefined, undefined, () => {
          console.log("错误图片上报成功")
          resolver(true)
        })
      })
    }
  }
  // 重置，避免影响其他
  resolver.cherryResult = {}
  if (!result.error) {
    resolver.runOptins.__log_body?.push('run success!')
  }else{
    resolver.runOptins.__log_body?.push(result.error.message)
  } 
  // 这里构建统一的运行结果，评估执行成功或失败
  const cherryResult: CherryResult = {
    duration: 0,
    success: !result.error,
    serverIp: ip.address(),
    msg: result.error?.message || '',
    divertor: [],
    log: `${resolver.runOptins.__log_body?.join('\n')}\n`,
    error: result.error,
    code: !result.error ? 2000 : 4044,
  }
  await sendResult(cherryResult)
  console.log('上报线程执行结果:',cherryResult.success)
  
  setTimeout(() => {
    console.log("执行子进程完成-filesh")
    process.exit(1)
  }, 300);
})()
