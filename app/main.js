const H = require('escape-html-template-tag')
const emerj = require('emerj')
const nav = require('/home/sandro/Repos/nav-spa')
const debug = require('debug')('signal-spec')
const {gendoc,schema} = require('../ft5')
const {glue} = require('../glue')
const {parse} = require('/home/sandro/Repos/flextag-parser')

const $ = (selector, elem) => {
  if (elem === undefined) elem = document
  return elem.querySelector(selector)
}

const $$ = (selector, elem, fn) => {
  if (typeof elem === 'function') {
    fn = elem
    elem = document
  } else if (elem === undefined) {
    elem = document
  }
  // debug('elem = ', elem)
  let list = elem.querySelectorAll(selector)
  if (fn) list = [...list].map(fn)
  return list
}

// module.exports =  {H, mergeHTML, nav, db, $, $$, debug}

async function run () {
  const db = window.tagdb
  // db.on('change', event => { console.log('db change', event) })
  db.on('unknownchange', proc)

  const sources = {
    'https://docs.google.com/document/d/1WZU65fEDNWkeTIoh93clyQP-ERhj_yJoFBQcKrSiEJ0/edit': 'NewsQ',
    'https://docs.google.com/document/d/1p6c4TvsbXOVtb0DHztXDdqgRk8P0n65K0TMGkv7jIjo/edit': 'Sandro'
  }
  for (const url of Object.keys(sources)) db.addSourceURL(url)
  
  function proc () {
    const allDefs = []
    for (const src of db.sources) {
      // console.log('LINE', src.url)
      const out = []
      for (const stmt of src.statements) {
        out.push(stmt.text)
      }
      const all = out.join('\n\n')
      // console.log({url: src.url, all})

      const defs = glue(all, schema)
      for (const def of defs) {
        def.sourceURL = src.url
        def.sourceName = sources[src.url]
        def.sourceLink = H`<a href="${def.sourceURL}" target="_blank">${def.sourceName}</a>`
        allDefs.push(def)
      }
      // console.log('GLUED', {all, defs})
    }
    console.log({allDefs})

    if (allDefs.length) {
      const {toc, sections} = gendoc(allDefs)
      // console.log( {toc, sections} )
      emerj.merge($('#toc-ol'), toc)
      emerj.merge($('#main'), sections)
    } else {
      console.log('no input defs?')
      emerj.merge($('#main'), '')
    }
  }
}

run()
