import React from 'react';
import { Card, Button, Space, Modal, Tooltip, App, ColorPicker, Slider, Typography, Divider, Switch } from 'antd';
import {
  DeleteOutlined,
  SwapOutlined,
  DragOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CloseOutlined,
  // 移除了 BgColorsOutlined, 因为不再需要
} from '@ant-design/icons';
import './DesignerPage.css'; // 引入样式文件，以便使用定位类

const { Text } = Typography;

// --- 1. 定义用于 ColorPicker 弹出面板的预设 ---
const presetColors = [
  {
    label: '常用颜色',
    colors: [
      '#FC0000', // 截图中线条的红色
      // 截图中填充的蓝色      
      '#FF8F00', // 橙色
      '#FFFF00',
      '#4285F4',  // 黄色
      '#8F00FF', // 紫色
      '#000000', // 黑色
      '#FFFFFF', // 白色
      '#AAAAAA', // 灰色
    ],
    disabled: false,
  },
];

// --- 2. 提取一个简单的数组，用于渲染行内颜色样本 ---
const simplePresetColors = presetColors[0].colors;

// --- 3. 修改：可重用的颜色样本行内组件 ---
/**
 * 渲染一行可点击的颜色样本
 * @param {Object} props
 * @param {string[]} props.colors - 颜色字符串数组 (e.g., ['#FF0000', ...])
 * @param {(color: string) => void} props.onColorSelect - 点击颜色时触发的回调
 * @param {string} props.selectedColor - 当前选中的颜色
 * @param {boolean} [props.disabled=false] - 是否禁用
 */
const ColorSwatches = ({ colors, onColorSelect, selectedColor, disabled = false }) => (
  // 2. 移除 style 中的 width: '100%'
  <Space wrap style={{ gap: '4px' }}> {/* <-- 缩小间距 */}
    {colors.map(color => {
      // 1. 检查是否选中 (不区分大小写)
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
              // 1. 添加高亮边框
              border: isSelected
                ? '2px solid #1677ff' // 选中时的边框
                : '1px solid #d9d9d9', // 默认边框
            }}
          />
        </Tooltip>
      );
    })}
  </Space>
);


/**
 * 图案编辑面板组件
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
}) => {
  const { modal } = App.useApp();

  if (!art) return null;

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


  // --- 4. 修改处理器，使其同时接受 Color 对象和 字符串 ---
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

  // --- 2. 新增：检查当前颜色是否为常用色，用于高亮自定义颜色按钮 ---
  const isFillPresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentFillColor.toLowerCase());
  const isLinePresetSelected = simplePresetColors.some(c => c.toLowerCase() === currentLineColor.toLowerCase());


  return (
    <Card
      title="编辑图案"
      extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
      className="tool-panel art-editor-panel"
      bodyStyle={{ padding: '12px' }}
      style={{ width: 300 }}
    >
      {/* 顶部信息 ... */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>当前图案:</p>
        {/* <p style={{ fontWeight: '600', margin: 0 }}>{art.subclass} / {art.name || art.id}</p> */}
        <div style={{ marginTop: 8, textAlign: 'center', backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
          <img
            src={art.imagePath}
            alt={art.name}
            style={{ maxWidth: '80px', maxHeight: '80px', border: '1px solid #eee', borderRadius: '2px' }}
          />
        </div>
      </div>

      <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>

        {/* --- 1. 快捷操作 (已合并) --- */}
        <div>
          <Text strong>快捷操作</Text>
          <Space wrap style={{ width: '100%', marginTop: '8px', gap: '8px' }}>
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
              <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                填充颜色 (点击模型)
              </Text>
              <Switch
                checkedChildren="启用"
                unCheckedChildren="禁用"
                checked={isFillModeActive}
                onChange={setIsFillModeActive}
              />
            </div>

            {/* 3. 重构“填充颜色”部分 */}
            <Space wrap style={{ width: '100%', gap: '4px' }}>
              {/* 常用颜色 */}
              <ColorSwatches
                colors={simplePresetColors}
                onColorSelect={handleFillColor}
                disabled={!isFillModeActive}
                selectedColor={currentFillColor} // <-- 传递选中色
              />
              {/* 自定义颜色按钮 (新) */}
              <Tooltip title="自定义颜色">
                <ColorPicker
                  value={currentFillColor}
                  onChange={handleFillColor}
                  disabled={!isFillModeActive}
                  size="small" // <-- 渲染为 24x24 颜色块
                  styles={{ // <-- 高亮自定义颜色块
                    trigger: {
                      border: !isFillPresetSelected ? '2px solid #1677ff' : '1px solid #d9d9d9',
                    }
                  }}
                />
              </Tooltip>
            </Space>

            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
              {isFillModeActive
                ? "启用中：在模型上点击图案区域进行填充。"
                : "已禁用：点击图案将进行拖动或变换。"}
            </Text>
          </div>

          {/* 线条颜色 */}
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
              线条颜色
            </Text>

            {/* 4. 重构“线条颜色”部分 */}
            <Space wrap style={{ width: '100%', gap: '4px' }}>
              {/* 常用颜色 */}
              <ColorSwatches
                colors={simplePresetColors}
                onColorSelect={handleLineColor}
                selectedColor={currentLineColor} // <-- 传递选中色
              />
              {/* 自定义颜色按钮 (新) */}
              <Tooltip title="自定义颜色">
                <ColorPicker
                  value={currentLineColor}
                  onChange={handleLineColor}
                  size="small" // <-- 渲染为 24x24 颜色块
                  styles={{ // <-- 高亮自定义颜色块
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
            <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
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
  );
};

export default ArtEditorPanel;