await page.to("http://ack.jd.com/#/dataPlane/record/chart?parent_id=a0dbf82b-aaa5-48e2-87ea-3f0b2757dab1&task_id=746673&module_id=5d7a8cbb-887a-4d25-9d6d-8bea50d0f686&running_state=1&begin=1675309686&end=1675310049")
await sleep(5000)
await dom.screenshot('#main-chart',{path:'ack.jpg',fullPage:true})

console.log("页面全图测试")