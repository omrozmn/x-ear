export const formatCurrency = (amount: number | string, currency: string = 'TRY'): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(value)) return '0,00 ₺';

    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(value);
};

export const formatDate = (date: string | Date): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date(date));
};
