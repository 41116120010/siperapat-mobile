import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { reportApi, AgendaExportFormat } from '../datasources/reportApi';

const fallbackExtensions: Record<AgendaExportFormat, string> = { pdf: 'pdf', word: 'docx', csv: 'csv' };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Respons ekspor tidak dapat dibaca.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Format berkas hasil ekspor tidak valid.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export class AgendaExportRepository {
  async downloadAndShare(agendaId: string, format: AgendaExportFormat): Promise<string> {
    const result = await reportApi.exportAgenda(agendaId, format);
    const directory = FileSystem.cacheDirectory;
    if (!directory) throw new Error('Penyimpanan sementara perangkat tidak tersedia.');
    const filename = result.filename || `SIPERAPAT_agenda-${agendaId}.${fallbackExtensions[format]}`;
    const safeFilename = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    const uri = `${directory}${safeFilename}`;
    const base64 = await blobToBase64(result.blob);
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur berbagi file tidak tersedia pada perangkat ini.');
    await Sharing.shareAsync(uri, { mimeType: result.contentType ?? undefined, dialogTitle: 'Bagikan ekspor agenda' });
    return safeFilename;
  }
}
