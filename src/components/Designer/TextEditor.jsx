import React, { useState } from 'react'
import { Form, Input, Button, Select, Slider, InputNumber, Radio, Space, Divider } from 'antd'
import { FontColorsOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined } from '@ant-design/icons'
import './TextEditor.css'

const { TextArea } = Input
const { Option } = Select

const TextEditor = ({ onAddText }) => {
  const [form] = Form.useForm()
  const [textProperties, setTextProperties] = useState({
    content: 'Sample Text',
    font: 'Arial',
    size: 16,
    color: '#000000',
    alignment: 'left',
    lineSpacing: 1.2,
    kerning: 0,
   雕刻方式: 'engraved'
  })

  const fontOptions = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Roboto',
    'Open Sans',
    'Roman',
    'Gothic',
    'Script'
  ]

  const handleFormChange = (changedValues, allValues) => {
    setTextProperties(prev => ({
      ...prev,
      ...changedValues
    }))
  }

  const handleAddText = () => {
    onAddText(textProperties)
    form.resetFields()
    setTextProperties({
      content: 'Sample Text',
      font: 'Arial',
      size: 16,
      color: '#000000',
      alignment: 'left',
      lineSpacing: 1.2,
      kerning: 0,
     雕刻方式: 'engraved'
    })
  }

  const alignmentOptions = [
    { value: 'left', icon: <AlignLeftOutlined />, label: 'Left' },
    { value: 'center', icon: <AlignCenterOutlined />, label: 'Center' },
    { value: 'right', icon: <AlignRightOutlined />, label: 'Right' }
  ]

  return (
    <div className="text-editor">
      <div className="text-editor-header">
        <h3>
          <FontColorsOutlined /> Text Editor
        </h3>
        <p>Add and customize text for your monument</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={textProperties}
        className="text-form"
      >
        <Form.Item
          name="content"
          label="Text Content"
          rules={[{ required: true, message: 'Please enter text content' }]}
        >
          <TextArea
            rows={3}
            placeholder="Enter your text here..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <div className="form-row">
          <Form.Item
            name="font"
            label="Font Family"
            className="form-half"
          >
            <Select placeholder="Select font">
              {fontOptions.map(font => (
                <Option key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font}</span>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="size"
            label="Font Size"
            className="form-half"
          >
            <InputNumber
              min={8}
              max={72}
              placeholder="Size"
              addonAfter="pt"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="color"
          label="Text Color"
        >
          <Input type="color" style={{ width: '100%', height: '40px' }} />
        </Form.Item>

        <Form.Item
          name="alignment"
          label="Text Alignment"
        >
          <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
            {alignmentOptions.map(option => (
              <Radio.Button key={option.value} value={option.value} style={{ flex: 1, textAlign: 'center' }}>
                {option.icon} {option.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Divider orientation="left" plain>Advanced Settings</Divider>

        <div className="form-row">
          <Form.Item
            name="lineSpacing"
            label="Line Spacing"
            className="form-half"
          >
            <Slider
              min={0.8}
              max={3}
              step={0.1}
              value={textProperties.lineSpacing}
              onChange={value => handleFormChange({ lineSpacing: value })}
              marks={{
                0.8: '0.8',
                1.5: '1.5',
                2.2: '2.2',
                3: '3.0'
              }}
            />
          </Form.Item>

          <Form.Item
            name="kerning"
            label="Letter Spacing"
            className="form-half"
          >
            <InputNumber
              min={-5}
              max={20}
              placeholder="Spacing"
              addonAfter="px"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="雕刻方式"
          label="Engraving Style"
        >
          <Select placeholder="Select engraving style">
            <Option value="engraved">Engraved</Option>
            <Option value="raised">Raised</Option>
            <Option value="sandblasted">Sandblasted</Option>
            <Option value="etched">Etched</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleAddText}
            block
            size="large"
          >
            Add Text to Monument
          </Button>
        </Form.Item>
      </Form>

      <div className="text-preview">
        <h4>Preview</h4>
        <div 
          className="preview-content"
          style={{
            fontFamily: textProperties.font,
            fontSize: `${textProperties.size}px`,
            color: textProperties.color,
            textAlign: textProperties.alignment,
            lineHeight: textProperties.lineSpacing,
            letterSpacing: `${textProperties.kerning}px`,
            padding: '16px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            background: '#fafafa',
            minHeight: '80px'
          }}
        >
          {textProperties.content || 'Text preview will appear here...'}
        </div>
      </div>
    </div>
  )
}

export default TextEditor