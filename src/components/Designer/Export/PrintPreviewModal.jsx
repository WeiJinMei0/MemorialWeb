import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import DesignPreviewTemplate from './DesignPreviewTemplate.jsx'; // 引入公共组件

const PrintPreviewModal = ({ visible, onCancel, designState, proofImage }) => {
  const [info, setInfo] = useState({
    contract: '(Pending)',
    cemetery: '',
    director: '',
    message: ''
  });

  // 处理输入变化
  const handleInfoChange = (field, value) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      title="Print Design Preview"
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="close" onClick={onCancel}>Close</Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
      ]}
      style={{ top: 20 }}
      wrapClassName="print-modal-wrapper"
    >
      <div id="print-area" className="print-content">
        {/* 复用模板，并传入 onChange 使其可编辑 */}
        <DesignPreviewTemplate
          designState={designState}
          proofImage={proofImage}
          orderInfo={info}
          onInfoChange={handleInfoChange}
        />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-modal-wrapper, .print-modal-wrapper * { visibility: visible; }
          .print-modal-wrapper { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
          #print-area { width: 100%; margin: 0; padding: 0; border: none !important; }
          .ant-input { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .ant-modal-footer, .ant-modal-close, .ant-modal-header { display: none; }
          .ant-modal-content { box-shadow: none !important; }
        }
      `}</style>
    </Modal>
  );
};

export default PrintPreviewModal;