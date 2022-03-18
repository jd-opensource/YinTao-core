const index = require('../lib/live/index')

test('open baidu', async () => {
    index.apiLive('https://www.baidu.com',{callback:(msg)=>{
        console.log(msg)
    }})
})