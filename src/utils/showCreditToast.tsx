import { notifications } from '@mantine/notifications';
import { SETTINGS } from '../constants/settings';

/**
 * Show a credit attribution toast with the HTML credit string from the JSON data.
 * Auto-closes after 10 s. Deduplicates by sound name.
 */
export function showCreditToast(soundName: string, _creditHtml: string): void {
  // Fix HTML by adding missing security attributes to links and proper structure
  let fixedCredit = _creditHtml.replaceAll(
    /<a\s+href="([^"]+)">/g,
    '<a target="_blank" rel="noopener noreferrer" href="$1">'
  );

  // Wrap content in proper HTML structure if not already wrapped
  if (!fixedCredit.startsWith('<p') && !fixedCredit.startsWith('<div')) {
    fixedCredit = `<p class="attribution">${fixedCredit}</p>`;
  }

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
        // dangerouslySetInnerHTML is safe here because we control the HTML source
        // and sanitize it by adding security attributes to all links
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: fixedCredit }}
      />
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
