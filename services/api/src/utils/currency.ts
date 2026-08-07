export interface ExchangeRates {
  [currency: string]: number;
}

// Mock rates based on 1 USD as the base
export const MOCK_RATES: ExchangeRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.30,
  AUD: 1.52,
  CAD: 1.35,
  JPY: 151.60,
};

export const convertToUSD = (amount: number, fromCurrency: string): number => {
  const rate = MOCK_RATES[fromCurrency.toUpperCase()] || 1.0;
  return amount / rate;
};

export const convertFromUSD = (amount: number, toCurrency: string): number => {
  const rate = MOCK_RATES[toCurrency.toUpperCase()] || 1.0;
  return amount * rate;
};
