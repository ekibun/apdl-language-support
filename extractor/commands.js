/* eslint-disable @typescript-eslint/naming-convention */
const cheerio = require('cheerio');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { helpBasePath, parseOptions, markdown } = require('./base.js');

function parseTOC(char) {
  const url =
    char === 'C' ? `${helpBasePath}/ans_cmd/Hlp_${char}_CTOC.html` :
      `${helpBasePath}/ans_cmd/Hlp_${char}_TOC.html`;
  const $ = cheerio.load(fs.readFileSync(url));
  return $('div.toc dl span.refentrytitle a').toArray().map((v) => parseCommand(
    `${helpBasePath}/ans_cmd/${v.attribs['href']}`
  ));
}

const specialCmds = {
  '/AN3D': require('./special/an3d.js'),
  'SECMODIF': require('./special/an3d.js'),
  '*DMAT': require('./special/dmat.js'),
  '*SMAT': require('./special/dmat.js'),
  '*VEC': require('./special/dmat.js'),
  'ET': require('./special/et.js'),
};

function parseCommand(url) {
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(fs.readFileSync(url));
  const command = $('div.refnamediv span.command').text();
  // console.log(command);
  const paramNames = markdown($('div.refnamediv > p').first().html(), baseurl).split('\n')[0].split(',').slice(1).map((v) => v.trim());
  if (command === 'PLFAR' || command === 'PRFAR') {
    console.log(command, ['NPHI'], 'NPH1<FIXED>');
    const typoIndex = paramNames.indexOf('NPH1');
    if (typoIndex >= 0) {
      paramNames[typoIndex] = 'NPHI';
    }
  }
  if (command === 'CM') {
    console.log(command, ['KOPT'], 'KOPOT<FIXED>');
    const typoIndex = paramNames.indexOf('KOPOT');
    if (typoIndex >= 0) {
      paramNames[typoIndex] = 'KOPT';
    }
  }
  const detail = markdown($('div.refnamediv b.refpurpose').html(), baseurl);
  // 基本参数处理
  const paramDetails = {};
  const paramNamesUpper = paramNames.map((v) => v.toUpperCase());
  const paramDetailsDom = $('div.refsynopsisdiv, div[title="Argument Descriptions"]');
  assert(paramDetailsDom.length < 2);
  let paramDetailsCur = paramDetails;
  paramDetailsDom.find('> div > div.variablelist > dl > dt').toArray().forEach((v) => {
    const labels = $(v).find('em.replaceable').toArray().map((v) => $(v).text()).join(',').split(',').map((v) => v.trim()).filter((v) => v);
    if (labels.length === 0) {
      labels[0] = $(v).text();
      console.log(command, labels[0]);
    }
    const paramUpper = labels[0].toUpperCase();
    const lastbegin = paramDetailsCur.index ?? -1;
    let index = paramNamesUpper.indexOf(paramUpper, lastbegin + 1);
    if (index < 0) {
      console.log(command, labels, paramNames[lastbegin + 1]);
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
    const $detail = cheerio.load(next.html());
    $detail('body > div > div.variablelist , body > table > tbody > tr').remove();
    paramDetailsCur.detail = markdown($detail.html(), baseurl);
    paramDetailsCur.index = lastbegin < 0 ? 0 : index < 0 ? lastbegin + 1 : index;
  });
  if (paramDetails.length === 0 && paramNames.length > 0) {
    console.log(command, paramNames);
  }
  // TODO
  if (['*INIT', '*MERGE', '*REMOVE', '*SORT'].includes(command)) {
    let options = paramDetails;
    while (paramNames[options.index] !== 'Val1') {
      options = options.next;
    }
    options.next = undefined;
    console.log(`${command}<FIXED>`);
  }
  if (['CNCHECK'].includes(command)) {
    let options = paramDetails;
    while (paramNames[options.index] !== 'Val1') {
      options = options.next;
    }
    options.next = undefined;
    const p = $('div.refsynopsisdiv > p');
    options.detail = markdown(p.html(), baseurl);
    console.log(`${command}<FIXED>`);
  }
  const ret = {
    name: command,
    params: paramNames,
    detail,
    options: paramDetails,
    url: path.relative(helpBasePath, url).replace(/\\/g, '/')
  }
  if (specialCmds[command]) {
    return specialCmds[command]($, baseurl, ret);
  } else {
    return ret;
  }
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