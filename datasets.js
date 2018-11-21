const debug = require('debug')('datasets')
const cnamify = require('cnamify')
const H = require('escape-html-template-tag')
const querystring = require('querystring')
const kgx = require('kgx')

// https://data.credweb.org/zhang18?format=turtle&return=raw
// https://raw.githubusercontent.com/sandhawke/zhang18-data/master/out.trig

const sources = [
  { name: 'zhang18' }
]

function sourceURL (s) {
  /*
  const args = {
    dataset: s,
    format: 'turtle',
    raw: true
  }
  return ('https://data.credweb.org/?' + querystring.stringify(args))
  */
  // return 'datasets/' + s.name + '.trig'
  return 'https://data.credweb.org/static/zhang18'
}

let loaded = false

module.exports.load = async () => {
  if (loaded) return
  sources.forEach(s => {s.kb = new kgx.KB()})
  await Promise.all(sources.map(s => s.kb.load(sourceURL(s))))
  loaded = true
  debug('all source datasets loaded')
}

let count = 1

module.exports.usageReport = (signal) => {
  const out = []

  if (!signal.defs) {
    out.push('<p>No definitions provided yet.</p>')
    return out
  }
  
  // look through our datasets for any properties matching any of the
  // definitions given of signal.

  for (const s of sources) {
    const props = new Set()
    for (const def of signal.defs) {
      debug('looking for ', s.kb.ns.mov.def, def.text)
      s.kb.forSubjects(subj => {
        out.push(H`<p>Matched predicate ${subj.value}</p>`)
        props.add(subj)
      }, s.kb.ns.mov.def, s.kb.lit(def.text))
      if (props.size > 0) {
        debug('DATASET %s has %j', s.name, [...props.values()])
        const quads = []
        for (const prop of props.values()) {
          // how do we gather the nearby stuff...???  what does that mean???
          out.push(H`<p>Matching predicate ${prop.value}</p>`)
          const q = s.kb.getQuads(null, prop, null, null)
          out.push(H`<p>Got quads ${JSON.stringify(q)}</p>`)
          quads.push(q)
        }
        const body = 'using ' + JSON.stringify(props.values) + ' ---- ' + JSON.stringify(quads)
        const id = 'dataset_' + (count++)
        out.push(H`<p>Used in source: 
<span style="display: inline" id="${id}-up" onclick="openup('${id}')">►</span>
<span style="display: none" id="${id}-down" onclick="closeup('${id}')">▼</span>
 ${s.name} (def ${def.key})</p>
<div style="display: none" id="${id}-body">${body}</div>
`)
      }
    }
  }

  if (out.length === 0) {
    out.push(H`<p>No available data sources found</p>`)
  }
  return out
  
  /*
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

  */
}
