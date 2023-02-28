await cookies.setAll("https://hospital-beta01.healthjd.com/pethospital/first/housekeeper","__jdv=98075014%7Cdirect%7C-%7Cnone%7C-%7C1677067243864; __jdc=98075014; mba_muid=1677067243863788129595; pt_key=AAJj9gQKADBqfqyh2oqz1NoyW_aRYUbc_RkA4FuVPAdm209JtbYZpoWagVlZwNcvYukDgue4TMo; pt_pin=jd_71016da8d4de3; pt_token=y6pslbrq; pwdt_id=jd_71016da8d4de3; sfstoken=tk01mc6c91c89a8sM3gyKzJibVhLzQ/ryo6SRDD7hM3mCuc7um2kxU3H7P0NHewwyboacPNIaimMtBE3U/oeCdf0ns1A; __jda=98075014.1677067243863788129595.1677067243.1677116674.1677122503.3")
await page.setDevice("iPhone 11")

await page.setDevice("iPhone 11")
await page.to("https://hospital-beta01.healthjd.com/pethospital/inquiry/im?drugskuId=1963086")
// await sleep(2000)
//同一个sku进行中订单只能有一单 之前下过一单后会直接进入待接诊页
if(!await dom.exist(".doctorAssign-status__text")) {
    console.log("进入预问诊页======")
    //进入预问诊页
    //顶部标签
    await assert.custom(".new-pet-tipcard","innerText","null",1)
    console.log("标签验证======")
    //顶部副标题1
    await assert.custom(":nth-child(1) > .tip-text","innerText","24小时在线",0)
    //顶部副标题2
    await assert.custom(":nth-child(2) > .tip-text","innerText","国家认证执业医生",0)
    //顶部副标题3
    await assert.custom(":nth-child(3) > .tip-text","innerText","累计帮助宠物",2)
    //评论轮播
    await assert.custom(":nth-child(23) > .swiper-text","innerText","null",1)
    //导致语1
    await assert.custom(".text","innerText","Hi，宠主您好~ 爱宠健康问题，京东宠物医生帮您解决\n\n请详细描述您爱宠遇到的问题，方便为您优选合适的宠物医生",0)
     console.log("历史病情验证======")
    //历史病情
    await assert.custom(".inner-text > span","innerText","历史病情",0)
    //历史病情内容
    await assert.custom(":nth-child(2) > .inner > span","innerText","null",1)
    console.log("开始输入主诉======")
    //输入病情提单
    await dom.click("#socket-chatInput")
    await dom.fill("#socket-chatInput","测试1")
    await dom.click("button:has-text(\"发送\")")
    await sleep(1000)
}

// //待接诊页面-状态显示
// await assert.custom(".doctorAssign-status__text","innerText","待接单",0)
// //待接诊页面-顶部退单说明
// await assert.custom(".header > p","innerText","24小时未接单自动退",0)
// //待接诊页面-联系客服
// await assert.custom(".kefu","innerText","联系客服",0)
// //待接诊页面-主诉卡片 宠物昵称
// await assert.custom(".info","innerText","匿名用户",0)
// //待接诊页面-问题描述标题
// await assert.custom(".title","innerText","问题描述:",0)
// //待接诊页面-问题描述具体内容
// await assert.custom(".content > :nth-child(2)","innerText","null",1)
// //待接诊页面-公众号引导卡片标题
// await assert.custom(".card-title","innerText","关注微信公众号，不错过医生回复",0)
// //待接诊页面-公众号引导卡片内容文案
// await assert.custom(".card-tips","innerText","点击复制微信搜索关注公众号接收医生消息",0)
// //待接诊页面-公众号引导卡片复制文案
// await assert.custom(".card-click","innerText","京东健康宠物医院【点击复制】",0)
// await sleep(2000)
// //待接诊页面-用户等待较长时间提醒
// await assert.custom(".tips","innerText","医生马上赶来…\n当前咨询用户较多，医生利用空闲时间接诊，请稍事等待。",0)





await page.setDevice("iPhone 7 Plus")
await page.setBrowserCofing({hasTouch:true})
await page.to("https://hospital-beta01.healthjd.com/pethospital/inquiry/im?skuList=%5B%7B%22skuId%22%3A100014130287,%22drugNum%22%3A5%7D%5D")
await sleep(3000)
await page.setViewSize(400,700)
//预问诊页顶部标题
await assert.custom(":nth-child(2) > .text","innerText","认证宠医 1V1 在线专业服务",0)
//预问诊页累计帮助宠物
await assert.custom(".num","innerText","null",1)
//预问诊页顶部标签1
await assert.custom(".pet-tipcard > .content > :nth-child(1)","innerText","咨询宠物营养",0)
//预问诊页顶部标签2
await assert.custom(".content > :nth-child(2)","innerText","咨询宠物健康",0)
//预问诊页顶部标签3
await assert.custom(".content > :nth-child(3)","innerText","咨询宠物行为",0)
//导诊语1
await assert.custom(".content > .text","innerText","您好，我是您本次咨询的AI购药助理，请详细描述您的爱宠遇到的问题（如症状、疾病、患病时长、服用药品等），以便为您匹配合适的医生开具处方",0)
//历史病情
await assert.custom(".inner-text > span","innerText","历史病情",0)
//点击历史病情发送到预问诊页
await dom.click("text=测试转诊")
//导诊语2
await assert.custom(":nth-child(5) > .user-message--left > .message-wrapper > .content > .text","innerText","请仔细填写爱宠信息，这对医生诊疗判断非常重要",0)
//选择宠物档案列表标题展示
await sleep(3000)
await assert.custom(".text-choose","innerText","请选择宠物",0)
await sleep(3000)
//选择宠物档案列表新增档案入口展示
await assert.custom(".text-add","innerText","＋新建档案",0)
//选择宠物档案列表档案昵称展示
await assert.custom(":nth-child(1) > .info > .name","innerText","null",1)
//选择宠物档案列表档案性别展示
await assert.custom(":nth-child(1) > .info > .sex","innerText","null",1)
//选择宠物档案发送至预问诊页
await dom.click("img >> nth=0")
//导诊语3
await assert.custom(":nth-child(7) > .user-message--left > .message-wrapper > .content > .text","innerText","为保障您爱宠的生命安全，请您务必如实确认爱宠的体重（kg），这将直接影响到开具药品的用量用法以及合理性",0)
await sleep(1000)
//键盘操作输入体重
await dom.tap("//div[text()='1']")
console.log("键盘数字点击操作执行完成")
await sleep(1000)
await dom.tap("//div[text()='完成']")
console.log("键盘数字点击操作执行完成")
await sleep(10000)
await assert.custom(".template-message > .message-wrapper","innerText","免费问诊开方",0)
console.log("更改档案")
await dom.click("text=点击修改")
await sleep(10000)
await dom.click("text=点击修改")
//点击新建档案弹出新建档案浮层
await dom.click("text=＋新建档案")
await assert.custom(":nth-child(1) > .van-cell__title > span","innerText","宠物昵称",0)
await assert.custom(".custom-title","innerText","爱宠性别",0)
await assert.custom(":nth-child(1) > .van-radio__label","innerText","弟弟",0)
await assert.custom(":nth-child(2) > .van-radio__label","innerText","妹妹",0)
await assert.custom(":nth-child(3) > .van-radio__label","innerText","性别未知",0)
await assert.custom(":nth-child(3) > .van-cell__title > span","innerText","出生日期",0)
await assert.custom(":nth-child(4) > .van-cell__title","innerText","爱宠品种",0)
await assert.custom(":nth-child(5) > .van-cell__title > span","innerText","宠物体重",0)
await assert.custom(".van-button","innerText","发送",0)
//关闭新建档案浮层
await dom.click(".van-action-sheet__header > i")
//选择档案发送至预问诊页
await dom.click(":nth-child(2) > .info > .name")
await sleep(1000)
await dom.tap("//div[text()='1']",{force:true})
console.log("键盘数字点击操作执行完成2")
await sleep(1000)
await dom.tap("//div[text()='完成']",{force:true})
console.log("键盘数字点击操作执行完成2")
await sleep(1000)
await dom.click("text=免费问诊开方")
await sleep(2000)
//待接诊页面-状态显示
await assert.custom(".doctorAssign-status__text","innerText","待接单",0)
//待接诊页面-顶部退单说明
await assert.custom(".header > p","innerText","24小时未接单自动退",0)
//待接诊页面-联系客服
await assert.custom(".kefu","innerText","联系客服",0)
//待接诊页面-主诉卡片 宠物昵称
await assert.custom(".info","innerText","匿名用户",0)
//待接诊页面-问题描述标题
await assert.custom(".title","innerText","问题描述:",0)
//待接诊页面-问题描述具体内容
await assert.custom(".content > :nth-child(2)","innerText","null",1)
await sleep(20000)
//待接诊页面-用户等待较长时间提醒
await assert.custom(".tips","innerText","医生马上赶来…\n当前咨询用户较多，医生利用空闲时间接诊，请稍事等待。",0)
