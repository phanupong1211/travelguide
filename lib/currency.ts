export type Currency = 'THB' | 'USD' | 'JPY';

export type Rates = {
  USD: number; // USD -> THB
  JPY: number; // JPY -> THB
};

export const defaultRates: Rates = { USD: 35, JPY: 0.24 };

export function toTHB(amount: number, currency: Currency, rates: Rates) {
  switch (currency) {
    case 'USD':
      return amount * (rates.USD || defaultRates.USD);
    case 'JPY':
      return amount * (rates.JPY || defaultRates.JPY);
    default:
      return amount;
  }
}

