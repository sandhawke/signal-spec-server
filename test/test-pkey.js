const { hash, c14n } = require('../pkey')
const test = require('tape')

test(t => {
  const samples = [
    '',
    ' ',
    '  ',
    '  \t',
    '  \n\r',
    '\n',
    `
`]
  for (const s of samples) {
    t.equal(hash(s), '47DEQp')
  }
  t.end()
})

test(t => {
  const samples = [
    'a',
    'a ',
    ' a',
    ' a \t',
    '  a \n\r',
    '\na',
    `a
`]
  for (const s of samples) {
    t.equal(hash(s), 'ypeBEs')
  }
  t.end()
})

test(t => {
  const samples = [
    'a b',
    'a  B',
    ' a b',
    ' A \tb',
    '  a \nb\r',
    '\nA B',
    `a

b
`]
  for (const s of samples) {
    t.equal(hash(s), 'yGh6CK')
  }
  t.end()
})

test(t => {
  const samples = [
    'a b [hello]',
    'a  b [hello there]',
    ' a b []',
    ' a \tb [something \nelse] ',
    '  a b\n[even open again [\n\n]',
    `a b
[ something 
and 
something else
]


`
]
  for (const s of samples) {
    // console.log(c14n(s))
    t.equal(hash(s), '0oov3M')
  }
  t.end()
})
