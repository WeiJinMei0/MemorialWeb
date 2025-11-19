import React, { useState } from 'react';
import { Modal, Form, Input, Row, Col, Button, Radio, Slider, message } from 'antd';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DownloadOutlined, MailOutlined } from '@ant-design/icons';
import OrderFormPDF from '../../PDF/OrderFormPDF.jsx';
import DesignPreviewTemplate from './DesignPreviewTemplate.jsx'; // 确保已创建并引入此组件

const OrderInfoModal = ({
                          visible,
                          onCancel,
                          designState,
                          proofImage,
                          type = 'proof' // 'proof' (Email/Download) | 'order' (Generate Order)
                        }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});
  const [readyToDownload, setReadyToDownload] = useState(false);

  // UI Controls State (仅用于 UI 展示，目前未绑定到底层渲染逻辑)
  const [orientation, setOrientation] = useState('landscape');
  const [textOverlap, setTextOverlap] = useState(true);
  const [textScale, setTextScale] = useState(1.5);

  // 监听表单变化，实时更新数据以供预览和 PDF 生成使用
  const handleValuesChange = (_, allValues) => {
    setFormData(allValues);
    if (type === 'order') {
      setReadyToDownload(!!allValues.orderNumber);
    } else {
      setReadyToDownload(true);
    }
  };

  // 模拟发送邮件
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

  // 下载当前截图 (Download Image)
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

  // 渲染 PDF 下载按钮 (仅 Generate Order 模式)
  const renderPDFButton = () => {
    if (type !== 'order') return null;

    return (
      <PDFDownloadLink
        document={
          <OrderFormPDF
            designState={designState}
            orderMeta={formData || {}}
          />
        }
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

  // --- 渲染 Email Design 界面 (左侧引用模板) ---
  const renderEmailDesignContent = () => {
    // 构造传递给模板的数据对象
    const previewInfo = {
      contract: formData.orderNumber,
      cemetery: formData.cemetery,
      director: formData.director,
      message: formData.message
    };

    return (
      <div className="email-design-layout">
        {/* 上半部分：左右分栏 */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', height: '520px' }}>

          {/* --- 左侧：完整单据预览 (使用模板组件 + 缩放) --- */}
          <div style={{
            flex: 1,
            border: '1px solid #d9d9d9',
            background: '#f0f2f5', // 灰色背景衬托白纸
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '4px'
          }}>
            {/* 缩放容器 */}
            <div style={{
              transform: 'scale(0.55)', // 缩放比例，根据容器大小调整
              transformOrigin: 'top left',
              width: '181%', // 1 / 0.55 ≈ 1.81，确保内容宽度撑满缩放后的容器
              height: '181%', // 高度同理
              background: 'white',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none' // 禁止在预览图上交互，只能通过右侧表单修改
            }}>
              <DesignPreviewTemplate
                designState={designState}
                proofImage={proofImage}
                orderInfo={previewInfo}
                // 不传入 onInfoChange，使模板处于只读/预览模式
              />
            </div>
          </div>

          {/* --- 右侧：控制面板 --- */}
          <div style={{ width: '360px', overflowY: 'auto', paddingRight: '8px' }}>
            <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
              <Form.Item name="orderNumber" label="Contract #" style={{ marginBottom: 12 }}>
                <Input placeholder="输入订单号码" />
              </Form.Item>
              <Form.Item name="cemetery" label="Cemetery Name & Lot Location" style={{ marginBottom: 12 }}>
                <Input placeholder="输入陵园" />
              </Form.Item>
              <Form.Item name="director" label="Director Name" style={{ marginBottom: 12 }}>
                <Input placeholder="输入负责人名字" />
              </Form.Item>
              <Form.Item name="message" label="Message" style={{ marginBottom: 24 }}>
                <Input.TextArea rows={3} placeholder="输入订单信息说明" style={{ resize: 'none' }} />
              </Form.Item>
            </Form>

            {/* 视图控制选项 */}
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
              <Slider
                min={0.5} max={3} step={0.1}
                value={textScale}
                onChange={setTextScale}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* 下半部分：邮件字段 */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="recipientName" label="Recipient's Name" style={{ marginBottom: 12 }}>
                  <Input placeholder="输入负责人名字" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="recipientEmail"
                  label="Recipient's Email Address"
                  style={{ marginBottom: 12 }}
                  rules={[{ type: 'email', message: 'Invalid email format' }]}
                >
                  <Input placeholder="输入负责人邮箱" prefix={<MailOutlined style={{color:'#ccc'}}/>} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="senderName" label="Your Name" style={{ marginBottom: 12 }}>
                  <Input placeholder="输入收件人名字" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="senderEmail"
                  label="Your Email Address"
                  style={{ marginBottom: 12 }}
                  rules={[{ type: 'email', message: 'Invalid email format' }]}
                >
                  <Input placeholder="输入收件人邮箱" prefix={<MailOutlined style={{color:'#ccc'}}/>} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="emailBody" label="Message" style={{ marginBottom: 12 }}>
                  <Input.TextArea rows={3} placeholder="邮件正文内容..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    );
  };

  // --- 渲染 Generate Order 界面 (简洁表单) ---
  const renderOrderFormContent = () => (
    <Form layout="vertical" form={form} onValuesChange={handleValuesChange}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="orderNumber" label="Contract # (订单号)" rules={[{ required: true }]}>
            <Input placeholder="e.g. 0631-0033096" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="cemetery" label="Cemetery Location (陵园)">
            <Input placeholder="Cemetery Name & Lot" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="director" label="Director Name (负责人)">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="lot" label="Lot">
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="space" label="Space">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="message" label="Special Instructions / Notes">
        <Input.TextArea rows={4} />
      </Form.Item>
    </Form>
  );

  // 根据类型判断模式
  const isEmailMode = type === 'proof';
  const modalTitle = isEmailMode ? "Email Design" : "Generate Order Form";

  // 自定义底部按钮
  const modalFooter = isEmailMode ? (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '10px 0' }}>
      {/* Send Email 按钮 */}
      <Button
        type="primary"
        icon={<MailOutlined />}
        style={{ backgroundColor: '#555', borderColor: '#555', minWidth: '120px' }}
        onClick={handleSendEmail}
      >
        Send Email
      </Button>

      {/* Download Image 按钮 */}
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        style={{ backgroundColor: '#555', borderColor: '#555', minWidth: '140px' }}
        onClick={handleDownloadImage}
      >
        Download Image
      </Button>

      {/* Close 按钮 */}
      <Button onClick={onCancel} style={{ minWidth: '80px' }}>Close</Button>
    </div>
  ) : (
    [
      <Button key="back" onClick={onCancel}>Close</Button>,
      <span key="download" style={{ marginLeft: 8 }}>{renderPDFButton()}</span>
    ]
  );

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onCancel}
      footer={modalFooter}
      width={isEmailMode ? 1100 : 700} // Email 模式更宽
      style={{ top: 20 }}
      destroyOnClose // 关闭后销毁，确保状态重置
    >
      {isEmailMode ? renderEmailDesignContent() : renderOrderFormContent()}
    </Modal>
  );
};

export default OrderInfoModal;