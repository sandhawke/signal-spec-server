const H = require('escape-html-template-tag')
const emerj = require('emerj')
const nav = require('/home/sandro/Repos/nav-spa')
const debug = require('debug')('signal-spec')

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

  // on statements / on timer? / on data change
  //
  // call gendoc
  //
  // and emerge the result.

  function proc () {
    console.log('%o statements', [...db.allStatements()].length)
    const count = [...db.allStatements()].length
    const html = `<p>Sources providing ${count} statements</p>`
    emerj.merge($('#app'), html)
  }
}

run()
