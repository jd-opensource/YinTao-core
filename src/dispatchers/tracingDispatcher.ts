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

import * as channels from '../protocol/channels'
import { Tracing } from '../server/trace/recorder/tracing'
import { ArtifactDispatcher } from './artifactDispatcher'
import { Dispatcher, DispatcherScope, existingDispatcher } from './dispatcher'

export const _a = 0
export class TracingDispatcher extends Dispatcher<Tracing, channels.TracingChannel> implements channels.TracingChannel {
  _type_Tracing = true

  static from(scope: DispatcherScope, tracing: Tracing): TracingDispatcher {
    const result = existingDispatcher<TracingDispatcher>(tracing)
    return result || new TracingDispatcher(scope, tracing)
  }

  constructor(scope: DispatcherScope, tracing: Tracing) {
    super(scope, tracing, 'Tracing', {}, true)
    tracing.on(Tracing.Events.Dispose, () => this._dispose())
  }

  async tracingStart(params: channels.TracingTracingStartParams): Promise<channels.TracingTracingStartResult> {
    await this._object.start(params)
  }

  async tracingStartChunk(params: channels.TracingTracingStartChunkParams): Promise<channels.TracingTracingStartChunkResult> {
    await this._object.startChunk(params)
  }

  async tracingStopChunk(params: channels.TracingTracingStopChunkParams): Promise<channels.TracingTracingStopChunkResult> {
    const { artifact, sourceEntries } = await this._object.stopChunk(params)
    return { artifact: artifact ? new ArtifactDispatcher(this._scope, artifact) : undefined, sourceEntries }
  }

  async tracingStop(params: channels.TracingTracingStopParams): Promise<channels.TracingTracingStopResult> {
    await this._object.stop()
  }
}
