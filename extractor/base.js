
const path = require('path');
const fs = require('fs');

const helpBasePath = 'D:/App/ANSYS Inc/v211/commonfiles/help/en-us/help';

const imageMap = {
  "ans_cmd_graphics_INT.gif": "∫",
  "ans_cmd_graphics_Linebrk.gif": "\n\n---\n\n",
}

module.exports = {
  helpBasePath,
  parseOptions: function (elem, $) {
    const vlist = elem.find('> div > div.variablelist');
    if (vlist.length === 0) {
      return;
    }
    // assert(vlist.length === 1);
    const vlistdl = vlist.find('> dl > dt');
    if (vlistdl.length > 0) {
      return vlistdl.toArray().map((v) => ([
        $(v).text().trim().replace(/\s*--\s*$/, ''),
        $(v).next().html()
      ]));
    }
    const vlistTable = vlist.find('> table > tbody > tr');
    if (vlistTable.length > 0) {
      return vlistTable.toArray().map((v) => ([
        $(v).children().first().text().trim(),
        $(v).children().last().html(),
      ]));
    }
  },
  markdown: function (html, baseurl) {
    const wrapLink = (p) => path.join(baseurl, p).replace(/\\/g, '/');
    const wrapImage = (p) => {
      const dist = path.join(baseurl, p).replace(/\\|\//g, '_');
      if (imageMap[dist]) return imageMap[dist];
      fs.copyFileSync(path.join(helpBasePath, baseurl, p), path.join('./out', dist));
      return `![](${dist})`;
    };
    const linkStack = [];
    const divStack = [];
    let newline = false;
    return (html || "").replace(/(\n|\s)+/g, ' ').replace(/<(\/?\w*)[^>]*>|(&[^;]+;)/g, (p, p0) => {
      const ret = (() => {
        switch (p0) {
          case '&nbsp;':
            return ' ';
          case '&lt;':
            return '<';
          case '&gt;':
            return '>';
          case 'h2':
            return '## ';
          case 'h3':
            return '### ';
          case 'img':
            const matchImg = /\bsrc\s*=\s*\"([^\"]*)\"/.exec(p);
            return matchImg ? wrapImage(matchImg[1]) : '';
          case 'a':
            const matchLink = /\bhref\s*=\s*\"([^\"]*)\"/.exec(p);
            matchLink && linkStack.push(wrapLink(matchLink[1]));
            return matchLink ? '[' : '';
          case '/a':
            const link = linkStack.pop();
            return link ? `](${link})` : '';
          case 'b':
            return ' **';
          case '/b':
            return '** ';
          case 'tr':
          case '/tr':
          case 'p':
          case '/p':
          case 'br':
          case '/h2':
            return newline ? '' : '\n\n';
          case 'div':
            const tag = /\bexample-contents\b/.test(p) ? "```" : '';
            divStack.push(tag);
            return (newline ? '' : '\n') + `${tag}\n`;
          case '/div':
            const endtag = divStack.pop();
            return (newline ? '' : '\n') + `${endtag}\n`;
          default:
            return '';
        }
      })();
      newline = ret.includes('\n');
      return ret;
    }).replace(/(\n(\s)*){2,}\n/g, '\n\n').trim();
  }
};