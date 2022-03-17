const { SingleEntryPlugin } = require("webpack")

await page.create(`https://baidu.com`)
await page.change(0)
await assert.custom("#su","inputValue","百度一下",0)