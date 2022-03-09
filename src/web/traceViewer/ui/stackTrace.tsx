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

import * as React from 'react';
import './stackTrace.css';
import { ActionTraceEvent } from '../../../server/trace/common/traceEvents';

export const StackTraceView: React.FunctionComponent<{
  action: ActionTraceEvent | undefined,
  selectedFrame: number,
  setSelectedFrame: (index: number) => void
}> = ({ action, setSelectedFrame, selectedFrame }) => {
  const frames = action?.metadata.stack || [];
  return <div className='stack-trace'>{
    frames.map((frame, index) => {
      // Windows frames are E:\path\to\file
      const pathSep = frame.file[1] === ':' ? '\\' : '/';
      return <div
        key={index}
        className={'stack-trace-frame' + (selectedFrame === index ? ' selected' : '')}
        onClick={() => {
          setSelectedFrame(index);
        }}
      >
        <span className='stack-trace-frame-function'>
          {frame.function || '(anonymous)'}
        </span>
        <span className='stack-trace-frame-location'>
          {frame.file.split(pathSep).pop()}
        </span>
        <span className='stack-trace-frame-line'>
          {':' + frame.line}
        </span>
      </div>;
    })
  }
  </div>;
};
