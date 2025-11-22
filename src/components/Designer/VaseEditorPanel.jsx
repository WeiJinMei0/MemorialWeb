import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { Card, Button, Space, Modal, Tooltip, App } from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  SwapOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const VaseEditorPanel = ({
  vase,
  onClose,
  onDelete,
  onDuplicate,
  onFlip,
}) => {
  const { modal } = App.useApp();
  const nodeRef = useRef(null);

  if (!vase) return null;

  const handleConfirmDelete = () => {
    modal.confirm({
      title: '确认删除花瓶?',
      content: `您确定要删除花瓶: ${vase.name || vase.id} 吗？`,
      okText: '删除',
      cancelText: '取消',
      onOk: () => onDelete(vase.id, 'vase'),
    });
  };

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
          title="编辑花瓶"
          extra={<Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
          bodyStyle={{ padding: '12px' }}
        >
          <Space direction="vertical" style={{ width: '100%', gap: '8px' }}>
            <Tooltip title="删除">
              <Button icon={<DeleteOutlined />} onClick={handleConfirmDelete} danger block />
            </Tooltip>
            <Tooltip title="复制">
              <Button icon={<CopyOutlined />} onClick={handleDuplicate} block />
            </Tooltip>
            <Tooltip title="左右翻转">
              <Button icon={<SwapOutlined />} onClick={handleMirror} block />
            </Tooltip>
            <Tooltip title="上下翻转">
              <Button icon={<SwapOutlined style={{ transform: 'rotate(90deg)' }} />} onClick={handleFlip} block />
            </Tooltip>
          </Space>
        </Card>
      </div>
    </Draggable>
  );
};

export default VaseEditorPanel;