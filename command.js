#!/usr/bin/env node
const fs = require('fs')
const meow = require('meow')
const AppMgr = require('appmgr')
const gendoc = require('./gendoc')
const routes = require('./routes')
const config = require('./config')
// const debug = require('debug')('signal-spec')

// someday work without config, because we get that info from source list
// maybe have config be an argument
// maybe read it relative to PWD instead of __filename
// maybe allow additional input at this point

const cli = meow(`
    Usage
        $ signal-spec [source-list-url]

   Options
        --out, -o      Where to send generated html
        --server       Run as webserver (using $SITEURL and $PORT)

    Examples
        $ signal-spec https://docs.google.com/spreadsheets/d/1ixAFSHnnhA7JI12yKsPiELd16pdonRABherOzZzOd1o/edit

`, {
  flags: {
    out: {
      type: 'string',
      alias: 'o'
    },
    server: {
      type: 'string',
      alias: 's'
    }
  }
})

const main = async () => {
  if (cli.input.length === 1) {
    config.sourceList = cli.input[0]
  }

  // maybe make this --port, and get the port number?
  if (cli.flags.server !== undefined) {
    const m = new AppMgr()
    m.app.use('/', routes.makeRouter(config))
    await m.start()
    console.error(`# Server listening at ${m.siteurl}`)
  } else {
    const html = await gendoc(config)

    let outStream = process.stdout
    // console.error('CLI %O', cli)
    if (cli.flags.out) {
      outStream = fs.createWriteStream(cli.flags.out)
    }
    outStream.write(html)
  }
}

if (cli.input.length > 1) cli.showHelp()
main()
