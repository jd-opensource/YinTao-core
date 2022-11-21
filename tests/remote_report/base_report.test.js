import { run } from '../../lib/run'
import {startRemoteServer} from './report_server'

test('基本测试服务远程上报', async () => {
  const port = 9898
  const all = startRemoteServer(port)
  const testCode = `
  await page.to("https://baidu.com",{timeout:30000})
console.log("打开了百度")
await sleep(3000)
  `
  await run(testCode,{
    remoteReport:{
      result:`http://localhost:${port}/result`,
      log:`http://localhost:${port}/log`,
      image: `http://localhost:${port}/img`
    },
  });

  all.then(([log,result,img])=>{
    if(!log) {
      expect(log).toBe(true)
    }
    if(!result) {
      expect(result).toBe(true)
    }
    if(!img) {
      expect(img).toBe(true)
    }
  })
},60000)