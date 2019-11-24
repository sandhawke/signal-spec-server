const H = require('escape-html-template-tag')
const fs = require('fs').promises
const pkey = require('./pkey')
const debug = require('debug')('gendoc')
const { glue } = require('./glue')

let idCount = 0 // quick hack
const secNoArray = [0]

const defs = []   // { description, label, comment, commentSource, source, ... }

// const hier = [] // require('./.out-hier')
// const moreh = require('./more-hier')

const defaultSection = 'Signal Definitions'
const s2 = 'Signal Qualities'
const sections = [
  /*
  { title: 'Unified Risk Score',
    parent: 'Group1'
  },
  { title: 'Group1', parent: 'Group2' },
  { title: 'Other', parent: 'Group2' },
  */
  { title: 'Introduction' },
  { title: s2 },
  { title: defaultSection },

  // These should get filled in with the labels/defs that are tagged as having
  // these qualitied, according to sources.  Sources like [NewsQ 2019] or
  // [Credible Web CG 2019-11-03]  --- link to meeting minutes.
  //    RESOLVED: fooo    is a tag issued by the meeting.
  
  { title: 'Easy to understand', parent: s2 },
  { title: 'Easy to for humans to measure', parent: s2 },
  { title: 'Easy to for machines to measure', parent: s2 },
  { title: 'Readily Available', parent: s2 },
  { title: 'Hard to Game', parent: s2 },
  { title: 'Interoperable', parent: s2 },
  { title: 'Promising', parent: s2 },
  { title: 'Validated', parent: s2 },
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
  const toc = []
  let prevLevel = 1

  for (const def of defs) {
    if (!sectionForDef(def)) {
      sections.push( {title: def.label || 'Misc', parent: defaultSection } )
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

  while(prevLevel > 1) {
    toc.push('</li></ol>')
    prevLevel--
  }
  return {
    toc: toc.map(x => x.toString()).join('\n'),
    sections: out.map(x => x.toString()).join('')
  }
  
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

    const defLines = defsTable(s)
    if (defLines.length === 0 && s.title === 'Misc') return []

    // improve this, please
    s.id = 'sec' + (++idCount)

    if (s.hLevel > prevLevel) {
      toc.push('<ol class="toc"><li class="tocline">')
      secNoArray.push(1)
    } else if (s.hLevel < prevLevel) {
      toc.push('</li></ol>')
      secNoArray.pop()
    } else {
      secNoArray[secNoArray.length - 1]++
      toc.push('</li><li class="tocline">')
    }
    prevLevel = s.hLevel
    s.secno = secNoArray.join('.')

    toc.push(`<a class="tocxref" href="#${s.id}"><bdi class="secno">${s.secno}. </bdi>${s.title}</a>`)
             
    out.push(`<h${s.hLevel} id="${s.id}">${spans.join('')}<bdi class="secno">${s.secno}. </bdi>${s.title}</h${s.hLevel}>`)
    out.push('')

    out.push(...defLines)

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

  const {toc, sections} = await gendoc(config)
  let html = await fs.readFile('template.html', 'utf8')
  html = html.replace(/@@TITLE/g, 'Credibility Signals')
  const now = new Date()
  html = html.replace(/@@DATELONG/g, now.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric'}))
  html = html.replace(/@@DATEISO/g, now.toISOString().substr(0,10))
  html = html.replace('@@TOC', toc)
  html = html.replace('@@BODY', sections)
  process.stdout.write(html)
}

main()
