
await page.create(`https://baidu.com`)
await cookies("set",[{
    "domain": ".jd.com",
    "path": "/",
    "name": "sso.jd.com",
    "value": "BJ.0C006D078F6B8EB37A37777AD9EBF9BF9020220330165135",
  }])
await page.to(`http://jingxiao.jd.com`)
await sleep(300000)
await dom.click(`(//*[string()='推荐'])[3]`)
await dom.click(`(//*[string()='离线大盘'])[3]`)