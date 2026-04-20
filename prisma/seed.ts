import { BroadcastMatchMode, BroadcastSource, PrismaClient, SourceSystem, type Club, type Stadium } from "@prisma/client";
import { buildClubAliasVariants, normalizeClubName } from "@/lib/club-name";

const prisma = new PrismaClient();

const transliterationMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

function slugifyClubName(value: string) {
  const normalized = normalizeClubName(value);

  return normalized
    .split("")
    .map((char) => transliterationMap[char] ?? (/[a-z0-9 ]/.test(char) ? char : ""))
    .join("")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAliases(name: string, shortName?: string, extraAliases: string[] = []) {
  return JSON.stringify(buildClubAliasVariants(name, shortName, extraAliases));
}

function formatMatchTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow"
  }).format(value);
}

function toStartOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function buildCanonicalMatchKey(leagueCode: string, matchDate: Date, homeClubName: string, awayClubName: string) {
  return [
    leagueCode,
    matchDate.toISOString().slice(0, 10),
    normalizeClubName(homeClubName),
    normalizeClubName(awayClubName)
  ].join(":");
}

async function main() {
  await prisma.externalSourceSnapshot.deleteMany();
  await prisma.stadiumRemark.deleteMany();
  await prisma.stadiumFile.deleteMany();
  await prisma.resolvedIssueLog.deleteMany();
  await prisma.broadcastIssueHistory.deleteMany();
  await prisma.broadcastIssueTag.deleteMany();
  await prisma.broadcastIssue.deleteMany();
  await prisma.broadcastLink.deleteMany();
  await prisma.match.deleteMany();
  await prisma.stadium.deleteMany();
  await prisma.clubAlias.deleteMany();
  await prisma.club.deleteMany();
  await prisma.leagueGroup.deleteMany();
  await prisma.league.deleteMany();
  await prisma.dataSyncJob.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.season.deleteMany();

  const seasonCurrent = await prisma.season.create({
    data: {
      name: "Сезон 2025/26",
      slug: "2025-26",
      isCurrent: true,
      startedAt: new Date("2025-07-01T00:00:00.000Z"),
      endedAt: new Date("2026-06-30T23:59:59.000Z")
    }
  });

  const seasonPrevious = await prisma.season.create({
    data: {
      name: "Сезон 2024/25",
      slug: "2024-25",
      isCurrent: false,
      startedAt: new Date("2024-07-01T00:00:00.000Z"),
      endedAt: new Date("2025-06-30T23:59:59.000Z")
    }
  });

  const leagues = await Promise.all([
    prisma.league.create({
      data: { code: "first-league", name: "Первая лига", shortName: "ФНЛ-1", orderIndex: 1 }
    }),
    prisma.league.create({
      data: { code: "second-a", name: "Вторая лига А", shortName: "ФНЛ-2А", orderIndex: 2 }
    }),
    prisma.league.create({
      data: { code: "second-b", name: "Вторая лига Б", shortName: "ФНЛ-2Б", orderIndex: 3 }
    })
  ]);

  const leagueByCode = Object.fromEntries(leagues.map((league) => [league.code, league]));

  const groups = await Promise.all([
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["first-league"].id, code: "all", name: "Общая таблица", orderIndex: 1 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-a"].id, code: "gold", name: "Золото", orderIndex: 1 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-a"].id, code: "silver", name: "Серебро", orderIndex: 2 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-b"].id, code: "group-1", name: "Группа 1", orderIndex: 1 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-b"].id, code: "group-2", name: "Группа 2", orderIndex: 2 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-b"].id, code: "group-3", name: "Группа 3", orderIndex: 3 }
    }),
    prisma.leagueGroup.create({
      data: { leagueId: leagueByCode["second-b"].id, code: "group-4", name: "Группа 4", orderIndex: 4 }
    })
  ]);

  const groupByCode = Object.fromEntries(groups.map((group) => [group.code, group]));

  const tags = await Promise.all([
    prisma.tag.create({
      data: { code: "brigade", labelRu: "Бригада", description: "Проблемы с комментаторской или технической бригадой." }
    }),
    prisma.tag.create({
      data: { code: "club", labelRu: "Клуб", description: "Проблема со стороны принимающего клуба." }
    }),
    prisma.tag.create({
      data: { code: "fnl", labelRu: "ФНЛ", description: "Организационные вопросы на стороне лиги." }
    }),
    prisma.tag.create({
      data: { code: "internet", labelRu: "Интернет", description: "Недостаточная пропускная способность или отсутствие соединения." }
    }),
    prisma.tag.create({
      data: { code: "kinopoisk", labelRu: "Кинопоиск", description: "Проблемы, связанные с размещением и отображением трансляции в Кинопоиске." }
    }),
    prisma.tag.create({
      data: { code: "match", labelRu: "Матч", description: "Непосредственная проблема матча или стадионной инфраструктуры трансляции." }
    }),
    prisma.tag.create({
      data: { code: "vk", labelRu: "ВК", description: "Проблемы размещения, воспроизведения или ссылок в VK Видео." }
    }),
    prisma.tag.create({
      data: { code: "vsporte", labelRu: "ВСпорте", description: "Проблемы на стороне внешнего производственного или платформенного партнера." }
    })
  ]);

  const tagByCode = Object.fromEntries(tags.map((tag) => [tag.code, tag]));

  const firstLeagueClubs = [
    "Арсенал",
    "Волга",
    "Енисей",
    "КАМАЗ",
    "Нефтехимик",
    "Родина",
    "Ротор",
    "СКА-Хабаровск",
    "Сокол",
    "Спартак (Кострома)",
    "Торпедо Москва",
    "Урал",
    "Уфа",
    "Факел",
    "Чайка",
    "Челябинск",
    "Черноморец",
    "Шинник"
  ] as const;

  const secondAGoldClubs = [
    "Велес",
    "Волгарь",
    "Иртыш",
    "Калуга",
    "Ленинградец",
    "Машук-КМВ",
    "Родина-2",
    "Сибирь",
    "Текстильщик",
    "Торпедо Миасс"
  ] as const;

  const secondASilverClubs = [
    "Алания",
    "Амкар-Пермь",
    "Динамо-2 (Москва)",
    "Динамо-Брянск",
    "Динамо-Владивосток",
    "Динамо (Киров)",
    "Динамо Ставрополь",
    "Зенит-2",
    "Кубань",
    "Тюмень"
  ] as const;

  const secondBGroupClubs = {
    "group-1": [
      "Ангушт",
      "Астрахань",
      "Динамо-2 (Махачкала)",
      "Дружба",
      "Заря",
      "Кызылташ",
      "Нарт",
      "Нефтяник",
      "Победа",
      "ПСК",
      "Ростов-2",
      "Рубин Ялта",
      "Севастополь",
      "Спартак-Нальчик",
      "Чайка-М",
      "Шахтер"
    ],
    "group-2": [
      "Балтика-2",
      "Динамо-Вологда",
      "Динамо-СПб",
      "Енисей-2",
      "Звезда",
      "Иркутск",
      "Искра",
      "Космос",
      "Луки-Энергия",
      "Муром",
      "Спартак-2",
      "Тверь",
      "Торпедо-Владимир",
      "Череповец",
      "Чертаново"
    ],
    "group-3": [
      "Авангард",
      "Арсенал-2",
      "Волна",
      "Зенит (Пенза)",
      "Квант",
      "Металлург",
      "Орел",
      "Родина-3",
      "Ротор-2",
      "Рязань",
      "Салют Белгород",
      "Сатурн",
      "СКА-Хабаровск-2",
      "Спартак (Тамбов)",
      "Строгино",
      "Шумбрат"
    ],
    "group-4": [
      "Акрон-2",
      "Динамо-Барнаул",
      "Ижевск",
      "КДВ",
      "Крылья Советов-2",
      "Носта",
      "Оренбург-2",
      "Победа Нижний Новгород",
      "Рубин-2",
      "Урал-2",
      "Химик",
      "Челябинск-2"
    ]
  } as const;

  const cityByClubName: Record<string, string> = {
    "Арсенал": "Тула",
    "Волга": "Ульяновск",
    "Енисей": "Красноярск",
    "КАМАЗ": "Набережные Челны",
    "Нефтехимик": "Нижнекамск",
    "Родина": "Москва",
    "Ротор": "Волгоград",
    "СКА-Хабаровск": "Хабаровск",
    "Сокол": "Саратов",
    "Спартак (Кострома)": "Кострома",
    "Торпедо Москва": "Москва",
    "Урал": "Екатеринбург",
    "Уфа": "Уфа",
    "Факел": "Воронеж",
    "Чайка": "Песчанокопское",
    "Челябинск": "Челябинск",
    "Черноморец": "Новороссийск",
    "Шинник": "Ярославль",
    "Велес": "Подольск",
    "Волгарь": "Астрахань",
    "Иртыш": "Омск",
    "Калуга": "Калуга",
    "Ленинградец": "Рощино",
    "Машук-КМВ": "Пятигорск",
    "Родина-2": "Москва",
    "Сибирь": "Новосибирск",
    "Текстильщик": "Иваново",
    "Торпедо Миасс": "Миасс",
    "Алания": "Владикавказ",
    "Амкар-Пермь": "Пермь",
    "Динамо-2 (Москва)": "Москва",
    "Динамо-Брянск": "Брянск",
    "Динамо-Владивосток": "Владивосток",
    "Динамо (Киров)": "Киров",
    "Динамо Ставрополь": "Ставрополь",
    "Зенит-2": "Санкт-Петербург",
    "Кубань": "Краснодар",
    "Тюмень": "Тюмень",
    "Авангард": "Курск",
    "Муром": "Муром",
    "Ангушт": "Назрань",
    "Астрахань": "Астрахань",
    "Динамо-2 (Махачкала)": "Махачкала",
    "Дружба": "Майкоп",
    "Заря": "Луганск",
    "Кызылташ": "Бахчисарай",
    "Нарт": "Черкесск",
    "Нефтяник": "Новокуйбышевск",
    "Победа": "Хасавюрт",
    "ПСК": "Динская",
    "Ростов-2": "Ростов-на-Дону",
    "Рубин Ялта": "Ялта",
    "Севастополь": "Севастополь",
    "Спартак-Нальчик": "Нальчик",
    "Чайка-М": "Песчанокопское",
    "Шахтер": "Прокопьевск",
    "Балтика-2": "Калининград",
    "Динамо-Вологда": "Вологда",
    "Динамо-СПб": "Санкт-Петербург",
    "Енисей-2": "Красноярск",
    "Звезда": "Санкт-Петербург",
    "Иркутск": "Иркутск",
    "Искра": "Новосибирск",
    "Космос": "Долгопрудный",
    "Луки-Энергия": "Великие Луки",
    "Спартак-2": "Москва",
    "Тверь": "Тверь",
    "Торпедо-Владимир": "Владимир",
    "Череповец": "Череповец",
    "Чертаново": "Москва",
    "Арсенал-2": "Тула",
    "Волна": "Нижегородская область",
    "Зенит (Пенза)": "Пенза",
    "Квант": "Обнинск",
    "Металлург": "Липецк",
    "Орел": "Орел",
    "Родина-3": "Москва",
    "Ротор-2": "Волгоград",
    "Рязань": "Рязань",
    "Салют Белгород": "Белгород",
    "Сатурн": "Раменское",
    "СКА-Хабаровск-2": "Хабаровск",
    "Спартак (Тамбов)": "Тамбов",
    "Строгино": "Москва",
    "Шумбрат": "Саранск",
    "Акрон-2": "Тольятти",
    "Динамо-Барнаул": "Барнаул",
    "Ижевск": "Ижевск",
    "КДВ": "Томск",
    "Крылья Советов-2": "Самара",
    "Носта": "Новотроицк",
    "Оренбург-2": "Оренбург",
    "Победа Нижний Новгород": "Нижний Новгород",
    "Рубин-2": "Казань",
    "Урал-2": "Екатеринбург",
    "Химик": "Дзержинск",
    "Челябинск-2": "Челябинск"
  };

  const shortNameOverrides: Record<string, string> = {
    "Торпедо Москва": "Торпедо",
    "Спартак (Кострома)": "Спартак Кострома",
    "Динамо-2 (Москва)": "Динамо-2",
    "Динамо (Киров)": "Динамо Киров",
    "Динамо-2 (Махачкала)": "Динамо-2",
    "Зенит (Пенза)": "Зенит",
    "Спартак (Тамбов)": "Спартак Тамбов",
    "СКА-Хабаровск-2": "СКА-2"
  };

  const aliasExtras: Record<string, string[]> = {
    "Торпедо Москва": ["Торпедо (Москва)", "Торпедо-Москва"],
    "Спартак (Кострома)": ["Спартак Кострома"],
    "Динамо-2 (Москва)": ["Динамо-2 Москва", "Динамо 2 Москва"],
    "Динамо (Киров)": ["Динамо Киров"],
    "Динамо-2 (Махачкала)": ["Динамо-2 Махачкала", "Динамо 2 Махачкала"],
    "Зенит (Пенза)": ["Зенит Пенза"],
    "Спартак (Тамбов)": ["Спартак Тамбов"],
    "СКА-Хабаровск": ["СКА Хабаровск"],
    "СКА-Хабаровск-2": ["СКА Хабаровск-2", "СКА Хабаровск 2"],
    "Торпедо Миасс": ["Торпедо-Миасс"],
    "Амкар-Пермь": ["Амкар Пермь"],
    "Чайка-М": ["Чайка 2", "Чайка-Молодежная"]
  };

  const slugOverrides: Record<string, string> = {
    "Арсенал": "arsenal-tula",
    "Волга": "volga-ulyanovsk",
    "Волгарь": "volgar-astrakhan",
    "Ротор": "rotor-volgograd",
    "Велес": "veles-podolsk",
    "Ленинградец": "leningradets-roshchino",
    "Кубань": "kuban-krasnodar"
  };

  const stadiumOverrides: Record<
    string,
    {
      name: string;
      city: string;
      address: string;
      capacity: number;
      surfaceType: string;
      certificateNumber: string;
      certificateValidFrom: Date;
      certificateValidTo: Date;
      category: string;
    }
  > = {
    "Арсенал": {
      name: "Арсенал",
      city: "Тула",
      address: "Тула, проспект Ленина, 87",
      capacity: 19241,
      surfaceType: "натуральный газон",
      certificateNumber: "СтRU.К276А01318",
      certificateValidFrom: new Date("2024-09-30T00:00:00.000Z"),
      certificateValidTo: new Date("2026-09-30T00:00:00.000Z"),
      category: "Первая категория"
    },
    "Волгарь": {
      name: "Центральный",
      city: "Астрахань",
      address: "Астрахань, ул. Латышева, 3",
      capacity: 18000,
      surfaceType: "натуральный газон",
      certificateNumber: "СтRU.К276А01356",
      certificateValidFrom: new Date("2024-10-01T00:00:00.000Z"),
      certificateValidTo: new Date("2026-10-01T00:00:00.000Z"),
      category: "Первая категория"
    },
    "Ротор": {
      name: "Волгоград Арена",
      city: "Волгоград",
      address: "Волгоград, проспект Ленина, 76",
      capacity: 45150,
      surfaceType: "натуральный газон",
      certificateNumber: "СтRU.К276А01401",
      certificateValidFrom: new Date("2024-08-20T00:00:00.000Z"),
      certificateValidTo: new Date("2026-08-20T00:00:00.000Z"),
      category: "Первая категория"
    },
    "Велес": {
      name: "Труд",
      city: "Подольск",
      address: "г. Подольск, ул. Клемента Готвальда, д. 4",
      capacity: 11887,
      surfaceType: "искусственный газон",
      certificateNumber: "СтRU.К276А01217",
      certificateValidFrom: new Date("2023-09-29T00:00:00.000Z"),
      certificateValidTo: new Date("2025-09-28T00:00:00.000Z"),
      category: "Вторая категория"
    },
    "Ленинградец": {
      name: "Рощино Арена",
      city: "Рощино",
      address: "Ленинградская область, Рощино, ул. Советская, 20",
      capacity: 1534,
      surfaceType: "искусственный газон",
      certificateNumber: "СтRU.К276А01298",
      certificateValidFrom: new Date("2024-07-01T00:00:00.000Z"),
      certificateValidTo: new Date("2025-10-20T00:00:00.000Z"),
      category: "Вторая категория"
    },
    "Волга": {
      name: "Труд им. Л.И. Яшина",
      city: "Ульяновск",
      address: "г. Ульяновск, ул. Андрея Блаженного, зд. 23",
      capacity: 7972,
      surfaceType: "натуральный газон",
      certificateNumber: "СтRU.К276А01289",
      certificateValidFrom: new Date("2024-07-09T00:00:00.000Z"),
      certificateValidTo: new Date("2026-07-15T00:00:00.000Z"),
      category: "Вторая категория"
    },
    "Кубань": {
      name: "Кубань",
      city: "Краснодар",
      address: "Краснодар, ул. Железнодорожная, 49",
      capacity: 31654,
      surfaceType: "натуральный газон",
      certificateNumber: "СтRU.К276А01190",
      certificateValidFrom: new Date("2024-08-01T00:00:00.000Z"),
      certificateValidTo: new Date("2026-08-01T00:00:00.000Z"),
      category: "Первая категория"
    }
  };

  const clubSpecs = new Map<
    string,
    {
      name: string;
      leagueCode: "first-league" | "second-a" | "second-b";
      groupCode: string;
    }
  >();

  for (const name of firstLeagueClubs) {
    clubSpecs.set(name, { name, leagueCode: "first-league", groupCode: "all" });
  }

  for (const name of secondAGoldClubs) {
    clubSpecs.set(name, { name, leagueCode: "second-a", groupCode: "gold" });
  }

  for (const name of secondASilverClubs) {
    if (!clubSpecs.has(name)) {
      clubSpecs.set(name, { name, leagueCode: "second-a", groupCode: "silver" });
    }
  }

  for (const [groupCode, names] of Object.entries(secondBGroupClubs)) {
    for (const name of names) {
      if (!clubSpecs.has(name)) {
        clubSpecs.set(name, { name, leagueCode: "second-b", groupCode });
      }
    }
  }

  const clubs: Club[] = [];
  for (const spec of clubSpecs.values()) {
    const shortName = shortNameOverrides[spec.name] ?? spec.name;
    const slug = slugOverrides[spec.name] ?? slugifyClubName(spec.name);

    const club = await prisma.club.create({
      data: {
        leagueId: leagueByCode[spec.leagueCode].id,
        leagueGroupId: groupByCode[spec.groupCode].id,
        slug,
        name: spec.name,
        nameNormalized: normalizeClubName(spec.name),
        shortName,
        aliasesJson: buildAliases(spec.name, shortName, aliasExtras[spec.name] ?? []),
        city: cityByClubName[spec.name] ?? null
      }
    });

    clubs.push(club);

    const aliasVariants = buildClubAliasVariants(spec.name, shortName, aliasExtras[spec.name] ?? []);
    const uniqueAliases = new Map<string, string>();
    for (const alias of aliasVariants) {
      const normalizedAlias = normalizeClubName(alias);
      if (!uniqueAliases.has(normalizedAlias)) {
        uniqueAliases.set(normalizedAlias, alias);
      }
    }

    for (const [normalizedAlias, alias] of uniqueAliases.entries()) {
      await prisma.clubAlias.create({
        data: {
          clubId: club.id,
          alias,
          aliasNormalized: normalizedAlias,
          isPrimary: normalizedAlias === normalizeClubName(spec.name),
          sourceSystem: SourceSystem.manual
        }
      });
    }
  }

  const clubBySlug = Object.fromEntries(clubs.map((club) => [club.slug, club]));
  const stadiums: Stadium[] = [];
  for (const club of clubs) {
    const override = stadiumOverrides[club.name];
    const stadium = await prisma.stadium.create({
      data: {
        clubId: club.id,
        name: override?.name ?? `Стадион клуба «${club.shortName ?? club.name}»`,
        city: override?.city ?? club.city ?? null,
        address: override?.address ?? null,
        capacity: override?.capacity ?? null,
        surfaceType: override?.surfaceType ?? null,
        certificateNumber: override?.certificateNumber ?? null,
        certificateValidFrom: override?.certificateValidFrom ?? null,
        certificateValidTo: override?.certificateValidTo ?? null,
        category: override?.category ?? null,
        delegateNotes: override ? null : "Карточка стадиона создана, подробные данные будут заполнены позже."
      }
    });

    stadiums.push(stadium);
  }

  const stadiumByClubId = Object.fromEntries(stadiums.map((stadium) => [stadium.clubId, stadium]));

  const syncJobs = await Promise.all([
    prisma.dataSyncJob.create({
      data: {
        seasonId: seasonCurrent.id,
        sourceSystem: SourceSystem.fnl_pro,
        jobType: "matches",
        status: "completed",
        startedAt: new Date("2026-04-20T05:40:00.000Z"),
        finishedAt: new Date("2026-04-20T05:42:00.000Z"),
        itemsFound: 6,
        itemsCreated: 6,
        itemsUpdated: 0,
        detailsJson: JSON.stringify({ matchesFetched: 6, leagues: 2 })
      }
    }),
    prisma.dataSyncJob.create({
      data: {
        seasonId: seasonCurrent.id,
        sourceSystem: SourceSystem.google_sheets,
        jobType: "initial_issues_import",
        status: "completed",
        startedAt: new Date("2026-04-12T20:10:00.000Z"),
        finishedAt: new Date("2026-04-12T20:13:00.000Z"),
        detailsJson: JSON.stringify({ rowsProcessed: 34, issuesImported: 19 })
      }
    }),
    prisma.dataSyncJob.create({
      data: {
        seasonId: seasonCurrent.id,
        sourceSystem: SourceSystem.yandex_disk,
        jobType: "manual_assets_refresh",
        status: "processing",
        startedAt: new Date("2026-04-20T07:30:00.000Z"),
        itemsFound: 4,
        detailsJson: JSON.stringify({ clubsRequested: 4 })
      }
    }),
    prisma.dataSyncJob.create({
      data: {
        seasonId: seasonCurrent.id,
        sourceSystem: SourceSystem.vk_video,
        jobType: "broadcasts",
        status: "completed",
        startedAt: new Date("2026-04-20T06:00:00.000Z"),
        finishedAt: new Date("2026-04-20T06:04:00.000Z"),
        itemsFound: 5,
        itemsUpdated: 3,
        itemsFlagged: 1,
        detailsJson: JSON.stringify({ candidatesChecked: 5, requiresReview: 1 })
      }
    })
  ]);

  const fnlSync = syncJobs[0];
  const sheetsSync = syncJobs[1];
  const diskSync = syncJobs[2];
  const broadcastSync = syncJobs[3];

  const todayMatches = [
    {
      externalMatchId: "f1-221",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["first-league"].id,
      leagueGroupId: groupByCode.all.id,
      homeClubId: clubBySlug["arsenal-tula"].id,
      awayClubId: clubBySlug["rotor-volgograd"].id,
      stadiumId: stadiumByClubId[clubBySlug["arsenal-tula"].id].id,
      roundLabel: "27 тур",
      kickoffAt: new Date("2026-04-20T15:00:00.000Z"),
      status: "upcoming" as const,
      delegateName: "Алексей Нагорный",
      videoDelegateName: "Дмитрий Сотников",
      inspectorName: "Игорь Мельников",
      refereeName: "Павел Шадыханов"
    },
    {
      externalMatchId: "f2a-g-089",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["second-a"].id,
      leagueGroupId: groupByCode.gold.id,
      homeClubId: clubBySlug["veles-podolsk"].id,
      awayClubId: clubBySlug["leningradets-roshchino"].id,
      stadiumId: stadiumByClubId[clubBySlug["veles-podolsk"].id].id,
      roundLabel: "9 тур",
      kickoffAt: new Date("2026-04-20T12:30:00.000Z"),
      status: "live" as const,
      delegateName: "Николай Логинов",
      videoDelegateName: "Роман Чистов",
      inspectorName: "Михаил Егоров",
      refereeName: "Артем Любимов"
    },
    {
      externalMatchId: "f2a-s-140",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["second-a"].id,
      leagueGroupId: groupByCode.silver.id,
      homeClubId: clubBySlug["kuban-krasnodar"].id,
      awayClubId: clubBySlug["tyumen"].id,
      stadiumId: stadiumByClubId[clubBySlug["kuban-krasnodar"].id].id,
      roundLabel: "8 тур",
      kickoffAt: new Date("2026-04-20T09:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Владимир Колесников",
      videoDelegateName: "Евгений Румянцев",
      inspectorName: "Максим Гордеев",
      refereeName: "Антон Фролов"
    }
  ];

  const recentMatches = [
    {
      externalMatchId: "f1-216",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["first-league"].id,
      leagueGroupId: groupByCode.all.id,
      homeClubId: clubBySlug["volga-ulyanovsk"].id,
      awayClubId: clubBySlug["arsenal-tula"].id,
      stadiumId: stadiumByClubId[clubBySlug["volga-ulyanovsk"].id].id,
      roundLabel: "26 тур",
      kickoffAt: new Date("2026-04-17T16:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Сергей Чернышов",
      videoDelegateName: "Андрей Никитин",
      inspectorName: "Виталий Романов",
      refereeName: "Егор Егоров"
    },
    {
      externalMatchId: "f2a-g-084",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["second-a"].id,
      leagueGroupId: groupByCode.gold.id,
      homeClubId: clubBySlug["leningradets-roshchino"].id,
      awayClubId: clubBySlug["volgar-astrakhan"].id,
      stadiumId: stadiumByClubId[clubBySlug["leningradets-roshchino"].id].id,
      roundLabel: "8 тур",
      kickoffAt: new Date("2026-04-15T13:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Павел Гусев",
      videoDelegateName: "Кирилл Беляев",
      inspectorName: "Руслан Котов",
      refereeName: "Даниил Шеметов"
    },
    {
      externalMatchId: "f2a-s-132",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["second-a"].id,
      leagueGroupId: groupByCode.silver.id,
      homeClubId: clubBySlug["tyumen"].id,
      awayClubId: clubBySlug["kuban-krasnodar"].id,
      stadiumId: stadiumByClubId[clubBySlug["tyumen"].id].id,
      roundLabel: "7 тур",
      kickoffAt: new Date("2026-04-13T12:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Илья Давыдов",
      videoDelegateName: "Александр Гранкин",
      inspectorName: "Лев Матвеев",
      refereeName: "Петр Кукуян"
    },
    {
      externalMatchId: "f1-211",
      seasonId: seasonCurrent.id,
      leagueId: leagueByCode["first-league"].id,
      leagueGroupId: groupByCode.all.id,
      homeClubId: clubBySlug["rotor-volgograd"].id,
      awayClubId: clubBySlug["volga-ulyanovsk"].id,
      stadiumId: stadiumByClubId[clubBySlug["rotor-volgograd"].id].id,
      roundLabel: "25 тур",
      kickoffAt: new Date("2026-04-10T15:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Роман Алексеев",
      videoDelegateName: "Антон Назаров",
      inspectorName: "Владимир Орлов",
      refereeName: "Иван Сиденков"
    }
  ];

  const previousSeasonMatches = [
    {
      externalMatchId: "24-f2a-g-034",
      seasonId: seasonPrevious.id,
      leagueId: leagueByCode["second-a"].id,
      leagueGroupId: groupByCode.gold.id,
      homeClubId: clubBySlug["veles-podolsk"].id,
      awayClubId: clubBySlug["volgar-astrakhan"].id,
      stadiumId: stadiumByClubId[clubBySlug["veles-podolsk"].id].id,
      roundLabel: "15 тур",
      kickoffAt: new Date("2025-03-20T14:00:00.000Z"),
      status: "finished" as const,
      delegateName: "Андрей Титов",
      videoDelegateName: "Максим Кравцов",
      inspectorName: "Юрий Степанов",
      refereeName: "Никита Иванов"
    }
  ];

  const matchMetaByExternalId: Record<
    string,
    {
      fnlMatchUrl: string;
      broadcastUrl?: string | null;
      broadcastSource?: BroadcastSource;
      broadcastMatchMode?: BroadcastMatchMode;
      broadcastConfidence?: number | null;
      broadcastReviewReason?: string | null;
      broadcastMatchedManually?: boolean;
      broadcastLocked?: boolean;
      lastCheckedAt?: Date | null;
    }
  > = {
    "f1-221": {
      fnlMatchUrl: "https://fnl.pro/match/221",
      broadcastUrl: "https://vkvideo.ru/video-221",
      broadcastSource: BroadcastSource.vk_video,
      broadcastMatchMode: BroadcastMatchMode.auto_exact,
      broadcastConfidence: 1,
      lastCheckedAt: new Date("2026-04-20T06:04:00.000Z")
    },
    "f2a-g-089": {
      fnlMatchUrl: "https://fnl.pro/match/89",
      broadcastUrl: "https://vsporte.ru/live/89",
      broadcastSource: BroadcastSource.manual,
      broadcastMatchMode: BroadcastMatchMode.manual_confirmed,
      broadcastConfidence: 1,
      broadcastMatchedManually: true,
      broadcastLocked: true,
      lastCheckedAt: new Date("2026-04-20T06:04:00.000Z")
    },
    "f2a-s-140": {
      fnlMatchUrl: "https://fnl.pro/match/140",
      broadcastUrl: "https://video.fnl.pro/manual/140",
      broadcastSource: BroadcastSource.manual,
      broadcastMatchMode: BroadcastMatchMode.high_confidence_auto_match,
      broadcastConfidence: 0.91,
      lastCheckedAt: new Date("2026-04-20T06:04:00.000Z")
    },
    "f1-216": {
      fnlMatchUrl: "https://fnl.pro/pari/matches/6960",
      broadcastUrl: "https://vksport.vkvideo.ru/video-29484355_456251484",
      broadcastSource: BroadcastSource.manual,
      broadcastMatchMode: BroadcastMatchMode.manual_confirmed,
      broadcastConfidence: 1,
      broadcastMatchedManually: true,
      broadcastLocked: true,
      broadcastReviewReason: null,
      lastCheckedAt: new Date("2026-04-20T06:04:00.000Z")
    },
    "f2a-g-084": {
      fnlMatchUrl: "https://fnl.pro/match/84"
    },
    "f2a-s-132": {
      fnlMatchUrl: "https://fnl.pro/match/132"
    },
    "f1-211": {
      fnlMatchUrl: "https://fnl.pro/match/211"
    },
    "24-f2a-g-034": {
      fnlMatchUrl: "https://fnl.pro/match/24-034"
    }
  };

  const allMatches = [...todayMatches, ...recentMatches, ...previousSeasonMatches];
  const matches = await Promise.all(
    allMatches.map((match) => {
      const homeClub = clubs.find((club) => club.id === match.homeClubId);
      const awayClub = clubs.find((club) => club.id === match.awayClubId);
      const leagueCode = leagues.find((league) => league.id === match.leagueId)?.code ?? "unknown";
      const meta = matchMetaByExternalId[match.externalMatchId];

      return prisma.match.create({
        data: {
          ...match,
          canonicalKey: buildCanonicalMatchKey(leagueCode, match.kickoffAt, homeClub?.name ?? match.homeClubId, awayClub?.name ?? match.awayClubId),
          matchDate: toStartOfDay(match.kickoffAt),
          matchTime: formatMatchTime(match.kickoffAt),
          fnlMatchUrl: meta?.fnlMatchUrl ?? null,
          broadcastUrl: meta?.broadcastUrl ?? null,
          broadcastSource: meta?.broadcastSource ?? null,
          broadcastMatchMode: meta?.broadcastMatchMode ?? BroadcastMatchMode.none,
          broadcastConfidence: meta?.broadcastConfidence ?? null,
          broadcastReviewReason: meta?.broadcastReviewReason ?? null,
          broadcastMatchedManually: meta?.broadcastMatchedManually ?? false,
          broadcastLocked: meta?.broadcastLocked ?? false,
          lastCheckedAt: meta?.lastCheckedAt ?? null
        }
      });
    })
  );

  const matchByExternalId = Object.fromEntries(matches.map((match) => [match.externalMatchId ?? match.id, match]));

  const linksData = [
    ["f1-221", "fnl_match_page", "https://fnl.pro/match/221", true],
    ["f1-221", "direct_stream", "https://vkvideo.ru/video-221", false],
    ["f2a-g-089", "fnl_match_page", "https://fnl.pro/match/89", true],
    ["f2a-g-089", "direct_stream", "https://vsporte.ru/live/89", false],
    ["f2a-s-140", "fnl_match_page", "https://fnl.pro/match/140", true],
    ["f2a-s-140", "manual_stream", "https://video.fnl.pro/manual/140", false],
    ["f1-216", "fnl_match_page", "https://fnl.pro/match/216", true],
    ["f2a-g-084", "fnl_match_page", "https://fnl.pro/match/84", true],
    ["f2a-s-132", "fnl_match_page", "https://fnl.pro/match/132", true],
    ["f1-211", "fnl_match_page", "https://fnl.pro/match/211", true],
    ["24-f2a-g-034", "fnl_match_page", "https://fnl.pro/match/24-034", true]
  ] as const;

  await prisma.broadcastLink.createMany({
    data: linksData.map(([externalMatchId, kind, url, isPrimary]) => ({
      matchId: matchByExternalId[externalMatchId].id,
      kind,
      url,
      provider: kind === "direct_stream" ? "VK Видео" : kind === "manual_stream" ? "Ручная ссылка" : "FNL.pro",
      isPrimary
    }))
  });

  const issuesSeed = [
    {
      clubSlug: "arsenal-tula",
      seasonId: seasonCurrent.id,
      matchExternalId: "f1-216",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "26 тур",
      rawDescription: "ВК: ссылка на трансляцию была опубликована позже стартового свистка, из-за чего зрители не могли быстро перейти на эфир.",
      normalizedSummary: "Ссылка на трансляцию опубликована с опозданием.",
      status: "in_review" as const,
      createdBy: "Импорт Google Sheets",
      recurringKey: "late-stream-link",
      tags: ["vk", "match"],
      history: [
        { actionType: "created", actorName: "Импорт Google Sheets", comment: "Импорт стартовых проблем сезона." },
        { actionType: "status_changed", actorName: "Оператор ФНЛ", oldValue: "new", newValue: "in_review" }
      ]
    },
    {
      clubSlug: "arsenal-tula",
      seasonId: seasonCurrent.id,
      matchExternalId: "f1-221",
      sourceSystem: SourceSystem.manual,
      roundLabel: "27 тур",
      rawDescription: "Клуб: камера обратной съемки была смещена, пришлось оперативно переставлять позицию перед матчем.",
      normalizedSummary: "Проблема с позицией камеры обратной съемки.",
      status: "new" as const,
      createdBy: "Мария Литвинова",
      recurringKey: "camera-layout",
      tags: ["club", "match"],
      history: [{ actionType: "created", actorName: "Мария Литвинова", comment: "Добавлено вручную с матча дня." }]
    },
    {
      clubSlug: "volgar-astrakhan",
      seasonId: seasonCurrent.id,
      matchExternalId: "f2a-g-084",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "8 тур",
      rawDescription: "Интернет: во время первого тайма фиксировались повторяющиеся просадки канала, картинка переходила в низкий битрейт.",
      normalizedSummary: "Просадки интернет-канала в первом тайме.",
      status: "resolved" as const,
      createdBy: "Импорт Google Sheets",
      resolvedAt: new Date("2026-04-05T12:00:00.000Z"),
      resolvedBy: "Алексей Соколов",
      resolutionType: "оперативное исправление",
      resolutionComment: "Оператор связи увеличил резервную полосу на стадионе.",
      resolutionSource: "Письмо от клуба",
      recurringKey: "bandwidth-drop",
      tags: ["internet", "vsporte"],
      history: [
        { actionType: "created", actorName: "Импорт Google Sheets", comment: "Импорт стартовых проблем сезона." },
        { actionType: "status_changed", actorName: "Алексей Соколов", oldValue: "in_review", newValue: "resolved" }
      ]
    },
    {
      clubSlug: "rotor-volgograd",
      seasonId: seasonCurrent.id,
      matchExternalId: "f1-221",
      sourceSystem: SourceSystem.fnl_pro,
      roundLabel: "27 тур",
      rawDescription: "ФНЛ: карточка матча подтянулась без прямой ссылки на эфир, потребовалась ручная вставка ссылки оператором.",
      normalizedSummary: "Матч без прямой ссылки на трансляцию.",
      status: "new" as const,
      createdBy: "Синхронизация FNL.pro",
      recurringKey: "missing-stream-link",
      tags: ["fnl", "vk"],
      history: [{ actionType: "created", actorName: "Синхронизация FNL.pro", comment: "Автоматически создано при синхронизации матчей." }]
    },
    {
      clubSlug: "veles-podolsk",
      seasonId: seasonCurrent.id,
      matchExternalId: "f2a-g-089",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "9 тур",
      rawDescription: "Клуб: отсутствует семейный сектор и отдельная комната матери и ребенка, что повторяется в отчетах по сервису.",
      normalizedSummary: "Повторяющаяся проблема с семейным сектором и комнатой матери и ребенка.",
      status: "in_review" as const,
      createdBy: "Импорт Google Sheets",
      recurringKey: "family-zone-missing",
      tags: ["club", "match"],
      history: [{ actionType: "created", actorName: "Импорт Google Sheets", comment: "Импорт из таблицы проблем трансляций." }]
    },
    {
      clubSlug: "veles-podolsk",
      seasonId: seasonCurrent.id,
      matchExternalId: "f2a-g-084",
      sourceSystem: SourceSystem.manual,
      roundLabel: "8 тур",
      rawDescription: "Бригада: в ложе прессы не хватило рабочих мест, пришлось перераспределять питание и Wi-Fi вручную.",
      normalizedSummary: "Недостаточно оборудованных рабочих мест для бригады и прессы.",
      status: "new" as const,
      createdBy: "Евгений Миронов",
      recurringKey: "press-seats",
      tags: ["brigade", "internet"],
      history: [{ actionType: "created", actorName: "Евгений Миронов", comment: "Зафиксировано после матча." }]
    },
    {
      clubSlug: "veles-podolsk",
      seasonId: seasonPrevious.id,
      matchExternalId: "24-f2a-g-034",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "15 тур",
      rawDescription: "Кинопоиск: трансляция появилась в каталоге с задержкой, карточка матча обновилась уже после старта.",
      normalizedSummary: "Задержка публикации трансляции в Кинопоиске.",
      status: "archived" as const,
      createdBy: "Импорт Google Sheets",
      resolvedAt: new Date("2025-03-25T09:00:00.000Z"),
      resolvedBy: "Админ ФНЛ",
      resolutionType: "архив сезона",
      resolutionComment: "Проблема закрыта после завершения сезона.",
      resolutionSource: "Итоговая сверка сезона",
      recurringKey: "kinopoisk-late-card",
      tags: ["kinopoisk", "fnl"],
      history: [
        { actionType: "created", actorName: "Импорт Google Sheets", comment: "Импорт стартовых проблем сезона." },
        { actionType: "status_changed", actorName: "Админ ФНЛ", oldValue: "resolved", newValue: "archived" }
      ]
    },
    {
      clubSlug: "leningradets-roshchino",
      seasonId: seasonCurrent.id,
      matchExternalId: "f2a-g-084",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "8 тур",
      rawDescription: "Матч: на последних трех домашних матчах повторяется проблема с комментаторскими позициями и обратной связью.",
      normalizedSummary: "Хроническая проблема с комментаторскими позициями.",
      status: "in_review" as const,
      createdBy: "Импорт Google Sheets",
      recurringKey: "commentator-positions",
      tags: ["match", "brigade"],
      history: [{ actionType: "created", actorName: "Импорт Google Sheets", comment: "Проблема отмечена как повторяющаяся." }]
    },
    {
      clubSlug: "volga-ulyanovsk",
      seasonId: seasonCurrent.id,
      matchExternalId: "f1-211",
      sourceSystem: SourceSystem.google_sheets,
      roundLabel: "25 тур",
      rawDescription: "Клуб: новая инструкция по обеспечению общественного порядка и безопасности еще не подтверждена, требуется ручная проверка.",
      normalizedSummary: "Ожидается подтверждение новой инструкции по безопасности.",
      status: "in_review" as const,
      createdBy: "Импорт Google Sheets",
      recurringKey: "security-manual",
      tags: ["club", "fnl"],
      history: [{ actionType: "created", actorName: "Импорт Google Sheets", comment: "Перенесено из рабочей таблицы." }]
    },
    {
      clubSlug: "kuban-krasnodar",
      seasonId: seasonCurrent.id,
      matchExternalId: "f2a-s-132",
      sourceSystem: SourceSystem.manual,
      roundLabel: "7 тур",
      rawDescription: "ВСпорте: камера общего плана периодически теряла резкость, понадобилась ручная калибровка в перерыве.",
      normalizedSummary: "Проблема с резкостью камеры общего плана.",
      status: "resolved" as const,
      createdBy: "Антон Погодин",
      resolvedAt: new Date("2026-04-06T15:20:00.000Z"),
      resolvedBy: "Антон Погодин",
      resolutionType: "оперативное исправление",
      resolutionComment: "Сделана ручная калибровка в перерыве.",
      resolutionSource: "Чат видеоделегатов",
      recurringKey: "main-camera-focus",
      tags: ["vsporte", "match"],
      history: [
        { actionType: "created", actorName: "Антон Погодин", comment: "Добавлено вручную после матча." },
        { actionType: "status_changed", actorName: "Антон Погодин", oldValue: "in_review", newValue: "resolved" }
      ]
    }
  ];

  for (const issueSeed of issuesSeed) {
    const issue = await prisma.broadcastIssue.create({
      data: {
        clubId: clubBySlug[issueSeed.clubSlug].id,
        seasonId: issueSeed.seasonId,
        matchId: issueSeed.matchExternalId ? matchByExternalId[issueSeed.matchExternalId].id : null,
        sourceSystem: issueSeed.sourceSystem,
        sourceReference: issueSeed.matchExternalId ?? null,
        roundLabel: issueSeed.roundLabel,
        rawDescription: issueSeed.rawDescription,
        normalizedSummary: issueSeed.normalizedSummary,
        status: issueSeed.status,
        createdBy: issueSeed.createdBy,
        resolvedAt: issueSeed.resolvedAt ?? null,
        resolvedBy: issueSeed.resolvedBy ?? null,
        resolutionType: issueSeed.resolutionType ?? null,
        resolutionComment: issueSeed.resolutionComment ?? null,
        resolutionSource: issueSeed.resolutionSource ?? null,
        isRecurring: Boolean(issueSeed.recurringKey),
        recurringKey: issueSeed.recurringKey ?? null
      }
    });

    for (const [index, code] of issueSeed.tags.entries()) {
      await prisma.broadcastIssueTag.create({
        data: {
          issueId: issue.id,
          tagId: tagByCode[code].id,
          isPrimary: index === 0
        }
      });
    }

    for (const history of issueSeed.history) {
      await prisma.broadcastIssueHistory.create({
        data: {
          issueId: issue.id,
          actionType: history.actionType,
          actorName: history.actorName,
          oldValue: "oldValue" in history ? history.oldValue ?? null : null,
          newValue: "newValue" in history ? history.newValue ?? null : null,
          comment: "comment" in history ? history.comment ?? null : null
        }
      });
    }

    if (issueSeed.resolvedAt && issueSeed.resolvedBy) {
      await prisma.resolvedIssueLog.create({
        data: {
          issueId: issue.id,
          resolvedAt: issueSeed.resolvedAt,
          resolvedBy: issueSeed.resolvedBy,
          resolutionType: issueSeed.resolutionType ?? null,
          resolutionComment: issueSeed.resolutionComment ?? null,
          resolutionSource: issueSeed.resolutionSource ?? null
        }
      });
    }
  }

  const stadiumFiles = [
    {
      clubSlug: "veles-podolsk",
      kind: "camera_plan" as const,
      filename: "camera-plan-veles-2026.pdf",
      originalName: "Камплан_Велес_2026.pdf",
      filePath: "/Users/sabinakosimova/Desktop/stads/Велес инф..pdf",
      mimeType: "application/pdf",
      extractedText: "камерплан, расстановка камер, главная трибуна",
      sourceSystem: SourceSystem.yandex_disk,
      sourceUrl: "https://disk.yandex.ru/i/veles-camera-plan",
      comment: "Найден по ключевым словам камерплана",
      syncJobId: diskSync.id
    },
    {
      clubSlug: "veles-podolsk",
      kind: "gallery" as const,
      filename: "veles-tribune-photo-01.jpg",
      originalName: "Фото_трибуны_01.jpg",
      filePath: "/storage/fnl/veles/gallery/photo-01.jpg",
      mimeType: "image/jpeg",
      extractedText: null,
      sourceSystem: SourceSystem.yandex_disk,
      sourceUrl: "https://disk.yandex.ru/i/veles-photo-1",
      comment: "Фото стадиона для галереи",
      syncJobId: diskSync.id
    },
    {
      clubSlug: "volga-ulyanovsk",
      kind: "coordination" as const,
      filename: "volga-security-coordination.pdf",
      originalName: "Согласование_МВД_ФСБ_Волга.pdf",
      filePath: "/Users/sabinakosimova/Desktop/stads/Волга инф..pdf",
      mimeType: "application/pdf",
      extractedText: "согласование, инструкция безопасности",
      sourceSystem: SourceSystem.manual,
      sourceUrl: null,
      comment: "Материал по согласованию безопасности",
      syncJobId: null
    },
    {
      clubSlug: "arsenal-tula",
      kind: "camera_plan" as const,
      filename: "arsenal-camera-plan-2026.pdf",
      originalName: "Камплан_Арсенал_2026.pdf",
      filePath: "/Users/sabinakosimova/Desktop/stads/2024.09.30_Сертификат_Арсенал_Тула.pdf",
      mimeType: "application/pdf",
      extractedText: "камерплан главной трибуны",
      sourceSystem: SourceSystem.yandex_disk,
      sourceUrl: "https://disk.yandex.ru/i/arsenal-camera-plan",
      comment: "Подтянуто вручную из клубной папки",
      syncJobId: diskSync.id
    }
  ];

  for (const file of stadiumFiles) {
    const club = clubBySlug[file.clubSlug];
    const stadium = stadiumByClubId[club.id];

    await prisma.stadiumFile.create({
      data: {
        clubId: club.id,
        stadiumId: stadium.id,
        syncJobId: file.syncJobId,
        kind: file.kind,
        sourceSystem: file.sourceSystem,
        filename: file.filename,
        originalName: file.originalName,
        filePath: file.filePath,
        mimeType: file.mimeType,
        extractedText: file.extractedText,
        sourceUrl: file.sourceUrl,
        comment: file.comment
      }
    });
  }

  const filesForRemarks = await prisma.stadiumFile.findMany();
  const fileByClubSlug = Object.fromEntries(
    filesForRemarks.map((file) => [
      Object.keys(clubBySlug).find((clubSlug) => clubBySlug[clubSlug].id === file.clubId) ?? file.id,
      file
    ])
  );

  const stadiumRemarks = [
    {
      clubSlug: "veles-podolsk",
      tagCode: null,
      rawText: "Отсутствует отдельный семейный сектор и оборудованная комната матери и ребенка.",
      normalizedText: "Организовать отдельный семейный сектор и комнату матери и ребенка.",
      status: "confirmed" as const
    },
    {
      clubSlug: "veles-podolsk",
      tagCode: null,
      rawText: "Отсутствует онлайн-сервис заказа и доставки еды на место на стадионе.",
      normalizedText: "Организовать онлайн-сервис заказа и доставки еды на место.",
      status: "draft" as const
    },
    {
      clubSlug: "volga-ulyanovsk",
      tagCode: null,
      rawText: "Оформить и согласовать с территориальными органами МВД и ФСБ новую инструкцию по обеспечению общественного порядка и безопасности.",
      normalizedText: "Оформить новую инструкцию безопасности и согласовать ее с МВД и ФСБ.",
      status: "confirmed" as const
    },
    {
      clubSlug: "arsenal-tula",
      tagCode: null,
      rawText: "Требуется оборудовать рабочие места комментаторов.",
      normalizedText: "Оборудовать рабочие места комментаторов в соответствии с требованиями ФНЛ.",
      status: "draft" as const
    }
  ];

  for (const remark of stadiumRemarks) {
    const club = clubBySlug[remark.clubSlug];
    const stadium = stadiumByClubId[club.id];

    await prisma.stadiumRemark.create({
      data: {
        stadiumId: stadium.id,
        sourceFileId: fileByClubSlug[remark.clubSlug]?.id ?? null,
        tagId: remark.tagCode ? tagByCode[remark.tagCode].id : null,
        rawText: remark.rawText,
        normalizedText: remark.normalizedText,
        status: remark.status,
        sourceSystem: SourceSystem.manual
      }
    });
  }

  await prisma.externalSourceSnapshot.createMany({
    data: [
      {
        seasonId: seasonCurrent.id,
        syncJobId: fnlSync.id,
        sourceSystem: SourceSystem.fnl_pro,
        entityType: "match",
        externalKey: "f1-221",
        payloadJson: JSON.stringify({
          league: "Первая лига",
          match: "Арсенал - Ротор",
          delegate: "Алексей Нагорный"
        })
      },
      {
        seasonId: seasonCurrent.id,
        syncJobId: sheetsSync.id,
        sourceSystem: SourceSystem.google_sheets,
        entityType: "issue_cell",
        externalKey: "Велес!H9",
        payloadJson: JSON.stringify({
          club: "Велес",
          round: "9 тур",
          text: "Отсутствует семейный сектор"
        })
      },
      {
        seasonId: seasonCurrent.id,
        syncJobId: diskSync.id,
        sourceSystem: SourceSystem.yandex_disk,
        entityType: "stadium_asset",
        externalKey: "veles-camera-plan",
        payloadJson: JSON.stringify({
          club: "Велес",
          kind: "camera_plan",
          filename: "Камплан_Велес_2026.pdf"
        })
      },
      {
        seasonId: seasonCurrent.id,
        syncJobId: broadcastSync.id,
        sourceSystem: SourceSystem.vk_video,
        entityType: "broadcast_candidate",
        externalKey: "vk-first-221",
        payloadJson: JSON.stringify({
          title: "Арсенал — Ротор | 27 тур",
          url: "https://vkvideo.ru/video-221",
          matchedTo: "f1-221"
        })
      },
      {
        seasonId: seasonCurrent.id,
        syncJobId: broadcastSync.id,
        sourceSystem: SourceSystem.vk_video,
        entityType: "broadcast_candidate",
        externalKey: "vk-first-216-delayed",
        payloadJson: JSON.stringify({
          title: "Волга — Арсенал | трансляция матча",
          url: "https://vksport.vkvideo.ru/video-29484355_456251484",
          matchedTo: "f1-216"
        })
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
