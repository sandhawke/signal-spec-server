/*
  parse a <section> of input document that's about some subject, some
  signal, or something else, constructing a Section object with what
  we found.
*/

const cheerio = require('cheerio')
const cnamify = require('cnamify')
const debug = require('debug')('Signal')

// tie to signals[] ?
// how to fill in subSections?

class Section {
  // this.type = 'subject' | 'signal' | ...
  // this.title
  // this.id
  // -- not implemented: this.subSections
  // this.name  (well, for Signal and Subject)
  // this.aliases
  // this.parts
  //   parts element types?
  constructor (settings) {
    Object.assign(this, settings)
    if (!this.aliases) this.aliases = []
    if (!this.parts) this.parts = []
  }

  get otherIds () {
    return this.aliases.map(cnamify)
  }
  
  merge (source) {
    console.error('Merging', source.name, 'into', this.name)
    // Object.assign(this, source) would get lists wrong
    this.aliases.push(source.name)
    this.aliases.push(source.aliases)
    const aliases = new Set(this.aliases)
    aliases.remove(this.name)
    this.aliases = [...aliases] // remove dups

    this.parts.push(source.parts) // annotate different source?
  }
}

class Signal extends Section {
  constructor (settings) {
    super(settings)
  }
  get isSignal () { return true }
}

module.exports.signal = function signal (settings) {
  // OR an existing one???
  return new Signal(settings)
}

/*
  Given all the HTML lines (nearly put into lines already, thanks),
  figure out some data...

  return a Section or Signal (subclass of Section)
*/
module.exports.parseLines =  function parseLines (lines, signals) {
  let type, name, m, line, s
  let lineNumber = -1

  function err () {
    throw Error(`bad line in section parser, line ${lineNumber}: ${JSON.stringify(lines[lineNumber])}`)
  }

  line = lines[++lineNumber]
  m = line.match(/^\s*<section>\s*$/)
  if (!m) err()

  line = lines[++lineNumber]
  m = line.match(/id="(.*?)">(.*?)<\/h/)
  if (!m) err()
  const id = m[1]
  const title = m[2]
  m = line.match(/<h(\d)/)
  if (!m) err()
  const hLevel = m[1]

  /* GENERATE
     const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${id}`
     lines.splice(2, 0, '<div><a class="edit" href="' + edurl + '">🖉</a></div>')
  */
  
  m = title.match(/\s*Subject type: (.*)/)
  if (m) {
    type = 'subject'
    name = m[1]
    s = new Section({id, title, type, name, hLevel})
  }
  m = title.match(/\s*Signal: (.*)/)
  let signal
  if (m) {
    type = 'signal'
    name = m[1]
    s = new Signal({id, title, type, name, hLevel})
  }
  if (!s) {
    s = new Section({id, title, type: 'other', hLevel})
  }

  // go through the parts, doing special handling for certain kinds of lines
  
  s.parts = []
  while (true) {
    line = lines[++lineNumber]
    debug('line %s %o', lineNumber, line)
    if (!line) break
    const part = { text: line }

    // debug('line = %j',  line)
    m = line.match(/^\s*<p>(Also called|Issue|Includes|Special):\s*(.*)<\/p>/i)
    if (m) {
      debug('op line = %j, m=%j',  line, m)
      const op = m[1].toLowerCase().trim()
      const arg = m[2].trim()
      handleOp(op, arg, part)
      
      if (part.aliases) {
        s.aliases.push(...part.aliases)
        for (let alias of part.aliases) {
          const prior = signals[alias]
          if (prior) {
            prior.merge(s)
            s = prior
          }
        }
      }
    } 
    if (s.isSignal) {
      m = line.match(/\s*<table>/)
      if (m) {
        parseTable(line, s)
        part.isDefs = true
      }
    }

    s.parts.push(part)
  }
  return s
}

function handleOp (op, arg, part) {
  part.op = op
  part.arg = arg
  if (op === 'special' && arg === 'studies-table') {
    part.isStudiesTable = true
    return part
  }
  if (op === 'also called') {
    part.aliases = arg.split(/\s*,\s*/)
    return part
  }
  console.warn('unknown op %j %j', op, arg)
  return part
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
