import { Container, Title, Text, Paper, Anchor } from '@mantine/core';

export function Privacy() {
  return (
    <Container size="md" py="xl">
      <Paper p="xl" radius="md">
        <Title order={1} ta="center" mb="sm">
          Privacy Policy
        </Title>
        <Text ta="center" c="dimmed" fs="italic" mb="xl">
          Last updated: 26/10/2024
        </Text>

        <Title order={2} mb="sm">Introduction</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          Your privacy is important to us. This policy explains what personal data we collect and how
          we use it.
        </Text>

        <Title order={2} mb="sm">Information We Collect</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          We collect your Google user ID when you log in using Google OAuth. We do not collect any
          other personal information.
        </Text>

        <Title order={2} mb="sm">How We Use Your Information</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          Your Google user ID is used solely to authenticate your access to our application.
        </Text>

        <Title order={2} mb="sm">Data Security</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          We implement security measures to protect your personal data from unauthorized access.
        </Text>

        <Title order={2} mb="sm">Contact Us</Title>
        <Text style={{ lineHeight: 1.7 }}>
          If you have questions about this Privacy Policy, please contact us at{' '}
          <Anchor href="mailto:support@chatluthier.org">support@chatluthier.org</Anchor>.
        </Text>
      </Paper>
    </Container>
  );
}
