// 引入babel 编译源代码
import { transform } from '@babel/core'
import stripAnsi from 'strip-ansi'
import createCallsiteRecord from 'callsite-record'
import * as cherry from '../../../index'
import TestControl from '../../test_control/testControl'
import { createGuid } from '../../utils/utils'
import Resolver from '../resolve/resolver'
import { CherryResult, RunOptions } from '..'
import {fork} from 'child_process'
import path from 'path'

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
  async runUnsafeScript(script:string, timeout:number= 900000) :Promise<CherryResult>{
    return new Promise((resolver,reject)=>{
      const worker = fork(path.join(__dirname,'cherryRunner'), [script,JSON.stringify(this._runOption)])

      const timeoutId = setTimeout(()=>{
        worker.send({kill:true}) // worker.kill() invalid
        reject(new Error("Timeout"))
      }, timeout)

      worker.on('message', (msg:any)=>{
        const {type,data} = msg
        switch(type){
          case 'addScreenImages':
            this._runOption._screenImages.push(data)
            break
          case 'clearScreenImages':
            this._runOption._screenImages = []
            this._runOption.storage?.__caseList?.shift()
            break
          case 'result':
            clearTimeout(timeoutId)
            resolver(data)
            worker.send({kill:true})
            break
        }
      });

      worker.on('exit', function (code, signal) {
        clearTimeout(timeoutId)
        console.log('fork exit:', code)
      });
    
      worker.on('error', function (err) {
        console.log('err85:',err)
        clearTimeout(timeoutId)
        reject(err)
        worker.send({kill:true})
      })
    })
  }

  /**
   * @method 执行编译代码
   */
  async runCompiledCode() {
    var RunnerTimeout,res:CherryResult
    try {
      res = await this.runUnsafeScript(this.code)
      if (res.error) {
        const callsiteRecord = createCallsiteRecord({ forError: res.error, isCallsiteFrame: (frame) => !!frame.fileName && frame.fileName?.indexOf(VirtualFile) > -1 })
        if (callsiteRecord !== null) {
          // @ts-ignore  call interior func
          const errorMsg:string = callsiteRecord?._renderRecord(this.code, { frameSize: 3 })
          // del frist empty allow code align
          res.log = res.log + `${stripAnsi(res.error.message || '')}\n${stripAnsi(errorMsg.slice(1))}\n`
          res.error = new Error(`cherry run error:${res.error.message}\n`);
        } else {
          console.log('cherry run error - check stack:', res.error.message)
        }
      }
    } finally {
      clearTimeout(RunnerTimeout)
      this.dnsServer?.close()
      await this.clearTest()
    }
    console.log('finished! ', JSON.stringify(res) )
    return res
  }

  compileCode():string {
    const compiled = transform(this.code, { filename: VirtualFile })
    return compiled?.code as string
  }

  async clearTest() {
    // 不在等待浏览器关闭, 有时无法收到退出
    this.control?.browser.close()
    cherry.testControl.delete(this.id)
  }
}
