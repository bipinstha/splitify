export const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
  const code = currencyCode.toUpperCase();
  const formattedAmount = amount.toFixed(2);
  switch (code) {
    case 'USD':
      return `$${formattedAmount}`;
    case 'EUR':
      return `€${formattedAmount}`;
    case 'GBP':
      return `£${formattedAmount}`;
    case 'INR':
      return `₹${formattedAmount}`;
    case 'JPY':
      return `¥${formattedAmount}`;
    case 'CAD':
      return `CA$${formattedAmount}`;
    case 'AUD':
      return `A$${formattedAmount}`;
    default:
      return `${code} ${formattedAmount}`;
  }
};

export const getCurrencySymbol = (currencyCode: string = 'USD') => {
  const code = currencyCode.toUpperCase();
  switch (code) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    case 'JPY':
      return '¥';
    default:
      return code;
  }
};
