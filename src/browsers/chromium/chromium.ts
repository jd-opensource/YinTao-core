import BrowserType from '../browserType'

export const kBrowserCloseMessageId = -9999

export default class Chromium extends BrowserType {
  _attemptToGracefullyCloseBrowser(transport: any): void {
    const message: any = { method: 'Browser.close', id: kBrowserCloseMessageId, params: {} }
    transport.send(message)
  }

  constructor(playwrightOptions: any) {
    super('chromium', playwrightOptions)
    // if (debugMode()) { this._devtools = this._createDevTools() }
  }
}
