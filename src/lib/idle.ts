const WEEK = 7 * 864e5;
const MAX_ACTIVE = 3;

/**
 * Idle = no activity for more than 7 days, or beyond the 3 most active.
 * Projects Daniel brought back (`promoted`) stay active and don't count toward the cap.
 */
export function splitIdle<P extends { id: string; lastActivityAt: string }>(
  projects: P[],
  now: number,
  promoted: ReadonlySet<string> = new Set(),
) {
  const last = (p: P) => Date.parse(p.lastActivityAt);
  const keep = new Set(
    projects
      .filter((p) => !promoted.has(p.id) && now - last(p) <= WEEK)
      .sort((a, b) => last(b) - last(a))
      .slice(0, MAX_ACTIVE)
      .map((p) => p.id),
  );
  const isActive = (p: P) => promoted.has(p.id) || keep.has(p.id);
  return { active: projects.filter(isActive), idle: projects.filter((p) => !isActive(p)) };
}
