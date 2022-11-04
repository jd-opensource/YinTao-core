

import vm from 'vm'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { VirtualFile } from './index'
import * as cherry from '../../../index'
import { LaunchOptions } from '../../client/types'
import V1Parse from '../resolve/v1Parse'
import TestControl from '../../test_control/testControl'
import { CherryResult } from '..'
import { __sleep } from '../../utils/suger'

process.on('uncaughtException', function(err) {
  console.log("收到了关闭异常:",err)
  process.exit(1);
});

// @ts-ignore
const sendResult = (result)=> {process.send({type:"result",data:result},undefined,undefined,()=>{
    setTimeout(() => {
      // 有时未上报完，线程就莫名被关闭，因此添加调试。
      console.log('send resule success~ exit child process!')
      process.exit(0)
    }, 300);
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
  const baseScriptOptions = {
    displayErrors: true,
    lineOffset: 0,
    columnOffset: 0,
    filename: filePath,
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
async function bootstrap(browserType:string ='chrome',runOption:any){
    let browserCore
    if (browserType === 'chrome') {
      browserCore = cherry.chromium
    }

    const launchOptions : LaunchOptions = {
      headless: runOption?.headless || false,
      executablePath: runOption?.executablePath || undefined,
    }

    // hostDns server
    launchOptions.proxy = runOption.proxy
    const browser = await browserCore.launch(launchOptions)
    // set control
    const control = new TestControl(runOption.id, browser)
    cherry.testControl.set(runOption.id, control)

    // script parse
    return new V1Parse(control, runOption)
}

(async()=>{
    process.on('message',(msg:any)=>{
        if(msg.kill){
          console.log('child process exit success!')
          process.exit()
        } 
    })
    const code = process.argv[2]
    const runOption = JSON.parse(process.argv[3] || '{}') 
    const resolver =  await bootstrap('chrome',runOption) // 初始化引导,理论可以传多个配合看后续设计
    const runCode = `(async()=>{${code}\n;})()`

    const result :any = await runScript(runCode, {
        globalParams: resolver?.registerGlobalApi() || {},
        dirname: __dirname,
        filename: VirtualFile,
    }).catch(res=>{
      console.log('我先感知到出错,这里好像p用没有')
      sendResult(res)
    })
    if (result.error !== undefined) {
      console.log("运行错误:", result.error)
      const imgPath = path.resolve(os.tmpdir(),'__cherry_auto_error.jpg') // 获取系统临时目录
      let screenshotPath : string | undefined = imgPath
      if (os.type() === 'Linux') { // 远程执行,失败自动截图
          // 增加调试方式,将错误图片落磁盘
          screenshotPath = runOption.storage?.debugImage ? "/tmp/cherry_auto.jpeg" : undefined
      } else { // 显示本地错误截图路径
        resolver.runOptins.__log_body?.push(`run error auto screenshot path : file://${imgPath}`)
      }
      console.log("staring 执行错误自动截图中...")
      var buffer
      try {
        buffer = await resolver.control?.currentPage?.screenshot({ path: screenshotPath, type: 'jpeg' })
      } catch (error) {
        console.log("执行错误-自动截图失败:", error)
        // 如果页面未正常运行(例: 长时间loding)，这种情况下cdp截图无法正常截取，需要读取指定图片传递给后台
      }
      if (buffer) {
        const screenImage = {
          path: imgPath,
          buffer,
          name: imgPath,
        }
        resolver.runOptins._screenImages.push(screenImage)
        // 直接发送内容避免非必要落本地磁盘
        await new Promise((resolver,reject)=>{
            // @ts-ignore
            process.send(
              {
                type: 'addScreenImages',
                data: screenImage
              },undefined,undefined,()=>{
                console.log("错误图片上报成功")
              resolver(true)
            })
        })
      }
    }
    if(!result.error) {
      resolver.runOptins.__log_body?.push('run success!')
    }
    // 这里构建统一的运行结果，评估执行成功或失败
    const cherryResult: CherryResult = {
      duration: 0,
      success: !result.error,
      msg: result.error?.message || '',
      divertor: [],
      log: resolver.runOptins.__log_body?.join('\n') + '\n',
      error: result.error,
      code: !result.error ? 2000 : 4044
    }
    sendResult(cherryResult)
    // 子线程不能自己退出必须等待退出消息
    while(true){
      await __sleep(3000)
    }
})()