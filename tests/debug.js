// 跨平台截图测试
await page.create(`https://jxsaas-pre.jd.com/login`);
console.log('os', os.tmpdir() + '\\'+ 'nihao.jpg')
await sleep(2000);

await page.screenshot(os.tmpdir() + '\\'+ 'nihao.jpg')
