await page.to(`https://baidu.com`) // 切换页面

try {
    await dom.click("#sadlja")
} catch (error) {
    errorSend("执行错误")
}
console.log("继续执行了")
await assert.custom("#su","value","百度一下",0) // 页面元素断言
await assert.location("https://www.baidu.com/") // 页面地址断言
await assert.all("百度一下，你就知道") 
await assert.title("百度一下，你就知道") // 页面title 断言