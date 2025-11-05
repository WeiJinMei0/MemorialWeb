import React, { useState, useCallback, useEffect } from 'react';
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
  Card
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './TextEditor.css'

const TextEditor = ({
                      onAddText,
                      onUpdateText,
                      onDeleteText,
                      currentTextId,
                      existingTexts,
                      monuments,
                      isEditing,
                      fontOptions
                    }) => {
  const { t } = useTranslation();
  const [textProperties, setTextProperties] = useState({
    content: '',
    font: 'helvetiker_regular.typeface',
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
    if (!textProperties.content.trim()) {
      message.error('请输入文字内容');
      return;
    }

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

  return (
    <div className="text-editor-panel">
      <Card size="small" title="TestEditor" style={{ width: '100%' }}>
        {/* 文字内容 */}
        <div style={{ marginBottom: 16 }}>
          <label>textcontent</label>
          <Input.TextArea
            value={textProperties.content}
            onChange={(e) => handlePropertyChange('content', e.target.value)}
            placeholder="输入文字内容"
            rows={3}
          />
        </div>

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
                  <span style={{ fontFamily: font.cssFamily || 'inherit' }}>
                    {font.name}
                  </span>
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
            min={0}
            max={100}
            value={textProperties.curveAmount}
            onChange={(value) => handlePropertyChange('curveAmount', value)}
          />
        </div>

        <Divider />

        {/* 雕刻效果 */}
        <div style={{ marginBottom: 16 }}>
          <label>engraveType</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {renderEngraveTypeButton('vcut', 'V-Cut')}
            {renderEngraveTypeButton('frost', 'Frost')}
            {renderEngraveTypeButton('polish', 'Polish')}
          </div>
        </div>

        {/* 效果参数 */}
        {textProperties.engraveType === 'vcut' && (
          <div style={{ marginBottom: 16 }}>
            <label>V-Cut color</label>
            <ColorPicker
              value={textProperties.vcutColor}
              onChange={(color) => handlePropertyChange('vcutColor', color.toHexString())}
            />
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
<Row gutter={8} style={{ width: '100%' }}>
  <Col span={12}>
    <Button
      type="primary"
      onClick={handleAddText}
      disabled={!textProperties.content.trim()}
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
      </Card>
    </div>
  );
};

export default TextEditor;