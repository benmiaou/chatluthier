import { Avatar, Group, Menu, Text, Button } from '@mantine/core';
import { IconLogout, IconBrandGoogle } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

export function GoogleLoginButton() {
  const { isSignedIn, userName, userPicture, signOut } = useAuthContext();

  useEffect(() => {
    // Initialize Google Identity Services
    const initGoogle = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      if (google?.accounts?.id) {
        // Google is ready, but we don't render the button - we use our own
      } else {
        // Google not ready yet, try again shortly
        const interval = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const google = (window as any).google;
          if (google?.accounts?.id) {
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    };
    
    if (!isSignedIn) {
      initGoogle();
    }
  }, [isSignedIn]);

  if (isSignedIn) {
    return (
      <Menu withinPortal position="bottom-end">
        <Menu.Target>
          <Group gap="xs" style={{ cursor: 'pointer' }}>
            {userPicture ? (
              <Avatar src={userPicture} size="sm" radius="xl" />
            ) : (
              <Avatar size="sm" radius="xl">{userName?.[0]}</Avatar>
            )}
            <Text size="sm" visibleFrom="sm">
              {userName}
            </Text>
          </Group>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={signOut}>
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Button
      leftSection={<IconBrandGoogle size={16} />}
      variant="default"
      size="compact-sm"
      style={{ height: '36px' }}
      onClick={() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.prompt();
        }
      }}
    >
      Sign in
    </Button>
  );
}
