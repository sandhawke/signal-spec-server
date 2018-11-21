const csvparse = require('csv-parse/lib/sync')
const got = require('got')
const debug = require('debug')('secondaries')
const section = require('./section') // use a sectionMgr instead?

/* other sources of signal definitions, not datasets, not the primary doc */

/*
  signals[name] = { name, body, defs: [ {key,text,by} ] }
*/
  
module.exports = async function secondaries (config, sman) {

  for (const url of config.secondaries || []) {
    const response = await got(url)
    const records = csvparse(response.body, {
      columns: false })  
    console.log('Got records %j', records)
    for (const r of records.slice(1)) {
      const name = r[0]
      const defs = [ {text: r[1]} ]
      const source = url
      sman.obtain({name, defs, source})
    }
  }
}

