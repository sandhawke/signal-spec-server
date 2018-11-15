const config = {
  useFile: 'cached.html',
  gdocID: process.env.GDOCID || '16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0',
  // gdocID: process.env.GDOCID || '1IzC6HrYaO3XNHAtXHsviZLEumhJDPl_S1--w_IYa68s',
  respec: {
    noRecTrack: true,
    edDraftURI: 'https://credweb.org/signals',
    specStatus: 'ED',  // need a CG ED
    prevED: 'https://credweb.org/signals-20181021',
    editors: [{
      name: 'TBD (initial version by Sandro Hawke)'
      // name: 'Sandro Hawke',
      // url: 'http://hawke.org/sandro'
    }],
    github: 'https://github.com/w3c/credweb',
    // Grrr https://github.com/w3c/respec/issues/1562
    // https://github.com/expath/expath-cg/issues/113
    shortName: 'not-published-as-TR',
    wg: 'Credible Web Community Group',
    wgURI: 'https://www.w3.org/community/credibility/'
  }
}

config.extraHead = `
<style type="text/css">
  table { border-collapse: collapse; } 
  td, th { border: 1px solid #aaaaaa; padding: 0.5em;  } 
  td p { margin: 0 } 
  table.inner { border: 1px solid red; padding: 0 }
  .science { background: yellow }
  a.edit[href] {
    margin-right: -1em;
    float: right;
    text-decoration: none;
    color: #555;
    border: none;
    padding: 0.3em;
  }
</style>
`

config.abstractHTML = 'This document specifies various types of information, called credibility signals, which are considered potentially useful in assessing credibility of online information.'
config.sotdHTML = `
    <div id="real-sotd" style="margin: 1em; border: 4px solid blue; padding: 1em">
    <p>This document is automatically assembled from a <strong><a href="https://docs.google.com/document/d/16xLtANKeVp6FVi_zU8JaCLiHImR_kq1K2B2ebwMP2k0">crowd-source Google doc</a></strong> and various data sources.  It may contain completely bogus content.  You may prefer the <b><a href=${config.respec.prevED}>most recent stable release</a></b></p>
    <hr/>

<p>Comments are welcome and are especially useful if they offer specific improvements which can be incorporated into future versions.  Please comment either by <a href="https://github.com/w3c/credweb/issues">raising a github issue</a> or making inline comments on the google doc (easily reached using the pencil 🖉 link in the right margin).  If neither of those options work for you, please email your comments to <a href="mailto:public-credibility-comments@w3.org">public-credibility-comments@w3.org</a> (<a href="https://lists.w3.org/Archives/Public/public-credibility-comments/">archive</a>, <a href="mailto:public-credibility-comments-request@w3.org?subject=subscribe">subscribe</a>).
</p>

    </div>
`

module.exports = config
