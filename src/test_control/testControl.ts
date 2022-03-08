import { Browser, BrowserContext, Page } from '../../types/types'

export default class TestControl {
  currentContext: BrowserContext | undefined
  currentPage: Page | undefined
  browser: Browser
  id: string
  constructor(id: string, browser: Browser) {
    this.id = id
    this.browser = browser
  }

  updateContext(context: BrowserContext) {
    this.currentContext = context
  }

  updatePage(page: Page) {
    this.currentPage = page
  }
}
