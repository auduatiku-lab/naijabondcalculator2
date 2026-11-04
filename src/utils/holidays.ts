/**
 * Banking and Financial Market Holiday Calendars for Kenya (CBK / NSE) and Nigeria (FMDQ / DMO)
 * Factors in:
 *  - Weekends (Saturday & Sunday)
 *  - Official statutory public holidays
 *  - Rollover rules:
 *      * Kenya: Public Holidays Act (Cap 110 Sec 3) - When a holiday falls on Sunday, the succeeding Monday is observed.
 *      * Nigeria: Public Holidays Act - When a holiday falls on Saturday or Sunday, the succeeding Monday (or Monday+Tuesday) is observed.
 *  - Easter calculation (Computus) for Good Friday & Easter Monday
 *  - Islamic lunar holidays (Eid al-Fitr, Eid al-Adha, Mawlid al-Nabi)
 */

export type MarketCountry = 'KE' | 'NG';

export interface HolidayInfo {
    isHoliday: boolean;
    name?: string;
    market: MarketCountry;
    isObserved?: boolean;
}

/**
 * Computus: Anonymous Gregorian algorithm to calculate Easter Sunday for any year.
 */
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed month
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

/**
 * Known Islamic holiday dates (YYYY-MM-DD) for Kenya and Nigeria.
 * Islamic dates depend on moon sighting and are gazetted by the respective governments.
 */
interface IslamicHolidaysMap {
    [year: number]: {
        eidAlFitr: string[]; // ['YYYY-MM-DD', ...]
        eidAlAdha: string[];
        mawlid?: string[];   // Prophet's Birthday (widely observed in Nigeria and coastal/national Kenya)
    };
}

const ISLAMIC_HOLIDAYS: IslamicHolidaysMap = {
    2023: {
        eidAlFitr: ['2023-04-21', '2023-04-22'],
        eidAlAdha: ['2023-06-28', '2023-06-29'],
        mawlid: ['2023-09-27'],
    },
    2024: {
        eidAlFitr: ['2024-04-10', '2024-04-11'],
        eidAlAdha: ['2024-06-16', '2024-06-17', '2024-06-18'],
        mawlid: ['2024-09-16'],
    },
    2025: {
        eidAlFitr: ['2025-03-30', '2025-03-31', '2025-04-01'],
        eidAlAdha: ['2025-06-06', '2025-06-07'],
        mawlid: ['2025-09-05'],
    },
    2026: {
        eidAlFitr: ['2026-03-20', '2026-03-21'],
        eidAlAdha: ['2026-05-27', '2026-05-28'],
        mawlid: ['2026-08-26'],
    },
    2027: {
        eidAlFitr: ['2027-03-10', '2027-03-11'],
        eidAlAdha: ['2027-05-16', '2027-05-17'],
        mawlid: ['2027-08-15'],
    },
    2028: {
        eidAlFitr: ['2028-02-27', '2028-02-28'],
        eidAlAdha: ['2028-05-05', '2028-05-06'],
        mawlid: ['2028-08-03'],
    },
    2029: {
        eidAlFitr: ['2029-02-15', '2029-02-16'],
        eidAlAdha: ['2029-04-24', '2029-04-25'],
        mawlid: ['2029-07-23'],
    },
    2030: {
        eidAlFitr: ['2030-02-04', '2030-02-05'],
        eidAlAdha: ['2030-04-13', '2030-04-14'],
        mawlid: ['2030-07-12'],
    },
};

function formatDateKey(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Generate full holiday schedule for Kenya in a given year.
 */
export function getKenyanHolidaysForYear(year: number): Map<string, string> {
    const holidays = new Map<string, string>();

    // 1. Fixed statutory holidays
    const fixed: Array<{ month: number; day: number; name: string }> = [
        { month: 0, day: 1, name: "New Year's Day" },
        { month: 4, day: 1, name: "Labour Day" },
        { month: 5, day: 1, name: "Madaraka Day" },
        { month: 9, day: 10, name: "Mazingira / Utamaduni Day" },
        { month: 9, day: 20, name: "Mashujaa Day" },
        { month: 11, day: 12, name: "Jamhuri Day" },
        { month: 11, day: 25, name: "Christmas Day" },
        { month: 11, day: 26, name: "Utumishi / Boxing Day" },
    ];

    for (const item of fixed) {
        const d = new Date(year, item.month, item.day);
        const key = formatDateKey(d);
        holidays.set(key, item.name);

        // Sunday rollover rule in Kenya: if falls on Sunday, following Monday is a holiday
        if (d.getDay() === 0) {
            const nextMon = new Date(year, item.month, item.day + 1);
            holidays.set(formatDateKey(nextMon), `${item.name} (Observed)`);
        }
    }

    // Special case for Christmas & Boxing Day:
    // If Dec 25 is Sunday: Dec 26 is Boxing Day, Dec 27 is observed Christmas Day
    const dec25 = new Date(year, 11, 25);
    if (dec25.getDay() === 0) {
        const dec27 = new Date(year, 11, 27);
        holidays.set(formatDateKey(dec27), "Christmas Day (Observed)");
    }

    // 2. Christian Variable Holidays (Easter)
    const easter = getEasterSunday(year);
    // Good Friday = Easter - 2 days
    const goodFriday = new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
    holidays.set(formatDateKey(goodFriday), "Good Friday");
    // Easter Monday = Easter + 1 day
    const easterMonday = new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000);
    holidays.set(formatDateKey(easterMonday), "Easter Monday");

    // 3. Islamic Holidays
    const islamic = ISLAMIC_HOLIDAYS[year];
    if (islamic) {
        if (islamic.eidAlFitr && islamic.eidAlFitr[0]) {
            holidays.set(islamic.eidAlFitr[0], "Eid al-Fitr / Idd-ul-Fitr");
        }
        if (islamic.eidAlAdha && islamic.eidAlAdha[0]) {
            holidays.set(islamic.eidAlAdha[0], "Eid al-Adha / Idd-ul-Adha");
        }
    }

    return holidays;
}

/**
 * Generate full holiday schedule for Nigeria in a given year.
 */
export function getNigerianHolidaysForYear(year: number): Map<string, string> {
    const holidays = new Map<string, string>();

    // 1. Fixed statutory holidays
    const fixed: Array<{ month: number; day: number; name: string }> = [
        { month: 0, day: 1, name: "New Year's Day" },
        { month: 4, day: 1, name: "Workers' Day" },
        { month: 5, day: 12, name: "Democracy Day" },
        { month: 9, day: 1, name: "National Independence Day" },
        { month: 11, day: 25, name: "Christmas Day" },
        { month: 11, day: 26, name: "Boxing Day" },
    ];

    for (const item of fixed) {
        const d = new Date(year, item.month, item.day);
        const key = formatDateKey(d);
        holidays.set(key, item.name);

        // Nigeria rollover:
        // If on Saturday -> following Monday observed
        // If on Sunday -> following Monday observed
        if (item.month !== 11) { // non-December
            if (d.getDay() === 6) {
                const mon = new Date(year, item.month, item.day + 2);
                holidays.set(formatDateKey(mon), `${item.name} (Observed)`);
            } else if (d.getDay() === 0) {
                const mon = new Date(year, item.month, item.day + 1);
                holidays.set(formatDateKey(mon), `${item.name} (Observed)`);
            }
        }
    }

    // Christmas & Boxing Day rollover in Nigeria:
    const dec25 = new Date(year, 11, 25);
    const dec25Day = dec25.getDay();
    if (dec25Day === 5) {
        // Fri Dec 25 (Christmas), Sat Dec 26 (Boxing Day) -> Mon Dec 28 observed Boxing Day
        const dec28 = new Date(year, 11, 28);
        holidays.set(formatDateKey(dec28), "Boxing Day (Observed)");
    } else if (dec25Day === 6) {
        // Sat Dec 25, Sun Dec 26 -> Mon Dec 27 (Christmas obs), Tue Dec 28 (Boxing Day obs)
        const dec27 = new Date(year, 11, 27);
        const dec28 = new Date(year, 11, 28);
        holidays.set(formatDateKey(dec27), "Christmas Day (Observed)");
        holidays.set(formatDateKey(dec28), "Boxing Day (Observed)");
    } else if (dec25Day === 0) {
        // Sun Dec 25, Mon Dec 26 -> Mon Dec 26 is Boxing Day, Tue Dec 27 is Christmas (Observed)
        const dec27 = new Date(year, 11, 27);
        holidays.set(formatDateKey(dec27), "Christmas Day (Observed)");
    }

    // 2. Christian Variable Holidays (Easter)
    const easter = getEasterSunday(year);
    const goodFriday = new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
    holidays.set(formatDateKey(goodFriday), "Good Friday");
    const easterMonday = new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000);
    holidays.set(formatDateKey(easterMonday), "Easter Monday");

    // 3. Islamic Holidays (Nigeria typically declares 2 days for Eid al-Fitr & Eid al-Adha)
    const islamic = ISLAMIC_HOLIDAYS[year];
    if (islamic) {
        if (islamic.eidAlFitr) {
            islamic.eidAlFitr.forEach((dStr, idx) => {
                holidays.set(dStr, `Eid al-Fitr (Day ${idx + 1})`);
            });
        }
        if (islamic.eidAlAdha) {
            islamic.eidAlAdha.forEach((dStr, idx) => {
                holidays.set(dStr, `Eid al-Adha (Day ${idx + 1})`);
            });
        }
        if (islamic.mawlid) {
            islamic.mawlid.forEach((dStr) => {
                holidays.set(dStr, "Eid-el-Maulud (Prophet's Birthday)");
            });
        }
    }

    return holidays;
}

// Year cache for quick lookups
const kenyaCache = new Map<number, Map<string, string>>();
const nigeriaCache = new Map<number, Map<string, string>>();

function getHolidayMap(year: number, market: MarketCountry): Map<string, string> {
    const cache = market === 'KE' ? kenyaCache : nigeriaCache;
    if (!cache.has(year)) {
        const map = market === 'KE' ? getKenyanHolidaysForYear(year) : getNigerianHolidaysForYear(year);
        cache.set(year, map);
    }
    return cache.get(year)!;
}

/**
 * Check if a date is a Saturday or Sunday
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/**
 * Check if a date is a public holiday in the designated market
 */
export function getHolidayInfo(date: Date, market: MarketCountry): HolidayInfo {
    const year = date.getFullYear();
    const map = getHolidayMap(year, market);
    const key = formatDateKey(date);
    const name = map.get(key);

    return {
        isHoliday: Boolean(name),
        name,
        market,
        isObserved: name ? name.includes('(Observed)') : false,
    };
}

/**
 * Returns true if date is an active banking / settlement business day
 */
export function isBusinessDay(date: Date, market: MarketCountry): boolean {
    if (isWeekend(date)) return false;
    const hol = getHolidayInfo(date, market);
    return !hol.isHoliday;
}

export interface BusinessDayStep {
    date: Date;
    dateFormatted: string;
    reasonSkipped?: string; // e.g. "Weekend (Saturday)" or "Mashujaa Day"
}

/**
 * Calculate settlement date adding N business days (skipping weekends & holidays)
 */
export function addBusinessDays(
    baseDate: Date,
    nDays: number,
    market: MarketCountry
): { targetDate: Date; skippedDays: BusinessDayStep[] } {
    let current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const skippedDays: BusinessDayStep[] = [];
    let added = 0;

    while (added < nDays) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();

        if (dayOfWeek === 6) {
            skippedDays.push({
                date: new Date(current),
                dateFormatted: formatDateKey(current),
                reasonSkipped: "Weekend (Saturday)",
            });
            continue;
        }
        if (dayOfWeek === 0) {
            skippedDays.push({
                date: new Date(current),
                dateFormatted: formatDateKey(current),
                reasonSkipped: "Weekend (Sunday)",
            });
            continue;
        }

        const hol = getHolidayInfo(current, market);
        if (hol.isHoliday) {
            skippedDays.push({
                date: new Date(current),
                dateFormatted: formatDateKey(current),
                reasonSkipped: hol.name || "Public Holiday",
            });
            continue;
        }

        // Valid business day
        added++;
    }

    return {
        targetDate: new Date(current),
        skippedDays,
    };
}

export interface QuickDatesResult {
    market: MarketCountry;
    marketName: string;
    flag: string;
    today: Date;
    isTodayBizDay: boolean;
    todayStatus?: string;
    t1: {
        date: Date;
        label: string;
        dateStr: string;
        skippedCount: number;
        skippedDetails: string[];
    };
    t2: {
        date: Date;
        label: string;
        dateStr: string;
        skippedCount: number;
        skippedDetails: string[];
    };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatShortDate(d: Date): string {
    const dayName = DAY_NAMES[d.getDay()];
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
}

export function formatButtonDate(d: Date): string {
    const dayName = DAY_NAMES[d.getDay()];
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    return `${dayName}, ${day} ${month}`;
}

/**
 * Generate Quick Date options (Today, T+1, T+2) tailored to the active market calendar
 */
export function getMarketQuickDates(market: MarketCountry, baseDate: Date = new Date()): QuickDatesResult {
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const isTodayBiz = isBusinessDay(today, market);
    let todayStatus = undefined;
    if (!isTodayBiz) {
        if (isWeekend(today)) {
            todayStatus = `Weekend (${DAY_NAMES[today.getDay()]})`;
        } else {
            const h = getHolidayInfo(today, market);
            todayStatus = h.name || "Public Holiday";
        }
    }

    // T+1
    const t1Res = addBusinessDays(today, 1, market);
    // T+2
    const t2Res = addBusinessDays(today, 2, market);

    return {
        market,
        marketName: market === 'KE' ? 'Kenya Banking Calendar (CBK / NSE)' : 'Nigeria Banking Calendar (FMDQ / DMO)',
        flag: market === 'KE' ? '🇰🇪' : '🇳🇬',
        today,
        isTodayBizDay: isTodayBiz,
        todayStatus,
        t1: {
            date: t1Res.targetDate,
            label: formatButtonDate(t1Res.targetDate),
            dateStr: formatShortDate(t1Res.targetDate),
            skippedCount: t1Res.skippedDays.length,
            skippedDetails: t1Res.skippedDays.map(s => `${s.date.getDate()} ${MONTH_NAMES[s.date.getMonth()]}: ${s.reasonSkipped}`),
        },
        t2: {
            date: t2Res.targetDate,
            label: formatButtonDate(t2Res.targetDate),
            dateStr: formatShortDate(t2Res.targetDate),
            skippedCount: t2Res.skippedDays.length,
            skippedDetails: t2Res.skippedDays.map(s => `${s.date.getDate()} ${MONTH_NAMES[s.date.getMonth()]}: ${s.reasonSkipped}`),
        },
    };
}
