const { series, dest, src } = require('gulp')
const child_process = require('child_process')
const path = require('path')
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
const ROOT = path.join(__dirname, '..', '..')

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
  series(mainTs, build_injected_script, static_resource)()
  // series(mainTs,client_scripts,temporaryJob)()
  return cb()
}

async function build_injected_script(cb) {
  const watchMode = process.argv.slice(2).includes('--watch')
  const webPackFiles = [
    'src/server/injected/webpack.config.js',
  ]
  for (const file of webPackFiles) {
    const step = {
      command: 'npx',
      args: ['webpack', '--config', quotePath(file), ...(watchMode ? ['--watch', '--stats', 'none'] : [])],
      shell: true,
      env: {
        NODE_ENV: watchMode ? 'development' : 'production',
      },
    }
    runStep(step)
  }
  return cb
}

function runStep(step) {
  const out = child_process.spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: step.shell,
    env: {
      ...process.env,
      ...step.env,
    },
    cwd: step.cwd,
  })
  if (out.status) {
    process.exit(out.status)
  }
}

/**
 * @param {string} path
 * @returns {string}
 */
function quotePath(path) {
  return `"${path}"`
}

/**
 * @param {string} relative
 * @returns {string}
 */
function filePath(relative) {
  return path.join(ROOT, ...relative.split('/'))
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

function static_resource() {
  return src([
    'src/**/*.json',
  ])
    .pipe(dest('lib'))
}

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
