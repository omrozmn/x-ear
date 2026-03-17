import { createFileRoute } from '@tanstack/react-router';
import PartySegmentsSettings from '../../pages/settings/PartySegmentsSettings';

export const Route = createFileRoute('/settings/parties')({
  component: PartySegmentsSettings,
});
// trigger route generation
