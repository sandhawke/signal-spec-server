const crypto = require('crypto');

function c14n (text) {
  text = text.normalize('NFC')
  text = text.toLowerCase()
  text = text.trim()
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/\[.*?]/g, '[]')
  return text
}

function hash (text) {
  text = c14n(text)
  const hash = crypto.createHash('sha256');
  hash.update(text)
  return hash.digest('base64').slice(0,6).replace('+','-').replace('/', '_')
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

module.exports = { hash, c14n }
