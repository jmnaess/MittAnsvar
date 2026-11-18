// Tegningene til avatarene (viewBox 0 0 48 48). Flat stil: sirkelbakgrunn, enkle former, to
// prikkøyne, ingen omriss. Fargene her er en del av tegningen, ikke UI-farger, og ligger derfor
// her og ikke i theme.ts. Nøklene er de samme som i members.avatar (se features/household/avatars.ts).
import type { ReactElement } from 'react';
import { Circle, Ellipse, Path } from 'react-native-svg';

const EYE = '#2B2118';

function Eyes({ y, left = 19, right = 29, r = 1.8 }: { y: number; left?: number; right?: number; r?: number }) {
  return (
    <>
      <Circle cx={left} cy={y} r={r} fill={EYE} />
      <Circle cx={right} cy={y} r={r} fill={EYE} />
    </>
  );
}

const bear = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#F6E2CC" />
    <Circle cx={13} cy={15} r={6} fill="#9A6A44" />
    <Circle cx={35} cy={15} r={6} fill="#9A6A44" />
    <Circle cx={24} cy={27} r={14} fill="#B07D52" />
    <Ellipse cx={24} cy={32} rx={7} ry={5.5} fill="#EBCDAE" />
    <Eyes y={24} />
    <Ellipse cx={24} cy={30.5} rx={2.4} ry={1.7} fill={EYE} />
  </>
);

const cat = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBD9E1" />
    <Path d="M11 10l10 8-9 5z M37 10l-10 8 9 5z" fill="#7C7799" />
    <Circle cx={24} cy={27} r={14} fill="#9C97B8" />
    <Eyes y={25} r={1.9} />
    <Path d="M22.5 29.5h3l-1.5 1.8z" fill="#E77E96" />
    <Path d="M14 30h5M14 33h5M29 30h5M29 33h5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
  </>
);

const fox = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFE3CC" />
    <Path d="M10 9l11 9-8 7z M38 9l-11 9 8 7z" fill="#E36B2C" />
    <Circle cx={24} cy={27} r={14} fill="#E36B2C" />
    <Path d="M12 29c4 7 8 9 12 9s8-2 12-9c-5 1-9 0-12-3-3 3-7 4-12 3z" fill="#FFFFFF" />
    <Eyes y={24} />
    <Circle cx={24} cy={31} r={1.9} fill={EYE} />
  </>
);

const frog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DDF1D2" />
    <Circle cx={16} cy={17} r={6} fill="#58A84C" />
    <Circle cx={32} cy={17} r={6} fill="#58A84C" />
    <Ellipse cx={24} cy={28} rx={15} ry={12} fill="#58A84C" />
    <Circle cx={16} cy={17} r={3} fill="#FFFFFF" />
    <Circle cx={32} cy={17} r={3} fill="#FFFFFF" />
    <Eyes y={17} left={16} right={32} r={1.6} />
    <Path d="M16 30c4 4 12 4 16 0" stroke={EYE} strokeWidth={2} fill="none" strokeLinecap="round" />
  </>
);

const rabbit = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E3E8FB" />
    <Ellipse cx={18} cy={12} rx={4} ry={10} fill="#FFFFFF" stroke="#C9CFE6" strokeWidth={1.5} />
    <Ellipse cx={30} cy={12} rx={4} ry={10} fill="#FFFFFF" stroke="#C9CFE6" strokeWidth={1.5} />
    <Circle cx={24} cy={29} r={12} fill="#FFFFFF" stroke="#C9CFE6" strokeWidth={1.5} />
    <Eyes y={27} left={20} right={28} r={1.7} />
    <Path d="M22.6 31h2.8l-1.4 1.6z" fill="#E77E96" />
  </>
);

const owl = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#EAE3F6" />
    <Path d="M12 11l8 7-7 4z M36 11l-8 7 7 4z" fill="#7E5F42" />
    <Ellipse cx={24} cy={28} rx={14} ry={14} fill="#9A7752" />
    <Circle cx={18.5} cy={25} r={5.5} fill="#FFFFFF" />
    <Circle cx={29.5} cy={25} r={5.5} fill="#FFFFFF" />
    <Eyes y={25} left={18.5} right={29.5} r={2.3} />
    <Path d="M22 30l2 4 2-4z" fill="#F2A33A" />
  </>
);

const panda = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E9EBEF" />
    <Circle cx={13} cy={15} r={6} fill="#2F3338" />
    <Circle cx={35} cy={15} r={6} fill="#2F3338" />
    <Circle cx={24} cy={27} r={14} fill="#FFFFFF" />
    <Ellipse cx={18.5} cy={25} rx={3.6} ry={4.6} fill="#2F3338" />
    <Ellipse cx={29.5} cy={25} rx={3.6} ry={4.6} fill="#2F3338" />
    <Eyes y={24.5} left={18.8} right={29.2} r={1.4} />
    <Circle cx={18.8} cy={24.5} r={1.4} fill="#FFFFFF" />
    <Circle cx={29.2} cy={24.5} r={1.4} fill="#FFFFFF" />
    <Ellipse cx={24} cy={31.5} rx={2.4} ry={1.7} fill={EYE} />
  </>
);

const lion = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFEBC2" />
    <Circle cx={24} cy={26} r={17} fill="#D99A1E" />
    <Circle cx={14.5} cy={16.5} r={3.6} fill="#F4C35A" />
    <Circle cx={33.5} cy={16.5} r={3.6} fill="#F4C35A" />
    <Circle cx={24} cy={27} r={11.5} fill="#F4C35A" />
    <Eyes y={25} left={20} right={28} r={1.7} />
    <Path d="M22.4 29h3.2l-1.6 1.9z" fill="#7A3410" />
  </>
);

const dog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DCE8F3" />
    <Ellipse cx={11.5} cy={24} rx={5} ry={10} fill="#7A5638" />
    <Ellipse cx={36.5} cy={24} rx={5} ry={10} fill="#7A5638" />
    <Circle cx={24} cy={26} r={13} fill="#C49A6C" />
    <Ellipse cx={24} cy={31.5} rx={6.5} ry={5} fill="#EBD3B5" />
    <Eyes y={23} />
    <Ellipse cx={24} cy={29.5} rx={2.6} ry={1.9} fill={EYE} />
  </>
);

const unicorn = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBE0F2" />
    <Path d="M24 3l3.5 12h-7z" fill="#F2B705" />
    <Path d="M13 12l7 6-7 3z M35 12l-7 6 7 3z" fill="#FFFFFF" />
    <Circle cx={12.5} cy={22} r={5} fill="#C064A8" />
    <Circle cx={13.5} cy={30.5} r={4.5} fill="#9A86D6" />
    <Circle cx={24} cy={28} r={13.5} fill="#FFFFFF" />
    <Eyes y={27} left={20} right={29} r={1.7} />
    <Circle cx={17} cy={31.5} r={2} fill="#F6B3CF" />
    <Circle cx={32} cy={31.5} r={2} fill="#F6B3CF" />
  </>
);

/** Ukjent nøkkel (f.eks. fra en nyere appversjon): et nøytralt fjes. */
export const fallbackArt = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#EDE7DD" />
    <Circle cx={24} cy={26} r={14} fill="#D8CCBA" />
    <Eyes y={24} />
    <Path d="M19.5 30c3 2.5 6 2.5 9 0" stroke={EYE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </>
);

export const avatarArt: Record<string, ReactElement> = {
  bear, cat, fox, frog, rabbit, owl, panda, lion, dog, unicorn,
};
