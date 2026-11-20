// Tegningene til avatarene (viewBox 0 0 48 48). Reven er fasit for stilen: geometriske, flate former
// (trekanter og facetter der dyret har tydelige former, runde der dyret er rundt), ingen omriss og
// åpne, runde prikkøyne. Felles mål: hodet omtrent like stort, øynene på y ≈ 26–29 og nesen på
// y ≈ 32–35, tyngdepunktet nær midten og alt innenfor r ≈ 21 fra midten (sirkelen er r = 24).
// Detaljer som forsvinner i 20 px, er tatt bort.
// Fargene her er en del av tegningen, ikke UI-farger, og ligger derfor her og ikke i theme.ts.
// Nøklene er de samme som i members.avatar (se features/household/avatars.ts).
import type { ReactElement } from 'react';
import { Circle, Ellipse, Path } from 'react-native-svg';

const EYE = '#2B2118';

function Eyes({ y, left = 18, right = 30, r = 1.9 }: { y: number; left?: number; right?: number; r?: number }) {
  return (
    <>
      <Circle cx={left} cy={y} r={r} fill={EYE} />
      <Circle cx={right} cy={y} r={r} fill={EYE} />
    </>
  );
}

/** Mørk trekantnese med runde hjørner, som revens. */
function Nose({ x = 24, y, w = 4.4, h = 2.4, fill = EYE }: { x?: number; y: number; w?: number; h?: number; fill?: string }) {
  return (
    <Path
      d={`M${x - w / 2} ${y}H${x + w / 2}L${x} ${y + h}z`}
      fill={fill}
      stroke={fill}
      strokeWidth={0.9}
      strokeLinejoin="round"
    />
  );
}

/** Åttekantet hode, brukt av flere dyr. */
const HEAD = 'M24 15.5L33 17.5 38.5 24.5 38 32.5 32 38.5 24 40 16 38.5 10 32.5 9.5 24.5 15 17.5z';

const bear = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#F6E2CC" />
    <Circle cx={13.5} cy={17} r={5.5} fill="#9A6A44" />
    <Circle cx={34.5} cy={17} r={5.5} fill="#9A6A44" />
    <Circle cx={13.5} cy={17} r={2.6} fill="#D9A87E" />
    <Circle cx={34.5} cy={17} r={2.6} fill="#D9A87E" />
    <Path d={HEAD} fill="#B07D52" />
    <Path d="M24 29.5L29.5 31 31 35 27.5 38.5H20.5L17 35 18.5 31z" fill="#EBCDAE" />
    <Eyes y={27} />
    <Nose y={31.8} w={5} h={2.6} />
  </>
);

const cat = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBD9E1" />
    <Path d="M11 10.5L20.5 17.5 10 23.5z M37 10.5L27.5 17.5 38 23.5z" fill="#7C7799" />
    <Path d="M12.5 13.5L17.8 17.8 12 21z M35.5 13.5L30.2 17.8 36 21z" fill="#F4B7C6" />
    <Path d="M10 23.5L20.5 17.5Q24 16.5 27.5 17.5L38 23.5 40 31 34.5 37.5 24 39 13.5 37.5 8 31z" fill="#9C97B8" />
    <Path d="M17.5 32.5L24 30.5 30.5 32.5 28.5 37.4 24 38.4 19.5 37.4z" fill="#EFEDF6" />
    <Eyes y={27.5} />
    <Nose y={31} w={4} h={2.2} fill="#E77E96" />
  </>
);

// Samme geometri som app-ikonet (assets/brand/icon-source.svg), men med åpne øyne og bare hodet.
const fox = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFE3CC" />
    <Path
      d="M11.2 11.5L19.1 16.8 11.2 22.6z M36.8 11.5L28.9 16.8 36.8 22.6z"
      fill="#E36B2C"
      stroke="#E36B2C"
      strokeWidth={0.8}
      strokeLinejoin="round"
    />
    <Path d="M13 14.4L17.3 17.8 13 21.2z M35 14.4L30.7 17.8 35 21.2z" fill="#FFF4E6" />
    <Path d="M11.2 22.6L19.1 16.8Q24 15.4 28.9 16.8L36.8 22.6 40.4 31.7 33.4 37.5 24 38.7 14.6 37.5 7.6 31.7z" fill="#E36B2C" />
    <Path
      d="M7.6 31.7L14.6 24.7H18.7L20.8 26.8 22.5 33.4H25.5L27.2 26.8 29.3 24.7H33.4L40.4 31.7 33.4 37.5 24 38.7 14.6 37.5z"
      fill="#FFFAEE"
    />
    <Path d="M22.3 33.4H25.7L24 35.6z" fill={EYE} stroke={EYE} strokeWidth={0.9} strokeLinejoin="round" />
    <Eyes y={28.6} left={17.8} right={30.2} r={1.9} />
  </>
);

const frog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DDF1D2" />
    <Circle cx={16} cy={22.5} r={6.5} fill="#58A84C" />
    <Circle cx={32} cy={22.5} r={6.5} fill="#58A84C" />
    <Ellipse cx={24} cy={30.5} rx={15.5} ry={9.5} fill="#58A84C" />
    <Circle cx={16} cy={22.5} r={3.8} fill="#FFFFFF" />
    <Circle cx={32} cy={22.5} r={3.8} fill="#FFFFFF" />
    <Eyes y={23} left={16} right={32} r={2.1} />
    <Path d="M15.5 31.5c4.5 4.5 12.5 4.5 17 0" stroke="#2F5E28" strokeWidth={2.2} fill="none" strokeLinecap="round" />
    <Circle cx={12.5} cy={32} r={2.2} fill="#F2A9A9" />
    <Circle cx={35.5} cy={32} r={2.2} fill="#F2A9A9" />
  </>
);

const rabbit = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DCE2F8" />
    <Path d="M15 21L13.8 10.5 17 5.5 20.2 10.5 21 20z M33 21L34.2 10.5 31 5.5 27.8 10.5 27 20z" fill="#FFFFFF" />
    <Path d="M16.2 19L15.6 11.2 17 8.6 18.4 11.2 19 19z M31.8 19L32.4 11.2 31 8.6 29.6 11.2 29 19z" fill="#F6C1CF" />
    <Path d="M24 18L32.5 20 37 26.5 36 33.5 30.5 38.5 24 39.5 17.5 38.5 12 33.5 11 26.5 15.5 20z" fill="#FFFFFF" />
    <Eyes y={28} left={19} right={29} />
    <Nose y={32} w={3.6} h={2} fill="#E77E96" />
    <Circle cx={16} cy={33} r={2} fill="#F9D3DD" />
    <Circle cx={32} cy={33} r={2} fill="#F9D3DD" />
  </>
);

const owl = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#EAE3F6" />
    <Path d="M10.5 11.5L20 18 11.5 22.5z M37.5 11.5L28 18 36.5 22.5z" fill="#7E5F42" />
    <Path d="M11.5 22.5L20 18Q24 17 28 18L36.5 22.5 39.5 30.5 35 37.5 24 40.5 13 37.5 8.5 30.5z" fill="#9A7752" />
    <Path d="M24 22L28 33 24 38 20 33z" fill="#B8956C" />
    <Circle cx={18} cy={27.5} r={5.2} fill="#FFFFFF" />
    <Circle cx={30} cy={27.5} r={5.2} fill="#FFFFFF" />
    <Eyes y={27.5} r={2.4} />
    <Path d="M22 31.5H26L24 35z" fill="#F2A33A" stroke="#F2A33A" strokeWidth={0.8} strokeLinejoin="round" />
  </>
);

const panda = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E2E5EB" />
    <Circle cx={13.5} cy={17} r={5.5} fill="#2F3338" />
    <Circle cx={34.5} cy={17} r={5.5} fill="#2F3338" />
    <Path d={HEAD} fill="#FFFFFF" />
    <Path d="M13.5 30.5L16 24.5 21.5 23 22.5 28 18.5 32z M34.5 30.5L32 24.5 26.5 23 25.5 28 29.5 32z" fill="#2F3338" />
    <Circle cx={18.6} cy={27.2} r={1.6} fill="#FFFFFF" />
    <Circle cx={29.4} cy={27.2} r={1.6} fill="#FFFFFF" />
    <Nose y={32.2} w={4.6} h={2.4} fill="#2F3338" />
  </>
);

const lion = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFEBC2" />
    <Path
      d="M24 10L29.2 14 35.7 14.8 36.5 21.3 40.5 26.5 36.5 31.7 35.7 38.2 29.2 39 24 43 18.8 39 12.3 38.2 11.5 31.7 7.5 26.5 11.5 21.3 12.3 14.8 18.8 14z"
      fill="#D99A1E"
    />
    <Path d="M14 19.5L17.5 15.5 20 19.5z M34 19.5L30.5 15.5 28 19.5z" fill="#F4C35A" />
    <Path d="M24 17L31.5 19 35 25.5 34 32.5 29 37.5 24 38.5 19 37.5 14 32.5 13 25.5 16.5 19z" fill="#F4C35A" />
    <Path d="M24 30L28.5 31.5 29.5 35 26.5 37.5H21.5L18.5 35 19.5 31.5z" fill="#FBE0A0" />
    <Eyes y={27} left={19} right={29} />
    <Nose y={31} w={4.4} h={2.4} fill="#7A3410" />
  </>
);

const dog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DCE8F3" />
    <Path d="M24 15.5L32 17.5 36.5 24 36 32 31 38 24 39.5 17 38 12 32 11.5 24 16 17.5z" fill="#C49A6C" />
    <Path d="M16.5 17L9 20 7.5 31 12 34.5 15 25z M31.5 17L39 20 40.5 31 36 34.5 33 25z" fill="#7A5638" />
    <Path d="M24 29L29.5 30.5 31 35 27.5 38.5H20.5L17 35 18.5 30.5z" fill="#EBD3B5" />
    <Path d="M27 22.5L32 23.5 32.5 29 27.5 28.5z" fill="#A87C52" />
    <Eyes y={26.5} left={18.5} right={29.5} />
    <Nose y={31.2} w={5.4} h={2.8} />
  </>
);

const unicorn = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBE0F2" />
    <Path d="M24 7.5L27 17.5H21z" fill="#F2B705" stroke="#F2B705" strokeWidth={0.8} strokeLinejoin="round" />
    <Path d="M13.5 12.5L20 18 13 22z M34.5 12.5L28 18 35 22z" fill="#FFFFFF" />
    <Path d="M14.5 15.5L17.6 18.3 14.2 20.2z M33.5 15.5L30.4 18.3 33.8 20.2z" fill="#F6B3CF" />
    <Path d={HEAD} fill="#FFFFFF" />
    <Path d="M15 17.5L21 16.5 17.5 22.5 11 27.5 9.5 24.5z" fill="#C064A8" />
    <Path d="M11 27.5L17.5 22.5 15 30.5 10 32.5z" fill="#9A86D6" />
    <Eyes y={28} left={19} right={29.5} />
    <Circle cx={17.5} cy={33} r={2.2} fill="#F6B3CF" />
    <Circle cx={31.5} cy={33} r={2.2} fill="#F6B3CF" />
  </>
);

// Nyere figurer. Fem har et roligere uttrykk og passer også voksne: elg, sel, oter, grevling og sau.
const elk = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#ECEED3" />
    <Path
      d="M19 18.5L13 18.5 9 15.5 8 10.5 10.5 12.5 11.5 8.5 13.5 11.5 15.5 8 16.5 12 18.5 10 19.5 14.5z M29 18.5L35 18.5 39 15.5 40 10.5 37.5 12.5 36.5 8.5 34.5 11.5 32.5 8 31.5 12 29.5 10 28.5 14.5z"
      fill="#A9A562"
    />
    <Path d="M16 21L8.5 20.5 10.5 25 16.5 24.5z M32 21L39.5 20.5 37.5 25 31.5 24.5z" fill="#7A5C3C" />
    <Path d="M18 17.5H30L33 25 31 31 32.5 36.5 28.5 40.5H19.5L15.5 36.5 17 31 15 25z" fill="#8A6A45" />
    <Path d="M17 31H31L32.5 36.5 28.5 40.5H19.5L15.5 36.5z" fill="#B08E68" />
    <Eyes y={26} left={19.5} right={28.5} />
    <Circle cx={21} cy={36} r={1.4} fill={EYE} />
    <Circle cx={27} cy={36} r={1.4} fill={EYE} />
  </>
);

const seal = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E1E9F1" />
    <Circle cx={24} cy={27} r={15.5} fill="#8FA3B5" />
    <Circle cx={17} cy={18} r={1.8} fill="#7A8FA2" />
    <Circle cx={31.5} cy={17.5} r={1.5} fill="#7A8FA2" />
    <Ellipse cx={20.2} cy={33} rx={5.2} ry={4.2} fill="#C9D5E0" />
    <Ellipse cx={27.8} cy={33} rx={5.2} ry={4.2} fill="#C9D5E0" />
    <Eyes y={26.5} left={17.5} right={30.5} r={2.5} />
    <Nose y={29.8} w={4.6} h={2.6} />
  </>
);

const otter = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#DAEFE6" />
    <Circle cx={12.5} cy={20.5} r={3.4} fill="#6E4A30" />
    <Circle cx={35.5} cy={20.5} r={3.4} fill="#6E4A30" />
    <Path d="M24 16.5L32 18 37.5 23 39.5 30 35.5 36.5 24 39.5 12.5 36.5 8.5 30 10.5 23 16 18z" fill="#8E623F" />
    <Path d="M10.5 31L17 27.5 24 29 31 27.5 37.5 31 34.5 36 24 38.8 13.5 36z" fill="#E6CFB1" />
    <Eyes y={25.5} />
    <Nose y={29.5} w={6} h={3} />
  </>
);

const badger = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#E4E6F3" />
    <Circle cx={12.5} cy={19} r={4} fill="#3A3C46" />
    <Circle cx={35.5} cy={19} r={4} fill="#3A3C46" />
    <Path d={HEAD} fill="#FFFFFF" />
    <Path d="M15 17.5L20.5 16.2 22 29.5 19.5 33 16.5 29.5z M33 17.5L27.5 16.2 26 29.5 28.5 33 31.5 29.5z" fill="#3A3C46" />
    <Circle cx={18.8} cy={27} r={1.7} fill="#FFFFFF" />
    <Circle cx={29.2} cy={27} r={1.7} fill="#FFFFFF" />
    <Nose y={33.2} w={4.8} h={2.6} />
  </>
);

const sheep = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#ECE7F3" />
    <Circle cx={16} cy={18.5} r={5} fill="#FFFFFF" />
    <Circle cx={24} cy={16} r={5.5} fill="#FFFFFF" />
    <Circle cx={32} cy={18.5} r={5} fill="#FFFFFF" />
    <Circle cx={12.5} cy={24} r={4.3} fill="#FFFFFF" />
    <Circle cx={35.5} cy={24} r={4.3} fill="#FFFFFF" />
    <Path d="M16 25.5L8.5 25 10 29.5 16 29z M32 25.5L39.5 25 38 29.5 32 29z" fill="#6B6175" />
    <Path d="M24 19.5L31 22 32.5 30 28.5 38.5H19.5L15.5 30 17 22z" fill="#6B6175" />
    <Circle cx={20.5} cy={21.5} r={3.6} fill="#FFFFFF" />
    <Circle cx={24} cy={20.5} r={4} fill="#FFFFFF" />
    <Circle cx={27.5} cy={21.5} r={3.6} fill="#FFFFFF" />
    <Circle cx={20} cy={28} r={2.6} fill="#FFFFFF" />
    <Circle cx={28} cy={28} r={2.6} fill="#FFFFFF" />
    <Eyes y={28.2} left={20} right={28} r={1.5} />
    <Nose y={33} w={3.6} h={2} fill="#F3B9C8" />
  </>
);

const hedgehog = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#F6E2E2" />
    <Path d="M8.5 33L8.5 22 12.5 24 12.5 15.5 17 19.5 19.5 11.5 22.5 17.5 24 10 25.5 17.5 28.5 11.5 31 19.5 35.5 15.5 35.5 24 39.5 22 39.5 33z" fill="#8A5A4A" />
    <Path d="M10.5 31L16 23.5 24 22.5 32 23.5 37.5 31 31 38 24 40.5 17 38z" fill="#E8C9A8" />
    <Eyes y={28.5} left={19} right={29} />
    <Nose y={33.5} w={4.4} h={2.4} />
    <Circle cx={15.5} cy={33} r={2.1} fill="#F2A9A9" />
    <Circle cx={32.5} cy={33} r={2.1} fill="#F2A9A9" />
  </>
);

// Stor busket hale som buer opp bak hodet, små ører med dusker og liten snute (ikke lik reven).
const squirrel = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FBE1D5" />
    <Path
      d="M23.5 42C36.5 40.5 41 31 40 20 39 11 31 7 25.5 10 22.5 12 23.5 16 27 16 31 16 33 20 32.5 26 32 33 28.5 38 23.5 42z"
      fill="#DB7D4E"
    />
    <Path d="M8.7 10.2L14.5 16.5 7.6 18.8zM28.3 10.2L22.5 16.5 29.4 18.8z" fill="#B4532E" />
    <Path d="M8.7 10.2L11.4 13.1 7.8 13.6zM28.3 10.2L25.6 13.1 29.2 13.6z" fill="#8E3A1C" />
    <Path d="M18.5 14.8L27.1 17.1 31.7 24.6 30.6 33.2 24.8 38.9 18.5 40.1 12.2 38.9 6.4 33.2 5.3 24.6 9.9 17.1z" fill="#C65E32" />
    <Path d="M18.5 30.3L23.1 32 24.2 36 18.5 38.9 12.8 36 13.9 32z" fill="#F7E3CC" />
    <Eyes y={26.9} left={13.9} right={23.1} r={2} />
    <Nose x={18.5} y={30.5} w={3.4} h={2} />
  </>
);

// I profil, vendt mot høyre: mørk hette over hode og bakhode, lyst grått kinn og stort stripete nebb.
const puffin = (
  <>
    <Circle cx={24} cy={24} r={24} fill="#FFE1D9" />
    <Circle cx={21.5} cy={24.5} r={14.5} fill="#2F3338" />
    <Path d="M18 22L28 18 33 20V35.5L26 38 18 34.5 15.5 28z" fill="#ECEEF1" />
    <Path d="M33 16.5L39 20 43.5 28 39 33.5 33 39z" fill="#E8563F" />
    <Path d="M33 16.5L35.3 17.8V37.8L33 39z" fill="#9AA0A8" />
    <Path d="M35.3 17.8L36.9 18.8V36.8L35.3 37.8z" fill="#F2B705" />
    <Path d="M39.8 22.5L40.4 32.5" stroke="#F2B705" strokeWidth={1.3} strokeLinecap="round" />
    <Path d="M33 27.8L43.5 28" stroke="#B8402E" strokeWidth={0.9} strokeLinecap="round" />
    <Path d="M26.6 23.2H29.4L28 24.3z" fill="#6B7078" />
    <Path d="M26.5 25.6L20.5 28.2 26.8 27.4z" fill="#6B7078" />
    <Circle cx={28} cy={26.3} r={2} fill={EYE} />
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
