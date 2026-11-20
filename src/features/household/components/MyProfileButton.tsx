import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '../../../ui';
import { useMyHousehold, useMyMember } from '../hooks';
import { MemberAvatar } from './MemberAvatar';

/** Samme størrelse på alle faner: i navigasjonsheaderen og i sidetoppen på «I dag». */
const SIZE = 32;

/**
 * Den innloggede personens avatar øverst til høyre (figur eller profilbilde, med ringfargen).
 * Trykk åpner egen profil: personskjermen for voksne, «Innstillinger» på barnets enhet.
 * Henter personen selv, så den kan brukes rett i headerRight.
 */
export function MyProfileButton() {
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
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={isAdult ? 'Din profil' : 'Dine innstillinger'}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <MemberAvatar member={me} size={SIZE} ring={personColor(me.avatar).ring} />
    </Pressable>
  );
}
