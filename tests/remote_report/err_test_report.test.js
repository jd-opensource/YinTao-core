import { run } from '../../lib/run'
import {startRemoteServer} from './report_server'

test('脚本内容错误,服务远程异常上报', async () => {
  const port = 9897
  const all = startRemoteServer(port)

  const testCode = "await page.create(`https://baidu.com`);await page.screenshot('test-2.jpg');sadhaskdjh();\nawait page.change(0)\nawait dom.click(`#kw`)\nawait dom.set(`j`,`#kw`)\nawait dom.set(`d`,`#kw`)\nawait dom.click(`#su`)\nawait dom.click(`(//*[string()='京东JD.COM官网 多快好省 只为品质生活'])[1]`)\nawait page.change(1)\nawait dom.click(`(//*[contains(text(),'PLUS会员')])[1]`)\nawait page.change(2)\nawait dom.click(`(//*[string()='账户登录'])[1]`)\n\n await asyncReport(17191) \n"
  await run(testCode,{
    remoteReport:{
      result:`http://localhost:${port}/result`,
      log:`http://localhost:${port}/log`,
      image: `http://localhost:${port}/img`
    },
  });

  console.log('获取执行结果11')
  const [log,result,img] = await all
  console.log('获取执行结果')
  if(!log) {
    expect(log).toBe(true)
  }
  if(!result) {
    expect(result).toBe(true)
  }
  if(!img) {
    expect(img).toBe(true)
  }
},10000)