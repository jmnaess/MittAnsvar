import { Avatar, ListRow } from '../../../ui';
import type { Member } from '../types';

type Props = {
  member: Member;
  /** Ekstra linje, f.eks. «Opptjent: 25 kr» for barn. */
  extra?: string;
  /** Uten onPress vises raden bare (f.eks. voksne, som ikke kan redigeres her). */
  onPress?: () => void;
  /** Hva trykket gjør, for skjermleser. */
  accessibilityHint?: string;
};

function describe(member: Member): string {
  if (member.role === 'adult') return 'Voksen';
  return member.birth_year ? `Barn, født ${member.birth_year}` : 'Barn';
}

export function MemberRow({ member, extra, onPress, accessibilityHint = 'Endre eller slette' }: Props) {
  return (
    <ListRow
      title={member.display_name}
      meta={[describe(member), extra]}
      left={<Avatar avatar={member.avatar} size={44} />}
      onPress={onPress}
      accessibilityHint={onPress ? accessibilityHint : undefined}
    />
  );
}
