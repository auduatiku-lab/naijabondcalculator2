import { useEffect, useState, useRef } from 'react';

export default function App() {
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
    setSelectedSettlementDate(newDate);
    settlementDateRef.current = newDate; // Update ref immediately to avoid stale data in calculations
    const settlementDateInput = settlementDateInputRef.current;
    if (settlementDateInput) {
        settlementDateInput.value = newDate.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
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
    console.log('Bond Calculator useEffect is running');
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

    const bonds = [
        { name: "15.74% FGN SUKUK BOND DEC 2025", couponRate: 15.74, maturityDate: "28-DEC-2025" },
        { name: "12.50% FGN BOND JAN 2026", couponRate: 12.50, maturityDate: "22-JAN-2026" },
        { name: "21.00% FGN BOND MAR 2026", couponRate: 21.00, maturityDate: "20-MAR-2026" },
        { name: "14.50% FGN BOND JUN 2026", couponRate: 14.50, maturityDate: "13-JUN-2026" },
        { name: "16.2884% FGN OLD BOND MAR 2027", couponRate: 16.2884, maturityDate: "17-MAR-2027" },
        { name: "19.9400% FGN NEW BOND MAR 2027", couponRate: 19.94, maturityDate: "20-MAR-2027" },
        { name: "11.20% FGN SUKUK BOND JUN 2027", couponRate: 11.20, maturityDate: "16-JUN-2027" },
        { name: "13.98% FGN BOND FEB 2028", couponRate: 13.98, maturityDate: "23-FEB-2028" },
        { name: "21.00% FGN BOND MAR 2028", couponRate: 21.00, maturityDate: "20-MAR-2028" },
        { name: "15.00% FGN BOND NOV 2028", couponRate: 15.00, maturityDate: "28-NOV-2028" },
        { name: "19.30% FGN NEW BOND APR 2029", couponRate: 19.30, maturityDate: "17-APR-2029" },
        { name: "14.55% FGN OLD BOND APR 2029", couponRate: 14.55, maturityDate: "26-APR-2029" },
        { name: "12.49% FGN BOND MAY 2029", couponRate: 12.49, maturityDate: "22-MAY-2029" },
        { name: "8.50% FGN BOND NOV 2029", couponRate: 8.50, maturityDate: "20-NOV-2029" },
        { name: "9.75% FGN BOND SEP 2029", couponRate: 9.75, maturityDate: "06-SEP-2029" },
        { name: "10.00% FGN BOND JUL 2030", couponRate: 10.00, maturityDate: "23-JUL-2030" },
        { name: "17.945% FGN BOND AUG 2030", couponRate: 17.945, maturityDate: "27-AUG-2030" },
        { name: "18.5000% FGN BOND FEB 2031", couponRate: 18.50, maturityDate: "21-FEB-2031" },
        { name: "13.00% FGN SUKUK BOND DEC 2031", couponRate: 13.00, maturityDate: "29-DEC-2031" },
        { name: "12.5000% FGN BOND APR 2032", couponRate: 12.50, maturityDate: "27-APR-2032" },
        { name: "19.75% FGN SUKUK BOND MAY 2032", couponRate: 19.75, maturityDate: "23-MAY-2032" },
        { name: "17.95% FGN BOND JUN 2032", couponRate: 17.95, maturityDate: "25-JUN-2032" },
        { name: "15.64% FGN SUKUK BOND DEC 2032", couponRate: 15.64, maturityDate: "02-DEC-2032" },
        { name: "19.8900% FGN BOND MAY 2033", couponRate: 19.89, maturityDate: "15-MAY-2033" },
        { name: "14.7000% FGN BOND JUN 2033", couponRate: 14.70, maturityDate: "21-JUN-2033" },
        { name: "15.7500% FGN SUKUK BOND OCT 2033", couponRate: 15.75, maturityDate: "13-OCT-2033" },
        { name: "19.0000% FGN BOND FEB 2034", couponRate: 19.00, maturityDate: "21-FEB-2034" },
        { name: "12.1493% FGN BOND JUL 2034", couponRate: 12.1493, maturityDate: "18-JUL-2034" },
        { name: "22.6000% FGN BOND JAN 2035", couponRate: 22.60, maturityDate: "29-JAN-2035" },
        { name: "12.5000% FGN BOND MAR 2035", couponRate: 12.50, maturityDate: "27-MAR-2035" },
        { name: "12.4000% FGN BOND MAR 2036", couponRate: 12.40, maturityDate: "18-MAR-2036" },
        { name: "16.2499% FGN BOND APR 2037", couponRate: 16.2499, maturityDate: "18-APR-2037" },
        { name: "15.4500% FGN BOND JUN 2038", couponRate: 15.45, maturityDate: "21-JUN-2038" },
        { name: "13.0000% FGN BOND JAN 2042", couponRate: 13.00, maturityDate: "21-JAN-2042" },
        { name: "9.8000% FGN BOND JUL 2045", couponRate: 9.80, maturityDate: "24-JUL-2045" },
        { name: "14.8000% FGN BOND APR 2049", couponRate: 14.80, maturityDate: "26-APR-2049" },
        { name: "12.9800% FGN BOND MAR 2050", couponRate: 12.98, maturityDate: "27-MAR-2050" },
        { name: "15.7000% FGN BOND JUN 2053", couponRate: 15.70, maturityDate: "21-JUN-2053" }
    ].filter(bond => parseMaturityDate(bond.maturityDate).getTime() >= today.getTime());
    
    let isUpdating = false; // Flag to prevent calculation loops
    let selectedBondIndex = -1; // New state for custom dropdown
    let activeOptionIndex = -1; // For keyboard navigation


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
    
    const outputInputs = [bondCleanPriceInput, bondDirtyPriceInput, considerationCalculatedInput];

    const calendarToggle = calendarToggleRef.current;
    const calendarPopover = calendarPopoverRef.current;
    const settlementDateInput = settlementDateInputRef.current;

    if (!calendarToggle || !calendarPopover || !settlementDateInput) {
        console.error("Required calendar elements not found");
        return;
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
            maximumFractionDigits: 2 // Standard currency formatting
        }).format(number);
    }
    function formatDirtyPrice(value: any) {
        const number = parseFloat(value);
        if (isNaN(number)) return '0.00';
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
        const cleanStr = String(formattedStr).replace(/,/g, '');
        return parseFloat(cleanStr);
    }

    function parseFinancialInput(valueStr: string) {
        if (typeof valueStr !== 'string' || valueStr.trim() === '') {
            return 0;
        }
        let cleanStr = valueStr.toLowerCase().trim().replace(/,/g, '');
        let multiplier = 1;

        if (cleanStr.endsWith('b')) {
            multiplier = 1e9;
            cleanStr = cleanStr.slice(0, -1);
        } else if (cleanStr.endsWith('m')) {
            multiplier = 1e6;
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

    /**
     * Finds LCC (Last Coupon Date) and NCC (Next Coupon Date) using standard rolling logic.
     * Aligned with ICMA standards for semi-annual FGN Bonds.
     */
    function findCouponDates(settlement: Date, maturity: Date, frequency: number) {
        let next = new Date(maturity);
        let last = new Date(maturity);
        
        // Roll back from maturity until we find the coupon date ON or BEFORE settlement
        while (next.getTime() > settlement.getTime()) {
            last = new Date(next);
            const m = next.getMonth();
            const y = next.getFullYear();
            const step = 12 / frequency;
            let targetM = m - step;
            let targetY = y;
            if (targetM < 0) { targetM += 12; targetY -= 1; }
            next = new Date(targetY, targetM, maturity.getDate());
            
            // Snap to maturity day, handling month-end roll-over
            if (next.getDate() !== maturity.getDate()) {
                next = new Date(targetY, targetM + 1, 0);
            }
            next.setHours(0, 0, 0, 0);
        }
        
        return { lcc: next, ncc: last };
    }
    
    // --- Pricing Logic Helper (Yield -> Price) ---
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

    // --- Main Forward Calculation (Yield -> Price) ---
    function calculate_user_bond_price(settlement: Date, maturity: Date, C: number, Y: number, F: number) {
        if (settlement.getTime() >= maturity.getTime()) {
            return { cleanPrice: REDEMPTION_VALUE_PER_100, dirtyPrice: REDEMPTION_VALUE_PER_100, accruedInterest: 0 };
        }

        const dirty_price = getInitialDirtyPrice(settlement, maturity, C, Y, F);
        
        const { lcc, ncc } = findCouponDates(settlement, maturity, F);
        
        // Day count for Accrued Interest (Actual/Actual ICMA)
        const A = getDayDifference(lcc, settlement);
        const E = getDayDifference(lcc, ncc);
        
        const redemption = REDEMPTION_VALUE_PER_100;
        const Coup = (redemption * C) / F;
        
        // AI = (Coupon / Frequency) * (Days since LCC / Days in Period)
        // Bloomberg typically uses high precision for AI, often 8 or 10 decimal places.
        const AI_raw = (E > 0) ? Coup * (A / E) : 0;
        const AI = Math.round(AI_raw * 1e12) / 1e12;

        // For the Consideration (Settlement Amount), we use the high-precision dirty price
        // to ensure exact alignment with Bloomberg's settlement amount for large face values.
        const dirty_price_for_consideration = dirty_price;
        
        const clean_price_raw = dirty_price_for_consideration - AI;
        
        // Quoted Clean Price is rounded to 2 decimal places for display
        const clean_price = Math.round(clean_price_raw * 100) / 100;
        
        return {
            cleanPrice: Math.max(0, clean_price),
            dirtyPrice: Math.max(0, dirty_price_for_consideration),
            accruedInterest: Math.max(0, AI),
            debug: { A, E, AI, clean_price_raw, dirty_price_raw: dirty_price }
        };
    }
    
    // --- Main Reverse Calculation (Price -> Yield) ---
    function calculateYieldFromPrice(targetCleanPrice: number, settlement: Date, maturity: Date, C: number, F: number) {
        const { lcc, ncc } = findCouponDates(settlement, maturity, F);
        const E = getDayDifference(lcc, ncc);
        const A = getDayDifference(lcc, settlement);
        const redemption = REDEMPTION_VALUE_PER_100;
        const Coup = (redemption * C) / F;
        const AI = (E > 0) ? Coup * (A / E) : 0;

        const targetDirtyPrice = targetCleanPrice + AI;

        let lowYield = 0.0;
        let highYield = 2.0; // 200% yield
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

    // --- CORE & WRAPPER CALCULATION FUNCTIONS ---

    /**
     * Core forward calculation logic. Reads inputs, calculates all values, and updates the UI.
     * This function is called by the event handler wrappers.
     */
    function _calculateAndDisplayBondPrice() {
        const faceValue = parseFinancialInput(faceValueInput.value); 
        const couponRate = parseCouponRate(couponRateInput.value) / 100;
        const yieldToMaturity = parseFloat(yieldToMaturityInput.value) / 100;
        const maturityDateStr = maturityDateInput.value;
        const maturity = parseMaturityDate(maturityDateStr);
        
        // Use the ref to get the latest settlement date, avoiding stale closure issues
        const settlementDate = new Date(settlementDateRef.current);
        settlementDate.setHours(0, 0, 0, 0);

        if (isNaN(faceValue) || isNaN(couponRate) || isNaN(yieldToMaturity) ||
            faceValue <= 0 || couponRate < 0 || yieldToMaturity < 0 || isNaN(maturity.getTime())) {
            setPendingState();
            return;
        }

        const { cleanPrice, dirtyPrice, accruedInterest, debug } = calculate_user_bond_price(
            settlementDate, 
            maturity, 
            couponRate, 
            yieldToMaturity, 
            COUPON_FREQUENCY
        );

        // Bloomberg calculates the total consideration by summing the rounded Principal and rounded Accrued Interest amounts.
        // 1. Principal Amount = Face Value * (Clean Price / 100), rounded to 2 decimal places.
        const principalAmount = Math.round(faceValue * debug.clean_price_raw) / 100;
        // 2. Accrued Interest Amount = Face Value * (Accrued Interest / 100), rounded to 2 decimal places.
        const aiAmount = Math.round(faceValue * accruedInterest) / 100;
        // 3. Total Consideration = Principal Amount + Accrued Interest Amount.
        const consideration = principalAmount + aiAmount;
        
        // Detailed logging for the user to compare with Bloomberg's "GP" or "YA" screens
        console.log('--- BOND CALCULATION DEBUG ---');
        console.log('Settlement Date:', settlementDate.toDateString());
        console.log('Maturity Date:', maturity.toDateString());
        console.log('Last Coupon Date (LCC):', findCouponDates(settlementDate, maturity, COUPON_FREQUENCY).lcc.toDateString());
        console.log('Next Coupon Date (NCC):', findCouponDates(settlementDate, maturity, COUPON_FREQUENCY).ncc.toDateString());
        console.log('Days since LCC (A):', debug.A);
        console.log('Days in Period (E):', debug.E);
        console.log('Accrued Interest:', debug.AI.toFixed(8));
        console.log('Clean Price (Raw):', debug.clean_price_raw.toFixed(8));
        console.log('Clean Price (2dp):', cleanPrice);
        console.log('Dirty Price (Calc):', dirtyPrice.toFixed(8));
        console.log('Consideration:', consideration.toFixed(2));
        console.log('------------------------------');
        console.log('Face Value:', faceValue);
        console.log('Coupon Rate:', couponRate * 100 + '%');
        console.log('Yield to Maturity:', yieldToMaturity * 100 + '%');
        
        const { lcc, ncc } = findCouponDates(settlementDate, maturity, COUPON_FREQUENCY);
        const A_days = Math.round((settlementDate.getTime() - lcc.getTime()) / MS_PER_DAY);
        const E_days = Math.round((ncc.getTime() - lcc.getTime()) / MS_PER_DAY);
        
        console.log('Last Coupon (LCC):', lcc.toDateString());
        console.log('Next Coupon (NCC):', ncc.toDateString());
        console.log('Days since LCC (A):', A_days);
        console.log('Days in Period (E):', E_days);
        console.log('Accrued Interest (AI):', accruedInterest.toFixed(10));
        console.log('Clean Price (Rounded):', cleanPrice.toFixed(2));
        console.log('Dirty Price (Used for Consideration):', dirtyPrice.toFixed(10));
        console.log('Final Consideration:', consideration.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        console.log('------------------------------');

        removePendingState(cleanPrice, dirtyPrice, consideration);
    }

    /**
     * Event handler for Yield input. Wraps the core logic with a flag to prevent loops.
     */
    function calculateBondPrice() {
        if (isUpdating) return;
        isUpdating = true;
        _calculateAndDisplayBondPrice();
        isUpdating = false;
    }

    /**
     * Event handler for Clean Price input. Handles reverse calculation.
     */
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

        const calculatedYield = calculateYieldFromPrice(cleanPrice, settlementDate, maturity, couponRate, COUPON_FREQUENCY);
        yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
        
        // After finding the yield, call the core forward calculation to update all fields
        _calculateAndDisplayBondPrice();
        
        isUpdating = false;
    }

    /**
     * Event handler for Consideration input. Handles reverse calculation.
     */
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

        // Calculate target dirty price per 100 FV
        const targetDirtyPrice = (consideration / faceValue) * 100;

        // We need Accrued Interest to find the clean price from the dirty price.
        const { lcc, ncc } = findCouponDates(settlementDate, maturity, COUPON_FREQUENCY);
        const A = (settlementDate.getTime() - lcc.getTime()) / MS_PER_DAY;
        const redemption = REDEMPTION_VALUE_PER_100;
        const Coup = (redemption * couponRate) / COUPON_FREQUENCY;
        const E = (ncc.getTime() - lcc.getTime()) / MS_PER_DAY;
        const AI = (E > 0) ? Coup * (A / E) : 0;

        const targetCleanPrice = targetDirtyPrice - AI;
        
        const calculatedYield = calculateYieldFromPrice(targetCleanPrice, settlementDate, maturity, couponRate, COUPON_FREQUENCY);
        yieldToMaturityInput.value = (calculatedYield * 100).toFixed(4);
        
        // After finding the yield, call the core forward calculation to update all fields
        _calculateAndDisplayBondPrice();

        isUpdating = false;
    }
    
    // --- Other Utility Functions (kept for full functionality) ---
    function setPendingState() {
        const PENDING_MESSAGE = 'Will be Computed';
         if (document.activeElement !== bondCleanPriceInput) {
            bondCleanPriceInput.value = PENDING_MESSAGE;
        }
         if (document.activeElement !== considerationCalculatedInput) {
            considerationCalculatedInput.value = PENDING_MESSAGE;
        }
        bondDirtyPriceInput.value = PENDING_MESSAGE;
        

        [bondDirtyPriceInput].forEach(input => {
            input.classList.add('text-gray-400', 'font-normal'); 
            input.classList.remove('text-gray-900');
        });
    }
    function removePendingState(cleanPrice: number, dirtyPrice: number, consideration: number) {
         // Only update the clean price input if the user is not currently editing it.
        if (document.activeElement !== bondCleanPriceInput) {
            bondCleanPriceInput.value = formatNaira(cleanPrice);
        }
        if (document.activeElement !== considerationCalculatedInput) {
            considerationCalculatedInput.value = formatNaira(consideration);
        }
        bondDirtyPriceInput.value = formatDirtyPrice(dirtyPrice);

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
        const filteredBonds = bonds.filter(bond => 
            bond.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderBondOptions(filteredBonds);
    }
    function renderBondOptions(bondsToRender: any[]) {
        bondOptionsContainer.innerHTML = '';
        if (bondsToRender.length === 0) {
            bondOptionsContainer.innerHTML = `<div class="bond-option text-gray-400">No bonds found</div>`;
            return;
        }
        bondsToRender.forEach(bond => {
            const originalIndex = bonds.indexOf(bond);
            const option = document.createElement('div');
            option.textContent = bond.name;
            option.classList.add('bond-option');
            option.dataset.index = originalIndex.toString();
            option.addEventListener('click', () => selectBond(originalIndex));
            bondOptionsContainer.appendChild(option);
        });
        activeOptionIndex = -1; // Reset keyboard nav index
    }
    function selectBond(index: number) {
        selectedBondIndex = index;
        bondOptionsContainer.classList.add('hidden');
        if (index > -1) {
            bondSearchInput.value = bonds[index].name;
        } else {
             bondSearchInput.value = '';
        }
        updateBondDetails();
    }
    function updateActiveOption(direction: number) {
        const options = bondOptionsContainer.querySelectorAll('.bond-option');
        if (options.length === 0) return;

        // Remove previous active state
        if (activeOptionIndex > -1 && options[activeOptionIndex]) {
            options[activeOptionIndex].classList.remove('active');
        }

        activeOptionIndex += direction;

        // Loop around
        if (activeOptionIndex >= options.length) {
            activeOptionIndex = 0;
        } else if (activeOptionIndex < 0) {
            activeOptionIndex = options.length - 1;
        }

        // Add new active state
        const newActiveOption = options[activeOptionIndex] as HTMLElement;
        if (newActiveOption) {
             newActiveOption.classList.add('active');
             newActiveOption.scrollIntoView({ block: 'nearest' });
        }
    }
    
    function updateBondDetails() {
        if (selectedBondIndex === -1) {
            couponRateInput.value = '';
            maturityDateInput.value = ''; 
            couponRateInput.placeholder = 'To be Determined';
            maturityDateInput.placeholder = 'To be Determined';
            setYearsToMaturityPendingState('Awaiting Maturity Date');
        } else {
            const bond = bonds[selectedBondIndex];
            couponRateInput.value = formatCouponRate(bond.couponRate);
            maturityDateInput.value = bond.maturityDate;
            calculateYearsToMaturityAndDisplay(settlementDateRef.current, bond.maturityDate);
            
            couponRateInput.readOnly = true;
            maturityDateInput.readOnly = true;
        }
        calculateBondPrice();
    }

    // --- Event Listeners ---
    // Custom bond select listeners
    bondSearchInput.addEventListener('input', () => filterBonds(bondSearchInput.value));
    bondSearchInput.addEventListener('focus', () => {
        // Show the full dropdown by passing an empty string
        filterBonds('');
    });
    
    bondSearchInput.addEventListener('keydown', (e) => {
        const optionsVisible = !bondOptionsContainer.classList.contains('hidden');

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
                    }
                    bondOptionsContainer.classList.add('hidden');
                } else {
                    // If options are hidden, move to next field
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
                // Allow other keys (like letters) to pass through
                return;
        }
    });


    settlementDateInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            bondCleanPriceInput.focus();
        }
    });

    calendarToggle?.addEventListener('click', toggleCalendar); 
    settlementDateInput?.addEventListener('click', toggleCalendar);
    
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
            event.target.value = formatTwoDecimals(value);
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
            event.target.value = formatNaira(value);
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

    // Run initialization on load
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
        // Add other cleanups if necessary, but these are the main ones for the calendar
    };

  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen antialiased p-4" style={{ fontFamily: "'Neue Frutiger', 'Frutiger', 'Inter', sans-serif" }}>
      {/* Main Container */}
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-xl pt-3 sm:pt-4 px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">
        {/* Input Form */}
        <div className="space-y-4">
            {/* Face Value */}
            <div>
                <label htmlFor="faceValue" className="block text-sm font-semibold text-gray-700">Face Value (₦)</label>
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

            {/* Yield to Maturity */}
            <div>
                <label htmlFor="yieldToMaturity" className="block text-sm font-semibold text-gray-700">Yield to Maturity (%)</label>
                <input type="number" step="0.01" id="yieldToMaturity" placeholder="e.g. 15.80" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* Settlement Date */}
            <div className="relative">
                <label htmlFor="settlementDate" className="block text-sm font-semibold text-gray-700">Settlement Date</label>
                <div className="relative">
                    <input ref={settlementDateInputRef} type="text" id="settlementDate" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer shadow-sm" readOnly />
                    {/* Calendar Toggle Button */}
                    <button ref={calendarToggleRef} type="button" id="calendarToggle" aria-label="Toggle Calendar" className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none group">
                         {/* Calendar icon (Inline SVG) */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-blue-600 pointer-events-none">
                            <path d="M8 2v4"/>
                            <path d="M16 2v4"/>
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M3 10h18"/>
                        </svg>
                    </button>
                </div>
                
                {/* Calendar Popover */}
                <div ref={calendarPopoverRef} id="calendar-popover" className="absolute z-50 p-4 bg-white border border-gray-200 rounded-lg shadow-2xl w-72 md:w-80 right-4 -top-[82px]" style={{ display: isCalendarOpen ? 'block' : 'none' }}>
                    <div id="calendar-header" className="flex justify-between items-center mb-3">
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <span id="currentMonthYear" className="font-bold text-gray-900">
                            {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                    <div id="calendar-days" className="calendar-grid grid gap-1">
                        {/* Render Day Titles */}
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <span key={day} className="day-title">{day}</span>
                        ))}
                        
                        {/* Render Empty Cells for Padding */}
                        {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                            <span key={`empty-${i}`}></span>
                        ))}
                        
                        {/* Render Days of Month */}
                        {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                            const day = i + 1;
                            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                            date.setHours(0, 0, 0, 0);
                            const isSelected = date.getTime() === selectedSettlementDate.getTime();
                            
                            return (
                                <span 
                                    key={day} 
                                    className={`calendar-day day-current-month ${isSelected ? 'day-selected' : ''}`}
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
                </div>
            </div>

            {/* 1. BOND CLEAN PRICE CALCULATED */}
            <div>
                <label htmlFor="calculatedBondPriceInput" className="block text-sm font-semibold text-gray-700">Clean Price Computed (₦)</label>
                <input type="text" id="calculatedBondPriceInput" defaultValue="0.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* 3. CONSIDERATION CALCULATED */}
            <div>
                <label htmlFor="considerationCalculatedInput" className="block text-sm font-semibold text-gray-700">Consideration (Total ₦)</label>
                <input type="text" id="considerationCalculatedInput" defaultValue="0.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" />
            </div>

            {/* 2. BOND DIRTY PRICE CALCULATED */}
            <div>
                <label htmlFor="bondDirtyPriceInput" className="block text-sm font-semibold text-gray-700">Dirty Price Computed (₦)</label>
                <input type="text" id="bondDirtyPriceInput" defaultValue="0.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm" readOnly />
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
