import { EventEmitter } from 'events'
import BrowserType from '../browsers/browserType'
import { CallMetadata } from '../protocol/callMetadata'
import { createGuid } from '../utils/suger'

export { CallMetadata } from '../protocol/callMetadata'

export type Attribution = {
    isInternal: boolean,
    browserType?: BrowserType;
    browser?: any;
    context?: any ;
    page?: any;
    frame?: any;
  };

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

export interface Instrumentation {
    addListener(listener: any, context: any | null): void;
    removeListener(listener: any): void;
    onBeforeCall(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
    onBeforeInputAction(sdkObject: SdkObject, metadata: CallMetadata, element: any): Promise<void>;
    onCallLog(sdkObject: SdkObject, metadata: CallMetadata, logName: string, message: string): void;
    onAfterCall(sdkObject: SdkObject, metadata: CallMetadata): Promise<void>;
    onEvent(sdkObject: SdkObject, metadata: CallMetadata): void;
    onPageOpen(page: any): void;
    onPageClose(page: any): void;
}
