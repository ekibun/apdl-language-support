const cheerio = require('cheerio');
const fs = require('fs');
const { helpBasePath, markdown } = require('./base.js');
const path = require('path');

function parseFunctionTable(url, table) {
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(fs.readFileSync(url));
  return $(table).toArray().reduce((arr, e) => {
    const tds = $(e).find('td').toArray();
    const label = $(tds[0]).text().trim();
    const doc = markdown($(tds[1]).html(), baseurl);
    const reg = /([A-Z_][A-Z0-9_]*)\(([^\)]*)\)/g;
    let m = undefined;
    while (m = reg.exec(label)) {
      arr[m[1]] = {
        name: m[1],
        detail: doc,
        params: m[2].split(',').map((v) => v.trim()),
        url: path.relative(helpBasePath, url).replace(/\\/g, '/'),
      };
    }
    return arr;
  }, {});
}

// help/ans_apdl/Hlp_P_APDL3_9.html
const parametricFunctions = parseFunctionTable(`${helpBasePath}/ans_apdl/Hlp_P_APDL3_9.html`, 'div.informaltable table tr');

// help/ans_apdl/Hlp_P_APDLget.html
const getFunctions = parseFunctionTable(`${helpBasePath}/ans_apdl/Hlp_P_APDLget.html`, 'div.table-contents table tbody tr');

fs.writeFileSync('out/functions.json', JSON.stringify({
  ...parametricFunctions,
  ...getFunctions,
}));

console.log("\\\\b(?i)(" + Object.keys(parametricFunctions).join('|') + ")(?=\\\\s*\\\\()");
console.log("\\\\b(?i)(" + Object.keys(getFunctions).join('|') + ")(?=\\\\s*\\\\()");


