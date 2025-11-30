import React, { useState } from 'react';
import { Modal, Form, Input, Row, Col, Button, Radio, Slider, message } from 'antd';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DownloadOutlined, MailOutlined } from '@ant-design/icons';
import OrderFormPDF from '../../PDF/OrderFormPDF.jsx';
import DesignPreviewTemplate from './DesignPreviewTemplate.jsx';

/**
 * OrderInfoModal 在“Email Design / Generate Order”之间切换。
 * proof 模式：展示预览 + 邮件字段；order 模式：生成下单 PDF。
 */
const OrderInfoModal = ({
                          visible,
                          onCancel,
                          designState,
                          proofImage,
                          type = 'proof',
                          onSubmit
                        }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [readyToDownload, setReadyToDownload] = useState(false);

  const [orientation, setOrientation] = useState('landscape');
  const [textOverlap, setTextOverlap] = useState(true);
  const [textScale, setTextScale] = useState(1.5);

  // 聚合所有表单字段，便于传入 PDF/预览，同时控制按钮可用状态
  const handleValuesChange = (_, allValues) => {
    setFormData(allValues);
    if (type === 'order') {
      setReadyToDownload(!!allValues.orderNumber);
    } else {
      setReadyToDownload(true);
    }
  };

  // 模拟发送邮件（真实环境替换为后端 API）
  const handleSendEmail = () => {
    form.validateFields().then(values => {
      const hide = message.loading('Sending email...', 0);
      setTimeout(() => {
        hide();
        message.success(`Email sent to ${values.recipientEmail || 'recipient'}`);
        onCancel();
      }, 1500);
    }).catch(() => {
      message.error('Please fill in the required email fields.');
    });
  };

  // 保留生成的 proofImage，用户可快速下载附在邮件中
  const handleDownloadImage = () => {
    if (proofImage) {
      const link = document.createElement('a');
      link.href = proofImage;
      link.download = `Design_Proof_${formData?.orderNumber || 'Draft'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      message.error("No image available to download");
    }
  };

  // 订单模式：要求 Contract # 必填后再回调上层
  const handleSubmitOrder = () => {
    form.validateFields().then(values => {
      if (onSubmit) {
        onSubmit(values);
      }
    }).catch(info => {
      message.error('Please fill in the required fields (Contract #)');
    });
  };

  const renderPDFButton = () => {
    if (type !== 'order') return null;
    return (
      <PDFDownloadLink
        document={<OrderFormPDF designState={designState} orderMeta={formData || {}} />}
        fileName={`Order_${formData?.orderNumber || 'Draft'}.pdf`}
      >
        {({ loading }) => (
          <Button type="primary" loading={loading} disabled={!readyToDownload}>
            {loading ? 'Generating...' : 'Download Order PDF'}
          </Button>
        )}
      </PDFDownloadLink>
    );
  };

  // --- 渲染 Email Design 界面 ---
  const renderEmailDesignContent = () => {
    const previewInfo = {
      contract: formData.orderNumber,
      cemetery: formData.cemetery,
      director: formData.director,
      message: formData.message
    };

    return (
      <div className="email-design-layout">
        {/* 调整高度为 750px，适应撑满的内容 */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', height: '750px' }}>

          {/* --- 左侧：预览 (撑满) --- */}
          <div style={{
            flex: 1,
            border: '1px solid #eee',
            background: 'white', // 白色背景
            overflowY: 'auto',   // 滚动
            overflowX: 'hidden',
            position: 'relative',
            borderRadius: '4px'
          }}>
            {/* 移除 transform: scale，宽度设为 100% */}
            <div style={{
              width: '100%',
              height: 'auto',
              background: 'transparent',
              pointerEvents: 'none'
            }}>
              <DesignPreviewTemplate
                designState={designState}
                proofImage={proofImage}
                orderInfo={previewInfo}
              />
            </div>
          </div>

          {/* --- 右侧：控制面板 --- */}
          <div style={{ width: '380px', overflowY: 'auto', paddingRight: '8px', flexShrink: 0 }}>
            <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
              <Form.Item name="orderNumber" label="Contract #" style={{ marginBottom: 12 }}>
                <Input placeholder="Enter Contract Number" />
              </Form.Item>
              <Form.Item name="cemetery" label="Cemetery Name & Lot Location" style={{ marginBottom: 12 }}>
                <Input placeholder="Enter Cemetery Info" />
              </Form.Item>
              <Form.Item name="director" label="Director Name" style={{ marginBottom: 12 }}>
                <Input placeholder="Enter Director Name" />
              </Form.Item>
              <Form.Item name="message" label="Message" style={{ marginBottom: 24 }}>
                <Input.TextArea rows={3} placeholder="Enter Notes" style={{ resize: 'none' }} />
              </Form.Item>
            </Form>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
              <span style={{fontSize: '13px', color: '#666'}}>Orientation</span>
              <Radio.Group value={orientation} onChange={e => setOrientation(e.target.value)} buttonStyle="solid" size="small">
                <Radio.Button value="landscape">Landscape</Radio.Button>
                <Radio.Button value="portrait">Portrait</Radio.Button>
              </Radio.Group>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
              <span style={{fontSize: '13px', color: '#666'}}>Text Overlap</span>
              <Radio.Group value={textOverlap} onChange={e => setTextOverlap(e.target.value)} buttonStyle="solid" size="small">
                <Radio.Button value={true}>On</Radio.Button>
                <Radio.Button value={false}>Off</Radio.Button>
              </Radio.Group>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ width: '90px', fontSize: '13px', color: '#666' }}>Text Scale: {textScale}</span>
              <Slider min={0.5} max={3} step={0.1} value={textScale} onChange={setTextScale} style={{ flex: 1 }} />
            </div>
          </div>
        </div>

        {/* 下半部分：邮件字段 */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="recipientName" label="Recipient's Name" style={{ marginBottom: 12 }}><Input placeholder="Enter Recipient Name" /></Form.Item></Col>
              <Col span={12}><Form.Item name="recipientEmail" label="Recipient's Email" style={{ marginBottom: 12 }} rules={[{ type: 'email', message: 'Invalid email' }]}><Input placeholder="Enter Recipient Email" prefix={<MailOutlined style={{color:'#ccc'}}/>} /></Form.Item></Col>
              <Col span={12}><Form.Item name="senderName" label="Your Name" style={{ marginBottom: 12 }}><Input placeholder="Enter Your Name" /></Form.Item></Col>
              <Col span={12}><Form.Item name="senderEmail" label="Your Email" style={{ marginBottom: 12 }} rules={[{ type: 'email', message: 'Invalid email' }]}><Input placeholder="Enter Your Email" prefix={<MailOutlined style={{color:'#ccc'}}/>} /></Form.Item></Col>
              <Col span={24}><Form.Item name="emailBody" label="Message" style={{ marginBottom: 12 }}><Input.TextArea rows={3} placeholder="Email body..." /></Form.Item></Col>
            </Row>
          </Form>
        </div>
      </div>
    );
  };

  const renderOrderFormContent = () => (
    <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="orderNumber" label="Contract #" rules={[{ required: true }]}><Input placeholder="e.g. 0631-0033096" /></Form.Item></Col>
        <Col span={12}><Form.Item name="cemetery" label="Cemetery Location"><Input placeholder="Cemetery Name & Lot" /></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="director" label="Director Name"><Input /></Form.Item></Col>
        <Col span={6}><Form.Item name="lot" label="Lot"><Input /></Form.Item></Col>
        <Col span={6}><Form.Item name="space" label="Space"><Input /></Form.Item></Col>
      </Row>
      <Form.Item name="message" label="Special Instructions / Notes"><Input.TextArea rows={4} /></Form.Item>
    </Form>
  );

  const isEmailMode = type === 'proof';
  const modalTitle = isEmailMode ? "Email Design" : "Generate Order";

  // 根据模式切换 footer：邮件模式按钮较多，订单模式遵循 antd 风格
  const modalFooter = isEmailMode ? (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '10px 0' }}>
      <Button type="primary" icon={<MailOutlined />} style={{ backgroundColor: '#555', borderColor: '#555', minWidth: '120px' }} onClick={handleSendEmail}>Send Email</Button>
      <Button type="primary" icon={<DownloadOutlined />} style={{ backgroundColor: '#555', borderColor: '#555', minWidth: '140px' }} onClick={handleDownloadImage}>Download Image</Button>
      <Button onClick={onCancel} style={{ minWidth: '80px' }}>Close</Button>
    </div>
  ) : (
    [
      <Button key="cancel" onClick={onCancel}>Cancel</Button>,
      <Button key="submit" type="primary" onClick={handleSubmitOrder}>Submit Order</Button>
    ]
  );

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onCancel}
      footer={modalFooter}
      width={isEmailMode ? 1400 : 700} // 宽度加宽到 1400
      style={{ top: 20 }}
      destroyOnClose
    >
      {isEmailMode ? renderEmailDesignContent() : renderOrderFormContent()}
    </Modal>
  );
};

export default OrderInfoModal;