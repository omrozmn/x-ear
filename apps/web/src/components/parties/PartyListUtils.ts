/**
 * Utility functions for PartyList component
 */

export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('tr-TR');
    } catch {
        return '-';
    }
};

export const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    // Format Turkish phone number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
};
