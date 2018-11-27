#!/usr/bin/env node   

const nock = require('nock')
const path = require('path')
const gendoc = require('./gendoc')

// nock.recorder.rec()

nock.disableNetConnect()

function replies (filename) {
  return path.join(__dirname, 'test/replies', filename)
}

/*

cd test/replies

curl -o zhang18.nq https://data.credweb.org/static/zhang18

curl -o sheet-2pac.csv 'https://docs.google.com:443/spreadsheets/d/e/2PACX-1vTIzdqEXc2XmYgjqbzHuklxRbqxFXfjuxazSdMZhkFIAJ1GhO1BU3g4ALoOe6HO_riVcDpT8hEhvU5w/pub?output=csv'

curl -o gdoc.html 'https://docs.google.com:443/document/export?id=16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0&format=html'

*/

nock('https://docs.google.com:443', {"encodedQueryParams":true})
    .get('/spreadsheets/d/e/2PACX-1vTIzdqEXc2XmYgjqbzHuklxRbqxFXfjuxazSdMZhkFIAJ1GhO1BU3g4ALoOe6HO_riVcDpT8hEhvU5w/pub')
    .query({"output":"csv"})
    .replyWithFile(200, replies('sheet-2pac.csv'), { 'Content-Type': 'text/csv' })

nock('https://data.credweb.org:443', {"encodedQueryParams":true})
  .get('/static/zhang18')
  .replyWithFile(200, replies('zhang18.nq'), { 'Content-Type': ''})

nock('https://docs.google.com:443', {"encodedQueryParams":true})
  .get('/document/export')
  .query({"format":"html","id":"16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0"})
  .replyWithFile(200, replies('gdoc.html'), { 'Content-Type': 'text/html'})

// scope.isDone()

gendoc().then(text => {
  // write text to test/out-static.html
  // then compare it?
  console.log(text)
})
