import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'unavailable' | 'failed';

/** Write a CSV to the cache directory and open the system share sheet. */
export async function shareCsv(fileName: string, csv: string, dialogTitle: string): Promise<ShareResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return 'unavailable';
    }
    const file = new File(Paths.cache, fileName);
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle,
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
