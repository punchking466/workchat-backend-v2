export const parseRoomFromPath = (
  path: string,
): {
  kind: 'group' | 'private' | null;
  roomId?: number;
} => {
  if (!path) return { kind: null };
  const p = path.split('?')[0];

  const g = p.match(/^\/group-chat\/(\d+)$/);
  if (g) return { kind: 'group', roomId: Number(g[1]) };

  const pr = p.match(/^\/private-chat\/(\d+)$/);
  if (pr) return { kind: 'private', roomId: Number(pr[1]) };

  return { kind: null };
};
