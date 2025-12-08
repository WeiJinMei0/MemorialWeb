import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { Card, Button, Space, Modal, Tooltip, App, ColorPicker, Slider, Typography, Divider, Switch } from 'antd';
import {
  DeleteOutlined,
  SwapOutlined,
  DragOutlined,
  ReloadOutlined,
  ExpandOutlined,
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
 * 图案编辑面板组件 (修复透明度填充变黑的问题)
 */
const ArtEditorPanel = ({
  art,
  onClose,
  onDelete,
  onFlip,
  setTransformMode,
  transformMode,
  fillColor,
  setFillColor,
  onLineColorChange,
  onLineAlphaChange,
  isFillModeActive,
  setIsFillModeActive,
  onSaveToArtOptions,
}) => {
  const { modal } = App.useApp();
  const { t } = useTranslation()
  const nodeRef = useRef(null);

  if (!art) return null;

  const modes = [
    { key: 'translate', icon: <DragOutlined />, label: t('artEditor.move'), tooltip: t('artEditor.move') },
    { key: 'scale', icon: <ExpandOutlined />, label: t('artEditor.scale'), tooltip: t('artEditor.scale') },
    { key: 'rotate', icon: <ReloadOutlined />, label: t('artEditor.rotate'), tooltip: t('artEditor.rotate') },
  ]

  const handleModeChange = (mode) => {
    setTransformMode(mode);
  };

  const handleConfirmDelete = () => {
    modal.confirm({
      title: t('artEditor.deleteConfirmTitle', 'Confirm delete pattern?'),
      content: t('artEditor.deleteConfirmContent', `Are you sure you want to delete pattern: ${art.name || art.id}?`),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      onOk: () => onDelete(art.id, 'art'),
    })
  }

  const handleLineColor = (color) => {
    const hex = typeof color === 'string' ? color : color.toHexString();
    onLineColorChange(art.id, hex);
  };

  const handleLineAlpha = (value) => {
    onLineAlphaChange(art.id, value);
  };

  // 【修复 1】: 使用 toRgbString() 代替 toHexString()
  // 解释: toHexString() 会丢失透明度信息（Alpha），导致半透明或全透明变成实色（通常是黑色）。
  // toRgbString() 返回 "rgb(r, g, b)" 或 "rgba(r, g, b, a)"，能正确传递透明度。
  const handleFillColor = (color) => {
    const val = typeof color === 'string' ? color : color.toRgbString();
    setFillColor(val);
  };

  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;

  // 【修复 2】: 扩展透明判断逻辑
  // 兼容 'transparent' 关键字以及标准的 'rgba(0, 0, 0, 0)'
  const isTransparent = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';

  // 如果是透明，面板上显示白色方便查看，否则显示实际颜色
  const currentFillColor = isTransparent ? '#FFFFFF' : (fillColor || '#4285F4');

  const isFillPresetSelected = !isTransparent && simplePresetColors.some(c => c.toLowerCase() === currentFillColor.toLowerCase());
  const isLinePresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentLineColor.toLowerCase());


  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".ant-card-head"
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className="tool-panel art-editor-panel"
        style={{
          width: 300,
          position: 'absolute',
          zIndex: 1000,
          top: '300px',
          right: '500px',
        }}
      >
        <Card
          title={t('artEditor.title')}
          extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
          bodyStyle={{ padding: '12px' }}
        >
          <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>

            {/* --- 快捷操作 --- */}
            <div>
              <Text strong>{t('artEditor.quickActions')}</Text>
              <Space style={{ width: '100%', marginTop: '8px', gap: '4px' }}>
                {modes.map(mode => (
                  <Tooltip title={mode.tooltip} key={mode.key}>
                    <Button
                      icon={mode.icon}
                      onClick={() => handleModeChange(mode.key)}
                      type={transformMode === mode.key ? 'primary' : 'default'}
                    />
                  </Tooltip>
                ))}
                <Divider type="vertical" style={{ height: '24px', margin: '0 4px' }} />
                <Tooltip title={t('artEditor.mirror')}>
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => onFlip(art.id, 'x', 'art')}
                  />
                </Tooltip>
               <Tooltip title={t('artEditor.flip')}>
                  <Button
                    icon={<SwapOutlined style={{ transform: 'rotate(90deg)' }} />}
                    onClick={() => onFlip(art.id, 'y', 'art')}
                  />
                </Tooltip>
                <Tooltip title={t('artEditor.saveToLibrary')}>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={() => onSaveToArtOptions && onSaveToArtOptions(art)}
                    type="primary"
                  />
                </Tooltip>
                <Tooltip title={t('artEditor.delete')}>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={handleConfirmDelete}
                    danger
                  />
                </Tooltip>
              </Space>
            </div>

            <Divider style={{ margin: '4px 0' }} />

            {/* --- 颜色编辑 --- */}
            <div>
              <Text strong>{t('artEditor.colorEditing')}</Text>

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
                  {/* 【修复 3】: 透明按钮发送标准的 rgba(0, 0, 0, 0) */}
                  <Tooltip title={t('artEditor.transparent')}>
                    <Button
                      onClick={() => setFillColor('rgba(0, 0, 0, 0)')} // 改为 RGBA 格式
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

                  {/* 【修复 4】: 确保 ColorPicker 支持透明度选择 */}
                  <Tooltip title={t('colors.custom')}>
                    <ColorPicker
                      value={currentFillColor}
                      onChange={handleFillColor}
                      disabled={!isFillModeActive}
                      size="small"
                      disabledAlpha={false} // 显式允许 Alpha 通道
                      styles={{
                        trigger: {
                          border: (!isFillPresetSelected && !isTransparent) ? '2px solid #1677ff' : '1px solid #d9d9d9',
                        }
                      }}
                    />
                  </Tooltip>
                </Space>
                <Text style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                  {isFillModeActive
                    ? t('artEditor.fillHintEnabled')
                    : t('artEditor.fillHintDisabled')}
                </Text>
              </div>

              {/* 线条颜色 (保持不变) */}
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
    </Draggable>
  );
};

export default ArtEditorPanel;