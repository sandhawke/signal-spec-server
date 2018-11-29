const express = require('express')
// const debug = require('debug')('routes')
const H = require('escape-html-template-tag') // H.safe( ) if needed
// const querystring = require('querystring')
const gendoc = require('./gendoc')
const configFromFile = require('./config')

const router = express.Router()

router.use('/static', express.static('static', {
  extensions: ['html', 'png', 'trig', 'nq', 'ttl', 'json', 'jsonld'],
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.trig')) res.set('Content-Type', 'application/trig')
  }
}))

router.get('/custom', async (req, res, next) => {
  res.send('' + H`<html><head></head></body>

<h2>Custom View of Credibility Signals</h2>
<p>Use this page to set up a custom version of Credibility Signals, based on different input data.  (In the future, we may offer other customizations. You can also download <a href="https://github.com/sandhawke/signal-spec-server">the source</a> to this viewer.)<p>

<p>We suggest you:</p>
<ol>
<li>Visit <a target="_blank" href="${configFromFile.sourceList}">the default source list</a> spreadsheet</li>
<li>Make your own copy, using: File >> Make A Copy...</li>
<li>On your copy: Share >> Get Shareable link >> Anyone with the link <b>can view</b> >> Copy Link </li>
<li>Paste that link here, in the box below</li>
<li>Read the rest of these instructions before you press enter</li>
<li>Bookmark the resulting page. You shouldn't need to come back to this form.</li>
</ol>

<p>If that works, you can start changing the sources listed in your copy of the spreadsheet and reload your bookmarked custom version.</p>

<form action="${configFromFile.siteurl || req.appmgr.siteurl}" method="get">
Source List URL: <input size="80" type="text" name="src"></input>
</form>
</body></html>
`)
})

router.get('/', async (req, res, next) => {
  const config = Object.assign({}, configFromFile)

  // the siteurl probably comes from appmgr which gets it via process.env
  if (!config.siteurl) {
    config.siteurl = req.appmgr.siteurl
  }

  if (req.query.src) {
    config.sourceList = req.query.src
    console.log('Using alternate src %j', config.sourceList)
  }

  // needs error handling
  // also, needs to cache result or something!  (but depends on sourceList, etc)

  res.send(await gendoc(config))
})

module.exports = router
