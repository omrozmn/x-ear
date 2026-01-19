/**
 * Orval -> Domain Party mappers
 * Since we now use Orval Party directly, this is now an identity function
 */
import type { PartyRead as OrvalParty } from "@/api/generated/schemas";

export function convertOrvalParty(orval: Partial<OrvalParty> | null | undefined): OrvalParty | null {
  if (!orval) return null;
  return orval as OrvalParty;
}

export default convertOrvalParty;
