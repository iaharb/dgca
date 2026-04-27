/**
 * ABMS Financial Logic Functions
 * Implements the revenue split and liquidated damages calculations.
 */

const USD_TO_KD = 0.308;

export interface PaxCounts {
  leaving: number;
  coming: number;
  transit_plane: number;
  transit_no_plane: number;
  transit_no_entry: number;
}

export const PASSENGER_FEES_USD = {
  leaving: 2.0,
  coming: 2.0,
  transit_plane: 2.0,
  transit_no_plane: 1.0,
  transit_no_entry: 0.0,
};

// Project Parameters for Financial Module
export const ANNUAL_EXPECTED_PAX = 15000000;
export const ANNUAL_TRANSIT_PAX = 3000000;
export const TRANSIT_TYPES_DEFAULT = {
  plane_to_plane: 0.60, // 60% of 3M
  pax_no_plane: 0.30,   // 30% of 3M
  no_entry: 0.10        // 10% of 3M
};

export const RISK_FACTOR_DEFAULT = 0.25;
export const SYSTEM_PENALTY_RATE = 0.10;

export const EXPENSE_CATEGORIES = [
  'Hardware CAPEX',
  'Logistics',
  'Resources',
  'Fixed Costs',
  'Advanced Payments',
  'Bank Guarantee Facilities',
  'Insurance Policies',
  'Concession Fee Guarantee'
];

export const PROJECT_START_DATE = new Date('2026-05-01');
export const IMPLEMENTATION_WEEKS = 40;
export const GO_LIVE_WEEK = 50;


/**
 * Calculates monthly net revenue distribution based on passenger counts, 
 * consumables, and liquidated damages (penalties).
 * 
 * Formula: Net_Panworld = 0.35 * ((Pax * Fee) - Consumables - Penalties)
 */
export const calculateRevenueSplit = (
  pax: PaxCounts,
  consumablesKD: number = 0,
  penaltiesKD: number = 0
) => {
  const grossUSD = 
    (pax.leaving * PASSENGER_FEES_USD.leaving) +
    (pax.coming * PASSENGER_FEES_USD.coming) +
    (pax.transit_plane * PASSENGER_FEES_USD.transit_plane) +
    (pax.transit_no_plane * PASSENGER_FEES_USD.transit_no_plane) +
    (pax.transit_no_entry * PASSENGER_FEES_USD.transit_no_entry);

  const grossKD = grossUSD * USD_TO_KD;
  
  // Apply deductions before the split
  const netBeforeSplit = grossKD - consumablesKD - penaltiesKD;
  
  const panworldShare = Math.max(0, netBeforeSplit * 0.35);
  const dgcaShare = Math.max(0, netBeforeSplit * 0.65);

  return {
    grossUSD,
    grossKD,
    netBeforeSplit,
    panworldShare,
    dgcaShare,
    penaltiesImpact: penaltiesKD,
  };
};

/**
 * Calculates the impact of liquidated damages on the monthly net revenue.
 */
export const calculatePenaltyImpact = (
  penaltiesKD: number,
  baseGrossKD: number
) => {
  const netWithoutPenalties = baseGrossKD * 0.35;
  const netWithPenalties = Math.max(0, (baseGrossKD - penaltiesKD) * 0.35);
  
  return {
    lossOfRevenue: netWithoutPenalties - netWithPenalties,
    penaltyAmount: penaltiesKD,
  };
};
