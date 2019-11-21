const H = require('escape-html-template-tag')
const fs = require('fs').promises
const pkey = require('./pkey')
const debug = require('debug')('gendoc')

const allDefs = [] // require('./.out-signal-defs')
const more = require('./more')
const newsQ = require('./.out-newsq')
const hier = [] // require('./.out-hier')
const moreh = require('./more-hier')
const byTitle = {}

async function gendoc (config) {
  const out = []
  if (!config) throw Error('gendoc missing config')

  function obtainByTitle (title) {
    if (title === '') throw Error('Null title')
    let obj = byTitle[title]
    if (obj) return obj
    obj = {title}
    byTitle[title] = obj
    return obj
  }
  
  // build tree out of hier pairs
  for (const rec of hier.concat(moreh)) {
    const group = obtainByTitle(rec.groupTitle)
    const item = obtainByTitle(rec.itemTitle)
    if (!group.subs) group.subs = []
    group.subs.push(item)
    item.hasParent = true
  }

  // put the defs all into their signals
  for (const def of allDefs.concat(more)) {
    if (def.signalTitle) {
      const signal = obtainByTitle(def.signalTitle)
      if (!signal.defs) signal.defs = []
      signal.defs.push(def)
    } else {
      console.error('No signal title for', def.text.slice(0,80))
    }
  }

  // and newsQ
  for (const rec of newsQ) {
    if (rec.firstBatch) {
      const signal = obtainByTitle(rec.label)
      Object.assign(signal, rec)
      signal.title = signal.label
      if (!signal.defs) signal.defs = []
      console.error('BODY', rec.body)
      let text = rec.body.join('\n\n')
      if (rec.Methodology) {
        text += '\n\n Methodology: ' + rec.Methodology
      }
      if (rec.expectedOutput) {
        text += '\n\n Expected Output: ' + rec.expectedOutput
      }
      text = (text
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .replace(/&#x2019;/g, "'")
             )
      signal.defs.push({text, comments:{link: 'Connie 11/12/19', text:'good starting signal to figure out how to do this standardization thing'}})
      
      const group = obtainByTitle('Subject type: News Source')
      if (!group.subs) group.subs = []
      group.subs.push(signal)
      signal.hasParent = true 
    } 
  }
  
  for (const item of Object.values(byTitle)) {
    if (item.hasParent) continue
    console.error('ROOT', item)
    out.push(...section(item, [item]))
  }
  // console.error(byTitle)
  
  // do sections...
  return out.map(x => x.toString()).join('')

  // return text

  function section (s, path) {
    const out = []
  
    out.push('\n<section>')
    const spans = []
    /*
    for (const id of s.otherIds) {
      // make HTML targets for all our aliases
      spans.push(`<span id="${id}"></span>`)
    }
    */
    s.hLevel = path.length

    if (!s.hLevel) throw Error('no hLevel WTF ' + JSON.stringify(s))
    if (!s.title) throw Error('no title WTF ' + JSON.stringify(s))
    out.push(`<h${s.hLevel} id="${s.id}">${spans.join('')}${s.title}</h${s.hLevel}>`)
    out.push('')

    // make a link to our relevant source doc
    //
    // what if we have multple source docs, eg for subsection inclusion?
    const edurl = `https://docs.google.com/document/d/${config.gdocID}/edit#heading=${s.id}`
    // ISSUE: pencil glyph is fairly rare, often renders as unknown-unicode
    // out.push('<div><a class="edit" href="' + edurl + '">🖉</a></div>')

    // yes, I paid the $1.99 for no-credit usage
    out.push(H`<div><a class="edit" href="${edurl}"><img src="${config.siteurl}/static/noun_External%20Link_1107417g_16x16" width="16" height="16" alt="src"></a></div>`)

    out.push(...defsTable(s))    

    if (s.isSignal) {
      // lines.push(`[Data about signal ${name} will be inserted here]`)
      debug('calling studies with name=%j signal=%j', s.name, s)
      // out.push(...studiesTable(s.name, s.aliases))
      // out.push(...datasets.usageReport(s))
    }


    if (path.length > 10) {
      out.push('<h1>LOOP IN CATEGORIES</h1>')
      console.error('loop', s)
    } else {
      if (s.subs) {
        for (const sub of s.subs) {
          out.push(...section(sub, path.concat([sub])))
        }
      }
    }
    
    out.push('</section>\n')
    return out
  }
}

// let refseq=1000

// s is a Section, as per section.js, managed by sman
function defsTable (s) {
  // use s.defs {key, text, by} from section.parseTable() and other places
  const out = []
  if (s.defs && s.defs.length) {
    out.push('<table>')
    out.push('  <thead>')
    out.push('    <tr>')
    out.push(H`      <th>Ref</th>`)
    out.push(H`      <th>Definition</th>`)
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
    // if (didStuff) console.error('TAGS', tags)

    for (const text of Object.keys(tags).sort()) {
      out.push('    <tr>')
      const k = pkey.hash16(text)
      out.push(H`      <td id="${k}"><a href="#${k}" style="font-size: 75%">${k}<a></td>`)
      out.push(H`      <td style="white-space: pre-line">${text}</td>`)
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

// module.exports = gendoc

const config = require('./config')

const prefix = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Credibility Signals</title>
<style type="text/css">
  table { border-collapse: collapse; } 
  td, th { border: 1px solid #aaaaaa; padding: 0.5em;  } 
  td p { margin: 0 } 
  table.inner { border: 1px solid red; padding: 0 }
  .science { background: yellow }
  a.edit[href] {
    margin-right: -1em;
    float: right;
    text-decoration: none;
    color: #555;
    border: none;
    padding: 0.3em;
  }
</style>
<script>
function openup(i) {
  document.getElementById(i+'-up').style.display='none';
  document.getElementById(i+'-down').style.display='inline';
  document.getElementById(i+'-body').style.display='block';
}
function closeup(i) {
  document.getElementById(i+'-up').style.display='inline';
  document.getElementById(i+'-down').style.display='none';
  document.getElementById(i+'-body').style.display='none';
}
</script>
<link href="https://unpkg.com/tabulator-tables@4.1.2/dist/css/tabulator.min.css" rel="stylesheet">
<script type="text/javascript" src="https://unpkg.com/tabulator-tables@4.1.2/dist/js/tabulator.min.js"></script>

  <script src="https://www.w3.org/Tools/respec/respec-w3c-common" class="remove">
  </script>
  <script class="remove">
  var respecConfig = {
    "noRecTrack": true,
    "edDraftURI": "https://credweb.org/signals",
    "specStatus": "UN",
    "editors": [
        {
            "name": "Sandro Hawke"
        }
    ],
    "github": "https://github.com/w3c/credweb",
    "wg": "Credible Web Community Group",
    "wgURI": "https://www.w3.org/community/credibility/"
}
  </script>
</head>
<body>
  <div id="abstract">This document specifies various types of information, called credibility signals, which are considered potentially useful in assessing credibility of online information.</div>
  <div id="sotd"><b>@@ In Progress - Not Fully Published</b></div>
<section><h1 id="intro">Introduction</h1>
<p>TBD.</p>
</section>
`
const suffix = `
</body></html>`

const main = async () => {
  const html = await gendoc(config)
  process.stdout.write(prefix + html + suffix)
}

main()
