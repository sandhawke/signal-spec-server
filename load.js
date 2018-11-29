const csvparse = require('csv-parse/lib/sync')
const H = require('escape-html-template-tag')
const got = require('got')
const debug = require('debug')('sss-load')
const kgx = require('kgx')

class Source {
  constructor (state) {
    Object.assign(this, state)
  }

  get link () {
    return '' + H`<a href="${this.url}">${this.title}</a>`
  }

  get urlAsLink () {
    return '' + H`<a href="${this.url}">${this.url}`
  }

  get doneAtString () {
    debug('loaded at String', this.doneAt)
    if (this.doneAt) {
      return this.doneAt.toISOString()
    }
    return ''
  }

  get loadDuration () {
    if (this.doneAt) {
      return (this.doneAt - this.loadStarted) / 1000
    }
    return ''
  }

  get title () {
    return this.label || this.url.slice(-15)
  }

  async innerLoad (...args) {
    this.kb = new kgx.KB()
    await this.kb.load(this.url)
  }

  async load (...args) {
    debug('loading %j', this)
    this.loadStarted = new Date()
    await this.innerLoad(...args)
    this.doneAt = new Date()
    debug('loaded %o', this.url)
  }
}

class GoogleDocSource extends Source {
  async innerLoad () {
    // we don't do anyright right now; it's really done in
    // gdoc2respec, which loads AND converts

    /*
     TODO: run gdoc2respec for each of them, but really
     just build the tree, then merge the trees.

     Then output HTML from doc structure:

     doc.Introduction
     doc['Subject: ...']
     doc['Appendix: ...']

     Merging whereever section titles are the same.
   */
  }
}

class GoogleSheetSource extends Source {
  /* At the moment, this is ONLY for signal definitions.  Should extend
     to observations and maybe doc structuring, looking at column names.

     OR it might be a sourceList -- so we need config to add to sources...

     [0,0] === Source Label, Signal Label

 */
  async innerLoad (sman, config) {
    const url = `https://docs.google.com/spreadsheets/export?format=csv&id=${this.id}`
    const response = await got(url)
    const records = csvparse(response.body, {
      columns: false // means we go by position instead of column name
    })
    console.log('Got records %j', records)
    if (records[0][0] === 'Source Label') {
      for (const r of records.slice(1)) {
        if (r[2].match(/yes|try/i)) {
          const s = addSource(config, r[1])
          s.label = r[0]
          s.note = r[3]
          s.required = !!r[2].match(/yes/i)
          debug('added source', s)
        } else {
          debug('skipping source, flaged as Use=No', r[0])
        }
      }
    } else if (records[0][0] === 'Signal Label') {
      for (const r of records.slice(1)) {
        const name = r[0]
        const source = url
        const tags = r[2].split(/\s*,\s*/).map(name => {
          const link = this.link // in general, linking to a row would be nice
          return { name, source: this, link }
        })
        // const by = H`${r[2]}(<a href="${this.url}">${r[2]}</a>`
        const defs = [ { text: r[1], tags } ]
        sman.obtain({ name, defs, source })
      }
    } else {
      console.error('dont know how to handle sheet where first cell is ' + JSON.stringify(records[0][0]) + ' with URL ' + url)
    }
    debug('sheets innerLoad done')
  }
}

function addSource (config, url) {
  let m, source
  if (url === '') return undefined

  m = url.match(/^https:\/\/docs.google.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (m) {
    const id = m[1]
    source = new GoogleDocSource({ url, id })

    // hack: right now, we only allow one gdoc, and it's understood
    // as the master doc.   Need to do some re-factoring with gdoc2respec
    config.gdocID = id
  }

  m = url.match(/^https:\/\/docs.google.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (m) {
    const id = m[1]
    source = new GoogleSheetSource({ url, id })
  }

  // maybe do something with github URLs?  you name the repo, we
  // look for certain files in it, and automatically use
  // raw.githubusercontent.com ?
  //
  // actually, if you name the repo, lets do a clone/pull and look for
  // any .csv, .json, .jsonld, .trig, or .ttl files!
  // (maybe git: URI scheme works, too.)

  if (!source) {
    source = new Source({ url })
  }

  config.sources.push(source)
  return source
}

async function loadAll (config, sman) {
  if (!config.sources) config.sources = []
  const s = addSource(config, config.sourceList)
  s.label = 'Source List'
  let doAnotherPass = true

  while (doAnotherPass) {
    debug('starting a loadAll pass')
    const results = []
    doAnotherPass = false
    for (const source of config.sources) {
      if (!source.doneAt) {
        debug('new source %o', source)
        // might alter config.sources
        doAnotherPass = true
        results.push(source.load(sman, config))
      }
    }
    debug('awaiting Promise.all')
    await Promise.all(results)
    debug('it returned')
  }
}

module.exports = { loadAll }
