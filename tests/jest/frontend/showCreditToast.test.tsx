/**
 * showCreditToast utility tests
 */

import { showCreditToast } from '../../../src/utils/showCreditToast';

// Mock Mantine notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
  },
}));

jest.mock('../../../src/constants/settings', () => ({
  SETTINGS: {
    HEADER_HEIGHT: 50,
    HEADER_PADDING: 10,
  },
}));

import { notifications } from '@mantine/notifications';

describe('showCreditToast utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display credit toast with sound name', () => {
    showCreditToast('soundName', '<p>Credit text</p>');

    expect(notifications.show).toHaveBeenCalled();
    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.id).toBe('credit-soundName');
    expect(call.title).toBe('soundName');
  });

  it('should add security attributes to links', () => {
    const creditHtml = '<a href="https://example.com">Link</a>';
    showCreditToast('sound1', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('target="_blank"');
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('rel="noopener noreferrer"');
  });

  it('should wrap unwrapped text in paragraph', () => {
    const creditText = 'Plain text credit';
    showCreditToast('sound2', creditText);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('<p class="attribution">');
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('Plain text credit');
  });

  it('should not wrap already wrapped content', () => {
    const creditHtml = '<div>Already wrapped</div>';
    showCreditToast('sound3', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    const html = message.props['dangerouslySetInnerHTML'].__html;
    // Should not have double wrapping
    expect(html).not.toContain('<p class="attribution"><div>');
  });

  it('should set 10 second auto-close timeout', () => {
    showCreditToast('sound4', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.autoClose).toBe(10_000);
  });

  it('should show close button', () => {
    showCreditToast('sound5', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.withCloseButton).toBe(true);
  });

  it('should set dark color', () => {
    showCreditToast('sound6', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.color).toBe('dark');
  });

  it('should position toast at top-right', () => {
    showCreditToast('sound7', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.position).toBe('top-right');
  });

  it('should set correct z-index', () => {
    showCreditToast('sound8', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.style.zIndex).toBe(100);
  });

  it('should set top style based on header settings', () => {
    showCreditToast('sound9', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    // HEADER_HEIGHT (50) + HEADER_PADDING (10) = 60
    expect(call.style.top).toBe(60);
  });

  it('should apply custom CSS classes', () => {
    showCreditToast('sound10', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.classNames).toEqual({
      root: 'credit-toast',
      notification: 'credit-notification',
    });
  });

  it('should handle multiple links in credit', () => {
    const creditHtml = '<a href="url1">Link1</a> and <a href="url2">Link2</a>';
    showCreditToast('sound11', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    const html = message.props['dangerouslySetInnerHTML'].__html;
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
  });

  it('should deduplicate by sound name', () => {
    showCreditToast('sound12', '<p>Credit 1</p>');
    showCreditToast('sound12', '<p>Credit 2</p>');

    // Both should use same ID (credit-sound12) - dedupe happens in Mantine
    const calls = (notifications.show as jest.Mock).mock.calls;
    expect(calls[0][0].id).toBe('credit-sound12');
    expect(calls[1][0].id).toBe('credit-sound12');
  });

  it('should enable pointer events for click on links', () => {
    showCreditToast('sound13', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props.style.pointerEvents).toBe('auto');
  });

  it('should set correct font size and line height', () => {
    showCreditToast('sound14', '<p>Credit</p>');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props.style.fontSize).toBe(11);
    expect(message.props.style.lineHeight).toBe(1.4);
  });

  it('should handle special characters in credit', () => {
    const creditHtml = '<p>&copy; 2024 &mdash; All rights reserved</p>';
    showCreditToast('sound15', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('&copy;');
  });

  it('should handle HTML entities in URLs', () => {
    const creditHtml = '<a href="https://example.com?param=value&other=123">Link</a>';
    showCreditToast('sound16', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    const html = message.props['dangerouslySetInnerHTML'].__html;
    expect(html).toContain('target="_blank"');
    expect(html).toContain('param=value&other=123');
  });

  it('should handle complex nested HTML', () => {
    const creditHtml = '<div><p>Text <strong>bold</strong> <a href="url">link</a></p></div>';
    showCreditToast('sound17', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('<strong>bold</strong>');
  });

  it('should handle empty credit string', () => {
    showCreditToast('sound18', '');

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.id).toBe('credit-sound18');
    expect(notifications.show).toHaveBeenCalled();
  });

  it('should handle very long credit HTML', () => {
    const longCredit = `<p>${'A'.repeat(10000)}</p>`;
    showCreditToast('sound19', longCredit);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    expect(call.id).toBe('credit-sound19');
    expect(notifications.show).toHaveBeenCalled();
  });

  it('should preserve existing target attributes', () => {
    const creditHtml = '<a href="url" target="_blank">Already targeted</a>';
    showCreditToast('sound20', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    // Should replace existing target
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('target="_blank"');
  });

  it('should handle links with fragment identifiers', () => {
    const creditHtml = '<a href="https://example.com#section">Link</a>';
    showCreditToast('sound21', creditHtml);

    const call = (notifications.show as jest.Mock).mock.calls[0][0];
    const message = call.message as React.ReactElement;
    expect(message.props['dangerouslySetInnerHTML'].__html).toContain('#section');
  });
});
