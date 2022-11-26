import axios from 'axios'
import { ImgFile } from '../run'

const getImageType = (str) => {
  const reg = /\.(png|jpg|gif|jpeg|webp)$/
  return str.match(reg)[1]
}

const requestTimeout = 3000

/**
 * @method 远程报告运行结果
 */
export async function reportRunResult(url:string, result:any, storage?:any) {
  console.log("resultReport:", JSON.stringify(result))
  result.storage = storage
  await axios.post(
    url,
    result,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: requestTimeout,
    },
  ).then((res) => {
    if (res.status === 200) {
      console.log('reportRunResult success!')
    } else {
      console.log('reportRunResult error code')
    }
  }).catch((e: Error) => {
    console.log('reportRunResult catch error!', e.message, " report-url:", url)
    console.log("body: ", JSON.stringify(result))
  })
}

/**
 * @method 远程报告运行图片
 */
export async function reportRunImage(url:string, imgs: ImgFile[], storage?:any) {
  // 将要上传的图片
  console.log(`image upload count:`)

  console.log(`image upload count:${imgs.length}`)
  // imgs.map(async (img) => {
  //   console.log("img.buffer", img.buffer)
  //   if (Buffer.isBuffer(img.buffer) == false) {
  //     img.buffer = Buffer.from(img.buffer)
  //   }
  //   console.log(`begin upload`)

  //   const imgbase64 = `data: image/${getImageType(img.name)};base64,${img.buffer.toString('base64')}`
  //   // fs.writeFileSync("nihaottt.png",imgbase64)
  //   console.log(`upload image ${img.path} len:${imgbase64.length}`)
  //   await axios.post(
  //     url,
  //     {
  //       image: imgbase64,
  //       storage,
  //       name: img.name,
  //     },
  //     { timeout: requestTimeout },
  //   ).then((res) => {
  //     if (res.status === 200) {
  //       console.log('reportRunImage success!')
  //     } else {
  //       console.log('reportRunImage error code')
  //     }
  //   })
  //     .catch((e: Error) => {
  //       console.log('reportRunImage error!', e.message, " image-url:", url)
  //     })
  // })
}

/**
 * @method 远程报告运行日志
 */
export async function reportRunLog(url:string, logBody:string, storage?:any) {
  console.log('reportRunLog', url, 'logBody', logBody, 'storage', JSON.stringify(storage))
  // log 获取不到运行结果,运行报错这里无法接收
  console.log('reportRunLog:', {logBody,storage})
  const FormData = require('form-data')
  const param = new FormData()
  param.append("logFile", logBody)
  param.append('storage', JSON.stringify(storage))
  param.append('headers', JSON.stringify({
    'Content-Type': 'application/json',
  }))
  console.log('param', JSON.stringify(param.getHeaders))

  // await axios.post(url, param, { headers: param.getHeaders(), timeout: requestTimeout }).catch((e) => {
  //   console.log('reportRunLog error', e.message, " log-url:", url)
  // })
  console.log('reportRunLog success')
}
