import { EventEmitter } from 'events'
import { CallMetadata } from '../protocol/callMetadata'
import * as channels from '../protocol/channels'
// import { SerializedError } from '../protocol/channels'
import { createScheme } from '../protocol/validator'
import { tOptional, ValidationError, Validator } from '../protocol/validatorPrimitives'
import { SdkObject } from '../server/instrumentation'
import { rewriteErrorMessage } from '../utils/stackTrace'
import { monotonicTime } from '../utils/suger'

export const dispatcherSymbol = Symbol('dispatcher')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Dispatcher<Type extends { guid: string }, ChannelType> extends EventEmitter implements channels.Channel {
  _object: Type
  private _connection: DispatcherConnection
  private _isScope: boolean
  private _parent: Dispatcher<any, any> | undefined
  private _dispatchers = new Map<string, Dispatcher<any, any>>()
  readonly _scope: Dispatcher<any, any>
  protected _disposed = false

  readonly _guid: string
  readonly _type: string

  constructor(parent: Dispatcher<any, any> | DispatcherConnection, object: Type, type: string, initializer: channels.InitializerTraits<Type>, isScope?: boolean) {
    super()

    this._connection = parent instanceof DispatcherConnection ? parent : parent._connection
    this._isScope = !!isScope
    this._parent = parent instanceof DispatcherConnection ? undefined : parent
    this._scope = isScope ? this : this._parent!

    const { guid } = object
    // assert(!this._connection._dispatchers.has(guid))
    this._connection._dispatchers.set(guid, this)
    if (this._parent) {
    //   assert(!this._parent._dispatchers.has(guid))
      this._parent._dispatchers.set(guid, this)
    }

    this._type = type
    this._guid = guid
    this._object = object;

    (object as any)[dispatcherSymbol] = this
    if (this._parent) { this._connection.sendMessageToClient(this._parent._guid, type, '__create__', { type, initializer, guid }, this._parent._object) }
  }

  _dispatchEvent<T extends keyof channels.EventsTraits<ChannelType>>(method: T, params?: channels.EventsTraits<ChannelType>[T]) {
    if (this._disposed) {
    //   if (isUnderTest())
    //     throw new Error(`${this._guid} is sending "${method}" event after being disposed`);
      // Just ignore this event outside of tests.
      return
    }
    const sdkObject = this._object instanceof SdkObject ? this._object : undefined
    this._connection.sendMessageToClient(this._guid, this._type, method as string, params, sdkObject)
  }

  _debugScopeState(): any {
    return {
      _guid: this._guid,
      objects: Array.from(this._dispatchers.values()).map((o) => o._debugScopeState()),
    }
  }
}

let lastEventId = 0

export const kBrowserOrContextClosedError = 'Target page, context or browser has been closed'

export class DispatcherConnection {
  readonly _dispatchers = new Map<string, Dispatcher<any, any>>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onmessage = (m: any) => {}
  private _validateParams: (type: string, method: string, params: any) => any
  private _validateMetadata: (metadata: any) => { stack?: channels.StackFrame[] }
  private _waitOperations = new Map<string, CallMetadata>()

  sendMessageToClient(guid: string, type: string, method: string, params: any, sdkObject?: SdkObject) {
    params = this._replaceDispatchersWithGuids(params)
    if (sdkObject) {
      const eventMetadata: CallMetadata = {
        id: `event@${++lastEventId}`,
        objectId: sdkObject?.guid,
        pageId: sdkObject?.attribution?.page?.guid,
        frameId: sdkObject?.attribution?.frame?.guid,
        wallTime: Date.now(),
        startTime: monotonicTime(),
        endTime: 0,
        type,
        method,
        params: params || {},
        log: [],
        snapshots: [],
      }
      sdkObject.instrumentation?.onEvent(sdkObject, eventMetadata)
    }
    this.onmessage({ guid, method, params })
  }

  constructor() {
    const tChannel = (name: string): Validator => (arg: any, path: string) => {
      if (arg && typeof arg === 'object' && typeof arg.guid === 'string') {
        const { guid } = arg
        const dispatcher = this._dispatchers.get(guid)
        if (!dispatcher) throw new ValidationError(`${path}: no object with guid ${guid}`)
        if (name !== '*' && dispatcher._type !== name) throw new ValidationError(`${path}: object with guid ${guid} has type ${dispatcher._type}, expected ${name}`)
        return dispatcher
      }
      throw new ValidationError(`${path}: expected ${name}`)
    }
    const scheme = createScheme(tChannel)
    this._validateParams = (type: string, method: string, params: any): any => {
      const name = `${type + method[0].toUpperCase() + method.substring(1)}Params`
      if (!scheme[name]) { throw new ValidationError(`Unknown scheme for ${type}.${method}`) }
      return scheme[name](params, '')
    }
    this._validateMetadata = (metadata: any): any => tOptional(scheme.Metadata)(metadata, '')
  }

  async dispatch(message: object) {
    const {
      id, guid, method, params, metadata,
    } = message as any
    const dispatcher = this._dispatchers.get(guid)
    if (!dispatcher) {
      this.onmessage({ id, error: serializeError(new Error(kBrowserOrContextClosedError)) })
      return
    }
    if (method === 'debugScopeState') {
      const rootDispatcher = this._dispatchers.get('')!
      this.onmessage({ id, result: rootDispatcher._debugScopeState() })
      return
    }

    let validParams: any
    let validMetadata: channels.Metadata
    try {
      validParams = this._validateParams(dispatcher._type, method, params)
      validMetadata = this._validateMetadata(metadata)
      if (typeof (dispatcher as any)[method] !== 'function') { throw new Error(`Mismatching dispatcher: "${dispatcher._type}" does not implement "${method}"`) }
    } catch (e) {
      this.onmessage({ id, error: serializeError(e) })
      return
    }

    const sdkObject = dispatcher._object instanceof SdkObject ? dispatcher._object : undefined
    const callMetadata: CallMetadata = {
      id: `call@${id}`,
      stack: validMetadata.stack,
      apiName: validMetadata.apiName,
      internal: validMetadata.internal,
      objectId: sdkObject?.guid,
      pageId: sdkObject?.attribution?.page?.guid,
      frameId: sdkObject?.attribution?.frame?.guid,
      wallTime: Date.now(),
      startTime: monotonicTime(),
      endTime: 0,
      type: dispatcher._type,
      method,
      params: params || {},
      log: [],
      snapshots: [],
    }

    if (sdkObject && params?.info?.waitId) {
      // Process logs for waitForNavigation/waitForLoadState/etc.
      const { info } = params
      switch (info.phase) {
        case 'before': {
          this._waitOperations.set(info.waitId, callMetadata)
          await sdkObject.instrumentation.onBeforeCall(sdkObject, callMetadata)
          this.onmessage({ id })
          return
        } case 'log': {
          const originalMetadata = this._waitOperations.get(info.waitId)!
          originalMetadata.log.push(info.message)
          sdkObject.instrumentation.onCallLog(sdkObject, originalMetadata, 'api', info.message)
          this.onmessage({ id })
          return
        } case 'after': {
          const originalMetadata = this._waitOperations.get(info.waitId)!
          originalMetadata.endTime = monotonicTime()
          originalMetadata.error = info.error ? { error: { name: 'Error', message: info.error } } : undefined
          this._waitOperations.delete(info.waitId)
          await sdkObject.instrumentation.onAfterCall(sdkObject, originalMetadata)
          this.onmessage({ id })
          return
        }
      }
    }

    let error: any
    await sdkObject?.instrumentation.onBeforeCall(sdkObject, callMetadata)
    try {
      const result = await (dispatcher as any)[method](validParams, callMetadata)
      callMetadata.result = this._replaceDispatchersWithGuids(result)
    } catch (e) {
      // Dispatching error
      // We want original, unmodified error in metadata.
      callMetadata.error = serializeError(e)
      if (callMetadata.log.length) { rewriteErrorMessage(e, e.message + formatLogRecording(callMetadata.log)) }
      error = serializeError(e)
    } finally {
      callMetadata.endTime = monotonicTime()
      await sdkObject?.instrumentation.onAfterCall(sdkObject, callMetadata)
    }

    const response: any = { id }
    if (callMetadata.result) { response.result = callMetadata.result }
    if (error) { response.error = error }
    this.onmessage(response)
  }

  private _replaceDispatchersWithGuids(payload: any): any {
    if (!payload) { return payload }
    if (payload instanceof Dispatcher) { return { guid: payload._guid } }
    if (Array.isArray(payload)) { return payload.map((p) => this._replaceDispatchersWithGuids(p)) }
    if (typeof payload === 'object') {
      const result: any = {}
      for (const key of Object.keys(payload)) { result[key] = this._replaceDispatchersWithGuids(payload[key]) }
      return result
    }
    return payload
  }
}

function isError(obj: any): obj is Error {
  return obj instanceof Error || obj?.__proto__?.name === 'Error' || (obj?.__proto__ && isError(obj.__proto__))
}

export function serializeError(e: any): any {
  if (isError(e)) { return { error: { message: e.message, stack: e.stack, name: e.name } } }
  //   return { value: serializeValue(e, (value) => ({ fallThrough: value }), new Set()) }
  return 'cherry_error'
}

function formatLogRecording(log: string[]): string {
  if (!log.length) { return '' }
  const header = ' logs '
  const headerLength = 60
  const leftLength = (headerLength - header.length) / 2
  const rightLength = headerLength - header.length - leftLength
  return `\n${'='.repeat(leftLength)}${header}${'='.repeat(rightLength)}\n${log.join('\n')}\n${'='.repeat(headerLength)}`
}
