import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { reportRunLog, reportRunResult } from '../utils/remoteReport'
import { readFile } from '../utils/suger'
import Compiler from './compiler'

interface Result {
  duration:number,
  success:boolean,
  msg:string,
  divertor:any[],
  storage?:any
  log?:string
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
  storage?: any
  hosts?:Map<string, string>
  _startTime?:number
}

export async function run(code: string, opts: RunOptions = {}) :Promise<Result> {
  // 测试远程上报
  const launchOptions :RunOptions = {
    executablePath: opts.executablePath,
    headless: opts.headless,
    remoteReport: opts.remoteReport,
    hosts: opts.hosts,
    _startTime: new Date().getTime(),
  }
  // 拿到脚本先编译, 以检查错误。
  const result: Result = {
    duration: 0,
    success: true,
    msg: '',
    divertor: [],
  }
  const compiler = new Compiler(code, launchOptions)
  await guardTimeExecution(
    async () => await compiler.runCompiledCode().catch(async (e:Error) => {
      result.success = false
      result.msg = e.message
      // 当执行失败并且为远程上报时，需要取异步报告错误，当次运行错误，放弃图片
      if (launchOptions.remoteReport?.result) {
        await reportRunResult(launchOptions.remoteReport?.result, opts.storage)
      }
      if (launchOptions.remoteReport?.log) {
        await reportRunLog(launchOptions.remoteReport?.log, JSON.stringify(result), opts.storage)
      }
    }),
    (elapsedTime) => {
      const duration = (elapsedTime[0] * 1000) + (elapsedTime[1] / 1000000)
      result.duration = duration
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
