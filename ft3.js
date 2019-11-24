const H = require('escape-html-template-tag')
const fs = require('fs').promises
const pkey = require('./pkey')
const debug = require('debug')('gendoc')
const { glue } = require('./glue')

const defs = []   // { description, label, comment, commentSource, source, ... }

// const hier = [] // require('./.out-hier')
// const moreh = require('./more-hier')

const sections = [
  { title: 'Unified Risk Score',
    parent: 'Group1'
  },
  { title: 'Group1', parent: 'Group2' },
  { title: 'Other', parent: 'Group2' },
  { title: 'Group2' }
]
const defsDone = new Set()

function sectionForDef (def) {
  for (const section of sections) {
    if (def.label === section.title) return section
  }
  return undefined
}

async function gendoc (config) {
  if (!config) throw Error('gendoc missing config')
  const out = []

  for (const def of defs) {
    if (!sectionForDef(def)) {
      sections.push( {title: def.label || 'Misc', parent: 'Other' } )
    }
  }
  
  for (const item of sections) {
    if (item.parent === undefined) out.push(...section(item, [item]))
  }

  for (const def of defs) {
    if (defsDone.has(def.description)) continue
    console.error('\n\n\ndidnt do', def)
  }

  console.error({sections})

  
  return out.map(x => x.toString()).join('')
  
  
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

    out.push(...defsTable(s))    

    if (path.length > 10) {
      out.push('<h1>LOOP IN CATEGORIES</h1>')
      console.error('loop', s)
    } else {
      for (const sub of sections) {
        if (sub.parent === s.title) out.push(...section(sub, path.concat([sub])))
      }
    }
    
    out.push('</section>\n')
    return out
  }
}


function defsTable (s) {
  const out = []

  const defTexts = new Set()
  for (const def of defs) {
    if (def.label === s.title) defTexts.add(def.description)
  }
  
  if (defTexts.size === 0) return []
  
  out.push('<table>')
  out.push('  <thead>')
  out.push('    <tr>')
  out.push(H`      <th>Ref</th>`)
  out.push(H`      <th>Definition</th>`)
  out.push('    </tr>')
  out.push('  </thead>')
  out.push('  <tbody>')

  /*
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
    */
  for (const defText of defTexts.values()) {
    defsDone.add(defText)
    out.push('    <tr>')
    const k = pkey.hash16(defText)
    out.push(H`      <td id="${k}"><a href="#${k}" style="font-size: 75%">${k}<a></td>`)
    out.push(H`      <td style="white-space: pre-line">${defText}</td>`)
    /*
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
    */
    out.push('    </tr>')
    
    const comm = []

    for (const entry of defs) {
      if (entry.description !== defText) continue
      
      if (entry.source) {
        comm.push(`<p><i>Expected data source:</i> ${entry.source}`)
        if (entry.index && entry.id) {
          comm.push(` via <a href="https://api.newsq.net/signals/${entry.index}/documentation">NewsQ (${entry.id}</a>)`)
        }
        comm.push(`</p>`)
      }
      
      if (entry.demoOnly) {
        comm.push(`<p><i>For Demonstration Purposes Only</i>.`)
        comm.push(`</p>`)
      }

      if (entry.comment) {
        comm.push(H`<p><i>Comment from</i> ${entry.commentSource}: ${entry.comment}</p>`)
      }
    }
    //comm.push('    </ul>')

    if (comm.length) out.push('    <tr><td colspan="2">',
                              '      <p style="text-align: center"><i>Notes (not normative):</i></p>',
                              ...comm,
                              '</td></tr>')

  }
  out.push('  <tbody>')
  out.push('</table>')
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
  `Item _key has a label _label`,
  `Within the NewsQ V1 API, item _key has field identifier _id`,
  `One expected source for the item _key is _source`,
  `Within the NewsQ V1 API, item _key has the signal reference number _index`,
  `Item _key is gathered with a methodology described like this: _methodology`,
  `Item _key has the description text _description`,
  `About item _key a source _commentSource made the comment _comment`
]

const main = async () => {
  const newsqText = await fs.readFile('newsq2.ft', 'utf8')
  defs.push(...glue(newsqText, schema))
  // console.log({newsQ})

  defs.push(...glue(await fs.readFile('more.ft', 'utf8'), schema))
  console.error({defs})

  const html = await gendoc(config)
  process.stdout.write(prefix + html + suffix)
}

main()


/// find all defs with that label

/// find all defs with no label? or no label in the hierarchy?

