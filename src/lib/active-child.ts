/**
 * Menentukan profil anak/user yang sedang "dilihat":
 * - Login sebagai user/anak SD  -> profil sendiri.
 * - Supervisor/Admin memantau   -> profil yang dipantau.
 * Selalu mengembalikan profil anak yang valid (fallback ke anak pertama, lalu profil pertama).
 */
import { isChildRole, type ProfileData, type UserRole } from "@/store/useBukuDompetStore";

export function pickViewedChild(state: {
  currentRole: UserRole;
  activeProfileId: string;
  monitoredUserId: string;
  profiles: ProfileData[];
}): ProfileData {
  const { currentRole, activeProfileId, monitoredUserId, profiles } = state;
  const wantedId = isChildRole(currentRole) ? activeProfileId : monitoredUserId;
  return (
    profiles.find((p) => p.id === wantedId && isChildRole(p.role)) ||
    profiles.find((p) => isChildRole(p.role)) ||
    profiles[0]
  );
}
