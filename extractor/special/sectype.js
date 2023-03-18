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
  while (cmd.params[options.index] !== 'Type') {
    options = options.next;
  }
  const optionNext = options.next;
  options.next = undefined;

  const subtypeDom = $('div.refsynopsisdiv > div > div.variablelist > dl > dt').toArray().find((v) => $(v).text() === 'Subtype');
  let lastType = '';
  $(subtypeDom).next().children('p').toArray().forEach((v) => {
    const type = /^\s*=\s*(\w+)/.exec($(v).find('em.replaceable').get(0)?.next.data);
    if (!type) {
      const optionMatch = options.options.find((v) => v.match === lastType);
      optionMatch.detail = ([optionMatch.detail, markdown($(v).html(), baseurl), markdown($(v).next().html(), baseurl)]).join('\n\n').trim();
      return;
    }
    lastType = type[1];
    const optionMatch = options.options.find((v) => v.match === lastType);
    optionMatch.next = {
      index: optionNext.index,
      options: $(v).next().find('> table > tbody > tr').toArray().map((v) => {
        const tds = $(v).find('td').toArray();
        return {
          match: $(tds[0]).text(),
          detail: markdown($(tds[1]).html(), baseurl),
        }
      }),
      next: optionNext.next,
    }
    console.log(type && type[1]);
  });

  return cmd;
};

if (require.main === module) {
  const path = require('path');
  const url = `${helpBasePath}/ans_cmd/Hlp_C_SECTYPE.html`;
  const baseurl = path.dirname(path.relative(helpBasePath, url));
  const $ = cheerio.load(require('fs').readFileSync(url));
  console.log(JSON.stringify(module.exports($, baseurl, { "name": "SECTYPE", "params": ["SECID", "Type", "Subtype", "Name", "REFINEKEY"], "detail": "Associates section type information with a section ID number.", "options": { "detail": "Section identification number. If SECID is blank or zero, the SECID number is incremented by one from the highest section ID number currently defined in the database. (See [Notes](ans_cmd/Hlp_C_SECTYPE.html#SECTYPE.notes) for SECID input specific to general contact.)", "index": 0, "next": { "options": [{ "match": "AXIS", "detail": "Define the axis for a general axisymmetric section." }, { "match": "BEAM", "detail": "Defines a beam section. This option has a Subtype." }, { "match": "COMB", "detail": "Defines a composite (temperature-dependent) beam section. This option has a Subtype." }, { "match": "CONTACT", "detail": "Defines a contact section. This option has a Subtype." }, { "match": "GENB", "detail": "Defines a nonlinear general (temperature-dependent) beam section. This option has a Subtype." }, { "match": "GENS", "detail": "Defines a preintegrated general (temperature-dependent) shell section." }, { "match": "JOINT", "detail": "Defines a joint section. This option has a Subtype." }, { "match": "LINK", "detail": "Defines a link section." }, { "match": "PIPE", "detail": "Defines a pipe section." }, { "match": "PRETENSION", "detail": "Defines a pretension section." }, { "match": "REINF", "detail": "Defines a reinforcing section. This option has a Subtype." }, { "match": "SHELL", "detail": "Defines a shell section." }, { "match": "SUPPORT", "detail": "Additive manufacturing support. This option has a Subtype." }, { "match": "TAPER", "detail": "Defines a tapered beam or pipe section. The sections at the end points must be topologically identical." }], "detail": "**AXIS**\n\n—\n\nDefine the axis for a general axisymmetric section.\n\n**BEAM**\n\n—\n\nDefines a beam section. This option has a Subtype.\n\n**COMB**\n\n—\n\nDefines a composite (temperature-dependent) beam section. This option has a Subtype.\n\n**CONTACT**\n\n—\n\nDefines a contact section. This option has a Subtype.\n\n**GENB**\n\n—\n\nDefines a nonlinear general (temperature-dependent) beam section. This option has a Subtype.\n\n**GENS**\n\n—\n\nDefines a preintegrated general (temperature-dependent) shell section.\n\n**JOINT**\n\n—\n\nDefines a joint section. This option has a Subtype.\n\n**LINK**\n\n—\n\nDefines a link section.\n\n**PIPE**\n\n—\n\nDefines a pipe section.\n\n**PRETENSION**\n\n—\n\nDefines a pretension section.\n\n**REINF**\n\n—\n\nDefines a reinforcing section. This option has a Subtype.\n\n**SHELL**\n\n—\n\nDefines a shell section.\n\n**SUPPORT**\n\n—\n\nAdditive manufacturing support. This option has a Subtype.\n\n**TAPER**\n\n—\n\nDefines a tapered beam or pipe section. The sections at the end points must be topologically identical.", "index": 1, "next": { "detail": "When Type = BEAM, the possible beam sections that can be defined for Subtype are: \n\nRECTRectangle\n\nQUADQuadrilateral\n\nCSOLIDCircular solid\n\nCTUBECircular tube\n\nCHANChannel\n\nII-shaped section\n\nZZ-shaped section\n\nLL-shaped section\n\nTT-shaped section\n\nHATSHat-shaped section\n\nHRECHollow rectangle or box\n\nASECArbitrary section -- integrated cross-section inertia properties supplied by user\n\nMESHUser-defined mesh -- see the [SECREAD](ans_cmd/Hlp_C_SECREAD.html) command for more information about this data\n\nThe following figure shows the shape of each cross section subtype:\n\n![](ans_cmd_graphics_gSECT1.svg)\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = COMB, the only possible [composite-beam section](ans_str/Hlp_G_PREBEAMSECT_5.html) that can be defined for Subtype is:\n\nMATRIXMatrix.\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = CONTACT, the possible contact sections that can be defined for Subtype are:\n\nCIRCLEGeometry correction for a portion of a circle (or nearly a circle).\n\nSPHEREGeometry correction for a portion of a spherical (or nearly spherical) surface.\n\nCYLINDERGeometry correction for a portion of a revolute (or nearly revolute) surface.\n\nNORMALGeometry correction to specify a user-defined contact surface normal.\n\nBOLTGeometry correction for a bolt thread surface.\n\nRADIUSEquivalent beam/edge radius for 3-D beam-to-beam or 3-D edge-to-edge contact in a general contact definition; or radii associated with rigid target segments in a general contact definition.\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = GENB, the possible [nonlinear general beam sections](ans_str/Hlp_G_STRNGBS.html) that can be defined for Subtype are:\n\nELASTICThe generalized-stress/generalized-strain relationship is elastic (linear or nonlinear).\n\nPLASTICThe generalized-stress/generalized-strain relationship is elasto-plastic (and allows for permanent deformation).\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = JOINT, the possible joint sections that can be defined for Subtype are:\n\nUNIVUniversal joint\n\nREVORevolute joint\n\nSLOT3-D Slot joint\n\nPINPPoint-in-plane joint\n\nPRISTranslational joint\n\nCYLICylindrical joint\n\nPLANPlanar joint\n\nWELDWeld joint\n\nORIEOrient joint\n\nSPHESpherical joint\n\nGENEGeneral joint\n\nSCREScrew joint\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = REINF, the possible reinforcing sections that can be defined for Subtype are:\n\nDISCDiscrete reinforcing. The reinforcing fibers are arbitrarily oriented and modeled individually.\n\nSMEARSmeared reinforcing. The reinforcing fibers are homogeneous and defined as a membrane.\n\n![](ans_cmd_graphics_Linebrk.gif)\n\nWhen Type = SUPPORT, the possible support sections that can be defined for Subtype are:\n\nBLOCKBlock support structure.\n\nASECUser-provided factors.\n\n![](ans_cmd_graphics_Linebrk.gif)", "index": 2, "next": { "detail": "An eight-character name for the section. Name can be a string such as \"W36X210\" or \"HP13X73\" for beam sections. Section name can consist of letters and numbers, but cannot contain punctuation, special characters, or spaces.", "index": 3, "next": { "detail": "Sets mesh refinement level for thin-walled beam sections. Valid values are 0 (the default - no mesh refinement) through 5 (high level of mesh refinement). This value has meaning only when Type = BEAM.", "index": 4 } } } } }, "url": "ans_cmd/Hlp_C_SECTYPE.html" }), undefined, 1));
}