import { Frame } from "../client/frame";
import { Page } from "../client/page";

type ApiItem = {
    url?: string,
    request?: {
        headers: string,
        method: string,
        postData: string,
    }
    response?: {
        headers: string,
        status: number,
        text: string,
    },
    page: ApiPage
};
type ApiPage = {
    screenshot: string,
    url: string,
    action?: ApiAction,
    title: string
}
export type ApiAction = {
    text: string,
    url: string
}

export class ApiRecorder {
    private _lastPage
    private _apis: ApiItem[] = []
    private _callback: (apiItem: ApiItem) => void
    constructor(opts: any) {
        opts = opts || {}
        if (opts.callback)
            this._callback = opts.callback
        else
            this._callback = (apiItem: ApiItem) => { console.log(apiItem) }
    }

    setLastAction(msg: ApiAction) {
        if (this._lastPage) {
            this._lastPage.action = msg
        }
    }

    async apiProxy(response) {
        const _r = response.request()
        if (_r.resourceType() == 'xhr' || _r.resourceType() == 'fetch') {
            const responseCode: number = response.status()
            if (responseCode == 301 || responseCode == 302)
                return
            const respHeaders = await response.allHeaders()
            const apiItem: ApiItem = {
                request: {
                    headers: JSON.stringify(_r.headers()),
                    method: _r.method(),
                    postData: _r.postData(),
                },
                response: {
                    headers: JSON.stringify(respHeaders),
                    status: responseCode,
                    text: await response.text(),
                },
                page: this._lastPage,
                url: _r.url()
            }

            this._callback(apiItem)

            this._apis.push(apiItem)
        }
    }

    async handlePage(contextPage: Page) {
        let page: ApiPage = {
            screenshot: await contextPage.base64_screenshot(),
            title: await contextPage.title(),
            url: contextPage.url()
        }
        this._lastPage = page

        contextPage.on('response', async response => {
            try {
                await this.apiProxy(response)
            } catch (error) {
                console.log(error)
            }
        })
        //url变化监听
        contextPage.on('framenavigated', async (frame: Frame) => {
            this._lastPage = {
                screenshot: await frame.page().base64_screenshot(),
                title: await frame.title(),
                url: frame.url()
            }
        })
    }

    async getApis() {
        return this._apis
    }
}




