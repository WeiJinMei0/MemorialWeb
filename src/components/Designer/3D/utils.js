// src/components/Designer/3D/utils.js
import * as THREE from 'three';

// Flood Fill：按像素替换填充区域，但保留原始黑线防止被覆盖
// 【修复】newColor 现在接收 [r, g, b, a]，支持透明度
// 【新增】patternImageData: 支持纹理图案填充
// 【性能优化】使用双指针队列替代 shift() 操作
export const floodFill = (context, canvas, originalImageData, canvasTexture, startX, startY, newColor, patternImageData = null) => {
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const originalData = originalImageData.data;

  // 如果有图案数据，获取其 data 和尺寸
  const pData = patternImageData ? patternImageData.data : null;
  const pWidth = patternImageData ? patternImageData.width : 0;
  const pHeight = patternImageData ? patternImageData.height : 0;

  // 【性能优化】内联计算索引，避免函数调用开销
  const startIdx = (startY * width + startX) * 4;

  // 【性能优化】内联线条判断逻辑
  if (originalData[startIdx] < 100 &&
    originalData[startIdx + 1] < 100 &&
    originalData[startIdx + 2] < 100 &&
    originalData[startIdx + 3] > 10) {
    return;
  }

  // 检查是否已经是目标颜色 (包括 alpha)
  const targetAlpha = newColor[3] !== undefined ? newColor[3] : 255;
  const [targetR, targetG, targetB] = newColor;

  // 如果是纯色填充，且颜色已匹配，则跳过
  if (!patternImageData) {
    if (data[startIdx] === targetR &&
      data[startIdx + 1] === targetG &&
      data[startIdx + 2] === targetB &&
      data[startIdx + 3] === targetAlpha) {
      return;
    }
  }

  // 【性能优化】使用 Uint32Array 队列和双指针，避免 shift() 的 O(n) 开销
  const maxSize = width * height * 2; // x, y 交替存储
  const queue = new Uint32Array(maxSize);
  let head = 0;
  let tail = 0;

  // 添加起始点
  queue[tail++] = startX;
  queue[tail++] = startY;

  const visited = new Uint8Array(width * height);

  while (head < tail) {
    const x = queue[head++];
    const y = queue[head++];

    if (x >= width || y >= height) continue; // Uint32 不会小于 0

    const pixelIdx = y * width + x;
    if (visited[pixelIdx]) continue;
    visited[pixelIdx] = 1;

    const idx = pixelIdx * 4;

    // 内联线条检查
    if (originalData[idx] < 100 &&
      originalData[idx + 1] < 100 &&
      originalData[idx + 2] < 100 &&
      originalData[idx + 3] > 10) {
      continue;
    }

    // 如果当前像素已经是目标颜色，跳过 (仅限纯色模式)
    if (!patternImageData) {
      if (data[idx] === targetR &&
        data[idx + 1] === targetG &&
        data[idx + 2] === targetB &&
        data[idx + 3] === targetAlpha) {
        continue;
      }
    }

    if (patternImageData) {
      // --- 图案填充逻辑 ---
      let px = x % pWidth;
      let py = y % pHeight;
      const pIdx = (py * pWidth + px) * 4;

      data[idx] = pData[pIdx];
      data[idx + 1] = pData[pIdx + 1];
      data[idx + 2] = pData[pIdx + 2];
      data[idx + 3] = pData[pIdx + 3];
    } else {
      // --- 纯色填充逻辑 ---
      data[idx] = targetR;
      data[idx + 1] = targetG;
      data[idx + 2] = targetB;
      data[idx + 3] = targetAlpha;
    }

    // 【性能优化】直接添加坐标到队列，使用 Uint32 自动处理负数边界
    if (x + 1 < width) { queue[tail++] = x + 1; queue[tail++] = y; }
    if (x > 0) { queue[tail++] = x - 1; queue[tail++] = y; }
    if (y + 1 < height) { queue[tail++] = x; queue[tail++] = y + 1; }
    if (y > 0) { queue[tail++] = x; queue[tail++] = y - 1; }
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