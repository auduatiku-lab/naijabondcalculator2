
const faceValue = 500000000;
const targetCons = 422844694.13;
const settlement = new Date(2026, 3, 10); // April 10, 2026
const maturity = new Date(2042, 0, 21); // Jan 21, 2042
const couponRate = 0.13;
const yieldRate = 0.1623;

function getDayDifference(d1, d2) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((t2 - t1) / MS_PER_DAY);
}

function findCouponDates(settlement, maturity, frequency) {
    let next = new Date(maturity);
    let last = new Date(maturity);
    while (next.getTime() > settlement.getTime()) {
        last = new Date(next);
        const m = next.getMonth();
        const y = next.getFullYear();
        const step = 12 / frequency;
        let targetM = m - step;
        let targetY = y;
        if (targetM < 0) { targetM += 12; targetY -= 1; }
        next = new Date(targetY, targetM, maturity.getDate());
        if (next.getDate() !== maturity.getDate()) {
            next = new Date(targetY, targetM + 1, 0);
        }
        next.setHours(0, 0, 0, 0);
    }
    return { lcc: next, ncc: last };
}

const { lcc, ncc } = findCouponDates(settlement, maturity, 2);
const A = getDayDifference(lcc, settlement);
const E = getDayDifference(lcc, ncc);
const DSC = getDayDifference(settlement, ncc);

console.log(`LCC: ${lcc.toDateString()}, NCC: ${ncc.toDateString()}`);
console.log(`A: ${A}, E: ${E}, DSC: ${DSC}`);

const Coup = (100 * couponRate) / 2;
const r = yieldRate / 2;
const frac_exp = DSC / E;

let N = 0;
let tempDate = new Date(ncc);
while (tempDate.getTime() <= maturity.getTime()) {
    N++;
    const m = tempDate.getMonth();
    const y = tempDate.getFullYear();
    const step = 6;
    let targetM = m + step;
    let targetY = y;
    if (targetM >= 12) { targetM -= 12; targetY += 1; }
    tempDate = new Date(targetY, targetM, maturity.getDate());
    if (tempDate.getDate() !== maturity.getDate()) {
        tempDate = new Date(targetY, targetM + 1, 0);
    }
    tempDate.setHours(0, 0, 0, 0);
}

console.log(`N: ${N}`);

let dirtyPriceCalc = 0;
for (let k = 1; k <= N; k++) {
    const exponent = (k - 1) + frac_exp;
    dirtyPriceCalc += Coup / Math.pow(1 + r, exponent);
    if (k === N) {
        dirtyPriceCalc += 100 / Math.pow(1 + r, exponent);
    }
}

console.log(`Dirty Price (Calc): ${dirtyPriceCalc}`);
const ai = Coup * (A / E);
console.log(`AI: ${ai}`);
const cleanPriceCalc = dirtyPriceCalc - ai;
console.log(`Clean Price (Calc): ${cleanPriceCalc}`);
console.log(`Clean Price (Rounded): ${Math.round(cleanPriceCalc * 100) / 100}`);

const consideration = (dirtyPriceCalc * faceValue) / 100;
console.log(`Consideration (Unrounded DP): ${consideration.toFixed(2)}`);

const considerationRoundedDP = (Math.round(dirtyPriceCalc * 100000000) / 100000000 * faceValue) / 100;
console.log(`Consideration (8dp DP): ${considerationRoundedDP.toFixed(2)}`);

const considerationFloor = Math.floor(dirtyPriceCalc * faceValue) / 100;
console.log(`Consideration (Floor): ${considerationFloor.toFixed(2)}`);

const considerationRound = Math.round(dirtyPriceCalc * faceValue) / 100;
console.log(`Consideration (Round): ${considerationRound.toFixed(2)}`);

console.log(`Target: ${targetCons.toFixed(2)}`);
