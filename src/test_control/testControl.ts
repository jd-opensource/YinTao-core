import {
  Browser, BrowserContext, Page, Frame,
} from 'playwright'

export default class TestControl {
  runContext: Page | Frame | undefined
  browserContext: BrowserContext | undefined
  currentPage: Page | undefined
  browser: Browser
  id: string
  constructor(id: string, browser: Browser) {
    this.id = id
    this.browser = browser
  }

  setBrowserContext(context: BrowserContext) {
    this.browserContext = context
  }

  updateContext(context: Page | Frame) {
    this.runContext = context
  }

  updatePage(page: Page) {
    this.currentPage = page
  }
}
