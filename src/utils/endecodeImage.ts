import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

export const saveImage = async (base64Image: string): Promise<string> => {
  const matches = base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const buffer = Buffer.from(matches[2], 'base64');
  const IMAGEPATH = process.env.IMAGEPATH || '';
  const fileNameJPG = `${Date.now()}.jpg`;
  const thumbnailImage = `thumbnail-${Date.now()}.webp`;
  const originalImage = `${Date.now()}.webp`;

  const filePath = path.join(IMAGEPATH, fileNameJPG);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 원본 파일로 저장
  fs.writeFileSync(filePath, buffer);

  // WebP 형식으로 변환 - 원본 이미지
  const originalImagePath = path.join(IMAGEPATH, originalImage);
  const thumbnailImagePath = path.join(IMAGEPATH, thumbnailImage);
  try {
    // 원본 이미지 WebP로 변환
    await sharp(buffer)
      .withMetadata()
      .webp()
      .rotate()
      .toFile(originalImagePath);
  } catch (error) {
    console.error(`Error converting original image to WebP: ${error.message}`);
  }

  try {
    // 썸네일 이미지 WebP로 변환
    await sharp(buffer)
      .withMetadata()
      .rotate()
      .resize(140, 200)
      .webp({
        quality: 30,
      })
      .toFile(thumbnailImagePath);
  } catch (error) {
    console.error(`Error converting thumbnail image to WebP: ${error.message}`);
  }

  fs.unlink(filePath, (err) => {
    if (err && err.code == 'ENOENT') {
      console.log('파일 삭제 Error 발생');
    }
  });

  return originalImage;
};

export const encodeImageToBase64 = (filePath: string): string => {
  try {
    const file = fs.readFileSync(filePath);
    return `data:image/jpg;base64,${file.toString('base64')}`;
  } catch (error) {
    return '';
  }
};
