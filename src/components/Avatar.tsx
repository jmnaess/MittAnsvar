// Midlertidig bro til den tegnede avataren i src/ui (designsteg del 1). Skjermene som ikke er
// gått over ennå, sender vilkårlige størrelser. De rundes til nærmeste størrelse i designsystemet.
// Slettes i del 2.
import { Avatar as UiAvatar, type AvatarSize } from '../ui/Avatar';

const SIZES: AvatarSize[] = [22, 32, 44, 48, 100];

function nearest(size: number): AvatarSize {
  return SIZES.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best));
}

export function Avatar({ avatar, size = 44 }: { avatar: string; size?: number }) {
  return <UiAvatar avatar={avatar} size={nearest(size)} />;
}
