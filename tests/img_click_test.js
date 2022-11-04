const cv2 = require('@u4/opencv4nodejs');

let cv = cv2

const path = require('path')
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const dataPath = path.resolve(__dirname, '..', '..', 'data');

const getResourcePath = (name) => {
  const fullpath = path.resolve(name);
  return fullpath;
};

async function wait4key() {
  // console.log('press a key to continue.');
  if (process.stdin.isTTY)
    process.stdin.setRawMode(true);
  process.stdin.resume();
  let done = null;
  const capture = (/*data: Buffer*/) => {
    // console.log({data})
    done = 'terminal';
  };
  process.stdin.on('data', capture);
  await delay(10);
  done = null;
  for (; ;) {
    await delay(10);
    if (~cv.waitKey(10)) {
      done = 'window';
      break;
    }
    if (done)
      break;
  }
  process.stdin.off('data', capture);
  process.stdin.pause();
  if (process.stdin.isTTY)
    process.stdin.setRawMode(false);
  return done;
}

// 测试时填充图片
const matchTemp = cv2.imread('./templates/baidu.jpg', 0)
const image = cv2.imread('./templates/test_baidu.jpg', 0)


// check if opencv compiled with extra modules and nonfree
if (cv.xmodules.xfeatures2d) {
  const siftMatchesImg = matchFeatures(
    matchTemp,
    image,
    new cv.SIFTDetector({ nFeatures: 4000 }),
    cv.matchFlannBased,
    true
  );

  console.log(siftMatchesImg)
  // cv.imshowWait('SIFT matches', siftMatchesImg);
} else {
  console.log('skipping SIFT matches');
}