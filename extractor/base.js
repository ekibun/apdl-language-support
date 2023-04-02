
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const helpBasePath = 'D:/App/ANSYS Inc/v231/commonfiles/help/en-us/help';

const imageMap = {
  "ans_cmd_graphics_INT.gif": "∫",
  "ans_cmd_graphics_Linebrk.gif": "\n\n---\n\n",
}

// TODO vscode do not support math rendering
const eqMap = {
  "1JkzJJ6iikg8PGmQnKYsmA": "φ",
  // "1yNrrRKbWY2GMzIX87WpDA": "$κ_2$",
  "7ahYCGOe5IlvuhEgW8kwKA": "≥",
  // "9nNoXdYnZJYwTtkk9OcGyQ": "$\\sqrt{x^2+y^2}$",
  "BD6zDnOOaNbJVHZ6Gkc78Q": "θ",
  "BFi2fuIGF6flv3fGMhymQw": "N",
  "DMa5B0Wuts2siuY1iEmI-w": "ε",
  // "epTPm6Ec_b3R4Eo05wZtng": "$$\n\\frac{\\sqrt{ΔX^2+ΔY^2+ΔZ^2}}{1000}\n$$",
  "ERodSRuoamyDqB2QC7Slkg": "Σ",
  // "hhO-KCwQEOOhYi9eBs8Azg": "$γ_2$",
  // "IQyE5Z29U4AmeTpN8EdRtA": "$κ_1$",
  "KIH_y4UYVD-YBBYn_1u27Q": "τ",
  // "LA0ByQZI2g18jGZf5T89SA": "$γ_1$",
  // "MFCvw6wlQQaogtPVsQLU6w": "$S_1$",
  "MXltvVg8gEG7LPn6xXZmBw": "χ",
  "N7ozcpFzIP60gM9zND3AiQ": "∞",
  // "PfdbEp1igfdLGmSY9oV-gw": "$σ_{rθ}=0$",
  // "qhTuved2U5_40ePEoB1StQ": "$\\bar{η}$",
  "qWufmJx6l9GZErANDURAew": "≤",
  // "U456WTvFGtojCeL0JO_vBQ": "$V^*$",
  // "vH1_QP2fkPL4kn7eBDChLg": "$M_1$",
  // "wcLHzYy-BhlNCcj7J7z2SA": "$\\bar{ξ}$",
  // "wXC0a0o5tL1DykvTcjslmw": "$M_2$",
  // "x0FUkkTDhqifqWNAL1HPTg": "$S_2$",
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
      if (dist.includes('_graphics_eq')) { // equation
        const buffer = fs.readFileSync(path.join(helpBasePath, baseurl, p));
        const md5 = crypto.createHash('md5').update(buffer).digest('base64url');
        if (eqMap[md5]) {
          return eqMap[md5];
        }
        const distname = "ans_eq_" + md5 + path.extname(p);
        fs.writeFileSync(path.join('./out', distname), buffer);
        return `![](${distname})`;
      } else {
        fs.copyFileSync(path.join(helpBasePath, baseurl, p), path.join('./out', dist));
        return `![](${dist})`;
      }
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