const H = require('escape-html-template-tag')
const fs = require('fs').promises
const pkey = require('./pkey')
const debug = require('debug')('gendoc')
// const { Pattern } = require('/home/sandro/Repos/flextag-pattern')
// const { parse } = require('/home/sandro/Repos/flextag-parser')
const { glue } = require('./glue')

const allDefs = [] // require('./.out-signal-defs')
const more = require('./more')
const newsQ = []
const hier = [] // require('./.out-hier')
const moreh = require('./more-hier')
const byTitle = {}

/*
async function read() {
  const text = await fs.readFile('newsq.ft', 'utf8')
  const tags = [...parse(text)]
  // console.log({tags})

  const objs = {}   // id is .text
  const patternTexts = [
    `For the signal described as _text a suitable label or name or title is _label`,
    `For the signal described as _text the NewsQ field identifier is _id`,
    `For the signal described as _text one expected source is _source`,
    `For the signal described as _text the NewsQ signal reference number is _index`,
    `For the signal described as _text the methodology for measuring the signal is _methodology`
  ]
  const patterns = []
  for (const pt of patternTexts) {
    patterns.push(new Pattern(pt))
  }

  for (const tag of tags) {
    // console.log({tag: tag.toString()})
    for (const pattern of patterns) {
      // console.log('  %o', {pattern})
      const b = pattern.match(tag)
      if (b) {
        // glue (un-shred)
        let obj = objs[b.text]
        if (!obj) {
          obj = Object.assign(b)
          objs[b.text] = obj
          newsQ.push(obj)
        } else {
          Object.assign(obj, b)
        }
      }
    }
  }
  // console.log(newsQ)
}
*/

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
    const signal = obtainByTitle(rec.label)
    Object.assign(signal, rec)
    signal.title = signal.label
    if (!signal.defs) signal.defs = []
    signal.defs.push({text: rec.text, comments:{link: '<a href="https://credco.slack.com/archives/GQF2QL7U4/p1573581876001900" target="_blank">Nov 12</a> Connie', text:'good starting signal to figure out how to do this standardization thing'}})
      
    const group = obtainByTitle('Subject type: News Source')
    if (!group.subs) group.subs = []
    group.subs.push(signal)
    signal.hasParent = true 
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
    // out.push(H`<div><a class="edit" href="${edurl}"><img src="https://credweb.org/noun/noun_External%20Link_1107417g_16x16.png" width="16" height="16" alt="src"></a></div>`)

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
      out.push('    </tr>')
      if (comments[text]) {
        out.push('    <tr><td colspan="3">')

        if (s.source) {
          out.push(`<p><i>Source:</i> ${s.source}`)
          if (s.index && s.id) {
            out.push(` via <a href="https://api.newsq.net/signals/${s.index}/documentation">NewsQ (${s.id}</a>)`)
          }
           out.push(`</p>`)
        }

        if (s.demoOnly) {
          out.push(`<p><i>For Demonstration Purposes Only</i>.`)
          out.push(`</p>`)
        }
        
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

const schema = [
  `Item _key has the name or title _label`,
  `Within the NewsQ V1 API, item _key has field identifier _id`,
  `One expected source for the item _key is _source`,
  `Within the NewsQ V1 API, item _key has the signal reference number _index`,
  `Item _key is gathered with a methodology described like this: _methodology`,
  `Item _key has the description text _text`
]

/*
const schema = [
  `For the signal described as _text a suitable label or name or title is _label`,
  `For the signal described as _text the NewsQ field identifier is _id`,
  `For the signal described as _text one expected source is _source`,
  `For the signal described as _text the NewsQ signal reference number is _index`,
  `For the signal described as _text the methodology for measuring the signal is _methodology`
]
*/

const main = async () => {
  const newsqText = await fs.readFile('newsq2.ft', 'utf8')
  newsQ.push(...glue(newsqText, schema))
  // console.log({newsQ})
  const html = await gendoc(config)
  process.stdout.write(prefix + html + suffix)
}

main()
