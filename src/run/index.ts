import stripBom from 'strip-bom'
import { LaunchOptions } from '../../types/types'
import guardTimeExecution from '../utils/guard-time-execution'
import { getImageType, reportRunImage, reportRunLog, reportRunResult } from '../utils/remoteReport'
import { readFile } from '../utils/suger'
import stripAnsi from 'strip-ansi'
import Compiler from './compiler'
import ip from "ip"

export interface CherryResult {
  duration:number,
  success:boolean,
  msg:string,
  divertor:any[], // 目前来说价值不大了，后续应该删除
  storage?:any
  log?:string
  serverIp:string,
  error? : Error
  images?:{
    path:string,
    base64:string
  }[]
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
    trace?:string
  },
  audio?:{
    // 非必填, 控制录制时的分辨率
    size?: {
      /**
       * Video frame width.
       */
      width: number;
      /**
       * Video frame height.
       */
      height: number;
    }
    //url必填视频上报的地址
    url :string
  }
  recordVideo?: {
    /**
     * Path to the directory to put videos into.
     */
    dir: string;

    /**
     * Optional dimensions of the recorded videos. If not specified the size will be equal to `viewport` scaled down to fit
     * into 800x800. If `viewport` is not configured explicitly the video size defaults to 800x450. Actual picture of each page
     * will be scaled down if necessary to fit the specified size.
     */
    size?: {
      /**
       * Video frame width.
       */
      width: number;
      /**
       * Video frame height.
       */
      height: number;
    };
  };
  browser:string
  cookies:any[]
  script?:string
  headless?:boolean
  storage?: any
  screen?: {
    width: number
    height: number
  }
  _startTime?:number
  __log_body:string[]
  _screenImages: ImgFile[]
}

/**
 * @param code 执行的代码片段
 * @param opts 运行配置项
 * @param callback 用于执行中的消息传递，目前仅用于实时日志
 * @returns 
 */

export async function run(code: string, opts: RunOptions = {
  _screenImages: [],
  script: '',
  browser:'chromium',
  __log_body:[],
  cookies: [],
},callback?:(data:{type:'callback',msg:string})=>{}) :Promise<CherryResult> {
  let cherryResult :CherryResult
  console.log("cherry -> core run config :", JSON.stringify(opts))
  console.log("cherry -> core run script :", code)
  const launchOptions :RunOptions = {
    executablePath: opts.executablePath,
    audio: opts.audio,
    __log_body:[],
    browser: opts.browser,
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
      serverIp: ip.address(),
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
    async () => await compiler.runCompiledCode(callback).then((result:CherryResult)=>{
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
  
  if(!launchOptions.remoteReport || launchOptions.remoteReport.image == undefined) {
    // 当没有异步上报时, 将日志和图片返回给http响应
    cherryResult.images = []
    launchOptions._screenImages.map(async (img) => {
        if (Buffer.isBuffer(img.buffer) == false) {
          img.buffer = Buffer.from(img.buffer)
        }
        const imgbase64 = `data:image/${getImageType(img.name)};base64,${img.buffer.toString('base64')}`

        cherryResult.images?.push({
          path: img.name || '',
          base64: imgbase64
        })
      }
    )
  }
  
  return cherryResult
}

export async function runFile(filePath:string, opts:any) {
  const script = await readFile(filePath)
  const code = stripBom(script.toString()).toString()
  await run(code, opts)
}
