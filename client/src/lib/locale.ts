export const formatMoney = (value: number) => new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", currencyDisplay: "code", maximumFractionDigits: 2 }).format(value).replace("MZN", "MT");
// Keep the existing storage unit; convert at the interface boundary.
export const formatArea = (squareFeet: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 1 }).format(squareFeet * 0.09290304);
