#!/usr/bin/env node

const gendoc = require('./gendoc')
const config = require('./config')

if (process.env.SOURCELIST) config.sourceList = process.env.SOURCELIST

gendoc(config).then(text => {
  console.log(text)
})
