const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { helpBasePath } = require('../base.js');

function parseElement(url) {
  const $ = cheerio.load(fs.readFileSync(url));
  const name = $('h3.refentrytitle span.structname').text().replace(/(\s|\n)+/g, ' ').trim();
  const detail = $('div.refnamediv b.refpurpose').text().replace(/(\s|\n)+/g, ' ').trim();
  return {
    match: name,
    detail,
    url: path.relative(helpBasePath, url).replace(/\\/g, '/'),
  };
}

function getElements() {
  const ret = [];
  const $ = cheerio.load(fs.readFileSync(`${helpBasePath}/ans_elem/Hlp_E_LIBRARY.html`));
  $('div.highlights > ul > li > a').toArray().forEach((v) => {
    if ($(v).text().includes('-')) {
      // mpc184-*
      return;
    }
    ret.push(parseElement(`${helpBasePath}/ans_elem/${v.attribs['href']}`));
  });
  return ret;
}

/**
 * 
 * @param {cheerio.CheerioAPI} $ 
 * @param {string} baseurl 
 * @param {Command} cmd 
 */
module.exports = function ($, baseurl, cmd) {
  console.log(`${cmd.name}<fixed>`);

  let options = cmd.options;
  while (cmd.params[options.index] !== 'Ename') {
    options = options.next;
  }
  options.options = getElements();
  return cmd;
};

