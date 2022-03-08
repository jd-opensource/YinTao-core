/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { monotonicTime } from './utils'

export class TimeoutRunnerError extends Error {}

type TimeoutRunnerData = {
  start: number,
  timer: NodeJS.Timer | undefined,
  timeoutPromise: ManualPromise<any>,
};
export class TimeoutRunner {
  private _running: TimeoutRunnerData | undefined
  private _timeout: number
  private _elapsed: number

  constructor(timeout: number) {
    this._timeout = timeout
    this._elapsed = 0
  }

  async run<T>(cb: () => Promise<T>): Promise<T> {
    const running = this._running = {
      start: monotonicTime(),
      timer: undefined,
      timeoutPromise: new ManualPromise(),
    }
    try {
      const resultPromise = Promise.race([
        cb(),
        running.timeoutPromise,
      ])
      this._updateTimeout(running, this._timeout)
      return await resultPromise
    } finally {
      this._elapsed += monotonicTime() - running.start
      this._updateTimeout(running, 0)
      if (this._running === running) { this._running = undefined }
    }
  }

  interrupt() {
    if (this._running) { this._updateTimeout(this._running, -1) }
  }

  updateTimeout(timeout: number) {
    this._timeout = timeout
    if (this._running) { this._updateTimeout(this._running, timeout) }
  }

  resetTimeout(timeout: number) {
    this._elapsed = 0
    this.updateTimeout(timeout)
  }

  private _updateTimeout(running: TimeoutRunnerData, timeout: number) {
    if (running.timer) {
      clearTimeout(running.timer)
      running.timer = undefined
    }
    if (timeout === 0) { return }
    const elapsed = (monotonicTime() - running.start) + this._elapsed
    timeout -= elapsed
    if (timeout <= 0) { running.timeoutPromise.reject(new TimeoutRunnerError()) } else { running.timer = setTimeout(() => running.timeoutPromise.reject(new TimeoutRunnerError()), timeout) }
  }
}

export async function raceAgainstTimeout<T>(cb: () => Promise<T>, timeout: number): Promise<{ result: T, timedOut: false } | { timedOut: true }> {
  const runner = new TimeoutRunner(timeout)
  try {
    return { result: await runner.run(cb), timedOut: false }
  } catch (e) {
    if (e instanceof TimeoutRunnerError) { return { timedOut: true } }
    throw e
  }
}

export class ManualPromise<T> extends Promise<T> {
  private _resolve!: (t: T) => void
  private _reject!: (e: Error) => void
  private _isDone: boolean

  constructor() {
    let resolve: (t: T) => void
    let reject: (e: Error) => void
    super((f, r) => {
      resolve = f
      reject = r
    })
    this._isDone = false
    this._resolve = resolve!
    this._reject = reject!
  }

  isDone() {
    return this._isDone
  }

  resolve(t: T) {
    this._isDone = true
    this._resolve(t)
  }

  reject(e: Error) {
    this._isDone = true
    this._reject(e)
  }

  static override get [Symbol.species]() {
    return Promise
  }

  override get [Symbol.toStringTag]() {
    return 'ManualPromise'
  }
}
