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

  let options = cmd.options;
  while (cmd.params[options.index] !== 'Entity') {
    options = options.next;
  }
  const optionENTNUM = options.next;
  const optionItem1 = optionENTNUM.next;
  const optionIT1NUM = optionItem1.next;
  const optionItem2 = optionIT1NUM.next;
  optionItem2.next = undefined;
  optionIT1NUM.next = undefined;
  optionItem1.next = undefined;
  optionENTNUM.next = undefined;
  options.next = undefined;
  const optionsMap = {};

  let lastColNum = 3;
  $('div.refsect1 > div.table').toArray().forEach((v) => {
    const [_, ...match] = /\*GET (\w+) Items, Entity\s*=\s*(\w+)/i.exec($(v).find('> p.title').text());
    const optionMatch = optionsMap[match[1]] ?? {
      match: match[1],
      next: {
        ...optionENTNUM,
        next: {
          ...optionItem1,
        }
      }
    }
    optionsMap[match[1]] = optionMatch;
    $(v).find('> div.table-contents > table').toArray().map((v) => {
      const th = $(v).find('> thead > tr');
      optionMatch.detail = [optionMatch.detail ?? '', `(${match[0]}) ` + markdown(th.first().html(), baseurl)].join('\n\n').trim();
      // 解析标题数量
      let cols = th.last().find('th');
      let colNum = cols.length;
      if (cols.first().text() !== 'Item1') {
        colNum = lastColNum;
      }
      lastColNum = colNum;
      let lastTds = [];
      // 
      const item1OptionsMap = Object.fromEntries((optionMatch.next.next.options ?? []).map((v) => [v.match, v]));
      $(v).find('> tbody > tr').toArray().forEach((v) => {
        const tds = $(v).find('> td').toArray();
        if (tds.length < colNum) {
          if (tds[0].attribs['colspan']) {
            assert(tds.length === 1);
            optionMatch.detail = [optionMatch.detail ?? '', markdown($(tds[0]).html(), baseurl)].join('\n\n').trim();
            return;
          }
          if (match[1] === 'SECR') {
            if (tds.length == 2) {
              tds.splice(0, 0, lastTds[0]);
            }
            tds.push(lastTds[3], lastTds[4]);
          } else {
            tds.splice(0, 0, ...lastTds.slice(0, colNum - tds.length));
          }
        }
        lastTds = tds;
        assert(tds.length === colNum);
        // 把Entity=SECR的Description移到最后
        if (match[1] === 'SECR') {
          [tds[2], tds[3], tds[4]] = [tds[3], tds[4], tds[2]]
        }

        const ret = {
          ...optionMatch.next.next
        };
        let cur = ret;
        for (let i = 1; i < colNum - 1; ++i) {
          const option = $(tds[i]).find('> table > tbody > tr').toArray().map((v) => {
            const [match, detail] = $(v).text().split('-');
            return {
              match: match.trim(),
              detail: detail?.trim(),
            };
          });
          $(tds[i]).find('> table').remove();
          const next = {
            index: cur.index + 1,
            detail: markdown($(tds[i]).html(), baseurl),
            options: option.length > 0 ? option : undefined,
          };
          cur.next = next;
          cur = next;
        }

        const item1Options = [];
        const detail = markdown($(tds[colNum - 1]).html(), baseurl);
        markdown($(tds[0]).html(), baseurl).replace(/\b[A-Z]+\b/g, (v) => item1Options.push(v));
        item1Options.forEach((v) => {
          const o = item1OptionsMap[v] ?? {
            match: v,
          };
          item1OptionsMap[v] = o;
          if (o.next) {
            let curO = o.next;
            let curN = ret.next;
            let doneOptions = false;
            while (curO && curN) {
              if (curO.detail !== curN.detail) {
                curO.options = curO.options ?? [
                  {
                    match: curO.detail,
                    detail: o.next.detail
                  }
                ];
                curO.options.push({
                  match: curN.detail,
                  detail: ret.next.detail
                })
                curO.detail = undefined;
                doneOptions = true;
                break;
              }
              curO = curO.next;
              curN = curN.next;
            }
            if (!doneOptions) {
              if (['AREA AREA', 'ELEM MEMBER', 'LINE LENG', 'VOLU VOLU', 'ELEM VOLU', 'MEMBER TEMP'].includes([match[1], v].join(' '))) {
                assert(o.detail !== detail);
                o.next.detail = [
                  o.detail,
                  o.next.detail,
                  detail,
                  ret.next.detail
                ].join('\n\n').trim();
              } else {
                o.next.detail = [
                  o.next.detail,
                  ret.next.detail
                ].join('\n\n').trim();
                console.log(match[1], v);
              }
            }
          } else {
            o.next = ret.next;
            o.detail = detail;
          }
        });
      })

      optionMatch.next.next.options = Object.values(item1OptionsMap);
    });
  });

  options.options = Object.values(optionsMap);
  return cmd;
};

if (require.main === module) {
  const path = require('path');
  const url = `${helpBasePath}/ans_cmd/Hlp_C_GET.html`;
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(require('fs').readFileSync(url));
  console.log(JSON.stringify(module.exports($, baseurl, { "name": "*GET", "params": ["Par", "Entity", "ENTNUM", "Item1", "IT1NUM", "Item2", "IT2NUM"], "detail": "Retrieves a value and stores it as a scalar parameter or part of an array parameter.", "options": { "detail": "The name of the resulting parameter. See [*SET](ans_cmd/Hlp_C_SET_st.html) for name restrictions.", "index": 0, "next": { "detail": "Entity keyword. Valid keywords are NODE, ELEM, KP, LINE, AREA, VOLU, etc., as shown for Entity = in the tables below.", "index": 1, "next": { "detail": "The number or label for the entity (as shown for ENTNUM = in the tables below). In some cases, a zero (or blank) ENTNUM represents all entities of the set.", "index": 2, "next": { "detail": "The name of a particular item for the given entity. Valid items are as shown in the Item1 columns of the tables below.", "index": 3, "next": { "detail": "The number (or label) for the specified Item1 (if any). Valid IT1NUM values are as shown in the IT1NUM columns of the tables below. Some Item1 labels do not require an IT1NUM value.", "index": 4, "next": { "detail": "A second set of item labels and numbers to further qualify the item for which data are to be retrieved. Most items do not require this level of information.", "index": 5 } } } } } }, "url": "ans_cmd/Hlp_C_GET.html" }), undefined, 1));
}