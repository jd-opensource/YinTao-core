import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { readFile } from '../utils/suger'
import Compiler from './compiler'

interface Result {
  duration:number,
  success:boolean,
  msg:string,
  divertor:any[],
  log?:string
}

export async function run(code: string, opts: any = null) :Promise<Result> {
  const launchOptions :LaunchOptions = {
    executablePath: opts.executablePath,
    headless: opts.headless
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
    async () => await compiler.runCompiledCode().catch((e:Error) => {
      result.success = false
      result.msg = e.message
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
