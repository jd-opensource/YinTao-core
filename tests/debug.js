await page.setDevice('iPhone 11')
await page.to("https://card.m.jd.com/")
await dom.click("text=账号密码登录333")
console.log('nihao')
await dom.click("[placeholder=\"用户名\\/邮箱\\/手机号\"]")

console.log('nihao  日志内容222')
await dom.fill("[placeholder=\"用户名\\/邮箱\\/手机号\"]","ji mi test")
// await page.screenshot("nihao.jpg")
// await sleep(2000)

await page.screenshot('nihao.jpg') 

// throw new Error("自定义出错")





// await keyboard.press('Enter')
// await dom.fill("[placeholder=\"用户名\\/邮箱\\/手机号\"]","jimitest1")
// await dom.click("[placeholder=\"请输入密码\"]")
// await dom.fill("[placeholder=\"请输入密码\"]","ai360buy")
// await dom.click("input[type=\"checkbox\"]")
// await dom.click("text=登 录")
// await sleep(1000) 
// await page.to("https://card.m.jd.com/")
// await sleep(1000) 
// // await dom.click("[placeholder=\"请输入6-999区间的数字\"]")
// await dom.click(`//*[@id="root-virtual"]/div/div[1]/div[1]/div[3]/div[2]/input`)
// await sleep(1000)
// await dom.set(`51`,`//*[@id="root-virtual"]/div/div[1]/div[1]/div[3]/div[2]/input`)
// await sleep(1000) 
// await dom.tap('//*[@id="root-virtual"]/div/div[1]/div[1]/div[5]/div/div[1]/div[1]/div',{force:true})
// // await dom.click('')
// await sleep(1000000)
// await dom.click("text=¥51.00")