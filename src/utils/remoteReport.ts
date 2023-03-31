import fs from 'fs'
import axios from 'axios'
import { ImgFile } from '../run'

export const getImageType = (str) => {
  const reg = /\.(png|jpg|gif|jpeg|webp)$/
  const result = str.match(reg)
  if (result == null) { // 未指定后缀则返回jpg
    return 'jpg'
  }else{
    return result[1]
  }
}

const requestTimeout = 10000

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
export async function reportRunImage(url: string, imgs: ImgFile[], storage?: any) {
  // 将要上传的图片
  console.log(`image upload count: ${imgs.length}`);
  for (const img of imgs) {
    try {
      if (Buffer.isBuffer(img.buffer) == false) {
        img.buffer = Buffer.from(img.buffer);
      }
      const imgbase64 = `data:image/${getImageType(img.name)};base64,${img.buffer.toString("base64")}`;
      console.log(`upload image ${img.path} len: ${imgbase64.length}`);
      const res = await axios.post(url, {
        image: imgbase64,
        storage,
        name: img.name,
      }, {
        timeout: requestTimeout,
      });
      if (res.status === 200) {
        console.log("reportRunImage success!");
      } else {
        console.log("reportRunImage error: HTTP status code is not 200");
      }
    } catch (err) {
      console.log(`reportRunImage error: ${err.message} image-url: ${url}`);
    }
  }
}

/**
 * @method 远程报告运行日志
 */
export async function reportRunLog(url:string, logBody:string, storage?:any) {
  console.log('run reportRunLog', url, 'logBody length', logBody.length)
  // log 获取不到运行结果,运行报错这里无法接收
  console.log('reportRunLog body:', {logBody,storage})
  const FormData = require('form-data')
  const param = new FormData()
  param.append("logFile", logBody)
  param.append('storage', JSON.stringify(storage))
  param.append('headers', JSON.stringify({
    'Content-Type': 'application/json',
  }))

  await axios.post(url, param, { headers: param.getHeaders(), timeout: requestTimeout }).then(res=>{
    console.log('reportRunLog success: ',res.data)
  })
  .catch((e) => {
    console.log('reportRunLog error', e.message, " log-url:", url)
  })
  
}

/**
 * @method 上报运行跟踪内容
 */
export async function reportTrace(url:string, filePath:string, storage?:any) {
  console.log('run reportTrace', url, 'filePath:', filePath)
  // log 获取不到运行结果,运行报错这里无法接收
  const FormData = require('form-data')
  const param = new FormData()
  param.append("trace",   fs.createReadStream(filePath))
  param.append('storage', JSON.stringify(storage))
  param.append('headers', JSON.stringify({
    'Content-Type': 'application/json',
  }))

  try {
    let res = await axios.post(url, param, { headers: param.getHeaders(), timeout: 1000 * 60 * 3 }) // 追踪超时设置为3分钟
    console.log('reportTrace success: ',res.data)
  } catch (error) {
    console.log('reportTrace error', error.message, " log-url:", url)
  }
}
