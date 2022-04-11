await page.setDevice('iPhone 12 Pro')
await page.to("https://baidu.com")
await cookies("set",[{
  "domain": ".jd.com",
  "name": "pt_key",
  "path": "/",
  "value": "AAJiRrMDADC4YyVnFW1xXf5HHkQf2LQD4qYLF2uThSYqL8YcKjrDKI-yg7As2Ml8TkEp0WKrsxc",
}])
await page.to("https://jstp.m.jd.com/device/list")
await dom.click("(//*[string()='海尔（Haier） 台式 洗衣机'])[1]/parent::div//span")

// await dom.click("text=删除设备")
await sleep(200000) 