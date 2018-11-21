const csvparse = require('csv-parse/lib/sync')
const got = require('got')
const debug = require('debug')('secondaries')
const section = require('./section') // use a sectionMgr instead?

/* other sources of signal definitions, not datasets, not the primary doc */

/*
  signals[name] = { name, body, defs: [ {key,text,by} ] }
*/
  
module.exports = async function secondaries (config, signals) {

  // later get this from config, etc
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIzdqEXc2XmYgjqbzHuklxRbqxFXfjuxazSdMZhkFIAJ1GhO1BU3g4ALoOe6HO_riVcDpT8hEhvU5w/pub?output=csv'

  const response = await got(url)
  const records = csvparse(response.body, {
    columns: false })  
  console.log('Got records %j', records)
  for (const r of records.slice(1)) {
    const name = r[0]
    const defs = [ {text: r[1]} ]
    const source = url
    const s = section.signal({name, defs, source})
  }
}

