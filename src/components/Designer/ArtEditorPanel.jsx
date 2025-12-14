import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, Space, Tooltip, ColorPicker, Slider, Typography, Divider, Switch, Row, Col } from 'antd';
import {
  CloseOutlined,
  SaveOutlined,
  CheckOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const presetColors = [
  {
    label: '常用颜色',
    colors: [
      '#FFFFFF', '#000000', '#FFD700', '#FC0000',
      '#AAAAAA', '#4285F4', '#FFFF00',
    ],
    disabled: false,
  },
];

const simplePresetColors = presetColors[0].colors;

// 辅助组件：颜色色块，支持透明色显示
const ColorSwatches = ({ colors, onColorSelect, selectedColor, disabled = false }) => (
  <Space wrap style={{ gap: '6px' }}> {/* 增加间距以便更好对齐 */}
    {colors.map(color => {
      // 判断是否被选中
      let isSelected = false;
      const isTransparentColor = color === 'transparent' || color === 'rgba(0, 0, 0, 0)';

      if (selectedColor) {
        if (isTransparentColor) {
          isSelected = selectedColor === 'transparent' || selectedColor === 'rgba(0, 0, 0, 0)';
        } else {
          isSelected = selectedColor.toLowerCase() === color.toLowerCase();
        }
      } else if (isTransparentColor) {
        isSelected = false;
      }

      // 统一色块样式
      const style = {
        width: '24px',
        height: '24px',
        padding: 0,
        borderRadius: '4px', // 统一圆角
        border: isSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
        backgroundColor: isTransparentColor ? '#fff' : color,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box', // 确保边框不影响大小
      };

      if (isTransparentColor) {
        style.backgroundImage = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        style.backgroundSize = '10px 10px';
        style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
      }

      return (
        <Tooltip title={isTransparentColor ? 'Transparent' : color} key={color}>
          <Button
            onClick={() => onColorSelect(isTransparentColor ? 'transparent' : color)}
            disabled={disabled}
            style={style}
          >
            {/* 为透明色块添加一个红色斜杠以增强可视性 */}
            {isTransparentColor && (
              <div style={{
                width: '150%',
                height: '1px',
                background: '#ff4d4f',
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
              }} />
            )}
          </Button>
        </Tooltip>
      );
    })}
  </Space>
);

/**
 * 图案编辑面板组件
 * 包含 Keep Color, Insert, Special Filling 三种预设模式
 */
const ArtEditorPanel = ({
  art,
  onClose,
  fillColor,
  setFillColor,
  onLineColorChange,
  onLineAlphaChange,
  isFillModeActive,
  setIsFillModeActive,
  onSaveToArtOptions,
  isPartialFill = false,
  setIsPartialFill = () => { },
}) => {
  // Mock translation function
  const t = (key, defaultText) => {
    const textMap = {
      'artEditor.title': '图案编辑',
      'artEditor.saveToLibrary': '保存到库',
      'common.save': '保存',
      'artEditor.colorEditing': '颜色编辑',
      'artEditor.fillColor': '填充颜色',
      'artEditor.enable': '启用',
      'artEditor.disable': '禁用',
      'artEditor.transparent': '透明',
      'colors.custom': '自定义',
      'artEditor.lineColor': '线条颜色',
      'artEditor.lineOpacity': '线条透明度',
    };
    return textMap[key] || defaultText || key;
  };

  const nodeRef = useRef(null);

  // 'keepColor' | 'insert' | 'specialFilling'
  const [activeMode, setActiveMode] = useState('keepColor');

  if (!art) return null;

  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;
  const isTransparent = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';
  const currentFillColor = isTransparent ? 'transparent' : (fillColor || '#4285F4');

  // 构建包含透明色的显示列表
  const displayColors = ['transparent', ...simplePresetColors.slice(0, 5)];

  // 根据当前属性自动判断并更新 activeMode UI 状态
  useEffect(() => {
    if (currentLineAlpha === 0 && isFillModeActive) {
      setActiveMode('insert');
    } else if (!isFillModeActive || isTransparent) {
      setActiveMode('keepColor');
    } else {
      setActiveMode('specialFilling');
    }
  }, [art.id, currentLineAlpha, isFillModeActive, isTransparent]);

  const handleLineColor = (color) => {
    const hex = typeof color === 'string' ? color : color.toHexString();
    if (color === 'transparent') {
      onLineAlphaChange(art.id, 0);
    } else {
      onLineColorChange(art.id, hex);
      if (currentLineAlpha < 0.05) {
        onLineAlphaChange(art.id, 1.0);
      }
    }
  };

  const handleLineAlpha = (value) => {
    onLineAlphaChange(art.id, value);
  };

  const handleFillColor = (color) => {
    if (color === 'transparent') {
      setFillColor('transparent');
      setIsFillModeActive(true);
    } else {
      const val = typeof color === 'string' ? color : color.toRgbString();
      setFillColor(val);
      if (!isFillModeActive) {
        setIsFillModeActive(true);
      }
    }
  };

  // 模式切换处理
  const handleSetMode = (mode) => {
    setActiveMode(mode);

    if (mode === 'keepColor') {
      setIsFillModeActive(false);
      setFillColor('transparent');
      handleLineColor('#FFFFFF'); // 默认线条白色
      handleLineAlpha(1.0);
      setIsPartialFill(false);
    } else if (mode === 'insert') {
      setIsFillModeActive(true);
      if (isTransparent) setFillColor('#FFFFFF');
      handleLineAlpha(0);
      setIsPartialFill(false); // 切换模式时重置局部填充状态
    } else if (mode === 'specialFilling') {
      setIsFillModeActive(true);
      if (isTransparent) setFillColor('#FFFFFF');
      handleLineColor('#000000');
      handleLineAlpha(1.0);
      setIsPartialFill(false); // 切换模式时重置局部填充状态
    }
  };

  // 针对 Keep Color 模式的颜色选择处理函数
  // 用户在 Keep Color 模式下选择颜色时，实际上是在修改线条颜色
  const handleKeepColorSelection = (color) => {
    handleLineColor(color);
  };

  // 小按钮通用样式 (Frost, P) - 调小尺寸以对齐颜色块 (24px height)
  const smallBtnStyle = {
    height: '24px',
    lineHeight: '1',
    fontSize: '12px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px'
  };

  // P 按钮 - 样式调整为选中变深色 (#3E3A32)，并根据当前模式决定是否高亮
  const PartialButton = ({ forMode }) => {
    // 只有当全局启用 Partial Fill 且 当前模式与按钮所属模式一致时，才显示激活状态
    const isActive = isPartialFill && activeMode === forMode;

    const handleClick = () => {
      // 如果点击的是非当前模式的 P 按钮，先切换模式，再开启 P
      if (activeMode !== forMode) {
        handleSetMode(forMode);
        // 使用 setTimeout 确保在 handleSetMode 的状态更新后执行
        setTimeout(() => setIsPartialFill(true), 0);
      } else {
        // 同一模式下，切换 P 状态
        setIsPartialFill(!isPartialFill);
      }
    };

    return (
      <Button
        size="small"
        onClick={handleClick}
        style={{
          ...smallBtnStyle,
          fontWeight: 'bold',
          background: isActive ? '#3E3A32' : '#fff',
          color: isActive ? '#fff' : 'rgba(0, 0, 0, 0.88)',
          border: isActive ? '1px solid #3E3A32' : '1px solid #d9d9d9'
        }}
      >
        P
      </Button>
    );
  };

  // 模式选择按钮通用样式 - 选中后统一为 #3E3A32，文字变白
  const getModeBtnStyle = (modeName) => ({
    background: activeMode === modeName ? '#3E3A32' : '#f5f5f5', // 选中深色，未选中浅灰
    color: activeMode === modeName ? '#fff' : '#000', // 选中白色文字
    border: '1px solid transparent',
    borderColor: activeMode === modeName ? '#3E3A32' : '#f0f0f0',
    textAlign: 'left',
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start' // 强制左对齐
  });

  return (
    <div
      ref={nodeRef}
      className="tool-panel art-editor-panel"
      style={{
        width: 360, // 调整面板宽度变宽
        position: 'fixed',
        zIndex: 100,
        top: '100px',
        right: '20px',
      }}
    >
      <Card
        title={t('artEditor.title')}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
        bodyStyle={{ padding: '16px' }}
      >
        <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>

          {/* 移除了保存到库按钮，因为已移动到 HUD */}

          {/* --- 模式 A: Keep Color --- */}
          <div>
            <div
              onClick={() => handleSetMode('keepColor')}
              style={{
                ...getModeBtnStyle('keepColor'),
                padding: '4px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                height: '32px', // 统一高度
                transition: 'all 0.2s',
                marginBottom: '8px'
              }}
            >
              {activeMode === 'keepColor' && <CheckOutlined style={{ marginRight: 8 }} />}
              <Text strong style={{ color: 'inherit' }}>Keep Color</Text>
            </div>
            {/* Keep Color 模式下的颜色选择器 (修改线条颜色) */}
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Text style={{ fontSize: '12px', width: '36px' }}>Color</Text>
                <ColorSwatches
                  colors={displayColors}
                  onColorSelect={handleKeepColorSelection}
                  selectedColor={currentLineColor}
                />
                <ColorPicker
                  value={currentLineColor}
                  onChange={handleKeepColorSelection}
                  size="small"
                  style={{ width: '24px', height: '24px' }}
                />
              </div>
            </div>
          </div>

          {/* --- 模式 B: Insert --- */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <Button
                style={{ ...getModeBtnStyle('insert'), flex: 1, height: '32px', paddingLeft: '15px' }}
                onClick={() => handleSetMode('insert')}
              >
                {activeMode === 'insert' && <CheckOutlined style={{ marginRight: 8 }} />}
                Insert
              </Button>
              {/* Frost & P 按钮与 Insert 按钮行对齐 */}
              <Button size="small" disabled style={smallBtnStyle}>Frost</Button>
              <PartialButton forMode="insert" />
            </div>

            <div style={{ paddingLeft: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Text style={{ fontSize: '12px', width: '36px' }}>Color</Text> {/* 增加固定宽度确保对齐 */}
                <ColorSwatches
                  colors={displayColors}
                  onColorSelect={handleFillColor}
                  selectedColor={currentFillColor}
                />
                <ColorPicker
                  value={currentFillColor === 'transparent' ? '#FFFFFF' : currentFillColor}
                  onChange={handleFillColor}
                  size="small"
                  style={{ width: '24px', height: '24px' }} // 确保 Picker 大小一致
                />
              </div>
            </div>
          </div>

          {/* --- 模式 C: Special Filling --- */}
          <div>
            <Button
              style={{ ...getModeBtnStyle('specialFilling'), width: '100%', marginBottom: '8px', height: '32px', paddingLeft: '15px' }}
              onClick={() => handleSetMode('specialFilling')}
            >
              {activeMode === 'specialFilling' && <CheckOutlined style={{ marginRight: 8 }} />}
              Special Filling
            </Button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>

              {/* Surface Color */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                  <Text style={{ fontSize: '12px' }}>Surface Color</Text>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Button size="small" disabled style={smallBtnStyle}>Frost</Button>
                    <PartialButton forMode="specialFilling" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ColorSwatches
                    colors={displayColors}
                    onColorSelect={handleFillColor}
                    selectedColor={currentFillColor}
                  />
                  <ColorPicker
                    value={currentFillColor === 'transparent' ? '#FFFFFF' : currentFillColor}
                    onChange={handleFillColor}
                    size="small"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              </div>

              {/* Outline Color */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                  <Text style={{ fontSize: '12px' }}>Outline Color</Text>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button size="small" disabled style={smallBtnStyle}>Frost</Button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ColorSwatches
                    colors={displayColors}
                    onColorSelect={handleLineColor}
                    selectedColor={currentLineAlpha < 0.05 ? 'transparent' : currentLineColor}
                  />
                  <ColorPicker
                    value={currentLineColor}
                    onChange={handleLineColor}
                    size="small"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              </div>

            </div>
          </div>

        </Space>
      </Card>
    </div>
  );
};

export default ArtEditorPanel;