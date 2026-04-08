
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

function getDirtyPriceSimple(settlement, maturity, C, Y, F) {
    const { lcc, ncc } = findCouponDates(settlement, maturity, F);
    const E = getDayDifference(lcc, ncc);
    const DSC = getDayDifference(settlement, ncc);
    const Coup = (100 * C) / F;
    const r = Y / F;
    const frac_exp = DSC / E;
    return (100 + Coup) / (1 + r * frac_exp);
}

function getDirtyPriceCompound(settlement, maturity, C, Y, F) {
    const { lcc, ncc } = findCouponDates(settlement, maturity, F);
    const E = getDayDifference(lcc, ncc);
    const DSC = getDayDifference(settlement, ncc);
    const Coup = (100 * C) / F;
    const r = Y / F;
    const frac_exp = DSC / E;
    return (100 + Coup) / Math.pow(1 + r, frac_exp);
}

const settlementTrade = new Date(2026, 3, 9); // April 9
const maturity = new Date(2026, 5, 13); // June 13
const C = 0.145;
const Y = 0.1624;
const F = 2;
const faceValue = 500000000;
const targetConsideration = 521718248.92;
const targetCP = 99.56;

console.log("Testing different settlement dates and formulas for June 13 maturity...");

for (let offset = -10; offset <= 30; offset++) {
    const settlement = new Date(settlementTrade);
    settlement.setDate(settlementTrade.getDate() + offset);
    
    const { lcc, ncc } = findCouponDates(settlement, maturity, F);
    const A = getDayDifference(lcc, settlement);
    const E = getDayDifference(lcc, ncc);
    const DSC = getDayDifference(settlement, ncc);
    const Coup = (100 * C) / F;
    const r = Y / F;
    
    const ai = Coup * (A / E);
    
    // Simple
    const dpS = (100 + Coup) / (1 + r * (DSC / E));
    const cpS = dpS - ai;
    const consS = Math.floor(dpS * faceValue) / 100;
    
    // Compound
    const dpC = (100 + Coup) / Math.pow(1 + r, DSC / E);
    const cpC = dpC - ai;
    const consC = Math.floor(dpC * faceValue) / 100;
    
    console.log(`\nSettlement: April ${settlement.getDate()} (T+${offset})`);
    console.log(`  Simple:   CP=${cpS.toFixed(4)}, Cons=${consS.toFixed(2)} (Diff: ${(consS - targetConsideration).toFixed(2)})`);
    // Simple ACT/365
    const DSC_365 = getDayDifference(settlement, maturity);
    const dpS_365 = (100 + Coup) / (1 + (Y) * (DSC_365 / 365));
    const cpS_365 = dpS_365 - ai;
    const consS_365 = Math.floor(dpS_365 * faceValue) / 100;
    
    // Simple 30/360
    const A_360 = (settlement.getMonth() - lcc.getMonth() + 12 * (settlement.getFullYear() - lcc.getFullYear())) * 30 + (settlement.getDate() - lcc.getDate());
    const E_360 = 180;
    const DSC_360 = 180 - A_360;
    const dpS_360 = (100 + Coup) / (1 + r * (DSC_360 / E_360));
    const ai_360 = Coup * (A_360 / E_360);
    const cpS_360 = dpS_360 - ai_360;
    const consS_360 = Math.floor(dpS_360 * faceValue) / 100;
    
    // Compound ACT/365
    const dpC_365 = (100 + Coup) / Math.pow(1 + (Y/F), (DSC_365 / (365/F)));
    const cpC_365 = dpC_365 - ai;
    const consC_365 = Math.floor(dpC_365 * faceValue) / 100;
    
    // Simple ACT/360
    const dpS_360_act = (100 + Coup) / (1 + (Y) * (DSC_365 / 360));
    const cpS_360_act = dpS_360_act - ai;
    const consS_360_act = Math.floor(dpS_360_act * faceValue) / 100;
    
    console.log(`  Simple ACT/360: CP=${cpS_360_act.toFixed(4)}, Cons=${consS_360_act.toFixed(2)} (Diff: ${(consS_360_act - targetConsideration).toFixed(2)})`);
}
