import { Command, program } from 'commander'
import live from '../live'
import { runFile } from '../run'
import { Executable, Registry } from '../utils/registry'
import { getPlaywrightVersion, spawnAsync } from '../utils/utils'

function commandWithOpenOptions(command: string, description: string, options: any[][]): Command {
  let result = program.command(command).description(description)
  options.forEach((option:any) => {
    result = result.option(option[0], ...option.slice(1))
  })
  return result
    .option('-b, --browser <browserType>', 'browser to use, one of cr, chromium, ff, firefox, wk, webkit', 'chromium')
    .option('--channel <channel>', 'Chromium distribution channel, "chrome", "chrome-beta", "msedge-dev", etc')
    .option('--color-scheme <scheme>', 'emulate preferred color scheme, "light" or "dark"')
    .option('--device <deviceName>', 'emulate device, for example  "iPhone 11"')
    .option('--geolocation <coordinates>', 'specify geolocation coordinates, for example "37.819722,-122.478611"')
    .option('--ignore-https-errors', 'ignore https errors')
    .option('--load-storage <filename>', 'load context storage state from the file, previously saved with --save-storage')
    .option('--lang <language>', 'specify language / locale, for example "en-GB"')
    .option('--proxy-server <proxy>', 'specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080"')
    .option('--proxy-bypass <bypass>', 'comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com"')
    .option('--save-storage <filename>', 'save context storage state at the end, for later use with --load-storage')
    .option('--save-trace <filename>', 'record a trace for the session and save it to a file')
    .option('--timezone <time zone>', 'time zone to emulate, for example "Europe/Rome"')
    .option('--timeout <timeout>', 'timeout for Playwright actions in milliseconds', '10000')
    .option('--user-agent <ua string>', 'specify user agent string')
    .option('--viewport-size <size>', 'specify browser viewport size in pixels, for example "1280, 720"')
}

// eslint-disable-next-line global-require
export const registry = new Registry(require('../../browsers.json'))

export const _a = 2

commandWithOpenOptions(
  'live [url]',
  'open page and generate code for user actions',
  [
    ['-o, --output <file name>', 'saves the generated script to a file'],
  ],
).action((url, options) => {
  live(url, options)
}).addHelpText('afterAll', `
Examples:
  $ live https://example.com`)

commandWithOpenOptions('run [filePath]', 'open page in browser specified via -b, --browser', [])
  .action((filePath, options) => {
    runFile(filePath, options)
  })
  .addHelpText('afterAll', `
Examples:

  $ run ./test.js`)

commandWithOpenOptions('browsers', 'get local browsers', [])
  .action((url, options) => {
    console.log(url, options)
  })
  .addHelpText('afterAll', `
Examples:

$ browsers`)

program
  .command('install [browser...]')
  .description('ensure browsers necessary for this version of Playwright are installed')
  .option('--with-deps', 'install system dependencies for browsers')
  .action(async (args: string[], options: { withDeps?: boolean }) => {
    try {
      if (!args.length) {
        const executables = registry.defaultExecutables()
        if (options.withDeps) { await registry.installDeps(executables, false) }
        await registry.install(executables)
      } else {
        const installDockerImage = args.some((arg) => arg === 'docker-image')
        args = args.filter((arg) => arg !== 'docker-image')
        if (installDockerImage) {
          const imageName = `mcr.microsoft.com/playwright:v${getPlaywrightVersion()}-focal`
          const { code } = await spawnAsync('docker', ['pull', imageName], { stdio: 'inherit' })
          if (code !== 0) {
            console.log('Failed to pull docker image')
            process.exit(1)
          }
        }

        const executables = checkBrowsersToInstall(args)
        if (options.withDeps) { await registry.installDeps(executables, false) }
        await registry.install(executables)
      }
    } catch (e) {
      console.log(`Failed to install browsers\n${e}`)
      process.exit(1)
    }
  })
  .addHelpText('afterAll', `

Examples:
  - $ install
    Install default browsers.

  - $ install chrome firefox
    Install custom browsers, supports ${suggestedBrowsersToInstall()}.`)

function checkBrowsersToInstall(args: string[]): Executable[] {
  const faultyArguments: string[] = []
  const executables: Executable[] = []
  for (const arg of args) {
    const executable = registry.findExecutable(arg)
    if (!executable || executable.installType === 'none') { faultyArguments.push(arg) } else { executables.push(executable) }
  }
  if (faultyArguments.length) {
    console.log(`Invalid installation targets: ${faultyArguments.map((name) => `'${name}'`).join(', ')}. Expecting one of: ${suggestedBrowsersToInstall()}`)
    process.exit(1)
  }
  return executables
}

function suggestedBrowsersToInstall() {
  return registry.executables().filter((e) => e.installType !== 'none' && e.type !== 'tool').map((e) => e.name).join(', ')
}

program.parse(process.argv)
