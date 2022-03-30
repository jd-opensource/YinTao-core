import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { reportRunImage, reportRunLog, reportRunResult } from '../utils/remoteReport'
import { readFile } from '../utils/suger'
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
  script?:string
  storage?: any
  _startTime?:number
  _screenImages: ImgFile[] // 单次运行时的截图
}

export async function run(code: string, opts: RunOptions = {
  _screenImages: [],
  script: '',
}) :Promise<Result> {
  // 测试远程上报
  const launchOptions :RunOptions = {
    executablePath: opts.executablePath,
    headless: opts.headless,
    remoteReport: opts.remoteReport,
    storage: opts.storage,
    proxy: opts.proxy,
    _startTime: new Date().getTime(),
    _screenImages: [],
  }
  // 拿到脚本先编译, 以检查错误。
  const result: Result = {
    duration: 0,
    success: true,
    msg: '',
    divertor: [],
    code: 2000,
  }
  const compiler = new Compiler(code, launchOptions)
  await guardTimeExecution(
    async () => await compiler.runCompiledCode().catch(async (e:Error) => {
      result.success = false
      result.msg = e.message
      result.code = 4044
      // 当执行失败并且为远程上报时，需要取异步报告错误，当次运行错误，放弃图片
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
          await reportRunLog(launchOptions.remoteReport?.log, JSON.stringify(result), storage)
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
  console.log('全部执行完了')
}
