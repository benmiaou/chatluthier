import { Modal, ScrollArea, Text, Anchor, Title } from '@mantine/core';
import React from 'react';

export function PrivacyModal({
  opened,
  onClose,
}: Readonly<{
  opened: boolean;
  onClose: () => void;
}>): React.JSX.Element {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Privacy Policy"
      size="xl"
      styles={{
        root: {
          '--modal-width': '70%',
          '--modal-max-width': '700px',
        },
        content: {
          width: 'var(--modal-width)',
          maxWidth: 'var(--modal-max-width)',
          height: '90vh',
          maxHeight: '90vh',
          margin: 'auto',
        },
      }}
    >
      <ScrollArea style={{ height: 'calc(90vh - 120px)' }}>
        <div style={{ padding: '0 1rem' }}>
          <Text ta="center" c="dimmed" fs="italic" mb="md">
            Last updated: 26/10/2024
          </Text>

          <Title order={2} mb="sm">
            Introduction
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            Your privacy is important to us. This policy explains what personal data we collect and
            how we use it.
          </Text>

          <Title order={2} mb="sm">
            Information We Collect
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            We collect your username and password when you create an account. We do not collect any
            other personal information.
          </Text>

          <Title order={2} mb="sm">
            How We Use Your Information
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            Your username and password are used solely to authenticate your access to our
            application.
          </Text>

          <Title order={2} mb="sm">
            Data Security
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            We implement security measures to protect your personal data from unauthorized access.
          </Text>

          <Title order={2} mb="sm">
            Contact Us
          </Title>
          <Text style={{ lineHeight: 1.7 }}>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <Anchor href="mailto:support@chatluthier.org">support@chatluthier.org</Anchor>.
          </Text>
        </div>
      </ScrollArea>
    </Modal>
  );
}
