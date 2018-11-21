const H = require('escape-html-template-tag')
const convert = require('gdoc2respec')
const studiesTable = require('./studies')
const datasets = require('./datasets')
const secondaries = require('./secondaries')
const fs = require('fs').promises
const debug = require('debug')('gendoc')

const section = require('./section')
const config = require('./config')
const sman = new section.Manager(config)

module.exports = (async () => {
  await secondaries(config, sman)
  await datasets.load()
  config.sectionFilter = sectionFilter
  const text = await convert(config)
  await fs.writeFile('out-signals.json', sman.toString(), 'utf8')
  return text
})

function sectionFilter (lines) {
  const out = []
  const s = sman.parseLines(lines)

  /*
  // NO it's the same signal if ANY OF THE NAMES LINE UP.
  //
  // MAYBE.  How do we merge the discussions???
  // 
  if (s.isSignal) {
    let counter = 1
    let base = s.name
    debug('uniquify %s', base)
    while (signals[s.name]) {
      s.name = base + ' DUPLICATE #' + counter++
      debug('dup', s.name)
    }
    signals[s.name ] = s
  }
  */
  
  out.push('<section>')
  const spans = []
  for (const id of s.otherIds) {
    // make HTML targets for all our aliases
    spans.push(`<span id="${id}"></span>`)
  }
  if (!s.hLevel) throw Error('no hLevel WTF ' + JSON.stringify(s))
  if (!s.title) throw Error('no title WTF ' + JSON.stringify(s))
  out.push(`<h${s.hLevel} id="${s.id}">${spans.join('')}${s.title}</h${s.hLevel}>`)
  out.push('')

  // make a link to our relevant source doc
  //
  // what if we have multple source docs, eg for subsection inclusion?
  const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${s.id}`
  // ISSUE: pencil glyph is fairly rare, often renders as unknown-unicode
  out.push('<div><a class="edit" href="' + edurl + '">🖉</a></div>')

  let defsDone = false
  for (const part of s.parts) {
    if (part.isStudiesTable) {
      out.push(...studiesTable('all'))
    } else if (part.isDefs) {
      out.push(...defsTable(s))
      defsDone = true
    } else {
      if (!part.text) throw Error('part with no text: ' + JSON.stringify(part))
      out.push(part.text)
    }
  }
  // sometimes the defs only come from secondary sources
  if (!defsDone) out.push(...defsTable(s))
  
  if (s.isSignal) {
    // lines.push(`[Data about signal ${name} will be inserted here]`)
    debug('calling studies with name=%j signal=%j', s.name, s)
    out.push(...studiesTable(s.name, s.aliases))
    out.push(...datasets.usageReport(s))
  }
  
  return out
}

function defsTable (s) {
  // use s.defs {key, text, by} from section.parseTable() and other places
  const out = []
  if (s.defs && s.defs.length) {
    out.push('<table>')
    out.push('  <thead>')
    out.push('    <tr>')
    out.push(H`      <th>Key</th>`)
    out.push(H`      <th>Definition Text / Template</th>`)
    out.push(H`      <th>Source Notes</th>`)
    out.push('    </tr>')
    out.push('  </thead>')
    out.push('  <tbody>')
    for (const def of s.defs) {
      // link to source?
      // link to entry?
      out.push('    <tr>')
      out.push(H`      <td>${def.key || ''}</td>`)
      out.push(H`      <td>${def.text}</td>`)
      out.push(H`      <td>${def.by || ''}</td>`)
      out.push('    </tr>')
    }
    out.push('  <tbody>')
    out.push('</table>')
  } else {
    out.push('<p><i>No definitions found.</i></p>')
  }
  return out
}
