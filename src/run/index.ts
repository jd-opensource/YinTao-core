import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { reportRunImage, reportRunLog, reportRunResult } from '../utils/remoteReport'
import { readFile } from '../utils/suger'
import stripAnsi from 'strip-ansi'
import Compiler from './compiler'

export interface Result {
  duration:number,
  success:boolean,
  msg:string,
  divertor:any[],
  storage?:any
  log?:string
  /**
   * @code 4021 脚本编译错误 4044 脚本执行错误 2000执行成功
   */
  code:number
}

export interface ImgFile {
  name:string
  buffer: Buffer
  path: string
}

export interface RunOptions extends LaunchOptions{
  remoteReport?:{
    result?:string
    log?:string
    image?:string
  },
  cookies:any[]
  script?:string
  storage?: any
  screen?: {
    width: number
    height: number
  }
  _startTime?:number
  __log_body?:any[]
  _screenImages: ImgFile[]
}

export async function run(code: string, opts: RunOptions = {
  _screenImages: [],
  script: '',
  cookies: [],
}) :Promise<Result> {
  const launchOptions :RunOptions = {
    executablePath: opts.executablePath,
    headless: opts.headless,
    cookies: opts.cookies || [],
    remoteReport: opts.remoteReport,
    storage: opts.storage,
    proxy: opts.proxy,
    _startTime: new Date().getTime(),
    _screenImages: [],
    screen: opts.screen,
  }
  const result: Result = {
    duration: 0,
    success: true,
    msg: '',
    divertor: [],
    code: 2000,
  }
  let compiler
  try {
    compiler = new Compiler(code, launchOptions)
  } catch (error) {
    // 抛出编译错误
    result.success = false
    result.msg = error.message
    result.log = stripAnsi(error.message) // 错误中包含cli着色器日志中需要去除
    result.code = 4025
    result.storage = opts.storage
    if (launchOptions.remoteReport) {
      const caseId = launchOptions?.storage?.__caseList?.shift() || undefined
      const storage = {
        ...opts.storage,
        args: [caseId],
      }
      if (launchOptions.remoteReport?.result) {
        await reportRunResult(launchOptions.remoteReport?.result, result, storage)
      }
      if (launchOptions.remoteReport?.log) {
        await reportRunLog(launchOptions.remoteReport?.log, JSON.stringify(result), storage)
      }
    }
    console.log('result', JSON.stringify(result))
    return result
  }
  await guardTimeExecution(
    async () => await compiler.runCompiledCode().then((a,b)=>{
      // 执行成功
      launchOptions.__log_body?.push('run success!')
      result.log =  launchOptions.__log_body?.join('\n')
    }).catch(async (e:Error) => {
      // 抛出执行错误
      result.success = false
      result.msg = e.message
      result.log =  launchOptions.__log_body?.join('\n') + '\n' + stripAnsi(e.message)
      result.code = 4044
      if (launchOptions.remoteReport) {
        const caseId = launchOptions?.storage?.__caseList?.shift() || undefined
        const storage = {
          ...opts.storage,
          args: [caseId],
        }
        if (launchOptions.remoteReport?.result) {
          await reportRunResult(launchOptions.remoteReport?.result, result, storage)
        }
        if (launchOptions.remoteReport?.image) {
          await reportRunImage(launchOptions.remoteReport?.image, launchOptions._screenImages, storage)
        }
        if (launchOptions.remoteReport?.log) {
          await reportRunLog(launchOptions.remoteReport?.log, JSON.stringify(result.log), storage)
        }
      }
    }),
    (elapsedTime) => {
      const duration = (elapsedTime[0] * 1000) + (elapsedTime[1] / 1000000)
      result.duration = duration
      result.storage = opts.storage
      console.log('time:', duration, 'ms') //  elapsedTime [秒，纳秒后缀]
    },
  )
  console.log('result', JSON.stringify(result))
  return result
}

export async function runFile(filePath:string, opts:any) {
  const script = await readFile(filePath)
  const code = stripBom(script.toString()).toString()
  await run(code, opts)
}
