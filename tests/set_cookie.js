await cookies("setAll","http://t.268xue.com","Cookie: Hm_lvt_82e4e7ee710352006706ff97d0af3fa6=1649310601; Qs_lvt_52908=1649310601; sname=1114802403%40qq.com; Hm_lpvt_82e4e7ee710352006706ff97d0af3fa6=1649310699; Qs_pv_52908=2682713997207809000%2C3041423038468154400; Hm_lvt_f9174a438ce90af0345a8e670f502461=1648087757,1649299281; JSESSIONID=797E6AFA624E58607E68CE9F8A441FC3; sid=b9315724edca4b76a605a220309caf2f; stime=1650268262806; Hm_lpvt_f9174a438ce90af0345a8e670f502461=1650268264")

await cookies('set',[{
    "url":"http://t.268xue.com",
    "name":"sid",
    "value":"b9315724edca4b76a605a220309caf2f"
}])
await page.to(`http://t.268xue.com/`)

await sleep(2000)
