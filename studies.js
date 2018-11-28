const debug = require('debug')('studies')
const cnamify = require('cnamify')

//  {id:2, name:"Mary May", age:"1", gender:"female", height:2, col:"blue", dob:"14/05/1982", cheese:true}

const columns = [
  { title: 'Study', field: 'study' },
  { title: 'Signal Called', field: 'signal' },
  { title: 'IRR', field: 'irr' },
  { title: 'Rel Expts',
    field: 'rel expts',
    headerTooltip: 'The correlation to a baseline truth established by expert consensus (only applicable when experts agree)'
  },
  { title: 'p <',
    field: 'p<',
    headerTooltip: 'The maximimum probability value, indicating potential for statistical significance' },
  { title: '# obsr',
    field: 'number of observers',
    headerTooltip: 'The mean number of observers reporting for each signal' },
  { title: 'obsv per',
    field: 'number of observations per observer',
    headerTooltip: 'The mean number of observations made by each observer'
  }
]

const rows = require('./signals-per-study')

module.exports = (name, names) => {
  const id = 'studies-table-' + cnamify(name)
  const myRows = []
  if (name === 'all') {
    myRows.push(...rows)
  } else {
    for (const n of names) {
      debug('checking against name %j', n)
      myRows.push(...rows.filter(x => (x.signal === n)))
    }
    debug('filtered to %j rows, for %j', myRows.length, names)
  }

  const out = []
  if (myRows.length) {
    out.push(`
<div id="${id}"></div>
<script>
new Tabulator("#${id}", {
    ${myRows.length > 8 ? 'height: "12em",' : ''}
    paginationSize: 5,
    data: ${JSON.stringify(myRows, null, 2)},
    columns: ${JSON.stringify(columns, null, 2)}
});
</script>
`)
  }
  return out
}
