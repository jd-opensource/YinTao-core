const { chromium } = require('playwright'); // 或者 'firefox' 或 'webkit'.

(async () => {

  const __sleep = (ms) => new Promise((res) => setTimeout(res, ms))


  const browser = await chromium.launch({
    headless: false, // 设置为false以便看到浏览器界面 （对视频录制来说可选）
  });

  const context = await browser.newContext({
    recordVideo:{
        dir: './videos/', // 视频的保存目录
        size: { width: 1280, height: 720 }, // 视频的分辨率
      }
  }); // 创建浏览器上下文
  let page = await context.newPage(); // 打开新页面
  let video = await page.video()


  //  切分视频需要  
  await page.goto('https://baidu.com'); // 导航到指定网址
  await __sleep(1000)
  console.log("等待视频另存为1")
  await page.close()
  await video.saveAs("./videos2/a.webm")
  console.log("等待视频另存为2")
  // await console.log(await page.video());

  const path = await video.path();
  // 读取文件内容, 进行文件上传，上传后删除文件内容   
  console.log(path)

  page = await context.newPage(); 
  video = await page.video()
  await page.goto("https://4399.com")
  await __sleep(1000)
  // 进行其他操作...
  await page.close()


  await video.saveAs("./videos3/b.webm")


  await page.close(); // 关闭页面


  //  只能在页面关闭时进行删除  
  await video.delete()

  await context.close(); // 关闭浏览器上下文
  await browser.close(); // 关闭浏览器
})();