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


// Nyere figurer. Fem har et roligere uttrykk og passer også voksne: elg, sel, oter, grevling og sau.
const elk = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#ECEED3" />
    <Path
      d="M18 17C12 17 7 13 6 7c2 1 3 2 4 2 0-2 0-3 1-4 1 2 2 3 3 3 0-2 1-3 2-3 1 2 2 5 3 8z M30 17c6 0 11-4 12-10-2 1-3 2-4 2 0-2 0-3-1-4-1 2-2 3-3 3 0-2-1-3-2-3-1 2-2 5-3 8z"
      fill="#A9A562"
    />
    <Ellipse cx={13} cy={21} rx={4.5} ry={2.6} fill="#7A5C3C" />
    <Ellipse cx={35} cy={21} rx={4.5} ry={2.6} fill="#7A5C3C" />
    <Ellipse cx={24} cy={27} rx={10} ry={12} fill="#8A6A45" />
    <Ellipse cx={24} cy={35} rx={8.5} ry={6.5} fill="#B08E68" />
    <Eyes y={24} left={19.5} right={28.5} />
    <Circle cx={21.5} cy={35} r={1.2} fill={EYE} />
    <Circle cx={26.5} cy={35} r={1.2} fill={EYE} />
  </>
);

const seal = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E1E9F1" />
    <Circle cx={24} cy={27} r={14} fill="#8FA3B5" />
    <Circle cx={18} cy={18} r={1.3} fill="#7A8FA2" />
    <Circle cx={31} cy={17} r={1.1} fill="#7A8FA2" />
    <Circle cx={33} cy={21} r={0.9} fill="#7A8FA2" />
    <Ellipse cx={20.5} cy={31.5} rx={4.6} ry={3.6} fill="#C9D5E0" />
    <Ellipse cx={27.5} cy={31.5} rx={4.6} ry={3.6} fill="#C9D5E0" />
    <Eyes y={23.5} left={18.5} right={29.5} r={2.3} />
    <Ellipse cx={24} cy={28.8} rx={2.3} ry={1.6} fill={EYE} />
    <Circle cx={19} cy={31.5} r={0.6} fill={EYE} />
    <Circle cx={21.5} cy={33} r={0.6} fill={EYE} />
    <Circle cx={29} cy={31.5} r={0.6} fill={EYE} />
    <Circle cx={26.5} cy={33} r={0.6} fill={EYE} />
  </>
);

const otter = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DAEFE6" />
    <Circle cx={11.5} cy={22} r={3.2} fill="#6E4A30" />
    <Circle cx={36.5} cy={22} r={3.2} fill="#6E4A30" />
    <Ellipse cx={24} cy={28} rx={14.5} ry={12.5} fill="#8E623F" />
    <Ellipse cx={24} cy={32.5} rx={11} ry={7.5} fill="#E6CFB1" />
    <Eyes y={25} left={18.5} right={29.5} />
    <Ellipse cx={24} cy={29.5} rx={3} ry={2} fill={EYE} />
    <Path d="M24 31.5v2M21.5 34.5c1 .8 1.8.8 2.5 0 .7.8 1.5.8 2.5 0" stroke={EYE} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    <Path d="M13.5 31.5h5M14 35l4.5-1.5M34.5 31.5h-5M34 35l-4.5-1.5" stroke="#B89878" strokeWidth={1} strokeLinecap="round" />
  </>
);

const badger = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E4E6F3" />
    <Circle cx={13} cy={17} r={4.2} fill="#3A3C46" />
    <Circle cx={35} cy={17} r={4.2} fill="#3A3C46" />
    <Circle cx={24} cy={27} r={14} fill="#FFFFFF" />
    <Path
      d="M14.5 16C16 12.5 20 12.5 21 15.5l.5 11.5c-.5 3-4.5 3-5 0z M33.5 16C32 12.5 28 12.5 27 15.5l-.5 11.5c.5 3 4.5 3 5 0z"
      fill="#3A3C46"
    />
    <Circle cx={18.8} cy={23} r={1.5} fill="#FFFFFF" />
    <Circle cx={29.2} cy={23} r={1.5} fill="#FFFFFF" />
    <Ellipse cx={24} cy={32} rx={2.6} ry={1.8} fill={EYE} />
  </>
);

const sheep = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#ECE7F3" />
    <Circle cx={16} cy={15} r={5} fill="#FFFFFF" />
    <Circle cx={24} cy={12.5} r={6} fill="#FFFFFF" />
    <Circle cx={32} cy={15} r={5} fill="#FFFFFF" />
    <Circle cx={12.5} cy={21.5} r={4.5} fill="#FFFFFF" />
    <Circle cx={35.5} cy={21.5} r={4.5} fill="#FFFFFF" />
    <Ellipse cx={11} cy={27} rx={5} ry={2.5} fill="#6B6175" />
    <Ellipse cx={37} cy={27} rx={5} ry={2.5} fill="#6B6175" />
    <Ellipse cx={24} cy={29} rx={9} ry={11} fill="#6B6175" />
    <Circle cx={20} cy={19.5} r={4} fill="#FFFFFF" />
    <Circle cx={24} cy={18.5} r={4.5} fill="#FFFFFF" />
    <Circle cx={28} cy={19.5} r={4} fill="#FFFFFF" />
    <Circle cx={20} cy={27} r={2.3} fill="#FFFFFF" />
    <Circle cx={28} cy={27} r={2.3} fill="#FFFFFF" />
    <Eyes y={27.3} left={20} right={28} r={1.3} />
    <Path d="M22 34c1.2 1 2.8 1 4 0" stroke="#F3B9C8" strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </>
);

const hedgehog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#F6E2E2" />
    <Path d="M8 31l1-11 4 3 1-10 4 5 3-9 3 7 3-7 3 9 4-5 1 10 4-3 1 11z" fill="#8A5A4A" />
    <Ellipse cx={24} cy={31} rx={11} ry={10} fill="#E8C9A8" />
    <Eyes y={28.5} left={19.5} right={28.5} />
    <Circle cx={24} cy={33} r={2.2} fill={EYE} />
    <Circle cx={16.5} cy={33} r={1.8} fill="#F2A9A9" />
    <Circle cx={31.5} cy={33} r={1.8} fill="#F2A9A9" />
  </>
);

const squirrel = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBE1D5" />
    <Path d="M13 8l7 11-9 3z M35 8l-7 11 9 3z" fill="#B4532E" />
    <Circle cx={13.5} cy={8.5} r={2.2} fill="#8E3A1C" />
    <Circle cx={34.5} cy={8.5} r={2.2} fill="#8E3A1C" />
    <Circle cx={24} cy={27} r={13.5} fill="#C65E32" />
    <Circle cx={19.5} cy={31.5} r={4.8} fill="#F7E3CC" />
    <Circle cx={28.5} cy={31.5} r={4.8} fill="#F7E3CC" />
    <Eyes y={24} />
    <Ellipse cx={24} cy={28.6} rx={2} ry={1.5} fill={EYE} />
  </>
);

const puffin = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFE1D9" />
    <Circle cx={24} cy={27} r={14} fill="#2F3338" />
    <Ellipse cx={24} cy={27.5} rx={11} ry={9} fill="#FFFFFF" />
    <Eyes y={24} left={18.5} right={29.5} />
    <Path d="M19 29c2-2 8-2 10 0l-5 9z" fill="#E8563F" />
    <Path d="M19.5 29c2-1.5 7-1.5 9 0l-.9 1.8c-2-1-5.2-1-7.2 0z" fill="#F2B705" />
  </>
);

export const avatarArt: Record<string, ReactElement> = {
  bear, cat, fox, frog, rabbit, owl, panda, lion, dog, unicorn,
  elk, seal, otter, badger, sheep, hedgehog, squirrel, puffin,
};

/** Reserven for en nøkkel appen ikke kjenner (f.eks. en eldre app som ser en nyere figur). */
export const FALLBACK_AVATAR = 'fox';

/** Tegningen til en avatarnøkkel. Ukjent eller tom nøkkel gir reven, aldri tomt. */
export function avatarArtFor(key: string | null | undefined): ReactElement {
  // hasOwn: «constructor» og lignende er gyldige nøkler i databasen, men ikke tegninger.
  return key && Object.hasOwn(avatarArt, key) ? avatarArt[key] : avatarArt[FALLBACK_AVATAR];
}
