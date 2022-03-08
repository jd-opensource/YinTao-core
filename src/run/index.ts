import stripBom from 'strip-bom'
import { readFile } from '../utils/suger'
import Compiler from './compiler'

export async function run(code: string, opts: any = null) {
  // 拿到脚本先编译, 以检查错误。
  console.log('run', code, opts)
  const compiler = new Compiler(code)
  await compiler.runCompiledCode()
  return code
}

export async function runFile(filePath:string, opts:any) {
  const script = await readFile(filePath)
  const code = stripBom(script.toString()).toString()
  await run(code, opts)
  console.log('全部执行完了')
}
