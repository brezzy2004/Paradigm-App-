export function initialsFromEmail(email: string) {
  const base = email.split('@')[0];
  const parts = base.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0,2).toUpperCase();
}
export function chatDisplayId(serial: number, opts: { projectSerial?: number, groupSerial?: number, userInitials: string }) {
  const segs = [`cha-${serial}`];
  if (opts.projectSerial) segs.push(`PRJ-${opts.projectSerial}`);
  if (opts.groupSerial) segs.push(`DGP-${opts.groupSerial}`);
  segs.push(opts.userInitials);
  return segs.join('/');
}
