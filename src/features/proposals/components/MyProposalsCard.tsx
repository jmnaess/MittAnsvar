import { Card, Chip, ListRow, Text } from '../../../ui';
import type { MyProposal } from '../api';
import { proposalMeta, proposalStatusChip, visibleMyProposals } from '../format';

/**
 * «Mine forslag» på barnets «I dag»: det som venter, og avslag fra de siste 3 dagene (databasen
 * filtrerer på dagene). Godkjente vises som oppgave eller som gjort i «I dag», ikke her.
 * Bare visning. Vises ikke når listen er tom.
 */
export function MyProposalsCard({ proposals }: { proposals: MyProposal[] }) {
  const shown = visibleMyProposals(proposals);
  if (shown.length === 0) return null;
  return (
    <Card>
      <Text variant="sectionTitle" accessibilityRole="header">Mine forslag</Text>
      {shown.map((p) => {
        const chip = proposalStatusChip(p.status === 'pending' ? 'pending' : 'rejected');
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
