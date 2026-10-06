import { m } from '@orbs/i18n/client';
import { MemoryPanel } from '@/components/memory/memory-panel';
import { SettingsOrganizationForm } from '@/components/settings/settings-organization-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { OrganizationSettings } from '@orbs/server/client';

interface SettingsOrganizationDialogProps {
  settings: OrganizationSettings;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SettingsOrganizationDialog({ settings, onOpenChange, onSaved }: SettingsOrganizationDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] grid-cols-1 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.settings_organization()}</DialogTitle>
          <DialogDescription>{m.settings_organization_hint()}</DialogDescription>
        </DialogHeader>
        <SettingsOrganizationForm settings={settings} onSaved={onSaved} />
        <MemoryPanel scope={{ scope: 'global', ownerId: '' }} />
      </DialogContent>
    </Dialog>
  );
}
