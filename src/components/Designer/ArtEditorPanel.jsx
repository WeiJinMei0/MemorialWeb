import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, Space, Tooltip, ColorPicker, Typography } from 'antd';
import {
  CloseOutlined,
  CheckOutlined
} from '@ant-design/icons';
import './ArtEditorPanel.css';

const { Text } = Typography;

const presetColors = [
  {
    // Label will be handled dynamically in the component if needed, 
    // strictly keeping colors here.
    colors: [
      '#FFFFFF', '#000000', '#FFD700', '#FC0000',
      '#AAAAAA', '#4285F4', '#FFFF00',
    ],
    disabled: false,
  },
];

const simplePresetColors = presetColors[0].colors;

// 辅助组件：颜色色块，支持透明色显示
const ColorSwatches = ({ colors, onColorSelect, selectedColor, disabled = false, t }) => (
  <Space wrap className="swatches-space">
    {colors.map(color => {
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

      const btnClass = `swatch-btn ${isSelected ? 'selected' : 'not-selected'} ${isTransparentColor ? 'is-transparent' : ''}`;
      const inlineStyle = !isTransparentColor ? { backgroundColor: color } : {};

      // Use translation for tooltip
      const tooltipTitle = isTransparentColor
        ? t('backgrounds.transparent', 'Transparent')
        : color;

      return (
        <Tooltip title={tooltipTitle} key={color}>
          <Button
            onClick={() => onColorSelect(isTransparentColor ? 'transparent' : color)}
            disabled={disabled}
            className={btnClass}
            style={inlineStyle}
          >
            {isTransparentColor && <div className="transparent-slash" />}
          </Button>
        </Tooltip>
      );
    })}
  </Space>
);

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
  // Mock translation function - In production, replace with: const { t } = useTranslation();
  const t = (key, defaultText) => {
    // This map simulates your JSON files structure
    const textMap = {
      'artEditor.title': 'Edit Pattern',
      'backgrounds.transparent': 'Transparent',
      'artEditor.keepColor': 'Keep Color',
      'artEditor.insert': 'Insert',
      'artEditor.specialFilling': 'Special Filling',
      'artEditor.surfaceColor': 'Surface Color',
      'artEditor.outlineColor': 'Outline Color',
      'artEditor.frost': 'Frost',
      'textEditor.color': 'Color', // Reusing existing key from textEditor
    };
    // In a real app, this returns the string from en.json/es.json/fr.json
    return textMap[key] || defaultText || key;
  };

  const nodeRef = useRef(null);

  if (!art) return null;

  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;
  const isTransparent = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';
  const currentFillColor = isTransparent ? 'transparent' : (fillColor || '#4285F4');
  const isFrost = fillColor === 'frost';

  // 'keepColor' | 'insert' | 'specialFilling'
  const [activeMode, setActiveMode] = useState('keepColor');

  // Isolated configuration for each mode
  const [modeConfigs, setModeConfigs] = useState(() => ({
    keepColor: {
      lineColor: currentLineColor,
      lineAlpha: currentLineAlpha
    },
    insert: {
      fillColor: currentFillColor,
      isFrost: isFrost,
      isPartialFill: isPartialFill
    },
    specialFilling: {
      fillColor: currentFillColor,
      lineColor: currentLineColor,
      lineAlpha: currentLineAlpha,
      isFrost: isFrost,
      isPartialFill: isPartialFill
    }
  }));

  // Reset configs when switching to a different art object
  useEffect(() => {
    setModeConfigs({
      keepColor: {
        lineColor: currentLineColor,
        lineAlpha: currentLineAlpha
      },
      insert: {
        fillColor: currentFillColor,
        isFrost: isFrost,
        isPartialFill: isPartialFill
      },
      specialFilling: {
        fillColor: currentFillColor,
        lineColor: currentLineColor,
        lineAlpha: currentLineAlpha,
        isFrost: isFrost,
        isPartialFill: isPartialFill
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art.id]);

  const displayColors = ['transparent', ...simplePresetColors.slice(0, 5)];

  // Sync current properties to the active mode's config
  useEffect(() => {
    setModeConfigs(prev => {
      const newConfig = { ...prev };
      if (activeMode === 'keepColor') {
        newConfig.keepColor = {
          lineColor: currentLineColor,
          lineAlpha: currentLineAlpha
        };
      } else if (activeMode === 'insert') {
        newConfig.insert = {
          fillColor: currentFillColor,
          isFrost: isFrost,
          isPartialFill: isPartialFill
        };
      } else if (activeMode === 'specialFilling') {
        newConfig.specialFilling = {
          fillColor: currentFillColor,
          lineColor: currentLineColor,
          lineAlpha: currentLineAlpha,
          isFrost: isFrost,
          isPartialFill: isPartialFill
        };
      }
      return newConfig;
    });
  }, [currentLineColor, currentLineAlpha, currentFillColor, isFrost, isPartialFill, activeMode]);

  useEffect(() => {
    if (currentLineAlpha === 0 && isFillModeActive) {
      setActiveMode('insert');
    } else if ((!isFillModeActive || isTransparent) && !isPartialFill && !isFrost) {
      // 【修改】：当启用局部填充(p选项)时，即使选择了透明色，也不应该强制跳转到 keepColor
      // 【新增】：当选择了 Frost 模式时，也不要跳转到 keepColor
      setActiveMode('keepColor');
    } else {
      setActiveMode('specialFilling');
    }
  }, [art.id, currentLineAlpha, isFillModeActive, isTransparent, isPartialFill, isFrost]);

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
    } else if (color === 'frost') {
      // 【新增】处理 Frost 模式
      setFillColor('frost');
      setIsFillModeActive(true);
    } else {
      const val = typeof color === 'string' ? color : color.toRgbString();
      setFillColor(val);
      if (!isFillModeActive) {
        setIsFillModeActive(true);
      }
    }
  };

  const handleSetMode = (mode) => {
    setActiveMode(mode);
    const config = modeConfigs[mode];

    if (mode === 'keepColor') {
      setIsFillModeActive(false);
      setFillColor('transparent');
      onLineColorChange(art.id, config.lineColor);
      onLineAlphaChange(art.id, config.lineAlpha);
      setIsPartialFill(false);
    } else if (mode === 'insert') {
      setIsFillModeActive(true);
      onLineAlphaChange(art.id, 0);
      if (config.isFrost) {
        setFillColor('frost');
      } else {
        setFillColor(config.fillColor === 'transparent' ? '#FFFFFF' : config.fillColor);
      }
      setIsPartialFill(config.isPartialFill);
    } else if (mode === 'specialFilling') {
      setIsFillModeActive(true);
      onLineColorChange(art.id, config.lineColor);
      onLineAlphaChange(art.id, config.lineAlpha);
      if (config.isFrost) {
        setFillColor('frost');
      } else {
        setFillColor(config.fillColor === 'transparent' ? '#FFFFFF' : config.fillColor);
      }
      setIsPartialFill(config.isPartialFill);
    }
  };

  const handleKeepColorSelection = (color) => {
    handleLineColor(color);
  };

  const PartialButton = ({ forMode }) => {
    const isPartial = activeMode === forMode ? isPartialFill : modeConfigs[forMode].isPartialFill;
    const isActive = isPartial;
    const btnClass = `small-btn partial-btn ${isActive ? 'active' : 'inactive'}`;

    const handleClick = () => {
      if (activeMode !== forMode) {
        // If we allow clicking to switch mode:
        handleSetMode(forMode);
        setTimeout(() => setIsPartialFill(true), 0);
      } else {
        setIsPartialFill(!isPartialFill);
      }
    };

    return (
      <Button
        size="small"
        onClick={handleClick}
        className={btnClass}
        disabled={activeMode !== forMode}
      >
        P
      </Button>
    );
  };

  const getModeBtnClass = (modeName) => {
    return `mode-btn ${activeMode === modeName ? 'active' : 'inactive'}`;
  };

  const getDisplayFillColor = (mode) => {
    if (mode === activeMode) return isFrost ? null : currentFillColor;
    const config = modeConfigs[mode];
    return config.isFrost ? null : config.fillColor;
  };

  const getDisplayLineColor = (mode) => {
    if (mode === activeMode) return currentLineAlpha < 0.05 ? 'transparent' : currentLineColor;
    const config = modeConfigs[mode];
    return config.lineAlpha < 0.05 ? 'transparent' : config.lineColor;
  };

  const isModeFrost = (mode) => {
    if (mode === activeMode) return isFrost;
    return modeConfigs[mode].isFrost;
  };

  return (
    <div
      ref={nodeRef}
      className="tool-panel art-editor-panel"
    >
      <Card
        title={t('artEditor.title', 'Edit Pattern')}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
        bodyStyle={{ padding: 0 }}
        className="art-editor-card"
      >
        <div className="art-editor-card-body">
          <Space direction="vertical" className="panel-content-space">

            {/* --- Mode A: Keep Color --- */}
            <div>
              <div
                onClick={() => handleSetMode('keepColor')}
                className={getModeBtnClass('keepColor')}
              >
                {activeMode === 'keepColor' && <CheckOutlined style={{ marginRight: 8 }} />}
                <Text strong>{t('artEditor.keepColor', 'Keep Color')}</Text>
              </div>
              <div className="section-padding" style={{ opacity: activeMode === 'keepColor' ? 1 : 0.5, pointerEvents: activeMode === 'keepColor' ? 'auto' : 'none' }}>
                <div className="color-row mb-4">
                  {/* Reuse "Color" from textEditor or add to artEditor */}
                  <Text className="color-label">{t('textEditor.color', 'Color')}</Text>
                  <ColorSwatches
                    colors={displayColors}
                    onColorSelect={handleKeepColorSelection}
                    selectedColor={getDisplayLineColor('keepColor')}
                    disabled={activeMode !== 'keepColor'}
                    t={t}
                  />
                  <ColorPicker
                    value={getDisplayLineColor('keepColor')}
                    onChange={handleKeepColorSelection}
                    disabled={activeMode !== 'keepColor'}
                    size="small"
                    className="color-picker-sm"
                  />
                </div>
              </div>
            </div>

            {/* --- Mode B: Insert --- */}
            <div>
              <div className="btn-group-row">
                <Button
                  className={getModeBtnClass('insert')}
                  style={{ flex: 1, marginBottom: 0 }}
                  onClick={() => handleSetMode('insert')}
                >
                  {activeMode === 'insert' && <CheckOutlined style={{ marginRight: 8 }} />}
                  {t('artEditor.insert', 'Insert')}
                </Button>
                {/* 【启用 Frost 按钮】 */}
                <Button
                  size="small"
                  className={`small-btn ${isModeFrost('insert') ? 'active-frost' : ''}`}
                  onClick={() => {
                    handleSetMode('insert');
                    handleFillColor('frost');
                  }}
                  disabled={activeMode !== 'insert'}
                  style={isModeFrost('insert') ? { borderColor: '#1890ff', color: '#1890ff', background: '#e6f7ff' } : {}}
                >
                  {t('artEditor.frost', 'Frost')}
                </Button>
                <PartialButton forMode="insert" />
              </div>

              <div className="section-padding" style={{ opacity: activeMode === 'insert' ? 1 : 0.5, pointerEvents: activeMode === 'insert' ? 'auto' : 'none' }}>
                <div className="color-row mb-4">
                  <Text className="color-label">{t('textEditor.color', 'Color')}</Text>
                  <ColorSwatches
                    colors={displayColors}
                    onColorSelect={handleFillColor}
                    selectedColor={getDisplayFillColor('insert')}
                    disabled={activeMode !== 'insert'}
                    t={t}
                  />
                  <ColorPicker
                    value={getDisplayFillColor('insert') === 'transparent' || isModeFrost('insert') ? '#FFFFFF' : getDisplayFillColor('insert')}
                    onChange={handleFillColor}
                    disabled={activeMode !== 'insert'}
                    size="small"
                    className="color-picker-sm"
                  />
                </div>
              </div>
            </div>

            {/* --- Mode C: Special Filling --- */}
            <div>
              <Button
                className={getModeBtnClass('specialFilling')}
                style={{ width: '100%' }}
                onClick={() => handleSetMode('specialFilling')}
              >
                {activeMode === 'specialFilling' && <CheckOutlined style={{ marginRight: 8 }} />}
                {t('artEditor.specialFilling', 'Special Filling')}
              </Button>

              <div className="section-padding section-column" style={{ opacity: activeMode === 'specialFilling' ? 1 : 0.5, pointerEvents: activeMode === 'specialFilling' ? 'auto' : 'none' }}>

                {/* Surface Color */}
                <div>
                  <div className="header-row">
                    <Text style={{ fontSize: '12px' }}>{t('artEditor.surfaceColor', 'Surface Color')}</Text>
                    <div className="btn-group-right">
                      {/* 【启用 Frost 按钮】 */}
                      <Button
                        size="small"
                        className={`small-btn ${isModeFrost('specialFilling') ? 'active-frost' : ''}`}
                        onClick={() => {
                          handleSetMode('specialFilling');
                          handleFillColor('frost');
                        }}
                        disabled={activeMode !== 'specialFilling'}
                        style={isModeFrost('specialFilling') ? { borderColor: '#1890ff', color: '#1890ff', background: '#e6f7ff' } : {}}
                      >
                        {t('artEditor.frost', 'Frost')}
                      </Button>
                      <PartialButton forMode="specialFilling" />
                    </div>
                  </div>
                  <div className="color-row">
                    <ColorSwatches
                      colors={displayColors}
                      onColorSelect={handleFillColor}
                      selectedColor={getDisplayFillColor('specialFilling')}
                      disabled={activeMode !== 'specialFilling'}
                      t={t}
                    />
                    <ColorPicker
                      value={getDisplayFillColor('specialFilling') === 'transparent' || isModeFrost('specialFilling') ? '#FFFFFF' : getDisplayFillColor('specialFilling')}
                      onChange={handleFillColor}
                      disabled={activeMode !== 'specialFilling'}
                      size="small"
                      className="color-picker-sm"
                    />
                  </div>
                </div>

                {/* Outline Color */}
                <div>
                  <div className="header-row">
                    <Text style={{ fontSize: '12px' }}>{t('artEditor.outlineColor', 'Outline Color')}</Text>
                    {/* 已移除 Outline Color 的 Frost 选项 */}
                  </div>
                  <div className="color-row">
                    <ColorSwatches
                      colors={displayColors}
                      onColorSelect={handleLineColor}
                      selectedColor={getDisplayLineColor('specialFilling')}
                      disabled={activeMode !== 'specialFilling'}
                      t={t}
                    />
                    <ColorPicker
                      value={getDisplayLineColor('specialFilling')}
                      onChange={handleLineColor}
                      disabled={activeMode !== 'specialFilling'}
                      size="small"
                      className="color-picker-sm"
                    />
                  </div>
                </div>

              </div>
            </div>

          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ArtEditorPanel;