const debug = require('debug')('studies')
const cnamify = require('cnamify')

//  {id:2, name:"Mary May", age:"1", gender:"female", height:2, col:"blue", dob:"14/05/1982", cheese:true}

const columns = [
  // {title:"Signal", field:"signal"},
  // {title:"Study", field:"study"},
  {title:"IRR", field:"irr"},
  {title:"Rel Expts", field:"rel expts"},
  {title:"p <", field:"p<"},
  {title:"# obsr", field:"number of observers"},
  {title:"obsv/obsr", field: "number of observations per observer"}
]

const rows = require('./signals-per-study')


module.exports = (name, names) => {
  const id = 'studies-table-' + cnamify(name)
  const myRows = []
  for (const n of [names]) {
    debug('checking against name %j', n)
    myRows.push(...rows.filter(x => (x.signal === n)))
  }
  debug('filtered to %j rows, for %j', myRows.length, names)
  
  const out = []
  out.push(`
<div id="${id}"></div>
<script>
new Tabulator("#${id}", {
    height: 200,
    data: ${JSON.stringify(myRows, null, 2)}
    columns: ${JSON.stringify(columns, null, 2)}
});
</script>
`)
  return out
}
