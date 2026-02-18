import { Avatar, Group, Menu, Text } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

export function GoogleLoginButton() {
  const { isSignedIn, userName, userPicture, signOut, renderButton } = useAuthContext();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSignedIn && containerRef.current) {
      renderButton(containerRef.current);
    }
  }, [isSignedIn, renderButton]);

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

  return <div ref={containerRef} />;
}
