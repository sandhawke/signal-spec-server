#!/usr/bin/env node

const test = require('tape')
const nock = require('nock')
const path = require('path')
const fs = require('fs').promises
const { gendoc } = require('..')

// nock.recorder.rec()

nock.disableNetConnect()

function file (...parts) {
  return path.join(__dirname, ...parts)
}

test('full', async t => {
  /*
    Prepare results with:

    cd test/replies
    curl -o zhang18.nq https://data.credweb.org/static/zhang18
    curl -o sheet-2pac.csv 'https://docs.google.com:443/spreadsheets/d/e/2PACX-1vTIzdqEXc2XmYgjqbzHuklxRbqxFXfjuxazSdMZhkFIAJ1GhO1BU3g4ALoOe6HO_riVcDpT8hEhvU5w/pub?output=csv'
    curl -o gdoc.html 'https://docs.google.com:443/document/export?id=16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0&format=html'
  */

  nock('https://docs.google.com:443', { 'encodedQueryParams': true })
    .get('/spreadsheets/d/e/2PACX-1vTIzdqEXc2XmYgjqbzHuklxRbqxFXfjuxazSdMZhkFIAJ1GhO1BU3g4ALoOe6HO_riVcDpT8hEhvU5w/pub')
    .query({ 'output': 'csv' })
    .replyWithFile(200, file('replies', 'sheet-2pac.csv'), { 'Content-Type': 'text/csv' })

  nock('https://data.credweb.org:443', { 'encodedQueryParams': true })
    .get('/static/zhang18')
    .replyWithFile(200, file('replies', 'zhang18.nq'), { 'Content-Type': '' })

  nock('https://docs.google.com:443', { 'encodedQueryParams': true })
    .get('/document/export')
    .query({ 'format': 'html', 'id': '16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0' })
    .replyWithFile(200, file('replies', 'gdoc.html'), { 'Content-Type': 'text/html' })

  const text = await gendoc()
  await fs.writeFile(file('out', 'full.html'), text, 'utf8')
  // t.comment('wrote ' + file('out', 'full.html'))
  console.log('wrote ', file('out', 'full.html'))
  t.pass()
  t.end()
})