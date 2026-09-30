// Usage: node test-calc.js
var fs = require('fs');
var path = require('path');
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var m = html.match(/\/\/ CALC-START([\s\S]*?)\/\/ CALC-END/);
if (!m) { console.log('FAIL: CALC block not found'); process.exit(1); }
var mb = html.match(/\/\/ BOX-START([\s\S]*?)\/\/ BOX-END/);
if (!mb) { console.log('FAIL: BOX block not found'); process.exit(1); }
var mc = html.match(/\/\/ CAP-START([\s\S]*?)\/\/ CAP-END/);
if (!mc) { console.log('FAIL: CAP block not found'); process.exit(1); }
var ms = html.match(/\/\/ SHIP-START([\s\S]*?)\/\/ SHIP-END/);
if (!ms) { console.log('FAIL: SHIP block not found'); process.exit(1); }
var mf = html.match(/\/\/ FORM-START([\s\S]*?)\/\/ FORM-END/);
if (!mf) { console.log('FAIL: FORM block not found'); process.exit(1); }
var mr = html.match(/\/\/ REV-START([\s\S]*?)\/\/ REV-END/);
if (!mr) { console.log('FAIL: REV block not found'); process.exit(1); }
var mfx = html.match(/\/\/ FX-START([\s\S]*?)\/\/ FX-END/);
if (!mfx) { console.log('FAIL: FX block not found'); process.exit(1); }
var mcp = html.match(/\/\/ CALCPAD-START([\s\S]*?)\/\/ CALCPAD-END/);
if (!mcp) { console.log('FAIL: CALCPAD block not found'); process.exit(1); }
var api = new Function(m[1] + mb[1] + mc[1] + ms[1] + mf[1] + mr[1] + mfx[1] + mcp[1] + '; return { calcRow: calcRow, calcRowAmount: calcRowAmount, parseNum: parseNum, evalGroup: evalGroup, effectiveThreshold: effectiveThreshold, adjustExampleText: adjustExampleText, CAP_CATEGORIES: CAP_CATEGORIES, chargedTariffUSD: chargedTariffUSD, formatYen: formatYen, formatUsd: formatUsd, MAX_INPUT: MAX_INPUT, shipCost: shipCost, shipBandLookup: shipBandLookup, shipVolWeight: shipVolWeight, shipEpacket: shipEpacket, SHIP_BANDS: SHIP_BANDS, SHIP_METHODS: SHIP_METHODS, SHIP_LIMITS: SHIP_LIMITS, validateShipInputs: validateShipInputs, validateFuelSection: validateFuelSection, shipAvailability: shipAvailability, loadStored: loadStored, pickMatch: pickMatch, SHDEFS: SHDEFS, SHIP_WEIGHT_MAX: SHIP_WEIGHT_MAX, calcRev: calcRev, formatPercent: formatPercent, legendVisible: legendVisible, resetScope: resetScope, tariffInputs: tariffInputs, tariffFor: tariffFor, cpEval: cpEval, cpFormat: cpFormat, cpPlain: cpPlain, cpParseNum: cpParseNum, cpRound: cpRound, cpUsable: cpUsable, cpConvert: cpConvert, cpFormatExpr: cpFormatExpr, cpInit: cpInit, cpPress: cpPress, cpView: cpView, cpConvertState: cpConvertState, cpTapeAdd: cpTapeAdd, cpTapeRepair: cpTapeRepair, cpTapeLine: cpTapeLine, formatFxTime: formatFxTime, fxShouldBlink: fxShouldBlink, fxStatusText: fxStatusText, validateRevInputs: validateRevInputs, revSummaryText: revSummaryText };')();
var calcRow = api.calcRow, calcRowAmount = api.calcRowAmount, parseNum = api.parseNum, evalGroup = api.evalGroup;
var effectiveThreshold = api.effectiveThreshold;

var S = {
  exchangeRate: 157.315109, feeRate: 0.18, payoneerRate: 0.02, tariffRate: 0.15,
  safetyFactor: 1.03, processingFeeRate: 0.021, vatRate: 0.08, euShippingDiffYen: 1000,
  mpfUSD: 0, useCpassEconomy: false, ceCustomsFeeYen: 296, adjustEnabled: true, adjustThresholdUSD: 500
};
function withS(o) { var c = {}; for (var k in S) c[k] = S[k]; for (var j in o) c[j] = o[j]; return c; }

var pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + ' ' + detail); }
}

// 1) 指定の12ケース [ad, profit, selling, tariff, withTariff, profitYen]
var given = [
  [0, 0, 51.65, 16.38, 68.03, 0], [0, 5, 55.09, 17.05, 72.14, 433], [0, 10, 59.03, 17.81, 76.84, 929],
  [5, 0, 55.09, 17.74, 72.83, 0], [5, 5, 59.03, 18.55, 77.58, 465], [5, 10, 63.57, 19.49, 83.06, 1000],
  [10, 0, 59.03, 19.39, 78.42, 0], [10, 5, 63.57, 20.39, 83.96, 500], [10, 10, 68.86, 21.56, 90.42, 1083],
  [15, 0, 63.57, 21.43, 85.00, 0], [15, 5, 68.86, 22.68, 91.54, 541], [15, 10, 75.12, 24.17, 99.29, 1181]
];
given.forEach(function (g) {
  var r = calcRow(S, 5000, 1500, g[0] / 100, g[1] / 100);
  var got = [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.profitYen];
  var exp = [g[2], g[3], g[4], g[5]];
  check('ad' + g[0] + '% profit' + g[1] + '%', r.ok && got.join() === exp.join(), 'got ' + got.join('/') + ' expected ' + exp.join('/'));
});

// 独立計算用の関数（本体関数は呼ばない）
function indep(cost, ship, ad, pf, o) {
  o = o || {};
  var fx = 157.315109, fee = 0.18, pay = 0.02;
  var sell = Math.round((cost + ship) / (1 - (fee + pf + ad + pay)) / fx * 100) / 100;
  var tar = sell * (0.15 / (1 - fee - ad) * 1.03) * 1.021 + sell * 0.08 * 0.021 + (o.cpass ? 296 / fx : 0) + 1000 / fx;
  tar = Math.round(tar * 100) / 100;
  var wt = Math.round((sell + tar) * 100) / 100;
  var profit = Math.round(sell * fx * (1 - (fee + ad + pay)) - cost - ship);
  return { sell: sell, tar: tar, wt: wt, profit: profit };
}

// 2) 計算不可: 手数料18+ペイ2+広告5+利益75 = 100%
var r1 = calcRow(S, 5000, 1500, 0.05, 0.75);
check('not computable (sum = 100%)', r1.ok === false, JSON.stringify(r1));
var r1b = calcRow(S, 5000, 1500, 0.05, 0.9);
check('not computable (sum > 100%)', r1b.ok === false, JSON.stringify(r1b));

// 3) Cpassエコノミー ON
var e3 = indep(5000, 1500, 0.05, 0.05, { cpass: true });
var r3 = calcRow(withS({ useCpassEconomy: true }), 5000, 1500, 0.05, 0.05);
check('Cpass economy ON', r3.ok && r3.tariffUSD === e3.tar && r3.priceWithTariffUSD === e3.wt && r3.profitYen === e3.profit && r3.adjustedListingPriceUSD === null,
  'got ' + JSON.stringify(r3) + ' expected ' + JSON.stringify(e3));
var r3b = calcRow(S, 5000, 1500, 0.05, 0.05);
check('Cpass ON raises tariff by about 296/fx', Math.abs((r3.tariffUSD - r3b.tariffUSD) - 296 / 157.315109) < 0.011, 'diff ' + (r3.tariffUSD - r3b.tariffUSD));

// 4) 価格調整 (cost 500000)
var e4 = indep(500000, 1500, 0.05, 0.05);
var r4 = calcRow(S, 500000, 1500, 0.05, 0.05);
var expAdj = Math.round((e4.wt - 500) * 100) / 100;
check('adjustment applies (tariff >= 500)', e4.tar >= 500 && r4.ok && r4.tariffUSD === e4.tar && r4.adjustedListingPriceUSD === expAdj,
  'got ' + JSON.stringify(r4) + ' expected ' + JSON.stringify(e4) + ' adj ' + expAdj);
var r4b = calcRow(withS({ adjustEnabled: false }), 500000, 1500, 0.05, 0.05);
check('adjustment OFF gives null', r4b.adjustedListingPriceUSD === null, JSON.stringify(r4b));
var r4c = calcRow(S, 5000, 1500, 0.05, 0.05);
check('no adjustment when tariff < 500', r4c.adjustedListingPriceUSD === null, JSON.stringify(r4c));

// 5) MPF と 手数料+広告が100%以上 (関税側の分母が0以下)
var r5 = calcRow(withS({ feeRate: 0.5, payoneerRate: 0 }), 5000, 1500, 0.5, 0);
check('not computable (fee + ad >= 100%)', r5.ok === false, JSON.stringify(r5));

// ===== 追加テスト =====
function isNegZero(v) { return typeof v === 'number' && Object.is(v, -0); }
function r2(x) { return Math.round(x * 100) / 100; }

// 6) 利益額モード 12ケース（期待値は、仕様書から画面の外で独立に計算したもの。このページの関数からは作っていない） [ad, amount, selling, tariff, withTariff, profitYen, ratePct(小数1桁)]
var amt = [
  [0, 1000, 59.59, 17.92, 77.51, 1000, 10.7], [0, 2000, 67.54, 19.46, 87.00, 2000, 18.8], [0, 3000, 75.49, 21.01, 96.50, 3000, 25.3],
  [5, 1000, 63.57, 19.49, 83.06, 1000, 10.0], [5, 2000, 72.04, 21.24, 93.28, 2000, 17.6], [5, 3000, 80.52, 22.99, 103.51, 3000, 23.7],
  [10, 1000, 68.11, 21.39, 89.50, 1000, 9.3], [10, 2000, 77.19, 23.40, 100.59, 2000, 16.5], [10, 3000, 86.27, 25.40, 111.67, 3000, 22.1],
  [15, 1000, 73.35, 23.75, 97.10, 1000, 8.7], [15, 2000, 83.13, 26.07, 109.20, 2000, 15.3], [15, 3000, 92.91, 28.39, 121.30, 3000, 20.5]
];
amt.forEach(function (g) {
  var r = calcRowAmount(S, 5000, 1500, g[0] / 100, g[1]);
  var got = [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.profitYen, r.ok ? Math.round(r.profitRatePct * 10) / 10 : null];
  var exp = [g[2], g[3], g[4], g[5], g[6]];
  var noNegZero = r.ok && [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.profitYen, r.profitRatePct].every(function (v) { return !isNegZero(v); });
  check('amount ad' + g[0] + '% amount' + g[1], r.ok && got.join() === exp.join() && noNegZero && r.adjustedListingPriceUSD === null,
    'got ' + got.join('/') + ' expected ' + exp.join('/'));
});
var r6z = calcRowAmount(S, 5000, 1500, 0, 0);
check('amount 0 yen: profit 0, rate 0, no -0', r6z.ok && r6z.profitYen === 0 && r6z.profitRatePct === 0 && !isNegZero(r6z.profitYen) && !isNegZero(r6z.profitRatePct), JSON.stringify(r6z));
var r6r = calcRow(S, 5000, 1500, 0.05, 0.05);
check('rate mode also returns profitRatePct', r6r.ok && Math.abs(r6r.profitRatePct - r6r.profitYen / (r6r.sellingPriceUSD * 157.315109) * 100) < 1e-9, JSON.stringify(r6r));

// 7) 利益額モード: 手数料+広告+ペイが100%
var r7 = calcRowAmount(withS({ feeRate: 0.18, payoneerRate: 0.02 }), 5000, 1500, 0.8, 1000);
check('amount not computable (fee 18 + pay 2 + ad 80 = 100%)', r7.ok === false, JSON.stringify(r7));
var r7b = calcRowAmount(S, 5000, 1500, 0.9, 1000);
check('amount not computable (sum > 100%)', r7b.ok === false, JSON.stringify(r7b));

// 8) 率モードでちょうど100%になる5通り
[[10, 70], [8, 72], [9, 71], [11, 69], [20.5, 59.5]].forEach(function (c) {
  var r = calcRow(S, 5000, 1500, c[0] / 100, c[1] / 100);
  check('rate exactly 100%: ad ' + c[0] + ' / profit ' + c[1], r.ok === false, JSON.stringify(r));
});

// 9) 関税が上限と同額 / MPF / EU送料差額（期待値はここで別に計算）
var e9 = indep(5000, 1500, 0.05, 0.05);
var r9 = calcRow(withS({ adjustThresholdUSD: e9.tar }), 5000, 1500, 0.05, 0.05);
check('adjustment applies when tariff equals the amount', r9.ok && r9.tariffUSD === e9.tar && r9.adjustedListingPriceUSD === r2(e9.wt - e9.tar),
  'got ' + JSON.stringify(r9) + ' expected adj ' + r2(e9.wt - e9.tar));
var r9b = calcRow(withS({ adjustThresholdUSD: e9.tar + 0.01 }), 5000, 1500, 0.05, 0.05);
check('no adjustment when amount is 0.01 above tariff', r9b.adjustedListingPriceUSD === null, JSON.stringify(r9b));
function indep2(cost, ship, ad, pf, mpf, eu) {
  var fx = 157.315109, sell = Math.round((cost + ship) / (1 - (0.18 + pf + ad + 0.02)) / fx * 100) / 100;
  var rate = 0.15 * 1.03 / (1 - 0.18 - ad);
  var tar = r2(sell * rate * 1.021 + sell * 0.08 * 0.021 + mpf + eu / fx);
  return { sell: sell, tar: tar, wt: r2(sell + tar) };
}
var e9m = indep2(5000, 1500, 0.05, 0.05, 7.5, 1000);
var r9m = calcRow(withS({ mpfUSD: 7.5 }), 5000, 1500, 0.05, 0.05);
check('MPF changed (7.5)', r9m.ok && r9m.tariffUSD === e9m.tar && r9m.priceWithTariffUSD === e9m.wt, 'got ' + JSON.stringify(r9m) + ' expected ' + JSON.stringify(e9m));
var e9e = indep2(5000, 1500, 0.05, 0.05, 0, 3000);
var r9e = calcRow(withS({ euShippingDiffYen: 3000 }), 5000, 1500, 0.05, 0.05);
check('EU shipping difference changed (3000)', r9e.ok && r9e.tariffUSD === e9e.tar && r9e.priceWithTariffUSD === e9e.wt, 'got ' + JSON.stringify(r9e) + ' expected ' + JSON.stringify(e9e));
var e9a = indep2(5000, 1500, 0.05, 0.05, 7.5, 3000);
var r9a = calcRowAmount(withS({ mpfUSD: 7.5, euShippingDiffYen: 3000 }), 5000, 1500, 0.05, 1000);
var sellA = Math.round((5000 + 1500 + 1000) / (1 - (0.18 + 0.05 + 0.02)) / 157.315109 * 100) / 100;
var tarA = r2(sellA * (0.15 * 1.03 / (1 - 0.18 - 0.05)) * 1.021 + sellA * 0.08 * 0.021 + 7.5 + 3000 / 157.315109);
check('amount mode uses the same tariff formula (MPF 7.5, EU 3000)', r9a.ok && r9a.sellingPriceUSD === sellA && r9a.tariffUSD === tarA && r9a.priceWithTariffUSD === r2(sellA + tarA),
  'got ' + JSON.stringify(r9a) + ' expected ' + sellA + '/' + tarA);

// 10) 数字の読み取り
[['', null], ['abc', null], ['-5', null], ['1e5', null], ['５０００', 5000], ['5,000', 5000], ['12,345,678', 12345678],
 ['1,5', null], ['5,00', null], [' 5000 ', 5000], ['0', 0], ['5.', null], ['.5', 0.5]].forEach(function (c) {
  var got = parseNum(c[0]);
  check('parseNum(' + JSON.stringify(c[0]) + ')', got === c[1], 'got ' + got + ' expected ' + c[1]);
});

// 11) 入力欄グループの判定
function grp(raws, kind, def) { return evalGroup(raws, kind, def); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var gd = [0, 5, 10, 15];
var g1 = grp(['15', '0', '10', '5'], 'rate', gd);
check('group: all valid (sorted)', same(g1, { values: [0, 5, 10, 15], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g1));
var g2 = grp(['0', '', '10', '15'], 'rate', gd);
check('group: one empty (not invalid, not used)', same(g2, { values: [0, 10, 15], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g2));
var g3 = grp(['0', 'abc', '10', '15'], 'rate', gd);
check('group: one invalid', same(g3, { values: [0, 10, 15], invalid: [false, true, false, false], fellBack: false }), JSON.stringify(g3));
var g4 = grp(['5', '5', '10', '5.0'], 'rate', gd);
check('group: duplicates used once', same(g4, { values: [5, 10], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g4));
var g5 = grp(['', '', '', ''], 'rate', gd);
check('group: all empty falls back to initial values', same(g5, { values: [0, 5, 10, 15], invalid: [false, false, false, false], fellBack: true }), JSON.stringify(g5));
var g6 = grp(['100', '5', '', ''], 'rate', gd);
check('group: rate of 100 is invalid', same(g6, { values: [5], invalid: [true, false, false, false], fellBack: false }), JSON.stringify(g6));
var g6b = grp(['100', '', '', ''], 'rate', gd);
check('group: only a rate of 100 falls back', same(g6b, { values: [0, 5, 10, 15], invalid: [true, false, false, false], fellBack: true }), JSON.stringify(g6b));
var g7 = grp(['3,000', '-1', '1,5', '500'], 'amount', [1000, 2000, 3000]);
check('group: amounts with thousands separator; negative and bad comma invalid', same(g7, { values: [500, 3000], invalid: [false, true, true, false], fellBack: false }), JSON.stringify(g7));
var g8 = grp(['150', '', ''], 'amount', [1000, 2000, 3000]);
check('group: amount of 150 is fine (no 100 limit)', same(g8, { values: [150], invalid: [false, false, false], fellBack: false }), JSON.stringify(g8));

// 12) 上限カテゴリ
var caps = api.CAP_CATEGORIES;
check('six categories in order', same(caps, ['汎用（上限なし）', 'Video Games（$20）', 'Books（$20）', 'Movies & TV（$20）', 'Music（$25）', 'Game Consoles（$50）']), JSON.stringify(caps));
[500, 20, 20, 20, 25, 50].forEach(function (v, i) {
  check('effectiveThreshold: ' + caps[i], effectiveThreshold(caps[i], 500) === v, 'got ' + effectiveThreshold(caps[i], 500) + ' expected ' + v);
});
check('effectiveThreshold: general with 300', effectiveThreshold(caps[0], 300) === 300, String(effectiveThreshold(caps[0], 300)));
check('effectiveThreshold: unknown label gives general value', effectiveThreshold('unknown', 400) === 400 && effectiveThreshold('', 400) === 400, '');
check('adjust example text', api.adjustExampleText() === '例: Video Games（上限20ドル）で、販売価格60ドル・想定関税22ドルの場合 → 関税込み価格82ドル − 20ドル ＝ 出品価格62ドル', api.adjustExampleText());

// 13) 上限20ドルでの調整（率モード）[ad, profit, tariff, adjusted or null]
var S20 = withS({ adjustThresholdUSD: 20 });
[[0, 0, 16.38, null], [0, 10, 17.81, null], [10, 0, 19.39, null], [10, 5, 20.39, 63.96], [15, 0, 21.43, 65.00], [15, 10, 24.17, 79.29]].forEach(function (c) {
  var on = calcRow(S20, 5000, 1500, c[0] / 100, c[1] / 100);
  check('cap 20 ON: ad' + c[0] + ' profit' + c[1], on.ok && on.tariffUSD === c[2] && on.adjustedListingPriceUSD === c[3], JSON.stringify(on));
  var off = calcRow(withS({ adjustThresholdUSD: 20, adjustEnabled: false }), 5000, 1500, c[0] / 100, c[1] / 100);
  check('cap 20 OFF: ad' + c[0] + ' profit' + c[1], off.ok && off.tariffUSD === c[2] && off.adjustedListingPriceUSD === null, JSON.stringify(off));
});


// ===== 追加テスト（今回） =====
// 14) 部分B: 調整の見える化
// 注意: 依頼の数値（関税33.84）は、旧初期値（上乗せ係数1.03・VAT率8%・EU送料差額1000円）では再現せず、上乗せ係数1・EU送料差額0円（VAT率8%のまま）のときに再現する（旧初期値だと関税41.20）。この2つのテストは設定を明示して作っているので、初期値の変更の影響を受けない
var PB = { feeRate: 0.20, adjustThresholdUSD: 20, safetyFactor: 1, euShippingDiffYen: 0 };
check('part B (with the OLD initial values 1.03 / VAT 8% / EU 1000 yen, given explicitly, the tariff is 41.20, not 33.84; recorded for the report)', calcRow(withS({ feeRate: 0.20, adjustThresholdUSD: 20 }), 20000, 1500, 0, 0).tariffUSD === 41.2, '');
check('part B: values at cost 20000 / ship 1500 / fee 20% / cap 20 (safety factor 1, EU diff 0)',
  (function () {
    var rb2 = calcRow(withS(PB), 20000, 1500, 0, 0);
    var ch = api.chargedTariffUSD(rb2, 20);
    return rb2.ok && rb2.sellingPriceUSD === 175.22 && rb2.tariffUSD === 33.84 && rb2.priceWithTariffUSD === 209.06
      && rb2.adjustedListingPriceUSD === 189.06 && ch === 20 && Math.abs(rb2.adjustedListingPriceUSD + ch - rb2.priceWithTariffUSD) < 0.005;
  })(), JSON.stringify(calcRow(withS(PB), 20000, 1500, 0, 0)));
var rnb = calcRow(S, 5000, 1500, 0.05, 0.05);
check('chargedTariffUSD: not adjusted row gives the tariff', api.chargedTariffUSD(rnb, 500) === rnb.tariffUSD && rnb.adjustedListingPriceUSD === null, JSON.stringify(rnb));

// 15) 追加のレビュー項目
var z = calcRow(S, 0, 0, 0, 0);
check('cost 0 / ship 0: selling 0, rate null, tariff = 1000/fx rounded (6.36)',
  z.ok && z.sellingPriceUSD === 0 && z.profitRatePct === null && z.tariffUSD === r2(1000 / 157.315109) && z.tariffUSD === 6.36 && z.profitYen === 0, JSON.stringify(z));
check('formatYen negative', api.formatYen(-1500) === '-1,500' && api.formatYen(-0.4) === '0' && api.formatYen(-1234567) === '-1,234,567', api.formatYen(-1500) + ' ' + api.formatYen(-0.4));
check('formatUsd negative', api.formatUsd(-12.5) === '-12.50' && api.formatUsd(-0.001) === '0.00' && api.formatUsd(1234.5) === '1,234.50', api.formatUsd(-12.5) + ' ' + api.formatUsd(-0.001));
check('parseNum full-width decimal point', parseNum('５．５') === 5.5, String(parseNum('５．５')));
check('parseNum: 1,000,000,000 is the largest allowed', api.MAX_INPUT === 1000000000 && parseNum('1000000000') === 1000000000 && parseNum('1,000,000,000') === 1000000000, String(parseNum('1000000000')));
check('parseNum: above 1,000,000,000 is invalid', parseNum('1000000001') === null && parseNum('1,000,000,001') === null && parseNum('1000000000.5') === null, '');
check('parseNum: 21-digit input is invalid (no exponent notation)', parseNum('123456789012345678901') === null && parseNum('999999999999999999999') === null, String(parseNum('123456789012345678901')));
var gbig = evalGroup(['99999999999999999999999', '1000'], 'amount', [1000, 2000, 3000, 5000]);
check('group: huge amount is invalid, other box still used', same(gbig, { values: [1000], invalid: [true, false], fellBack: false }), JSON.stringify(gbig));

// 16) 部分E: 4つ目の枠
var g4a = grp(['0', '5', '10', '15'], 'rate', [0, 5, 10, 15]);
check('four boxes: all valid', same(g4a, { values: [0, 5, 10, 15], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g4a));
var g4b = grp(['0', '5', '10', ''], 'rate', [0, 5, 10, 15]);
check('four boxes: one not used', same(g4b, { values: [0, 5, 10], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g4b));
var g4c = grp(['5', '5', '10', '10'], 'rate', [0, 5, 10, 15]);
check('four boxes: duplicates used once', same(g4c, { values: [5, 10], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g4c));
var g4d = grp(['5000', '1000', '', '5000'], 'amount', [1000, 2000, 3000, 5000]);
check('four boxes (amount): duplicates and empty', same(g4d, { values: [1000, 5000], invalid: [false, false, false, false], fellBack: false }), JSON.stringify(g4d));
check('page: four boxes with new initial values', /keys: \['pr1', 'pr2', 'pr3', 'pr4'\][^\n]*def: \[0, 5, 10, 15\]/.test(html)
  && /keys: \['pa1', 'pa2', 'pa3', 'pa4'\][^\n]*def: \[1000, 2000, 3000, 5000\][^\n]*opts: \[500, 1000, 1500, 2000, 3000, 4000, 5000, 10000\]/.test(html), '');
// 独立に計算した期待値（画面の外で計算）[ad, selling, tariff, withTariff, profitYen]
[[0, 63.57, 18.69, 82.26, 1500], [5, 68.86, 20.58, 89.44, 1625], [10, 75.12, 22.94, 98.06, 1772], [15, 82.64, 25.95, 108.59, 1950]].forEach(function (g) {
  var r = calcRow(S, 5000, 1500, g[0] / 100, 0.15);
  var got = [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.profitYen], exp = g.slice(1);
  check('new rate row: ad' + g[0] + '% profit15%', r.ok && got.join() === exp.join(), 'got ' + got.join('/') + ' expected ' + exp.join('/'));
});
// [ad, selling, tariff, withTariff, ratePct(小数1桁)]
[[0, 91.38, 24.09, 115.47, 34.8], [5, 97.47, 26.49, 123.96, 32.6], [10, 104.43, 29.41, 133.84, 30.4], [15, 112.46, 33.02, 145.48, 28.3]].forEach(function (g) {
  var r = calcRowAmount(S, 5000, 1500, g[0] / 100, 5000);
  var got = [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.ok ? Math.round(r.profitRatePct * 10) / 10 : null], exp = g.slice(1);
  check('new amount row: ad' + g[0] + '% profit 5000yen', r.ok && r.profitYen === 5000 && got.join() === exp.join(), 'got ' + got.join('/') + ' expected ' + exp.join('/'));
});

// 17) 部分C: 送料計算
var SP = { fuelFedex: 0.4, fuelDhl: 0.4, cpassDiscount: 0, extraFedex: 115, extraDhl: 96 };
var obs = api.shipCost('Cpass-Economy', 200, 25, 15, 10, SP);
check('shipping observed real value: 200g 25x15x10 Cpass-Economy = 2060', obs.ok && obs.yen === 2060 && obs.fallback === false && obs.weightG === 469, JSON.stringify(obs));
check('volumetric weight 25x15x10: /5 = 750, /8 = 469; minimum 200', api.shipVolWeight(25, 15, 10, 5) === 750 && api.shipVolWeight(25, 15, 10, 8) === 469 && api.shipVolWeight(1, 1, 1, 5) === 200, '');
var vecs = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-shipping-vectors.json'), 'utf8'));
var vRun = 0, vSkip = [], vFallback = 0;
vecs.forEach(function (v, i) {
  if (v.method === '自動選択') { vSkip.push('#' + (i + 1) + ' method 自動選択 (auto-select depends on unreadable document properties; not implemented)'); return; }
  vRun++;
  var p = { fuelFedex: v.fuelFedex, fuelDhl: v.fuelDhl, cpassDiscount: v.cpassDiscount, extraFedex: v.extraFedex, extraDhl: v.extraDhl };
  var r = api.shipCost(v.method, v.weightG, v.lengthCm, v.widthCm, v.heightCm, p);
  var label = 'ship vector #' + (i + 1) + ' ' + v.method + ' ' + v.weightG + 'g ' + v.lengthCm + 'x' + v.widthCm + 'x' + v.heightCm;
  if (typeof v.expectedYen !== 'number') {
    check(label + ' (input error)', r.ok === false && v.expectedYen === '入力値エラー', JSON.stringify(r));
    return;
  }
  var volDiv = v.method === 'Cpass-Economy' ? 8 : 5;
  var volW = Math.max(200, Math.round(v.lengthCm * v.widthCm * v.heightCm / volDiv));
  var expFallback = v.method === 'ePacket' ? v.weightG > 2000
    : v.method === 'Cpass-Economy' ? Math.max(v.weightG, volW) > 25000
    : v.method === 'EMS' ? v.weightG > 30000 : false;
  if (expFallback) vFallback++;
  check(label + ' = ' + v.expectedYen + (expFallback ? ' (fallback)' : ''), r.ok && r.yen === v.expectedYen && r.fallback === expFallback, JSON.stringify(r) + ' expected ' + v.expectedYen + ' fallback ' + expFallback);
});
console.log('shipping vectors: ' + vRun + ' run, ' + vSkip.length + ' skipped (of ' + vecs.length + '); of the run vectors ' + vFallback + ' expect the fallback flag');
vSkip.forEach(function (t) { console.log('  skipped: ' + t); });
// 上限（対象外）の境目
check('limits: ePacket 2000 ok / 2001 fallback', api.shipCost('ePacket', 2000, 10, 10, 10, SP).fallback === false && api.shipCost('ePacket', 2001, 10, 10, 10, SP).fallback === true, '');
check('limits: EMS 30000 ok / 30001 fallback', api.shipCost('EMS', 30000, 10, 10, 10, SP).fallback === false && api.shipCost('EMS', 30001, 10, 10, 10, SP).fallback === true, '');
check('limits: Cpass-Economy 25000 ok / 25001 fallback', api.shipCost('Cpass-Economy', 25000, 10, 10, 10, SP).fallback === false && api.shipCost('Cpass-Economy', 25001, 10, 10, 10, SP).fallback === true, '');
check('shipCost: empty / zero / NaN inputs are errors (never treated as 0)', [[ '', 10, 10, 10 ], [100, 0, 10, 10], [100, 10, NaN, 10], [100, 10, 10, undefined], [-5, 10, 10, 10]].every(function (a) {
  return api.shipCost('Cpass-FedEx', a[0], a[1], a[2], a[3], SP).ok === false; }), '');
check('six methods in the required order', same(api.SHIP_METHODS, ['ePacket', 'Cpass-Economy', 'EMS', 'Cpass-FedEx', 'Cpass-DHL', 'eLogistics']), JSON.stringify(api.SHIP_METHODS));
// ePacket は計算式。料金表の ePacket 列と 1〜2000g で同じか
var epDiff = 0;
for (var g = 1; g <= 2000; g++) { if (api.shipBandLookup('ePacket', g) !== api.shipEpacket(g)) epDiff++; }
check('ePacket formula equals the embedded ePacket column for 1..2000 g', epDiff === 0, epDiff + ' differences');
// 埋め込み料金表 = shipping-rates.json
var RATES_PATH = path.join(__dirname, 'test-shipping-rates.json');
if (!fs.existsSync(RATES_PATH)) {
  check('embedded bands vs test-shipping-rates.json (file must exist)', false, 'file not found: ' + RATES_PATH);
} else {
  var rj = JSON.parse(fs.readFileSync(RATES_PATH, 'utf8'));
  var keys = ['EP', 'CE', 'EMS', 'CF', 'CD', 'EL'], cells = 0, diffs = 0;
  if (rj.bands.length !== api.SHIP_BANDS.length) diffs++;
  rj.bands.forEach(function (b, i) {
    var row = api.SHIP_BANDS[i] || [];
    var exp = [b.from, b.to].concat(keys.map(function (k) { return b[k]; }));
    exp.forEach(function (v, j) { cells++; if (row[j] !== v) { diffs++; console.log('  band diff row ' + i + ' col ' + j + ': page ' + row[j] + ' json ' + v); } });
  });
  check('embedded bands equal shipping-rates.json (' + rj.bands.length + ' bands, ' + cells + ' cells compared, ' + diffs + ' differences)', diffs === 0 && rj.bands.length === 74, '');
}


// 18) F9: 追加の送料ベクター（超過料金0・燃油0・割引あり）。期待値はここで、料金表から別に計算する
var rj2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-shipping-rates.json'), 'utf8'));
function bandVal(col, w) {
  for (var i = 0; i < rj2.bands.length; i++) { var b = rj2.bands[i]; if (w >= b.from && (b.to === null || w <= b.to)) return b[col]; }
  return null;
}
function indepShip(col, rounded, extra, fuel, disc) {
  var base = bandVal(col, rounded), sub = base + Math.max(0, (rounded - 500) / 500) * extra, f = sub * fuel;
  return Math.round(sub + f - (sub + f) * disc);
}
[[600, 'Cpass-FedEx', 'CF', 1000, 0, 0.4, 0], [600, 'Cpass-FedEx', 'CF', 1000, 115, 0, 0], [3000, 'Cpass-DHL', 'CD', 3000, 0, 0.4, 0.05],
 [3000, 'Cpass-DHL', 'CD', 3000, 96, 0, 0], [1200, 'Cpass-DHL', 'CD', 1500, 0, 0, 0], [10000, 'Cpass-FedEx', 'CF', 10000, 0, 0, 0.1]].forEach(function (c) {
  var r = api.shipCost(c[1], c[0], 10, 10, 10, { fuelFedex: c[5], fuelDhl: c[5], cpassDiscount: c[6], extraFedex: c[4], extraDhl: c[4] });
  var e = indepShip(c[2], Math.ceil(Math.max(c[0], 200) / 500) * 500, c[4], c[5], c[6]);
  check('extra vector: ' + c[1] + ' ' + c[0] + 'g extra ' + c[4] + ' fuel ' + c[5] + ' discount ' + c[6] + ' = ' + e, r.ok && r.yen === e, JSON.stringify(r) + ' expected ' + e);
});
var noSur = api.shipCost('Cpass-FedEx', 500, 10, 10, 10, { fuelFedex: 0, fuelDhl: 0, cpassDiscount: 0, extraFedex: 0, extraDhl: 0 });
check('extra 0 / fuel 0 at 500 g gives the table value 2115', noSur.yen === 2115, JSON.stringify(noSur));

// 19) F9: 入力の判定
function vs(w, l, wi, h) { return api.validateShipInputs({ weight: w, length: l, width: wi, height: h }); }
check('validate: valid initial', vs('200', '25', '15', '10').ok === true && vs('200', '25', '15', '10').w === 200, '');
check('validate: empty is invalid, not 0 (and not marked bad)', vs('', '25', '15', '10').ok === false && !vs('', '25', '15', '10').bad.weight && vs('200', '', '15', '10').ok === false, '');
check('validate: 0 invalid (marked bad)', vs('0', '25', '15', '10').ok === false && vs('0', '25', '15', '10').bad.weight === true, '');
check('validate: negative invalid', vs('-5', '25', '15', '10').ok === false && vs('200', '25', '-1', '10').bad.width === true, '');
check('validate: 200.5 becomes 201', vs('200.5', '25', '15', '10').w === 201 && vs('200.0', '25', '15', '10').w === 200 && vs('0.2', '25', '15', '10').w === 1, String(vs('200.5', '25', '15', '10').w));
check('validate: full-width digits', vs('２００', '２５', '１５', '１０').ok === true && vs('２００', '２５', '１５', '１０').w === 200 && vs('２００', '２５．５', '15', '10').l === 25.5, '');
check('validate: thousands separator', vs('1,500', '25', '15', '10').w === 1500 && vs('1,50', '25', '15', '10').ok === false, '');
check('validate: above 1,000,000,000 invalid, exactly 1,000,000,000 valid', vs('1000000001', '25', '15', '10').ok === false && vs('200', '25', '15', '1000000001').bad.height === true && vs('1000000000', '25', '15', '10').ok === true, '');
function fu(o) { var b = { shFuelF: '40', shFuelD: '40', shDisc: '0', shExF: '115', shExD: '96' }; for (var k in o) b[k] = o[k]; return api.validateFuelSection(b); }
check('fuel: initial values valid, converted once (40 -> 0.4)', fu({}).anyBad === false && fu({}).p.fuelFedex === 0.4 && fu({}).p.extraFedex === 115 && fu({}).p.cpassDiscount === 0, JSON.stringify(fu({})));
check('fuel: 100 valid, 100.1 invalid', fu({ shFuelF: '100' }).anyBad === false && fu({ shFuelF: '100' }).p.fuelFedex === 1 && fu({ shFuelD: '100.1' }).bad.shFuelD === true && fu({ shFuelD: '100.1' }).p.fuelDhl === 0.4, '');
check('fuel: discount 100 valid, above 100 invalid', fu({ shDisc: '100' }).anyBad === false && fu({ shDisc: '100.5' }).bad.shDisc === true && fu({ shDisc: '101' }).anyBad === true, '');
check('fuel: extra 100,000 valid, 100,001 invalid', fu({ shExF: '100000' }).anyBad === false && fu({ shExF: '100001' }).bad.shExF === true && fu({ shExD: '100,001' }).bad.shExD === true && fu({ shExD: '100,000' }).anyBad === false, '');
check('fuel: empty and garbage invalid', fu({ shFuelF: '' }).bad.shFuelF === true && fu({ shExD: 'abc' }).bad.shExD === true && fu({ shDisc: '-1' }).bad.shDisc === true, '');
// 重さの上限（FedEx / DHL / eLogistics は 68,000g）
['Cpass-FedEx', 'Cpass-DHL', 'eLogistics'].forEach(function (m) {
  var a = api.shipCost(m, 68000, 10, 10, 10, SP), b2 = api.shipCost(m, 68001, 10, 10, 10, SP);
  check('limit 68,000 g: ' + m + ' 68000 allowed / 68001 not available', api.shipAvailability(m, a) === null && api.shipAvailability(m, b2) !== null && api.shipAvailability(m, b2).limit === 68000, JSON.stringify([a, b2]));
});
check('availability: fallback rows report their own limit', api.shipAvailability('ePacket', api.shipCost('ePacket', 2001, 10, 10, 10, SP)).limit === 2000 && api.shipAvailability('EMS', api.shipCost('EMS', 30001, 10, 10, 10, SP)).limit === 30000 && api.shipAvailability('Cpass-Economy', api.shipCost('Cpass-Economy', 25001, 10, 10, 10, SP)).limit === 25000, '');
check('availability: normal rows are available', api.shipAvailability('EMS', api.shipCost('EMS', 500, 10, 10, 10, SP)) === null && api.SHIP_WEIGHT_MAX === 68000, '');

// 20) F9: 保存データの読み込み
var BASE = { fxAt: '', fxSource: 'default', tab: 'profit', revMode: 'excl', revPrice: '100', capOpen: true, exchangeRate: '157.315109', useCpassEconomy: false, adjustEnabled: true, capCategory: caps[0], profitMode: 'rate', pr1: '0', pr2: '5', pr3: '10', pr4: '15', pa1: '1000', pa4: '5000', shWeight: '200', shL: '25', shFuelF: '40' };
function ld(o) { return api.loadStored(o, BASE); }
var initOut = { state: BASE, inputs: { cost: '5000', ship: '1500' }, applied: null };
check('load: old data without pr4 / pa4 / shipping keys keeps initial values', (function () {
  var r = ld({ exchangeRate: '150', pr1: '1', pr2: '2', pr3: '3', capCategory: caps[2], useCpassEconomy: true });
  return r.state.pr4 === '15' && r.state.pa4 === '5000' && r.state.shWeight === '200' && r.state.exchangeRate === '150' && r.state.pr1 === '1' && r.state.capCategory === caps[2] && r.state.useCpassEconomy === true
    && r.inputs.cost === '5000' && r.inputs.ship === '1500' && r.applied === null; })(), '');
check('load: wrong types are ignored', (function () {
  var r = ld({ exchangeRate: 150, useCpassEconomy: 'yes', adjustEnabled: 0, pr1: null, pr2: [], shL: {}, profitMode: 5, inputs: 'x', applied: 3 });
  return same(r.state, BASE) && same(r.inputs, initOut.inputs) && r.applied === null; })(), '');
check('load: unknown category label and unknown profit mode', (function () { var r = ld({ capCategory: 'Nope（$99）', profitMode: 'x' }); return r.state.capCategory === caps[0] && r.state.profitMode === 'rate'; })(), '');
check('load: null / number / array / string / undefined give the initial state', [null, 5, [1, 2], 'abc', undefined, true].every(function (g) { var r = ld(g); return same(r.state, BASE) && same(r.inputs, initOut.inputs) && r.applied === null; }), '');
check('load: does not change the base object', (function () { var b0 = JSON.stringify(BASE); ld({ pr1: '9' }); return JSON.stringify(BASE) === b0; })(), '');
check('load: stored main inputs are restored', (function () { var r = ld({ inputs: { cost: '8000', ship: '2060' } }); return r.inputs.cost === '8000' && r.inputs.ship === '2060'; })(), '');
var ap = { m: 'Cpass-Economy', weightEntered: 200, weightG: 469, yen: 2060 };
check('load: applied record kept only while shipping input equals the applied yen', (function () {
  var ok = ld({ inputs: { cost: '1', ship: '2060' }, applied: ap });
  var edited = ld({ inputs: { cost: '1', ship: '2061' }, applied: ap });
  var noInputs = ld({ applied: ap });
  return same(ok.applied, ap) && edited.applied === null && noInputs.applied === null; })(), '');
check('load: bad applied records are dropped', [{ m: 'Nope', weightEntered: 1, weightG: 1, yen: 2060 }, { m: 'EMS', weightEntered: '1', weightG: 1, yen: 2060 }, { m: 'EMS', weightEntered: 1, weightG: 1 }, { m: 'EMS', weightEntered: 1, weightG: 1, yen: -5 }, [], 'x'].every(function (a) {
  return ld({ inputs: { cost: '1', ship: '2060' }, applied: a }).applied === null; }), '');

// 21) F10: プルダウン
check('pickMatch: exact / numeric-equal / none / empty / invalid', (function () {
  var o = [100, 200, 1000, 29.75];
  return api.pickMatch('200', o) === '200' && api.pickMatch('1,000', o) === '1000' && api.pickMatch('29.750', o) === '29.75' && api.pickMatch('２００', o) === '200'
    && api.pickMatch('150', o) === '__custom' && api.pickMatch('', o) === '__custom' && api.pickMatch('abc', o) === '__custom' && api.pickMatch('-100', o) === '__custom'
    && api.pickMatch(undefined, o) === '__custom' && api.pickMatch('1e3', o) === '__custom'; })(), '');
check('shipping fields: initial values and option lists as requested', (function () {
  var d = {}; api.SHDEFS.forEach(function (f) { d[f.k] = f; });
  var dims = [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  return d.shWeight.def === '200' && same(d.shWeight.opts, [100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 30000])
    && same(d.shL.opts, dims) && same(d.shW.opts, dims) && same(d.shH.opts, dims) && d.shL.def === '25' && d.shW.def === '15' && d.shH.def === '10'
    && same(d.shFuelF.opts, [0, 20, 25, 29.75, 30, 35, 40, 45, 50]) && same(d.shFuelD.opts, d.shFuelF.opts) && d.shFuelF.def === '40' && d.shFuelD.def === '40'
    && same(d.shDisc.opts, [0, 1, 2, 3, 5, 10]) && d.shDisc.def === '0' && same(d.shExF.opts, [0, 50, 100, 115, 150, 200]) && d.shExF.def === '115'
    && same(d.shExD.opts, [0, 50, 96, 100, 150, 200]) && d.shExD.def === '96'
    && api.SHDEFS.every(function (f) { return f.opts.some(function (v) { return String(v) === f.def; }); }); })(), '');

// 22) 仕入れ価格早見表（期待値は画面の外で独立に計算したもの）
var cr = api.calcRev;
// (a) 率モード・価格100（関税を含まない）・送料1500 [ad, profit, costYen, profitYen, tariff, withTariff]
[[0,0,11085,0,25.76,125.76],[0,5,10298,787,25.76,125.76],[0,10,9512,1573,25.76,125.76],[0,15,8725,2360,25.76,125.76],
 [5,0,10298,1,27.01,127.01],[5,5,9512,787,27.01,127.01],[5,10,8725,1574,27.01,127.01],[5,15,7938,2361,27.01,127.01],
 [10,0,9512,0,28.43,128.43],[10,5,8725,787,28.43,128.43],[10,10,7938,1574,28.43,128.43],[10,15,7152,2360,28.43,128.43],
 [15,0,8725,0,30.07,130.07],[15,5,7938,787,30.07,130.07],[15,10,7152,1573,30.07,130.07],[15,15,6365,2360,30.07,130.07]].forEach(function (g) {
  var r = cr(S, 100, 'excl', 1500, g[0] / 100, 'rate', g[1] / 100);
  var got = [r.costYen, r.profitYen, r.tariffUSD, r.priceWithTariffUSD], exp = g.slice(2);
  check('rev (a) rate ad' + g[0] + ' profit' + g[1], r.ok && r.sellingPriceUSD === 100 && got.join() === exp.join(), 'got ' + got.join('/') + ' expected ' + exp.join('/'));
});
// (b) 利益額モード [ad, amount, costYen, ratePct]
[[0,1000,10085,6.4],[0,2000,9085,12.7],[0,3000,8085,19.1],[0,5000,6085,31.8],[5,1000,9298,6.4],[5,2000,8298,12.7],[5,3000,7298,19.1],[5,5000,5298,31.8],
 [10,1000,8512,6.4],[10,2000,7512,12.7],[10,3000,6512,19.1],[10,5000,4512,31.8],[15,1000,7725,6.4],[15,2000,6725,12.7],[15,3000,5725,19.1],[15,5000,3725,31.8]].forEach(function (g) {
  var r = cr(S, 100, 'excl', 1500, g[0] / 100, 'amount', g[1]);
  var got = [r.costYen, r.ok ? Math.round(r.profitRatePct * 10) / 10 : null];
  check('rev (b) amount ad' + g[0] + ' amount' + g[1], r.ok && r.profitYen === g[1] && got.join() === [g[2], g[3]].join(), 'got ' + got.join('/') + ' expected ' + g[2] + '/' + g[3]);
});
// (c) 率モード・利益10%・価格120（関税込み） [ad, R, tariff, withTariff, costYen, profitYen]
[[0,95.17,24.82,119.99,8980,1497],[5,94.19,25.81,120.00,8131,1482],[10,93.09,26.91,120.00,7286,1465],[15,91.86,28.14,120.00,6448,1445]].forEach(function (g) {
  var r = cr(S, 120, 'incl', 1500, g[0] / 100, 'rate', 0.10);
  var got = [r.sellingPriceUSD, r.tariffUSD, r.priceWithTariffUSD, r.costYen, r.profitYen];
  check('rev (c) tariff-included 120 ad' + g[0], r.ok && got.join() === g.slice(1).join(), 'got ' + got.join('/') + ' expected ' + g.slice(1).join('/'));
});
// (d) 価格20・送料4000・広告15%・利益15% -> 仕入れ価格 -2427（利益が出ない）
var rd = cr(S, 20, 'excl', 4000, 0.15, 'rate', 0.15);
check('rev (d) no-profit row: cost -2427', rd.ok && rd.costYen === -2427 && rd.unreachable === true, JSON.stringify(rd));
// (e) 上限20・調整ON・価格100
var S20r = withS({ adjustThresholdUSD: 20 });
var re0 = cr(S20r, 100, 'excl', 1500, 0, 'rate', 0.05), re15 = cr(S20r, 100, 'excl', 1500, 0.15, 'rate', 0.05);
check('rev (e) cap 20: ad0 listing 105.76, ad15 listing 110.07, charged 20', re0.adjustedListingPriceUSD === 105.76 && re15.adjustedListingPriceUSD === 110.07
  && api.chargedTariffUSD(re0, 20) === 20 && api.chargedTariffUSD(re15, 20) === 20, JSON.stringify([re0, re15]));
// 往復テスト: 仕入れ価格を順方向の関数に戻すと、販売価格が R の近くに戻る
var rtN = 0, rtMax = 0, rtBad = 0, rt01 = 0;
[20, 35, 50, 80, 100, 150, 200, 350, 500, 1000].forEach(function (P) {
  [0, 1500, 4000].forEach(function (sh) { [0, 5, 10, 15].forEach(function (ad) { [0, 5, 10, 15, 20, 30, 45].forEach(function (pf) {
    var r = cr(S, P, 'excl', sh, ad / 100, 'rate', pf / 100);
    if (!r.ok || r.unreachable) return;
    var f = calcRow(S, r.costYen, sh, ad / 100, pf / 100);
    if (!f.ok) return;
    rtN++; var d = Math.abs(f.sellingPriceUSD - r.sellingPriceUSD); if (d > rtMax) rtMax = d; if (d > 0.01 + 1e-9) rt01++;
    // 仕入れ価格は円未満を切り捨てるので、戻した販売価格は最大で「1円分」だけ小さくなる（1円 ÷ 為替 ÷ (1 − 率の合計)）
    var bound = 1 / (157.315109 * (1 - (0.18 + pf / 100 + ad / 100 + 0.02))) + 0.01;
    if (d > bound + 1e-9 || f.sellingPriceUSD > r.sellingPriceUSD + 1e-9) rtBad++;
  }); }); });
});
console.log('round trip: ' + rtN + ' rows checked, largest difference ' + rtMax.toFixed(4) + ' USD, rows above 0.01: ' + rt01 + ', rows above the 1-yen bound: ' + rtBad);
check('rev round trip: forward selling price never above R, and below R by at most 1 yen worth + 0.01 (' + rtN + ' rows, max diff ' + rtMax.toFixed(4) + ', ' + rt01 + ' rows above plain 0.01)', rtN > 300 && rtBad === 0, rtBad + ' rows out of bound');
// 負のゼロが出ない・計算不可
var rz = cr(S, 100, 'excl', 0, 0, 'rate', 0);
check('rev: no negative zero', [rz.costYen, rz.profitYen, rz.tariffUSD].every(function (v) { return !isNegZero(v); }), JSON.stringify(rz));
check('rev: not computable when rates reach 100%', cr(S, 100, 'excl', 1500, 0.05, 'rate', 0.75).ok === false && cr(S, 100, 'excl', 1500, 0.8, 'amount', 1000).ok === false && cr(withS({ feeRate: 0.5 }), 100, 'incl', 1500, 0.5, 'rate', 0).ok === false, '');
check('rev: tariff-included price too small to leave anything is not computable', cr(S, 5, 'incl', 1500, 0, 'rate', 0).ok === false, JSON.stringify(cr(S, 5, 'incl', 1500, 0, 'rate', 0)));
// 入力の判定
function vr(p, sh) { return api.validateRevInputs(p, sh); }
check('rev inputs: valid / decimals / full-width / commas', vr('100', '1500').ok && vr('99.99', '0').price === 99.99 && vr('１００．５', '1,500').price === 100.5 && vr('1,000', '0').price === 1000, '');
check('rev inputs: empty, 0, 3 decimals, negative, huge are invalid', !vr('', '1500').ok && !vr('0', '1500').ok && !vr('0.00', '1500').ok && !vr('1.234', '1500').ok && !vr('-5', '1500').ok && !vr('1000000001', '1500').ok && !vr('100', '').ok && !vr('100', 'x').ok, '');
check('rev inputs: badPrice only when non-empty', vr('', '1').badPrice === false && vr('0', '1').badPrice === true && vr('1.234', '1').badPrice === true, '');
check('rev inputs: shipping 0 is allowed, price 0.01 allowed', vr('0.01', '0').ok === true, '');
check('rev summary text', api.revSummaryText('excl') === '入力した価格は関税を含まない販売価格' && api.revSummaryText('incl') === '入力した価格は関税込み価格' && api.revSummaryText('x') === '入力した価格は関税を含まない販売価格', '');
// 保存データ（新しい項目）
check('load: old data without tab / revMode / revPrice / capOpen loads initial values', (function () {
  var r = ld({ exchangeRate: '150', pr1: '1' }); return r.state.tab === 'profit' && r.state.revMode === 'excl' && r.state.revPrice === '100' && r.state.capOpen === true && r.state.exchangeRate === '150'; })(), '');
check('load: new keys restored', (function () {
  var r = ld({ tab: 'rev', revMode: 'incl', revPrice: '120', capOpen: false }); return r.state.tab === 'rev' && r.state.revMode === 'incl' && r.state.revPrice === '120' && r.state.capOpen === false; })(), '');
check('load: new keys with bad values fall back', (function () {
  var r = ld({ tab: 'x', revMode: 3, revPrice: 100, capOpen: 'no' }); return r.state.tab === 'profit' && r.state.revMode === 'excl' && r.state.revPrice === '100' && r.state.capOpen === true; })(), '');
check('page: page has both tab buttons, no alert/confirm/prompt', /id="tabProfit"/.test(html) && /id="tabRev"/.test(html) && !/\b(alert|confirm|prompt)\s*\(/.test(html), '');


// 23) H: 追加テスト
// H2/H11: 指定した利益を出せない行（価格100・送料12000・広告0・利益30%）
var ru = api.calcRev(S, 100, 'excl', 12000, 0, 'rate', 0.30);
check('rev: target not reachable (price 100, ship 12000, ad 0, profit 30%): cost -4135', ru.ok && ru.costYen === -4135 && ru.unreachable === true, JSON.stringify(ru));
check('rev: reachable rows are not flagged', api.calcRev(S, 100, 'excl', 1500, 0, 'rate', 0.10).unreachable === false, '');
check('page wording: no-profit message replaced', html.indexOf('指定した利益を出せる仕入れ価格がありません') >= 0 && html.indexOf('この条件では利益が出ません') < 0, '');
// H4: 説明文の出る条件
var adjRow = { ok: true, adjustedListingPriceUSD: 105.76 }, plainRow = { ok: true, adjustedListingPriceUSD: null };
check('legend: shown when a displayed row has the adjustment lines', api.legendVisible([plainRow, adjRow]) === true, '');
check('legend: hidden when no row is adjusted', api.legendVisible([plainRow, plainRow]) === false && api.legendVisible([]) === false, '');
check('legend: rows with no-profit or not-computable message do not count', api.legendVisible([{ ok: true, unreachable: true, adjustedListingPriceUSD: 9 }, { ok: false }]) === false
  && api.legendVisible([{ ok: true, unreachable: true, adjustedListingPriceUSD: 9 }, adjRow]) === true, '');
check('legend: real rows (cost 500000 forward, cap 20 unreachable reverse)', api.legendVisible([calcRow(S, 500000, 1500, 0.05, 0.05)]) === true
  && api.legendVisible([api.calcRev(S20r, 20, 'excl', 4000, 0.15, 'rate', 0.15)]) === false, '');
// H5/H11: 価格の読み取り
check('rev price parsing: 12.300 valid as 12.3, 12.30 valid, 12.345 invalid (decimals)', vr('12.300', '0').ok && vr('12.300', '0').price === 12.3 && vr('12.30', '0').price === 12.3
  && !vr('12.345', '0').ok && vr('12.345', '0').decimals === true && vr('12.3450', '0').decimals === true && vr('12.3000000', '0').price === 12.3 && vr('12.3', '0').decimals === false && vr('', '0').decimals === false, JSON.stringify(vr('12.300', '0')));
check('rev price parsing: 1,000.500 and full-width 12．300', vr('1,000.500', '0').price === 1000.5 && vr('１２．３００', '0').price === 12.3, '');
check('rev price parsing: 0.000 is invalid (zero)', !vr('0.000', '0').ok && vr('0.000', '0').decimals === false, '');
// H11: 関税込み価格からの逆算（期待値は、ここで別に書いた計算で出す）
var invN = 0, invBad = 0;
(function () {
  var fx = 157.315109;
  [50, 80, 100, 120, 250, 499.99, 800].forEach(function (P) { [0, 0.05, 0.10, 0.15].forEach(function (ad) { [false, true].forEach(function (ce) {
    var adj = 0.15 / (1 - 0.18 - ad) * 1.03;
    var k = adj * 1.021 + 0.08 * 0.021;
    var c = (ce ? 296 / fx : 0) + 0 + 1000 / fx;
    var Rexp = Math.round((P - c) / (1 + k) * 100) / 100;
    var r = api.calcRev(withS({ useCpassEconomy: ce }), P, 'incl', 1500, ad, 'rate', 0.10);
    invN++;
    if (!(r.ok && r.sellingPriceUSD === Rexp)) { invBad++; console.log('  inversion diff P=' + P + ' ad=' + ad + ' ce=' + ce + ': got ' + (r.ok ? r.sellingPriceUSD : 'n/a') + ' expected ' + Rexp); }
    // 逆算した R から前向きに関税込み価格を出すと、入力の近く（±0.02）に戻る
    if (r.ok && Math.abs(r.priceWithTariffUSD - P) > 0.02) { invBad++; console.log('  back-check diff P=' + P + ': ' + r.priceWithTariffUSD); }
  }); }); });
})();
console.log('tariff-included inversion grid: ' + invN + ' cases, ' + invBad + ' differences');
check('rev: tariff-included inversion equals independently written arithmetic (' + invN + ' cases)', invN === 56 && invBad === 0, invBad + ' differences');
check('tariffInputs: single source gives the same k and c as the written-out formula', (function () {
  var t = api.tariffInputs(S, 0.05), adj = 0.15 / (1 - 0.18 - 0.05) * 1.03;
  return t.adj === adj && t.k === adj * 1.021 + 0.08 * 0.021 && t.c === 0 + 0 + 1000 / 157.315109 && api.tariffInputs(S, 0.82) === null; })(), '');
// H3: 初期値に戻すの範囲
var BASE2 = { fxAt: '', fxSource: 'default', tab: 'profit', revMode: 'excl', revPrice: '100', capOpen: true, exchangeRate: '157.315109', profitMode: 'rate', capCategory: caps[0], useCpassEconomy: false, pr1: '0', shWeight: '200', shFuelF: '40', adjustEnabled: true };
var curState = { tab: 'rev', revMode: 'incl', revPrice: '77.5', capOpen: false, exchangeRate: '150', profitMode: 'amount', capCategory: caps[1], useCpassEconomy: true, pr1: '9', shWeight: '999', shFuelF: '10', adjustEnabled: false };
var MSG0 = '設定を初期値に戻しました。利益の決め方・送料上限カテゴリ・送料計算の条件も初期値に戻っています。入力した仕入れ・価格・送料はそのままです。';
var rs1 = api.resetScope(curState, { cost: '8000', ship: '2060' }, { m: 'Cpass-Economy', weightEntered: 200, weightG: 469, yen: 2060 }, BASE2);
check('reset scope: settings, profit switch, category, checkboxes, shipping fields reset', rs1.state.exchangeRate === '157.315109' && rs1.state.profitMode === 'rate' && rs1.state.capCategory === caps[0] && rs1.state.useCpassEconomy === false && rs1.state.pr1 === '0' && rs1.state.shWeight === '200' && rs1.state.shFuelF === '40' && rs1.state.adjustEnabled === true, JSON.stringify(rs1.state));
check('reset scope: tab, price, price meaning, category open state and typed inputs are kept', rs1.state.tab === 'rev' && rs1.state.revMode === 'incl' && rs1.state.revPrice === '77.5' && rs1.state.capOpen === false && rs1.inputs.cost === '8000' && rs1.inputs.ship === '2060', JSON.stringify(rs1));
check('reset scope: with a caption, the record is cleared and the extra sentence is appended', rs1.applied === null && rs1.message === MSG0 + '送料計算から設定した表示は消しました。', rs1.message);
var rs2 = api.resetScope(curState, { cost: '8000', ship: '1500' }, null, BASE2);
check('reset scope: without a caption, the message has no extra sentence', rs2.applied === null && rs2.message === MSG0, rs2.message);
check('reset scope: does not change its inputs', curState.exchangeRate === '150' && curState.tab === 'rev', '');
// H7: 率の表示
check('formatPercent: 0.0000001 shown as a plain decimal (no exponent)', api.formatPercent(0.0000001) === '0.0000001' && api.formatPercent('0.0000001') === '0.0000001' && api.formatPercent(0.00000123) === '0.00000123', api.formatPercent(0.0000001));
check('formatPercent: 29.75 / 5 / 12.5000 / 0 / 100 / 0.00004', api.formatPercent(29.75) === '29.75' && api.formatPercent(5) === '5' && api.formatPercent('12.5000') === '12.5' && api.formatPercent(12.5) === '12.5' && api.formatPercent(0) === '0' && api.formatPercent(100) === '100' && api.formatPercent(0.00004) === '0.00004' && api.formatPercent(10) === '10', [29.75, 5, 12.5, 0, 100, 0.00004, 10].map(api.formatPercent).join(','));
check('formatPercent: 4 decimals at most, no exponent for any typed value', api.formatPercent(18.000000000000004) === '18' && api.formatPercent(1.23456) === '1.2346' && api.formatPercent('1e-7') === null && api.formatPercent('abc') === null && !/e/.test(api.formatPercent(0.0000001)), '');
check('evalGroup: a tiny non-zero rate below 1e-12 is invalid, 0 and 0.0000001 are valid', (function () { var g = evalGroup(['0', '0.0000001', '0.0000000000001', ''], 'rate', [0, 5]); return same(g.values, [0, 1e-7]) && g.invalid[2] === true; })(), '');
// H10: 順方向と逆方向が同じ式を使う
check('forward and reverse use the same tariff function (page text has one copy of the tariff formula)', (html.match(/R \* ti\.adj \* \(1 \+ s\.processingFeeRate\)/g) || []).length === 1 && (html.match(/sellingPriceUSD \* adjustedTariffRate/g) || []).length === 0 && (html.match(/function tariffFor/g) || []).length === 1, '');
check('page: hidden class cannot be overridden', /\.hidden \{ display: none !important; \}/.test(html), '');
check('page: Escape ignores IME composition; fetch has a timeout', /e\.isComposing \|\| e\.keyCode === 229/.test(html) && /AbortController/.test(html) && /10000/.test(html) && html.indexOf('為替を取得できませんでした（時間切れ）。もう一度お試しください。') >= 0, '');
check('page: purchase-cost floor has no +1e-9', !/Math\.floor\([^)]*1e-9/.test(html) && (html.match(/Math\.floor\(/g) || []).length >= 2, '');

// 拡張機能（サイドパネル）用のリンク切り替え
var mx = html.match(/\/\/ EXT-START([\s\S]*?)\/\/ EXT-END/);
check('ext: EXT block found', !!mx, '');
var extensionUrls = mx ? new Function(mx[1] + '; return extensionUrls;')() : null;
if (extensionUrls) {
  var GUIDE_ABS = 'https://naokijodan.github.io/profit-matrix/guide.html', WEB_ABS = 'https://naokijodan.github.io/profit-matrix/';
  var ux = extensionUrls('chrome-extension:');
  check('ext: chrome-extension: gives absolute guide URL and shows the web button', ux.guideUrl === GUIDE_ABS && ux.webUrl === WEB_ABS && ux.showWebLink === true && ux.inExtension === true, JSON.stringify(ux));
  var uh = extensionUrls('https:'), uf = extensionUrls('file:');
  check('ext: https: gives the relative guide link and hides the web button', uh.guideUrl === 'guide.html' && uh.showWebLink === false && uh.inExtension === false, JSON.stringify(uh));
  check('ext: file: gives the relative guide link and hides the web button', uf.guideUrl === 'guide.html' && uf.showWebLink === false && uf.inExtension === false, JSON.stringify(uf));
}
check('ext: markup has the hidden web link and the in-extension styles', /<a class="guidelink hidden" id="webLink" href="https:\/\/naokijodan\.github\.io\/profit-matrix\/" target="_blank" rel="noopener">ウェブ版<\/a>/.test(html) && /body\.in-extension\.settings-open \{ padding-right: 0; \}/.test(html) && /var IN_EXTENSION = location\.protocol === 'chrome-extension:'/.test(html), '');

check('credit: attribution link text and URL appear exactly twice (footer and settings)', html.split('為替レートの提供: <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>').length - 1 === 2, '');

// 24) J1: 為替の取得時刻と状態の表示
var T0 = Date.UTC(2026, 8, 29, 18, 20);   // 日本時間 2026-09-30 03:20
check('formatFxTime: 9/30 03:20 in Japan time', api.formatFxTime(T0, 540) === '9/30 03:20', api.formatFxTime(T0, 540));
check('formatFxTime: no zero padding for month/day, zero padding for hour/minute', api.formatFxTime(Date.UTC(2026, 0, 4, 22, 5), 540) === '1/5 07:05' && api.formatFxTime(Date.UTC(2026, 11, 31, 14, 59), 540) === '12/31 23:59' && api.formatFxTime(T0, 0) === '9/29 18:20', '');
check('formatFxTime: default uses the local time zone', (function () { var d = new Date(T0); return api.formatFxTime(T0) === (d.getMonth() + 1) + '/' + d.getDate() + ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); })(), api.formatFxTime(T0));
check('fxStatusText: default / manual / fetched', api.fxStatusText('default', '') === '初期値' && api.fxStatusText('manual', String(T0), 540) === '手入力の値（9/30 03:20）' && api.fxStatusText('manual', '') === '手入力の値' && api.fxStatusText('fetched', String(T0), 540) === '9/30 03:20 に取得', api.fxStatusText('fetched', String(T0), 540));
check('fxStatusText: fetched without a usable time, and unknown source', api.fxStatusText('fetched', '') === '取得した値' && api.fxStatusText('fetched', 'abc') === '取得した値' && api.fxStatusText('fetched', '0') === '取得した値' && api.fxStatusText('fetched', 5) === '取得した値' && api.fxStatusText('x', '') === '初期値' && api.fxStatusText(undefined) === '初期値', '');
// J3: 為替の新しい保存項目
check('load: old data without fxAt / fxSource gives initial values', (function () { var r = ld({ exchangeRate: '150' }); return r.state.fxAt === '' && r.state.fxSource === 'default' && r.state.exchangeRate === '150'; })(), '');
check('load: fxAt / fxSource restored', (function () { var r = ld({ exchangeRate: '151.2', fxSource: 'fetched', fxAt: String(T0) }); return r.state.fxSource === 'fetched' && r.state.fxAt === String(T0) && api.fxStatusText(r.state.fxSource, r.state.fxAt, 540) === '9/30 03:20 に取得'; })(), '');
check('load: manual source restored', ld({ fxSource: 'manual' }).state.fxSource === 'manual', '');
check('load: bad fxAt / fxSource fall back', (function () { var r = ld({ fxSource: 'x', fxAt: 123 }), r2 = ld({ fxSource: 5, fxAt: '1e5' }), r3 = ld({ fxAt: '12abc' }), r4 = ld({ fxAt: '1234567890123456' }); return r.state.fxSource === 'default' && r.state.fxAt === '' && r2.state.fxSource === 'default' && r2.state.fxAt === '' && r3.state.fxAt === '' && r4.state.fxAt === ''; })(), '');
check('reset scope: exchange-rate source and time go back to initial', (function () {
  var r = api.resetScope(Object.assign({}, curState, { fxSource: 'fetched', fxAt: String(T0) }), { cost: '1', ship: '2' }, null, BASE2); return r.state.fxSource === 'default' && r.state.fxAt === '' && api.fxStatusText(r.state.fxSource, r.state.fxAt) === '初期値'; })(), '');
// 入力値の保存と復元（仕入れ・送料・価格）
check('load: typed cost, shipping and price are restored from stored data', (function () { var r = ld({ inputs: { cost: '8000', ship: '2,060' }, revPrice: '123.45' }); return r.inputs.cost === '8000' && r.inputs.ship === '2,060' && r.state.revPrice === '123.45'; })(), '');
check('load: initial values are used when nothing is stored', [null, undefined, {}].every(function (g) { var r = ld(g); return r.inputs.cost === '5000' && r.inputs.ship === '1500' && r.state.revPrice === '100'; }), '');
check('load: empty typed strings are kept as typed (not replaced by initial values)', (function () { var r = ld({ inputs: { cost: '', ship: '' }, revPrice: '' }); return r.inputs.cost === '' && r.inputs.ship === '' && r.state.revPrice === ''; })(), '');
check('load: wrong-typed inputs fall back to initial values', (function () { var r = ld({ inputs: { cost: 8000, ship: null }, revPrice: 120 }); return r.inputs.cost === '5000' && r.inputs.ship === '1500' && r.state.revPrice === '100'; })(), '');
// ページの部品
check('page: exchange-rate block on the heading row, both buttons share one fetch function', /id="fxBtnMain"/.test(html) && /id="fxStatus"/.test(html) && /id="fxRate"/.test(html) && /class="headrow"/.test(html) && (html.match(/function fetchFx/g) || []).length === 1 && /\$\('fxBtnMain'\)\.addEventListener\('click', fetchFx\)/.test(html) && /\$\('fxBtn'\)\.addEventListener\('click', fetchFx\)/.test(html) && /\['fxBtn', 'fxBtnMain'\]/.test(html), '');
check('page: hand-edited rate is marked manual', /if \(f\.fx\) \{ state\.fxSource = 'manual';/.test(html), '');
check('page: the cancelled input-recall dropdown feature left no trace (the calculator record button is separate)', !new RegExp('his' + 'tAdd|his' + 'tRepair|his' + 'tCost|his' + 'tShip|his' + 'tPrice', 'i').test(html) && html.indexOf('labrow') < 0, '');


// 25) K: 初期値の変更（上乗せ係数 1、VAT率 0、EU送料差額 0）
function pageDef(key) { var m2 = new RegExp("k: '" + key + "'[^\\n]*?def: '([^']*)'").exec(html); return m2 ? m2[1] : null; }
check('page defaults: safety factor 1, VAT 0, EU shipping difference 0', pageDef('safetyFactor') === '1' && pageDef('vatRate') === '0' && pageDef('euShippingDiffYen') === '0', [pageDef('safetyFactor'), pageDef('vatRate'), pageDef('euShippingDiffYen')].join('/'));
check('page defaults: the other tariff-related defaults are unchanged', pageDef('feeRate') === '18' && pageDef('payoneerRate') === '2' && pageDef('tariffRate') === '15' && pageDef('processingFeeRate') === '2.1' && pageDef('mpfUSD') === '0' && pageDef('ceCustomsFeeYen') === '296' && pageDef('exchangeRate') === '157.315109', '');
check('page defaults: the option lists still contain the new default values', /k: 'safetyFactor'[^\n]*opts: \['1',/.test(html) && /k: 'vatRate'[^\n]*opts: \['0',/.test(html), '');
// 新しい初期値で計算すると（期待値は、ここで手書きの式から別に出す）: 仕入れ5000・送料1500・広告0・利益0
(function () {
  var Sd = withS({ safetyFactor: Number(pageDef('safetyFactor')), vatRate: Number(pageDef('vatRate')) / 100, euShippingDiffYen: Number(pageDef('euShippingDiffYen')) });
  var fx = 157.315109, sell = Math.round(6500 / (1 - 0.20) / fx * 100) / 100;
  var tar = Math.round((sell * (0.15 / (1 - 0.18)) * 1 * 1.021 + sell * 0 * 0.021 + 0 / fx) * 100) / 100;
  var r = calcRow(Sd, 5000, 1500, 0, 0);
  check('calculation with the new default values (hand-written expectation ' + sell + ' / ' + tar + ')', r.ok && r.sellingPriceUSD === sell && r.tariffUSD === tar && r.priceWithTariffUSD === Math.round((sell + tar) * 100) / 100, JSON.stringify(r) + ' expected ' + sell + '/' + tar);
})();
// 初期値に戻す・保存データ: 新しい初期値を持つ base で
var BASEK = Object.assign({}, BASE2, { safetyFactor: pageDef('safetyFactor'), vatRate: pageDef('vatRate'), euShippingDiffYen: pageDef('euShippingDiffYen') });
var oldSaved = { safetyFactor: '1.03', vatRate: '8', euShippingDiffYen: '1000' };
check('load: a user who saved the old values (1.03 / 8 / 1000) keeps them', (function () { var r = api.loadStored(oldSaved, BASEK); return r.state.safetyFactor === '1.03' && r.state.vatRate === '8' && r.state.euShippingDiffYen === '1000'; })(), '');
check('load: nothing stored gives the new defaults (1 / 0 / 0)', (function () { var r = api.loadStored(null, BASEK), r2 = api.loadStored({ exchangeRate: '150' }, BASEK); return [r, r2].every(function (x) { return x.state.safetyFactor === '1' && x.state.vatRate === '0' && x.state.euShippingDiffYen === '0'; }); })(), '');
check('reset scope: old saved values go back to the new defaults (1 / 0 / 0)', (function () { var r = api.resetScope(Object.assign({}, curState, oldSaved), { cost: '1', ship: '2' }, null, BASEK); return r.state.safetyFactor === '1' && r.state.vatRate === '0' && r.state.euShippingDiffYen === '0'; })(), '');


// 26) K5: 為替ボタンの点滅
var JST = 540, NOW = Date.UTC(2026, 8, 29, 23, 30);   // 日本時間 2026-09-30 08:30
function jst(y, mo, d, h, mi) { return String(Date.UTC(y, mo - 1, d, h - 9, mi)); }
var bl = api.fxShouldBlink;
check('blink: never set (initial value) blinks', bl('default', '', NOW, JST) === true, '');
check('blink: fetched today does not blink', bl('fetched', jst(2026, 9, 30, 3, 20), NOW, JST) === false, '');
check('blink: fetched yesterday 23:59 blinks', bl('fetched', jst(2026, 9, 29, 23, 59), NOW, JST) === true, '');
check('blink: manual today does not blink, manual yesterday blinks', bl('manual', jst(2026, 9, 30, 8, 0), NOW, JST) === false && bl('manual', jst(2026, 9, 29, 8, 0), NOW, JST) === true, '');
check('blink: wrong-typed or missing time blinks', [5, null, undefined, '', 'abc', '0', '1e12', [], {}].every(function (a) { return bl('fetched', a, NOW, JST) === true && bl('manual', a, NOW, JST) === true; }), '');
check('blink: unknown source blinks even with a time from today', bl('x', jst(2026, 9, 30, 3, 20), NOW, JST) === true && bl(undefined, jst(2026, 9, 30, 3, 20), NOW, JST) === true, '');
check('blink: boundary at local midnight (23:59:59.999 vs 00:00:00.000)', (function () {
  var lastMs = Date.UTC(2026, 8, 29, 14, 59, 59, 999), midnight = Date.UTC(2026, 8, 29, 15, 0, 0, 0);   // 日本時間 9/29 23:59:59.999 と 9/30 00:00:00
  return bl('fetched', String(lastMs), lastMs, JST) === false && bl('fetched', String(lastMs), midnight, JST) === true && bl('fetched', String(midnight), midnight, JST) === false && bl('fetched', String(midnight), lastMs, JST) === true; })(), '');
check('blink: same instant, different time zone gives a different day', bl('fetched', String(Date.UTC(2026, 8, 29, 14, 0)), Date.UTC(2026, 8, 29, 16, 0), JST) === true && bl('fetched', String(Date.UTC(2026, 8, 29, 14, 0)), Date.UTC(2026, 8, 29, 16, 0), 0) === false, '');
check('blink: default time zone works (fetched just now does not blink)', bl('fetched', String(Date.now()), Date.now()) === false && bl('default', '', Date.now()) === true, '');
check('load: manual source with its time is restored and shown', (function () { var r = ld({ fxSource: 'manual', fxAt: jst(2026, 9, 30, 8, 38) }); return r.state.fxSource === 'manual' && api.fxStatusText(r.state.fxSource, r.state.fxAt, JST) === '手入力の値（9/30 08:38）' && bl(r.state.fxSource, r.state.fxAt, NOW, JST) === false; })(), '');
check('load: old manual data without a time shows no time and blinks', (function () { var r = ld({ fxSource: 'manual' }); return api.fxStatusText(r.state.fxSource, r.state.fxAt, JST) === '手入力の値' && bl(r.state.fxSource, r.state.fxAt, NOW, JST) === true; })(), '');
check('page: blink is only on the top-right button, with hint and reduced-motion rule', /id="fxHint"/.test(html) && /toggle\('blink', blink\)/.test(html) && !/fxBtn'\)\.classList\.toggle\('blink'/.test(html) && /prefers-reduced-motion: no-preference\) \{\s*\.fxbox button\.blink \{ animation: fxpulse 1\.2s/.test(html) && /prefers-reduced-motion: reduce\) \{\s*\.fxbox button\.blink \{ animation: none/.test(html) && html.indexOf('今日の為替を取得してください') >= 0, '');
check('page: manual entry records the time like a fetch', /if \(f\.fx\) \{ state\.fxSource = 'manual'; state\.fxAt = String\(Date\.now\(\)\); \}/.test(html), '');


// 27) 電卓
BigInt.prototype.toJSON = function () { return this.toString(); };
var F = api.cpFormat, P0 = api.cpParseNum;
function NEG(t) { return api.cpEval('0−' + t).value; }
function ev(t) { var r = api.cpEval(t); return r.ok ? api.cpPlain(r.value) : (r.reason === 'empty' ? 'EMPTY' : 'ERR:' + r.reason); }
[['1+2×3', '7'], ['(1+2)×3', '9'], ['10÷4', '2.5'], ['0.1+0.2', '0.3'], ['1.15×3', '3.45'], ['10÷3', '3.3333333333'], ['2−5', '-3'], ['2-5', '-3'],
 ['1,500+2,060×2', '5620'], ['1,500 + 2,060 × 2', '5620'], ['999999×999999', '999998000001'], ['123456×7890', '974067840'],
 ['5%', '0.05'], ['200+10%', '200.1'], ['50%×200', '100'], ['(2+3)%', '0.05'], ['−0', '0'], ['0×−5', '0'], ['2×−3', '-6'], ['−(2+3)', '-5'], ['1−−1', '2'], ['１２+３', '15'], ['.5+.5', '1'], ['5.+1', '6'],
 ['100÷8÷2', '6.25'], ['2×3÷4', '1.5'], ['10−2−3', '5'], ['0.1×3', '0.3'], ['1÷3×3', '0.9999999999'], ['0.0000000001×0.1', '0'], ['0.00000000005', '0.0000000001'], ['99999999999×10', '999999999990']
].forEach(function (c) {
  if (c[1] === 'ERR') return;
  var got = ev(c[0]);
  check('calc: ' + c[0] + ' = ' + c[1], got === c[1], 'got ' + got);
});
// 15桁の掛け算（内部の整数で正確に。1兆以上は表示で「計算できません」になる）
function rawScaled(t) { var r = api.cpEval(t); return r.ok ? r.value : null; }
check('calc: 15-digit product is exact inside (value kept), but shown as 計算できません (1 trillion or more)', rawScaled('123456789012345×987654321') === BigInt('121932631124827861592745') * BigInt(10000000000) && F(rawScaled('123456789012345×987654321')) === '計算できません', '');
check('calc: 15-digit times 15-digit product is exact', rawScaled('999999999999999×999999999999999') === BigInt('999999999999998000000000000001') * BigInt(10000000000), '');
check('calc: 15-digit number alone is kept exactly and not usable', rawScaled('123456789012345') === BigInt('123456789012345') * BigInt(10000000000) && api.cpUsable(rawScaled('123456789012345')) === false && api.cpPlain(rawScaled('123456789012345')) === null, '');
check('calc: negative results and ± on 0', ev('0−5') === '-5' && ev('−3×−3') === '9' && ev('−0') === '0' && api.cpFormat(api.cpEval('−0').value) === '0', '');
check('calc: 1÷0 is not computable (divzero), also 0÷0 and 1÷(2−2)', ev('1÷0') === 'ERR:divzero' && ev('0÷0') === 'ERR:divzero' && ev('1÷(2−2)') === 'ERR:divzero', ev('1÷0'));
check('calc: unbalanced parentheses / dangling operators / empty parentheses are not computable', ['(1+2', '1+2)', '1+', '×3', '()', '(', ')', '1++', '2 3', '1÷', '5%%%%x'].every(function (t) { return /^ERR/.test(ev(t)); }), ['(1+2', '1+2)', '1+', '×3', '()'].map(ev).join(','));
check('calc: empty input has no result', ev('') === 'EMPTY' && ev('   ') === 'EMPTY', '');
check('calc: 1e5 typed as text is invalid, other letters too', ev('1e5') === 'ERR:syntax' && ev('abc') === 'ERR:syntax' && ev('1x2') === 'ERR:syntax' && ev('1,5') === 'ERR:syntax' && ev('1,5000') === 'ERR:syntax' && ev('.') === 'ERR:syntax', [ev('1e5'), ev('1,5'), ev('1,5000')].join(','));
check('calc: % is a postfix (5% = 0.05, 200 + 10% = 200.1, not 220)', ev('5%') === '0.05' && ev('200+10%') === '200.1', '');
check('calc: precedence and left-to-right', ev('2+3×4−5÷5') === '13' && ev('8÷2×2') === '8' && ev('2×(3+4)×5') === '70', '');
check('calc: deep parentheses are limited (no crash)', /^ERR/.test(ev(new Array(60).join('(') + '1' + new Array(60).join(')'))) && ev('((((1))))') === '1' && /^ERR/.test(ev(new Array(400).join('1+'))), '');
// 整形
check('format: separators', F(P0('1234567.5')) === '1,234,567.5' && F(P0('999')) === '999' && F(P0('1000')) === '1,000' && F(NEG('1234')) === '-1,234', F(P0('1234567.5')));
check('format: trailing zeros removed and 10 decimals at most', F(P0('1.500')) === '1.5' && F(P0('2.0')) === '2' && F(P0('0.1234567891')) === '0.1234567891' && F(P0('0.12345678915')) === '0.1234567892' && F(P0('0.00000000004')) === '0', F(P0('0.12345678915')));
check('format: not computable for non-finite and for values from 1,000,000,000,000', F(NaN) === '計算できません' && F(Infinity) === '計算できません' && F(-Infinity) === '計算できません' && F(null) === '計算できません' && F(undefined) === '計算できません'
  && F(P0('1000000000000')) === '計算できません' && F(NEG('1000000000000')) === '計算できません' && F(P0('999999999999.9999999999')) === '999,999,999,999.9999999999' && api.cpPlain(P0('1000000000000')) === null, F(P0('999999999999.9999999999')));
check('format: no exponent notation anywhere', !/e/i.test(F(P0('0.0000000001'))) && F(P0('0.0000000001')) === '0.0000000001' && F(P0('123456789012')) === '123,456,789,012', '');
check('format: JS numbers are accepted', F(1234.5) === '1,234.5' && F(-0.25) === '-0.25' && F(0) === '0', '');
check('format: usable results are non-negative and below 1 trillion', api.cpUsable(P0('5')) === true && api.cpUsable(P0('0')) === true && api.cpUsable(NEG('5')) === false && api.cpUsable(P0('1000000000000')) === false && api.cpUsable(null) === false, '');
check('round: yen to whole, dollars to 2 decimals (half up, away from zero)', F(api.cpRound(P0('2.5'), 0)) === '3' && F(api.cpRound(P0('2.4999'), 0)) === '2' && F(api.cpRound(P0('35.725'), 2)) === '35.73' && F(api.cpRound(NEG('2.5'), 0)) === '-3' && F(api.cpRound(P0('12.3456'), 2)) === '12.35', '');
// 為替の換算（期待値はここで別に計算）
(function () {
  var rate = '157.315109';
  var usd = Math.round(5620 / 157.315109 * 100) / 100, yen = Math.round(100 * 157.315109);
  var a = api.cpConvert(P0('5620'), rate, 'toUsd'), b = api.cpConvert(P0('100'), rate, 'toYen');
  check('currency: 5,620 yen -> ' + usd + ' dollars (independent), 100 dollars -> ' + yen + ' yen', a !== null && F(a) === String(usd) && b !== null && F(b) === yen.toLocaleString('en-US') && usd === 35.72 && yen === 15732, F(a) + ' / ' + F(b));
  check('currency: bad rate or bad value gives null', api.cpConvert(P0('5'), '0', 'toUsd') === null && api.cpConvert(P0('5'), 'abc', 'toYen') === null && api.cpConvert(null, rate, 'toUsd') === null && api.cpConvert(P0('999999999999'), rate, 'toYen') === null, '');
  var st = api.cpPress(api.cpPress(api.cpPress(api.cpPress(api.cpInit(), '5'), '6'), '2'), '0');
  var c = api.cpConvertState(st, 'toUsd', rate), vw = api.cpView(c);
  check('currency: state after 円→ドル shows the converted value and the expression line', vw.text === '35.72' && vw.line === '5,620 円 → ドル（為替 157.32）' && c.fresh === true, vw.text + ' | ' + vw.line);
  var c2 = api.cpConvertState(api.cpPress(api.cpPress(api.cpPress(api.cpInit(), '1'), '0'), '0'), 'toYen', rate), v2 = api.cpView(c2);
  check('currency: ドル→円 state', v2.text === '15,732' && v2.line === '100 ドル → 円（為替 157.32）', v2.text + ' | ' + v2.line);
})();
// キー操作
function padKeys(str) { var st = api.cpInit(), tp = []; str.split('').forEach(function (k) { st = api.cpPress(st, k); if (st.entry) { tp = api.cpTapeAdd(tp, st.entry); st.entry = null; } }); return { st: st, tape: tp, v: api.cpView(st) }; }
check('keys: typing 1500 + 2060 × 2 shows the expression with separators and the live result', (function () { var k = padKeys('1500+2060×2'); return k.v.line === '1,500 + 2,060 × 2' && k.v.text === '5,620'; })(), JSON.stringify(padKeys('1500+2060×2').v));
check('keys: = evaluates, records the line, and the result becomes the start of the next expression on an operator', (function () {
  var k = padKeys('1500+2060×2='); var st2 = api.cpPress(k.st, '+'), st3 = api.cpPress(st2, '1');
  return k.v.text === '5,620' && k.v.line === '1,500 + 2,060 × 2 =' && k.tape.length === 1 && k.tape[0].e === '1,500 + 2,060 × 2' && k.tape[0].r === '5620' && api.cpView(st3).line === '5,620 + 1' && api.cpView(st3).text === '5,621'; })(), JSON.stringify(padKeys('1500+2060×2=').v));
check('keys: after = a digit replaces the result', (function () { var k = padKeys('12+3=7'); return k.v.line === '7' && k.v.text === '7' && k.st.fresh === false; })(), JSON.stringify(padKeys('12+3=7').v));
check('keys: after = a second = does nothing new (no duplicate record)', padKeys('1+1==').tape.length === 1, '');
check('keys: C clears everything, ⌫ deletes one character', padKeys('12+3C').v.line === '' && padKeys('12+3C').v.text === '0' && padKeys('12+34⌫').v.line === '12 + 3' && padKeys('12+34⌫⌫⌫').v.line === '12', JSON.stringify(padKeys('12+34⌫').v));
check('keys: a second decimal point in one number is ignored, . at start gives 0.', padKeys('1.2.3').v.line === '1.23' && padKeys('.').v.line === '0.' && padKeys('1+.').v.line === '1 + 0.' && padKeys('5.5+.5=').v.text === '6', padKeys('1.2.3').v.line);
check('keys: operators replace each other, leading − allowed, × then − is a sign', padKeys('5+×3').v.line === '5 × 3' && padKeys('×5').v.line === '5' && padKeys('−5').v.line === '−5' && padKeys('2×−3=').v.text === '-6', padKeys('5+×3').v.line);
check('keys: parentheses and %', padKeys('(1+2)×3=').v.text === '9' && padKeys('1+2)').v.line === '1 + 2' && padKeys('5%').v.text === '0.05' && padKeys('%').v.line === '' && padKeys('5%=').v.text === '0.05', padKeys('(1+2)×3=').v.text);
check('keys: ± toggles the sign of the last number', padKeys('5±').v.line === '−5' && padKeys('5±±').v.line === '5' && padKeys('3+5±').v.line === '3 + (−5)' && padKeys('3+5±±').v.line === '3 + 5' && padKeys('0±=').v.text === '0' && padKeys('±').v.line === '', JSON.stringify(padKeys('3+5±').v));
check('keys: ± on the result of =', (function () { var k = padKeys('2+3=±'); return k.v.line === '−5' && k.v.text === '-5'; })(), '');
check('keys: 1÷0 shows 計算できません and = keeps the expression', padKeys('1÷0').v.text === '計算できません' && padKeys('1÷0=').v.text === '計算できません' && padKeys('1÷0=').st.expr === '1÷0' && padKeys('1+=').v.text === '計算できません', '');
check('keys: a dangling operator keeps showing the last good value', padKeys('12+').v.text === '12' && padKeys('12×(').v.text === '12', padKeys('12+').v.text);
check('keys: results of 1 trillion or more are not computable and not usable', (function () { var k = padKeys('999999999999+1'); return k.v.text === '計算できません' && k.v.usable === false; })(), '');
check('keys: negative result is shown but not usable; 0 and positive are usable', padKeys('2−5').v.text === '-3' && padKeys('2−5').v.usable === false && padKeys('2+3').v.usable === true && padKeys('0').v.usable === true && padKeys('').v.usable === false, '');
check('keys: digits after ) or % are ignored (no implicit multiplication)', padKeys('(2)3').v.line === '(2)' && padKeys('5%3').v.line === '5%', '');
check('keys: 0.1 + 0.2 typed by keys shows 0.3', padKeys('0.1+0.2=').v.text === '0.3', '');
// 記録
(function () {
  var t = [];
  for (var i = 1; i <= 12; i++) t = api.cpTapeAdd(t, { e: 'e' + i, r: String(i) });
  check('tape: cap at 10, newest first', t.length === 10 && t[0].e === 'e12' && t[9].e === 'e3', t.map(function (x) { return x.e; }).join());
  check('tape: append to empty and a formatted line', (function () { var x = api.cpTapeAdd([], { e: '1,500 + 2,060 × 2', r: '5620' }); return x.length === 1 && api.cpTapeLine(x[0]) === '1,500 + 2,060 × 2 = 5,620'; })(), '');
  check('tape: negative and decimal lines', api.cpTapeLine({ e: '2 − 5', r: '-3' }) === '2 − 5 = -3' && api.cpTapeLine({ e: '10 ÷ 4', r: '2.5' }) === '10 ÷ 4 = 2.5', '');
  check('tape: clear is an empty list (assignment) and bad entries are ignored on add', api.cpTapeAdd([], { e: 5, r: '1' }).length === 0 && api.cpTapeAdd([], null).length === 0 && api.cpTapeAdd([], { e: 'x', r: '1e5' }).length === 0, '');
  check('tape: corrupted tapes are repaired', (function () {
    var bad = [{ e: 'a', r: '1' }, null, 5, 'x', { e: 'b' }, { e: 'c', r: 7 }, { e: 'd', r: '1e5' }, { e: 'e', r: '12.5' }, [], { e: new Array(400).join('x'), r: '1' }, { e: 'f', r: '-3' }];
    var r = api.cpTapeRepair(bad); return r.length === 3 && r[0].e === 'a' && r[1].e === 'e' && r[2].e === 'f'; })() && api.cpTapeRepair('abc').length === 0 && api.cpTapeRepair(null).length === 0 && api.cpTapeRepair({}).length === 0 && api.cpTapeRepair(new Array(30).fill({ e: 'a', r: '1' })).length === 10, '');
  check('load: stored tape is restored, a corrupted tape is repaired, no tape gives an empty one', (function () {
    var r1 = ld({ calcTape: [{ e: '1 + 1', r: '2' }, { e: 'bad', r: 'x' }] }), r2 = ld({ calcTape: 'oops' }), r3 = ld({}), r4 = ld(null), r5 = ld({ calcTape: new Array(20).fill({ e: 'a', r: '1' }) });
    return r1.tape.length === 1 && r1.tape[0].r === '2' && r2.tape.length === 0 && r3.tape.length === 0 && r4.tape.length === 0 && r5.tape.length === 10; })(), '');
  check('load: calculator tab is restored, other bad tabs fall back', ld({ tab: 'calc' }).state.tab === 'calc' && ld({ tab: 'nope' }).state.tab === 'profit', '');
})();
// ページの確認
check('page: 電卓 is the third tab and has a container; no calculator button or drawer', /id="tabCalc"[^>]*>電卓</.test(html) && html.indexOf('id="tabRev"') < html.indexOf('id="tabCalc"') && /id="calcMain"/.test(html) && !/id="calcpad"/.test(html) && !/id="calcToggle"/.test(html), '');
check('page: calculator elements exist', ['cpExpr', 'cpResult', 'cpKeys', 'cpTape', 'cpToCost', 'cpToShip', 'cpToPrice', 'cpToUsd', 'cpToYen', 'cpCopy', 'cpTapeClear', 'cpToast'].every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }), '');
check('page: no eval and no Function constructor in the page', !/\beval\s*\(/.test(html) && !/new Function\s*\(/.test(html) && !/[^A-Za-z_.]Function\s*\(/.test(html.replace(/<style[\s\S]*?<\/style>/, '')), '');
check('page: only the three drawers mechanism unchanged (settings and ship)', /settings: \{ el: 'settings'/.test(html) && /ship: \{ el: 'shipcalc'/.test(html) && !/calc: \{ el:/.test(html), '');
check('page: calculator keyboard ignores inputs, selects, drawers and IME composition; Escape clears', /tag === 'INPUT' \|\| tag === 'TEXTAREA' \|\| tag === 'SELECT'/.test(html) && /closest\('#settings, #shipcalc'\)/.test(html) && /cpDo\('C'\)/.test(html) && /e\.isComposing \|\| e\.keyCode === 229/.test(html), '');

console.log('\n' + pass + ' passed, ' + fail + ' failed (total ' + (pass + fail) + ')');
process.exit(fail ? 1 : 0);
