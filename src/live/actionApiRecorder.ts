import { Page } from "../client/page";
import { Response, Request } from "../../types/types";
import { Action, actionTitle } from "../server/supplements/recorder/recorderActions";

type ApiItem = {
    url?: string,
    request?: {
        headers: { [key: string]: string; },
        method: string,
        postData: null | string,
        params?: any,
    }
    response?: {
        headers: { [key: string]: string; },
        status: number,
        text: string,
    },
    page: ApiPage
};
type ApiPage = {
    url: string,
    action?: string,
    title: string
}

export class ApiRecorder {
    private _lastPage
    private _lastAction
    private _apis: ApiItem[] = []
    private _callback: (apiItem: ApiItem) => void
    constructor(opts: any) {
        opts = opts || {}
        if (opts.callback)
            this._callback = opts.callback
        else
            this._callback = (apiItem: ApiItem) => { console.log(apiItem) }
    }

    setLastAction(action: Action) {
        if (this._lastPage) {
            if (action.name === 'closePage')
                return
            this._lastAction = actionTitle(action)
            this._lastPage.action = this._lastAction
        }
    }

    async apiProxy(response: Response) {
        const _r: Request = response.request()
        if (_r.resourceType() == 'xhr' || _r.resourceType() == 'fetch') {
            const responseCode: number = response.status()
            if (responseCode == 301 || responseCode == 302)
                return
            const { pureUrl, urlParams } = this.parseArgs(_r.url())

            const apiItem: ApiItem = {
                request: {
                    headers: await _r.allHeaders(),
                    method: _r.method(),
                    params: urlParams,
                    postData: _r.postData(),
                },
                response: {
                    headers: await response.allHeaders(),
                    status: responseCode,
                    text: await response.text(),
                },
                page: this._lastPage,
                url: pureUrl
            }

            this._callback(apiItem)

            this._apis.push(apiItem)
        }
    }
    /**
     * page是最新的page，action在跳页情况下是上一个page的元素上的action
     * @param contextPage 
     */
    async handlePage(contextPage: Page) {
        this._lastPage = await this.buildLastPage(contextPage)

        contextPage.on('response', async (response: Response) => {
            try {
                await this.apiProxy(response)
            } catch (error) {
                console.log(error)
            }
        })
        contextPage.on('domcontentloaded', async (page: Page) => {
            this._lastPage = await this.buildLastPage(page)
        })
        //url变化监听
        // contextPage.on('framenavigated', async (frame: Frame) => {
        //     this._lastPage = await this.buildLastPage(frame)
        // })
    }

    async getApis() {
        return this._apis
    }

<<<<<<< HEAD
    async buildLastPage(page: Page) {
        let pageTitle
        try {
            pageTitle = await page.title()
        } catch (error) {
            pageTitle = 'error'
            console.log(error)
        }

=======
    async buildLastPage(pageOrFrame: Page){
>>>>>>> master
        let lastPage: ApiPage = {
            // screenshot: await contextPage.base64_screenshot(),
            title: pageTitle,
            url: page.url()
        }

        if (this._lastAction) {
            lastPage.action = this._lastAction
        }

        return lastPage
    }

    parseArgs(urlStr: string) {
        const myUrl = new URL(urlStr)
        const quoteIndex: number = myUrl.href.indexOf('?')
        let pureUrl = myUrl.href
        if (quoteIndex > 0) {
            pureUrl = myUrl.href.substring(0, quoteIndex)
        }

        const urlParams = Object.fromEntries(myUrl.searchParams)
        return {
            pureUrl,
            urlParams
        }
    }
}
