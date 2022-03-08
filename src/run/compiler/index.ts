// 引入babel 编译源代码
import { transform } from '@babel/core'
import createCallsiteRecord from 'callsite-record'
import { Page, Dom } from './cherryv1'
import runScript from './runScript'
import * as cherry from '../../../index'

export function compileCode(code:string):string {
  const compiled = transform(code, { filename: 'virtual_test.js' })
  return compiled?.code as string
}

function _addGlobalApi(testId:string) {
  Object.defineProperty(global, 'page', {
    get: () => new Page(),
    configurable: true,
  })

  Object.defineProperty(global, 'dom', {
    get: () => new Dom(),
    configurable: true,
  })

  // 这里代替test的前置，我们将再这里增加一些前置内容
  Object.defineProperty(global, '__cherryRun', {
    get: () => ({
      gid: testId,
    }),
    configurable: true,
  })
}

function _delGlobalApi() {
  delete global.page
  delete global.dom
  delete global.__cherryRun
}

export async function runCompiledCode(code:string, testId:string) {
  _addGlobalApi(testId)
  const runCode = `(async()=>{${code}\n;})()`
  const res = await runScript(runCode, {
    globalParams: {
      page: new Page(),
      dom: new Dom(),
    },
    dirname: __dirname,
  })
  if (res.error !== undefined) {
    // @ts-ignore
    const errorMsg:string = createCallsiteRecord({ forError: res.error })._renderRecord(code, { frameSize: 3 })
    // del frist empty allow code align
    console.log('cherry run error:', res.error.message, '\n', errorMsg.slice(1))
  }
  _delGlobalApi()
  await testClear(testId)
  console.log('run finished!')
}

async function testClear(testId:string) {
  const control = cherry.testControl.get(testId)
  await control?.browser.close()
  cherry.testControl.delete(testId)
}
