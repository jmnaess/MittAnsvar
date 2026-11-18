import { MultiChoiceChips } from '../../../ui';
import type { Member } from '../../household/types';

// MultiChoiceChips trenger en verdi for «alle barna». Tom liste kan ikke vises som et valg.
const ALL_CHILDREN = 'all';

type Props = {
  label: string;
  members: Member[];
  /** Valgte barn. Tom = alle barna. */
  value: string[];
  onChange: (memberIds: string[]) => void;
  disabled?: boolean;
};

/**
 * «Alle barna» eller så mange enkeltbarn man vil.
 * Velges «Alle barna», fjernes enkeltbarna. Fjernes det siste barnet, blir det «Alle barna».
 */
export function JobMembersPicker({ label, members, value, onChange, disabled }: Props) {
  const options = [
    { value: ALL_CHILDREN, label: 'Alle barna' },
    ...members.filter((m) => m.role === 'child').map((m) => ({ value: m.id, label: m.display_name })),
  ];
  const selected = value.length === 0 ? [ALL_CHILDREN] : value;

  function change(next: string[]) {
    const pickedAll = next.includes(ALL_CHILDREN) && !selected.includes(ALL_CHILDREN);
    onChange(pickedAll ? [] : next.filter((v) => v !== ALL_CHILDREN));
  }

  return (
    <MultiChoiceChips
      label={label}
      options={options}
      values={selected}
      onChange={change}
      disabled={disabled}
    />
  );
}
