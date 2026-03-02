import { Modal, ScrollArea, Title, Text, List, Anchor } from '@mantine/core';
import React from 'react';

export function AboutModal({ opened, onClose }: { opened: boolean; onClose: () => void }): React.ReactElement {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="About Le Chat Luthier"
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
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            Welcome to <strong>Le Chat Luthier</strong>, your immersive sound companion for
            enhancing role-playing games, storytelling sessions, or any experience that benefits
            from atmospheric audio. Our platform offers a rich collection of background music,
            ambiance sounds, and a versatile soundboard to bring your narratives to life.
          </Text>

          <Title order={2} mb="sm">
            Our Mission
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            At Le Chat Luthier, we believe in the power of sound to transform experiences. Our
            mission is to provide an easy-to-use platform where game masters, storytellers, and
            enthusiasts can access audio to elevate their sessions.
          </Text>

          <Title order={2} mb="sm">
            Features
          </Title>
          <List mb="md" spacing="xs">
            <List.Item>
              <strong>Background Music:</strong> Choose from various themes like calm, dynamic, or
              intense to match the scene&apos;s mood.
            </List.Item>
            <List.Item>
              <strong>Ambiance Sounds:</strong> Layer ambient noises to create immersive
              environments.
            </List.Item>
            <List.Item>
              <strong>Soundboard:</strong> Access a library of sound effects to enhance storytelling
              moments.
            </List.Item>
            <List.Item>
              <strong>Customizable Playlists:</strong> Create and edit your own sound sets
              (available upon login).
            </List.Item>
            <List.Item>
              <strong>Real-Time Collaboration:</strong> Synchronize audio with remote players via
              shared sessions.
            </List.Item>
          </List>

          <Title order={2} mb="sm">
            Credits and Licensing
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            All sounds on our platform are under Creative Commons licenses. Every time a sound is
            played, credits are shown to acknowledge the talented creators who made them available.
          </Text>

          <Title order={2} mb="sm">
            Why &quot;Le Chat Luthier&quot;?
          </Title>
          <Text mb="md" style={{ textAlign: 'justify', lineHeight: 1.7 }}>
            The name translates to &quot;The Luthier Cat&quot; in French. A luthier is a craftsman who builds
            or repairs string instruments. Our platform aims to be the artisan of audio experiences
            &mdash; crafting the perfect soundscape for your adventures.
          </Text>

          <Title order={2} mb="sm">
            Get Started
          </Title>
          <Text mb="md" style={{ lineHeight: 1.7 }}>
            No registration is required to use the basic features. For advanced options like editing
            sounds and saving custom playlists, please create an account with a username and
            password.
          </Text>

          <Title order={2} mb="sm">
            Contact Us
          </Title>
          <Text style={{ lineHeight: 1.7 }}>
            Have questions or feedback? Reach out at{' '}
            <Anchor href="mailto:support@chatluthier.org">support@chatluthier.org</Anchor>.
          </Text>
        </div>
      </ScrollArea>
    </Modal>
  );
}
