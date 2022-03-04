import stripBom from 'strip-bom'
import { readFile } from '../utils/suger'
import { runCompiledCode, compileCode } from './compiler'
import BrowserTypeDispatcher from '../dispatchers/BrowserTypeDispatcher'

async function bootstrap() {
  const browser = new BrowserTypeDispatcher('chromium' as any, { rootSdkObject: { attribution: {} } })
  // 先不启动代理通讯服务，以原始步骤先观察逻辑
  // 尝试启动浏览器
  // const { context, launchOptions, contextOptions } = await launchContext(options, !!process.env.PWTEST_CLI_HEADLESS, process.env.PWTEST_CLI_EXECUTABLE_PATH);
  // 核心浏览器那块还得用 play的，没人力维护
  // 通讯逻辑沿用，但不沿用代码寻找更佳的升级空间，提高可控
  // 首先构造cherry连接通讯部分参考 inProcessFactory
  // const chromium = new Chromium({})
  // 先不管监听尝试打开浏览器
  // 不能直接以它的逻辑开始，容易过度引用代码，而是先以执行流程方向简化
  await browser._launchProcess({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }, undefined)
  // const browser = await chromium.launch({})
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
