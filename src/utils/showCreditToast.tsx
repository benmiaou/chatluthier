import { notifications } from '@mantine/notifications';
import { SETTINGS } from '../constants/settings';

/**
 * Show a credit attribution toast with the HTML credit string from the JSON data.
 * Auto-closes after 10 s. Deduplicates by sound name.
 */
export function showCreditToast(soundName: string, creditHtml: string): void {
  notifications.show({
    id: `credit-${soundName}`,
    title: soundName,
    message: (
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.4,
          pointerEvents: 'auto', // Allow clicks on links
        }}
      >
        {creditHtml}
      </div>
    ),
    autoClose: 10_000,
    withCloseButton: true,
    color: 'dark',
    position: 'top-right',
    style: {
      top: SETTINGS.HEADER_HEIGHT + SETTINGS.HEADER_PADDING,
      zIndex: 100, // Explicit z-index for credit toasts
    },
    classNames: {
      root: 'credit-toast',
      notification: 'credit-notification',
    },
  });
}
