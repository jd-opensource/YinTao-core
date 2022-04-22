// 通用登录
await page.to(`https://jxi-fuli.jd.com/login.html`)
await page.create('https://baidu.com')
await page.create('http://4399.com')

await sleep(2000)
await page.change(0)

await sleep(2000)
await page.change("4399")

await sleep(2000)
await page.change('baidu.com')

await sleep(2000)
await page.change('/login.html')

await sleep(2000)
