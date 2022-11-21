try{
await page.to("http://baidu.com/")
    await dom.errorSend('用例设置为失败，继续执行')
    await asyncReport()
    
}catch(e){
    console.log("***",e.name)
}
    