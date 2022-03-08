/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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

import { CRSession, CRSessionEvents } from '../server/chromium/crConnection'
import * as channels from '../protocol/channels'
import { Dispatcher, DispatcherScope } from './dispatcher'

export const _a = 0
export class CDPSessionDispatcher extends Dispatcher<CRSession, channels.CDPSessionChannel> implements channels.CDPSessionChannel {
  _type_CDPSession = true

  constructor(scope: DispatcherScope, crSession: CRSession) {
    super(scope, crSession, 'CDPSession', {}, true)
    crSession._eventListener = (method, params) => {
      this._dispatchEvent('event', { method, params })
    }
    crSession.on(CRSessionEvents.Disconnected, () => this._dispose())
  }

  async send(params: channels.CDPSessionSendParams): Promise<channels.CDPSessionSendResult> {
    return { result: await this._object.send(params.method as any, params.params) }
  }

  async detach(): Promise<void> {
    return this._object.detach()
  }
}
