const cheerio = require('cheerio');
const assert = require('assert');
const { helpBasePath, markdown } = require('../base.js');

/**
 * 
 * @param {cheerio.CheerioAPI} $ 
 * @param {string} baseurl 
 * @param {Command} cmd 
 */
module.exports = function ($, baseurl, cmd) {
  console.log(`${cmd.name}<fixed>`);

  const options = $('div.refsynopsisdiv > p').toArray().map((v) => {
    const doms = $(v).find('em.replaceable, code.literal');
    const [_, value] = /^ *= *(\w+)/.exec(doms[0].next.data);
    const paramNames = doms.toArray().filter((v) => /,\s*$/.test(v.prev.data)).map((v) => $(v).text().trim());
    paramNamesUpper = paramNames.map((v) => v.toUpperCase());
    const paramDetails = {
      match: value,
      detail: markdown($(v).html(), baseurl),
      params: paramNames,
    };
    let paramDetailsCur = paramDetails;
    $(v).next().find('> div.variablelist > dl > dt').toArray().forEach((v) => {
      const labels = $(v).find('em.replaceable, code').toArray().map((v) => $(v).text()).join(',').split(',').map((v) => v.trim()).filter((v) => v);
      // console.log(labels);
      assert(labels.length > 0);
      const paramUpper = labels[0].toUpperCase();
      const lastbegin = paramDetailsCur.index - 1;
      let index = paramNamesUpper.indexOf(paramUpper, lastbegin + 1) + 1;
      assert(index > 0);
      const newOption = {};
      paramDetailsCur.next = newOption;
      paramDetailsCur = newOption;
      const next = $(v).next();
      paramDetailsCur.detail = markdown(next.html(), baseurl);
      paramDetailsCur.index = index;
    });
    return paramDetails;
  });
  return {
    ...cmd,
    options: {
      index: 0,
      options,
    }
  };
};

if (require.main === module) {
  const path = require('path');
  const url = `${helpBasePath}/ans_cmd/Hlp_C_SECMODIF.html`;
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(require('fs').readFileSync(url));
  console.log(JSON.stringify(module.exports($, baseurl, { name: 'SECMODIF' }), undefined, 1));
}