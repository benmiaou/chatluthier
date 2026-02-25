import { Group, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { AuthButtons } from '../auth/AuthButtons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDisclosure } from '@mantine/hooks';
import { RequestSoundModal } from '../modals/RequestSoundModal';
import { EditSoundsModal } from '../modals/EditSoundsModal';

export function AppHeader() {
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [requestOpened, { open: openRequest, close: closeRequest }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  return (
    <>
      <Group h="100%" px="md" justify="space-between" wrap="nowrap" style={{ backgroundColor: 'var(--main-background-color)' }}>
        {/* Logo + Title on the left */}
        <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img
            src="/images/favicons/MainLogo.PNG"
            alt="Le Chat Luthier"
            style={{ height: 42, width: 'auto' }}
          />
          <Text fw={700} size="xl" visibleFrom="sm" style={{ color: 'var(--main-text)' }}>
            Le Chat Luthier
          </Text>
        </Group>

        {/* Center area for action buttons */}
        <Group gap="sm" visibleFrom="sm">
          {userId && <Button variant="outline" size="xs" onClick={openRequest}>Request Sound</Button>}
          {userId && <Button variant="outline" size="xs" onClick={openEdit}>Edit Sounds</Button>}
        </Group>

        {/* Auth buttons on the right */}
        <AuthButtons />
      </Group>
      
      {/* Modals for header actions */}
      <RequestSoundModal opened={requestOpened} onClose={closeRequest} userId={userId} />
      <EditSoundsModal opened={editOpened} onClose={closeEdit} userId={userId} />
    </>
  );
}
