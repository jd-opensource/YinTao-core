await page.create(`https://4399.com`)
await sleep(1000)
await cookies("setAll","http://t.268xue.com","sname=1114802403%40qq.com; sid=f45f195ab2154eaca9be3a71e80dd7e8; stime=1645079872643; Hm_lvt_f9174a438ce90af0345a8e670f502461=1645153048,1645153052,1645153054,1646797251; JSESSIONID=7CB8AD671DD3D6E5FECE911CD70432E2; Hm_lpvt_f9174a438ce90af0345a8e670f502461=1646798200")
await page.to(`http://t.268xue.com/`)

await cookies('set',[{
    url:'http://t.268xue.com',
    domain:'t.268xue.com',
    name: 'nihao',
    value:'7788'
}])
await sleep(3000)
