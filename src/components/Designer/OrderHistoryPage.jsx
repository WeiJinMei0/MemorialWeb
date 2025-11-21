import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Form, message } from 'antd';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderFormPDF from '../PDF/OrderFormPDF';
import EditableOrderForm from './Export/EditableOrderForm'; // 引入新组件
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './OrderHistoryPage.css';

const { Search } = Input;

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  // 编辑模态框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
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
    // 将订单中已有的 meta 数据（如果有的话）或者设计数据转换后填充
    // 注意：首次打开时，order.meta 可能只有简单的 contract#, cemetery 等
    // 我们会在 EditableOrderForm 内部做数据合并
    setPdfData(order); // 初始化 PDF 数据
    setEditModalVisible(true);
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

  const columns = [
    { title: 'Order #', dataIndex: 'orderNumber', key: 'orderNumber' },
    { title: 'Time', dataIndex: 'timestamp', render: ts => new Date(ts).toLocaleDateString() },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handleViewDetails(record)}>
          Edit / View Details
        </Button>
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
                  designState={currentOrder.design}
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
            designState={currentOrder.design}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderHistoryPage;