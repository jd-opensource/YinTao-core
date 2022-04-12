await page.to(`https://baidu.com`) // 切换页面

console.log('CSS selector ',await dom.exist("input:has-text(\"百度一下\")"))
console.log('selector ',await dom.exist("#su"))
console.log('N-th element selector ', await dom.exist("#s-top-left >> text=贴吧"))
console.log('xpath ',await dom.exist(`//*[@id="su"]`))
console.log('fill xpath ',await dom.exist('/html/body/div[1]/div[1]/div[5]/div/div/form/span[2]/input'))


