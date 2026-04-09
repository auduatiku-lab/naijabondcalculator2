const faceValue = 500000000;

const bonds = [
    { name: "2049", target: 490784576.58, settlement: new Date(2026, 3, 10), maturity: new Date(2049, 3, 26), coupon: 0.148, yield: 0.1623 },
    { name: "2042", target: 422844694.13, settlement: new Date(2026, 3, 10), maturity: new Date(2042, 0, 21), coupon: 0.13, yield: 0.1623 },
    { name: "2035", target: 668205786.33, settlement: new Date(2026, 3, 10), maturity: new Date(2035, 0, 29), coupon: 0.226, yield: 0.1623 },
    { name: "2034 Jul", target: 422320491.73, settlement: new Date(2026, 3, 10), maturity: new Date(2034, 6, 18), coupon: 0.121493, yield: 0.1623 },
    { name: "2034 Feb", target: 572573483.29, settlement: new Date(2026, 3, 10), maturity: new Date(2034, 1, 21), coupon: 0.19, yield: 0.1623 }
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

for (let p = 5; p <= 15; p++) {
    console.log(`\nTesting Precision: ${p} decimal places for Dirty Price`);
    let matchesRound = 0;
    let matchesFloor = 0;
    for (let bond of bonds) {
        let dp = getDirtyPrice(bond.settlement, bond.maturity, bond.coupon, bond.yield, 2);
        let dpP = Math.round(dp * Math.pow(10, p)) / Math.pow(10, p);
        
        let consRound = Math.round(dpP * faceValue) / 100;
        let consFloor = Math.floor(dpP * faceValue) / 100;
        
        if (Math.abs(consRound - bond.target) < 0.001) matchesRound++;
        if (Math.abs(consFloor - bond.target) < 0.001) matchesFloor++;
    }
    console.log(`Matches (Round): ${matchesRound}/5`);
    console.log(`Matches (Floor): ${matchesFloor}/5`);
}
