import { ChoiceChips } from '../../../ui';
import { useMyHousehold } from '../../household/hooks';
import { categoryOptions, type CategoryKey } from '../categories';

type Props = {
  value: CategoryKey;
  onChange: (value: CategoryKey) => void;
  disabled?: boolean;
};

/**
 * «Kategori» i skjemaene. Rekkefølgen følger hjemprofilen: det som er relevant for hjemmet
 * står først (f.eks. Bil bare øverst når husstanden har bil). Annet står alltid sist.
 */
export function CategoryPicker({ value, onChange, disabled }: Props) {
  const { data: household } = useMyHousehold();
  const options = categoryOptions(household ?? null).map((c) => ({ value: c.key, label: c.label }));
  return <ChoiceChips label="Kategori" options={options} value={value} onChange={onChange} disabled={disabled} />;
}
