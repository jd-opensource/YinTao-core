// 引入babel 编译源代码
import { transform } from '@babel/core'
import createCallsiteRecord from 'callsite-record'
import { createGuid } from '../../utils/suger'
import { Page, Dom } from './cherryv1'
import runScript from './runScript'

export function compileCode(code:string):string {
  const compiled = transform(code, { filename: 'virtual_test.js' })
  return compiled?.code as string
}

function _addGlobalApi() {
  Object.defineProperty(global, 'page', {
    get: () => new Page(),
    configurable: true,
  })

  Object.defineProperty(global, 'dom', {
    get: () => new Dom(),
    configurable: true,
  })

  // 这里代替test的前置，我们将再这里增加一些前置内容
  const testId = createGuid()
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

export async function runCompiledCode(code:string) {
  _addGlobalApi()
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
  console.log('run finished!')
}
