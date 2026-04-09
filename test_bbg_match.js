
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
const targetCons = 571852891.25;
const targetCP = 80.43;

const tradeDate = new Date(2026, 3, 9); // April 9
const maturity = new Date(2034, 1, 21); // Feb 21, 2034
const C = 0.19;
const Y = 0.1625;
const F = 2;

console.log("Testing 12.98% Mar 2050 bond...");

const formulas = ["Simple", "Compound"];
const dayCounts = ["ACT/ACT", "ACT/365", "30/360"];
const offsets = [0, 1, 2, 3, 4, 5];

for (let mDay = 21; mDay <= 21; mDay++) {
    const maturity = new Date(2034, 1, mDay);
    if (maturity.getMonth() !== 1) continue;

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
                const frac = Math.round((DSC / E) * 1e10) / 1e10;
                const ai_frac = Math.round((A / E) * 1e10) / 1e10;
                const ai = Coup * ai_frac;
                
                let dp;
                if (formula === "Simple") {
                    dp = (100 + Coup) / (1 + r * frac);
                } else {
                    // Compound for far away bonds
                    let N = 0;
                    let tempDate = new Date(ncc);
                    while (tempDate.getTime() <= maturity.getTime()) {
                        N++;
                        const m = tempDate.getMonth();
                        const y = tempDate.getFullYear();
                        const step = 12 / F;
                        let targetM = m + step;
                        let targetY = y;
                        if (targetM >= 12) { targetM -= 12; targetY += 1; }
                        tempDate = new Date(targetY, targetM, maturity.getDate());
                        if (tempDate.getDate() !== maturity.getDate()) {
                            tempDate = new Date(targetY, targetM + 1, 0);
                        }
                        tempDate.setHours(0, 0, 0, 0);
                    }
                    // Round frac to 8dp
                    const frac = Math.round((DSC / E) * 1e8) / 1e8;
                    dp = 0;
                    for (let k = 1; k <= N; k++) {
                        const term = Coup / Math.pow(1 + r, k - 1 + frac);
                        dp += term;
                    }
                    const finalTerm = 100 / Math.pow(1 + r, N - 1 + frac);
                    dp += finalTerm;
                }
                
            const cp = dp - ai;
            const cp_rounded = Math.round(cp * 1e8) / 1e8;
            const ai_rounded = Math.round(ai * 1e8) / 1e8;
            const dp_settlement = cp_rounded + ai_rounded;
            const raw_cons = (dp_settlement * faceValue) / 100;
            
            if (Math.abs(raw_cons - targetCons) < 1) {
                console.log(`Match! Day: ${mDay}, Formula: ${formula}, DayCount: ${dayCount}, Offset: ${offset}`);
                console.log(`  Settlement: ${settlement.toDateString()}`);
                console.log(`  Raw Cons: ${raw_cons.toFixed(8)}`);
            }
            }
        }
    }
}
