import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Form, message, App } from 'antd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import OrderFormPDF from '../PDF/OrderFormPDF';
import arborLogo from '/Arbor White Logo.png';
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
  const [downloading, setDownloading] = useState(false);

  // 加载数据
  useEffect(() => {
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const userOrders = allOrders.filter(order => order.userId === user?.id);
    setOrders(userOrders.map(o => ({ ...o, key: o.orderNumber })));
    setLoading(false);
  }, [user]);

  // 打开编辑弹窗
  const handleViewDetails = (order) => {
    // 每次打开前先重置表单，避免上一个订单遗留的字段状态干扰本次显示
    form.resetFields();

    setCurrentOrder(order);

    // ✅ 表单与设计解耦：
    //  - 优先使用订单中保存的 designState（生成表单时的快照）
    //  - 如果没有，则只用一个“空设计状态”，不再从最新设计或 designCache 中补数据
    // 这样每个表单彼此独立，重新登录后也不会因为设计被删除/修改而出错
    let designState = order.designState;
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
    // OrderInfoModal 使用 orderNumber，EditableOrderForm 使用 contractNo
    let metaData = { ...order.meta };
    if (metaData.orderNumber && !metaData.contractNo) {
      metaData.contractNo = metaData.orderNumber;
    }

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
          // 同时保留 designState，确保设计数据不会丢失
          const newOrder = {
            ...o,
            meta: { ...o.meta, ...values }, // 合并新数据
            // ✅ 保留原先的 designState，不让其在编辑时被清除
            designState: currentDesignState || o.designState
          };
          setCurrentOrder(newOrder);
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

      pdf.save(`Order_${currentOrder.orderNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate order PDF:', error);
      message.error('Failed to generate PDF, please try again.');
    } finally {
      setDownloading(false);
    }
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
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={900}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setEditModalVisible(false)}>Close</Button>,
          <Button key="save" type="primary" onClick={handleSaveOrder}>Save Changes</Button>,
          <Button
            key="download"
            onClick={handleDownloadPdf}
            loading={downloading}
          >
            Download PDF
          </Button>,
        ]}
      >
        {currentOrder && (
          <EditableOrderForm
            // 使用订单号作为 key，确保切换不同订单时组件被重新挂载，避免内部状态串联
            key={currentOrder.orderNumber}
            form={form}
            initialData={currentOrder.meta}
            designState={currentDesignState}
            savedArtOptions={currentDesignState?.artElements || []}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderHistoryPage;