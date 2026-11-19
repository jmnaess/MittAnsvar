import { ListRow, Switch } from '../../../ui';
import { describeRecurrence, formatNextDue, isSeasonal } from '../../tasks/recurrence';
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
  /** Gjentakelse og neste frist i én tekst («Hver 3. måned · neste i mars»). Brukes i «Med jevne mellomrom». */
  when?: string;
  /** Åpner oppgaven malen er aktivert som. Utelatt = bare bryteren. */
  onPress?: () => void;
};

/** Én mal i årshjulet: tittel, kort forklaring, bryter og neste frist når den er aktivert. Trykk åpner oppgaven. */
export function TemplateRow({ template, task, value, disabled, onToggle, when, onPress }: Props) {
  return (
    <ListRow
      title={template.title}
      meta={
        when
          ? [when, template.description]
          : [
              isSeasonal(template) && describeRecurrence({ ...template, job_repeats: false }),
              template.description,
              task && `Neste frist: ${formatNextDue(task)}`,
            ]
      }
      onPress={onPress}
      accessibilityHint={onPress ? 'Åpner oppgaven for redigering' : undefined}
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
