import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  Slider,
  Space,
  Divider,
  ColorPicker,
  Row,
  Col,
  Card,
  message,// 导入 message
  Tooltip,
  Popover
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  SaveOutlined, // 导入保存图标
  CloseOutlined, // 新增：关闭图标
  EditOutlined,// 新增：编辑图标
  BoldOutlined,    // 加粗图标
  ItalicOutlined,  // 斜体图标
  PlusCircleOutlined,// 加号图标
  DeleteOutlined,
  DragOutlined, // 移动图标
  RotateRightOutlined, // 旋转图标
  RedoOutlined,// 90度图标
  EyeOutlined,
  EyeInvisibleOutlined, // 闭眼图标
  FontSizeOutlined, // 增加字体图标
  ColumnHeightOutlined, // 增加行高图标
  ExpandOutlined // 增加字间距图标
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import './TextEditor.css'
import { Radio } from 'antd'; // 引入 Radio 组件
// --- 辅助函数：解析字体名称 ---
// 假设命名规则为 "{Family} {Variant}"，Variant 可能是 Regular, Bold, Italic, Bold Italic
const getFontFamilyInfo = (fontName) => {
  if (!fontName) return { family: '', bold: false, italic: false };

  // 按照后缀长度优先匹配，防止 "Bold Italic" 被匹配成 "Bold"
  if (fontName.endsWith(" Bold Italic")) return { family: fontName.replace(" Bold Italic", ""), bold: true, italic: true };
  if (fontName.endsWith(" Bold")) return { family: fontName.replace(" Bold", ""), bold: true, italic: false };
  if (fontName.endsWith(" Italic")) return { family: fontName.replace(" Italic", ""), bold: false, italic: true };
  if (fontName.endsWith(" Regular")) return { family: fontName.replace(" Regular", ""), bold: false, italic: false };
  if (fontName.endsWith(" Normal")) return { family: fontName.replace(" Normal", ""), bold: false, italic: false }; // 处理个别命名

  // 如果没有标准后缀，默认视为 Regular，且 family 就是它本身
  return { family: fontName, bold: false, italic: false };
};

// --- 辅助函数：构建字体名称 ---
const constructFontName = (family, bold, italic) => {
  let suffix = " Regular";
  if (bold && italic) suffix = " Bold Italic";
  else if (bold) suffix = " Bold";
  else if (italic) suffix = " Italic";
  return `${family}${suffix}`;
};

// --- 样式组件：统一的行内控件容器 ---
const ControlRow = ({ label, children, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, ...style }}>
    {label && <span style={{ width: 64, fontSize: 12, color: '#666', flexShrink: 0 }}>{label}</span>}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>
  </div>
);

const TextEditor = ({
  onAddText,
  onUpdateText,
  onDeleteText,
  currentTextId,
  existingTexts,
  monuments,
  isEditing,
  fontOptions,
  onSaveTextToOptions,// 1. 接收新的 prop
  onClose, // 新增：关闭回调函数
  getFontPath, // 2. 接收 getFontPath 函数
  transformMode, // 接收
  setTransformMode, // 接收
  onRotate90, // 接收
}) => {
  const { t } = useTranslation();
  // 新增：定义缺失的状态
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  // 新增：控制按钮是否可用（有些字体可能没有粗体或斜体变种）
  const [canBold, setCanBold] = useState(true);
  const [canItalic, setCanItalic] = useState(true);

  const FontPreviewTooltipContent = ({ font }) => {
    const previewText = font.previewText || (font.isChinese ? '示例Aa' : 'Aa');
    const fontPath = getFontPath ? getFontPath(font.name) : (font.path || '/fonts/helvetiker_regular.typeface.json');
    return (
      <div className="font-preview-tooltip">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 60 }}
          gl={{ antialias: true }}
          style={{ background: '#ffffff' }}

        >
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[0, 0, 5]} intensity={0.6} />
          <Suspense fallback={null}>
            <group position={[-previewText.length * 0.18, -0.15, 0]}>
              <Text3D
                font={fontPath}
                size={0.45}
                height={0.04}
                letterSpacing={0.02}
                curveSegments={8}
                bevelEnabled
                bevelThickness={0.005}
                bevelSize={0.005}
                bevelSegments={1}
              >
                {previewText}
                <meshStandardMaterial color="#000000" metalness={0.2} roughness={0.4} />
              </Text3D>
            </group>
          </Suspense>
        </Canvas>
      </div>
    );
  };
  // 在 TextEditor 组件内部添加这个组件
  const CustomColorPanel = () => {
    // 定义色系 - 简化版，每个色系5个颜色
    const colorRamps = {
      red: ['#FF9999', '#FF6666', '#FF3333', '#FF0000', '#CC0000'],
      gold: ['#FFE5B3', '#FFD699', '#FFC266', '#FFB033', '#CC8A00'],
      blue: ['#99CFFF', '#66B8FF', '#339FFF', '#0080FF', '#0066CC'],
      green: ['#99FF99', '#66FF66', '#33FF33', '#00FF00', '#00CC00'],
      gray: ['#E6E6E6', '#D9D9D9', '#CCCCCC', '#999999', '#666666']
    };

    return (
      <div style={{ width: 240 }}>
        {/* 色系选择 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>标准色</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
            {/* 红色系 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colorRamps.red.map((color, index) => (
                <div
                  key={`red-${index}`}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: color === '#E6E6E6' ? '1px solid #d9d9d9' : 'none',
                    boxShadow: textProperties.vcutColor === color ? '0 0 0 2px #1890ff' : 'none'
                  }}
                  onClick={() => handlePropertyChange('vcutColor', color)}
                />
              ))}
            </div>
            {/* 金色系 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colorRamps.gold.map((color, index) => (
                <div
                  key={`gold-${index}`}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: color === '#E6E6E6' ? '1px solid #d9d9d9' : 'none',
                    boxShadow: textProperties.vcutColor === color ? '0 0 0 2px #1890ff' : 'none'
                  }}
                  onClick={() => handlePropertyChange('vcutColor', color)}
                />
              ))}
            </div>

            {/* 蓝色系 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colorRamps.blue.map((color, index) => (
                <div
                  key={`blue-${index}`}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: color === '#E6E6E6' ? '1px solid #d9d9d9' : 'none',
                    boxShadow: textProperties.vcutColor === color ? '0 0 0 2px #1890ff' : 'none'
                  }}
                  onClick={() => handlePropertyChange('vcutColor', color)}
                />
              ))}
            </div>

            {/* 绿色系 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colorRamps.green.map((color, index) => (
                <div
                  key={`green-${index}`}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: color === '#E6E6E6' ? '1px solid #d9d9d9' : 'none',
                    boxShadow: textProperties.vcutColor === color ? '0 0 0 2px #1890ff' : 'none'
                  }}
                  onClick={() => handlePropertyChange('vcutColor', color)}
                />
              ))}
            </div>

            {/* 灰色系 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colorRamps.gray.map((color, index) => (
                <div
                  key={`gray-${index}`}
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: color === '#E6E6E6' ? '1px solid #d9d9d9' : 'none',
                    boxShadow: textProperties.vcutColor === color ? '0 0 0 2px #1890ff' : 'none'
                  }}
                  onClick={() => handlePropertyChange('vcutColor', color)}
                />
              ))}
            </div>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 自定义颜色选择器 */}
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>自定义颜色</div>
          <ColorPicker
            value={textProperties.vcutColor}
            onChange={(color) => handlePropertyChange('vcutColor', color.toHexString())}
            showText
            size="small"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  };
  const [textProperties, setTextProperties] = useState({
    content: '',
    font: 'helvetiker_regular.typeface',
    size: 6,
    alignment: 'center',
    lineSpacing: 1.2,
    kerning: 0,
    curveAmount: 0,
    engraveType: 'vcut',
    vcutColor: '#FFFFFF',
    frostIntensity: 0.8,
    polishBlend: 0.5,

  });

  // 新增：处理关闭面板
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  // 雕刻效果按钮状态
  const [engraveTypes, setEngraveTypes] = useState({
    vcut: false,
    frost: false,
    polish: false
  });
  // --- 核心逻辑：监听字体变化，更新按钮状态 ---
  useEffect(() => {
    if (textProperties.font && fontOptions.length > 0) {
      const { family, bold, italic } = getFontFamilyInfo(textProperties.font);

      // 1. 更新当前 UI 状态
      setIsBold(bold);
      setIsItalic(italic);

      // 2. 检查是否存在目标变体，决定是否禁用按钮
      // 例如：当前是 Regular，我想切换 Bold -> 检查 "Family Bold" 是否在列表中
      // 例如：当前是 Italic，我想切换 Bold -> 检查 "Family Bold Italic" 是否在列表中
      const targetBoldName = constructFontName(family, !bold, italic);
      const targetItalicName = constructFontName(family, bold, !italic);

      setCanBold(fontOptions.some(f => f.name === targetBoldName));
      setCanItalic(fontOptions.some(f => f.name === targetItalicName));
    }
  }, [textProperties.font, fontOptions]);

  // 当选中文字变化时更新表单
  // 依赖项同步逻辑...
  useEffect(() => {
    if (currentTextId) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) {
        setTextProperties(prev => ({ ...prev, ...currentText }));
        setEngraveTypes({
          vcut: currentText.engraveType === 'vcut',
          frost: currentText.engraveType === 'frost',
          polish: currentText.engraveType === 'polish'
        });
      }
    }
  }, [currentTextId, existingTexts]);

  const handlePropertyChange = (property, value) => {
    setTextProperties(prev => ({
      ...prev,
      [property]: value
    }));

    // 实时更新选中的文字
    if (currentTextId) {
      onUpdateText(currentTextId, { [property]: value });
    }
  };

  const handleEngraveTypeChange = (type) => {
    const newEngraveTypes = {
      vcut: false,
      frost: false,
      polish: false,
      [type]: true
    };

    setEngraveTypes(newEngraveTypes);
    handlePropertyChange('engraveType', type);
  };

  const handleAddText = () => {

    if (!textProperties.content.trim()) {
      message.error('请输入文字内容');
      return;
    }
    // 设置固定的文本内容
    //const fixedTextContent = "Text";

    // 更新文本属性状态
    const newTextProperties = {
      ...textProperties,
      //content: fixedTextContent
    };

    setTextProperties(newTextProperties);

    const targetMonumentId = monuments.length > 0 ? monuments[0].id : null;
    if (!targetMonumentId) {
      message.error('请先添加一个主碑');
      return;
    }


    onAddText({
      ...textProperties,
      monumentId: targetMonumentId
    });

    // 重置表单
    setTextProperties({
      content: '',
      font: 'Arial',
      size: 6,
      alignment: 'center',
      lineSpacing: 1.2,
      kerning: 0,
      curveAmount: 0,
      engraveType: 'vcut',
      vcutColor: '#000000',
      frostIntensity: 0.8,
      polishBlend: 0.5,
      thickness: 0.02
    });
  };

  const handleDeleteText = () => {
    if (currentTextId) {
      onDeleteText(currentTextId);
    }
  };
  const inputRef = useRef(null);

  // --- 修改：处理斜体点击 ---
  const handleItalicClick = () => {
    const { family, bold, italic } = getFontFamilyInfo(textProperties.font);
    const newFontName = constructFontName(family, bold, !italic); // 切换 Italic 状态

    if (fontOptions.some(f => f.name === newFontName)) {
      handlePropertyChange('font', newFontName);
      // UI 状态会在 useEffect 中自动更新
    } else {
      message.warning(`当前字体 "${family}" 不支持斜体`);
    }
  };
  // --- 修改：处理加粗点击 ---
  const handleBoldClick = () => {
    const { family, bold, italic } = getFontFamilyInfo(textProperties.font);
    const newFontName = constructFontName(family, !bold, italic); // 切换 Bold 状态

    if (fontOptions.some(f => f.name === newFontName)) {
      handlePropertyChange('font', newFontName);
      // UI 状态会在 useEffect 中自动更新
    } else {
      message.warning(`当前字体 "${family}" 不支持加粗`);
    }
  };


  const renderEngraveTypeButton = (type, label, icon) => {
    const isActive = engraveTypes[type];
    return (
      <Button
        type={isActive ? "primary" : "default"}
        icon={isActive ? <CheckOutlined /> : <PlusOutlined />}
        onClick={() => handleEngraveTypeChange(type)}
        style={{
          marginBottom: 8,
          backgroundColor: isActive ? '#1890ff' : undefined,
          color: isActive ? 'white' : undefined
        }}
      >
        {label}
      </Button>
    );
  };

  const handleSaveCurrentText = () => {
    if (currentTextId && onSaveTextToOptions) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) {
        onSaveTextToOptions(currentText);
      } else {
        message.error("未找到要保存的文字");
      }
    } else {
      message.warning("请先选中一个文字对象");
    }
  };

  return (
    <div className="text-editor-panel">
      <Card
        size="small"
        title="Text Editor"
        style={{ width: '100%' }}
        bodyStyle={{ padding: '12px' }}
        extra={
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleClose}
            style={{ border: 'none' }}
          />
        }
      >
        {/* 文字内容 */}
        <div style={{ marginBottom: '12px' }}>
          <Input.TextArea
            ref={inputRef}
            value={textProperties.content}
            onChange={(e) => handlePropertyChange('content', e.target.value)}
            placeholder="输入文字内容"
            rows={2}
            size="small"
          />
        </div>

        {/* 紧凑的按钮组 */}
        <Space.Compact style={{ width: '100%', marginBottom: '12px' }}>
          <Button
            type="default"
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={handleAddText}
            title="添加新文字"
            style={{ flex: 1 }}
          />
          <Button
            type="default"
            size="small"
            icon={<BoldOutlined />}
            onClick={handleBoldClick}
            disabled={!currentTextId && !textProperties.content}
            title="加粗"
            style={{
              backgroundColor: isBold ? '#1890ff' : '#ffffff',
              borderColor: isBold ? '#1890ff' : '#d9d9d9',
              color: isBold ? '#ffffff' : '#000000',
              flex: 1
            }}
          />
          <Button
            type="default"
            size="small"
            icon={<ItalicOutlined />}
            onClick={handleItalicClick}
            disabled={!currentTextId && !textProperties.content}
            title="斜体"
            style={{
              backgroundColor: isItalic ? '#1890ff' : '#ffffff',
              borderColor: isItalic ? '#1890ff' : '#d9d9d9',
              color: isItalic ? '#ffffff' : '#000000',
              flex: 1
            }}
          />

          <Button
            type="default"
            size="small"
            icon={<DeleteOutlined />}
            onClick={handleDeleteText}
            disabled={!currentTextId}
            title="删除选中文字"
            style={{ flex: 1 }}
          />
          <Button
            type="default"
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSaveCurrentText}
            disabled={!currentTextId || !onSaveTextToOptions}
            title="保存到素材库"
            style={{ flex: 1 }}
          />
        </Space.Compact>
        {/* 变换控制区域 - 协调按钮设计 */}
        <div style={{
          marginBottom: 12,
          background: '#f9f9f9',
          padding: 8,
          borderRadius: 6
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8 // 添加间距确保按钮不会太挤
          }}>
            <span style={{
              fontSize: 12,
              color: '#666',
              minWidth: 60 // 确保标签宽度固定
            }}>
              Operating Mode:
            </span>

            {/* 操作模式按钮组 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8 // 按钮之间的间距
            }}>
              {/* 移动按钮 */}
              <Tooltip title="移动 (T)">
                <Button
                  size="small"
                  type={transformMode === 'translate' ? 'primary' : 'default'}
                  icon={<DragOutlined />}
                  onClick={() => setTransformMode && setTransformMode('translate')}
                  style={{
                    width: 32, // 固定宽度
                    height: 32, // 固定高度
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                />
              </Tooltip>

              {/* 旋转按钮 */}
              <Tooltip title="旋转 (R)">
                <Button
                  size="small"
                  type={transformMode === 'rotate' ? 'primary' : 'default'}
                  icon={<RotateRightOutlined />}
                  onClick={() => setTransformMode && setTransformMode('rotate')}
                  style={{
                    width: 32, // 固定宽度
                    height: 32, // 固定高度
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                />
              </Tooltip>

              {/* 90度旋转按钮 */}
              <Tooltip title="向右旋转 90°">
                <Button
                  size="small"
                  icon={<RedoOutlined style={{ transform: 'rotate(90deg)' }} />}
                  onClick={onRotate90}
                  disabled={!currentTextId}
                  style={{
                    width: 32, // 固定宽度
                    height: 32, // 固定高度
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 字体和大小 - 紧凑垂直布局 */}
        <div style={{ marginBottom: '12px' }}>
          {/* 字体选择 - 单独一行 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '40px',
              textAlign: 'right',
              marginRight: '8px'
            }}>
              Font:
            </span>
            <Select
              value={textProperties.font}
              onChange={(value) => handlePropertyChange('font', value)}
              style={{ flex: 1 }}
              size="small"
            >
              {fontOptions.map(font => (
                <Select.Option key={font.name} value={font.name}>
                  <Tooltip
                    placement="right"
                    title={<FontPreviewTooltipContent font={font} />}
                    destroyTooltipOnHide
                    mouseEnterDelay={0.2}
                  >
                    <span style={{ fontFamily: font.cssFamily || 'inherit', fontSize: '12px' }}>
                      {font.name}
                    </span>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 大小输入 - 单独一行 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '40px',
              textAlign: 'right',
              marginRight: '8px'
            }}>
              Size:
            </span>
            <Input
              type="number"
              value={textProperties.size}
              onChange={(e) => handlePropertyChange('size', Number(e.target.value))}
              min={0.5}
              max={20}
              step={0.25}
              size="small"
              style={{ width: '80px' }}
            />
          </div>
        </div>

        {/* 对齐方式 - 紧凑 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '40px',
              textAlign: 'right'
            }}>
              Align:
            </span>
            <Space.Compact style={{ flex: 1 }} size="small">
              <Button
                size="small"
                icon={<AlignLeftOutlined />}
                type={textProperties.alignment === 'left' ? 'primary' : 'default'}
                onClick={() => handlePropertyChange('alignment', 'left')}
                style={{ flex: 1, fontSize: '11px', height: '24px' }}
              >
                Left
              </Button>
              <Button
                size="small"
                icon={<AlignCenterOutlined />}
                type={textProperties.alignment === 'center' ? 'primary' : 'default'}
                onClick={() => handlePropertyChange('alignment', 'center')}
                style={{ flex: 1, fontSize: '11px', height: '24px' }}
              >
                Center
              </Button>
              <Button
                size="small"
                icon={<AlignRightOutlined />}
                type={textProperties.alignment === 'right' ? 'primary' : 'default'}
                onClick={() => handlePropertyChange('alignment', 'right')}
                style={{ flex: 1, fontSize: '11px', height: '24px' }}
              >
                Right
              </Button>
            </Space.Compact>
          </div>
        </div>

        {/* 间距控制 - 紧凑水平布局 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 字距控制 */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '60px',
                textAlign: 'right',
                marginRight: '8px'
              }}>
                Kerning:
              </span>
              <Input
                type="number"
                value={textProperties.kerning}
                onChange={(e) => handlePropertyChange('kerning', Number(e.target.value))}
                min={-10}
                max={10}
                size="small"
                style={{ flex: 1 }}
              />
            </div>

            {/* 行距控制 */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '75px',
                textAlign: 'right',
                marginRight: '8px'
              }}>
                Line Space:
              </span>
              <Input
                type="number"
                value={textProperties.lineSpacing}
                onChange={(e) => handlePropertyChange('lineSpacing', Number(e.target.value))}
                min={0.5}
                max={3}
                step={0.1}
                size="small"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* 弯曲程度 - 紧凑 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '40px',
              textAlign: 'right'
            }}>
              Shape:
            </span>
            <div style={{ flex: 1 }}>
              <Slider
                min={-45}
                max={45}
                value={textProperties.curveAmount}
                onChange={(value) => handlePropertyChange('curveAmount', value)}
                style={{ margin: '4px 0' }}
              />
            </div>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '30px',
              textAlign: 'center'
            }}>
              {textProperties.curveAmount}
            </span>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 雕刻效果 - 紧凑 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              color: '#666',
              width: '85px',
              textAlign: 'right'
            }}>
              Engrave Type:
            </span>
            <Space.Compact style={{ flex: 1 }} size="small">
              {renderEngraveTypeButton('vcut', 'V-Cut')}
              {renderEngraveTypeButton('frost', 'Frost')}
              {renderEngraveTypeButton('polish', 'Polish')}
            </Space.Compact>
          </div>
        </div>

        {/* 效果参数 */}
        {textProperties.engraveType === 'vcut' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '85px',
                textAlign: 'right'
              }}>
                V-Cut Color:
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { color: '#FFFFFF' },
                    { color: '#000000' },
                    { color: '#FFD700' },
                    { color: '#FF0000' }
                  ].map((item, index) => (
                    <Button
                      key={index}
                      size="small"
                      type={textProperties.vcutColor === item.color ? 'primary' : 'default'}
                      onClick={() => handlePropertyChange('vcutColor', item.color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: item.color,
                        color: item.color === '#000000' ? 'white' : 'black',
                        border: textProperties.vcutColor === item.color ?
                          '2px solid #1890ff' :
                          (item.color === '#FFFFFF' ? '1px solid #d9d9d9' : 'none'),
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px'
                      }}
                    >
                      {textProperties.vcutColor === item.color && (
                        <CheckOutlined style={{
                          color: item.color === '#000000' ? 'white' : 'black',
                          fontSize: '12px'
                        }} />
                      )}
                    </Button>
                  ))}

                  {/* 自定义颜色按钮 */}
                  <Popover
                    content={<CustomColorPanel />}
                    trigger="click"
                    placement="bottom"
                    overlayStyle={{ width: 260 }}
                  >
                    <Button
                      size="small"
                      type={textProperties.vcutColor && !['#000000', '#FFFFFF', '#FFD700', '#FF0000'].includes(textProperties.vcutColor) ? 'primary' : 'default'}
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px'
                      }}
                    >
                      +
                    </Button>
                  </Popover>
                </div>

                {/* 当前颜色显示 */}
                {textProperties.vcutColor && !['#000000', '#FFFFFF', '#FFD700', '#FF0000'].includes(textProperties.vcutColor) && (
                  <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>当前:</span>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        backgroundColor: textProperties.vcutColor,
                        border: '1px solid #d9d9d9'
                      }}
                    />
                    <span>{textProperties.vcutColor}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {textProperties.engraveType === 'frost' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '85px',
                textAlign: 'right'
              }}>
                Frost Intensity:
              </span>
              <div style={{ flex: 1 }}>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={textProperties.frostIntensity}
                  onChange={(value) => handlePropertyChange('frostIntensity', value)}
                  style={{ margin: '4px 0' }}
                />
              </div>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '30px',
                textAlign: 'center'
              }}>
                {textProperties.frostIntensity}
              </span>
            </div>
          </div>
        )}

        {textProperties.engraveType === 'polish' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '85px',
                textAlign: 'right'
              }}>
                Polish Blend:
              </span>
              <div style={{ flex: 1 }}>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={textProperties.polishBlend}
                  onChange={(value) => handlePropertyChange('polishBlend', value)}
                  style={{ margin: '4px 0' }}
                />
              </div>
              <span style={{
                fontSize: '12px',
                color: '#666',
                width: '30px',
                textAlign: 'center'
              }}>
                {textProperties.polishBlend}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TextEditor;