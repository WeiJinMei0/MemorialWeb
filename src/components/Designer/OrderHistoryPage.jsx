import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Form, message, App, Spin } from 'antd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import OrderFormPDF from '../PDF/OrderFormPDF';
import arborLogo from '/Arbor White Logo.png';
import EditableOrderForm from './Export/EditableOrderForm'; // 引入新组件
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import orderService from '../../services/orderService'; // 订单服务
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
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 从后端加载订单列表（列表接口不返回 data 字段以避免内存溢出）
  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.list({ page: 1, pageSize: 100 });
      // 后端返回格式: { code: 200, message: 'success', data: { items: [...], total: ... } }
      if (response && response.data && response.data.items) {
        // 将后端数据映射为前端格式（注意：列表不包含 data 字段）
        const mappedOrders = response.data.items.map(order => {
          // 订单号：自动生成的 ORD-xxx，如果 meta 中没有则使用 ID 生成
          const orderNumber = order.meta?.orderNumber || `ORD-${order.id}`;
          return {
            id: order.id,
            key: order.id,
            orderNumber: orderNumber,  // 自动生成的订单号
            timestamp: order.createdAt,
            designId: order.designId,
            status: order.status,
            meta: order.meta || {},
            totalPrice: order.totalPrice
          };
        });
        setOrders(mappedOrders);
      } else {
        console.warn('Unexpected response format:', response);
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      message.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载数据
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  // 打开编辑弹窗 - 需要先从后端获取完整订单数据（包含设计快照）
  const handleViewDetails = async (order) => {
    // 每次打开前先重置表单和状态
    form.resetFields();
    setCurrentOrder(null);
    setCurrentDesignState(null);
    setDetailLoading(true);
    setEditModalVisible(true);

    try {
      // 从后端获取完整的订单详情（包含 data 字段）
      const response = await orderService.getDetail(order.id);
      
      // 后端返回格式: { code: 200, message: 'success', data: { id, userId, designId, data, meta, ... } }
      if (response && response.data) {
        const orderData = response.data;
        const fullOrder = {
          ...order,
          data: orderData.data,
          designName: orderData.data?.designName,
          designState: orderData.data?.designState
        };
        
        setCurrentOrder(fullOrder);

        // ✅ 表单与设计解耦：
        //  - 优先使用订单中保存的 designState（生成表单时的快照）
        //  - 如果没有，则只用一个"空设计状态"
        let designState = fullOrder.designState;
        if (!designState) {
          designState = {
            monuments: [],
            bases: [],
            subBases: [],
            vases: [],
            artElements: [],
            textElements: [],
            currentMaterial: null,
          };
        }
        setCurrentDesignState(designState);

        // 将订单中已有的 meta 数据进行字段映射
        // 兼容旧数据：如果只有 orderNumber 没有 contractNo，则将 orderNumber 作为 contractNo
        let metaData = { ...orderData.meta };
        if (metaData.orderNumber && !metaData.contractNo) {
          // 旧数据兼容：如果 orderNumber 看起来像合同号（不是 ORD- 开头），则作为 contractNo
          if (!metaData.orderNumber.startsWith('ORD-')) {
            metaData.contractNo = metaData.orderNumber;
          }
        }

        // 填充表单初始数据
        form.setFieldsValue(metaData);
      } else {
        throw new Error('Failed to load order details: invalid response format');
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
      message.error('Failed to load order details');
      setEditModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 保存更改 - 使用后端 API
  const handleSaveOrder = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 调用后端 API 更新订单
      const updateData = {
        meta: { ...currentOrder.meta, ...values }
      };

      const response = await orderService.update(currentOrder.id, updateData);

      // 后端返回格式: { code: 200, message: 'success', data: {...} }
      if (response && response.data) {
        // 更新本地状态
        const updatedOrders = orders.map(o => {
          if (o.id === currentOrder.id) {
            const newOrder = {
              ...o,
              meta: { ...o.meta, ...values },
              designState: currentDesignState || o.designState
            };
            setCurrentOrder(newOrder);
            return newOrder;
          }
          return o;
        });
        setOrders(updatedOrders);

        message.success('Order updated successfully');
        setEditModalVisible(false);
      } else {
        throw new Error(response?.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Failed to save order:', error);
      message.error(error.message || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  // 下载当前表单为美化后的 PDF
  const handleDownloadPdf = async () => {
    if (!currentOrder) return;
    try {
      setDownloading(true);

      // 直接把当前可见的 EditableOrderForm DOM 截图成图片，再嵌入 PDF 中，确保视觉效果与表单一致
      const formElement = document.querySelector('.editable-order-form-container');
      if (!formElement) {
        message.error('无法找到表单内容，稍后再试。');
        setDownloading(false);
        return;
      }

      // 提高 scale 以获得更清晰的 PDF
      // 关闭 useCORS 并允许 taint，以确保本地 /Arbor White Logo.png 能被正确渲染到截图中
      const canvas = await html2canvas(formElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: false,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);

      // 在 A4 内按比例缩放整张表单，确保只渲染一次
      const margin = 10; // 上下左右留白
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
      const renderWidth = imgProps.width * ratio;
      const renderHeight = imgProps.height * ratio;

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);

      // 额外在左上角叠加一次 Arbor logo，保证 PDF 中一定可见
      try {
        const logoImg = new Image();
        logoImg.src = arborLogo;
        await logoImg.decode();
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoImg.width;
        logoCanvas.height = logoImg.height;
        const logoCtx = logoCanvas.getContext('2d');
        logoCtx.drawImage(logoImg, 0, 0);
        const logoDataUrl = logoCanvas.toDataURL('image/png');

        const logoWidth = 25; // mm
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        pdf.addImage(logoDataUrl, 'PNG', margin, margin, logoWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to draw Arbor logo on PDF:', e);
      }

      // 使用合同号作为文件名，如果没有则使用订单号
      const fileName = currentOrder.meta?.contractNo || currentOrder.orderNumber;
      pdf.save(`Order_${fileName}.pdf`);
    } catch (error) {
      console.error('Failed to generate order PDF:', error);
      message.error('Failed to generate PDF, please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // 删除订单 - 使用后端 API
  const handleDeleteOrder = (orderId) => {
    modal.confirm({
      title: 'Delete Order',
      content: 'Are you sure you want to delete this order? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // 调用后端 API 删除订单
          const response = await orderService.delete(orderId);
          
          // 后端返回格式: { code: 200, message: 'Deleted' } 或 { code: 200, message: 'success', data: null }
          if (response && (response.message === 'Deleted' || response.code === 200)) {
            // 更新本地状态
            const updatedOrders = orders.filter(o => o.id !== orderId);
            setOrders(updatedOrders);
            
            message.success('Order deleted successfully');
          } else {
            throw new Error(response?.message || 'Failed to delete order');
          }
        } catch (error) {
          console.error('Error deleting order:', error);
          message.error(error.message || 'Failed to delete order');
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
          <Button danger size="small" onClick={() => handleDeleteOrder(record.id)}>
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
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={900}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setEditModalVisible(false)}>Close</Button>,
          <Button key="save" type="primary" onClick={handleSaveOrder} loading={saving} disabled={detailLoading}>Save Changes</Button>,
          <Button
            key="download"
            onClick={handleDownloadPdf}
            loading={downloading}
            disabled={detailLoading}
          >
            Download PDF
          </Button>,
        ]}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" tip="Loading order details..." />
          </div>
        ) : currentOrder ? (
          <EditableOrderForm
            // 使用订单号作为 key，确保切换不同订单时组件被重新挂载，避免内部状态串联
            key={currentOrder.orderNumber}
            form={form}
            initialData={currentOrder.meta}
            designState={currentDesignState}
            savedArtOptions={currentDesignState?.artElements || []}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default OrderHistoryPage;
