// Basit bir IBAN doğrulama fonksiyonu
export function validateIban(iban: string): boolean {
  iban = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{15,34}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numerized = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString());
  let remainder = numerized;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
  }
  return parseInt(remainder, 10) % 97 === 1;
}
