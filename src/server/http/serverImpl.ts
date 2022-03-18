import { run } from "../../run"

export interface PagePaginationInfe { // 分页
  current: number
  limit: number
}

/**
 * 运行参数
 */
export type RunConfig = {
  browser?: string // 浏览器
  script: string
  filePath?: string // 由script自动生成(临时)
  storage?: any
  executablePath?:string
  hosts:Map<string, string>
  remoteReport: {
      result: string
      image: string
  }
}

export class serviceImpl {
  /**
   * @method 运行脚本，需要先新建一个独立浏览器，这时候无法获取到url，但是需要先开浏览器，然后通过运行后续命令打开目标页面
   */
  static runScript(req, res, next) :void {
    const args: RunConfig = req.body
    delete args.executablePath // 远程禁止指定执行路径
    run(args.script, args)
  }

  /**
   * @method 获取可用的浏览器
   */
  static getBrowsers(req, res, next) :void {
    res.json({ msg: 'coming soon!' })
  }

  static ping(req, res) {
    res.json({ pong: 1 })
  }
}
