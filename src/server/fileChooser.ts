/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ElementHandle } from './dom'
import { Page } from './page'

export const _a = 0
export class FileChooser {
  private _page: Page
  private _elementHandle: ElementHandle
  private _isMultiple: boolean

  constructor(page: Page, elementHandle: ElementHandle, isMultiple: boolean) {
    this._page = page
    this._elementHandle = elementHandle
    this._isMultiple = isMultiple
  }

  element(): ElementHandle {
    return this._elementHandle
  }

  isMultiple(): boolean {
    return this._isMultiple
  }

  page(): Page {
    return this._page
  }
}
