// src/components/Designer/3D/utils.js
import * as THREE from 'three';

// Flood Fill：按像素替换填充区域，但保留原始黑线防止被覆盖
// 【修复】newColor 现在接收 [r, g, b, a]，支持透明度
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

  // 检查是否已经是目标颜色 (包括 alpha)
  // 注意：newColor[3] 如果未定义则默认为 255
  const targetAlpha = newColor[3] !== undefined ? newColor[3] : 255;

  if (data[startIdx] === newColor[0] &&
    data[startIdx + 1] === newColor[1] &&
    data[startIdx + 2] === newColor[2] &&
    data[startIdx + 3] === targetAlpha) {
    return;
  }

  const queue = [[startX, startY]];

  // 简单的防止死循环计数器
  let maxIter = width * height;

  while (queue.length > 0 && maxIter > 0) {
    const [x, y] = queue.shift();
    maxIter--;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = getPixelIndex(x, y);

    if (isPixelLine(idx)) {
      continue;
    }

    // 如果当前像素已经是目标颜色，跳过
    if (data[idx] === newColor[0] &&
      data[idx + 1] === newColor[1] &&
      data[idx + 2] === newColor[2] &&
      data[idx + 3] === targetAlpha) {
      continue;
    }

    // 【关键修复】：应用颜色和透明度
    data[idx] = newColor[0];
    data[idx + 1] = newColor[1];
    data[idx + 2] = newColor[2];
    data[idx + 3] = targetAlpha; // 使用传入的 alpha，不再硬编码 255

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