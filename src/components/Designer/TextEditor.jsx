import React, { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  Slider,
  Space,
  Divider,
  ColorPicker,
  Card,
  message,
  Tooltip,
  Popover,
  Radio
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  SaveOutlined,
  CloseOutlined,
  BoldOutlined,
  ItalicOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  DragOutlined,
  RotateRightOutlined,
  RedoOutlined,
  LayoutOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Canvas } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import './TextEditor.css'

const TextEditor = ({
  onAddText,
  onUpdateText,
  onDeleteText,
  currentTextId,
  existingTexts,
  monuments,
  isEditing,
  fontOptions, // 注意：这里必须传入新的包含 family/variant 的数据源
  onSaveTextToOptions,
  onClose,
  getFontPath,
  transformMode,
  setTransformMode,
  onRotate90,
}) => {
  const { t } = useTranslation();

  // --- 核心逻辑 1: 计算去重后的字体家族列表 (用于下拉菜单) ---
  // const uniqueFamilies = useMemo(() => {
  // const map = new Map();
  //fontOptions.forEach(font => {
  //if (!map.has(font.family)) {
  //map.set(font.family, font); // 只存一个代表，用于读取 cssFamily 等信息
  //}
  //});
  // 转为数组并排序
  //return Array.from(map.values()).sort((a, b) => a.family.localeCompare(b.family));
  //}, [fontOptions]);
  // --- 修复 1: 保持原始顺序的去重逻辑 ---
  const uniqueFamilies = useMemo(() => {
    const seen = new Set();
    const result = [];

    // 遍历原始数组
    fontOptions.forEach(font => {
      // 只有第一次遇到的 family 才加入列表
      if (!seen.has(font.family)) {
        seen.add(font.family);
        result.push(font);
      }
    });

    // 直接返回 result，不进行 sort 排序，保持数据源的物理顺序
    return result;
  }, [fontOptions]);

  // --- 核心逻辑 2: 智能解析最佳字体文件 ---
  // 给定家族、是否加粗、是否斜体，返回最匹配的文件名
  const resolveBestFont = useCallback((familyName, targetBold, targetItalic) => {
    // 1. 找出该家族下所有的变体文件
    const variants = fontOptions.filter(f => f.family === familyName);

    // 2. 定义查找目标
    let targetVariant = 'regular';
    if (targetBold && targetItalic) targetVariant = 'boldItalic';
    else if (targetBold) targetVariant = 'bold';
    else if (targetItalic) targetVariant = 'italic';

    // 3. 尝试精确匹配
    const exactMatch = variants.find(v => v.variant === targetVariant);
    if (exactMatch) return exactMatch.name;

    // 4. 降级策略 (Fallback Logic)
    // 如果找不到 BoldItalic，尝试找 Bold
    if (targetVariant === 'boldItalic') {
      const boldMatch = variants.find(v => v.variant === 'bold');
      if (boldMatch) return boldMatch.name;
    }

    // 如果找不到 Bold，尝试找 Medium (有些字体用 Medium 代替 Bold)
    if (targetVariant === 'bold') {
      const mediumMatch = variants.find(v => v.variant === 'medium');
      if (mediumMatch) return mediumMatch.name;
    }

    // 5. 最后的兜底：返回 Regular 或该家族的第一个文件
    const regularMatch = variants.find(v => v.variant === 'regular');
    return regularMatch ? regularMatch.name : variants[0]?.name;
  }, [fontOptions]);

  // --- 状态管理 ---
  const [textProperties, setTextProperties] = useState({
    content: '',
    font: 'helvetiker_regular.typeface', // 存储的是具体文件名
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
  const [engraveTypes, setEngraveTypes] = useState({ vcut: false, frost: false, polish: false });

  // --- 核心逻辑 3: 动态计算当前状态 (Derived State) ---
  // 我们不再手动 setBold/setItalic，而是根据当前的 font 文件名反推状态
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

  // 检查当前家族是否有能力支持 B/I (用于禁用按钮)
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


  // --- 事件处理 ---

  // 切换字体家族
  const handleFamilyChange = (newFamilyName) => {
    // 切换家族时，尝试保持当前的 B/I 状态
    const newFontName = resolveBestFont(newFamilyName, isBold, isItalic);
    handlePropertyChange('font', newFontName);
  };

  // 切换加粗
  const handleBoldClick = () => {
    if (!currentFamilyName) return;
    if (!canBold && !isBold) {
      message.warning(`当前字体 "${currentFamilyName}" 不支持加粗`);
      return;
    }
    const targetState = !isBold;
    const newFontName = resolveBestFont(currentFamilyName, targetState, isItalic);
    handlePropertyChange('font', newFontName);
  };

  // 切换斜体
  const handleItalicClick = () => {
    if (!currentFamilyName) return;
    if (!canItalic && !isItalic) {
      message.warning(`当前字体 "${currentFamilyName}" 不支持斜体`);
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

  // 监听选中文字变化
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
      message.error('请先添加一个主碑');
      return;
    }
    onAddText({
      ...textProperties,
      monumentId: targetMonumentId,
      textDirection: textDirection
    });
    // 重置表单
    setTextProperties(prev => ({
      ...prev,
      content: '',
      // 注意：添加后不重置字体，保持用户当前选择，体验更好
      textDirection: 'horizontal'
    }));
    setTextDirection('horizontal');
  };

  const handleDeleteText = () => {
    if (currentTextId) onDeleteText(currentTextId);
  };

  const handleDirectionChange = (e) => {
    const value = e.target.value;
    setTextDirection(value);
    if (currentTextId) handlePropertyChange('textDirection', value);
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
      if (currentText) onSaveTextToOptions(currentText);
      else message.error("未找到要保存的文字");
    } else {
      message.warning("请先选中一个文字对象");
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const inputRef = useRef(null);

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
          {/* 加粗按钮：使用新的状态控制 */}
          <Button
            type="default"
            size="small"
            icon={<BoldOutlined />}
            onClick={handleBoldClick}
            disabled={(!currentTextId && !textProperties.content) || !canBold}
            title={!canBold ? "Font does not support Bold" : "Bold"}
            style={{
              backgroundColor: isBold ? '#1890ff' : '#ffffff',
              borderColor: isBold ? '#1890ff' : '#d9d9d9',
              color: isBold ? '#ffffff' : '#000000',
              flex: 1
            }}
          />
          {/* 斜体按钮：使用新的状态控制 */}
          <Button
            type="default"
            size="small"
            icon={<ItalicOutlined />}
            onClick={handleItalicClick}
            disabled={(!currentTextId && !textProperties.content) || !canItalic}
            title={!canItalic ? "Font does not support Italic" : "Italic"}
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
          {/* 优化后的字体选择器：只显示 Family */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666', width: '40px', textAlign: 'right', marginRight: '8px' }}>Font:</span>
            <Select
              value={currentFamilyName} // 显示当前的 Family
              onChange={handleFamilyChange}
              style={{ flex: 1 }}
              size="small"
              showSearch
              optionFilterProp="value"
            >
              {uniqueFamilies.map(fam => (
                <Select.Option key={fam.family} value={fam.family}>
                  <Tooltip
                    placement="right"
                    title={<FontPreviewTooltipContent font={fam} />}
                    destroyTooltipOnHide
                    mouseEnterDelay={0.2}
                  >
                    {/* 显示家族名，不再是冗长的文件名 */}
                    <span style={{ fontFamily: fam.cssFamily || 'inherit', fontSize: '12px' }}>
                      {fam.family}
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