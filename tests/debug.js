
// Go to https://www.baidu.com/
await page.to('https://www.baidu.com/');

// Click input[name="wd"]
await dom.click('input[name="wd"]');

// Fill input[name="wd"]
await dom.fill('input[name="wd"]','你好');

// Click text=百度一下
await dom.click('text=百度一下');

// Click input[name="wd"]
await dom.click('input[name="wd"]');

// Fill input[name="wd"]
await dom.fill('input[name="wd"]','你好撒广大工会');

// Click text=百度一下
await dom.click('text=百度一下')

// Click input[name="wd"]
await dom.click('input[name="wd"]');

// Fill input[name="wd"]
await dom.fill('input[name="wd"]','你好撒广大工会很大石达开');

// Click text=百度一下
await dom.click('text=百度一下')

// Click text=资讯
await dom.click('text=资讯');

await sleep(3000)