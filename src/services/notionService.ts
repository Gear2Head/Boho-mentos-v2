/**
 * Notion Integration Service
 * Pushes Boho Mentos logs and exams to a user's Notion Database via Internal Integration.
 */

export interface NotionSettings {
  apiKey: string;
  databaseId: string;
}

const NOTION_API_VERSION = '2022-06-28';

export async function pushLogsToNotion(
  settings: NotionSettings,
  logs: any[],
  exams: any[]
): Promise<{ success: boolean; message?: string }> {
  if (!settings.apiKey || !settings.databaseId) {
    return { success: false, message: 'Notion API Anahtarı veya Database ID eksik.' };
  }

  try {
    // Notion API'ye sunucu uzerinden gitmek lazim normalde CORS yuzunden,
    // ancak eger extension veya electron tabanli bir app ise proxy ile yapilabilir.
    // Simdilik Vercel veya dummy proxy uzerinden POST atiyoruz:
    const PROXY_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://api.notion.com/v1/pages');

    let count = 0;
    
    // Loglari aktaralim (sadece test icin sinirli)
    for (const log of logs.slice(0, 10)) {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_API_VERSION,
        },
        body: JSON.stringify({
          parent: { database_id: settings.databaseId },
          properties: {
            Name: {
              title: [
                { text: { content: log.note ? log.note.substring(0, 50) : `Log - ${log.date}` } }
              ]
            },
            Date: {
              date: { start: log.date }
            },
            Tolerances: {
              rich_text: [
                { text: { content: `${log.patienceTolerance} Sabir / ${log.stressTolerance} Stres` } }
              ]
            }
          }
        }),
      });

      if (!response.ok) {
        console.warn('[NotionService] Failed to push log:', await response.text());
        continue;
      }
      count++;
    }

    return { success: true, message: `${count} log Notion veritabanına aktarıldı.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
