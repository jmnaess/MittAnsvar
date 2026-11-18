import { Avatar, type AvatarSize } from '../../../ui';
import { useMemberPhoto } from '../hooks';
import type { Member } from '../types';

type Props = {
  member: Pick<Member, 'household_id' | 'avatar' | 'avatar_mode' | 'photo_path'>;
  size?: AvatarSize | (number & {});
  ring?: string;
  outlined?: boolean;
};

/**
 * Avataren til et medlem: profilbildet hvis medlemmet har valgt det, ellers figuren.
 * Ringfargen kommer fortsatt fra figuren (personColor(member.avatar)), så den er lik med og uten bilde.
 */
export function MemberAvatar({ member, ...rest }: Props) {
  const photo = useMemberPhoto(member);
  return <Avatar avatar={member.avatar} photo={photo} {...rest} />;
}
