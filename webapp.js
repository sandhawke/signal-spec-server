/*

watchify -o static/bundle.js webapp.js app/*.js

*/
const debug = require('debug')('flextagger/index.js')
const EventEmitter = require('eventemitter3')
const whenDomReady = require('when-dom-ready')
const nav = require('/home/sandro/Repos/nav-spa')

const { client } = require('/home/sandro/Repos/live-source-proxy/client')
const tagdb = require('/home/sandro/Repos/tagdb')
// const { includeTrusted } = require('./tree')

start()

async function start() {
  await startDatabase()
  await whenDomReady()
  drawPage()
}

async function startDatabase() {
  /*
    localStorage.setItem('liveSourceProxy', 'ws://localhost:8080')
  */
  window.liveSourceProxy = ( window.localStorage.getItem('liveSourceProxy') ||
                             'wss://sourceproxy.org/v0.1.11/' )
  const opener = client(window.liveSourceProxy)
  window.opener = opener

  const db = new tagdb.DB({opener})
  window.tagdb = db
  // includeTrusted(db, state)

  
  // expose the connection to everyone, because gosh
  // it's just kind of easier, sorry.
  window.connectionState = new EventEmitter()
  opener.toServer.responders.push(conn => {
    window.connectionState.conn = conn
    window.connectionState.emit('connect', conn)
    conn.on('close', () => {
      delete window.connectionState.conn
      window.connectionState.emit('close')
    })
  })
}

function drawPage() {
  for (const elem of $$('.erase-on-start')) {
    elem.innerHTML = ''
  }
}

function $$ (selector, el = document) {
  return document.querySelectorAll(selector)
}

localStorage.setItem('debug', '')
