import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { makeStyles } from './makeStyles';
import { radius } from './theme';

type Props = {
  /** Øverst i kortet, typisk en GroupHeader. */
  header: ReactNode;
  /** Radene. En tynn skillelinje legges mellom dem (og under overskriften). */
  children?: ReactNode;
};

/** Hvitt kort for én gruppe i «Oppgaver»: overskrift øverst, radene inni med skillelinjer. */
export function GroupCard({ header, children }: Props) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  return (
    // Skyggen ligger på den ytre, klippingen på den indre: overflow hidden klipper ellers skyggen på iOS.
    <View style={styles.shadow}>
      <View style={styles.clip}>
        {header}
        {rows.map((row, i) => (
          <Fragment key={isValidElement(row) && row.key != null ? row.key : i}>
            <View style={styles.divider} />
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) =>
  StyleSheet.create({
    shadow: { borderRadius: radius.group, backgroundColor: colors.surface, ...shadow },
    clip: { borderRadius: radius.group, overflow: 'hidden', backgroundColor: colors.surface },
    divider: { height: 1, backgroundColor: colors.border },
  }),
);
