const cheerio = require('cheerio');
const assert = require('assert');
const { helpBasePath, parseOptions, markdown } = require('../base.js');

/**
 * 
 * @param {cheerio.CheerioAPI} $ 
 * @param {string} baseurl 
 * @param {Command} cmd 
 */
module.exports = function ($, baseurl, cmd) {
  console.log(`${cmd.name}<fixed>`);

  let options = cmd.options;
  while (cmd.params[options.index] !== 'Method') {
    options = options.next;
  }

  options.next = undefined;
  const paramNamesUpper = cmd.params.map((v) => v.toUpperCase());

  $('div.refsect1[title="Argument Descriptions"] > p').toArray().forEach((p) => {
    const optionNext = {
      index: options.index,
    };
    let paramDetailsCur = optionNext;

    const table = $(p).next().find('> table > tbody > tr').toArray();
    if (table.length > 0) {
      // table
      optionNext.next = {
        index: optionNext.index + 1,
        options: table.map((v) => {
          const tds = $(v).find('> td').toArray();
          // *SMAT
          if(tds.length !== 6 || $(tds[5]).text() === 'Description') {
            return;
          }
          const ret = {
            match: $(tds[0]).text(),
            detail: markdown($(tds[5]).html(), baseurl),
          };
          let cur = ret;
          for (let i = 1; i < tds.length - 1; ++i) {
            const option = $(tds[i]).find('> table > tbody > tr').toArray().map((v) => {
              const [match, detail] = $(v).text().split('-');
              return {
                match: match.trim(),
                detail: detail?.trim(),
              };
            });
            $(tds[i]).find('> table').remove();
            const next = {
              index: optionNext.index + i + 1,
              detail: markdown($(tds[i]).html(), baseurl),
              options: option.length > 0 ? option : undefined,
            };
            cur.next = next;
            cur = next;
          }
          return ret;
        }).filter((v) => v),
      };
    } else {
      // variablelist
      $(p).next().find('> div.variablelist > dl > dt').toArray().forEach((v) => {
        const labels = $(v).find('em.replaceable, code').toArray().map((v) => $(v).text()).join(',').split(',').map((v) => v.trim()).filter((v) => v);
        assert(labels.length > 0);
        const paramUpper = labels[0].toUpperCase();
        const lastbegin = paramDetailsCur.index;
        let index = paramNamesUpper.indexOf(paramUpper, lastbegin + 1);
        assert(index > 0);
        const newOption = {};
        paramDetailsCur.next = newOption;
        paramDetailsCur = newOption;
        const next = $(v).next();
        const options = parseOptions(next, $);
        paramDetailsCur.options = options?.map(([k, v]) => ({
          match: k,
          detail: markdown(v, baseurl),
        }));
        const $detail = cheerio.load(next.html());
        $detail('body > div > div.variablelist , body > table > tbody > tr').remove();
        paramDetailsCur.detail = markdown($detail.html(), baseurl);
        paramDetailsCur.index = index;
      });
    }

    $(p).find('em.replaceable').toArray().slice(1).forEach((par) => {
      const match = /^\s*=\s*(\w+)/.exec(par.next.data)[1];
      const option = options.options.find((v) => v.match === match);
      assert(option);
      option.next = optionNext.next;
    });

  });

  return cmd;
};

if (require.main === module) {
  const path = require('path');
  const url = `${helpBasePath}/ans_cmd/Hlp_C_DMAT.html`;
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(require('fs').readFileSync(url));
  console.log(JSON.stringify(module.exports($, baseurl, {}), undefined, 1));
}