import React, { useState } from 'react';
import { Modal, Button, Form, Input, Radio, Slider, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import DesignPreviewTemplate from './DesignPreviewTemplate';

const PrintPreviewModal = ({ visible, onCancel, designState, proofImage }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});

  const [orientation, setOrientation] = useState('landscape');
  const [textOverlap, setTextOverlap] = useState(true);
  const [textScale, setTextScale] = useState(1.5);

  const handleValuesChange = (_, allValues) => {
    setFormData(allValues);
  };

  const handlePrint = () => {
    window.print();
  };

  const previewInfo = {
    contract: formData.orderNumber,
    cemetery: formData.cemetery,
    director: formData.director,
    message: formData.message
  };

  return (
    <Modal
      title="Print Design Preview"
      open={visible}
      onCancel={onCancel}
      width={1400}
      footer={[
        <Button key="close" onClick={onCancel}>Close</Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
      ]}
      style={{ top: 20 }}
      destroyOnClose
      wrapClassName="print-modal-wrapper"
    >
      <div className="print-design-layout" style={{ display: 'flex', gap: '24px', height: '800px' }}>

        {/* --- 左侧：预览区域 --- */}
        <div style={{
          flex: 1,
          border: '1px solid #eee',
          background: 'white',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          borderRadius: '4px',
          display: 'block'
        }}>
          <div id="print-content-area" style={{
            width: '100%',
            height: 'auto',
            padding: '0'
          }}>
            {/* 预览时的容器 */}
            <div className="preview-paper" style={{ width: '100%', minHeight: '100%', background: 'white' }}>
              <DesignPreviewTemplate
                designState={designState}
                proofImage={proofImage}
                orderInfo={previewInfo}
              />
            </div>
          </div>
        </div>

        {/* --- 右侧：输入表单 (保持不变) --- */}
        <div className="no-print" style={{ width: '380px', overflowY: 'auto', paddingRight: '8px', flexShrink: 0 }}>
          <Form
            layout="vertical"
            form={form}
            onValuesChange={handleValuesChange}
            initialValues={{
              textScale: 1.5,
              textOverlap: true,
              orientation: 'landscape'
            }}
          >
            <div style={{ marginBottom: '16px', fontWeight: 'bold', color: '#1890ff', fontSize: '16px' }}>
              Basic Info
            </div>
            <Form.Item name="orderNumber" label="Contract #"><Input placeholder="Enter Contract Number" /></Form.Item>
            <Form.Item name="cemetery" label="Cemetery Name & Lot Location"><Input placeholder="Enter Cemetery Info" /></Form.Item>
            <Form.Item name="director" label="Director Name"><Input placeholder="Enter Director Name" /></Form.Item>
            <Form.Item name="message" label="Message"><Input.TextArea rows={3} placeholder="Enter Notes" /></Form.Item>
            <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
              <Form.Item label="Orientation" style={{ marginBottom: 12 }}>
                <Radio.Group value={orientation} onChange={e => setOrientation(e.target.value)} buttonStyle="solid" size="small">
                  <Radio.Button value="landscape">Landscape</Radio.Button>
                  <Radio.Button value="portrait">Portrait</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Text Overlap" style={{ marginBottom: 12 }}>
                <Radio.Group value={textOverlap} onChange={e => setTextOverlap(e.target.value)} buttonStyle="solid" size="small">
                  <Radio.Button value={true}>On</Radio.Button>
                  <Radio.Button value={false}>Off</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item label={`Text Scale: ${textScale}`}>
                <Slider min={0.5} max={3} step={0.1} value={textScale} onChange={setTextScale} />
              </Form.Item>
            </div>
          </Form>
        </div>
      </div>

      {/* 打印样式优化 */}
      <style>{`
        @media print {
          @page {
            size: auto; 
            margin: 0mm; 
          }

          body * {
            visibility: hidden;
          }

          /* 隐藏右侧控制栏和模态框外壳 */
          .ant-modal-header, .ant-modal-footer, .ant-modal-close, .no-print {
            display: none !important;
          }

          /* 选中并显示打印区域 */
          .print-modal-wrapper, 
          .print-modal-wrapper .ant-modal, 
          .print-modal-wrapper .ant-modal-content,
          .print-modal-wrapper .ant-modal-body,
          #print-content-area, 
          #print-content-area * {
            visibility: visible;
          }

          /* 【关键修复】：使用 Flexbox 实现打印居中 */
          #print-content-area {
            position: fixed !important; /* 脱离文档流，覆盖全屏 */
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important; /* 视口宽度 */
            height: 100vh !important; /* 视口高度 */
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 9999;
            
            /* 居中对齐 */
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important; /* 顶部对齐，防止长内容被切 */
          }

          /* 限制纸张最大宽度为 A4，并确保它在 Flex 容器中居中 */
          .preview-paper {
            width: 210mm !important;
            max-width: 100% !important;
            box-shadow: none !important;
            margin: 0 auto !important; /* 水平居中保险 */
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default PrintPreviewModal;