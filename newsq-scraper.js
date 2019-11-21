// set end of file for setup

const cheerio = require('cheerio')
const fs = require('fs')

const recs = []

async function main() {
  for (let i = 0; i < 200; i++) {
    let text
    try {
      text = await fs.promises.readFile(`newsq-signals/${i}.html`, 'utf8')
    }
    catch (e) {
      continue
    }
    const $ = cheerio.load(text)
    
    const label = $('.panel-body h2').text().replace(/Signal - (.*)/, '$1')

    let firstBatch = [23, 24, 25, 29, 28, 11, 43].includes(i)
    let id
    let source
    $('.panel-body > p').each(function () {
      const text = $(this).text()
      let m
      if ((m = text.match(/Signal Name: (.*)\n/)) && m) {
        id = m[1]
      } else if ((m = text.match(/Source: (.*)\n/)) && m) {
        source = m[1]
      } else {
        console.error('Unknown panel line', text)
      }
    })

    const cTitle = $('.panel-body .content h3').text()
    if (cTitle !== 'Description') {
      console.error('Skipping, since title is not "Description", item', i)
      continue
    }
    // const cPara = $('.panel-body .content p').first().text()
    const body = []
    let expectedOutput
    let methodology
    let demoOnly
    let alexa
    $('.panel-body .content p').each(function () {
      const html = $(this).html()
      let m
      if ((m = html.match(/.*Expected Ou.*>:?\s*(.*)/s)) && m) {
        expectedOutput = m[1]
      } else if ((m = html.match(/.*Methodology.*>?:?\s*(.*)/s)) && m) {
        methodology = m[1]
      } else if (html === 'For Demonstration Purposes Only:') {
        demoOnly = true
      } else if (html === 'For Demonstration Only:') {
        demoOnly = true
      } else if (html === 'More info: <a href="https://support.alexa.com/hc/en-us/articles/200449744-How-are-Alexa-s-traffic-rankings-determined-">https://support.alexa.com/hc/en-us/articles/200449744-How-are-Alexa-s-traffic-rankings-determined-</a>') {
        alexa = true
      } else {
        body.push(html)
      }
    })
    if (body.length !== 1) {
      // console.log({index: i, label, id, body, expectedOutput, methodology, demoOnly})
    }

    recs.push({index: i, firstBatch, label, id, source, body, expectedOutput, methodology, demoOnly, alexa})
    /*
    $('.panel-body .content').children().each(function () {
      console.log('  - %o', this.type, this.name, $(this).text())
    }) */
  }
  console.log(JSON.stringify(recs, null, 2))
  console.error(recs.length, 'records written')
}

main()

/*

1. Login as necessary to view https://api.newsq.net/signals/
2. Use browser network panel "fetch as curl" to get cookies
3. cd newsq-signals
4. for n in `seq 0 200`; do echo $n; curl https://api.newsq.net/signals/$n/documentation -o $n.html [cookie stuff]; done

*/
