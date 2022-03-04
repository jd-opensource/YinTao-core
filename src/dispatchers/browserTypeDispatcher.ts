import BrowserType from '../browsers/browserType'
import { Dispatcher } from './dispatcher'
import * as channels from '../protocol/channels'
import { CallMetadata } from '../server/instrumentation'

export type DispatcherScope = Dispatcher<any, any>;

export default class BrowserTypeDispatcher extends BrowserType {
  _attemptToGracefullyCloseBrowser(transport: any): void {
    throw new Error('Method not implemented.')
  }
  constructor(scope: DispatcherScope, browserType: any) {
    super('chromium', { rootSdkObject: { attribution: {} } })
  }
}
