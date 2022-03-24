import axios from 'axios'
import { ImgFile } from '../run'

const getImageType = (str) => {
  const reg = /\.(png|jpg|gif|jpeg|webp)$/
  return str.match(reg)[1]
}

/**
 * @method 远程报告运行结果
 */
export async function reportRunResult(url:string, result:any, storage?:any) {
  result.storage = storage
  await axios.post(url, {
    result,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 3000,
  }).then((res) => {
    if (res.status === 200) {
      console.log('运行结果,远程上报完成!')
    } else {
      console.log('上报错误!')
    }
  }).catch((e: Error) => {
    console.log('上报错误!', e)
  })
}

/**
 * @method 远程报告运行图片
 */
export async function reportRunImage(url:string, imgs: ImgFile[], storage?:any) {
  // 将要上传的图片
  imgs.map(async (img) => {
    const imgbase64 = `data: image/${getImageType(img.name)};base64,${img.buffer.toString('base64')}`
    await axios.post(
      url,
      {
        image: imgbase64,
        storage,
        name: img.name,
      },
      { timeout: 3000 },
    ).catch((e: Error) => {
      console.log('上报图片错误!', e)
    })
  })
}

/**
 * @method 远程报告运行日志
 */
export async function reportRunLog(url:string, logBody:string, storage?:any) {
  // log 其实获取不到运行结果,正真的报错也不会到这里来
  const FormData = require('form-data')
  const param = new FormData()
  param.append("logFile", "neiorng")
  param.append('storage', JSON.stringify({ storage }))
  await axios.post(url, param, { headers: param.getHeaders(), timeout: 3000 }).catch((e) => {
    console.log('日志上报出错', e)
  })
  console.log('日志上报完毕')
}