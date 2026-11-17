import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../../../components/theme';
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
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.description}>{template.description}</Text>
        {task && <Text style={styles.due}>Neste frist: {formatNextDue(task)}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        accessibilityLabel={`${template.title}. ${value ? 'Aktivert' : 'Ikke aktivert'}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  description: { fontSize: 14, color: colors.muted },
  due: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
