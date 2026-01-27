import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Form, message, App } from 'antd';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderFormPDF from '../PDF/OrderFormPDF';
import EditableOrderForm from './Export/EditableOrderForm'; // 引入新组件
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import designCache from '../../services/designCache';
import './OrderHistoryPage.css';

const { Search } = Input;

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { modal } = App.useApp();

  // 编辑模态框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [currentDesignState, setCurrentDesignState] = useState(null);
  const [form] = Form.useForm();
  // 用于保存当前的 PDF 数据（为了让 PDFDownloadLink 能够获取到最新的表单值）
  const [pdfData, setPdfData] = useState(null);

  // 加载数据
  useEffect(() => {
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const userOrders = allOrders.filter(order => order.userId === user?.id);
    setOrders(userOrders.map(o => ({ ...o, key: o.orderNumber })));
    setLoading(false);
  }, [user]);

  // 打开编辑弹窗
  const handleViewDetails = (order) => {
    setCurrentOrder(order);
    
    // 从 designCache 中获取关联的设计数据
    let designState = null;
    if (order.designId) {
      const designDetail = designCache.cache.detailMap[order.designId];
      if (designDetail) {
        designState = designDetail;
      }
    }
    setCurrentDesignState(designState);
    
    // 将订单中已有的 meta 数据进行字段映射
    // OrderInfoModal 使用 orderNumber，EditableOrderForm 使用 contractNo
    let metaData = { ...order.meta };
    if (metaData.orderNumber && !metaData.contractNo) {
      metaData.contractNo = metaData.orderNumber;
    }
    
    setPdfData(order); // 初始化 PDF 数据
    setEditModalVisible(true);
    
    // 填充表单初始数据
    form.setFieldsValue(metaData);
  };

  // 保存更改
  const handleSaveOrder = () => {
    form.validateFields().then(values => {
      const updatedOrders = orders.map(o => {
        if (o.orderNumber === currentOrder.orderNumber) {
          // 将表单的所有字段保存到 order.meta 中
          // 这样下次打开时就能看到修改后的数据
          const newOrder = {
            ...o,
            meta: { ...o.meta, ...values } // 合并新数据
          };
          setCurrentOrder(newOrder);
          setPdfData(newOrder); // 更新 PDF 数据源
          return newOrder;
        }
        return o;
      });

      setOrders(updatedOrders);
      // 更新 localStorage (注意：真实项目中应调用 API)
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const otherUsersOrders = allOrders.filter(o => o.userId !== user?.id);
      const finalOrders = [...otherUsersOrders, ...updatedOrders]; // 这里简化处理，只更新当前用户的
      localStorage.setItem('orders', JSON.stringify(finalOrders));

      message.success('Order updated successfully');
      setEditModalVisible(false);
    });
  };

  // 删除订单
  const handleDeleteOrder = (orderNumber) => {
    modal.confirm({
      title: 'Delete Order',
      content: 'Are you sure you want to delete this order? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        try {
          // 从 localStorage 中删除订单
          const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
          const filteredOrders = allOrders.filter(o => o.orderNumber !== orderNumber);
          localStorage.setItem('orders', JSON.stringify(filteredOrders));
          
          // 更新本地状态
          const updatedOrders = orders.filter(o => o.orderNumber !== orderNumber);
          setOrders(updatedOrders);
          
          message.success('Order deleted successfully');
        } catch (error) {
          console.error('Error deleting order:', error);
          message.error('Failed to delete order');
        }
      },
    });
  };

  const columns = [
    { 
      title: 'Order #', 
      dataIndex: 'orderNumber', 
      key: 'orderNumber',
      width: 200
    },
    { 
      title: 'Time', 
      dataIndex: 'timestamp', 
      key: 'timestamp',
      width: 150,
      render: ts => new Date(ts).toLocaleDateString() 
    },
    {
      title: 'CONTRACT NO.',
      key: 'contractNo',
      width: 200,
      render: (_, record) => {
        // 获取最新的 CONTRACT NO，从 meta.contractNo 或 meta.orderNumber
        const contractNo = record.meta?.contractNo || record.meta?.orderNumber || '-';
        return <span>{contractNo}</span>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="primary" size="small" onClick={() => handleViewDetails(record)}>
            Edit / View Details
          </Button>
          <Button danger size="small" onClick={() => handleDeleteOrder(record.orderNumber)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="order-history-page">
      <div className="page-header"><h1>Order History</h1></div>
      <Table dataSource={orders} columns={columns} loading={loading} />

      {/* 编辑/查看详情 弹窗 */}
      <Modal
        title={`Order Details: ${currentOrder?.orderNumber}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={900}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setEditModalVisible(false)}>Close</Button>,
          <Button key="save" type="primary" onClick={handleSaveOrder}>Save Changes</Button>,

          // 下载 PDF 按钮 (使用当前的 pdfData)
          currentOrder && (
            <PDFDownloadLink
              key="download"
              document={
                <OrderFormPDF
                  designState={currentDesignState}
                  // 将表单的最新数据传给 PDF
                  // 这里我们在点击 Save 时更新了 pdfData.meta
                  // 如果用户想不保存直接下载修改后的，需要监听 form 变化，这里简化为保存后下载
                  orderMeta={pdfData?.meta || {}}
                />
              }
              fileName={`Order_${currentOrder.orderNumber}.pdf`}
            >
              {({ loading }) => (
                <Button style={{ marginLeft: 8 }} loading={loading}>
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          )
        ]}
      >
        {currentOrder && (
          <EditableOrderForm
            form={form}
            initialData={currentOrder.meta}
            designState={currentDesignState}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderHistoryPage;