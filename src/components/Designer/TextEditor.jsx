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
  EyeOutlined,
  EyeInvisibleOutlined // 闭眼图标
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
  fontOptions,
  onSaveTextToOptions,,// 1. 接收新的 prop
  onClose // 新增：关闭回调函数
                      onClose
}) => {
  const { t } = useTranslation();
  const FontPreviewTooltipContent = ({ font }) => {
    const previewText = font.previewText || 'Aa';
    const fontPath = font.path || '/fonts/helvetiker_regular.typeface.json';

    return (
      <div className="font-preview-tooltip">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 60 }}
          gl={{ antialias: true }}
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
      blue: ['#99CFFF', '#66B8FF', '#339FFF', '#0080FF', '#0066CC'],
      green: ['#99FF99', '#66FF66', '#33FF33', '#00FF00', '#00CC00'],
      gray: ['#E6E6E6', '#D9D9D9', '#CCCCCC', '#999999', '#666666']
    };

    return (
      <div style={{ width: 240 }}>
        {/* 色系选择 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>标准色</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
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
    size: 16,
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

  // 当选中文字变化时更新表单
  useEffect(() => {
    if (currentTextId) {
      const currentText = existingTexts.find(text => text.id === currentTextId);
      if (currentText) {
        setTextProperties({
          content: currentText.content,
          font: currentText.font,
          size: currentText.size,
          alignment: currentText.alignment,
          lineSpacing: currentText.lineSpacing,
          kerning: currentText.kerning,
          curveAmount: currentText.curveAmount,
          engraveType: currentText.engraveType,
          vcutColor: currentText.vcutColor,
          frostIntensity: currentText.frostIntensity,
          polishBlend: currentText.polishBlend,
          thickness: currentText.thickness
        });

        // 更新雕刻效果按钮状态
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
    {/*
    if (!textProperties.content.trim()) {
      message.error('请输入文字内容');
      return;
    }
    */}
    // 设置固定的文本内容
    const fixedTextContent = "Text";

    // 更新文本属性状态
    const newTextProperties = {
      ...textProperties,
      content: fixedTextContent
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
      size: 16,
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
  const handleEditClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 添加加号按钮处理函数
  const handleAddClick = () => {
    // 这里可以添加创建新文字的逻辑
    message.info('添加新文字功能');
  };

  // 添加加粗按钮处理函数
  const handleBoldClick = () => {
    setIsBold(!isBold);
    // 这里可以添加加粗样式的逻辑
    message.info(`加粗 ${!isBold ? '开启' : '关闭'}`);
  };

  // 添加斜体按钮处理函数
  const handleItalicClick = () => {
    setIsItalic(!isItalic);
    // 这里可以添加斜体样式的逻辑
    message.info(`斜体 ${!isItalic ? '开启' : '关闭'}`);
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
      <Card size="small" title="TestEditor" style={{ width: '100%' }}
        extra={ // 在Card的extra属性中添加关闭按钮
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleClose}
            style={{ border: 'none' }}
          />
        }

      >
        {/* 文字内容 */}
        <div style={{ marginBottom: 16 }}>
          {/*<label>textcontent</label>*/}
          <Input.TextArea
            ref={inputRef}
            value={textProperties.content}
            onChange={(e) => handlePropertyChange('content', e.target.value)}
            placeholder="输入文字内容"
            rows={3}
            style={{
              position: isInputVisible ? 'static' : 'absolute',
              left: isInputVisible ? 'auto' : '-9999px',
              width: isInputVisible ? '100%' : '200px',
              opacity: isInputVisible ? 1 : 0,
              pointerEvents: isInputVisible ? 'auto' : 'none',
              marginTop: isInputVisible ? '8px' : '0',
              display: isInputVisible ? 'block' : 'none'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur();
                setIsInputVisible(false);
              }
            }}
          />
        </div>

        {/* 编辑按钮 */}
        <Button
          type="default"  // 改为 default 类型
          icon={<EditOutlined />}
          onClick={handleEditClick}
          disabled={!currentTextId && !textProperties.content}
          title={currentTextId ? "编辑文字内容" : "请先添加文字"}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#d9d9d9',
            color: '#000000'
          }}
          onMouseDown={(e) => {
            // 在鼠标按下时（点击开始）改变背景色
            e.currentTarget.style.backgroundColor = '#1890ff';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseUp={(e) => {
            // 在鼠标释放时恢复原色
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#000000';
          }}
          onMouseLeave={(e) => {
            // 防止鼠标移出时颜色卡住
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#000000';
          }}
        >
        </Button>

        {/* 加号按钮 */}
        <Button
          type="default"
          icon={<PlusCircleOutlined />}
          onClick={handleAddText}
          title="添加新文字"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#d9d9d9',
            color: '#000000'
          }}
        />

        {/* 加粗按钮 */}
        <Button
          type="default"
          icon={<BoldOutlined />}
          onClick={handleBoldClick}
          disabled={!currentTextId && !textProperties.content}
          title="加粗"
          style={{
            backgroundColor: isBold ? '#1890ff' : '#ffffff',
            borderColor: isBold ? '#1890ff' : '#d9d9d9',
            color: isBold ? '#ffffff' : '#000000'
          }}
        />

        {/* 斜体按钮 */}
        <Button
          type="default"
          icon={<ItalicOutlined />}
          onClick={handleItalicClick}
          disabled={!currentTextId && !textProperties.content}
          title="斜体"
          style={{
            backgroundColor: isItalic ? '#1890ff' : '#ffffff',
            borderColor: isItalic ? '#1890ff' : '#d9d9d9',
            color: isItalic ? '#ffffff' : '#000000'
          }}
        />

        {/* 眼睛图标按钮 - 控制输入框显示/隐藏 */}
        <Button
          type="default"
          icon={isInputVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={handleEyeClick}
          title={isInputVisible ? "隐藏输入框" : "显示输入框"}
          style={{
            backgroundColor: isInputVisible ? '#1890ff' : '#ffffff',
            borderColor: isInputVisible ? '#1890ff' : '#d9d9d9',
            color: isInputVisible ? '#ffffff' : '#000000'
          }}
        />
        {/* 字体和大小 */}
        <Row gutter={8} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <label>font</label>
            <Select
              value={textProperties.font}
              onChange={(value) => handlePropertyChange('font', value)}
              style={{ width: '100%' }}
            >
              {fontOptions.map(font => (
                <Select.Option key={font.name} value={font.name}>
                  <Tooltip
                    placement="right"
                    title={<FontPreviewTooltipContent font={font} />}
                    destroyTooltipOnHide
                    mouseEnterDelay={0.2}
                  >
                    <span style={{ fontFamily: font.cssFamily || 'inherit' }}>
                      {font.name}
                    </span>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <label>size</label>
            <Input
              type="number"
              value={textProperties.size}
              onChange={(e) => handlePropertyChange('size', Number(e.target.value))}
              min={1}
              max={100}
            />
          </Col>
        </Row>

        {/* 对齐方式 */}
        <div style={{ marginBottom: 16 }}>
          <label></label>
          <br />
          <Space.Compact style={{ width: '100%' }}>
            <Button
              icon={<AlignLeftOutlined />}
              type={textProperties.alignment === 'left' ? 'primary' : 'default'}
              onClick={() => handlePropertyChange('alignment', 'left')}
            >
              left
            </Button>
            <Button
              icon={<AlignCenterOutlined />}
              type={textProperties.alignment === 'center' ? 'primary' : 'default'}
              onClick={() => handlePropertyChange('alignment', 'center')}
            >
              center
            </Button>
            <Button
              icon={<AlignRightOutlined />}
              type={textProperties.alignment === 'right' ? 'primary' : 'default'}
              onClick={() => handlePropertyChange('alignment', 'right')}
            >
              right
            </Button>
          </Space.Compact>
        </div>

        {/* 间距控制 */}
        <Row gutter={8} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <label>kerning: {textProperties.kerning}</label>
            <Input
              type="number"
              value={textProperties.kerning}
              onChange={(e) => handlePropertyChange('kerning', Number(e.target.value))}
              min={-10}
              max={10}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12}>
            <label>lineSpacing: {textProperties.lineSpacing}</label>
            <Input
              type="number"
              value={textProperties.lineSpacing}
              onChange={(e) => handlePropertyChange('lineSpacing', Number(e.target.value))}
              min={0.5}
              max={3}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* 弯曲程度 */}
        <div style={{ marginBottom: 16 }}>
          <label>shape: {textProperties.curveAmount}</label>
          <Slider
            min={-45}
            max={45}
            value={textProperties.curveAmount}
            onChange={(value) => handlePropertyChange('curveAmount', value)}
          />
        </div>

        <Divider />

        {/* 雕刻效果 */}
        <div style={{ marginBottom: 16 }}>
          <label>engraveType</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {renderEngraveTypeButton('vcut', 'V-Cut')}
            {renderEngraveTypeButton('frost', 'Frost')}
            {renderEngraveTypeButton('polish', 'Polish')}
          </div>
        </div>

        {/* 效果参数 */}
        {/* 效果参数 */}
        {/* 效果参数 */}
        {textProperties.engraveType === 'vcut' && (
          <div style={{ marginBottom: 16 }}>
            <label>V-Cut color</label>
            <div style={{ marginTop: 8 }}>
              {/* 常用颜色 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
                      width: 40,
                      height: 40,
                      backgroundColor: item.color,
                      color: item.color === '#000000' ? 'white' : 'black',
                      border: textProperties.vcutColor === item.color ?
                        '3px solid #1890ff' : // 选中时的边框
                        (item.color === '#FFFFFF' ? '1px solid #d9d9d9' : 'none'), // 未选中时的边框
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: textProperties.vcutColor === item.color ?
                        '0 0 0 2px #e6f7ff' : 'none' // 选中时的阴影效果
                    }}
                  >
                    {textProperties.vcutColor === item.color && (
                      <CheckOutlined style={{
                        color: item.color === '#000000' ? 'white' : 'black',
                        fontSize: 16
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
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </Button>
                </Popover>
              </div>

              {/* 当前颜色显示 */}
              {textProperties.vcutColor && !['#000000', '#FFFFFF', '#FFD700', '#FF0000'].includes(textProperties.vcutColor) && (
                <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>当前颜色:</span>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: textProperties.vcutColor,
                      border: '1px solid #d9d9d9'
                    }}
                  />
                  <span>{textProperties.vcutColor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {textProperties.engraveType === 'frost' && (
          <div style={{ marginBottom: 16 }}>
            <label>frostIntensity: {textProperties.frostIntensity}</label>
            <Slider
              min={0.1}
              max={1}
              step={0.1}
              value={textProperties.frostIntensity}
              onChange={(value) => handlePropertyChange('frostIntensity', value)}
            />
          </div>
        )}

        {textProperties.engraveType === 'polish' && (
          <div style={{ marginBottom: 16 }}>
            <label>polishBlend: {textProperties.polishBlend}</label>
            <Slider
              min={0.1}
              max={1}
              step={0.1}
              value={textProperties.polishBlend}
              onChange={(value) => handlePropertyChange('polishBlend', value)}
            />
          </div>
        )}

        {/* 操作按钮 */}
        {/* <Row gutter={8} style={{ width: '100%' }}>
          <Col span={12}>
            <Button
              type="primary"
              onClick={handleAddText}
              //disabled={!textProperties.content.trim()}
              style={{ width: '100%' }}
            >
              AddText
            </Button>
          </Col>
          <Col span={12}>
            <Button
              danger
              onClick={handleDeleteText}
              disabled={!currentTextId}
              style={{ width: '100%' }}
            >
              DeleteText
            </Button>
          </Col>
        </Row>
        */}

        {/* 3. 添加新的保存按钮 */}
        <Button
          onClick={handleSaveCurrentText}
          disabled={!currentTextId || !onSaveTextToOptions}
          icon={<SaveOutlined />}
          style={{ width: '100%', marginTop: '8px' }}
        >
          保存到素材库
        </Button>

      </Card>
    </div>
  );
};

export default TextEditor;