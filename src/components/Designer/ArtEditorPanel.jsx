import React from 'react';
// 【新增】导入 App, ColorPicker, Slider, Typography, Divider
import { Card, Button, Space, Modal, Tooltip, App, ColorPicker, Slider, Typography, Divider } from 'antd';
import {
  DeleteOutlined,
  SwapOutlined,
  DragOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './DesignerPage.css'; // 引入样式文件，以便使用定位类

const { Text } = Typography;

/**
 * 图案编辑面板组件
 * [已更新] 增加了颜色编辑功能（填充、线条颜色、线条透明度）。
 */
const ArtEditorPanel = ({
  art,
  onClose,
  onDelete,
  onFlip,
  setTransformMode,
  transformMode,

  // --- 新增 Props ---
  /** "填充" 工具的当前颜色 (e.g., '#4285F4') */
  fillColor,
  /** 更新父组件中的"填充"工具颜色 (newColorString: string) => void */
  setFillColor,
  /** 当线条颜色改变时调用 (artId: string, newColorString: string) => void */
  onLineColorChange,
  /** 当线条透明度改变时调用 (artId: string, newAlphaValue: number) => void */
  onLineAlphaChange,
}) => {
  // 使用 App.useApp() 钩子获取 modal 实例
  const { modal } = App.useApp();

  if (!art) return null;

  // TransformControls 模式映射
  const modes = [
    { key: 'translate', icon: <DragOutlined />, label: '移动', tooltip: '移动图案位置' },
    { key: 'scale', icon: <ExpandOutlined />, label: '缩放', tooltip: '调整图案大小' },
    { key: 'rotate', icon: <ReloadOutlined />, label: '旋转', tooltip: '旋转图案' },
  ];

  const handleModeChange = (mode) => {
    setTransformMode(mode);
  };

  // 确认删除
  const handleConfirmDelete = () => {
    modal.confirm({
      title: '确认删除图案?',
      content: `您确定要删除图案: ${art.name || art.id} 吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: () => onDelete(art.id, 'art'),
    });
  };

  // --- 新增处理器 ---

  // Antd ColorPicker 返回一个 Color 对象, 我们需要转为 hex 字符串
  const handleLineColor = (color) => {
    onLineColorChange(art.id, color.toHexString());
  };

  const handleLineAlpha = (value) => {
    onLineAlphaChange(art.id, value);
  };

  const handleFillColor = (color) => {
    setFillColor(color.toHexString());
  };

  // 从 art.properties 获取当前值, 并提供默认值
  // 假设您的 art 对象现在会包含 'properties' 键
  const currentLineColor = art.properties?.lineColor || '#000000';
  const currentLineAlpha = art.properties?.lineAlpha ?? 1.0;
  const currentFillColor = fillColor || '#4285F4'; // 从 prop 获取

  return (
    <Card
      title="编辑图案"
      extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
      className="tool-panel art-editor-panel" //
      bodyStyle={{ padding: '12px' }}
      style={{ width: 300 }}
    >
      {/* 顶部信息 (来自您的原始代码) */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>当前图案:</p>
        <p style={{ fontWeight: '600', margin: 0 }}>{art.subclass} / {art.name || art.id}</p>
        <div style={{ marginTop: 8, textAlign: 'center', backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
          <img
            src={art.imagePath}
            alt={art.name}
            style={{ maxWidth: '80px', maxHeight: '80px', border: '1px solid #eee', borderRadius: '2px' }}
          />
        </div>
      </div>

      <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>
        {/* 1. 变换模式 (来自您的原始代码) */}
        <div>
          <Text strong>变换模式</Text>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {modes.map(mode => (
              <Tooltip title={mode.tooltip} key={mode.key}>
                <Button
                  icon={mode.icon}
                  onClick={() => handleModeChange(mode.key)}
                  type={transformMode === mode.key ? 'primary' : 'default'}
                  style={{ flex: 1, padding: '0 8px' }}
                >
                  {mode.label}
                </Button>
              </Tooltip>
            ))}
          </div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        {/* 2. 颜色编辑 (新增) */}
        <div>
          <Text strong>颜色编辑 (画布)</Text>

          {/* 填充颜色 */}
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              填充颜色 (点击模型)
            </Text>
            <ColorPicker
              value={currentFillColor}
              onChange={handleFillColor}
              showText
              style={{ width: '100%' }}
            />
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
              选择颜色后，在模型上点击图案的透明区域进行填充。
            </Text>
          </div>

          {/* 线条颜色 */}
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              线条颜色
            </Text>
            <ColorPicker
              value={currentLineColor}
              onChange={handleLineColor}
              showText
              style={{ width: '100%' }}
            />
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

        <Divider style={{ margin: '4px 0' }} />

        {/* 3. 其他操作 (来自您的原始代码) */}
        <div>
          <Text strong>其他操作</Text>
          <Space direction="vertical" style={{ width: '100%', marginTop: '8px', gap: '8px' }}>
            <Button
              icon={<SwapOutlined />}
              onClick={() => onFlip(art.id, 'z', 'art')}
              style={{ width: '100%' }}
            >
              左右翻转
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={handleConfirmDelete}
              danger
              style={{ width: '100%' }}
            >
              删除图案
            </Button>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default ArtEditorPanel;