await page.to(`https://element.eleme.cn/#/zh-CN/component/upload`, {waitUntil:'commit'})
// https://storage.360buyimg.com/assert/zi.jpg
await dom.upload(`#app > div.main-cnt > div > div.el-scrollbar__wrap > div > div > div.page-component__content > section > div:nth-child(4) > div.source > div > div > div.el-upload.el-upload--text > input`,'https://storage.360buyimg.com/assert/zi.jpg')
await sleep(2000)