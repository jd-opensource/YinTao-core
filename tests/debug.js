await page.setDevice('iPhone 11')
await sleep(1000)
//jimitest1
await cookies.set([{
    "path":"/",
    "name":"AAJkm4zVADBgZFCl_iRvm9sRujooPpxvWTF3GeGmbZbloH3R_AS1leex8F18qOrPtN2VLGdyEr4",
    "domain":".jd.com"
},{
   "path":"/",
   "name":"pt_pin",
   "value":"jimitest1",
   "domain":".jd.com"
},{
   "path":"/",
   "name":"pt_token",
   "value":"9fsbbuzv",
   "domain":".jd.com"
}])
await sleep(1000) 
await page.to("https://allbuy.m.jd.com/#/?suitId=200526001&skuId=100035718864")
await page.screenshot('jietu.png')
await sleep(2000)