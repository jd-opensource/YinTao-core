// 引入babel 编译源代码
import { transform } from '@babel/core'
import createCallsiteRecord from 'callsite-record'
import runScript from './runScript'
import * as cherry from '../../../index'
import TestControl from '../../test_control/testControl'
import { createGuid } from '../../utils/utils'
import Resolver from '../resolve/resolver'
import V1Parse from '../resolve/v1Parse'
import { LaunchOptions } from '../../../index'

export const VirtualFile = 'virtual_test.js'

export default class Compiler {
  code:string
  id:string
  resolver?: Resolver
  control?: TestControl
  _launchOption?: LaunchOptions
  constructor(code:string, option: LaunchOptions, analyse:string = 'v1') {
    this.code = code
    this.id = createGuid()
    this.compileCode()
    this._launchOption = option
  }

  /**
   * @method 执行前的前置处理
   */
  async bootstrap(browserType:string) {
    let browserCore
    if (browserType === 'chrome') {
      browserCore = cherry.chromium
    }
    const launchOptions = {
      headless: this._launchOption?.headless || false,
      executablePath: this._launchOption?.executablePath || undefined,
    }
    const browser = await browserCore.launch(launchOptions)
    // 设置测试控制器
    this.control = new TestControl(this.id, browser)
    cherry.testControl.set(this.id, this.control)

    // 这里需要传入解析版本
    this.resolver = new V1Parse(this.control)
  }

  /**
   * @method 执行编译代码
   */
  async runCompiledCode() {
    try {
      await this.bootstrap('chrome') // 初始化引导,理论可以传多个配合看后续设计
      const runCode = `(async()=>{${this.code}\n;})()`
      const res = await runScript(runCode, {
        globalParams: this.resolver?.registerGlobalApi() || {},
        dirname: __dirname,
        filename: VirtualFile,
      })
      if (res.error !== undefined) {
        // 调试时开放isCallsiteFrame,以抛出明细
        const callsiteRecord = createCallsiteRecord({ forError: res.error, isCallsiteFrame: (frame) => !!frame.fileName && frame.fileName?.indexOf(VirtualFile) > -1 })
        if (callsiteRecord !== null) {
          // @ts-ignore  锁定以调用私有方法
          const errorMsg:string = callsiteRecord?._renderRecord(this.code, { frameSize: 3 })
          // del frist empty allow code align
          console.log('cherry run error:', res.error.message, '\n', errorMsg.slice(1))
          throw new Error(`cherry run error:${res.error.message}\n${errorMsg.slice(1)}`)
        } else {
          console.log('cherry run error:', res.error.message)
          throw new Error(res.error.message)
        }
      }
    } finally {
      await this.clearTest()
      console.log('run finished!')
    }
  }

  compileCode():string {
    const compiled = transform(this.code, { filename: VirtualFile })
    return compiled?.code as string
  }

  async clearTest() {
    await this.control?.browser.close()
    cherry.testControl.delete(this.id)
  }
}
