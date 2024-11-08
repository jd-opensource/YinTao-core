// 引入babel 编译源代码
import { transform } from '@babel/core'
import stripAnsi from 'strip-ansi'
import createCallsiteRecord from 'callsite-record'
import { fork } from 'child_process'
import path from 'path'
import { Console } from 'console'
import * as cherry from '../../../index'
import TestControl from '../../test_control/testControl'
import { createGuid } from '../../utils/utils'
import Resolver from '../resolve/resolver'
import { CherryResult, RunOptions } from '..'
export const VirtualFile = 'virtual_test.js'

export default class Compiler {
  code:string
  id:string
  resolver?: Resolver
  control?: TestControl
  _runOption: RunOptions
  dnsServer?: any

  constructor(code:string, option: RunOptions, analyse:string = 'v1') {
    this.code = code
    this.id = createGuid()
    this.compileCode()
    option.id = this.id
    this._runOption = option
  }

  /**
   * @method 运行不安全的代码,支持执行超时中断
   * @param script 脚本内容
   * @param timeout 超时时间/ms(默认15m)
   */
  async runUnsafeScript(script:string, callback?:Function, timeout:number = 900000) :Promise<CherryResult> {
    return new Promise((resolver, reject) => {
      const options = { execArgv: [],resourceLimits:{maxOldGenerationSizeMb:30} }; 
      const worker = fork(path.join(__dirname, './cherryRunner'), [],options)
      worker.send([script, JSON.stringify(this._runOption)]) // 通过进程传递脚本和内容
      const timeoutId = setTimeout(() => {
        worker.send({ kill: true }) // worker.kill() invalid
        reject(new Error("Timeout: Operation exceeds the maximum 900000ms time limit"))
      }, timeout)

      worker.on('message', (msg:any) => {
        const { type, data } = msg
        switch (type) {
          case 'addScreenImages':
            this._runOption._screenImages.push(data)
            break
          case 'clearScreenImages':
            this._runOption._screenImages = []
            this._runOption.storage?.__caseList?.shift()
            break
          case 'log':
              if(callback == undefined) break;
              callback({
                type: 'callback',
                msg: data,
                storage: this._runOption.storage
              })
            break
          case 'result':
            console.log("获取最终的执行结果:", data)
            clearTimeout(timeoutId)
            resolver(data)
            worker.send({ kill: true }) // 这里会报错. write EPIPE
            break
        }
      })

      worker.on('exit', (code, signal) => {
        clearTimeout(timeoutId)
        console.log('fork exit:', code)
      })

      worker.on('error', (err) => {
        console.log('err85:', err)
        clearTimeout(timeoutId)
        reject(err)
        worker.send({ kill: true })
      })
    })
  }

  /**
   * @method 执行编译代码
   */
  async runCompiledCode(callback?:Function) {
    let RunnerTimeout; let res:CherryResult
    try {
      res = await this.runUnsafeScript(this.code,callback)
      console.log("res*****", JSON.stringify(res))
      if (res.error) {
        const callsiteRecord = createCallsiteRecord({ forError: res.error, isCallsiteFrame: (frame) => !!frame.fileName && frame.fileName?.indexOf(VirtualFile) > -1 })
        if (callsiteRecord !== null) {
          // @ts-ignore  call interior func
          const errorMsg:string = callsiteRecord?._renderRecord(this.code, { frameSize: 3 })
          // del frist empty allow code align
          res.log += `${stripAnsi(res.error.message || '')}\n${stripAnsi(errorMsg.slice(1))}\n`
          res.error = new Error(`cherry run error:${res.error.message}\n`)
        } else {
          console.log('cherry run error - check stack:', res.error.message)
        }
      }
    } finally {
      clearTimeout(RunnerTimeout)
      this.dnsServer?.close()
      await this.clearTest()
    }
    console.log('finished! ', JSON.stringify(res))
    return res
  }

  compileCode():string {
    const compiled = transform(this.code, { filename: VirtualFile })
    return compiled?.code as string
  }

  async clearTest() {
    // 不在等待浏览器关闭, 有时无法收到退出
    // todo: 修改存储位置查看存储内容
    this.control?.browser.close()
  }
}
