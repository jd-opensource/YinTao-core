const homePage = "https://4399.com" // 定义变量
await page.create(homePage) // 使用变量打开页面
await sleep(1000) // 固定等待
await page.to(`https://baidu.com`) // 切换页面
await assert.custom("#su","value","百度一下",0) // 页面元素断言
await assert.location("https://www.baidu.com/") // 页面地址断言
await assert.all("百度一下，你就知道") 
await assert.title("百度一下，你就知道") // 页面title 断言
// 执行hover
await dom.hover(`#s-top-left > div > a`) // hover 元素
await dom.click(`#kw`) // 元素点击
if (await dom.exist(`#kw`)){ // 根据元素是否存在，接入逻辑分支
    console.log("元素#kw存在")
}else{
    console.log("元素不存在")
    throw new Error("因为元素未找到,主动结束执行!") // 主动抛出错误
}

const roundNum = Math.round(Math.random()*1000) // 随机获取1-1000 之间的数
const name = "名称" +  roundNum // 字符串组合

await dom.fill(`#kw`,name) // input 输入文本
await sleep(2000)

await dom.click(`#su`)
await page.screenshot("test-1.jpg") // 屏幕截图
await sleep(1000)
// 测试上传
await page.to(`https://element.eleme.cn/#/zh-CN/component/upload`, {waitUntil:'commit'}) // 页面跳转
// 截图上传
await dom.upload(`#app > div.main-cnt > div > div.el-scrollbar__wrap > div > div > div.page-component__content > section > div:nth-child(4) > div.source > div > div > div.el-upload.el-upload--text > input`,`C:\\Users\\zhouyuan11\\AppData\\Local\\Programs\\cherry_driver\\cherry_tray@2x.png`)

await sleep(1000)