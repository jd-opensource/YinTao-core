await page.create(`https://baidu.com`)
await page.change(0)
await page.to(`http://ybfw-t.jd.com/ownerAccount/serviceProder/list`)

await dom.set(`zhouyan100`,`#username`)
await dom.set(`xinxibu456`,`#password`)

await dom.click(`#formsubmitButton`)

await dom.click(`(//*[string()='新 增'])[2]`)
await sleep(`1000`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/input[1]`)
// await dom.click(`(//*[string()='延保双服务商供货价'])[18]`)
await dom.click('//html//body//div[5]//div[1]//div[1]//ul//li[1]//span')

// await assert.custom(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/input[1]`,`延保双服务商供货价`,`innerText`,2)
// await sleep(`1000`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[2]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`3`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[2]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`2`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[2]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[3]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`3`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[3]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`2`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[3]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[4]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`3`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[4]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`2`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[4]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[5]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`3`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[5]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`2`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[5]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[6]/div[1]/div[1]/div[1]/div[1]/input[1]`)
// await dom.click(`(//*[string()='固定比例'])[16]`)
await dom.click(`//html//body//div[6]//div[1]//div[1]//ul//li[2]//span`)

await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[7]/div[1]/div[1]/div[1]/input[1]`)
await dom.set(`1`,`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[1]/div[7]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[2]/div[1]/div[1]/div[1]/div[1]/input[1]`)
await dom.set('2022-03-10',`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[2]/div[1]/div[1]/div[1]/div[1]/input[1]`)
await dom.click(`//body/div[3]/div[1]/div[2]/div[1]/div[1]/form[1]/div[2]/div[2]/div[1]/div[1]/div[1]/input[1]`)
await dom.set('2022-03-10',`body > div.el-dialog__wrapper > div > div.el-dialog__body > div > div > form > div:nth-child(2) > div:nth-child(2) > div > div > div > input`)
// await dom.click(`//*[string()='31']`)
await dom.click(`(//*[string()='确 定'])[2]`)
await sleep(`2000`)