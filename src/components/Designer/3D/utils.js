// src/components/Designer/3D/utils.js
import * as THREE from 'three';

// Flood Fill：按像素替换填充区域，但保留原始黑线防止被覆盖
// 【修复】newColor 现在接收 [r, g, b, a]，支持透明度
// 【新增】patternImageData: 支持纹理图案填充
export const floodFill = (context, canvas, originalImageData, canvasTexture, startX, startY, newColor, patternImageData = null) => {
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const originalData = originalImageData.data;

  // 如果有图案数据，获取其 data 和尺寸
  const pData = patternImageData ? patternImageData.data : null;
  const pWidth = patternImageData ? patternImageData.width : 0;
  const pHeight = patternImageData ? patternImageData.height : 0;

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

  // 如果是纯色填充，且颜色已匹配，则跳过
  // 如果是图案填充，暂时不通过颜色判断跳过（简化逻辑，或者可以检查 pattern 标记）
  if (!patternImageData) {
    if (data[startIdx] === newColor[0] &&
      data[startIdx + 1] === newColor[1] &&
      data[startIdx + 2] === newColor[2] &&
      data[startIdx + 3] === targetAlpha) {
      return;
    }
  }

  const queue = [[startX, startY]];
  const visited = new Uint8Array(width * height); // 使用 visited 数组防止重复访问，特别是对于图案填充

  // 简单的防止死循环计数器
  let maxIter = width * height;

  while (queue.length > 0 && maxIter > 0) {
    const [x, y] = queue.shift();
    maxIter--;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = getPixelIndex(x, y);

    if (visited[y * width + x]) continue;
    visited[y * width + x] = 1;

    if (isPixelLine(idx)) {
      continue;
    }

    // 如果当前像素已经是目标颜色，跳过 (仅限纯色模式)
    if (!patternImageData) {
      if (data[idx] === newColor[0] &&
        data[idx + 1] === newColor[1] &&
        data[idx + 2] === newColor[2] &&
        data[idx + 3] === targetAlpha) {
        continue;
      }
    }

    if (patternImageData) {
      // --- 图案填充逻辑 ---
      // 计算图案坐标 (重复/Tiling)
      let px = x % pWidth;
      let py = y % pHeight;
      if (px < 0) px += pWidth;
      if (py < 0) py += pHeight;

      const pIdx = (py * pWidth + px) * 4;

      data[idx] = pData[pIdx];     // R
      data[idx + 1] = pData[pIdx + 1]; // G
      data[idx + 2] = pData[pIdx + 2]; // B
      data[idx + 3] = pData[pIdx + 3]; // A (通常纹理是 255)
    } else {
      // --- 纯色填充逻辑 ---
      data[idx] = newColor[0];
      data[idx + 1] = newColor[1];
      data[idx + 2] = newColor[2];
      data[idx + 3] = targetAlpha;
    }

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  context.putImageData(imageData, 0, 0);
  canvasTexture.needsUpdate = true;
};

// 颜色名 -> 十六进制值映射
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

// 获取扫砂贴图路径
export const getFrostTexturePath = (color) => {
  const colorFolderMap = {
    'Bahama Blue': 'Bahama Blue',
    'Black': 'Black',
    'Blue Pearl': 'Blue Pearl',
    'Charcoal': 'Charcoal',
    'Grey': 'Grey',
    'Ocean Green': 'Ocean Green',
    'Paradiso': 'Paradiso',
    'PG red': 'PG red',
    'Pink': 'Pink',
    'Rustic Mahgoany': 'Rustic Mahgoany'
  };
  const folder = colorFolderMap[color] || 'Black';
  // 根据用户需求，路径指向 Shapes/Tablet/{Color}/扫砂.jpg
  return `/textures/Shapes/Tablet/${folder}/扫砂.jpg`;
};