import { Card, Chip, ListRow, Text } from '../../../ui';
import type { MyProposal } from '../api';
import { proposalMeta, proposalStatusChip } from '../format';

/**
 * «Mine forslag» på barnets «I dag»: det som venter, og det som ble avgjort de siste 3 dagene
 * (filtrert i databasen). Bare visning. Vises ikke når listen er tom.
 */
export function MyProposalsCard({ proposals }: { proposals: MyProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <Card>
      <Text variant="sectionTitle" accessibilityRole="header">Mine forslag</Text>
      {proposals.map((p) => {
        const chip = proposalStatusChip(p.status, p.approved_nok);
        return (
          <ListRow
            key={p.id}
            title={p.title}
            meta={proposalMeta(p)}
            right={<Chip label={chip.label} tone={chip.tone} />}
            muted
          />
        );
      })}
    </Card>
  );
}
