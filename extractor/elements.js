const cheerio = require('cheerio');
const fs = require('fs');
const { helpBasePath } = require('./base.js');

function parseElement(url) {
  const $ = cheerio.load(fs.readFileSync(url));
  const name = $('h3.refentrytitle span.structname').text().replace(/(\s|\n)+/g, ' ').trim();
  const detail = $('div.refnamediv b.refpurpose').text().replace(/(\s|\n)+/g, ' ').trim();
  return {
    name,
    detail
  };
}

const ret = [];
const $ = cheerio.load(fs.readFileSync(`${helpBasePath}/ans_elem/Hlp_E_LIBRARY.html`));
$('div.highlights > ul > li > a').toArray().forEach((v) => {
  if ($(v).text().includes('-')) {
    // mpc184-*
    return;
  }
  ret.push(parseElement(`${helpBasePath}/ans_elem/${v.attribs['href']}`));
});

console.log("\\\\b(?i)(" + ret.map((v) => v.name).join('|') + ")\\\\b");

fs.writeFileSync('src/elements.json', JSON.stringify(ret));
