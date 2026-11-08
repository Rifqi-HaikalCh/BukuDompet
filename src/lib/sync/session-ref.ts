/** Identitas akun yang sedang masuk (diverifikasi server). Modul kecil agar tidak ada impor melingkar. */
export interface SessionUser {
  id: string;
  username: string;
  display_name: string;
  role: "user" | "supervisor" | "admin" | "schoolchild";
}

let current: SessionUser | null = null;
export const getSessionUser = (): SessionUser | null => current;
export const setSessionUser = (u: SessionUser | null): void => {
  current = u;
};
