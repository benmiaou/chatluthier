import { notifications } from '@mantine/notifications';
import { SETTINGS } from '../constants/settings';

/**
 * Queue for credit notifications on mobile to avoid overlap
 */
const creditQueue: Array<{ soundName: string; creditHtml: string; resolve: () => void }> = [];
let isShowingCredit = false;

/**
 * Show a credit attribution toast with the HTML credit string from the JSON data.
 * On mobile: displays one at a time at bottom, faster auto-close
 * On desktop: displays normally at top-right
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

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 48em)').matches;

  if (isMobile) {
    // Mobile: Queue notifications to show one at a time
    const item = {
      soundName,
      creditHtml: fixedCredit,
      resolve: () => {
        isShowingCredit = false;
        // Process next item in queue
        if (creditQueue.length > 0) {
          const next = creditQueue.shift();
          if (next) {
            isShowingCredit = true;
            showMobileCreditToast(next.soundName, next.creditHtml, next.resolve);
          }
        }
      },
    };

    if (isShowingCredit) {
      // Add to queue
      creditQueue.push(item);
    } else {
      // Show immediately
      isShowingCredit = true;
      showMobileCreditToast(soundName, fixedCredit, item.resolve);
    }
  } else {
    // Desktop: Show normally
    showDesktopCreditToast(soundName, fixedCredit);
  }
}

function showMobileCreditToast(soundName: string, creditHtml: string, onClose: () => void): void {
  notifications.show({
    id: `credit-mobile-${soundName}`,
    title: soundName,
    message: (
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.3,
          pointerEvents: 'auto',
          maxWidth: 'calc(100vw - 40px)',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
        }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: creditHtml }}
      />
    ),
    autoClose: 4000, // Faster on mobile
    withCloseButton: false,
    color: 'dark',
    position: 'bottom',
    style: {
      bottom: 20,
      left: 20,
      right: 20,
      maxWidth: 'calc(100vw - 40px)',
      zIndex: 200,
    },
    classNames: {
      root: 'credit-toast-mobile',
      notification: 'credit-notification-mobile',
      title: 'credit-toast-title-mobile',
    },
    onClose: () => {
      onClose();
      notifications.clean();
    },
  });
}

function showDesktopCreditToast(soundName: string, creditHtml: string): void {
  notifications.show({
    id: `credit-desktop-${soundName}`,
    title: soundName,
    message: (
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.4,
          pointerEvents: 'auto',
          maxWidth: 350,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
        }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: creditHtml }}
      />
    ),
    autoClose: 8000,
    withCloseButton: true,
    color: 'dark',
    position: 'top-right',
    style: {
      top: SETTINGS.HEADER_HEIGHT + SETTINGS.HEADER_PADDING,
      zIndex: 100,
    },
    classNames: {
      root: 'credit-toast',
      notification: 'credit-notification',
      title: 'credit-toast-title',
    },
  });
}

/**
 * Clear all credit notifications
 */
export function clearCreditToasts(): void {
  notifications.clean();
  creditQueue.length = 0;
  isShowingCredit = false;
}
