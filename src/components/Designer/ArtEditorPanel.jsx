import React, { useRef } from 'react';
import { Card, Button, Space, Tooltip, ColorPicker, Slider, Typography, Divider, Switch } from 'antd';
import {
  CloseOutlined,
  SaveOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next'
import './DesignerPage.css';

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

const ColorSwatches = ({ colors, onColorSelect, selectedColor, disabled = false }) => (
  <Space wrap style={{ gap: '4px' }}>
    {colors.map(color => {
      const isSelected = selectedColor && color.toLowerCase() === selectedColor.toLowerCase();
      return (
        <Tooltip title={color} key={color}>
          <Button
            onClick={() => onColorSelect(color)}
            disabled={disabled}
            style={{
              backgroundColor: color,
              width: '24px',
              height: '24px',
              padding: 0,
              border: isSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
            }}
          />
        </Tooltip>
      );
    })}
  </Space>
);

/**
 * 图案编辑面板组件
 * 简化版：移除了移动、缩放、旋转、镜像、删除按钮（已移动到3D HUD）。
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
}) => {
  const { t } = useTranslation()
  const nodeRef = useRef(null);

  if (!art) return null;

  const handleLineColor = (color) => {
    const hex = typeof color === 'string' ? color : color.toHexString();
    onLineColorChange(art.id, hex);
  };

  const handleLineAlpha = (value) => {
    onLineAlphaChange(art.id, value);
  };

  const handleFillColor = (color) => {
    const val = typeof color === 'string' ? color : color.toRgbString();
    setFillColor(val);
  };

  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;

  const isTransparent = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';
  const currentFillColor = isTransparent ? '#FFFFFF' : (fillColor || '#4285F4');

  const isFillPresetSelected = !isTransparent && simplePresetColors.some(c => c.toLowerCase() === currentFillColor.toLowerCase());
  const isLinePresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentLineColor.toLowerCase());

  return (
    <div
      ref={nodeRef}
      className="tool-panel art-editor-panel"
      style={{
        width: 300,
        position: 'fixed',
        zIndex: 100,
        top: '100px',
        right: '20px',
      }}
    >
      <Card
        title={t('artEditor.title')}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
        bodyStyle={{ padding: '20px' }}
      >
        <Space direction="vertical" style={{ width: '100%', gap: '8px' }}>

          {/* 仅保留保存按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title={t('artEditor.saveToLibrary')}>
              <Button
                icon={<SaveOutlined />}
                onClick={() => onSaveToArtOptions && onSaveToArtOptions(art)}
                type="primary"
              >
                {t('common.save', 'Save')}
              </Button>
            </Tooltip>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* --- 颜色编辑 --- */}
          <div>
            <Text strong style={{ fontSize: '12px' }} >{t('artEditor.colorEditing')}</Text>

            {/* 填充颜色 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text style={{ display: 'block', fontSize: '12px' }}>
                  {t('artEditor.fillColor')}
                </Text>
                <Switch
                  checkedChildren={t('artEditor.enable')}
                  unCheckedChildren={t('artEditor.disable')}
                  checked={isFillModeActive}
                  onChange={setIsFillModeActive}
                />
              </div>
              <Space wrap style={{ width: '100%', gap: '4px' }}>
                <Tooltip title={t('artEditor.transparent')}>
                  <Button
                    onClick={() => setFillColor('rgba(0, 0, 0, 0)')}
                    disabled={!isFillModeActive}
                    icon={<BgColorsOutlined />}
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      backgroundColor: '#fff',
                      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                      border: isTransparent ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      color: isTransparent ? '#1677ff' : '#999'
                    }}
                  />
                </Tooltip>

                <ColorSwatches
                  colors={simplePresetColors}
                  onColorSelect={handleFillColor}
                  disabled={!isFillModeActive}
                  selectedColor={isTransparent ? null : currentFillColor}
                />

                <Tooltip title={t('colors.custom')}>
                  <ColorPicker
                    value={currentFillColor}
                    onChange={handleFillColor}
                    disabled={!isFillModeActive}
                    size="small"
                    disabledAlpha={false}
                    styles={{
                      trigger: {
                        border: (!isFillPresetSelected && !isTransparent) ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      }
                    }}
                  />
                </Tooltip>
              </Space>
            </div>

            {/* 线条颜色 */}
            <div style={{ marginTop: '12px' }}>
              <Text style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
                {t('artEditor.lineColor')}
              </Text>
              <Space wrap style={{ width: '100%', gap: '4px' }}>
                <ColorSwatches
                  colors={simplePresetColors}
                  onColorSelect={handleLineColor}
                  selectedColor={currentLineColor}
                />
                <Tooltip title={t('colors.custom')}>
                  <ColorPicker
                    value={currentLineColor}
                    onChange={handleLineColor}
                    size="small"
                    styles={{
                      trigger: {
                        border: !isLinePresetSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
                      }
                    }}
                  />
                </Tooltip>
              </Space>
            </div>

            {/* 线条透明度 */}
            <div style={{ marginTop: '12px' }}>
              <Text style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                {t('artEditor.lineOpacity')}: {Math.round(currentLineAlpha * 100)}%
              </Text>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={currentLineAlpha}
                onChange={handleLineAlpha}
              />
            </div>
          </div>

        </Space>
      </Card>
    </div>
  );
};

export default ArtEditorPanel;