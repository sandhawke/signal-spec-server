const crypto = require('crypto')

function c14n (text) {
  text = text.normalize('NFC')
  text = text.toLowerCase()
  text = text.trim()
  text = text.replace(/\s+/g, ' ')

  // This is the one bit that's not obvious, I think, and gets into
  // the arbitrary.  I'm not sure this is right, and it's going to be
  // hard to ever change.  But I have this idea about how the stuff in
  // the brackets is really where coders declare they API they want to
  // use, the field names and data types they want.  So they should be
  // able to change that part.  It's not part of the semantics.
  text = text.replace(/\[.*?]/g, '[]')

  return text
}

function hash (text) {
  text = c14n(text)
  const hash = crypto.createHash('sha256')
  hash.update(text)
  return hash.digest('base64').slice(0, 6).replace('+', '-').replace('/', '_')
}

function hash16 (text) {
  text = c14n(text)
  const hash = crypto.createHash('sha256')
  hash.update(text)
  return hash.digest('hex').slice(0, 8)
}

// hash.update('some data to has    h');
// console.log(hash.digest('base64'));

/*
const samples = [
  '',
  ' ',
  '  ',
  'a',
  ' a',
  ' a  ',
  ' ab ',
  'ab',
  'a b',
  'a  b',
  'a   b',
  '  a   b  ',
  '\n\r\ta   b\n\n'
]

for (const s of samples) {
  if (c14n(s) !== c14n(c14n(s))) throw Error()
  const o = { s, c: c14n(s), h: hash(s) }
  console.log(JSON.stringify(o, null, 2))
}
*/

module.exports = { hash, hash16, c14n }
