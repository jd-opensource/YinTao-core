const { domainToASCII } = require("url")

try{
    console.log("***新增加命令")

    await page.to('http://www.baidu.com',{timeout: 100000})
}
catch(e){
        await dom.errorSend()
        console.log("活动类型-->互动试用: " + e.name + ": " + e.message)
        await  asyncReport()

}
try{
    console.log("****无新增加命令")

    await page1.to('http://www.baidu.com',{timeout: 100000})

}
catch(e){

        console.log("活动类型-->互动试用: " + e.name + ": " + e.message)
        await dom.errorSend()

        await  asyncReport()

}
try{
    console.log("***新增加命令2222")

    await page.to('http://www.baidu.com',{timeout: 100000})
}
catch(e){
        console.log("活动类型-->互动试用: " + e.name + ": " + e.message)
        await dom.errorSend()

        await  asyncReport()

}


    