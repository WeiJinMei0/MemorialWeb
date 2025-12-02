import React, { useRef } from 'react'; // 导入 useRef
import Draggable from 'react-draggable'; // 导入 Draggable
import { Card, Button, Space, Modal, Tooltip, App, ColorPicker, Slider, Typography, Divider, Switch } from 'antd';
import {
  DeleteOutlined,
  SwapOutlined,
  DragOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import './DesignerPage.css'; // 引入样式文件

const { Text } = Typography;

// --- 1. 定义用于 ColorPicker 弹出面板的预设 ---
const presetColors = [
  {
    label: '常用颜色',
    colors: [
      '#FFFFFF', '#000000', '#FFD700', '#FC0000',
      '#AAAAAA', '#4285F4', '#00FF00', '#FFFF00',
    ],
    disabled: false,
  },
];

// --- 2. 提取一个简单的数组，用于渲染行内颜色样本 ---
const simplePresetColors = presetColors[0].colors;

// --- 3. 可重用的颜色样本行内组件 ---
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
              border: isSelected
                ? '2px solid #1677ff'
                : '1px solid #d9d9d9',
            }}
          />
        </Tooltip>
      );
    })}
  </Space>
);


/**
 * 图案编辑面板组件 (可拖动版本)
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
  const nodeRef = useRef(null); // 为 Draggable 创建 ref

  if (!art) return null;

  // --- 处理器 (不变) ---
  const modes = [
    { key: 'translate', icon: <DragOutlined />, label: '移动', tooltip: '移动图案位置' },
    { key: 'scale', icon: <ExpandOutlined />, label: '缩放', tooltip: '调整图案大小' },
    { key: 'rotate', icon: <ReloadOutlined />, label: '旋转', tooltip: '旋转图案' },
  ];
  const handleModeChange = (mode) => {
    setTransformMode(mode);
  };
  const handleConfirmDelete = () => {
    modal.confirm({
      title: '确认删除图案?',
      content: `您确定要删除图案: ${art.name || art.id} 吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: () => onDelete(art.id, 'art'),
    });
  };
  const handleLineColor = (color) => {
    const hex = typeof color === 'string' ? color : color.toHexString();
    onLineColorChange(art.id, hex);
  };
  const handleLineAlpha = (value) => {
    onLineAlphaChange(art.id, value);
  };
  const handleFillColor = (color) => {
    const hex = typeof color === 'string' ? color : color.toHexString();
    setFillColor(hex);
  };
  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;
  const currentFillColor = fillColor || '#4285F4';
  const isFillPresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentFillColor.toLowerCase());
  const isLinePresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentLineColor.toLowerCase());
  // --- 处理器结束 ---


  return (
    // 【修改】包裹 Draggable 组件
    <Draggable
      nodeRef={nodeRef}
      handle=".ant-card-head" // 仅允许通过标题栏拖动
      bounds="parent" // 限制在父元素 (.scene-wrapper) 内拖动
    >
      <div
        ref={nodeRef}
        // 【修改】样式, 使其变为浮动面板
        className="tool-panel art-editor-panel" // 复用现有 class
        style={{
          width: 300,
          position: 'absolute', // <-- 关键：使其浮动
          zIndex: 1000,         // <-- 关键：确保在顶层
          // 固定的初始位置 (在父元素的左上角)
          top: '300px',
          right: '500px',
        }}
      >
        <Card
          title="编辑图案"
          extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
          bodyStyle={{ padding: '12px' }}
        // 样式已移至外层 div
        >
          {/* Card 的内容完全不变 */}
          <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>

            {/* --- 1. 快捷操作 --- */}
            <div>
              <Text strong>快捷操作</Text>
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
                <Tooltip title="左右翻转">
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => onFlip(art.id, 'x', 'art')}
                  />
                </Tooltip>
                <Tooltip title="上下翻转">
                  <Button
                    icon={<SwapOutlined style={{ transform: 'rotate(90deg)' }} />}
                    onClick={() => onFlip(art.id, 'y', 'art')}
                  />
                </Tooltip>
                <Tooltip title="保存到Art Options">
                  <Button
                    icon={<SaveOutlined />}
                    onClick={() => onSaveToArtOptions && onSaveToArtOptions(art)}
                    type="primary"
                  />
                </Tooltip>
                <Tooltip title="删除图案">
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={handleConfirmDelete}
                    danger
                  />
                </Tooltip>
              </Space>
            </div>

            <Divider style={{ margin: '4px 0' }} />

            {/* 2. 颜色编辑 */}
            <div>
              <Text strong>颜色编辑</Text>

              {/* 填充颜色 */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Text style={{ display: 'block', fontSize: '12px' }}>
                    填充颜色 (点击图案区域)
                  </Text>
                  <Switch
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                    checked={isFillModeActive}
                    onChange={setIsFillModeActive}
                  />
                </div>
                <Space wrap style={{ width: '100%', gap: '4px' }}>
                  <ColorSwatches
                    colors={simplePresetColors}
                    onColorSelect={handleFillColor}
                    disabled={!isFillModeActive}
                    selectedColor={currentFillColor}
                  />
                  <Tooltip title="自定义颜色">
                    <ColorPicker
                      value={currentFillColor}
                      onChange={handleFillColor}
                      disabled={!isFillModeActive}
                      size="small"
                      styles={{
                        trigger: {
                          border: !isFillPresetSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
                        }
                      }}
                    />
                  </Tooltip>
                </Space>
                {/* Updated help text for swapped logic */}
                <Text style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                  {isFillModeActive
                    ? "启用中：点击填充所有封闭区域，按住 Shift 点击填充单个封闭区域。"
                    : "已禁用：点击图案将进行拖动或变换。"}
                </Text>
              </div>

              {/* 线条颜色 */}
              <div style={{ marginTop: '12px' }}>
                <Text style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
                  线条颜色
                </Text>
                <Space wrap style={{ width: '100%', gap: '4px' }}>
                  <ColorSwatches
                    colors={simplePresetColors}
                    onColorSelect={handleLineColor}
                    selectedColor={currentLineColor}
                  />
                  <Tooltip title="自定义颜色">
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
                  线条透明度: {Math.round(currentLineAlpha * 100)}%
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