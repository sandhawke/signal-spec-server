const fs = require('fs').promises
const {gendoc, schema} = require('./ft5')
const {glue} = require('./glue')

const main = async () => {
  const defs = []
  defs.push(...glue(await fs.readFile('newsq2.ft', 'utf8'), schema))
  defs.push(...glue(await fs.readFile('more.ft', 'utf8'), schema))
  const html = await(gendoc(defs))
  process.stdout.write(html)
}

main()
