
export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: number;
  winner: boolean;
  homeAway: 'home' | 'away';
}

export interface GameStatus {
  state: 'scheduled' | 'in_progress' | 'final';
  detail: string;
  description: string;
}

export interface GameEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: GameStatus;
  teams: {
    home: TeamInfo;
    away: TeamInfo;
  };
}

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

const parseESPNEvent = (event: any): GameEvent => {
  const competition = event.competitions[0];
  const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
  const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');

  const mapTeam = (t: any): TeamInfo => ({
    id: t.id,
    name: t.team.displayName,
    abbreviation: t.team.abbreviation,
    logo: t.team.logo,
    score: parseInt(t.score) || 0,
    winner: t.winner || false,
    homeAway: t.homeAway as 'home' | 'away'
  });

  const stateMap: Record<string, GameStatus['state']> = {
    'STATUS_SCHEDULED': 'scheduled',
    'STATUS_IN_PROGRESS': 'in_progress',
    'STATUS_FINAL': 'final',
    'STATUS_HALFTIME': 'in_progress'
  };

  return {
    id: event.id,
    date: event.date,
    name: event.name,
    shortName: event.shortName,
    status: {
      state: stateMap[event.status.type.name] || 'in_progress',
      detail: event.status.type.detail,
      description: event.status.type.description
    },
    teams: {
      home: mapTeam(homeTeam),
      away: mapTeam(awayTeam)
    }
  };
};

export const fetchScores = async (sport: 'football/nfl' | 'baseball/mlb'): Promise<GameEvent[]> => {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/${sport}/scoreboard`);
    const data = await response.json();
    return (data.events || []).map(parseESPNEvent);
  } catch (error) {
    console.error(`Error fetching ${sport} scores:`, error);
    return [];
  }
};
