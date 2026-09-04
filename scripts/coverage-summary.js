// CI'da coverage ozetini GitHub is akisi ozetine Markdown tablo olarak basar.
// Ayri dosyada duruyor cunku YAML icine gomulu JS, kabuk escape'i yuzunden
// sessizce bozulabiliyor (bir kez yasandi: sablon literali icindeki \n).
const summary = require('../coverage/coverage-summary.json').total;

const rows = ['| Metrik | Kapsam |', '|---|---|'];
for (const key of ['statements', 'branches', 'functions', 'lines']) {
  rows.push(`| ${key} | ${summary[key].pct}% |`);
}

console.log(rows.join('\n'));
