import cv from '@u4/opencv4nodejs'

/**
 * @method 计算两个坐标之间的距离
 * @returns 
 */
function callPintsDistance(point1,point2){
  let dx = Math.abs(point2.x - point1.x);
  let dy = Math.abs(point2.y - point1.y);
  var dis = Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));
  //去除小数点后的数字，这样看起来舒服
  console.log("这两点之间的直线距离为:"+ dis +"px");
  return dis
}

/**
 * @method 计算最优点的缩放比例
 */
function calcScaleRatio(bestMatches,matchTempkeyPoints,imagePoints) {
    let matche1 = bestMatches[0]
    let query1 =  matchTempkeyPoints[matche1.queryIdx]
    let train1 =  imagePoints[matche1.trainIdx]
    
    let matche2 =  bestMatches[1]
    let query2 =  matchTempkeyPoints[matche2.queryIdx]
    let train2 =  imagePoints[matche2.trainIdx]

 
    let xScaleRatio = (Math.max(query1.pt.x,query2.pt.x) - Math.min(query1.pt.x,query2.pt.x)) / (Math.max(train1.pt.x,train2.pt.x) - Math.min(train1.pt.x,train2.pt.x))
    let yScaleRatio = (Math.max(query1.pt.y,query2.pt.y) - Math.min(query1.pt.y,query2.pty)) / (Math.max(train1.pt.y,train2.pt.y) - Math.min(train1.pt.y,train2.pt.y))
 
    return {
      xScaleRatio,yScaleRatio
    }
}

/**
 * @method 去除位置重复的点
 */
function filterRepeatPostion(ids ,points){
  let points_set = []
  // 提取出匹配点
  let matchPoints = ids.map(i=>{ points[i].id = i;return points[i] })
  // 过滤重复位置 
  matchPoints.filter(i=>{
    let exist = points_set.find(t=>{return t.pt.x == i.pt.x && t.pt.y == i.pt.y})
    if(!exist){
      points_set.push(i)
    }
  })
  // 返回无重复点的索引id
  return points_set.map(p=>{return p.id})
}


/**
 * 
 * @method 更具匹配关节点及图像缩放比例，还原图像匹配显示位置
 * @param {d} keyPoint 
 * @param {*} matchTempImage 
 * @param {*} scale 
 * @returns 
 */
function getDirectionDistance(keyPoint,matchTempImage,scale){
  const [hight,width] = matchTempImage.sizes
  return {
    left: keyPoint.pt.x / scale.xScaleRatio,
    right: (width - keyPoint.pt.x) / scale.xScaleRatio,
    top: keyPoint.pt.y / scale.yScaleRatio,
    bottom: (hight - keyPoint.pt.y) / scale.yScaleRatio
  }
}

/**
 * @method 基于sift特征点图像匹配
 * @param {*} matchTemp  图像模版
 * @param {*} image 背景图片
 * @param {*} detector SIFTDetector侦查器
 * @param {*} matchFunc  匹配方式
 * @descriptors 根据最匹配的特征点计算，图像之间的大小缩放，以及距离偏差，根据缩放以及偏差确定匹配后的中心区域，返回中心坐标
 * @returns 图像的点击位置{x,y}
 */
export function matchFeatures(matchTemp,image,detector,matchFunc,debugMode=false) {
  // 生成特征点
  const matchTempPoints = detector.detect(matchTemp);
  const imagePoints = detector.detect(image);

  // 生成特产点描述
  const matchTempDescriptors = detector.compute(matchTemp, matchTempPoints);
  const imageDescriptors = detector.compute(image, imagePoints);

  // match the feature descriptors  匹配特征点描述
  const matches = matchFunc(matchTempDescriptors, imageDescriptors);

  // only keep good matches  只保持良好的匹配
  const bestN = 10;
  const bestMatches = matches.sort(
    (m1, m2) => m1.distance - m2.distance
  ).slice(0, bestN);

  var calcBestMatches = bestMatches

  // 去除两侧位置重复的点
  let imageRepeatList = filterRepeatPostion(calcBestMatches.map(i=>{return i.trainIdx}),imagePoints)
  calcBestMatches = calcBestMatches.filter(_bestMatche=>{
    return  imageRepeatList.indexOf(_bestMatche.trainIdx) > -1;
  })

  let matchTempRepeatList = filterRepeatPostion(calcBestMatches.map(i=>{return i.queryIdx}),matchTempPoints)
  calcBestMatches = calcBestMatches.filter(_bestMatche=>{
    return matchTempRepeatList.indexOf(_bestMatche.queryIdx) > -1;
  })

  let scaleRatio = calcScaleRatio(calcBestMatches.slice(0,2),matchTempPoints,imagePoints)

  if(isNaN(scaleRatio.yScaleRatio)) {
    scaleRatio.yScaleRatio = scaleRatio.xScaleRatio
  }

  // 按match图片的关键点比例计算左右的,上下的边距
  let keyPoint = matchTempPoints[matchTempRepeatList[0]]

  const directionDistance = getDirectionDistance(keyPoint,matchTemp,scaleRatio)

  // 将还原的距离饮用到原图中
  let imgPoint = imagePoints[imageRepeatList[0]]
  
  let rectWidth =  parseInt(directionDistance.left + directionDistance.right)
  let rectHeight = parseInt(directionDistance.top + directionDistance.bottom)

  let rectx = parseInt(imgPoint.pt.x - directionDistance.left)
  let recty = parseInt(imgPoint.pt.y - directionDistance.top) 

  // 按最匹配的位置的分比，计算最靠谱的矩形位置
  console.log("缩放的比例为",scaleRatio,"方块:",rectWidth,rectHeight)

  if(debugMode){
    image.drawRectangle(
      new cv.Rect(rectx, recty, rectWidth, rectHeight),  // x,y,w,h
      new cv.Vec3(0, 0, 255),
      2,
      cv.LINE_8
    );
    cv.imshowWait('SIFT matches', image);
  }

  return { // 返回要点击的x，y轴
    x: parseInt(rectx + rectWidth/2),
    y: parseInt(recty + rectHeight/2)
  }
};