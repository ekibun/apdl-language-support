const cheerio = require('cheerio');

/**
 * 
 * @param {cheerio.CheerioAPI} $ 
 * @param {string} baseurl 
 * @param {Command} cmd 
 */
module.exports = function ($, baseurl, cmd) {
  console.log(`${cmd.name}<fixed>`);

  let options = cmd.options;
  while (cmd.params[options.index] !== 'Lab') {
    options = options.next;
  }
  options.detail = 'Valid force labels are:';
  options.options = [
    ...['FX', 'FY', 'FZ'].map((v) => ({
      match: v,
      detail: 'Forces/[Volumetric force density](ans_acous/acous_excit_src.html#acous_excit_volforce)'
    })),
    ...['MX', 'MY', 'MZ'].map((v) => ({
      match: v,
      detail: 'Moments'
    })),
    ...['HEAT', 'HBOT', 'HE2', 'HE3', 'HTOP'].map((v) => ({
      match: v,
      detail: 'Heat flow'
    })),
    {
      match: 'FLOW',
      detail: 'Fluid flow'
    },
    {
      match: 'AMPS',
      detail: 'Current flow'
    },
    {
      match: 'CHRG',
      detail: 'Current flow'
    },
    {
      match: 'FLUX',
      detail: 'Magnetic flux'
    },
    {
      match: 'CSGZ',
      detail: 'Magnetic current segment'
    },
    {
      match: 'RATE',
      detail: 'Diffusion flow rate'
    },
    {
      match: 'DVOL',
      detail: 'Fluid mass flow rate'
    },
  ]

  return cmd;
};