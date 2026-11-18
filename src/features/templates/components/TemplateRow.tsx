import { ListRow, Switch } from '../../../ui';
import { formatNextDue } from '../../tasks/recurrence';
import type { Task } from '../../tasks/types';
import type { TaskTemplate } from '../types';

type Props = {
  template: TaskTemplate;
  /** Oppgaven malen er aktivert som, ellers null. */
  task: Task | null;
  /** Bryterens verdi. Kan avvike fra task mens en endring lagres. */
  value: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
};

/** Én mal i årshjulet: tittel, kort forklaring, bryter og neste frist når den er aktivert. */
export function TemplateRow({ template, task, value, disabled, onToggle }: Props) {
  return (
    <ListRow
      title={template.title}
      meta={[template.description, task && `Neste frist: ${formatNextDue(task)}`]}
      right={
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          accessibilityLabel={`${template.title}. ${value ? 'Aktivert' : 'Ikke aktivert'}`}
        />
      }
    />
  );
}
