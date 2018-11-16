const debug = require('debug')('used-in')
const cnamify = require('cnamify')
const H = require('escape-html-template-tag')
const querystring = require('querystring')

const allSources = [
  { name: 'zhang18',
    signals: ['Representative Citations']
  },
  { name: 'zhang18-2',
    signals: ['Representative Citations']
  }
]

module.exports = (name, names) => {
  const out = []
  const sources = []

  debug('names=%j', names)
  for (const s of allSources) {
    for (const n of names) {
      if (s.signals.includes(n)) {
        const url = H`https://data.credweb.org/${s.name}?property=${H.safe(querystring.escape(n))}`
        // click to drop-down iframe or just ajax inclusion?
        sources.push(H`<a href="${url}">${s.name}</a>`)
      }
    }
  }

  if (sources.length) {
    out.push(H`<p>Available data sources: ${H.safe(sources.join(', '))}</p>`)
  } else {
    out.push(H`<p>No available data sources found</p>`)
  }
  return out
}
