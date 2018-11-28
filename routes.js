const express = require('express')
// const debug = require('debug')('routes')
// const H = require('escape-html-template-tag') // H.safe( ) if needed
// const querystring = require('querystring')
const doc = require('./gendoc')

const router = express.Router()

router.get('/', async (req, res, next) => {
  res.send(await doc())
})

module.exports = router
