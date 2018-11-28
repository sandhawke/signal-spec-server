// const csv = require('csv-parse');
const fs = require('fs')

const str = fs.readFileSync('signals-per-study.csv')

// var obj = csv.toJSON(str, {headers: {included: true}});

const parse = require('csv-parse/lib/sync')
const records = parse(str, {
  columns: true })

console.log(JSON.stringify(records, null, 2))
