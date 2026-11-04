import { useEffect, useState, useRef, useMemo } from 'react';
import { getMarketQuickDates, getHolidayInfo, isWeekend, MarketCountry } from './utils/holidays';

export default function App() {
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [activeMarket, setActiveMarket] = useState<MarketCountry>('NG');
  const activeMarketRef = useRef<MarketCountry>('NG');
  useEffect(() => {
    activeMarketRef.current = activeMarket;
  }, [activeMarket]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedSettlementDate, setSelectedSettlementDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // State specifically for Kenyan Bond Analytics
  const [kenyanAnalytics, setKenyanAnalytics] = useState<{
    isKenyan: boolean;
    isIFB: boolean;
    bondType: 'IFB' | 'FXD';
    whtRate: number;
    daysSinceLcc: number;
    daysInPeriod: number;
    accruedInterestPer100: number;
    outstandingParPercent: number;
    walYears: number;
    grossYtm: number;
    netYtm: number;
    taxEquivalentYield: number | null;
    dirtyPrice4dp: number;
    dirtyPriceRaw: number;
    cleanPriceFrom4dp: number;
    cleanPrice6dp: number;
    consideration4dp: number;
    considerationUnrounded: number;
    considerationDiff: number;
    cashFlowSchedule: Array<{
      dateStr: string;
      daysFromSettlement: number;
      couponAmount: number;
      principalAmount: number;
      netAmount: number;
      remainingPrincipal: number;
    }>;
    midpointDateStr?: string;
  } | null>(null);


  const [showSchedule, setShowSchedule] = useState(false);
  const [kenyanPricingMode, setKenyanPricingMode] = useState<'quoted' | 'unrounded'>('quoted');
  const kenyanPricingModeRef = useRef<'quoted' | 'unrounded'>('quoted');
  useEffect(() => {
    kenyanPricingModeRef.current = kenyanPricingMode;
  }, [kenyanPricingMode]);

  function handlePricingModeChange(mode: 'quoted' | 'unrounded') {
    setKenyanPricingMode(mode);
    kenyanPricingModeRef.current = mode;
    const event = new CustomEvent('calculateBond');
    document.dispatchEvent(event);
  }

  const quickDates = useMemo(() => {
    return getMarketQuickDates(activeMarket, new Date());
  }, [activeMarket]);

  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const calendarToggleRef = useRef<HTMLButtonElement>(null);
  const settlementDateInputRef = useRef<HTMLInputElement>(null);
  const settlementDateRef = useRef(selectedSettlementDate);
  useEffect(() => {
    settlementDateRef.current = selectedSettlementDate;
  }, [selectedSettlementDate]);

  function toggleCalendar(event: any) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    setIsCalendarOpen(prev => {
        const newState = !prev;
        if (newState) {
            // Close bond options if open
            const bondOptionsContainer = document.getElementById('bondOptionsContainer');
            if (bondOptionsContainer) bondOptionsContainer.classList.add('hidden');
            // Sync view date to selected date when opening
            setViewDate(new Date(selectedSettlementDate));
        }
        return newState;
    });
  }

  function changeMonth(delta: number) {
    setViewDate(prev => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + delta);
        return next;
    });
  }

  function handleDateSelection(newDate: Date, isInitialLoad = false) {
    const d = new Date(newDate);
    d.setHours(0, 0, 0, 0);
    setSelectedSettlementDate(d);
    settlementDateRef.current = d; // Update ref immediately to avoid stale data in calculations
    const settlementDateInput = settlementDateInputRef.current;
    if (settlementDateInput) {
        settlementDateInput.value = d.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (!isInitialLoad) {
        setIsCalendarOpen(false);
        // Trigger calculation after state update via custom event
        const event = new CustomEvent('calculateBond');
        document.dispatchEvent(event);
    }
  }

  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node;
    const calendarPopover = calendarPopoverRef.current;
    const settlementDateInput = settlementDateInputRef.current;
    const calendarToggle = calendarToggleRef.current;
    
    // Check if click is outside calendar elements
    const isClickInsidePopover = calendarPopover?.contains(target);
    const isClickOnInput = target === settlementDateInput;
    const isClickOnToggle = calendarToggle?.contains(target);
    
    if (!isClickInsidePopover && !isClickOnInput && !isClickOnToggle) {
        setIsCalendarOpen(false);
    }
    
    // Also hide bond options
    const customSelect = document.getElementById('customBondSelect');
    const bondOptionsContainer = document.getElementById('bondOptionsContainer');
    if (customSelect && bondOptionsContainer && !customSelect.contains(target)) {
        bondOptionsContainer.classList.add('hidden');
    }
  }

  useEffect(() => {
    // --- Constants & Global State ---
    const REDEMPTION_VALUE_PER_100 = 100; 
    const COUPON_FREQUENCY = 2; // Semi-Annual
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    
    function parseMaturityDate(dateStr: string) {
        let date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            const parts = dateStr.match(/(\d{1,2})[-\s]+([A-Z]+)[-\s]+(\d{4}|\d{2})/i);
            if (parts) {
                const monthMap: { [key: string]: number } = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
                let year = parseInt(parts[3], 10);
                if (year < 100) { // Handle 2-digit years
                    year += 2000;
                }
                date = new Date(year, monthMap[parts[2].toLowerCase()], parseInt(parts[1]));
            }
        }
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    interface BondItem {
        name: string;
        couponRate: number;
        maturityDate: string;
        country: string;
        alias?: string;
        currency?: string;
        bondType?: 'FXD' | 'IFB';
        originalTenorYears?: number;
        whtRate?: number;
        amortizationEvents?: Array<{ date: string; percent: number }>;
    }

    const nigerianBonds: BondItem[] = [
        { name: "15.74% FGN SUKUK BOND DEC 2025", couponRate: 15.74, maturityDate: "28-DEC-2025", country: "NG" },
        { name: "12.50% FGN BOND JAN 2026", couponRate: 12.50, maturityDate: "22-JAN-2026", country: "NG" },
        { name: "21.00% FGN BOND MAR 2026", couponRate: 21.00, maturityDate: "20-MAR-2026", country: "NG" },
        { name: "14.50% FGN BOND JUN 2026", couponRate: 14.50, maturityDate: "13-JUN-2026", country: "NG" },
        { name: "16.2884% FGN OLD BOND MAR 2027", couponRate: 16.2884, maturityDate: "17-MAR-2027", country: "NG" },
        { name: "19.9400% FGN NEW BOND MAR 2027", couponRate: 19.94, maturityDate: "20-MAR-2027", country: "NG" },
        { name: "11.20% FGN SUKUK BOND JUN 2027", couponRate: 11.20, maturityDate: "16-JUN-2027", country: "NG" },
        { name: "13.98% FGN BOND FEB 2028", couponRate: 13.98, maturityDate: "23-FEB-2028", country: "NG" },
        { name: "21.00% FGN BOND MAR 2028", couponRate: 21.00, maturityDate: "20-MAR-2028", country: "NG" },
        { name: "15.00% FGN BOND NOV 2028", couponRate: 15.00, maturityDate: "28-NOV-2028", country: "NG" },
        { name: "19.30% FGN NEW BOND APR 2029", couponRate: 19.30, maturityDate: "17-APR-2029", country: "NG" },
        { name: "14.55% FGN OLD BOND APR 2029", couponRate: 14.55, maturityDate: "26-APR-2029", country: "NG" },
        { name: "12.49% FGN BOND MAY 2029", couponRate: 12.49, maturityDate: "22-MAY-2029", country: "NG" },
        { name: "9.75% FGN BOND SEP 2029", couponRate: 9.75, maturityDate: "06-SEP-2029", country: "NG" },
        { name: "8.50% FGN BOND NOV 2029", couponRate: 8.50, maturityDate: "20-NOV-2029", country: "NG" },
        { name: "10.00% FGN BOND JUL 2030", couponRate: 10.00, maturityDate: "23-JUL-2030", country: "NG" },
        { name: "17.945% FGN BOND AUG 2030", couponRate: 17.945, maturityDate: "27-AUG-2030", country: "NG" },
        { name: "18.5000% FGN BOND FEB 2031", couponRate: 18.50, maturityDate: "21-FEB-2031", country: "NG" },
        { name: "13.00% FGN SUKUK BOND DEC 2031", couponRate: 13.00, maturityDate: "29-DEC-2031", country: "NG" },
        { name: "12.5000% FGN BOND APR 2032", couponRate: 12.50, maturityDate: "27-APR-2032", country: "NG" },
        { name: "19.75% FGN SUKUK BOND MAY 2032", couponRate: 19.75, maturityDate: "23-MAY-2032", country: "NG" },
        { name: "17.95% FGN BOND JUN 2032", couponRate: 17.95, maturityDate: "25-JUN-2032", country: "NG" },
        { name: "15.64% FGN SUKUK BOND DEC 2032", couponRate: 15.64, maturityDate: "02-DEC-2032", country: "NG" },
        { name: "19.8900% FGN BOND MAY 2033", couponRate: 19.89, maturityDate: "15-MAY-2033", country: "NG" },
        { name: "14.7000% FGN BOND JUN 2033", couponRate: 14.70, maturityDate: "21-JUN-2033", country: "NG" },
        { name: "15.7500% FGN SUKUK BOND OCT 2033", couponRate: 15.75, maturityDate: "13-OCT-2033", country: "NG" },
        { name: "19.0000% FGN BOND FEB 2034", couponRate: 19.00, maturityDate: "21-FEB-2034", country: "NG" },
        { name: "12.1493% FGN BOND JUL 2034", couponRate: 12.1493, maturityDate: "18-JUL-2034", country: "NG" },
        { name: "22.6000% FGN BOND JAN 2035", couponRate: 22.60, maturityDate: "29-JAN-2035", country: "NG" },
        { name: "12.5000% FGN BOND MAR 2035", couponRate: 12.50, maturityDate: "27-MAR-2035", country: "NG" },
        { name: "12.4000% FGN BOND MAR 2036", couponRate: 12.40, maturityDate: "18-MAR-2036", country: "NG" },
        { name: "16.7900% FGN BOND SEP 2036", couponRate: 16.79, maturityDate: "16-SEP-2036", country: "NG" },
        { name: "16.2499% FGN BOND APR 2037", couponRate: 16.2499, maturityDate: "18-APR-2037", country: "NG" },
        { name: "15.4500% FGN BOND JUN 2038", couponRate: 15.45, maturityDate: "21-JUN-2038", country: "NG" },
        { name: "13.0000% FGN BOND JAN 2042", couponRate: 13.00, maturityDate: "21-JAN-2042", country: "NG" },
        { name: "9.8000% FGN BOND JUL 2045", couponRate: 9.80, maturityDate: "24-JUL-2045", country: "NG" },
        { name: "14.8000% FGN BOND APR 2049", couponRate: 14.80, maturityDate: "26-APR-2049", country: "NG" },
        { name: "12.9800% FGN BOND MAR 2050", couponRate: 12.98, maturityDate: "27-MAR-2050", country: "NG" },
        { name: "15.7000% FGN BOND JUN 2053", couponRate: 15.70, maturityDate: "21-JUN-2053", country: "NG" },
    ];

    const kenyanBonds: BondItem[] = [
        { 
            name: "12.2800% KENYAN BOND NOV 2029", 
            couponRate: 12.28, 
            maturityDate: "12-NOV-2029", 
            alias: "KENYA TREASURY BOND FXD4/2019/10 12 NOV 2029 KENYAN 12 NOV 2029 BOND", 
            currency: "KShs", 
            country: "KE", 
            bondType: "FXD", 
            originalTenorYears: 10, 
            whtRate: 0.10 
        },
        { 
            name: "12.5000% KENYAN INFRASTRUCTURE BOND JAN 2033", 
            couponRate: 12.50, 
            maturityDate: "10-JAN-2033", 
            alias: "KENYA TREASURY INFRASTRUCTURE BOND IFB1/2018/015 10 JAN 2033 KENYAN JAN 2033 BOND IFB", 
            currency: "KShs", 
            country: "KE", 
            bondType: "IFB", 
            originalTenorYears: 15, 
            whtRate: 0.0,
            amortizationEvents: [
                { date: "17-JAN-2028", percent: 40 },
                { date: "10-JAN-2033", percent: 60 }
            ]
        },
        { 
            name: "12.9650% KENYAN INFRASTRUCTURE BOND JAN 2041", 
            couponRate: 12.965, 
            maturityDate: "28-JAN-2041", 
            alias: "KENYA TREASURY INFRASTRUCTURE BOND IFB1/2022/019 28 JAN 2041 KENYAN JAN 2041 BOND JAN 41S JAN 41 IFB", 
            currency: "KShs", 
            country: "KE", 
            bondType: "IFB", 
            originalTenorYears: 19, 
            whtRate: 0.0,
            amortizationEvents: [
                { date: "09-FEB-2032", percent: 50 },
                { date: "28-JAN-2041", percent: 50 }
            ]
        },
        { 
            name: "12.7370% KENYAN INFRASTRUCTURE BOND AUG 2042", 
            couponRate: 12.737, 
            maturityDate: "18-AUG-2042", 
            alias: "KENYA TREASURY INFRASTRUCTURE BOND IFB1/2021/021 18 AUG 2042 KENYAN AUG 2042 BOND AUG 42S AUG 42 IFB", 
            currency: "KShs", 
            country: "KE", 
            bondType: "IFB", 
            originalTenorYears: 21, 
            whtRate: 0.0,
            amortizationEvents: [
                { date: "01-SEP-2031", percent: 50 },
                { date: "18-AUG-2042", percent: 50 }
            ]
        },
        { 
            name: "12.5000% KENYAN BOND MAR 2056", 
            couponRate: 12.50, 
            maturityDate: "13-MAR-2056", 
            alias: "KENYA TREASURY BOND FXD1/2026/030 13 MAR 2056", 
            currency: "KShs", 
            country: "KE", 
            bondType: "FXD", 
            originalTenorYears: 30, 
            whtRate: 0.10 
        }
    ];

    const bonds: BondItem[] = [
        ...nigerianBonds,
        ...kenyanBonds
    ].filter(bond => parseMaturityDate(bond.maturityDate).getTime() >= today.getTime());
    
    let isUpdating = false; // Flag to prevent calculation loops
    let selectedBondIndex = -1; // State for custom dropdown
    let activeOptionIndex = -1; // For keyboard navigation
    let backspaceCount = 0; // Track consecutive backspaces for fast deletion

    // --- DOM Elements ---
    const faceValueInput = document.getElementById('faceValue') as HTMLInputElement;
    const couponRateInput = document.getElementById('couponRate') as HTMLInputElement;
    const maturityDateInput = document.getElementById('maturityDate') as HTMLInputElement;
    const yearsToMaturityInput = document.getElementById('yearsToMaturity') as HTMLInputElement;
    const yieldToMaturityInput = document.getElementById('yieldToMaturity') as HTMLInputElement;
    
    // Custom Dropdown Elements
    const bondSearchInput = document.getElementById('bondSearchInput') as HTMLInputElement;
    const bondOptionsContainer = document.getElementById('bondOptionsContainer') as HTMLDivElement;

    const bondCleanPriceInput = document.getElementById('calculatedBondPriceInput') as HTMLInputElement; 
    const bondDirtyPriceInput = document.getElementById('bondDirtyPriceInput') as HTMLInputElement; 
    const considerationCalculatedInput = document.getElementById('considerationCalculatedInput') as HTMLInputElement;
    const fullCleanPriceInput = document.getElementById('fullCleanPriceInput') as HTMLInputElement;
    
    const outputInputs = [bondCleanPriceInput, bondDirtyPriceInput, considerationCalculatedInput, fullCleanPriceInput];

    const calendarToggle = calendarToggleRef.current;
    const calendarPopover = calendarPopoverRef.current;
    const settlementDateInput = settlementDateInputRef.current;

    if (!calendarToggle || !calendarPopover || !settlementDateInput) {
        return;
    }

    function isKenyanBond(bond: any): boolean {
        if (!bond) return false;
        return bond.country === 'KE' || bond.currency === 'KShs' || bond.name?.toUpperCase().includes('KENYA');
    }

    function formatTwoDecimals(value: any) {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        return num.toFixed(2);
    }
    function formatNaira(value: any) {
        const number = parseFloat(value);
        if (isNaN(number)) return '0.00';
        return new Intl.NumberFormat('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }
    function getDecimalPlaces(value: any): number {
        const str = String(value);
        const parts = str.split('.');
        if (parts.length > 1) {
            return parts[1].length;
        }
        return 0;
    }
    function formatNairaWithDp(value: any, maxDp = 2) {
        const number = parseFloat(value);
        if (isNaN(number)) return '0.00';
        return new Intl.NumberFormat('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: maxDp
        }).format(number);
    }
    function formatNairaTo6(value: any) {
        const number = parseFloat(value);
        if (isNaN(number)) return '0.000000';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6
        }).format(number);
    }
    function formatDirtyPrice(value: any) {
        const number = parseFloat(value);
        if (isNaN(number)) return '0.00';
        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        if (selectedBond && isKenyanBond(selectedBond)) {
            if (kenyanPricingModeRef.current === 'quoted') {
                return new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4
                }).format(number);
            }
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
            }).format(number);
        }
        return new Intl.NumberFormat('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 12
        }).format(number);
    }
    function formatCouponRate(value: any) {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        return num.toFixed(4) + '%';
    }
    function parseCouponRate(formattedStr: string) {
        if (!formattedStr) return 0;
        const cleanStr = String(formattedStr).replace(/%/g, '').trim();
        return parseFloat(cleanStr);
    }
    function parseNaira(formattedStr: string) {
        if (!formattedStr) return 0;
        const cleanStr = String(formattedStr).replace(/[₦,]/g, '').replace(/kshs?/gi, '').replace(/kes/gi, '').replace(/ngn/gi, '').trim();
        return parseFloat(cleanStr);
    }

    function parseSettlementDateInput(str: string): Date | null {
        if (!str || typeof str !== 'string') return null;
        const s = str.trim().toLowerCase();
        const cleanS = s.replace(/settlement/gi, '').trim();

        // 1. ISO: YYYY-MM-DD or YYYY/MM/DD
        const isoMatch = cleanS.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (isoMatch) {
            const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
            d.setHours(0, 0, 0, 0);
            return isNaN(d.getTime()) ? null : d;
        }

        // 2. DMY: e.g. 3 Nov 2026, 03-Nov-2026, 3/11/2026, 3 nov
        const monthMap: { [key: string]: number } = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
            january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };
        const dmyMatch = cleanS.match(/^(\d{1,2})[-\s\/]+([a-z]+)(?:[-\s\/]+(\d{2,4}))?$/i);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const mStr = dmyMatch[2].toLowerCase();
            let month = monthMap[mStr];
            if (month === undefined) {
                const key = Object.keys(monthMap).find(k => k.startsWith(mStr.slice(0, 3)));
                if (key) month = monthMap[key];
            }
            if (month !== undefined) {
                let year = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : 2026;
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                d.setHours(0, 0, 0, 0);
                return isNaN(d.getTime()) ? null : d;
            }
        }

        // 3. MDY: e.g. November 3, 2026, Nov 3 2026, Nov 3
        const mdyMatch = cleanS.match(/^([a-z]+)[-\s\/]+(\d{1,2})(?:[,\s]+(\d{2,4}))?$/i);
        if (mdyMatch) {
            const mStr = mdyMatch[1].toLowerCase();
            let month = monthMap[mStr];
            if (month === undefined) {
                const key = Object.keys(monthMap).find(k => k.startsWith(mStr.slice(0, 3)));
                if (key) month = monthMap[key];
            }
            if (month !== undefined) {
                const day = parseInt(mdyMatch[2], 10);
                let year = mdyMatch[3] ? parseInt(mdyMatch[3], 10) : 2026;
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                d.setHours(0, 0, 0, 0);
                return isNaN(d.getTime()) ? null : d;
            }
        }

        // 4. Standard Date.parse
        const fallback = new Date(cleanS);
        if (!isNaN(fallback.getTime())) {
            fallback.setHours(0, 0, 0, 0);
            return fallback;
        }

        return null;
    }

    function parseFinancialInput(valueStr: string) {
        if (typeof valueStr !== 'string' || valueStr.trim() === '') {
            return 0;
        }
        let cleanStr = valueStr.toLowerCase().trim().replace(/,/g, '').replace(/₦/g, '').replace(/kshs?/gi, '').replace(/kes/gi, '').replace(/ngn/gi, '').trim();
        let multiplier = 1;

        if (cleanStr.endsWith('b')) {
            multiplier = 1e9;
            cleanStr = cleanStr.slice(0, -1);
        } else if (cleanStr.endsWith('m')) {
            multiplier = 1e6;
            cleanStr = cleanStr.slice(0, -1);
        } else if (cleanStr.endsWith('k')) {
            multiplier = 1e3;
            cleanStr = cleanStr.slice(0, -1);
        }

        const num = parseFloat(cleanStr);
        if (isNaN(num)) return 0;
        return num * multiplier;
    }

    function getDayDifference(d1: Date, d2: Date) {
        const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
        return Math.round((t2 - t1) / MS_PER_DAY);
    }

    // =========================================================================
    // --- NIGERIAN BOND PRICING ENGINE (UNTOUCHED: Actual/Actual, ICMA) ---
    // =========================================================================
    function findCouponDates(settlement: Date, maturity: Date, frequency: number) {
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
    
    function getInitialDirtyPrice(settlement: Date, maturity: Date, C: number, Y: number, F: number) {
        const redemption = REDEMPTION_VALUE_PER_100;
        const r = Y / F;
        const Coup = (redemption * C) / F;

        if (settlement.getTime() >= maturity.getTime()) return redemption;

        const { lcc, ncc } = findCouponDates(settlement, maturity, F);
        const E = getDayDifference(lcc, ncc);
        const DSC = getDayDifference(settlement, ncc);
        
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
        
        const frac_exp = (E > 0) ? (DSC / E) : 0;
        
        let dirty_price = 0.0;
        for (let k = 1; k <= N; k++) {
            const exponent = (k - 1) + frac_exp;
            let term = Coup / Math.pow(1 + r, exponent);
            if (k === N) {
                term += redemption / Math.pow(1 + r, exponent);
            }
            dirty_price += term;
        }
        return dirty_price;
    }

    function calculate_user_bond_price(settlement: Date, maturity: Date, C: number, Y: number, F: number, overrideCleanPrice?: number) {
        if (settlement.getTime() >= maturity.getTime()) {
            return { cleanPrice: REDEMPTION_VALUE_PER_100, dirtyPrice: REDEMPTION_VALUE_PER_100, accruedInterest: 0, debug: { A: 0, E: 182, AI: 0, clean_price_raw: REDEMPTION_VALUE_PER_100, dirty_price_raw: REDEMPTION_VALUE_PER_100 } };
        }

        const { lcc, ncc } = findCouponDates(settlement, maturity, F);
        const A = getDayDifference(lcc, settlement);
        const E = getDayDifference(lcc, ncc);
        
        const redemption = REDEMPTION_VALUE_PER_100;
        const Coup = (redemption * C) / F;
        
        const AI_raw = (E > 0) ? Coup * (A / E) : 0;
        const AI = Math.round(AI_raw * 1e12) / 1e12;

        let clean_price_raw: number;
        let dirty_price_for_consideration: number;

        if (overrideCleanPrice !== undefined) {
            clean_price_raw = overrideCleanPrice;
            dirty_price_for_consideration = overrideCleanPrice + AI;
        } else {
            const dirty_price = getInitialDirtyPrice(settlement, maturity, C, Y, F);
            dirty_price_for_consideration = dirty_price;
            clean_price_raw = dirty_price_for_consideration - AI;
        }
        
        const clean_price = Math.round(clean_price_raw * 1000000) / 1000000;
        
        return {
            cleanPrice: Math.max(0, clean_price),
            dirtyPrice: Math.max(0, dirty_price_for_consideration),
            accruedInterest: Math.max(0, AI),
            debug: { A, E, AI, clean_price_raw, dirty_price_raw: dirty_price_for_consideration }
        };
    }
    
    function calculateYieldFromPrice(targetCleanPrice: number, settlement: Date, maturity: Date, C: number, F: number) {
        const { lcc, ncc } = findCouponDates(settlement, maturity, F);
        const E = getDayDifference(lcc, ncc);
        const A = getDayDifference(lcc, settlement);
        const redemption = REDEMPTION_VALUE_PER_100;
        const Coup = (redemption * C) / F;
        const AI = (E > 0) ? Coup * (A / E) : 0;

        const targetDirtyPrice = targetCleanPrice + AI;

        let lowYield = 0.0;
        let highYield = 2.0;
        let midYield = 0.0;
        const tolerance = 1e-9;
        const maxIterations = 100;

        for (let i = 0; i < maxIterations; i++) {
            midYield = (lowYield + highYield) / 2;
            if (midYield < 0) return 0;

            const calculatedDirtyPrice = getInitialDirtyPrice(settlement, maturity, C, midYield, F);
            const difference = calculatedDirtyPrice - targetDirtyPrice;

            if (Math.abs(difference) < tolerance) {
                return midYield;
            }
            
            if (difference > 0) {
                lowYield = midYield;
            } else {
                highYield = midYield;
            }
        }
        return midYield;
    }

    // =========================================================================
    // --- KENYAN BOND PRICING ENGINE (CBK / NSE SPECIFICATION) ---
    // Conventions:
    // 1. Day Count: Actual/364. Coupon period is strictly 182 days (26 weeks).
    //    182 x 2 = 364 days. Drift is 1 day per normal year, 2 days per leap year,
    //    preserving Monday weekday anchor. Accrued Interest denominator is always 182.
    // 2. Yield-Driven Quoting: Agreed YTM (to 4 d.p.) produces Clean & Dirty Price.
    // 3. Principal Amortization (IFB Factor): Sinking fund 50% partial redemption
    //    at midpoint + 50% at final maturity with stepping-down coupons & WAL.
    // 4. Tax Integration: IFB is 100% Tax-Exempt (0% WHT). FXD has 10% WHT (>=10Y)
    //    or 15% WHT (<10Y). Calculates Gross YTM, Net YTM, and Tax-Equivalent Yield.
    // =========================================================================
    const KENYA_COUPON_PERIOD_DAYS = 182; // 26 weeks exactly
    const MS_PER_KENYA_PERIOD = KENYA_COUPON_PERIOD_DAYS * MS_PER_DAY;

    function findKenyanCouponDates(settlement: Date, maturity: Date) {
        let ncc = new Date(maturity.getTime());
        ncc.setHours(0, 0, 0, 0);

        if (settlement.getTime() >= maturity.getTime()) {
            return {
                lcc: new Date(maturity),
                ncc: new Date(maturity),
                A: 0,
                DSC: 0,
                E: KENYA_COUPON_PERIOD_DAYS
            };
        }

        // Step backwards strictly by 182 days (26 weeks) from maturity
        while (ncc.getTime() > settlement.getTime()) {
            const prev = new Date(ncc.getTime() - MS_PER_KENYA_PERIOD);
            if (prev.getTime() <= settlement.getTime()) {
                const lcc = prev;
                const A = Math.round((settlement.getTime() - lcc.getTime()) / MS_PER_DAY);
                const DSC = KENYA_COUPON_PERIOD_DAYS - A;
                return { lcc, ncc, A, DSC, E: KENYA_COUPON_PERIOD_DAYS };
            }
            ncc = prev;
        }

        const lcc = new Date(ncc.getTime() - MS_PER_KENYA_PERIOD);
        const A = Math.round((settlement.getTime() - lcc.getTime()) / MS_PER_DAY);
        return { lcc, ncc, A, DSC: KENYA_COUPON_PERIOD_DAYS - A, E: KENYA_COUPON_PERIOD_DAYS };
    }

    function calculateKenyanBondPrice(
        settlement: Date,
        maturity: Date,
        bond: any,
        Y: number, // Annual yield in decimal (e.g. 0.1250)
        faceValue: number,
        overrideCleanPrice?: number
    ) {
        const C = bond.couponRate / 100;
        const isIFB = bond.bondType === 'IFB' || bond.name?.toUpperCase().includes('INFRASTRUCTURE');
        const originalTenorYears = bond.originalTenorYears || (isIFB ? 15 : 10);
        // Tax rate: IFBs are 100% tax-exempt. FXDs: 10% for >=10y, 15% for <10y.
        const whtRate = isIFB ? 0.0 : (originalTenorYears >= 10 ? 0.10 : 0.15);

        const { lcc, ncc, A, DSC } = findKenyanCouponDates(settlement, maturity);
        const f = DSC / KENYA_COUPON_PERIOD_DAYS; // Fraction of semi-annual period remaining

        // Current outstanding par pool based on past amortization events (or midpoint fallback)
        let currentParPercent = 100;
        if (bond.amortizationEvents && bond.amortizationEvents.length > 0) {
            for (const ev of bond.amortizationEvents) {
                const evDate = parseMaturityDate(ev.date);
                if (settlement.getTime() >= evDate.getTime()) {
                    currentParPercent -= ev.percent;
                }
            }
        } else if (isIFB) {
            const totalHalfYears = originalTenorYears * 2;
            const midpointHalfYears = Math.floor(totalHalfYears / 2);
            const midpointDate = new Date(maturity.getTime() - midpointHalfYears * MS_PER_KENYA_PERIOD);
            if (settlement.getTime() >= midpointDate.getTime()) {
                currentParPercent = 50;
            }
        }
        currentParPercent = Math.max(0, currentParPercent);
        const currentParFactor = currentParPercent / 100;

        // Accrued interest per 100 nominal:
        // Formula: (Coupon / 2) * (Actual Days Held / 182) * currentParFactor
        const AI_per_100_raw = (C / 2) * (A / KENYA_COUPON_PERIOD_DAYS) * 100 * currentParFactor;
        const AI_per_100 = Math.round(AI_per_100_raw * 1e6) / 1e6;

        // Generate future cash flows from NCC up to maturity in exact 182-day increments
        const cashFlows: Array<{
            date: Date;
            periodIndex: number;
            exponent: number;
            couponGross: number;
            principalRepaid: number;
            couponNet: number;
            totalGross: number;
            totalNet: number;
            remainingPrincipal: number;
        }> = [];

        let tempDate = new Date(ncc.getTime());
        let k = 1;
        let runningPar = currentParPercent;

        while (tempDate.getTime() <= maturity.getTime()) {
            const exponent = (k - 1) + f;
            let principalRepaid = 0;
            let couponGross = 0;

            if (bond.amortizationEvents && bond.amortizationEvents.length > 0) {
                const event = bond.amortizationEvents.find((ev: any) => {
                    const evDate = parseMaturityDate(ev.date);
                    return Math.abs(evDate.getTime() - tempDate.getTime()) <= 3 * MS_PER_DAY;
                });
                if (event) {
                    principalRepaid = event.percent;
                    couponGross = runningPar * (C / 2);
                    runningPar = Math.max(0, runningPar - event.percent);
                } else if (tempDate.getTime() === maturity.getTime()) {
                    principalRepaid = runningPar;
                    couponGross = runningPar * (C / 2);
                    runningPar = 0;
                } else {
                    couponGross = runningPar * (C / 2);
                }
            } else if (isIFB) {
                const totalHalfYears = originalTenorYears * 2;
                const midpointHalfYears = Math.floor(totalHalfYears / 2);
                const midpointDate = new Date(maturity.getTime() - midpointHalfYears * MS_PER_KENYA_PERIOD);
                if (tempDate.getTime() === midpointDate.getTime()) {
                    principalRepaid = 50;
                    couponGross = runningPar * (C / 2);
                    runningPar = 50;
                } else if (tempDate.getTime() === maturity.getTime()) {
                    principalRepaid = runningPar;
                    couponGross = runningPar * (C / 2);
                    runningPar = 0;
                } else if (tempDate.getTime() < midpointDate.getTime()) {
                    principalRepaid = 0;
                    couponGross = 100 * (C / 2);
                } else {
                    principalRepaid = 0;
                    couponGross = 50 * (C / 2);
                }
            } else {
                // FXD bullet bond
                if (tempDate.getTime() === maturity.getTime()) {
                    principalRepaid = 100;
                    couponGross = 100 * (C / 2);
                    runningPar = 0;
                } else {
                    principalRepaid = 0;
                    couponGross = 100 * (C / 2);
                }
            }

            const couponNet = couponGross * (1 - whtRate);
            const totalGross = couponGross + principalRepaid;
            const totalNet = couponNet + principalRepaid;

            cashFlows.push({
                date: new Date(tempDate),
                periodIndex: k,
                exponent,
                couponGross,
                principalRepaid,
                couponNet,
                totalGross,
                totalNet,
                remainingPrincipal: runningPar
            });

            tempDate = new Date(tempDate.getTime() + MS_PER_KENYA_PERIOD);
            k++;
        }

        // Semi-annual compounding discount rate r = Y / 2
        const r = Y / 2;
        let dirtyPriceRaw = 0;

        if (overrideCleanPrice !== undefined) {
            dirtyPriceRaw = overrideCleanPrice + AI_per_100;
        } else {
            for (const cf of cashFlows) {
                dirtyPriceRaw += cf.totalGross / Math.pow(1 + r, cf.exponent);
            }
        }

        // Kenyan Market (CBK / NSE) Quoting & Excel Convention:
        // Dirty Price is quoted and agreed to 4 decimal places (e.g. 107.2922).
        // Excel and secondary market trade confirmations compute:
        // 1. Quoted Dirty Price = ROUND(dirtyPriceRaw, 4)
        // 2. Clean Price = Quoted Dirty Price - Accrued Interest (e.g. 107.2922 - 2.778214 = 104.513986)
        // 3. Trade Consideration = Face Value * (Quoted Dirty Price / 100) (e.g. 500M * 107.2922 / 100 = 536,461,000.00)
        const dirtyPrice4dp = Math.round(dirtyPriceRaw * 10000) / 10000;
        const cleanPriceFrom4dp = Math.round((dirtyPrice4dp - AI_per_100) * 1e6) / 1e6;
        
        // Full unrounded floating-point clean price & consideration:
        const cleanPriceRaw = dirtyPriceRaw - AI_per_100;
        const cleanPrice6dp = Math.round(cleanPriceRaw * 1e6) / 1e6;
        const consideration = Math.round(faceValue * dirtyPrice4dp) / 100;
        const considerationUnrounded = (faceValue * dirtyPriceRaw) / 100;
        const considerationDiff = consideration - considerationUnrounded;
        const principalAmount = Math.round(faceValue * cleanPriceFrom4dp) / 100;
        const aiAmount = consideration - principalAmount;

        // Weighted Average Life (WAL)
        let totalWeightedYears = 0;
        let totalPrincipalCash = 0;
        for (const cf of cashFlows) {
            if (cf.principalRepaid > 0) {
                const yearsFromSettlement = (cf.date.getTime() - settlement.getTime()) / (364 * MS_PER_DAY);
                totalWeightedYears += yearsFromSettlement * cf.principalRepaid;
                totalPrincipalCash += cf.principalRepaid;
            }
        }
        const walYears = totalPrincipalCash > 0 ? (totalWeightedYears / totalPrincipalCash) : 0;

        // Net Yield to Maturity (solving discounting on net cash flows)
        let netYtm = Y;
        if (whtRate > 0) {
            const targetNetDirty = cleanPriceRaw + (AI_per_100 * (1 - whtRate));
            let lowY = 0.0;
            let highY = 2.0;
            for (let iter = 0; iter < 60; iter++) {
                const midY = (lowY + highY) / 2;
                const rNet = midY / 2;
                let pvNet = 0;
                for (const cf of cashFlows) {
                    pvNet += cf.totalNet / Math.pow(1 + rNet, cf.exponent);
                }
                if (pvNet > targetNetDirty) {
                    lowY = midY;
                } else {
                    highY = midY;
                }
            }
            netYtm = (lowY + highY) / 2;
        }

        // Tax-Equivalent Yield for IFB vs benchmark 10% WHT FXD
        const taxEquivalentYield = isIFB ? (Y / (1 - 0.10)) : null;

        return {
            cleanPrice: Math.max(0, cleanPriceFrom4dp),
            cleanPriceRaw: Math.max(0, cleanPriceRaw),
            cleanPrice6dp: Math.max(0, cleanPrice6dp),
            cleanPriceFrom4dp: Math.max(0, cleanPriceFrom4dp),
            dirtyPrice: Math.max(0, dirtyPrice4dp),
            dirtyPrice4dp: Math.max(0, dirtyPrice4dp),
            dirtyPriceRaw: Math.max(0, dirtyPriceRaw),
            accruedInterest: Math.max(0, AI_per_100),
            consideration,
            consideration4dp: consideration,
            considerationUnrounded,
            considerationDiff,
            principalAmount,
            aiAmount,
            walYears,
            grossYtm: Y,
            netYtm,
            taxEquivalentYield,
            currentParPercent,
            whtRate,
            daysSinceLcc: A,
            daysToNcc: DSC,
            isIFB,
            cashFlows,
            ncc,
            lcc
        };
    }

    function calculateKenyanYieldFromPrice(
        targetCleanPrice: number,
        settlement: Date,
        maturity: Date,
        bond: any
    ) {
        let lowYield = 0.0001;
        let highYield = 2.0;
        let midYield = 0.0;
        const tolerance = 1e-9;
        const maxIterations = 80;

        for (let i = 0; i < maxIterations; i++) {
            midYield = (lowYield + highYield) / 2;
            const res = calculateKenyanBondPrice(settlement, maturity, bond, midYield, 100);
            const difference = res.cleanPriceRaw - targetCleanPrice;

            if (Math.abs(difference) < tolerance) {
                return midYield;
            }

            if (difference > 0) {
                lowYield = midYield;
            } else {
                highYield = midYield;
            }
        }
        return midYield;
    }

    // --- CORE & WRAPPER CALCULATION FUNCTIONS ---
    function _calculateAndDisplayBondPrice(overrideCleanPrice?: number) {
        const faceValue = parseFinancialInput(faceValueInput.value); 
        const couponRate = parseCouponRate(couponRateInput.value) / 100;
        const yieldToMaturity = parseFloat(yieldToMaturityInput.value) / 100;
        const maturityDateStr = maturityDateInput.value;
        const maturity = parseMaturityDate(maturityDateStr);
        
        const settlementDate = new Date(settlementDateRef.current);
        settlementDate.setHours(0, 0, 0, 0);

        if (isNaN(faceValue) || isNaN(couponRate) || isNaN(yieldToMaturity) ||
            faceValue <= 0 || couponRate < 0 || yieldToMaturity < 0 || isNaN(maturity.getTime())) {
            setPendingState();
            setKenyanAnalytics(null);
            return;
        }

        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        const isKenyan = isKenyanBond(selectedBond);

        if (isKenyan && selectedBond) {
            // === Execute Kenyan CBK / NSE Engine ===
            const kenyanRes = calculateKenyanBondPrice(
                settlementDate,
                maturity,
                selectedBond,
                yieldToMaturity,
                faceValue,
                overrideCleanPrice
            );

            setKenyanAnalytics({
                isKenyan: true,
                isIFB: kenyanRes.isIFB,
                bondType: kenyanRes.isIFB ? 'IFB' : 'FXD',
                whtRate: kenyanRes.whtRate,
                daysSinceLcc: kenyanRes.daysSinceLcc,
                daysInPeriod: 182,
                accruedInterestPer100: kenyanRes.accruedInterest,
                outstandingParPercent: kenyanRes.currentParPercent,
                walYears: kenyanRes.walYears,
                grossYtm: kenyanRes.grossYtm,
                netYtm: kenyanRes.netYtm,
                taxEquivalentYield: kenyanRes.taxEquivalentYield,
                dirtyPrice4dp: kenyanRes.dirtyPrice4dp,
                dirtyPriceRaw: kenyanRes.dirtyPriceRaw,
                cleanPriceFrom4dp: kenyanRes.cleanPriceFrom4dp,
                cleanPrice6dp: kenyanRes.cleanPrice6dp,
                consideration4dp: kenyanRes.consideration4dp,
                considerationUnrounded: kenyanRes.considerationUnrounded,
                considerationDiff: kenyanRes.considerationDiff,
                cashFlowSchedule: kenyanRes.cashFlows.map(cf => ({
                    dateStr: cf.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    daysFromSettlement: Math.round((cf.date.getTime() - settlementDate.getTime()) / MS_PER_DAY),
                    couponAmount: cf.couponGross,
                    principalAmount: cf.principalRepaid,
                    netAmount: cf.totalNet,
                    remainingPrincipal: cf.remainingPrincipal
                })),
                finalMaturityStr: maturity.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            });

            const isQuotedMode = kenyanPricingModeRef.current === 'quoted';
            const displayClean = isQuotedMode ? kenyanRes.cleanPriceFrom4dp : kenyanRes.cleanPrice6dp;
            const displayDirty = isQuotedMode ? kenyanRes.dirtyPrice4dp : kenyanRes.dirtyPriceRaw;
            const displayConsideration = isQuotedMode ? kenyanRes.consideration4dp : kenyanRes.considerationUnrounded;
            const displayCleanRaw = isQuotedMode ? kenyanRes.cleanPriceFrom4dp : kenyanRes.cleanPriceRaw;

            removePendingState(
                displayClean,
                displayDirty,
                displayConsideration,
                displayCleanRaw,
                overrideCleanPrice
            );
        } else {
            // === Execute Nigerian Engine (Bloomberg BBG YAS / FMDQ Standard Convention) ===
            setKenyanAnalytics(null);
            const { cleanPrice, dirtyPrice, accruedInterest, debug } = calculate_user_bond_price(
                settlementDate, 
                maturity, 
                couponRate, 
                yieldToMaturity, 
                COUPON_FREQUENCY,
                overrideCleanPrice
            );

            // Bloomberg (BBG YAS) and FMDQ Standard Settlement Consideration Split:
            // Trade consideration is calculated by summing the separately rounded ledger items:
            // 1. Principal Consideration = round(Face Value * Clean Price / 100, 2)
            // 2. Accrued Interest = round(Face Value * Accrued Interest / 100, 2)
            // 3. Settlement Consideration = Principal Consideration + Accrued Interest
            // This prevents sub-kobo rounding drift and matches Bloomberg to the exact cent/kobo.
            const cleanPriceForConsideration = overrideCleanPrice !== undefined ? overrideCleanPrice : debug.clean_price_raw;
            const principalAmount = Math.round((faceValue * cleanPriceForConsideration) / 100 * 100) / 100;
            const aiAmount = Math.round((faceValue * accruedInterest) / 100 * 100) / 100;
            const consideration = Math.round((principalAmount + aiAmount) * 100) / 100;

            removePendingState(cleanPrice, dirtyPrice, consideration, debug.clean_price_raw, overrideCleanPrice);
        }
    }

    function calculateBondPrice() {
        if (isUpdating) return;
        isUpdating = true;
        _calculateAndDisplayBondPrice();
        isUpdating = false;
    }

    function calculateFromCleanPrice() {
        if (isUpdating) return;
        isUpdating = true;
        
        const cleanPrice = parseNaira(bondCleanPriceInput.value);
        const couponRate = parseCouponRate(couponRateInput.value) / 100;
        const maturityDateStr = maturityDateInput.value;
        const maturity = parseMaturityDate(maturityDateStr);
        const settlementDate = settlementDateRef.current;
        
        if (isNaN(cleanPrice) || isNaN(couponRate) || isNaN(maturity.getTime()) || cleanPrice <= 0) {
             if (bondCleanPriceInput.value.trim() === '' || parseNaira(bondCleanPriceInput.value) === 0) {
                setPendingState();
            }
            isUpdating = false;
            return;
        }

        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        const isKenyan = isKenyanBond(selectedBond);

        if (isKenyan && selectedBond) {
            const calculatedYield = calculateKenyanYieldFromPrice(cleanPrice, settlementDate, maturity, selectedBond);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(cleanPrice);
        } else {
            const calculatedYield = calculateYieldFromPrice(cleanPrice, settlementDate, maturity, couponRate, COUPON_FREQUENCY);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(cleanPrice);
        }
        
        isUpdating = false;
    }

    function calculateFromDirtyPrice() {
        if (isUpdating) return;
        isUpdating = true;

        const dirtyPrice = parseNaira(bondDirtyPriceInput.value);
        const faceValue = parseFinancialInput(faceValueInput.value);
        const couponRate = parseCouponRate(couponRateInput.value) / 100;
        const maturityDateStr = maturityDateInput.value;
        const maturity = parseMaturityDate(maturityDateStr);
        const settlementDate = settlementDateRef.current;

        if (isNaN(dirtyPrice) || isNaN(couponRate) || isNaN(maturity.getTime()) || dirtyPrice <= 0) {
            isUpdating = false;
            return;
        }

        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        const isKenyan = isKenyanBond(selectedBond);

        if (isKenyan && selectedBond) {
            const { A } = findKenyanCouponDates(settlementDate, maturity);
            const C = selectedBond.couponRate / 100;
            let currentParPercent = 100;
            if (selectedBond.amortizationEvents && selectedBond.amortizationEvents.length > 0) {
                for (const ev of selectedBond.amortizationEvents) {
                    const evDate = parseMaturityDate(ev.date);
                    if (settlementDate.getTime() >= evDate.getTime()) {
                        currentParPercent -= ev.percent;
                    }
                }
            }
            const parFactor = Math.max(0, currentParPercent) / 100;
            const AI = (C / 2) * (A / KENYA_COUPON_PERIOD_DAYS) * 100 * parFactor;
            const derivedClean = dirtyPrice - AI;
            const calculatedYield = calculateKenyanYieldFromPrice(derivedClean, settlementDate, maturity, selectedBond);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(derivedClean);
        } else {
            const { lcc, ncc } = findCouponDates(settlementDate, maturity, COUPON_FREQUENCY);
            const A = (settlementDate.getTime() - lcc.getTime()) / MS_PER_DAY;
            const redemption = REDEMPTION_VALUE_PER_100;
            const Coup = (redemption * couponRate) / COUPON_FREQUENCY;
            const E = (ncc.getTime() - lcc.getTime()) / MS_PER_DAY;
            const AI = (E > 0) ? Coup * (A / E) : 0;
            const derivedClean = dirtyPrice - AI;
            const calculatedYield = calculateYieldFromPrice(derivedClean, settlementDate, maturity, couponRate, COUPON_FREQUENCY);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(derivedClean);
        }

        isUpdating = false;
    }

    function calculateFromConsideration() {
        if (isUpdating) return;
        isUpdating = true;

        const consideration = parseNaira(considerationCalculatedInput.value);
        const faceValue = parseFinancialInput(faceValueInput.value);
        const couponRate = parseCouponRate(couponRateInput.value) / 100;
        const maturityDateStr = maturityDateInput.value;
        const maturity = parseMaturityDate(maturityDateStr);
        const settlementDate = settlementDateRef.current;

        if (isNaN(consideration) || isNaN(faceValue) || isNaN(couponRate) || isNaN(maturity.getTime()) || consideration <= 0 || faceValue <= 0) {
            if (considerationCalculatedInput.value.trim() === '' || parseNaira(considerationCalculatedInput.value) === 0) {
                setPendingState();
            }
            isUpdating = false;
            return;
        }

        const targetDirtyPrice = (consideration / faceValue) * 100;
        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        const isKenyan = isKenyanBond(selectedBond);

        if (isKenyan && selectedBond) {
            const { A } = findKenyanCouponDates(settlementDate, maturity);
            const C = selectedBond.couponRate / 100;
            let currentParPercent = 100;
            if (selectedBond.amortizationEvents && selectedBond.amortizationEvents.length > 0) {
                for (const ev of selectedBond.amortizationEvents) {
                    const evDate = parseMaturityDate(ev.date);
                    if (settlementDate.getTime() >= evDate.getTime()) {
                        currentParPercent -= ev.percent;
                    }
                }
            }
            const parFactor = Math.max(0, currentParPercent) / 100;
            const AI = (C / 2) * (A / KENYA_COUPON_PERIOD_DAYS) * 100 * parFactor;
            const targetCleanPrice = targetDirtyPrice - AI;

            const calculatedYield = calculateKenyanYieldFromPrice(targetCleanPrice, settlementDate, maturity, selectedBond);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(targetCleanPrice);
        } else {
            const { lcc, ncc } = findCouponDates(settlementDate, maturity, COUPON_FREQUENCY);
            const A = (settlementDate.getTime() - lcc.getTime()) / MS_PER_DAY;
            const redemption = REDEMPTION_VALUE_PER_100;
            const Coup = (redemption * couponRate) / COUPON_FREQUENCY;
            const E = (ncc.getTime() - lcc.getTime()) / MS_PER_DAY;
            const AI = (E > 0) ? Coup * (A / E) : 0;

            const aiAmount = Math.round((faceValue * AI) / 100 * 100) / 100;
            const principal = consideration - aiAmount;
            const targetCleanPrice = (principal / faceValue) * 100;
            
            const calculatedYield = calculateYieldFromPrice(targetCleanPrice, settlementDate, maturity, couponRate, COUPON_FREQUENCY);
            yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
            _calculateAndDisplayBondPrice(targetCleanPrice);
        }

        isUpdating = false;
    }
    
    // --- Other Utility Functions ---
    function setPendingState() {
        setKenyanAnalytics(null);
        const PENDING_MESSAGE = 'Will be Computed';
        if (document.activeElement !== bondCleanPriceInput) {
            bondCleanPriceInput.value = PENDING_MESSAGE;
        }
        if (document.activeElement !== considerationCalculatedInput) {
            considerationCalculatedInput.value = PENDING_MESSAGE;
        }
        if (document.activeElement !== bondDirtyPriceInput) {
            bondDirtyPriceInput.value = PENDING_MESSAGE;
        }
        fullCleanPriceInput.value = PENDING_MESSAGE;

        [bondDirtyPriceInput, fullCleanPriceInput].forEach(input => {
            input.classList.add('text-gray-400', 'font-normal'); 
            input.classList.remove('text-gray-900');
        });
    }

    function removePendingState(cleanPrice: number, dirtyPrice: number, consideration: number, cleanPriceRaw?: number, overrideCleanPrice?: number) {
        const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
        const isKenyan = isKenyanBond(selectedBond);

        if (document.activeElement !== bondCleanPriceInput) {
            if (overrideCleanPrice !== undefined) {
                const dps = getDecimalPlaces(overrideCleanPrice);
                bondCleanPriceInput.value = formatNairaWithDp(overrideCleanPrice, Math.max(2, dps));
            } else {
                bondCleanPriceInput.value = formatNairaTo6(cleanPrice);
            }
        }
        if (document.activeElement !== considerationCalculatedInput) {
            considerationCalculatedInput.value = formatNaira(consideration);
        }
        if (document.activeElement !== bondDirtyPriceInput) {
            bondDirtyPriceInput.value = formatDirtyPrice(dirtyPrice);
        }
        
        if (cleanPriceRaw !== undefined) {
            if (isKenyan && kenyanPricingModeRef.current === 'quoted') {
                fullCleanPriceInput.value = cleanPrice.toFixed(6) + "000000000";
            } else {
                fullCleanPriceInput.value = cleanPriceRaw.toFixed(15);
            }
        }

        outputInputs.forEach(input => {
            input.classList.remove('text-gray-400', 'italic', 'font-normal');
            input.classList.add('text-gray-900');
        });
    }

    function setYearsToMaturityPendingState(message: string) {
        yearsToMaturityInput.value = message;
        yearsToMaturityInput.dataset.totalYears = '0';
        yearsToMaturityInput.classList.add('text-gray-400', 'font-normal');
        yearsToMaturityInput.classList.remove('text-gray-700');
    }
    function removeYearsToMaturityPendingState() {
        yearsToMaturityInput.classList.remove('text-gray-400', 'font-normal');
        yearsToMaturityInput.classList.add('text-gray-700');
    }
    function calculateYearsToMaturityAndDisplay(settlementDate: Date, maturityDateStr: string) {
        if (!maturityDateStr) {
            setYearsToMaturityPendingState('Awaiting Maturity Date'); 
            return;
        }

        const maturity = parseMaturityDate(maturityDateStr);
        if (isNaN(maturity.getTime())) {
            setYearsToMaturityPendingState('Invalid Maturity Date');
            return;
        }
        
        maturity.setHours(0, 0, 0, 0);
        settlementDate.setHours(0, 0, 0, 0);

        const timeDifference = maturity.getTime() - settlementDate.getTime();
        const daysDifference = timeDifference / MS_PER_DAY;

        if (daysDifference <= 0) {
             setYearsToMaturityPendingState('Bond has matured');
             return;
        }
        
        removeYearsToMaturityPendingState();
        
        const totalYears = daysDifference / 365.25;
        const years = Math.floor(totalYears);
        const remainingDays = daysDifference % 365.25;
        const months = Math.floor(remainingDays / (365.25 / 12));
        
        yearsToMaturityInput.value = `${years} years and ${months} months`;
        yearsToMaturityInput.dataset.totalYears = totalYears.toFixed(8);
    }

    // --- Custom Searchable Dropdown Logic ---
    function filterBonds(searchTerm: string) {
        bondOptionsContainer.classList.remove('hidden');
        const term = searchTerm.toLowerCase().trim();
        const filteredBonds = bonds.filter(bond => {
            const nameMatch = bond.name.toLowerCase().includes(term);
            const dateMatch = bond.maturityDate.toLowerCase().includes(term) ||
                              bond.maturityDate.toLowerCase().replace(/-/g, ' ').includes(term);
            const aliasMatch = (bond as any).alias ? (bond as any).alias.toLowerCase().includes(term) : false;
            return nameMatch || dateMatch || aliasMatch;
        });
        renderBondOptions(filteredBonds);
    }

    function renderBondOptions(bondsToRender: any[]) {
        bondOptionsContainer.innerHTML = '';
        if (bondsToRender.length === 0) {
            bondOptionsContainer.innerHTML = `<div class="bond-option text-gray-400">No bonds found</div>`;
            return;
        }

        const ngBonds = bondsToRender.filter(b => !isKenyanBond(b));
        const keBonds = bondsToRender.filter(b => isKenyanBond(b));

        const appendOption = (bond: any) => {
            const originalIndex = bonds.indexOf(bond);
            const option = document.createElement('div');
            option.textContent = bond.name;
            option.classList.add('bond-option');
            option.dataset.index = originalIndex.toString();
            option.addEventListener('click', () => selectBond(originalIndex));
            bondOptionsContainer.appendChild(option);
        };

        if (ngBonds.length > 0) {
            const ngHeader = document.createElement('div');
            ngHeader.className = 'px-3 py-1 bg-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-wider sticky top-0 border-b border-gray-200 select-none flex items-center justify-between z-10';
            ngHeader.innerHTML = `<span>🇳🇬 Nigerian Sovereign Bonds (FGN / Sukuk)</span><span class="text-[10px] text-gray-500 font-normal">Actual/Actual</span>`;
            bondOptionsContainer.appendChild(ngHeader);
            ngBonds.forEach(appendOption);
        }

        if (keBonds.length > 0) {
            const keHeader = document.createElement('div');
            keHeader.className = 'px-3 py-1 bg-emerald-50 text-[11px] font-bold text-emerald-800 uppercase tracking-wider sticky top-0 border-t border-b border-emerald-200 select-none flex items-center justify-between z-10';
            keHeader.innerHTML = `<span>🇰🇪 Kenyan Sovereign Bonds (FXD / IFB)</span><span class="text-[10px] text-emerald-700 font-normal">Actual/364</span>`;
            bondOptionsContainer.appendChild(keHeader);
            keBonds.forEach(appendOption);
        }

        activeOptionIndex = -1;
    }

    function selectBond(index: number) {
        selectedBondIndex = index;
        bondOptionsContainer.classList.add('hidden');
        if (index > -1) {
            bondSearchInput.value = bonds[index].name;
        } else {
            bondSearchInput.value = '';
        }
        backspaceCount = 0;
        updateBondDetails();
    }

    function updateActiveOption(direction: number) {
        const options = bondOptionsContainer.querySelectorAll('.bond-option');
        if (options.length === 0) return;

        if (activeOptionIndex > -1 && options[activeOptionIndex]) {
            options[activeOptionIndex].classList.remove('active');
        }

        activeOptionIndex += direction;

        if (activeOptionIndex >= options.length) {
            activeOptionIndex = 0;
        } else if (activeOptionIndex < 0) {
            activeOptionIndex = options.length - 1;
        }

        const newActiveOption = options[activeOptionIndex] as HTMLElement;
        if (newActiveOption) {
             newActiveOption.classList.add('active');
             newActiveOption.scrollIntoView({ block: 'nearest' });
        }
    }
    
    function updateCurrencyDisplay(currency: string) {
        setCurrencySymbol(currency);
        const faceValueLabel = document.getElementById('faceValueLabel');
        if (faceValueLabel) faceValueLabel.textContent = `Face Value (${currency})`;
        const cleanPriceLabel = document.getElementById('cleanPriceLabel');
        if (cleanPriceLabel) cleanPriceLabel.textContent = `Clean Price Computed (6 d.p. ${currency})`;
        const considerationLabel = document.getElementById('considerationLabel');
        if (considerationLabel) considerationLabel.textContent = `Consideration (Total ${currency})`;
        const fullCleanPriceLabel = document.getElementById('fullCleanPriceLabel');
        if (fullCleanPriceLabel) fullCleanPriceLabel.textContent = `Full Clean Price (15 d.p. ${currency})`;
        const dirtyPriceLabel = document.getElementById('dirtyPriceLabel');
        if (dirtyPriceLabel) dirtyPriceLabel.textContent = `Dirty Price Computed (${currency})`;
    }

    function updateBondDetails() {
        if (selectedBondIndex === -1) {
            setKenyanAnalytics(null);
            setActiveMarket('NG');
            updateCurrencyDisplay('₦');
            couponRateInput.value = '';
            maturityDateInput.value = ''; 
            couponRateInput.placeholder = 'To be Determined';
            maturityDateInput.placeholder = 'To be Determined';
            setYearsToMaturityPendingState('Awaiting Maturity Date');
        } else {
            const bond = bonds[selectedBondIndex];
            const isKenyan = isKenyanBond(bond);
            setActiveMarket(isKenyan ? 'KE' : 'NG');
            updateCurrencyDisplay(isKenyan ? 'KShs' : '₦');
            couponRateInput.value = formatCouponRate(bond.couponRate);
            maturityDateInput.value = bond.maturityDate;
            calculateYearsToMaturityAndDisplay(settlementDateRef.current, bond.maturityDate);
            
            // In Kenya, quoting is strictly Yield-Driven to 4 decimal places
            if (isKenyan && yieldToMaturityInput.value) {
                const parsedY = parseFloat(yieldToMaturityInput.value);
                if (!isNaN(parsedY)) {
                    yieldToMaturityInput.value = parsedY.toFixed(4);
                }
            }

            couponRateInput.readOnly = true;
            maturityDateInput.readOnly = true;
        }
        calculateBondPrice();
    }

    // --- Event Listeners ---
    bondSearchInput.addEventListener('input', () => filterBonds(bondSearchInput.value));
    bondSearchInput.addEventListener('focus', () => {
        backspaceCount = 0;
        filterBonds('');
    });
    
    bondSearchInput.addEventListener('keydown', (e) => {
        const optionsVisible = !bondOptionsContainer.classList.contains('hidden');

        if (e.key === 'Backspace') {
            if (bondSearchInput.value.length > 0) {
                backspaceCount++;
                if (backspaceCount >= 2) {
                    e.preventDefault();
                    bondSearchInput.value = '';
                    filterBonds('');
                    selectBond(-1);
                    backspaceCount = 0;
                    return;
                }
            }
        } else {
            backspaceCount = 0;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!optionsVisible) {
                    filterBonds('');
                }
                updateActiveOption(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (optionsVisible) {
                    updateActiveOption(-1);
                }
                break;
            case 'Enter':
                if (optionsVisible) {
                    e.preventDefault();
                    const activeOption = bondOptionsContainer.querySelector('.bond-option.active') as HTMLElement;
                    if (activeOption) {
                        selectBond(parseInt(activeOption.dataset.index || "-1"));
                    } else {
                        const firstOption = bondOptionsContainer.querySelector('.bond-option') as HTMLElement;
                        if (firstOption && firstOption.dataset.index) {
                            selectBond(parseInt(firstOption.dataset.index));
                        }
                    }
                    bondOptionsContainer.classList.add('hidden');
                } else {
                    e.preventDefault();
                    yieldToMaturityInput.focus();
                }
                break;
            case 'Escape':
                if (optionsVisible) {
                    e.preventDefault();
                    bondOptionsContainer.classList.add('hidden');
                }
                break;
            default:
                return;
        }
    });

    settlementDateInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const parsed = parseSettlementDateInput(settlementDateInput.value);
            if (parsed) {
                handleDateSelection(parsed);
            }
            bondCleanPriceInput.focus();
        }
    });

    settlementDateInput.addEventListener('blur', function() {
        const parsed = parseSettlementDateInput(settlementDateInput.value);
        if (parsed) {
            handleDateSelection(parsed);
        } else {
            settlementDateInput.value = settlementDateRef.current.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    });

    calendarToggle?.addEventListener('click', toggleCalendar); 
    
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('calculateBond', calculateBondPrice);
    
    faceValueInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            bondSearchInput.focus();
        }
    });
    faceValueInput.addEventListener('input', calculateBondPrice);
    faceValueInput.addEventListener('blur', (event: any) => {
        const rawValue = parseFinancialInput(event.target.value);
        if (!isNaN(rawValue)) {
            event.target.value = formatNaira(rawValue);
        }
    });

    yieldToMaturityInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            settlementDateInput.focus();
        }
    });
    yieldToMaturityInput.addEventListener('input', calculateBondPrice);
    yieldToMaturityInput.addEventListener('blur', (event: any) => {
        const value = event.target.value;
        if (value !== '') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                // If a Kenyan bond is selected, maintain 4 decimal places
                const isKenyan = selectedBondIndex !== -1 && isKenyanBond(bonds[selectedBondIndex]);
                event.target.value = isKenyan ? num.toFixed(4) : num.toFixed(2);
            }
        }
    });

    bondCleanPriceInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            considerationCalculatedInput.focus();
        }
    });
    bondCleanPriceInput.addEventListener('input', calculateFromCleanPrice);
    bondCleanPriceInput.addEventListener('blur', (event: any) => {
        const value = parseNaira(event.target.value);
         if (!isNaN(value)) {
            const dps = getDecimalPlaces(event.target.value);
            event.target.value = formatNairaWithDp(value, Math.max(2, dps));
        }
    });

    bondDirtyPriceInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            considerationCalculatedInput.focus();
        }
    });
    bondDirtyPriceInput.addEventListener('input', calculateFromDirtyPrice);
    bondDirtyPriceInput.addEventListener('blur', (event: any) => {
        const value = parseNaira(event.target.value);
        if (!isNaN(value)) {
            const selectedBond = selectedBondIndex !== -1 ? bonds[selectedBondIndex] : null;
            if (selectedBond && isKenyanBond(selectedBond) && kenyanPricingModeRef.current === 'quoted') {
                event.target.value = value.toFixed(4);
            } else {
                event.target.value = formatDirtyPrice(value);
            }
        }
    });

    considerationCalculatedInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            faceValueInput.focus();
        }
    });
    considerationCalculatedInput.addEventListener('input', calculateFromConsideration);
    considerationCalculatedInput.addEventListener('blur', (event: any) => {
        const value = parseNaira(event.target.value);
         if (!isNaN(value)) {
            event.target.value = formatNaira(value);
        }
    });
    
    couponRateInput.addEventListener('input', calculateBondPrice);
    couponRateInput.addEventListener('blur', (event: any) => {
        const value = parseCouponRate(event.target.value);
        if (!isNaN(value) && event.target.value !== '') {
            event.target.value = formatCouponRate(value);
        }
    });
    
    maturityDateInput.addEventListener('input', () => {
         if (selectedBondIndex === -1) {
             calculateYearsToMaturityAndDisplay(settlementDateRef.current, maturityDateInput.value);
             calculateBondPrice();
         }
    });

    // 1. Set default settlement date
    handleDateSelection(settlementDateRef.current, true); 

    // 2. Load with no default bond selected
    selectBond(-1);
    
    // 3. Set placeholders for calculated values on first load
    setPendingState();
    yearsToMaturityInput.value = 'Select a Bond';

    return () => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('calculateBond', calculateBondPrice);
        calendarToggle?.removeEventListener('click', toggleCalendar);
        settlementDateInput?.removeEventListener('click', toggleCalendar);
    };

  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen antialiased p-4 py-8 bg-gray-50" style={{ fontFamily: "'Neue Frutiger', 'Frutiger', 'Inter', sans-serif" }}>
      {/* Main Container */}
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-xl pt-3 sm:pt-4 px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">
        
        {/* Input Form */}
        <div className="space-y-4">
            {/* Face Value */}
            <div>
                <label id="faceValueLabel" htmlFor="faceValue" className="block text-sm font-semibold text-gray-700">Face Value ({currencySymbol})</label>
                <input type="text" id="faceValue" placeholder="e.g. 1b, or 1e9 or 1,000,000,000" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* Select Bond (Custom Searchable Dropdown) */}
            <div>
                <label htmlFor="bondSearchInput" className="block text-sm font-semibold text-gray-700">Select Bond</label>
                <div className="relative" id="customBondSelect">
                    <input type="text" id="bondSearchInput" placeholder="Select or Type Bond" className="text-sm sm:text-base mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
                    <div id="bondOptionsContainer" className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-60 overflow-y-auto">
                        {/* Bond options will be dynamically inserted here */}
                    </div>
                </div>
            </div>

            {/* KENYAN MARKET SPECIFICATION BADGE & ANALYTICS BAR (Active only for Kenyan Bonds) */}
            {kenyanAnalytics && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5 transition-all duration-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-950">
                            <span>🇰🇪</span>
                            <span>CBK / NSE Kenyan Engine</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Actual/364</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Yield-Quoted (4 d.p.)</span>
                            {kenyanAnalytics.isIFB ? (
                                <>
                                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">Tax-Exempt (0% WHT)</span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">Sinking Fund (Amortizing)</span>
                                </>
                            ) : (
                                <>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{kenyanAnalytics.whtRate * 100}% WHT</span>
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">Bullet Redemption</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Pricing Convention Mode Switcher */}
                    <div className="flex items-center justify-between bg-white rounded-md p-1.5 border border-emerald-200 text-xs shadow-xs">
                        <span className="text-gray-700 font-semibold text-[11px] px-1">Pricing Mode:</span>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => handlePricingModeChange('quoted')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                    kenyanPricingMode === 'quoted'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Agreed 4 d.p. Dirty Price anchor used on NSE and in standard trade slips"
                            >
                                NSE / Excel Quoted (4 d.p.)
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePricingModeChange('unrounded')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                    kenyanPricingMode === 'unrounded'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Continuous unrounded floating-point discounting"
                            >
                                Theoretical Full Float
                            </button>
                        </div>
                    </div>

                    {/* Primary Quote Match Card */}
                    {kenyanPricingMode === 'quoted' ? (
                        <div className="rounded-md border border-emerald-300 bg-white p-2.5 text-xs text-emerald-950 space-y-1 shadow-xs">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-bold flex items-center gap-1 text-emerald-900 text-xs">
                                    <span className="text-emerald-600 font-extrabold">✓</span> Matched Excel & NSE Trade Slip Standard
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Active Quote Anchor
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-100 text-[11px]">
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Agreed Dirty Price:</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.dirtyPrice4dp.toFixed(4)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Clean Price (6 d.p.):</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.cleanPriceFrom4dp.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Accrued Interest:</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.accruedInterestPer100.toFixed(6)}</span>
                                </div>
                            </div>
                            <div className="pt-1 border-t border-emerald-100 text-[10px] text-gray-600 flex justify-between items-center flex-wrap gap-1">
                                <span>Total Consideration: <strong className="text-gray-900">KShs {kenyanAnalytics.consideration4dp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                <span className="text-emerald-700">107.2922 Dirty – 2.778214 AI = 104.513986 Clean</span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border border-blue-200 bg-blue-50/70 p-2.5 text-xs text-blue-950 space-y-1 shadow-xs">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-bold flex items-center gap-1 text-blue-900 text-xs">
                                    <span>ℹ️</span> Theoretical Unrounded Float Mode
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                    Continuous PV
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-200/60 text-[11px]">
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Raw Dirty:</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.dirtyPriceRaw.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Raw Clean:</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.cleanPrice6dp.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[10px]">Accrued Interest:</span>
                                    <span className="font-mono font-bold text-gray-900">{kenyanAnalytics.accruedInterestPer100.toFixed(6)}</span>
                                </div>
                            </div>
                            <div className="pt-1 border-t border-blue-200/60 text-[10px] text-gray-600 flex justify-between items-center flex-wrap gap-1">
                                <span>Total Consideration: <strong className="text-gray-900">KShs {kenyanAnalytics.considerationUnrounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                                <span className="text-blue-700 font-medium">Difference vs 4 d.p. quote: KShs {Math.abs(kenyanAnalytics.considerationDiff).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Kenyan Analytics Micro-Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-emerald-900 border-t border-emerald-200/60">
                        <div>
                            <span className="text-gray-500 block text-[11px]">Accrued Interest (per KES 100)</span>
                            <span className="font-semibold text-emerald-950">KES {kenyanAnalytics.accruedInterestPer100.toFixed(4)}</span>
                            <span className="text-[10px] text-gray-500 block">({kenyanAnalytics.daysSinceLcc} / 182 days held)</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-[11px]">Outstanding Par & Life</span>
                            <span className="font-semibold text-emerald-950">{kenyanAnalytics.outstandingParPercent}% Pool</span>
                            <span className="text-[10px] text-gray-500 block">WAL: {kenyanAnalytics.walYears.toFixed(2)} yrs</span>
                        </div>
                    </div>

                    {/* Tax & Net Yield Metrics */}
                    <div className="pt-1.5 border-t border-emerald-200/60 text-xs flex flex-wrap items-center justify-between gap-1">
                        <div>
                            <span className="text-gray-600">Net Yield (after tax): </span>
                            <span className="font-bold text-emerald-950">{(kenyanAnalytics.netYtm * 100).toFixed(4)}%</span>
                            {kenyanAnalytics.isIFB && kenyanAnalytics.taxEquivalentYield && (
                                <span className="text-[11px] text-emerald-700 block">
                                    Gross-Equivalent vs 10% FXD: <span className="font-semibold">{(kenyanAnalytics.taxEquivalentYield * 100).toFixed(4)}%</span>
                                </span>
                            )}
                            {!kenyanAnalytics.isIFB && (
                                <span className="text-[11px] text-amber-700 block">
                                    Subject to {kenyanAnalytics.whtRate * 100}% Withholding Tax on coupons
                                </span>
                            )}
                        </div>
                        
                        {kenyanAnalytics.isIFB && (
                            <button
                                type="button"
                                onClick={() => setShowSchedule(!showSchedule)}
                                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                            >
                                {showSchedule ? 'Hide IFB Amortization' : 'View IFB Amortization'}
                            </button>
                        )}
                    </div>

                    {/* Collapsible IFB Amortization Table */}
                    {kenyanAnalytics.isIFB && showSchedule && (
                        <div className="mt-2 pt-2 border-t border-emerald-200 max-h-48 overflow-y-auto text-[11px]">
                            <div className="font-semibold text-emerald-900 mb-1 flex items-center justify-between">
                                <span>IFB Sinking Fund Cash Flows:</span>
                                <span>50% Mid-term | 50% Maturity</span>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-emerald-200 text-gray-600">
                                        <th className="py-1">Date</th>
                                        <th className="py-1">Coupon</th>
                                        <th className="py-1">Principal</th>
                                        <th className="py-1 text-right">Remaining Par</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kenyanAnalytics.cashFlowSchedule.map((cf, idx) => (
                                        <tr key={idx} className="border-b border-emerald-100 hover:bg-emerald-100/50">
                                             <td className="py-0.5">{cf.dateStr}</td>
                                            <td className="py-0.5">{cf.couponAmount.toFixed(2)}</td>
                                            <td className="py-0.5 font-semibold text-emerald-800">{cf.principalAmount > 0 ? `${cf.principalAmount.toFixed(0)}` : '-'}</td>
                                            <td className="py-0.5 text-right font-mono">{cf.remainingPrincipal}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}



            {/* Yield to Maturity */}
            <div>
                <label htmlFor="yieldToMaturity" className="block text-sm font-semibold text-gray-700">
                    Yield to Maturity (%) {kenyanAnalytics && <span className="text-xs font-normal text-emerald-700 font-sans ml-1">(NSE Agreed Quote Anchor)</span>}
                </label>
                <input 
                    type="number" 
                    step={kenyanAnalytics ? "0.0001" : "0.01"} 
                    id="yieldToMaturity" 
                    placeholder={kenyanAnalytics ? "e.g. 12.9650" : "e.g. 15.80"} 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" 
                />
            </div>

            {/* Settlement Date */}
            <div className="relative">
                <div className="flex items-center justify-between">
                    <label htmlFor="settlementDate" className="block text-sm font-semibold text-gray-700">Settlement Date</label>
                    <span className="text-[11px] text-gray-500">Type or pick from calendar</span>
                </div>
                <div className="relative">
                    <input 
                        ref={settlementDateInputRef} 
                        type="text" 
                        id="settlementDate" 
                        placeholder="e.g. 3 Nov 2026 or 2026-11-03" 
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" 
                    />
                    {/* Calendar Toggle Button */}
                    <button ref={calendarToggleRef} type="button" id="calendarToggle" aria-label="Toggle Calendar" className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none group cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-blue-600 pointer-events-none">
                            <path d="M8 2v4"/>
                            <path d="M16 2v4"/>
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M3 10h18"/>
                        </svg>
                    </button>
                </div>

                {/* Quick Date Shortcuts (Factors in Kenyan & Nigerian Public Holidays & Weekends) */}
                <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between text-[11px] gap-1">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                            <span>Quick Dates:</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                activeMarket === 'KE'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}>
                                <span>{quickDates.flag}</span>
                                <span>{activeMarket === 'KE' ? 'Kenya Banking Calendar (CBK / NSE)' : 'Nigeria Banking Calendar (FMDQ)'}</span>
                            </span>
                        </div>
                        {quickDates.todayStatus && (
                            <span className="text-[10px] text-amber-800 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Today: {quickDates.todayStatus}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                            type="button"
                            onClick={() => handleDateSelection(new Date())}
                            title={`Select Today (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`}
                            className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition cursor-pointer shadow-2xs"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(quickDates.t1.date)}
                            title={`T+1 Settlement: ${quickDates.t1.dateStr}${quickDates.t1.skippedDetails.length > 0 ? ` (Rolled over: ${quickDates.t1.skippedDetails.join(', ')})` : ''}`}
                            className={`px-2.5 py-1 rounded border font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                                activeMarket === 'KE'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                            }`}
                        >
                            <span>T+1</span>
                            <span className="text-[10px] font-normal opacity-90">({quickDates.t1.label})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(quickDates.t2.date)}
                            title={`T+2 Settlement: ${quickDates.t2.dateStr}${quickDates.t2.skippedDetails.length > 0 ? ` (Rolled over: ${quickDates.t2.skippedDetails.join(', ')})` : ''}`}
                            className={`px-2.5 py-1 rounded border font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                                activeMarket === 'KE'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                            }`}
                        >
                            <span>T+2</span>
                            <span className="text-[10px] font-normal opacity-90">({quickDates.t2.label})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(new Date(2026, 10, 3))}
                            title="Settlement benchmark for Kenyan 2041 IFB and verification against Excel model"
                            className="px-2 py-1 rounded border border-emerald-300/80 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer text-[10px] font-semibold ml-auto"
                        >
                            3 Nov 2026 (Benchmark)
                        </button>
                    </div>

                    {(quickDates.t1.skippedDetails.length > 0 || quickDates.t2.skippedDetails.length > 0) && (
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 pt-0.5">
                            <span className="text-amber-600">ℹ️</span>
                            <span>
                                Holidays/weekends skipped: {[...new Set([...quickDates.t1.skippedDetails, ...quickDates.t2.skippedDetails])].join('; ')}
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Calendar Popover */}
                <div ref={calendarPopoverRef} id="calendar-popover" className="absolute z-50 p-4 bg-white border border-gray-200 rounded-lg shadow-2xl w-72 md:w-84 right-0 sm:right-4 top-16" style={{ display: isCalendarOpen ? 'block' : 'none' }}>
                    {/* Market Header */}
                    <div className="mb-2 pb-1.5 border-b border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <span>{quickDates.flag}</span>
                            <span>{activeMarket === 'KE' ? 'Kenya Market Calendar' : 'Nigeria Market Calendar'}</span>
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-medium">
                            Amber = Holiday
                        </span>
                    </div>

                    <div id="calendar-header" className="flex justify-between items-center mb-3 gap-1">
                        <button 
                            type="button" 
                            id="prevMonth" 
                            className="p-1 rounded-full hover:bg-gray-100 transition" 
                            aria-label="Previous Month"
                            onClick={(e) => {
                                e.stopPropagation();
                                changeMonth(-1);
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        
                        <div className="flex items-center gap-1">
                            <select
                                value={viewDate.getMonth()}
                                onChange={(e) => {
                                    const newM = parseInt(e.target.value, 10);
                                    setViewDate(new Date(viewDate.getFullYear(), newM, 1));
                                }}
                                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-900 cursor-pointer"
                            >
                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                                    <option key={m} value={idx}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={viewDate.getFullYear()}
                                onChange={(e) => {
                                    const newY = parseInt(e.target.value, 10);
                                    setViewDate(new Date(newY, viewDate.getMonth(), 1));
                                }}
                                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-900 cursor-pointer"
                            >
                                {Array.from({ length: 41 }, (_, i) => 2020 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            type="button" 
                            id="nextMonth" 
                            className="p-1 rounded-full hover:bg-gray-100 transition" 
                            aria-label="Next Month"
                            onClick={(e) => {
                                e.stopPropagation();
                                changeMonth(1);
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                    <div id="calendar-days" className="calendar-grid grid gap-1">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <span key={day} className="day-title">{day}</span>
                        ))}
                        
                        {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                            <span key={`empty-${i}`}></span>
                        ))}
                        
                        {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                            const day = i + 1;
                            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                            date.setHours(0, 0, 0, 0);
                            const isSelected = date.getTime() === selectedSettlementDate.getTime();
                            const holidayInfo = getHolidayInfo(date, activeMarket);
                            const isWknd = isWeekend(date);
                            
                            let dayClasses = "calendar-day day-current-month";
                            if (isSelected) {
                                dayClasses += " day-selected";
                            } else if (holidayInfo.isHoliday) {
                                dayClasses += " bg-amber-100 text-amber-900 border border-amber-300 font-semibold";
                            } else if (isWknd) {
                                dayClasses += " text-gray-400 font-normal";
                            }
                            
                            return (
                                <span 
                                    key={day} 
                                    title={holidayInfo.isHoliday ? `${holidayInfo.name} (${activeMarket === 'KE' ? 'Kenya' : 'Nigeria'} Public Holiday)` : isWknd ? 'Weekend' : undefined}
                                    className={dayClasses}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDateSelection(date);
                                    }}
                                >
                                    {day}
                                </span>
                            );
                        })}
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                            type="button"
                            onClick={() => handleDateSelection(new Date())}
                            className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer font-medium"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(quickDates.t1.date)}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                activeMarket === 'KE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                        >
                            T+1 ({quickDates.t1.label})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(quickDates.t2.date)}
                            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                activeMarket === 'KE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                        >
                            T+2 ({quickDates.t2.label})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateSelection(new Date(2026, 10, 3))}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold cursor-pointer text-[10px] ml-auto"
                        >
                            3 Nov 2026
                        </button>
                    </div>
                </div>
            </div>

            {/* 1. BOND CLEAN PRICE CALCULATED */}
            <div>
                <label id="cleanPriceLabel" htmlFor="calculatedBondPriceInput" className="block text-sm font-semibold text-gray-700">Clean Price Computed (6 d.p. {currencySymbol})</label>
                <input type="text" id="calculatedBondPriceInput" defaultValue="0.000000" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* 3. CONSIDERATION CALCULATED */}
            <div>
                <label id="considerationLabel" htmlFor="considerationCalculatedInput" className="block text-sm font-semibold text-gray-700">Consideration (Total {currencySymbol})</label>
                <input type="text" id="considerationCalculatedInput" defaultValue="0.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* 4. FULL CLEAN PRICE */}
            <div>
                <label id="fullCleanPriceLabel" htmlFor="fullCleanPriceInput" className="block text-sm font-semibold text-gray-700">Full Clean Price (15 d.p. {currencySymbol})</label>
                <input type="text" id="fullCleanPriceInput" defaultValue="0.000000000000000" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm font-mono text-sm" readOnly />
            </div>

            {/* 2. BOND DIRTY PRICE CALCULATED (EDITABLE & BIDIRECTIONAL) */}
            <div>
                <div className="flex items-center justify-between">
                    <label id="dirtyPriceLabel" htmlFor="bondDirtyPriceInput" className="block text-sm font-semibold text-gray-700">Dirty Price Computed ({currencySymbol})</label>
                    <span className="text-[11px] text-emerald-700 font-medium">Editable (Bidirectional)</span>
                </div>
                <input type="text" id="bondDirtyPriceInput" defaultValue="0.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* Coupon Rate */}
            <div>
                <label htmlFor="couponRate" className="block text-sm font-semibold text-gray-700">Coupon Rate (%)</label>
                <input type="text" id="couponRate" placeholder="To be Determined" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* Maturity Date */}
            <div>
                <label htmlFor="maturityDate" className="block text-sm font-semibold text-gray-700">Maturity Date</label>
                <input type="text" id="maturityDate" placeholder="To be Determined" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>
             
            {/* Years to Maturity */}
            <div>
                <label htmlFor="yearsToMaturity" className="block text-sm font-semibold text-gray-700">Time to Maturity</label>
                <input type="text" id="yearsToMaturity" defaultValue="" data-total-years="" className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" readOnly />
            </div>

        </div>
        
      </div>
    </div>
  );
}
