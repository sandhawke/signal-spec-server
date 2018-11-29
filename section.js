/*
  parse a <section> of input document that's about some subject, some
  signal, or something else, constructing a Section object with what
  we found.
*/

const cheerio = require('cheerio')
const cnamify = require('cnamify')
const debug = require('debug')('section')

class Manager {
  constructor (config) {
    this.config = config
    this.byName = {}
    this.byAnyName = {} // also index by aliases
  }

  toString () {
    return JSON.stringify(this.byName, null, 2)
  }

  // return new or existing section containing this data
  obtain (features) {
    if (features.name) {
      for (const name of [features.name, ...(features.aliases || [])]) {
        const existing = this.byAnyName[name]
        if (existing) {
          //
          //  What if it's from the same source document?  Like, the
          //  same signal name is used twice?  Set multiple ids and
          //  cross link them???
          //
          debug('FOUND EXISTING using name %j, merging into %j', name, existing.name)
          existing.merge(features)
          return existing
        }
      }
    }
    let s
    if (features.type === 'signal') {
      s = new Signal(features)
    }
    s = new Section(features)
    this.byName[s.name] = s
    for (const name of [s.name, ...(s.aliases || [])]) {
      this.byAnyName[name] = s
    }
    return s
  }

  parseLines (lines) {
    return parseLines(lines, this)
  }
}

// iza// tie to signals[] ?
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
    debug('constructed, aliases', this.aliases)
  }

  get otherIds () {
    // weird bug: if I just use this.aliases.map(cnamify) then
    // this.aliases turns into an associative array.  wtf?  map isnt
    // supposed to change its argument, is it?
    const out = this.aliases.map(x => cnamify(x))
    return out
  }

  merge (source) {
    console.error('Merging', source.name, 'into', this.name)
    // Object.assign(this, source) would get lists wrong
    this.aliases.push(source.name)
    if (source.aliases) this.aliases.push(...source.aliases)
    const aliases = new Set(this.aliases) // remove dups
    aliases.delete(this.name) // and cross-references
    this.aliases = [...aliases]
    debug('MERGED aliases:', this.aliases)

    if (!this.defs) this.defs = []
    if (source.defs) {
      this.defs.push(...source.defs || [])
    }

    if (!this.parts) this.parts = []
    if (source.parts) {
      this.parts.push(...source.parts || [])
    }

    const pick = (prop) => {
      if (this[prop]) {
        if (source[prop]) {
          if (source[prop] !== this[prop]) {
            console.error('merge conflict on property %s, %j !== %j', prop, source[prop], this[prop]) //, this=%o source=%o', //                           prop, this, source)
          }
        }
      } else {
        this[prop] = source[prop]
      }
    }

    pick('type')
    pick('title')
    pick('id')
    pick('hLevel')
  }
}

class Signal extends Section {
  /*
  constructor (settings) {
    super(settings)
  }
  */
  get isSignal () { return true }
}

/*
  Given all the HTML lines (nearly put into lines already, thanks),
  figure out some data...

  return a Section or Signal (subclass of Section)
*/
function parseLines (lines, mgr) {
  let type, name, m, line
  let lineNumber = -1

  function err (msg) {
    // these should probably become non-fatal, or caught,
    // turning into some warning at this point in the text
    throw Error(`${msg}: bad line in section parser, line ${lineNumber}: ${JSON.stringify(lines[lineNumber])}`)
  }

  line = lines[++lineNumber]
  m = line.match(/^\s*<section>\s*$/)
  if (!m) err('expection section element')

  line = lines[++lineNumber]
  m = line.match(/id="(.*?)">(.*?)<\/h/)
  if (!m) err('expecting h element with id')
  const id = m[1]
  let title = m[2]
  if (!title) {
    // err('no title')
    title = '(Section with no title?)'
  }
  m = line.match(/<h(\d)/)
  if (!m) err('expecting h element')
  const hLevel = m[1]

  /* GENERATE
     const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${id}`
     lines.splice(2, 0, '<div><a class="edit" href="' + edurl + '">🖉</a></div>')
  */

  m = title.match(/\s*Subject type: (.*)/)
  if (m) {
    type = 'subject'
    name = m[1]
    // s = new Section({id, title, type, name, hLevel})
  }
  m = title.match(/\s*Signal: (.*)/)
  // let signal
  if (m) {
    type = 'signal'
    name = m[1]
    // s = new Signal({id, title, type, name, hLevel})
  }
  // if (!s) {
  // s = new Section({id, title, type: 'other', hLevel})
  // }

  // go through the parts, doing special handling for certain kinds of lines

  const parts = []
  const aliases = []
  let defs
  while (true) {
    line = lines[++lineNumber]
    // debug('line %s %o', lineNumber, line)
    if (!line) break
    const part = { text: line }

    // debug('line = %j',  line)
    m = line.match(/^\s*<p>(Also called|Issue|Includes|Special):\s*(.*)<\/p>/i)
    if (m) {
      debug('op line = %j, m=%j', line, m)
      const op = m[1].toLowerCase().trim()
      const arg = m[2].trim()
      handleOp(op, arg, part)

      if (part.isEnd) break

      if (part.aliases) {
        aliases.push(...part.aliases)
      }
    }
    if (type === 'signal') {
      m = line.match(/\s*<table>/)
      if (m) {
        if (defs) err('multiple definition tables')
        defs = parseDefsTable(line)
        part.isDefs = true
      }
    }

    parts.push(part)
  }

  const s = mgr.obtain({ type, title, id, name, aliases, parts, hLevel, defs })
  return s
}

function handleOp (op, arg, part) {
  part.op = op
  part.arg = arg
  if (op === 'special' && arg === 'studies-table') {
    part.isStudiesTable = true
    return part
  }
  if (op === 'special' && arg === 'end-of-content') {
    part.isEnd = true
    return part
  }
  if (op === 'special' && arg === 'list-of-sources') {
    part.isListOfSources = true
    return part
  }
  if (op === 'also called') {
    part.aliases = arg.split(/\s*,\s*/)
    debug('found aliases', part)
    return part
  }
  if (op === 'issue') {
    console.warn('We havent implemented linking to github issues yet')
    return part
  }
  console.warn('unknown op %j %j', op, arg)
  return part
}

function parseDefsTable (html) {
  const defs = []
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
      defs.push(def)
    }
  })
  return defs
}

module.exports = { Manager }
