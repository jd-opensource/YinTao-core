import { EventEmitter } from 'events'
import BrowserType from '../browsers/browserType'
import { CallMetadata } from '../protocol/callMetadata'
import { createGuid } from '../utils/suger'
import { BrowserContext } from './browserContext'
import { ElementHandle } from './dom'
import { APIRequestContext } from './fetch'
import { Page } from './page'

export { CallMetadata } from '../protocol/callMetadata'

export type Attribution = {
    isInternal: boolean,
    browserType?: BrowserType;
    browser?: any;
    context?: any ;
    page?: any;
    frame?: any;
  };

export function internalCallMetadata(): CallMetadata {
  return {
    id: '',
    wallTime: 0,
    startTime: 0,
    endTime: 0,
    type: 'Internal',
    method: '',
    params: {},
    log: [],
    snapshots: [],
  }
}

export class SdkObject extends EventEmitter {
  guid: string
  attribution: Attribution
  instrumentation: Instrumentation

  protected constructor(parent: SdkObject, guidPrefix?: string, guid?: string) {
    super()
    this.guid = guid || `${guidPrefix || ''}@${createGuid()}`
    this.setMaxListeners(0)
    this.attribution = { ...parent.attribution }
    this.instrumentation = parent.instrumentation
  }
}

export interface InstrumentationListener {
  onBeforeCall?(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
  onBeforeInputAction?(sdkObject: SdkObject, metadata: CallMetadata, element: ElementHandle): Promise<void>;
  onCallLog?(sdkObject: SdkObject, metadata: CallMetadata, logName: string, message: string): void;
  onAfterCall?(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
  onEvent?(sdkObject: SdkObject, metadata: CallMetadata): void;
  onPageOpen?(page: Page): void;
  onPageClose?(page: Page): void;
}

export interface Instrumentation {
  addListener(listener: InstrumentationListener, context: BrowserContext | APIRequestContext | null): void;
  removeListener(listener: InstrumentationListener): void;
  onBeforeCall(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
  onBeforeInputAction(sdkObject: SdkObject, metadata: CallMetadata, element: ElementHandle): Promise<void>;
  onCallLog(sdkObject: SdkObject, metadata: CallMetadata, logName: string, message: string): void;
  onAfterCall(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
  onEvent(sdkObject: SdkObject, metadata: CallMetadata): void;
  onPageOpen(page: Page): void;
  onPageClose(page: Page): void;
}

export function createInstrumentation(): Instrumentation {
  const listeners = new Map<InstrumentationListener, BrowserContext | APIRequestContext | null>()
  return new Proxy({}, {
    get: (obj: any, prop: string) => {
      if (prop === 'addListener') { return (listener: InstrumentationListener, context: BrowserContext | APIRequestContext | null) => listeners.set(listener, context) }
      if (prop === 'removeListener') { return (listener: InstrumentationListener) => listeners.delete(listener) }
      if (!prop.startsWith('on')) { return obj[prop] }
      return async (sdkObject: SdkObject, ...params: any[]) => {
        for (const [listener, context] of listeners) {
          if (!context || sdkObject.attribution.context === context) { await (listener as any)[prop]?.(sdkObject, ...params) }
        }
      }
    },
  })
}
