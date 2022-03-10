import vm from 'vm'
import path from 'path'
import { createRequire } from 'module'

interface RunScriptOptions {
  /** 当前脚本所在文件夹路径 */
  dirname: string;
  /**
   * 需要运行的代码所在的虚拟文件名称
   *  - 默认为`virtual-san-box.js`
   */
  filename?: string;
  /**
   * 外部 require 函数
   *  - 沙箱内置了 require 函数，和`dirname`选项关联
   *  - 如果此项不填，或者是在运行中失败，会回退到内置的 require 函数
   */
  require?: any;
  /** 全局参数 */
  globalParams?: Record<string, any>;
}

/** 拟造模块接口 */
interface FakeModule {
  exports: {
    default: any;
  };
}

/** 运行结果 */
interface RunResult<T> {
  output: T;
  error?: any;
}

interface RunError {
  /** 原始错误信息 */
  message: string;
  /** 原始错误堆栈信息 */
  stack: string;
  /** 错误位置信息 */
  location?: {
    /** 发生错误的文件路径 */
    filePath: string;
    /**
     * 行号
     *  - 首行为`1`
     */
    line: number;
    /**
     * 列号
     *  - 首列为`1`
     */
    column?: number;
    /** 错误文本的长度 */
    length?: number;
    /** 错误行字符串 */
    lineText?: string;
  };
}

/** 解析错误信息 */
function getErrorMessage(e: Error): RunError {
  const err: RunError = {
    message: e.message,
    stack: e.stack ?? '',
  }

  // 前三行分别是错误文件路径，错误行文本，错误列文本
  const [fileText, lineText, errorText] = err.stack.split('\n')

  if (!fileText) {
    return err
  }

  const lineNumberMatch = fileText.match(/:\d+$/)

  if (lineNumberMatch) {
    err.location = {
      filePath: fileText.substring(0, lineNumberMatch.index),
      // eslint-disable-next-line radix
      line: Number.parseInt(lineNumberMatch[0].substring(1)),
    }
  } else {
    return err
  }

  if (lineText) {
    err.location.lineText = lineText
  }

  if (errorText) {
    const columnMatch = errorText.match(/\^+$/)

    if (columnMatch) {
      err.location.column = (columnMatch.index ?? 0) + 1
      err.location.length = columnMatch[0].length
    }
  }

  return err
}

/** 运行代码 */
export default async function runScript<T = any>(code: string, options: RunScriptOptions): Promise<RunResult<T>> {
  const {
    dirname,
    filename,
    require: requireOut,
    globalParams = {},
  } = options

  const filePath = path.join(dirname, filename || '')
  const requireIn = createRequire(filePath)
  const baseScriptOptions = {
    displayErrors: true,
    lineOffset: 0,
    columnOffset: 0,
    filename: filePath,
  }

  const fake: FakeModule = {
    exports: {},
  } as any

  const requireCb = !requireOut
    ? requireIn
    : (id: string) => {
      let result: any

      try {
        result = requireOut(id)
      } catch (e) {
        // ..
      }

      if (!result) {
        result = require(id)
      }

      return result
    }

  /** 运行代码的全局上下文 */
  const context = {
    ...globalParams,
    module: fake,
    exports: fake.exports,
    require: requireCb,
    __dirname: dirname,
    __filename: filePath,
  }

  /** 运行错误 */
  let err: RunError | undefined

  try {
    err = await new Promise((resolve, reject) => {
      new vm.Script(code, baseScriptOptions)
        .runInNewContext(context, baseScriptOptions)
        .then(() => resolve(undefined))
        .catch((e) => {
          reject(e)
        })
    })
  } catch (e: any) {
    err = getErrorMessage(e)
  }

  return {
    output: fake.exports.default ?? fake.exports,
    error: err,
  }
}
