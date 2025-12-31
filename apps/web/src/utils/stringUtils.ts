
export const normalizeTurkishChars = (text: string): string => {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'I': 'I',
        'İ': 'i',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
    };
    return text.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (match) => trMap[match] || match);
};

export const generateUsername = (firstName: string, lastName: string): string => {
    if (!firstName && !lastName) return '';

    const normalizedFirst = normalizeTurkishChars(firstName.trim().toLowerCase());
    const normalizedLast = normalizeTurkishChars(lastName.trim().toLowerCase());

    const initial = normalizedFirst.charAt(0);
    const cleanLast = normalizedLast.replace(/[^a-z0-9]/g, '');

    return `${initial}${cleanLast}`;
};
