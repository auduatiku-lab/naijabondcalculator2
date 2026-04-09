
function getDayDifference(d1, d2) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((t2 - t1) / MS_PER_DAY);
}

function findCouponDates(settlement, maturity, F) {
    const step = 12 / F;
    let last = new Date(maturity);
    let next = new Date(maturity);
    
    while (next.getTime() > settlement.getTime()) {
        last = new Date(next);
        const m = next.getMonth();
        const y = next.getFullYear();
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

const tradeDate = new Date(2026, 3, 9); // April 9
const C = 0.145;
const Y = 0.1624;
const F = 2;

console.log("Testing 14.5% Jun 2026 bond...");

const formulas = ["Simple", "Compound"];
const dayCounts = ["ACT/ACT", "ACT/365", "30/360"];
const offsets = [0, 1, 2, 3, 4, 5];

for (let mDay = 1; mDay <= 30; mDay++) {
    const maturity = new Date(2026, 5, mDay);
    if (maturity.getMonth() !== 5) continue;

    for (let formula of formulas) {
        for (let dayCount of dayCounts) {
            for (let offset of offsets) {
                const settlement = new Date(tradeDate);
                settlement.setDate(tradeDate.getDate() + offset);
                
                if (settlement.getTime() >= maturity.getTime()) continue;

                const { lcc, ncc } = findCouponDates(settlement, maturity, F);
                const A = getDayDifference(lcc, settlement);
                const E = getDayDifference(lcc, ncc);
                const DSC = getDayDifference(settlement, ncc);
                
                const Coup = (100 * C) / F;
                const r = Y / F;
                const ai = Coup * (A / E);
                
                let dp;
                if (formula === "Simple") {
                    const frac = DSC / E;
                    dp = (100 + Coup) / (1 + r * frac);
                } else {
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
                    const frac = DSC / E;
                    dp = 0;
                    for (let k = 1; k <= N; k++) {
                        dp += Coup / Math.pow(1 + r, k - 1 + frac);
                    }
                    dp += 100 / Math.pow(1 + r, N - 1 + frac);
                }
                
                const raw_cons = (dp * faceValue) / 100;
                const cons_rounded = Math.round(raw_cons * 100) / 100;
                
                if (Math.abs(cons_rounded - targetCons) < 1000000) {
                    console.log(`Day: ${mDay}, Formula: ${formula}, DayCount: ${dayCount}, Offset: ${offset}, Cons: ${cons_rounded.toFixed(2)}`);
                }
            }
        }
    }
}
