/**
 * Orval -> Domain Patient mappers
 * Since we now use Orval Patient directly, this is now an identity function
 */
import type { Patient as OrvalPatient } from "../../api/generated/schemas";

export function convertOrvalPatient(orval: Partial<OrvalPatient> | null | undefined): OrvalPatient | null {
  if (!orval) return null;
  return orval as OrvalPatient;
}

export default convertOrvalPatient;
