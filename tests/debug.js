await page.setDevice("iPhone XR")
// await cookies.set([{
   //     \"path\":\"/\",
//     \"name\":\"pt_key\",
//     \"value\":\"AAJj1JBpADC2SJMhazfZ0xzm_tyEgkUap9MGdy3q2IPCAIplJXubFmo5MsWIxMhQzi83SeOsDt8\",
//     \"domain\":\".jd.com\"
// },{
   //    \"path\":\"/\",
//    \"name\":\"pt_pin\",
//    \"value\":\"839879175_m\",
//    \"domain\":\".jd.com\"
// },{
   //    \"path\":\"/\",
//    \"name\":\"pt_token\",
//    \"value\":\"1tp1asj3\",
//    \"domain\":\".jd.com\"   
// }])
await sleep(2000)
await page.to("https://prodev.m.jd.com/mall/active/2SHjzp4MaWn8m1Bvo7sYGsxNvZTK/index.html?brand=OPPO&model=PEEM00")
await sleep(2000)
// await dom.exist('精选配件')
// await dom.viewTo('精选配件')
//点击我的权益
// await dom.click('//*[@id=\"anchor-2\"]/div[4]/div[2]/div/div[1]/div[3]/div[3]')
// await sleep(2000)
// await dom.click('//*[@id=\"anchor-2\"]/div[4]/div[2]/div/div[1]/div[3]/div[2]')
// await sleep(2000)
// await dom.click('//*[@id=\"anchor-2\"]/div[4]/div[2]/div/div[2]/div/div/div[1]')
// await sleep(2000)
// await page.to(\"https://prodev.m.jd.com/mall/active/2SHjzp4MaWn8m1Bvo7sYGsxNvZTK/index.html?brand=OPPO&model=PEEM00\")
// await sleep(30000)
await page.screenshot("精选配件楼层.jpg")