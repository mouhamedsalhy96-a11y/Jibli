export type Delivery = { address: string; city: string; postcode: string; revision: number; updated_at: string };
export function validateDelivery(input: { address: string; city: string; postcode: string }) {
  const address = input.address.trim(), city = input.city.trim(), postcode = input.postcode.trim();
  if (address.length < 10 || address.length > 500) throw new Error("Indiquez une adresse complète de 10 à 500 caractères.");
  if (city.length < 2 || city.length > 100) throw new Error("Indiquez la ville du devis accepté.");
  if (!/^[0-9]{4}$/.test(postcode)) throw new Error("Le code postal doit contenir exactement 4 chiffres.");
  return { address, city, postcode };
}
