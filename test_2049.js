
const faceValue = 500000000;

const bonds = [
    {
        name: "2042",
        targetCons: 422844694.13,
        settlement: new Date(2026, 3, 10),
        maturity: new Date(2042, 0, 21),
        couponRate: 0.13,
        yieldRate: 0.1623
    },
    {
        name: "2035",
        targetCons: 668205786.33,
        settlement: new Date(2026, 3, 10),
        maturity: new Date(2035, 0, 29),
        couponRate: 0.226,
        yieldRate: 0.1623
    }
];

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

function getDirtyPrice(settlement, maturity, C, Y, F) {
    const { lcc, ncc } = findCouponDates(settlement, maturity, F);
    const DSC = getDayDifference(settlement, ncc);
    const E = getDayDifference(lcc, ncc);
    const Coup = (100 * C) / F;
    const r = Y / F;
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

    let dp = 0;
    for (let k = 1; k <= N; k++) {
        const exponent = (k - 1) + frac_exp;
        dp += Coup / Math.pow(1 + r, exponent);
        if (k === N) {
            dp += 100 / Math.pow(1 + r, exponent);
        }
    }
    return dp;
}

function getDirtyPriceAltR(settlement, maturity, C, Y, F) {
    const { lcc, ncc } = findCouponDates(settlement, maturity, F);
    const DSC = getDayDifference(settlement, ncc);
    const E = getDayDifference(lcc, ncc);
    const Coup = (100 * C) / F;
    const r = Math.pow(1 + Y, 1/F) - 1;
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

    let dp = 0;
    for (let k = 1; k <= N; k++) {
        const exponent = (k - 1) + frac_exp;
        dp += Coup / Math.pow(1 + r, exponent);
        if (k === N) {
            dp += 100 / Math.pow(1 + r, exponent);
        }
    }
    return dp;
}

console.log("Testing Annual to Semi-Annual Yield Conversion (r = (1+Y)^(1/2) - 1):");
for (let bond of bonds) {
    const dp = getDirtyPriceAltR(bond.settlement, bond.maturity, bond.couponRate, bond.yieldRate, 2);
    const cons = Math.round(dp * faceValue) / 100;
    console.log(`${bond.name}: ${cons.toFixed(2)} (Target: ${bond.targetCons.toFixed(2)})`);
}
