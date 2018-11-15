const gendoc = require('./gendoc')

gendoc().then(text => {
  console.log(text)
})
