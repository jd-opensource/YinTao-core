await page.create(`https://4399.com`)
await page.to(`https://baidu.com`)
await page.change(0)
// 执行hover
await dom.hover(`#s-top-left > div > a`)
await dom.click(`#kw`)
console.log("kw 存在吗",await dom.exist(`#kw`))
await dom.set(`123`,`#kw`)
await dom.click(`#su`)
await page.screenshot("test-1.jpg")
// 测试上传
await page.to(`https://element.eleme.cn/#/zh-CN/component/upload`, {waitUntil:'commit'})
await dom.upload(`#app > div.main-cnt > div > div.el-scrollbar__wrap > div > div > div.page-component__content > section > div:nth-child(4) > div.source > div > div > div.el-upload.el-upload--text > input`,`C:\\Users\\zhouyuan11\\AppData\\Local\\Programs\\cherry_driver\\cherry_tray@2x.png`)