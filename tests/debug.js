
// Go to https://www.baidu.com/
await page.to('http://t.268xue.com/');
await browser.on('request',(res)=>{
    console.log('url',res._initializer.url)
    // console.log('method',res._initializer.method)
    // console.log('headers',JSON.stringify(res._initializer.headers))
})

// 修改png图片
await browser.route('**/*.{png}',(route)=>{
    console.log('route',route)
    route.continue({url:'http://storage.360buyimg.com/assert/icon.png'});
})

await page.to('http://t.268xue.com/');

await sleep(30000)
