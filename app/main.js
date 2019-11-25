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
  db.addSourceURL('https://docs.google.com/document/d/1WZU65fEDNWkeTIoh93clyQP-ERhj_yJoFBQcKrSiEJ0/edit')

  function proc () {
    const stmts = [...db.allStatements()]
    console.log('%o statements', stmts.length)
    const count = stmts.length
    const html = `<p>Sources providing ${count} statements</p>`
    // emerj.merge($('#alert'), html)

    // BUG: glue separately please

    console.log({stmts})
    window.s = stmts
    window.parse = parse
    window.glue = glue
    const sText = stmts.map(x => x.text).join('\n\n')
    console.log({sText})
    const defs = glue(sText, schema)
    console.log({defs})
    if (defs.length) {
      const {toc, sections} = gendoc(defs)
      console.log( {toc, sections} )
      emerj.merge($('#toc-ol'), toc)
      emerj.merge($('#main'), sections)
    } else {
      console.log('no input defs?')
      emerj.merge($('#main'), '')
    }
  }
}

run()
