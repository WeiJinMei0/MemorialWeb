import * as THREE from 'three';

// Flood Fill：按像素替换填充区域，但保留原始黑线防止被覆盖
export const floodFill = (context, canvas, originalImageData, canvasTexture, startX, startY, newColor) => {
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const originalData = originalImageData.data;

  const getPixelIndex = (x, y) => (y * width + x) * 4;

  const isPixelLine = (idx) => {
    return originalData[idx] < 100 &&
      originalData[idx + 1] < 100 &&
      originalData[idx + 2] < 100 &&
      originalData[idx + 3] > 10;
  };

  const startIdx = getPixelIndex(startX, startY);

  if (isPixelLine(startIdx)) {
    return;
  }

  if (data[startIdx] === newColor[0] &&
    data[startIdx + 1] === newColor[1] &&
    data[startIdx + 2] === newColor[2] &&
    data[startIdx + 3] === 255) {
    return;
  }

  const queue = [[startX, startY]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = getPixelIndex(x, y);

    if (isPixelLine(idx)) {
      continue;
    }

    if (data[idx] === newColor[0] &&
      data[idx + 1] === newColor[1] &&
      data[idx + 2] === newColor[2] &&
      data[idx + 3] === 255) {
      continue;
    }

    data[idx] = newColor[0];
    data[idx + 1] = newColor[1];
    data[idx + 2] = newColor[2];
    data[idx + 3] = 255;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  context.putImageData(imageData, 0, 0);
  canvasTexture.needsUpdate = true;
};

// 颜色名 -> 十六进制值映射，供老数据沿用
export const getColorValue = (color) => {
  const colorMap = {
    'Black': 0x333333,
    'Red': 0x8B0000,
    'Grey': 0x808080,
    'Blue': 0x0000CD,
    'Green': 0x006400
  };
  return colorMap[color] || 0x333333;
};