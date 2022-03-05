import stripBom from 'strip-bom'
import { readFile } from '../utils/suger'
import { runCompiledCode, compileCode } from './compiler'
import BrowserTypeDispatcher from '../dispatchers/BrowserTypeDispatcher'

async function bootstrap() {
  const browser = new BrowserTypeDispatcher('chromium' as any, { rootSdkObject: { attribution: {} },sdkLanguage:'javascript' })
  // 先不启动代理通讯服务，以原始步骤先观察逻辑
  // mac os.tempdir() 移植下载浏览器，并维护browsers.json
  // testcafe-browser-tools 在mac中不可用还是需要用
  await browser._launchProcess({}, undefined)
  // 后续研究 与浏览器可靠通讯
}

export async function run(code: string, opts: any = null) {
  // 拿到脚本先编译, 以检查错误。
  console.log('run', code, opts, compileCode)
  const cCode = compileCode(code)
  // 运行代码前需要初始化浏览器环境
  await bootstrap()
  runCompiledCode(cCode)
  // 编译过了开始执行代码
  // 编译通过后,往下执行, 执行需要注入引用类
  return code
}

export async function runFile(filePath:string, opts:any) {
  const script = await readFile(filePath)
  const code = stripBom(script.toString()).toString()
  run(code, opts)
}
