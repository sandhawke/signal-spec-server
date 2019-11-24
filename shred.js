const { fill } = require('/home/sandro/Repos/flextag-pattern')

function shred (obj, pats) {
  const out = []
  for (const pat of pats) {
    const res = fill(pat, obj)
    if (res === false) continue
    out.push(res)
  }
  return out.join('.\n') + '.\n\n'
}

module.exports = { shred }
