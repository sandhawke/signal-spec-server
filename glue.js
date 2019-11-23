const { Pattern } = require('/home/sandro/Repos/flextag-pattern')
const { parse } = require('/home/sandro/Repos/flextag-parser')

function glue(text, patternTexts) {
  const out = []
  const tags = [...parse(text)]
  // console.log({tags})

  const objs = {}   // id is .text
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
          out.push(obj)
        } else {
          Object.assign(obj, b)
        }
      }
    }
  }
  return out
}

module.exports = { glue }
