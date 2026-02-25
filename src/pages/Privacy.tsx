import { Container, Title, Text, Paper, Anchor, Button, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function Privacy() {
  const navigate = useNavigate();
  
  return (
    <Container size="md" py="xl">
      <Paper p="xl" radius="md">
        <Group justify="space-between" mb="xl">
          <Title order={1} ta="center" mb="sm" style={{ flex: 1 }}>
            Privacy Policy
          </Title>
          <Button variant="subtle" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </Group>
        <Title order={1} ta="center" mb="sm">
          Privacy Policy
        </Title>
        <Text ta="center" c="dimmed" fs="italic" mb="md">
          Last updated: 26/10/2024
        </Text>

        <Title order={2} mb="sm">Introduction</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          Your privacy is important to us. This policy explains what personal data we collect and how
          we use it.
        </Text>

        <Title order={2} mb="sm">Information We Collect</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          We collect your username and password when you create an account. We do not collect any
          other personal information.
        </Text>

        <Title order={2} mb="sm">How We Use Your Information</Title>
        <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
          Your username and password are used solely to authenticate your access to our application.
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
