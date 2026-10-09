const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const routes = {
  home: () => '/',
  newLeague: () => '/?new=1',
  league: (id: string) => `/league/${encodeURIComponent(id)}`,
  teams: (id: string) => `/league/${encodeURIComponent(id)}/teams`,
  team: (id: string, team: string) => `/league/${encodeURIComponent(id)}/team/${encodeURIComponent(team)}`,
  season: (id: string, season: string) => `/league/${encodeURIComponent(id)}/season/${encodeURIComponent(season)}`,
  seasons: (id: string) => `/league/${encodeURIComponent(id)}/seasons`,
  h2h: (id: string, a?: string, b?: string) => `/league/${encodeURIComponent(id)}/h2h${q({ a, b })}`,
  compare: (id: string, a?: string, b?: string) => `/league/${encodeURIComponent(id)}/compare${q({ a, b })}`,
  trades: (id: string, season?: string) => `/league/${encodeURIComponent(id)}/trades${q({ season })}`,
};
