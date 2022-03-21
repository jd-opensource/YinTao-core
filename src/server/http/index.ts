import { serviceImpl } from './serverImpl'
// import express from 'express' // 尝试es引入
const express = require('express')

const httpserver = express()
const bodyParser = require('body-parser')
const { app } = require('electron')

export interface Ret {
  success?: boolean
  data?: any
  msg?: string
  code?: number
  total?: number
}

httpserver.use(bodyParser.urlencoded({ extended: false }))
httpserver.use(bodyParser.json())

export const httpControlServer = function (port: number) {
  const server = httpserver.listen(port)
  console.log(`http listening on *:${port}`)
  server.on('error', (err:any) => {
    if (err.code === 'EADDRINUSE') { // 端口已经被使用
      /**
       * 当端口被占用时，不要采用dialog弹窗，
       * 采用node-notifier 试试(todo: 需要测试,以及先修复服务二次执行问题)
       */
      console.log('The port is occupied.', port)
      app.exit()
    }
  })

  httpserver.get('/ping', serviceImpl.ping)
  httpserver.get('/browsers', serviceImpl.getBrowsers)
  httpserver.post('/run', serviceImpl.runScript)
}

export default httpControlServer
