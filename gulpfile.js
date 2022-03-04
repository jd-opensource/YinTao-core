const { series, dest } = require('gulp')
// const childProcess = require('child_process')
// const path = require('path')
const del = require('del')
// const rename                        = require('gulp-rename');
// const data                          = require('gulp-data');
// const mustache                      = require('gulp-mustache');
// const clone                         = require('gulp-clone');
// const fs                            = require('fs');
// const uglify                        = require('gulp-uglify');
// const mergeStreams                  = require('merge-stream');
// const less  = require('gulp-less');
const ts = require('gulp-typescript')
// const { setTimeout } = require("timers/promises");
const tsProject = ts.createProject('tsconfig.json')

function mainTs() {
  return tsProject.src()
    .pipe(tsProject())
    .js.pipe(dest('lib'))
}

async function clean() {
  await del('lib')
  console.log('del finished')
}

async function build(cb) {
  console.log('run build')
  await clean()
  console.log('building ts ...')
  series(mainTs)()
  // series(mainTs,client_scripts,temporaryJob)()
  return cb()
}

// function buildBody(cb) {
//   console.log(123)
//   return cb()
// }

// 编译客户端脚本
// function client_scripts(cb){
//     console.log('开始编译客户端')
//     const task = series(client_scripts_bundle,client_scripts_templates_render_base,style,images)
//     task()
//     return cb()
// }

// 编译style
// function style(){
//     return src('src/**/*.less')
//     .pipe(less())
//     .pipe(dest('lib'))
// }

// function images() {
//   return src([
//     'src/**/*.png',
//     'src/**/*.svg',
//     'src/**/*.ico',
//   ])
//     .pipe(dest('lib'))
// }

// function client_scripts_bundle() {
//   return childProcess
//     .spawn('rollup -c', { shell: true, std
// io: 'inherit', cwd: path.join(__dirname, 'src/client') })
// }

// function client_scripts_templates_render(cb){
//     console.log('debug 编译')
//     const scripts = src([
//         'src/client/core/index.js.wrapper.mustache',
//         'src/client/ui/index.js.wrapper.mustache',
//         'src/client/automation/index.js.wrapper.mustache',
//         'src/client/driver/index.js.wrapper.mustache',
//     ], { base: 'src' })
//     .pipe(rename(file => {
//         file.extname  = '';
//         file.basename = file.basename.replace('.js.wrapper', '');
//     }))
//     .pipe(data(file => {
//         const sourceFilePath = path.resolve('lib', file.relative + '.js');

//         return {
//             source: fs.readFileSync(sourceFilePath),
//         };
//     }))
//     .pipe(mustache())
//     .pipe(rename(file => {
//         file.extname = '.js';
//     }));

// const bundledScripts = scripts
//     .pipe(clone())
//     .pipe(uglify())
//     .pipe(rename(file => {
//         file.extname = '.min.js';
//     }));

//     mergeStreams(scripts, bundledScripts)
//     .pipe(dest('lib'));

//     return cb()
// }

// 零时工
// function temporaryJob() {
//   return src([
//     'src/**/idle-page/*.js',
//     'src/**/idle-page/*.css',
//     'src/**/browser/service-worker.js',
//   ])
//     .pipe(dest('lib'))
// }

// 静态mustache
// function client_scripts_templates_render_base(){
//     return src([
//         'src/**/*.mustache',
//         'src/**/*.ico',
//         'src/**/*.json',
//         'src/**/*.svg',
//         '!src/**/*.js.wrapper.mustache',
//     ])
//     .pipe(dest('lib'));
// }

exports.default = build

// exports.test = client_scripts_templates_render
