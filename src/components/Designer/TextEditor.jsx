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
  message,
  Tooltip,
  Popover,
  Radio // 导入 Radio 组件用于选择方向
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined,
  BoldOutlined,
  ItalicOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  DragOutlined,
  RotateRightOutlined,
  RedoOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FontSizeOutlined,
  ColumnHeightOutlined,
  ExpandOutlined,
  LayoutOutlined, // 新增：文本方向图标
  VerticalAlignTopOutlined // 新增：竖排图标
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import './TextEditor.css'

// --- 辅助函数：解析字体名称 ---
const getFontFamilyInfo = (fontName) => {
  if (!fontName) return { family: '', bold: false, italic: false };
  if (fontName.endsWith(" Bold Italic")) return { family: fontName.replace(" Bold Italic", ""), bold: true, italic: true };
  if (fontName.endsWith(" Bold")) return { family: fontName.replace(" Bold", ""), bold: true, italic: false };
  if (fontName.endsWith(" Italic")) return { family: fontName.replace(" Italic", ""), bold: false, italic: true };
  if (fontName.endsWith(" Regular")) return { family: fontName.replace(" Regular", ""), bold: false, italic: false };
  if (fontName.endsWith(" Normal")) return { family: fontName.replace(" Normal", ""), bold: false, italic: false };
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
  onSaveTextToOptions,
  onClose,
  getFontPath,
  transformMode,
  setTransformMode,
  onRotate90,
}) => {
  const { t } = useTranslation();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [canBold, setCanBold] = useState(true);
  const [canItalic, setCanItalic] = useState(true);

  // 新增：文本方向状态（horizontal=横向，vertical=竖向）
  const [textDirection, setTextDirection] = useState('horizontal');

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

  const CustomColorPanel = () => {
    const colorRamps = {
      red: ['#FF9999', '#FF6666', '#FF3333', '#FF0000', '#CC0000'],
      gold: ['#FFE5B3', '#FFD699', '#FFC266', '#FFB033', '#CC8A00'],
      blue: ['#99CFFF', '#66B8FF', '#339FFF', '#0080FF', '#0066CC'],
      green: ['#99FF99', '#66FF66', '#33FF33', '#00FF00', '#00CC00'],
      gray: ['#E6E6E6', '#D9D9D9', '#CCCCCC', '#999999', '#666666']
    };

    return (
      <div style={{ width: 240 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>标准色</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
            {Object.values(colorRamps).map((ramp, rampIndex) => (
              <div key={`ramp-${rampIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ramp.map((color, index) => (
                  <div
                    key={`color-${rampIndex}-${index}`}
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
            ))}
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />
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

  // 在文本属性中添加 textDirection（同步到主程序）
  const [textProperties, setTextProperties] = useState({
    content: '',
    font: 'helvetiker_regular.typeface',
    size: 3,
    alignment: 'center',
    lineSpacing: 1.2,
    kerning: 0,
    curveAmount: 0,
    engraveType: 'vcut',
    vcutColor: '#FFFFFF',
    frostIntensity: 0.8,
    polishBlend: 0.5,
    textDirection: 'horizontal' // 默认横向
  });

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const [engraveTypes, setEngraveTypes] = useState({
    vcut: false,
    frost: false,
    polish: false
  });

  // 监听字体变化，更新按钮状态
  useEffect(() => {
    if (textProperties.font && fontOptions.length > 0) {
      const { family, bold, italic } = getFontFamilyInfo(textProperties.font);
      setIsBold(bold);
      setIsItalic(italic);
      const targetBoldName = constructFontName(family, !bold, italic);
      const targetItalicName = constructFontName(family, bold, !italic);
      setCanBold(fontOptions.some(f => f.name === targetBoldName));
      setCanItalic(fontOptions.some(f => f.name === targetItalicName));
    }
  }, [textProperties.font, fontOptions]);

  // 选中文字变化时，同步文本方向状态
  useEffect(() => {
    if (currentTextId) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) {
        setTextProperties(prev => ({
          ...prev,
          ...currentText,
          // 兼容旧文字（无 textDirection 时默认横向）
          textDirection: currentText.textDirection || 'horizontal'
        }));
        // 🔥 同步文本方向到单选框
        setTextDirection(currentText.textDirection || 'horizontal');
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
      message.error('Enter Text Content');
      return;
    }
    const targetMonumentId = monuments.length > 0 ? monuments[0].id : null;
    if (!targetMonumentId) {
      message.error('请先添加一个主碑');
      return;
    }
    // 🔥 新增：添加文字时携带文本方向
    onAddText({
      ...textProperties,
      monumentId: targetMonumentId,
      textDirection: textDirection // 传递选中的横/竖方向
    });
    // 重置表单（方向保留默认横向）
    setTextProperties({
      content: '',
      font: 'Arial',
      size: 3,
      alignment: 'center',
      lineSpacing: 1.2,
      kerning: 0,
      curveAmount: 0,
      engraveType: 'vcut',
      vcutColor: '#000000',
      frostIntensity: 0.8,
      polishBlend: 0.5,
      thickness: 0.02,
      textDirection: 'horizontal'
    });
    // 重置方向选择为横向
    setTextDirection('horizontal');
  };

  const handleDeleteText = () => {
    if (currentTextId) {
      onDeleteText(currentTextId);
    }
  };

  const inputRef = useRef(null);

  const handleItalicClick = () => {
    const { family, bold, italic } = getFontFamilyInfo(textProperties.font);
    const newFontName = constructFontName(family, bold, !italic);
    if (fontOptions.some(f => f.name === newFontName)) {
      handlePropertyChange('font', newFontName);
    } else {
      message.warning(`当前字体 "${family}" 不支持斜体`);
    }
  };

  const handleBoldClick = () => {
    const { family, bold, italic } = getFontFamilyInfo(textProperties.font);
    const newFontName = constructFontName(family, !bold, italic);
    if (fontOptions.some(f => f.name === newFontName)) {
      handlePropertyChange('font', newFontName);
    } else {
      message.warning(`当前字体 "${family}" 不支持加粗`);
    }
  };

  // 🔥 关键新增：切换文本方向（同步到状态和属性）
  const handleDirectionChange = (e) => {
    const value = e.target.value;
    setTextDirection(value);
    // 编辑已有文字时，实时更新方向
    if (currentTextId) {
      handlePropertyChange('textDirection', value);
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
        {/* 新增：文本方向选择（横/竖） */}
        <div style={{
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'nowrap',
          height: '32px', // 固定高度，锁住对齐基准
          overflow: 'hidden' // 隐藏任何溢出元素，避免换行
        }}>
          <span style={{
            fontSize: '14px',
            color: '#666',
            width: '65px',
            textAlign: 'right',
            whiteSpace: 'nowrap',
            lineHeight: '32px',
            padding: '0',
            margin: '0',
            flexShrink: 0 // 禁止标签被压缩
          }}>
            Direction:
          </span>
          {/* Radio 组：强制横向，紧贴标签 */}
          <Radio.Group
            value={textDirection}
            onChange={handleDirectionChange}
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              height: '32px',
              flexShrink: 0, // 禁止 Radio 组被压缩
              margin: '0'
            }}
          >
            {/* 单个 Radio：消除内边距，精准对齐 */}
            <Radio value="horizontal" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              lineHeight: '32px',
              padding: '0',
              margin: '0',
              height: '32px',
              minWidth: '100px' // 固定最小宽度，避免挤压
            }}>
              <LayoutOutlined style={{ fontSize: '14px' }} /> Horizontal
            </Radio>
            <Radio value="vertical" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              lineHeight: '32px',
              padding: '0',
              margin: '0',
              height: '32px',
              minWidth: '100px'
            }}>
              <VerticalAlignTopOutlined style={{ fontSize: '14px' }} /> Vertical
            </Radio>
          </Radio.Group>
        </div>


        {/* 文字内容（样式不变，输入的内容会根据方向在主程序渲染） */}
        <div style={{ marginBottom: '12px' }}>
          <Input.TextArea
            ref={inputRef}
            value={textProperties.content}
            onChange={(e) => handlePropertyChange('content', e.target.value)}
            placeholder="Enter Text Content"
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

        {/* 变换控制区域 */}
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
            gap: 8
          }}>
            <span style={{
              fontSize: 12,
              color: '#666',
              minWidth: 60
            }}>
              Operating Mode:
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Tooltip title="移动 (T)">
                <Button
                  size="small"
                  type={transformMode === 'translate' ? 'primary' : 'default'}
                  icon={<DragOutlined />}
                  onClick={() => setTransformMode && setTransformMode('translate')}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                />
              </Tooltip>
              <Tooltip title="旋转 (R)">
                <Button
                  size="small"
                  type={transformMode === 'rotate' ? 'primary' : 'default'}
                  icon={<RotateRightOutlined />}
                  onClick={() => setTransformMode && setTransformMode('rotate')}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                />
              </Tooltip>
              <Tooltip title="向右旋转 90°">
                <Button
                  size="small"
                  icon={<RedoOutlined style={{ transform: 'rotate(90deg)' }} />}
                  onClick={onRotate90}
                  disabled={!currentTextId}
                  style={{
                    width: 32,
                    height: 32,
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

        {/* 字体和大小 */}
        <div style={{ marginBottom: '12px' }}>
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
            <div style={{ marginLeft: '8px', marginRight: '8px' }}>Inches</div>
          </div>
        </div>

        {/* 对齐方式 */}
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

        {/* 间距控制 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        {/* 弯曲程度 */}
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

        {/* 雕刻效果 */}
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