import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { authTokenStore } from '../datasources/authTokenStore';
import {
  AgendaExportFormat,
  reportApi,
  ReportFilterParams,
} from '../datasources/reportApi';

const FALLBACK_EXTENSIONS: Record<AgendaExportFormat, string> = {
  pdf: 'pdf',
  word: 'docx',
  csv: 'csv',
};

const FALLBACK_MIMES: Record<AgendaExportFormat, string> = {
  pdf: 'application/pdf',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
};

const IOS_UTIS: Record<AgendaExportFormat, string> = {
  pdf: 'com.adobe.pdf',
  word: 'org.openxmlformats.wordprocessingml.document',
  csv: 'public.comma-separated-values-text',
};

function getHeaderIgnoreCase(
  headers: Record<string, string> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
}

function parseFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let candidate = plain;
  if (encoded) {
    try {
      candidate = decodeURIComponent(encoded);
    } catch {
      candidate = plain;
    }
  }
  const clean = candidate?.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return clean || null;
}

function normalizeMimeType(rawContentType: string | null, fallbackMime: string): string {
  if (!rawContentType) return fallbackMime;
  const bare = rawContentType.split(';')[0]?.trim().toLowerCase();
  return bare || fallbackMime;
}

async function extractErrorMessage(fileUri: string, status: number): Promise<string> {
  try {
    const raw = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed?.message === 'string' && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    // Non-JSON error body
  }

  const fallback: Record<number, string> = {
    401: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.',
    403: 'Anda tidak memiliki izin untuk mengunduh dokumen ini.',
    404: 'Dokumen ekspor tidak ditemukan di server.',
    429: 'Terlalu banyak permintaan ekspor. Coba lagi beberapa saat lagi.',
  };
  return fallback[status] ?? `Gagal mengunduh berkas (HTTP ${status}).`;
}

export class AgendaExportRepository {
  private async downloadBinaryAndShare(
    url: string,
    options: {
      format: AgendaExportFormat;
      fallbackFilename: string;
      dialogTitle: string;
    },
  ): Promise<string> {
    const directory = FileSystem.cacheDirectory;
    if (!directory) {
      throw new Error('Penyimpanan sementara perangkat tidak tersedia.');
    }

    const token = await authTokenStore.get();
    const tempUri = `${directory}tmp_export_${Date.now()}_${Math.floor(Math.random() * 1000)}.${
      FALLBACK_EXTENSIONS[options.format]
    }`;

    const result = await FileSystem.downloadAsync(url, tempUri, {
      headers: {
        Accept: '*/*',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (result.status < 200 || result.status >= 300) {
      if (result.status === 401) {
        await authTokenStore.handleUnauthorized();
      }
      const message = await extractErrorMessage(result.uri, result.status);
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
      throw new Error(message);
    }

    const headerFilename = parseFilenameFromDisposition(
      getHeaderIgnoreCase(result.headers, 'content-disposition'),
    );
    const rawContentType = getHeaderIgnoreCase(result.headers, 'content-type');
    const mimeType = normalizeMimeType(rawContentType, FALLBACK_MIMES[options.format]);

    let finalName = (headerFilename || options.fallbackFilename).replace(
      /[\\/:*?"<>|\u0000-\u001f]/g,
      '_',
    );
    if (mimeType === 'text/html' && finalName.toLowerCase().endsWith('.pdf')) {
      finalName = `${finalName.slice(0, -4)}.html`;
    }

    const finalUri = `${directory}${finalName}`;
    if (finalUri !== result.uri) {
      await FileSystem.deleteAsync(finalUri, { idempotent: true }).catch(() => {});
      await FileSystem.moveAsync({ from: result.uri, to: finalUri });
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Fitur berbagi file tidak tersedia pada perangkat ini.');
    }

    await Sharing.shareAsync(finalUri, {
      mimeType: mimeType === 'text/html' ? 'text/html' : mimeType,
      UTI: mimeType === 'text/html' ? 'public.html' : IOS_UTIS[options.format],
      dialogTitle: options.dialogTitle,
    });

    return finalName;
  }

  async downloadAndShare(agendaId: string, format: AgendaExportFormat): Promise<string> {
    const url = reportApi.exportAgendaUrl(agendaId, format);
    return this.downloadBinaryAndShare(url, {
      format,
      fallbackFilename: `SIPERAPAT_agenda-${agendaId}.${FALLBACK_EXTENSIONS[format]}`,
      dialogTitle: 'Bagikan ekspor agenda',
    });
  }

  async downloadSummaryCsvAndShare(filters?: ReportFilterParams): Promise<string> {
    const url = reportApi.exportSummaryCsvUrl(filters);
    const today = new Date().toISOString().slice(0, 10);
    return this.downloadBinaryAndShare(url, {
      format: 'csv',
      fallbackFilename: `SIPERAPAT_rekap-laporan-${today}.csv`,
      dialogTitle: 'Bagikan Rekapitulasi Laporan CSV',
    });
  }
}
