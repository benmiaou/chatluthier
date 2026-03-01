import { notifications } from '@mantine/notifications';
import { SETTINGS } from '../constants/settings';

/**
 * Show a credit attribution toast with the HTML credit string from the JSON data.
 * Auto-closes after 10 s. Deduplicates by sound name.
 */
export function showCreditToast(soundName: string, creditHtml: string) {
  notifications.show({
    id: `credit-${soundName}`,
    title: soundName,
    message: (
      <span
        style={{ fontSize: 11, lineHeight: 1.4 }}
        dangerouslySetInnerHTML={{ __html: creditHtml }}
      />
    ),
    autoClose: 10_000,
    withCloseButton: true,
    color: 'dark',
    position: 'top-right',
    style: { top: SETTINGS.HEADER_HEIGHT + SETTINGS.HEADER_PADDING },
  });
}
