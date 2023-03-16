/* eslint-disable @typescript-eslint/naming-convention */
const cheerio = require('cheerio');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { helpBasePath, markdown } = require('./base.js');

function parseTOC(char) {
  const url =
    char === 'C' ? `${helpBasePath}/ans_cmd/Hlp_${char}_CTOC.html` :
      `${helpBasePath}/ans_cmd/Hlp_${char}_TOC.html`;
  const $ = cheerio.load(fs.readFileSync(url));
  return $('div.toc dl span.refentrytitle a').toArray().map((v) => parseCommand(
    `${helpBasePath}/ans_cmd/${v.attribs['href']}`
  ));
}

function parseOptions(elem, $) {
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
}

const specialCmds = {
  '/AN3D': require('./special/an3d.js'),
};

function parseCommand(url) {
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(fs.readFileSync(url));
  const command = $('div.refnamediv span.command').text();
  // console.log(command);
  const paramNames = $('div.refnamediv em.replaceable').toArray().map((v) => $(v).text().trim());
  if (command === 'PLFAR' || command === 'PRFAR') {
    console.log(command, ['NPHI'], 'NPH1<FIXED>');
    const typoIndex = paramNames.indexOf('NPH1');
    if (typoIndex >= 0) {
      paramNames[typoIndex] = 'NPHI';
    }
  }
  let paramDetails = {};
  if (specialCmds[command]) {
    paramDetails = specialCmds[command]($, baseurl, paramNames);
  } else {
    const paramNamesUpper = paramNames.map((v) => v.toUpperCase());
    const paramDetailsDom = $('div.refsynopsisdiv, div[title="Argument Descriptions"]');
    assert(paramDetailsDom.length < 2);
    let paramDetailsCur = paramDetails;
    paramDetailsDom.find('> div > div.variablelist > dl > dt').toArray().forEach((v) => {
      const labels = $(v).find('em.replaceable').toArray().map((v) => $(v).text()).join(',').split(',').map((v) => v.trim()).filter((v) => v);
      if (labels.length === 0) {
        console.log(command);
        return;
      }
      const paramUpper = labels[0].toUpperCase();
      const lastbegin = paramDetailsCur.index ?? -1;
      let index = paramNamesUpper.indexOf(paramUpper, lastbegin + 1);
      if (index < 0) {
        console.log(command, labels, paramNames[lastbegin]);
      }
      if (paramDetailsCur.index !== undefined) {
        const newOption = {};
        paramDetailsCur.next = newOption;
        paramDetailsCur = newOption;
      }
      const next = $(v).next();
      const options = parseOptions(next, $);
      paramDetailsCur.options = options?.map(([k, v]) => ({
        match: k,
        detail: markdown(v, baseurl),
      }));
      paramDetailsCur.detail = markdown(next.contents().filter((i, el) => $(el).find('> div.variablelist').length === 0).html(), baseurl);
      paramDetailsCur.index = lastbegin < 0 ? 0 : index < 0 ? lastbegin + 1 : index;
    });
    if (paramDetails.length === 0 && paramNames.length > 0) {
      console.log(command, paramNames);
    }
  }


  const detail = markdown($('div.refnamediv b.refpurpose').html(), baseurl);
  return {
    name: command,
    params: paramNames,
    detail,
    options: paramDetails,
    url: path.relative(helpBasePath, url).replace(/\\/g, '/'),
  };
}

const ret = [];
for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); ++i) {
  const char = String.fromCharCode(i);
  ret.push.apply(ret, parseTOC(char));
}
fs.writeFileSync('out/commands.json', JSON.stringify(ret));
fs.writeFileSync('out/commands.apdl', ret.map((v) => [v.name, ...v.params].join(',')).join('\n'));

fs.writeFileSync('out/commands.txt', "(?<=(\\\\$|^)\\\\s*)(?i)(" + ret.map((v) => v.name.replace('*', '\\\\*')).join('|') + ")(?=\\\\s*(,|$|\\\\$))");

// const ret = parseCommand('C:/Program Files/ANSYS Inc/v211/commonfiles/help/en-us/help/ans_cmd/Hlp_C_AN3D.html');
// fs.writeFileSync('./extractor/test.md', ret.note);
// fs.writeFileSync('./extractor/test.json', JSON.stringify(ret, null, 2));