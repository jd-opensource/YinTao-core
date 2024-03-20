import { run } from '../../lib/run'
import {startRemoteServer} from './report_server'

test('视频执行上报测试', async () => {
  const port = 9898
  const all = startRemoteServer(port)
  const testCode = `
  await page.to("https://baidu.com",{timeout:30000})
console.log("打开了百度")
await sleep(3000)
  `
  await run(testCode,{
    audio:{
        url:`http://localhost:${port}/log`
    },
  });

  all.then(([log,result,img])=>{
    console.log(log)
  })
},60000)