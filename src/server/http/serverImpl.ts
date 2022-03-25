import { run, RunOptions } from "../../run"

export interface PagePaginationInfe { // 分页
  current: number
  limit: number
}

export class serviceImpl {
  /**
   * @method 运行脚本，需要先新建一个独立浏览器，这时候无法获取到url，但是需要先开浏览器，然后通过运行后续命令打开目标页面
   */
  static async runScript(req, res, next) {
    const args: RunOptions = req.body
    delete args.executablePath // 远程禁止指定执行路径
    const result = await run(args.script || '', args)
    res.json(result)
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
