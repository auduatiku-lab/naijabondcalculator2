
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

const faceValue = 500000000;
const targetCons = 521718248.92;
const targetCP = 99.56;

const tradeDate = new Date(2026, 3, 9); // April 9
const maturity = new Date(2026, 5, 13); // June 13
const C = 0.145;
const Y = 0.1624;
const F = 1;

console.log("Brute forcing 14.5% June 2026 bond...");

const formulas = ["Simple", "Compound"];
const dayCounts = ["ACT/ACT", "ACT/365", "30/360"];
const offsets = [0, 1, 2, 3, 4, 5];

for (let formula of formulas) {
    for (let dayCount of dayCounts) {
        for (let offset of offsets) {
            const settlement = new Date(tradeDate);
            settlement.setDate(tradeDate.getDate() + offset);
            
            const { lcc, ncc } = findCouponDates(settlement, maturity, F);
            
            let A, E, DSC;
            if (dayCount === "ACT/ACT") {
                A = getDayDifference(lcc, settlement);
                E = getDayDifference(lcc, ncc);
                DSC = getDayDifference(settlement, ncc);
            } else if (dayCount === "ACT/365") {
                A = getDayDifference(lcc, settlement);
                E = 365 / F;
                DSC = getDayDifference(settlement, ncc);
            } else if (dayCount === "30/360") {
                const d1 = lcc.getDate();
                const m1 = lcc.getMonth() + 1;
                const y1 = lcc.getFullYear();
                const d2 = settlement.getDate();
                const m2 = settlement.getMonth() + 1;
                const y2 = settlement.getFullYear();
                A = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
                E = 180;
                DSC = 180 - A;
            }
            
            const Coup = (100 * C) / F;
            const r = Y / F;
            const ai = Coup * (A / E);
            
            let dp;
            if (formula === "Simple") {
                dp = (100 + Coup) / (1 + r * (DSC / E));
            } else {
                dp = (100 + Coup) / Math.pow(1 + r, DSC / E);
            }
            
            const cp = dp - ai;
            const cons = Math.floor(dp * faceValue) / 100;
            
            const diff = Math.abs(cons - targetCons);
            if (diff < 100000) {
                console.log(`Match found! Formula: ${formula}, DayCount: ${dayCount}, Offset: ${offset}`);
                console.log(`  Settlement: ${settlement.toDateString()}`);
                console.log(`  CP: ${cp.toFixed(4)}, Cons: ${cons.toFixed(2)}, Diff: ${diff.toFixed(2)}`);
            }
        }
    }
}
