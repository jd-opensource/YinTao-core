export function startRemoteServer(port) {

    const express = require('express')
    const bodyParser = require('body-parser')
    const multiparty = require("multiparty");
    const server = express()
    const jsonParser = bodyParser.json()
  
    const logP = new Promise((resolve,reject)=>{
      const out =  setTimeout(() => {req(false)}, 10000);
      server.post('/log', jsonParser, (req, res) => {
        console.log('日志上报:')
        var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
          console.log('日志内容解析', fields, files, ' fields2')
          if (err) {
            console.log('日志解析出错:', err)
          }
          res.send('log ok');
        })
        resolve(true)
        clearTimeout(out)
      })
  
    })
    
    const resultP = new Promise((resolve, reject) => {
      const out = setTimeout(() => {req(false)}, 10000);
      server.post('/result', jsonParser, (req, res) => {
        console.log('执行结果上报:', JSON.stringify(req.body))
        resolve(true)
        clearTimeout(out)
        res.send('result ok');
      });
    })
  
  
    const imgP = new Promise((resolve, reject) => {
      const out = setTimeout(() => {req(false)}, 10000);
      server.post('/img', jsonParser, (req, res) => {
        console.log('文件名称', req.body.name, '文件长度', req.body.image.length)
        res.send('img ok');
        resolve(true)
        clearTimeout(out)
      });
    })
  
    server.listen(port)
    return Promise.all([logP,resultP,imgP])
  }
  