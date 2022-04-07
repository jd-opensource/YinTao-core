await page.create(`https://jxsaas-pre.jd.com/login`)

const [res1,res2] = await Promise.all([
    // Waits for the next request matching some conditions
    page.waitForResponse(response => response.url().includes('/ajax/websiteProfile/online.json') && response.status() === 200),
    page.waitForResponse(response => response.url().includes('article/getImportantArtile.json') && response.status() === 200),
    // Triggers the request
    page.to(`http://t.268xue.com/`)
]);

console.log('response',res1.url(),res2.url())
if(res1) { // 如果存在则代表是200
    throw new Error('接口错误：' + res1.url())
}

await sleep(3000)