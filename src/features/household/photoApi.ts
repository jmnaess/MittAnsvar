// Profilbilder: velge, krympe, laste opp, slette og hente signerte URL-er.
// Bøtta er privat. RLS på storage.objects avgjør hvem som får lese, laste opp og slette
// (se supabase/migrations/*_member_photos.sql og *_own_adult_profile.sql). Alt her virker i Expo Go.

import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import {
  centerSquare,
  newPhotoPath,
  PHOTO_BUCKET,
  PHOTO_SIZE,
  PHOTO_URL_TTL_SECONDS,
  photoFolder,
} from './photo';
import type { Member } from './types';

export type PhotoSource = 'camera' | 'library';

const bucket = () => supabase.storage.from(PHOTO_BUCKET);

/** Storage-feil har en annen form enn databasefeil. Vi gjør dem om til ApiError med en fast nøkkel. */
function storageError(key: string, error: unknown): ApiError {
  const status = (error as { status?: number } | null)?.status ?? 0;
  return new ApiError(key, status, 'P0001');
}

/**
 * Lar brukeren ta eller velge et bilde, beskjære det kvadratisk, og krymper det til 512×512 JPEG.
 * Den nye kodingen tar ikke med EXIF, så posisjon og kamerainfo blir ikke lastet opp.
 * Returnerer filstien på enheten, eller null hvis brukeren avbrøt.
 */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ApiError(
      source === 'camera' ? 'camera_permission_denied' : 'photos_permission_denied',
      0,
      'P0001',
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1, // komprimeres under, etter nedskalering
    exif: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const image = await ImageManipulator.manipulate(asset.uri)
    .crop(centerSquare(asset.width, asset.height))
    .resize({ width: PHOTO_SIZE, height: PHOTO_SIZE })
    .renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

/** Sletter alle filer i mappen til et medlem. Trygt å kalle selv om mappen er tom. */
export async function deletePhotoFolder(householdId: string, memberId: string): Promise<void> {
  const folder = photoFolder(householdId, memberId);
  const { data, error } = await bucket().list(folder, { limit: 100 });
  if (error) throw storageError('photo_delete_failed', error);
  if (!data.length) return;
  const { error: removeError } = await bucket().remove(data.map((f) => `${folder}/${f.name}`));
  if (removeError) throw storageError('photo_delete_failed', removeError);
}

/**
 * Laster opp et nytt bilde og viser det. Rekkefølge:
 * 1. ny fil, 2. members peker på den (og avatar_mode = photo), 3. den gamle filen slettes.
 * Feiler steg 3, blir den gamle filen liggende til mappen slettes. Det er ufarlig.
 */
export async function uploadMemberPhoto(member: Member, localUri: string): Promise<void> {
  const path = newPhotoPath(member.household_id, member.id, randomUUID());
  const body = await (await fetch(localUri)).arrayBuffer();

  const { error } = await bucket().upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw storageError('photo_upload_failed', error);

  unwrap(
    await supabase.from('members').update({ photo_path: path, avatar_mode: 'photo' }).eq('id', member.id),
  );

  if (member.photo_path) await bucket().remove([member.photo_path]);
}

/** Fjerner bildet. Filene slettes først, så figuren vises igjen. */
export async function removeMemberPhoto(member: Member): Promise<void> {
  await deletePhotoFolder(member.household_id, member.id);
  unwrap(
    await supabase.from('members').update({ photo_path: null, avatar_mode: 'figure' }).eq('id', member.id),
  );
}

/** Voksen bytter mellom figur og bilde for seg selv eller et barn (ikke for en annen voksen). */
export async function setMemberAvatarMode(memberId: string, mode: Member['avatar_mode']): Promise<void> {
  unwrap(await supabase.from('members').update({ avatar_mode: mode }).eq('id', memberId));
}

/** Barnet (eller en voksen) velger figur eller bilde på sin egen profil. */
export async function setMyAvatarMode(mode: Member['avatar_mode']): Promise<void> {
  unwrap(await supabase.rpc('set_my_avatar_mode', { p_mode: mode }));
}

/** Signerte URL-er for stiene, i ett kall. Stier som ikke kunne signeres, mangler i svaret. */
export async function getSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await bucket().createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  if (error) throw storageError('photo_urls_failed', error);
  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return urls;
}
