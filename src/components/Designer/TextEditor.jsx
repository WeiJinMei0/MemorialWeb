import React, { useState, useCallback, useEffect, Suspense, useMemo, Component } from 'react';
import { Button, Input, Select, Slider, Space, Divider, ColorPicker, Card, message, Tooltip, Popover, Radio, Row, Col } from 'antd';
import { PlusOutlined, CheckOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, SaveOutlined, CloseOutlined, BoldOutlined, ItalicOutlined, LayoutOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import './TextEditor.css';

// --- 常量定义 ---
const THEME_COLOR = '#4a4a3b';
const ACTIVE_BTN_COLOR = '#4a4a3b';
const INACTIVE_BTN_BG = '#e0e0e0';
const INACTIVE_BTN_COLOR = '#000';

// --- 新增：Text3D 安全渲染组件 (错误边界) ---
class SafeText3D extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 以便下一次渲染能够显示降级 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 可以在这里记录错误
    console.error("Text3D Rendering Error:", error);

    // 防止重复报错刷屏，可以加个判断或者只在控制台报
    // 这里使用防抖或直接提示
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  componentDidUpdate(prevProps) {
    // 如果字体或文字内容改变了，尝试重置错误状态，重新渲染
    if (prevProps.font !== this.props.font || prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      // 渲染出错时显示的内容，可以返回 null 什么都不显示，或者显示一个替代模型
      return null;
    }
    return this.props.children;
  }
}

// --- 自定义图标组件：模拟图片中的样式 ---
// 样式：蓝色小箭头指向汉字
const ConversionIcon = ({ char, label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      marginRight: '16px',
      userSelect: 'none'
    }}
  >
    {/* 图标部分 */}
    <div style={{ position: 'relative', width: '20px', height: '20px', marginRight: '4px' }}>
      {/* 汉字 */}
      <span style={{
        position: 'absolute',
        right: 0,
        top: 0,
        fontSize: '16px',
        lineHeight: '1',
        color: '#444'
      }}>
        {char}
      </span>
      {/* 蓝色小箭头 */}
      <svg width="10" height="10" viewBox="0 0 1024 1024" style={{ position: 'absolute', left: 0, bottom: 2, fill: '#1890ff' }}>
        <path d="M869 487.8L491.2 159.9c-29.1-25.1-73.2-25.1-102.3 0s-29.1 66.2 0 91.3l253.4 219.7H136c-41.4 0-75 33.6-75 75s33.6 75 75 75h506.3L389 840.6c-29.1 25.1-29.1 66.2 0 91.3 14.1 12.2 32.8 18.3 51.2 18.3s37.1-6.1 51.2-18.3l377.8-327.9c14-12 21.6-28.9 21.6-47.1 0-18.5-7.6-35.7-21.8-49.1z" />
      </svg>
    </div>
    {/* 文字说明 */}
    <span style={{ fontSize: '14px', color: '#333' }}>{label}</span>
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

  // --- 核心逻辑 1: 保持原始顺序的去重逻辑 ---
  const uniqueFamilies = useMemo(() => {
    const seen = new Set();
    const result = [];
    fontOptions.forEach(font => {
      if (!seen.has(font.family)) {
        seen.add(font.family);
        result.push(font);
      }
    });
    return result;
  }, [fontOptions]);

  // 解析最佳字体文件 ---
  const resolveBestFont = useCallback((familyName, targetBold, targetItalic) => {
    const variants = fontOptions.filter(f => f.family === familyName);
    let targetVariant = 'regular';
    if (targetBold && targetItalic) targetVariant = 'boldItalic';
    else if (targetBold) targetVariant = 'bold';
    else if (targetItalic) targetVariant = 'italic';

    const exactMatch = variants.find(v => v.variant === targetVariant);
    if (exactMatch) return exactMatch.name;

    if (targetVariant === 'boldItalic') {
      const boldMatch = variants.find(v => v.variant === 'bold');
      if (boldMatch) return boldMatch.name;
    }

    if (targetVariant === 'bold') {
      const mediumMatch = variants.find(v => v.variant === 'medium');
      if (mediumMatch) return mediumMatch.name;
    }

    const regularMatch = variants.find(v => v.variant === 'regular');
    return regularMatch ? regularMatch.name : variants[0]?.name;
  }, [fontOptions]);

  // --- 状态管理 ---
  const [textProperties, setTextProperties] = useState({
    content: '',
    font: 'Cambria_Regular',
    size: 3,
    alignment: 'center',
    lineSpacing: 1.2,
    kerning: 0,
    curveAmount: 0,
    engraveType: 'vcut',
    vcutColor: '#FFFFFF',
    frostIntensity: 0.8,
    polishBlend: 0.5,
    textDirection: 'horizontal'
  });

  const [textDirection, setTextDirection] = useState('horizontal');
  const [engraveTypes, setEngraveTypes] = useState({ vcut: true, frost: false, polish: false });

  // --- 核心逻辑 3: 动态计算当前状态 ---
  const currentFontObj = useMemo(() => {
    return fontOptions.find(f => f.name === textProperties.font) || {};
  }, [fontOptions, textProperties.font]);

  const currentFamilyName = currentFontObj.family;

  const isBold = useMemo(() => {
    return ['bold', 'boldItalic', 'medium'].includes(currentFontObj.variant);
  }, [currentFontObj]);

  const isItalic = useMemo(() => {
    return ['italic', 'boldItalic'].includes(currentFontObj.variant);
  }, [currentFontObj]);

  const canBold = useMemo(() => {
    if (!currentFamilyName) return false;
    const variants = fontOptions.filter(f => f.family === currentFamilyName);
    return variants.some(v => ['bold', 'boldItalic', 'medium'].includes(v.variant));
  }, [fontOptions, currentFamilyName]);

  const canItalic = useMemo(() => {
    if (!currentFamilyName) return false;
    const variants = fontOptions.filter(f => f.family === currentFamilyName);
    return variants.some(v => ['italic', 'boldItalic'].includes(v.variant));
  }, [fontOptions, currentFamilyName]);

  // --- 简繁转换逻辑 ---
  const handleConvert = async (type) => {
    if (!textProperties.content) {
      message.info(t('Text is empty'));
      return;
    }
    try {
      const openccModule = await import('opencc-js');
      const OpenCC = openccModule.OpenCC || (openccModule.default && openccModule.default.OpenCC) || openccModule.default || openccModule;

      let converter;
      if (OpenCC && OpenCC.Converter) {
        converter = OpenCC.Converter({ from: type === 's2t' ? 'cn' : 'tw', to: type === 's2t' ? 'tw' : 'cn' });
        const converted = converter(textProperties.content);
        handlePropertyChange('content', converted);
        message.success(type === 's2t' ? 'Converted to Traditional' : 'Converted to Simplified');
      } else if (typeof openccModule === 'function') {
        const fn = openccModule;
        const converted = fn(textProperties.content, type);
        handlePropertyChange('content', converted);
        message.success(type === 's2t' ? 'Converted to Traditional' : 'Converted to Simplified');
      }
    } catch (err) {
      console.error(err);
      message.error('Need to install dependency: npm install opencc-js');
    }
  };

  // --- 事件处理 ---
  const handleFamilyChange = (newFamilyName) => {
    const newFontName = resolveBestFont(newFamilyName, isBold, isItalic);
    handlePropertyChange('font', newFontName);
  };

  const handleBoldClick = () => {
    if (!currentFamilyName) return;
    if (!canBold && !isBold) {
      message.warning(`Current font "${currentFamilyName}" does not support bold`);
      return;
    }
    const targetState = !isBold;
    const newFontName = resolveBestFont(currentFamilyName, targetState, isItalic);
    handlePropertyChange('font', newFontName);
  };

  const handleItalicClick = () => {
    if (!currentFamilyName) return;
    if (!canItalic && !isItalic) {
      message.warning(`Current font "${currentFamilyName}" does not support italic`);
      return;
    }
    const targetState = !isItalic;
    const newFontName = resolveBestFont(currentFamilyName, isBold, targetState);
    handlePropertyChange('font', newFontName);
  };

  // 3D 预览组件 (保持不变)
  const FontPreviewTooltipContent = ({ font }) => {
    const previewText = font.isChinese ? '示例Aa' : 'Aa';
    const fontPath = getFontPath ? getFontPath(font.name) : (font.path || '/fonts/helvetiker_regular.typeface.json');
    // 定义错误处理函数
    const handleRenderError = () => {
      // 由于 Tooltip 可能会频繁触发，建议这里只 console.error 或者不弹窗，
      // 避免鼠标划过时满屏 message
      console.warn(`Font ${font.family} does not support the preview characters.`);
    };
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
              <SafeText3D font={fontPath} onError={handleRenderError}>
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
              </SafeText3D>
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
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{t('textEditor.standardColors')}</div>
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
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{t('textEditor.customColor')}</div>
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

  useEffect(() => {
    if (currentTextId) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) {
        setTextProperties(prev => ({
          ...prev,
          ...currentText,
          textDirection: currentText.textDirection || 'horizontal'
        }));
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
    setTextProperties(prev => ({ ...prev, [property]: value }));
    if (currentTextId) {
      onUpdateText(currentTextId, { [property]: value });
    }
  };

  const handleEngraveTypeChange = (type) => {
    const newEngraveTypes = { vcut: false, frost: false, polish: false, [type]: true };
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
      message.error('Please add a tablet first');
      return;
    }
    let fontToUse = textProperties.font;
    if (fontToUse === 'helvetiker_regular.typeface') {
      const isChinese = /[\u4e00-\u9fa5]/.test(textProperties.content);
      if (isChinese) {
        const yahei = fontOptions.find(f => f.name.includes('微软雅黑') || f.name.includes('YaHei'));
        if (yahei) fontToUse = yahei.name;
        else {
          const anyChinese = fontOptions.find(f => f.isChinese);
          if (anyChinese) fontToUse = anyChinese.name;
        }
      } else {
        const cambria = fontOptions.find(f => f.name.includes('Cambria'));
        if (cambria) fontToUse = cambria.name;
      }
    }
    onAddText({
      ...textProperties,
      font: fontToUse,
      monumentId: targetMonumentId,
      textDirection: textDirection
    });
    setTextProperties(prev => ({
      ...prev,
      content: '',
      font: fontToUse,
      textDirection: 'horizontal'
    }));
    setTextDirection('horizontal');
  };

  const handleSaveCurrentText = () => {
    if (currentTextId && onSaveTextToOptions) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) onSaveTextToOptions(currentText);
      else message.error('Text not found');
    } else {
      message.warning('Please select a text object first');
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleDirectionChange = (e) => {
    const value = e.target.value;
    setTextDirection(value);
    if (currentTextId) handlePropertyChange('textDirection', value);
  };

  const getButtonStyle = (isActive) => ({
    backgroundColor: isActive ? ACTIVE_BTN_COLOR : INACTIVE_BTN_BG,
    borderColor: isActive ? ACTIVE_BTN_COLOR : '#d9d9d9',
    color: isActive ? '#fff' : INACTIVE_BTN_COLOR,
    flex: 1,
    borderRadius: 0,
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  return (
    <div className="text-editor-panel" style={{ width: '100%' }}>
      {/* 标题栏 */}
      <div style={{
        backgroundColor: THEME_COLOR,
        color: '#fff',
        padding: '10px 15px',
        fontSize: '16px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px'
      }}>
        <span>{t('textEditor.title')}</span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined style={{ color: '#fff' }} />}
          onClick={handleClose}
        />
      </div>

      <Card
        size="small"
        bordered={false}
        style={{ width: '100%', borderRadius: 0, borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }}
        bodyStyle={{ padding: '16px' }}
      >
        {/* Font 字体选择 */}

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', width: '60px', marginRight: '8px' }}>{t('textEditor.font')}</span>
          <Select
            value={currentFamilyName}
            onChange={handleFamilyChange}
            style={{ flex: 1 }}
            size="middle"
            showSearch
            optionFilterProp="value"
            dropdownStyle={{ minWidth: '350px', maxWidth: '450px' }}
            optionLabelProp="value"
          >
            {uniqueFamilies.map(fam => (
              <Select.Option key={fam.family} value={fam.family} className="font-select-option">
                <Tooltip
                  placement="right"
                  title={<FontPreviewTooltipContent font={fam} />}
                  destroyTooltipOnHide
                  mouseEnterDelay={0.2}
                >
                  <span style={{ fontFamily: fam.cssFamily || 'inherit', fontSize: '20px' }}>{fam.family}</span>
                </Tooltip>
              </Select.Option>
            ))}
          </Select>
        </div>


        {/* Size 大小选择 */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', width: '60px', marginRight: '8px' }}>{t('textEditor.size')}</span>
          <Input
            type="number"
            value={textProperties.size}
            onChange={(e) => handlePropertyChange('size', Number(e.target.value))}
            min={0.5}
            max={20}
            step={0.25}
            size="middle"
            style={{ width: '100px' }}
          />
          <span style={{ marginLeft: '12px', fontSize: '14px' }}>Inches</span>
        </div>

        {/* 核心按钮组 */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Button
              style={getButtonStyle(isBold)}
              icon={<BoldOutlined />}
              onClick={handleBoldClick}
              disabled={(!currentTextId && !textProperties.content) || !canBold}
              title={!canBold ? t('textEditor.fontNoBoldSupport') : t('textEditor.bold')}
            />
            <Button
              style={getButtonStyle(isItalic)}
              icon={<ItalicOutlined />}
              onClick={handleItalicClick}
              disabled={(!currentTextId && !textProperties.content) || !canItalic}
              title={!canItalic ? t('textEditor.fontNoItalicSupport') : t('textEditor.italic')}
            />
            <Button
              style={getButtonStyle(textProperties.alignment === 'left')}
              icon={<AlignLeftOutlined />}
              onClick={() => handlePropertyChange('alignment', 'left')}
            />
            <Button
              style={getButtonStyle(textProperties.alignment === 'center')}
              icon={<AlignCenterOutlined />}
              onClick={() => handlePropertyChange('alignment', 'center')}
            />
            <Button
              style={getButtonStyle(textProperties.alignment === 'right')}
              icon={<AlignRightOutlined />}
              onClick={() => handlePropertyChange('alignment', 'right')}
            />
            <Button
              style={{ ...getButtonStyle(false), width: '40px', flex: 'none' }}
              icon={<SaveOutlined />}
              onClick={handleSaveCurrentText}
              disabled={!currentTextId || !onSaveTextToOptions}
              title={t('textEditor.saveToLibrary')}
            />
          </Space.Compact>
        </div>

        {/* Direction 文字方向 */}
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'baseline',  // 改为基线对齐
          gap: '12px'
        }}>
          <span style={{
            fontSize: '14px',
            minWidth: '70px',
            flexShrink: 0,
            lineHeight: '1.5'  // 确保行高与Radio一致
          }}>
            {t('textEditor.direction')}
          </span>
          <Radio.Group
            onChange={handleDirectionChange}
            value={textDirection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'  // Radio之间的间距
            }}
          >
            <Radio value={t('textEditor.horizontal')} style={{ margin: 0, padding: 0 }}>Horizontal</Radio>
            <Radio value={t('textEditor.vertical')} style={{ margin: 0, padding: 0 }}>Vertical</Radio>
          </Radio.Group>
        </div>

        {/* 简繁转换 - 修改为图标排列 */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          {/* 空的占位符对齐 Label */}
          <span style={{ fontSize: '14px', marginRight: '12px', minWidth: '70px', color: 'transparent' }}>Convert</span>

          <div style={{ display: 'flex' }}>
            <ConversionIcon
              char="繁"
              label='繁转简' // 繁转简
              onClick={() => handleConvert('t2s')}
            />
            <ConversionIcon
              char="简"
              label='简转繁' // 简转繁
              onClick={() => handleConvert('s2t')}
            />
          </div>
        </div>

        {/* Kerning 字间距 */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', width: '90px', textAlign: 'right', marginRight: '12px' }}>{t('textEditor.kerning')}</span>
          <Input
            type="number"
            value={textProperties.kerning}
            onChange={(e) => handlePropertyChange('kerning', Number(e.target.value))}
            min={-10}
            max={10}
            size="middle"
            style={{ width: '80px' }}
          />
          {/* 上下箭头按钮颜色需自定义CSS，这里复用Antd InputNumber即可，如果需要完全一致需深度定制CSS */}
        </div>

        {/* Line Space 行间距 */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', width: '90px', textAlign: 'right', marginRight: '12px' }}>{t('textEditor.lineSpace')}</span>
          <Input
            type="number"
            value={textProperties.lineSpacing}
            onChange={(e) => handlePropertyChange('lineSpacing', Number(e.target.value))}
            min={0.5}
            max={3}
            step={0.1}
            size="middle"
            style={{ width: '80px' }}
          />
        </div>

        {/* Shape 弯曲 */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', width: '90px', textAlign: 'right', marginRight: '12px' }}>{t('textEditor.shape')}</span>
          <Slider
            min={-45}
            max={45}
            value={textProperties.curveAmount}
            onChange={(value) => handlePropertyChange('curveAmount', value)}
            style={{ flex: 1, margin: '0 10px 0 0' }}
          />
          <span style={{ width: '24px', textAlign: 'right' }}>{textProperties.curveAmount}</span>
        </div>

        {/* Color / Engrave Type */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '14px' }}>{t('textEditor.color')}</div>

          {/* V-Cut + Colors */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Button
              type="primary"
              style={{
                backgroundColor: engraveTypes.vcut ? ACTIVE_BTN_COLOR : '#fff',
                borderColor: engraveTypes.vcut ? ACTIVE_BTN_COLOR : '#d9d9d9',
                color: engraveTypes.vcut ? '#fff' : '#000',
                marginRight: '12px',
                width: '90px',
                fontWeight: 'bold'
              }}
              icon={engraveTypes.vcut ? <CheckOutlined /> : null}
              onClick={() => handleEngraveTypeChange('vcut')}
            >
              {t('textEditor.vcut')}
            </Button>

            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { color: '#FFFFFF' },
                { color: '#000000' },
                { color: '#FFD700' },
                { color: '#FF0000' }
              ].map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    handleEngraveTypeChange('vcut');
                    handlePropertyChange('vcutColor', item.color);
                  }}
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: item.color,
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {textProperties.engraveType === 'vcut' && textProperties.vcutColor === item.color && (
                    <CheckOutlined style={{
                      color: item.color === '#000000' ? '#fff' : '#000',
                      fontSize: '12px'
                    }} />
                  )}
                </div>
              ))}
              <Popover
                content={<CustomColorPanel />}
                trigger="click"
                placement="bottom"
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#e0e0e0',
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#666'
                  }}
                >
                  +
                </div>
              </Popover>
            </div>
          </div>

          {/* Frost & Polish */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              style={{
                backgroundColor: engraveTypes.frost ? '#d9d9d9' : '#e0e0e0',
                borderColor: '#d9d9d9',
                color: '#000',
                width: '90px',
                fontWeight: 'bold',
                textAlign: 'left',
                paddingLeft: '10px'
              }}
              onClick={() => handleEngraveTypeChange('frost')}
            >
              + {t('textEditor.frost')}
            </Button>
            <Button
              style={{
                backgroundColor: engraveTypes.polish ? '#d9d9d9' : '#e0e0e0',
                borderColor: '#d9d9d9',
                color: '#000',
                width: '90px',
                fontWeight: 'bold',
                textAlign: 'left',
                paddingLeft: '10px'
              }}
              onClick={() => handleEngraveTypeChange('polish')}
            >
              + {t('textEditor.polish')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TextEditor;