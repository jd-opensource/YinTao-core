import { promisify } from 'util'
import crypto from 'crypto'
import fs from 'fs'
import removeFolder from 'rimraf'

export const readFile = promisify(fs.readFile)

export function createGuid(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function getCherryVersion(majorMinorOnly = false) {
  const packageJson = require('./../../package.json');
  return majorMinorOnly ? packageJson.version.split('.').slice(0, 2).join('.') : packageJson.version;
}

export const existsAsync = (path: string): Promise<boolean> => new Promise((resolve) => fs.stat(path, (err) => resolve(!err)))

// See https://joel.tools/microtasks/
export function makeWaitForNextTask() {
  // As of Mar 2021, Electron v12 doesn't create new task with `setImmediate` despite
  // using Node 14 internally, so we fallback to `setTimeout(0)` instead.
  // @see https://github.com/electron/electron/issues/28261
  if ((process.versions as any).electron) { return (callback: () => void) => setTimeout(callback, 0) }
  if (parseInt(process.versions.node, 10) >= 11) { return setImmediate }

  // Unlike Node 11, Node 10 and less have a bug with Task and MicroTask execution order:
  // - https://github.com/nodejs/node/issues/22257
  //
  // So we can't simply run setImmediate to dispatch code in a following task.
  // However, we can run setImmediate from-inside setImmediate to make sure we're getting
  // in the following task.

  let spinning = false
  const callbacks: (() => void)[] = []
  const loop = () => {
    const callback = callbacks.shift()
    if (!callback) {
      spinning = false
      return
    }
    setImmediate(loop)
    // Make sure to call callback() as the last thing since it's
    // untrusted code that might throw.
    callback()
  }

  return (callback: () => void) => {
    callbacks.push(callback)
    if (!spinning) {
      spinning = true
      setImmediate(loop)
    }
  }
}

export async function removeFolders(dirs: string[]): Promise<Array<Error|null|undefined>> {
  return await Promise.all(dirs.map((dir: string) => new Promise<Error|null|undefined>((fulfill) => {
    removeFolder(dir, { maxBusyTries: 10 }, (error) => {
      fulfill(error ?? undefined)
    })
  })))
}

export function monotonicTime(): number {
  const [seconds, nanoseconds] = process.hrtime()
  return seconds * 1000 + (nanoseconds / 1000 | 0) / 1000
}
