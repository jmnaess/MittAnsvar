import { centerSquare, memberPhoto, newPhotoPath, photoFolder, photoPathsToSign } from '../photo';

describe('centerSquare', () => {
  it('beskjærer midt i et liggende bilde', () => {
    expect(centerSquare(1000, 600)).toEqual({ originX: 200, originY: 0, width: 600, height: 600 });
  });

  it('beskjærer midt i et stående bilde', () => {
    expect(centerSquare(600, 1001)).toEqual({ originX: 0, originY: 200, width: 600, height: 600 });
  });

  it('kvadratisk bilde er uendret', () => {
    expect(centerSquare(512, 512)).toEqual({ originX: 0, originY: 0, width: 512, height: 512 });
  });
});

const PATH = 'hh/m1/f1.jpg';

describe('memberPhoto', () => {
  const urls = { [PATH]: 'https://signed/url' };

  it('figur-modus gir figuren, selv med bilde og URL', () => {
    expect(memberPhoto({ avatar_mode: 'figure', photo_path: PATH }, urls)).toBeUndefined();
  });

  it('bilde-modus uten bilde gir figuren', () => {
    expect(memberPhoto({ avatar_mode: 'photo', photo_path: null }, urls)).toBeUndefined();
  });

  it('bilde-modus uten URL (ikke hentet ennå eller feilet) gir figuren', () => {
    expect(memberPhoto({ avatar_mode: 'photo', photo_path: PATH }, undefined)).toBeUndefined();
    expect(memberPhoto({ avatar_mode: 'photo', photo_path: PATH }, {})).toBeUndefined();
  });

  it('bilde-modus med URL gir bildet, med stien som cache-nøkkel', () => {
    expect(memberPhoto({ avatar_mode: 'photo', photo_path: PATH }, urls)).toEqual({
      uri: 'https://signed/url',
      cacheKey: PATH,
    });
  });
});

describe('photoPathsToSign', () => {
  it('tar bare med dem som viser bilde, uten duplikater, sortert', () => {
    expect(
      photoPathsToSign([
        { avatar_mode: 'photo', photo_path: 'b.jpg' },
        { avatar_mode: 'figure', photo_path: 'c.jpg' },
        { avatar_mode: 'photo', photo_path: null },
        { avatar_mode: 'photo', photo_path: 'a.jpg' },
        { avatar_mode: 'photo', photo_path: 'b.jpg' },
      ]),
    ).toEqual(['a.jpg', 'b.jpg']);
  });
});

describe('stier', () => {
  it('mappe og fil følger {household}/{member}/{fil}.jpg', () => {
    expect(photoFolder('hh', 'm1')).toBe('hh/m1');
    expect(newPhotoPath('hh', 'm1', 'f1')).toBe('hh/m1/f1.jpg');
  });
});
