const csvparse = require('csv-parse/lib/sync')
const H = require('escape-html-template-tag')
const got = require('got')
const debug = require('debug')('load')
const kgx = require('kgx')

class Source {
  constructor (state) {
    Object.assign(this, state)
  }

  get urlAsLink () {
    return '' + H`<a href="${this.url}">${this.url}`
    // return this.url
  }

  get loadedAtString () {
    debug('loaded at String', this.loadedAt)
    if (this.loadedAt) {
      return this.loadedAt.toISOString()
    }
    return ''
  }

  get loadDuration () {
    if (this.loadedAt) {
      return (this.loadedAt - this.loadStarted) / 1000
    }
    return ''
  }

  get title () {
    return this.url  // for now?
  }
  
  async innerLoad (...args) {
    this.kb = new kgx.KB()
    await this.kb.load(this.url)
  }

  async load (...args) {
    debug('loading %j', this)
    this.loadStarted = new Date()
    await this.innerLoad(...args)
    this.loadedAt = new Date()
    debug('loaded %j', this)
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
  async innerLoad (sman) {
    const url = `https://docs.google.com/spreadsheets/export?format=csv&id=${this.id}`
    const response = await got(url)
    const records = csvparse(response.body, {
      columns: false // means we go by position instead of column name
    })
    console.log('Got records %j', records)
    for (const r of records.slice(1)) {
      const name = r[0]
      const source = url
      const by = H`<a href="${this.url}">${r[2]}</a>`
      const defs = [ { text: r[1], by } ]
      sman.obtain({ name, defs, source })
    }
    debug('sheets innerLoad done')
  }
}

function setupSources (config) {
  if (config.sources) return
  config.sources = []
  let urls = config.sourceURLs || ''
  debug('urls = %o', urls)
  if (typeof urls === 'string') urls = urls.split(/\s+/)
  debug('urls = %o', urls)
  for (const url of urls) {
    let m, source
    if (url === '') continue

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

    if (!source) {
      source = new Source({ url })
    }

    config.sources.push(source)
  }
}

async function loadAll (config, sman) {
  const results = []
  setupSources(config)
  for (const source of config.sources) {
    debug('source %o', source)
    results.push(source.load(sman))
  }
  debug('awaiting Promise.all')
  await Promise.all(results)
  debug('it returned')
}

module.exports = { loadAll }
