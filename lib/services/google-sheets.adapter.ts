export type GoogleSheetIssueCell = {
  league: string;
  group: string | null;
  clubName: string;
  roundLabel: string;
  rawDescription: string;
};

export class GoogleSheetsAdapter {
  async importInitialIssues(): Promise<GoogleSheetIssueCell[]> {
    return [
      {
        league: "Вторая лига А",
        group: "Золото",
        clubName: "Велес",
        roundLabel: "9 тур",
        rawDescription: "Отсутствует семейный сектор и отдельная комната матери и ребенка."
      }
    ];
  }
}
