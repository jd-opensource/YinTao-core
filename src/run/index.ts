import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { reportRunImage, reportRunLog, reportRunResult } from '../utils/remoteReport'
import { readFile } from '../utils/suger'
import stripAnsi from 'strip-ansi'
import Compiler from './compiler'

export interface CherryResult {
  duration:number,
  success:boolean,
  msg:string,
  divertor:any[], // 目前来说价值不大了，后续应该删除
  storage?:any
  log?:string
  error? : Error
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
  id?:string
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
  __log_body:string[]
  _screenImages: ImgFile[]
}

export async function run(code: string, opts: RunOptions = {
  _screenImages: [],
  script: '',
  __log_body:[],
  cookies: [],
}) :Promise<CherryResult> {
  let cherryResult :CherryResult
  const launchOptions :RunOptions = {
    executablePath: opts.executablePath,
    __log_body:[],
    headless: opts.headless,
    cookies: opts.cookies || [],
    remoteReport: opts.remoteReport,
    storage: opts.storage,
    proxy: opts.proxy,
    _startTime: new Date().getTime(),
    _screenImages: [],
    screen: opts.screen,
  }
 
  let compiler: Compiler
  try {
    compiler = new Compiler(code, launchOptions)
  } catch (error) {
    // 抛出编译错误
    cherryResult = {
      duration: 0,
      success: false,
      msg: error.message,
      divertor: [],
      log:stripAnsi(error.message),
      code: 4025,
      storage : opts.storage
    }
    if (launchOptions.remoteReport) {
      const caseId = launchOptions?.storage?.__caseList?.shift() || undefined
      const storage = {
        ...opts.storage,
        args: caseId === undefined || caseId == null ? [] : [caseId],
      }
      if (launchOptions.remoteReport?.result) {
        await reportRunResult(launchOptions.remoteReport?.result, cherryResult, storage)
      }
      if (launchOptions.remoteReport?.log) {
        await reportRunLog(launchOptions.remoteReport?.log, JSON.stringify(cherryResult), storage)
      }
    }
    return cherryResult
  }

  let duration:number = 0
  cherryResult = await guardTimeExecution(
    async () => await compiler.runCompiledCode().then((result:CherryResult)=>{
      return result
    }),
    (elapsedTime) => {
      duration = (elapsedTime[0] * 1000) + (elapsedTime[1] / 1000000)
      console.log('time:', duration, 'ms') //  elapsedTime [秒，纳秒后缀]
    },
  )
  cherryResult.duration = duration
  cherryResult.storage = opts.storage
  if (launchOptions.remoteReport) {
    console.log("执行完毕-启动远程异步数据上报!")
    const caseId = launchOptions?.storage?.__caseList?.shift() || undefined
    const storage = {
      ...opts.storage,
      args: caseId === undefined || caseId == null ? [] : [caseId],
    }
    if (launchOptions.remoteReport.result) {
      await reportRunResult(launchOptions.remoteReport.result, cherryResult, storage)
    }
    if (launchOptions.remoteReport.image) {
      await reportRunImage(launchOptions.remoteReport.image, launchOptions._screenImages, storage)
    }
    if (launchOptions.remoteReport.log) {
      await reportRunLog(launchOptions.remoteReport.log, JSON.stringify(cherryResult.log), storage)
    }
  }
  return cherryResult
}

export async function runFile(filePath:string, opts:any) {
  const script = await readFile(filePath)
  const code = stripBom(script.toString()).toString()
  await run(code, opts)
}
