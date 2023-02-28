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
  // series(build_injected_script, static_resource, mainTs)()

  series(static_resource, mainTs)()
  // series(mainTs,client_scripts,temporaryJob)()
  return cb()
}

async function build_injected_script(cb) {
  const watchMode = process.argv.slice(2).includes('--watch')
  const webPackFiles = [
    'src/server/injected/webpack.config.js',
    'src/web/recorder/webpack.config.js',
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

function static_resource() {
  return src([
    'src/**/*.json',
    'src/**/*.png',
  ])
    .pipe(dest('lib'))
}

exports.default = build
