const H = require('escape-html-template-tag')
const convert = require('gdoc2respec')
const studiesTable = require('./studies')
const datasets = require('./datasets')
const fs = require('fs').promises
const pkey = require('./pkey')
const debug = require('debug')('gendoc')

const section = require('./section')
const { loadAll } = require('./load')

const allDefs = []
const path = []
const roots = []
const hier = []

async function gendoc (config) {
  if (!config) throw Error('gendoc missing config')
  const sman = new section.Manager(config)
  await loadAll(config, sman)
  config.sectionFilter = sectionFilter
  const text = await convert(config)
  await fs.writeFile('.out-signals.json', sman.toString(), 'utf8')
  await fs.writeFile('.out-signal-defs.json', JSON.stringify(allDefs, null, 2), 'utf8')
  await fs.writeFile('.out-roots.json', JSON.stringify(roots, null, 2), 'utf8')
  await fs.writeFile('.out-hier.json', JSON.stringify(hier, null, 2), 'utf8')
  return text

  function sectionFilter (lines) {
    const out = []
    const s = sman.parseLines(lines)

    /*
    // NO it's the same signal if ANY OF THE NAMES LINE UP.
    //
    // MAYBE.  How do we merge the discussions???
    //
    if (s.isSignal) {
    let counter = 1
    let base = s.name
    debug('uniquify %s', base)
    while (signals[s.name]) {
    s.name = base + ' DUPLICATE #' + counter++
    debug('dup', s.name)
    }
    signals[s.name ] = s
    }
    */

    out.push('<section>')
    const spans = []
    for (const id of s.otherIds) {
      // make HTML targets for all our aliases
      spans.push(`<span id="${id}"></span>`)
    }
    if (!s.hLevel) throw Error('no hLevel WTF ' + JSON.stringify(s))
    if (!s.title) throw Error('no title WTF ' + JSON.stringify(s))
    out.push(`<h${s.hLevel} id="${s.id}">${spans.join('')}${s.title}</h${s.hLevel}>`)
    out.push('')
    path.splice(s.hLevel - 1, 999, s)
    const parent = path[s.hLevel - 2]
    if (parent) {
      if (!parent.subs) parent.subs = []
      parent.subs.push(s)
      hier.push({itemTitle: s.title, groupTitle: parent.title})
    } else {
      roots.push(s)
    }
    console.log('SECTION', s.hLevel, s.title, path.map(s => s.title))

    // make a link to our relevant source doc
    //
    // what if we have multple source docs, eg for subsection inclusion?
    const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${s.id}`
    // ISSUE: pencil glyph is fairly rare, often renders as unknown-unicode
    // out.push('<div><a class="edit" href="' + edurl + '">🖉</a></div>')

    // yes, I paid the $1.99 for no-credit usage
    out.push(H`<div><a class="edit" href="${edurl}"><img src="${config.siteurl}/static/noun_External%20Link_1107417g_16x16" width="16" height="16" alt="src"></a></div>`)

    let defsDone = false
    for (const part of s.parts) {
      if (part.isStudiesTable) {
        out.push(...studiesTable('all'))
      } else if (part.isListOfSources) {
        out.push(...sourcesTable(config.sources))
      } else if (part.isDefs) {
        out.push(...defsTable(s))
        defsDone = true
      } else if (part.isOtherSignals) {
        out.push(...otherSignals(sman))
      } else {
        if (!part.text) throw Error('part with no text: ' + JSON.stringify(part))
        out.push(part.text)
      }
    }
    // sometimes the defs only come from secondary sources
    if (!defsDone) out.push(...defsTable(s))

    if (s.isSignal) {
      // lines.push(`[Data about signal ${name} will be inserted here]`)
      debug('calling studies with name=%j signal=%j', s.name, s)
      out.push(...studiesTable(s.name, s.aliases))
      out.push(...datasets.usageReport(s))
    }

    return out
  }
}

// let refseq=1000

// s is a Section, as per section.js, managed by sman
function defsTable (s) {
  // use s.defs {key, text, by} from section.parseTable() and other places
  s.printed = true
  const out = []
  if (s.defs && s.defs.length) {
    out.push('<table>')
    out.push('  <thead>')
    out.push('    <tr>')
    out.push(H`      <th>Ref</th>`)
    out.push(H`      <th>Definition (Template)</th>`)
    out.push(H`      <th>Tags</th>`)
    out.push('    </tr>')
    out.push('  </thead>')
    out.push('  <tbody>')

    // gather the def.text and tags by name
    // let didStuff = false
    const tags = {} // tags[deftext][tagname] = [src1link, src2link]
    const comments = {} // comments[deftext] = [comment1, comment2, .. ]
    for (const def of s.defs) {
      def.signalTitle = s.title
      allDefs.push(def)
      if (!tags[def.text]) tags[def.text] = {}
      for (const tagentry of def.tags || []) {
        if (!tags[def.text][tagentry.name]) tags[def.text][tagentry.name] = []
        tags[def.text][tagentry.name].push(tagentry.link)
        // didStuff = true
      }
      if (def.comments) {
        if (!comments[def.text]) comments[def.text] = []
        comments[def.text].push(def.comments)
      }
    }
    // if (didStuff) console.log('TAGS', tags)

    for (const text of Object.keys(tags).sort()) {
      out.push('    <tr>')
      const k = pkey.hash16(text)
      out.push(H`      <td id="${k}"><a href="#${k}" style="font-size: 75%">${k}<a></td>`)
      out.push(H`      <td>${text}</td>`)
      const tt = [] // same as "out", but we join with no space
      for (const tagname of Object.keys(tags[text]).sort()) {
        tt.push(H`${tagname}(`)
        let links = tags[text][tagname]
        if (links.length > 3) {
          links = links.slice(0, 3).push('...')
        }
        tt.push(links.join(','))
        tt.push(') ')
      }
      out.push(H`      <td>${H.safe(tt.join(''))}</td>`)
      out.push('    </tr>')
      if (comments[text]) {
        out.push('    <tr><td colspan="3">')
        out.push('      <p><i>Notes (not normative):</i></p><ul>')
        for (const comment of comments[text]) {
          out.push(H`      <li>${H.safe(comment.link)}: ${comment.text}</li>`)
        }
        out.push('    </ul></td></tr>')
      }
    }
    out.push('  <tbody>')
    out.push('</table>')
  } else {
    // out.push('<p><i>No definitions found.</i></p>')
  }
  return out
}

// coordinate with load.js
function sourcesTable (sources) {
  const out = []
  const columns = [
    // { title: 'Source URL', field: 'url', formatter: 'link' }, WTF broken
    { title: 'Source', field: 'link', formatter: 'html', width: 100, widthGrow: 1 },
    { title: 'Time Loaded', field: 'doneAtString', widthGrow: 1 } // see http://tabulator.info/docs/4.1/format#format-builtin datetime maybe, but it needs moment
    // { title: 'Speed', field: 'loadDuration' } hide this until the gdoc2respec refactor fixes its time
  ]
  const id = 'sources-table'
  const sourceView = sources.map(({ url, link, urlAsLink, doneAtString, loadDuration }) =>
    ({ url, link, urlAsLink, doneAtString, loadDuration }))
  debug('sourceView %j', sourceView)
  out.push(`
<div id="${id}"></div>
<script>
new Tabulator("#${id}", {
    ${sources.length > 8 ? 'height: "12em",' : ''}
    paginationSize: 5,
    layout: "fitColumns",
    data: ${H.safe(JSON.stringify(sourceView, null, 2))},
    columns: ${JSON.stringify(columns, null, 2)}
});
</script>

<p>If you want to privately experiment with bookmarkable alternative views generated using a different source list, try <a href="./custom">Custom View of Credibility Signals</a>.</p>
`)
  return out
}

function otherSignals (sman) {
  const out = []
  let signals = Object.values(sman.byName)
  signals = signals.filter(s => !s.printed && s.name)
  // signals = signals.sort((a,b) => (
  for (const s of signals) {
    // really should call the main body of sectionFilter
    //
    // renamed sectionOut
    //
    out.push(H`<section>`)
    out.push(H`  <h2>Signal: ${s.name}</h2>`)
    out.push(...defsTable(s))
    out.push(H`</section>`)
  }
  return out
}

module.exports = gendoc
