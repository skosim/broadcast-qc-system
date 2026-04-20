export type FnlLeagueCode = "first-league" | "second-a" | "second-b";
export type FnlGroupCode = "all" | "gold" | "silver" | "group-1" | "group-2" | "group-3" | "group-4" | null;

export const fnlMatchSourceUrls: Record<FnlLeagueCode, string> = {
  "first-league": "https://fnl.pro/pari/matches",
  "second-a": "https://fnl.pro/leon-a/matches",
  "second-b": "https://fnl.pro/leon-b/matches"
};

export type FnlMatchSnapshot = {
  externalMatchId: string;
  leagueCode: FnlLeagueCode;
  groupCode: FnlGroupCode;
  matchDate: string;
  matchTime: string;
  status: "upcoming" | "live" | "finished";
  homeClubName: string;
  awayClubName: string;
  matchUrl: string;
  stadiumName?: string | null;
  delegateName?: string | null;
  videoDelegateName?: string | null;
  inspectorName?: string | null;
  refereeName?: string | null;
};

export const fnlMatchSnapshots: FnlMatchSnapshot[] = [
  {
    externalMatchId: "f1-arsenal-rotor-2026-04-20",
    leagueCode: "first-league",
    groupCode: "all",
    matchDate: "2026-04-20",
    matchTime: "18:00",
    status: "upcoming",
    homeClubName: "Арсенал",
    awayClubName: "Ротор",
    matchUrl: "https://fnl.pro/pari/matches/arsenal-rotor-2026-04-20",
    stadiumName: "Арсенал",
    delegateName: "Алексей Нагорный",
    videoDelegateName: "Дмитрий Сотников",
    inspectorName: "Игорь Мельников",
    refereeName: "Павел Шадыханов"
  },
  {
    externalMatchId: "f1-volga-shinnik-2026-04-18",
    leagueCode: "first-league",
    groupCode: "all",
    matchDate: "2026-04-18",
    matchTime: "16:00",
    status: "finished",
    homeClubName: "Волга",
    awayClubName: "Шинник",
    matchUrl: "https://fnl.pro/pari/matches/volga-shinnik-2026-04-18",
    stadiumName: "Труд им. Л.И. Яшина"
  },
  {
    externalMatchId: "f2a-g-veles-leningradets-2026-04-20",
    leagueCode: "second-a",
    groupCode: "gold",
    matchDate: "2026-04-20",
    matchTime: "17:30",
    status: "live",
    homeClubName: "Велес",
    awayClubName: "Ленинградец",
    matchUrl: "https://fnl.pro/leon-a/matches/veles-leningradets-2026-04-20",
    stadiumName: "Труд",
    delegateName: "Николай Логинов",
    videoDelegateName: "Роман Чистов",
    inspectorName: "Михаил Егоров",
    refereeName: "Артем Любимов"
  },
  {
    externalMatchId: "f2a-s-kuban-tyumen-2026-04-20",
    leagueCode: "second-a",
    groupCode: "silver",
    matchDate: "2026-04-20",
    matchTime: "14:00",
    status: "upcoming",
    homeClubName: "Кубань",
    awayClubName: "Тюмень",
    matchUrl: "https://fnl.pro/leon-a/matches/kuban-tyumen-2026-04-20",
    stadiumName: "Кубань"
  },
  {
    externalMatchId: "f2b-g2-murom-dinamo-spb-2026-04-19",
    leagueCode: "second-b",
    groupCode: "group-2",
    matchDate: "2026-04-19",
    matchTime: "15:00",
    status: "finished",
    homeClubName: "Муром",
    awayClubName: "Динамо-СПб",
    matchUrl: "https://fnl.pro/leon-b/matches/murom-dinamo-spb-2026-04-19"
  },
  {
    externalMatchId: "f2b-g3-avangard-ryazan-2026-04-20",
    leagueCode: "second-b",
    groupCode: "group-3",
    matchDate: "2026-04-20",
    matchTime: "13:00",
    status: "upcoming",
    homeClubName: "Авангард",
    awayClubName: "Рязань",
    matchUrl: "https://fnl.pro/leon-b/matches/avangard-ryazan-2026-04-20"
  }
];
