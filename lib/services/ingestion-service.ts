import { FnlProAdapter } from "@/lib/services/fnl-pro.adapter";
import { GoogleSheetsAdapter } from "@/lib/services/google-sheets.adapter";
import { VkVideoAdapter } from "@/lib/services/vk-video.adapter";
import { YandexDiskAdapter } from "@/lib/services/yandex-disk.adapter";

export class IngestionService {
  private readonly fnlAdapter = new FnlProAdapter();
  private readonly vkAdapter = new VkVideoAdapter();
  private readonly sheetsAdapter = new GoogleSheetsAdapter();
  private readonly diskAdapter = new YandexDiskAdapter();

  async previewSources() {
    const [clubs, matches, vkCandidates, sheetIssues, diskAssets] = await Promise.all([
      this.fnlAdapter.fetchClubs(),
      this.fnlAdapter.fetchMatches(),
      this.vkAdapter.fetchBroadcastCandidates(),
      this.sheetsAdapter.importInitialIssues(),
      this.diskAdapter.refreshClubAssets()
    ]);

    return {
      fnlPro: {
        clubs,
        matches
      },
      vkVideo: {
        candidates: vkCandidates
      },
      googleSheets: {
        issues: sheetIssues
      },
      yandexDisk: {
        assets: diskAssets
      }
    };
  }
}
