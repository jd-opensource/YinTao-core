import { Command, program } from 'commander'
import live from '../live'
import { runFile } from '../run'

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

program.parse(process.argv)
