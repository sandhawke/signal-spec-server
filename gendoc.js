const H = require('escape-html-template-tag')
const convert = require('gdoc2respec')
const studiesTable = require('./studies')
const datasets = require('./datasets')
const fs = require('fs').promises
const debug = require('debug')('gendoc')
const cheerio = require('cheerio')

const config = require('./config')
const signals = {}

module.exports = (async () => {
  await datasets.load()
  config.sectionFilter = sectionFilter
  const text = await convert(config)
  await fs.writeFile('out-signals.json', JSON.stringify(signals, null, 2), 'utf8')
  return text
})

function sectionFilter (lines) {
  let type, name
  const head = lines[1]   // lines[0] is always "<section>"
  let m = head.match(/id="(.*?)">(.*?)</)
  if (!m) throw Error('bad header line: ' + head)
  const id = m[1]
  const title = m[2]

  const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${id}`
  lines.splice(2, 0, '<div><a class="edit" href="' + edurl + '">🖉</a></div>')
  
  m = title.match(/\s*Subject type: (.*)/)
  if (m) {
    type = 'subject'
    name = m[1]
  }
  m = title.match(/\s*Signal: (.*)/)
  let signal
  // debug('01 name=%j signal=%j', name, signal)
  if (m) {
    type = 'signal'
    name = m[1]
    // debug('05 name=%j signal=%j', name, signal)
    if (signals[name]) {
      console.err('duplicated signal name', name)
    } else {
      signals[name] = {name: name}
    }
    signal = signals[name]
    signal.names = [name]
    // debug('10 name=%j signal=%j', name, signal)
    // lines.splice(2, 0, '<span id=' + name + '></span>')  // or maybe change line 1
  }
  
  // debug('=>', id, type, name, title)
  for (const line of lines.slice(2)) {
    // debug('line = %j',  line)
    m = line.match(/^\s*<p>(Also called|Issue|Includes|Special):\s*(.*)<\/p>/i)
    if (m) {
      debug('op line = %j, m=%j',  line, m)
      const op = m[1].toLowerCase().trim()
      const arg = m[2].trim()
      handleOp(lines, op, arg, signal)
    }
    if (signal) {
      m = line.match(/\s*<table>/)
      if (m) {
        parseTable(line, signal)
      }
    }
  }
  if (signal) {
    // lines.push(`[Data about signal ${name} will be inserted here]`)
    debug('calling studies with name=%j signal=%j', name, signal)
    lines.push(...studiesTable(name, signal.names))
    lines.push(...datasets.usageReport(signal))
  }
  
  return lines
}

function handleOp (lines, op, arg, signal) {
  if (op === 'special' && arg === 'studies-table') {
    lines.push(...studiesTable('all'))
    return
  }
  if (signal) {
    debug('signal %j, op=%j arg=%j', op, arg)
    if (op === 'also called') {
      signal.aliases = arg.split(/\s*,\s*/)
      signal.names = signal.names.concat(signal.aliases)
      return
    }
  }
  console.warn('unknown op %j %j signal %j', op, arg, signal)
}

function parseTable (html, signal) {
  if (!signal.defs) signal.defs = []
  const $ = cheerio.load(html)
  $('tr').each(function (i, row) {
    // console.log('  ROW for ', i, signal.name)
    if (i >= 1) { // not for header
      const def = {}
      $(this).find('td').each(function (j, td) {
        // console.log('      TD %d %d  %j', i, j, $(this).text())
        const val = $(this).text().trim()
        if (j === 0) def.key = val
        if (j === 1) def.text = val
        if (j === 2) def.by = val
      })
      signal.defs.push(def)
    }
  })
}
