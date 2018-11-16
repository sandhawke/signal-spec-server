const H = require('escape-html-template-tag')
const convert = require('gdoc2respec')
const studiesTable = require('./studies')
const usedIn = require('./used-in')
const fs = require('fs').promises
const debug = require('debug')('gendoc')

const config = require('./config')
const signals = {}

module.exports = (async () => {
  // config.filter = filter
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
    }
    signals[name] = {name: name}
    signal = signals[name]
    signal.names = [name]
    // debug('10 name=%j signal=%j', name, signal)
    // lines.splice(2, 0, '<span id=' + name + '></span>')  // or maybe change line 1
  }
  
  // debug('=>', id, type, name, title)
  for (const line of lines.slice(2)) {
    // console.error('line = %j',  line)
    m = line.match(/^\s*<p>(Also called|Issue|Includes):\s*(.*)<\/p>/i)
    if (m) {
      const op = m[1].toLowerCase().trim()
      const arg = m[2].trim()
      if (signal) {
        debug('signal %j, op=%j arg=%j', name, op, arg)
        if (op === 'also called') {
          signal.aliases = arg.split(/\s*,\s*/)
          signal.names = signal.names.concat(signal.aliases)
        } else {
          console.warn('unknown op', op)
        }
        debug(' signal now %j', signal)
      }
    }
  }
  if (signal) {
    // lines.push(`[Data about signal ${name} will be inserted here]`)
    debug('calling studies with name=%j signal=%j', name, signal)
    lines.push(...studiesTable(name, signal.names))
    lines.push(...usedIn(name, signal.names))
  }
  
  return lines
}


function filter (html) {
  const m = html.match(/^ *<p> *@include\((.*)\)/)  // ignore later stuff
  if (m) {
    const key = m[1]
    // let out = '<b>DEBUG: INCLUDING ' + JSON.stringify(key) + '</b>'
    let out = ''
    for (let r of []) {
      if (r.SimGroup === key) {
        const name = r['Name']
        out += `
<section>
  <h4>${name}</h4>
  <table>
`
        function row (k, v) {
          out += `<tr><th>${k}</th><td>${v}</td></tr>\n`
        }
        const template = r['Statement template']
        let vars = []
        let m = template.match(/\[(.*?)\]/g)
        if (m) {
          vars = m.map(x => x.slice(1,-1).split(' '))
        }
        row('Template', template)
        
        let sparql = r['SPARQL']
        if (!sparql || sparql === '') {
          const pname = ':' + name.replace(/[^\w]/g, '_')
          const t = ['?subject', pname, 'true']
          if (vars.length === 1 && vars[0].length === 2) {
            t[2] = '?' + vars[0][1]
          }
          sparql = t.join(' ')
        }
        row('SPARQL', sparql)

        const q = r['Question Used']
        if (q) {
          row('Survey', `
      <table class="inner">
        <tr><th>Question</th><th>Answers</th></tr>
        <tr><td>${q}</td><td style="white-space: pre-wrap">${r['Answers']}</td></tr>
      </table>
`
             )}

        // science row!
        
        out += '</table></section>'
      }
    }
    return out
  }
  return html
}
