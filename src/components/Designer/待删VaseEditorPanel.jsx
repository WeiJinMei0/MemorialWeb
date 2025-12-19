import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { Card, Button, Space, Modal, Tooltip, App } from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  SwapOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import { useTranslation } from 'react-i18next'

const VaseEditorPanel = ({
  vase,
  onClose,
  onDelete,
  onDuplicate,
  onFlip,
}) => {
  const { modal } = App.useApp();
  const { t } = useTranslation()
  const nodeRef = useRef(null);

  if (!vase) return null;

  const handleDelete = () => {
      onDelete(vase.id, 'vase');
      onClose();
  }

  const handleDuplicate = () => {
    onDuplicate(vase.id, 'vase');
    onClose();
  };

  const handleMirror = () => {
    onFlip(vase.id, 'x', 'vase');
    onClose();
  };

  const handleFlip = () => {
    onFlip(vase.id, 'y', 'vase');
    onClose();
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".ant-card-head"
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className="tool-panel vase-editor-panel"
        style={{
          width: 200,
          position: 'absolute',
          zIndex: 1000,
          top: '100px',
          right: '100px',
        }}
      >
        <Card
          title={t('vaseEditor.title')}
          extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
          bodyStyle={{ padding: '12px' }}
        >
          <Space direction="vertical" style={{ width: '100%', gap: '8px' }}>
            <Tooltip title={t('vaseEditor.delete')}>
              <Button icon={<DeleteOutlined />} onClick={handleDelete} danger block />
            </Tooltip>
            <Tooltip title={t('vaseEditor.duplicate')}>
              <Button icon={<CopyOutlined />} onClick={handleDuplicate} block />
            </Tooltip>
            <Tooltip title={t('vaseEditor.mirror')}>
              <Button icon={<SwapOutlined />} onClick={handleMirror} block />
            </Tooltip>
            <Tooltip title={t('vaseEditor.flip')}>
              <Button icon={<SwapOutlined style={{ transform: 'rotate(90deg)' }} />} onClick={handleFlip} block />
            </Tooltip>
          </Space>
        </Card>
      </div>
    </Draggable>
  );
};

export default VaseEditorPanel;