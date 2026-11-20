import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '../../../ui';
import { useMyHousehold, useMyMember } from '../hooks';
import { MemberAvatar } from './MemberAvatar';

type Props = {
  /** 48 i sidetoppene («I dag», «Oppgaver»), 32 i navigasjonsheaderen. */
  size: 32 | 48;
};

/**
 * Den innloggede personens avatar øverst til høyre (figur eller profilbilde, med ringfargen).
 * Trykk åpner egen profil: personskjermen for voksne, «Innstillinger» på barnets enhet.
 * Henter personen selv, så den kan brukes rett i headerRight.
 */
export function MyProfileButton({ size }: Props) {
  const { personColor } = useTheme();
  const { data: household } = useMyHousehold();
  const me = useMyMember(household?.id);
  if (!me) return null;

  const isAdult = me.role === 'adult';
  function open() {
    if (!me) return;
    if (isAdult) router.push({ pathname: '/member/[id]', params: { id: me.id } });
    else router.navigate('/my-settings');
  }

  return (
    <Pressable
      onPress={open}
      hitSlop={size < 48 ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={isAdult ? 'Din profil' : 'Dine innstillinger'}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <MemberAvatar member={me} size={size} ring={personColor(me.avatar).ring} />
    </Pressable>
  );
}
