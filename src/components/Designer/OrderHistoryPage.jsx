import React, { useState, useEffect } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Descriptions } from 'antd';
import { PDFDownloadLink } from '@react-pdf/renderer'; // 1. 引入 PDF 下载组件
import OrderFormPDF from '../PDF/OrderFormPDF'; // 2. 引入 PDF 模板
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './OrderHistoryPage.css';

const { Search } = Input;

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  // 加载订单数据
  useEffect(() => {
    setTimeout(() => {
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      // 过滤当前用户的订单
      const userOrders = allOrders.filter(order => order.userId === user?.id);
      // 添加 key 用于 Antd Table
      const ordersWithKeys = userOrders.map(o => ({ ...o, key: o.orderNumber }));

      // 按时间倒序排列
      ordersWithKeys.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setOrders(ordersWithKeys);
      setFilteredOrders(ordersWithKeys);
      setLoading(false);
    }, 500);
  }, [user]);

  const handleSearch = (value) => {
    const filtered = orders.filter(order =>
      order.orderNumber.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  const showDetailModal = (order) => {
    setCurrentOrder(order);
    setIsDetailModalVisible(true);
  };

  // 辅助函数：格式化尺寸显示
  const formatDimensions = (dims) => {
    if (!dims) return "N/A";
    // 兼容处理：如果 dimensions 是 {length, width, height} 对象
    const L = (dims.length || 0).toFixed(1);
    const W = (dims.width || 0).toFixed(1);
    const H = (dims.height || 0).toFixed(1);
    return `${L}" x ${W}" x ${H}"`;
  };

  // 表格列定义
  const columns = [
    {
      title: t('orderHistory.columnOrderNumber'),
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: text => <strong>{text}</strong>,
    },
    {
      title: t('orderHistory.columnProof'),
      dataIndex: 'thumbnail', // 使用 thumbnail 字段
      key: 'thumbnail',
      render: url => <Image width={80} src={url || '/images/placeholder.png'} />,
    },
    {
      title: t('orderHistory.columnOrderTime'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: ts => new Date(ts).toLocaleString(),
      sorter: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    },
    {
      title: t('orderHistory.columnStatus'),
      key: 'status',
      render: (_, record) => (
        <Tag color={record.status === 'Completed' ? 'green' : 'blue'}>
          {record.status || t('orderHistory.statusProcessing')}
        </Tag>
      ),
    },
    {
      title: t('orderHistory.columnAction'),
      key: 'action',
      width: 250,
      render: (text, record) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 查看详情按钮 */}
          <Button
            type="default"
            size="small"
            onClick={() => showDetailModal(record)}
          >
            {t('orderHistory.actionViewDetails')}
          </Button>

          {/* PDF 下载按钮 */}
          <PDFDownloadLink
            document={
              <OrderFormPDF
                designState={record.design}
                orderMeta={{
                  orderNumber: record.orderNumber,
                  // 如果历史订单中没有保存以下信息，使用默认值
                  director: user?.username || 'Admin',
                  cemetery: 'N/A',
                  lot: '',
                  space: '',
                  message: 'Reprint from Order History'
                }}
              />
            }
            fileName={`Order_${record.orderNumber}.pdf`}
          >
            {({ blob, url, loading, error }) => (
              <Button type="primary" size="small" loading={loading}>
                {loading ? 'Preparing...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      ),
    },
  ];

  return (
    <div className="order-history-page">
      <div className="page-header">
        <h1>{t('orderHistory.pageTitle')}</h1>
        <p>{t('orderHistory.pageDescription')}</p>
      </div>

      <Search
        placeholder={t('orderHistory.searchPlaceholder')}
        onSearch={handleSearch}
        style={{ width: 300, marginBottom: 20 }}
        enterButton
        allowClear
        onChange={(e) => handleSearch(e.target.value)}
      />

      <Table
        columns={columns}
        dataSource={filteredOrders}
        loading={loading}
        pagination={{ pageSize: 8 }}
        locale={{
          emptyText: <Empty description={t('orderHistory.noOrders')} />
        }}
        className="orders-table"
        rowKey="orderNumber"
      />

      {/* 订单详情模态框 */}
      {currentOrder && (
        <Modal
          title={`${t('orderHistory.modalTitle')} - ${currentOrder.orderNumber}`}
          open={isDetailModalVisible}
          onCancel={() => setIsDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
              {t('orderHistory.modalClose')}
            </Button>,
          ]}
          width={800}
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('orderHistory.labelOrderNumber')}>
              {currentOrder.orderNumber}
            </Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelOrderTime')}>
              {new Date(currentOrder.timestamp).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelStatus')} span={2}>
              <Tag color="blue">{currentOrder.status || 'Processing'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelPreview')} span={2}>
              <Image
                width={200}
                src={currentOrder.thumbnail || '/images/placeholder.png'}
                style={{ border: '1px solid #f0f0f0' }}
              />
            </Descriptions.Item>

            {/* 设计摘要详情 */}
            <Descriptions.Item label={t('orderHistory.labelSummary')} span={2}>
              <ul className="order-summary-list">
                {/* 1. 碑 (Monuments) */}
                {currentOrder.design.monuments && currentOrder.design.monuments.map(m => (
                  <li key={m.id}>
                    <strong>{t('orderHistory.summaryTablet')} {m.class}</strong>
                    <div className="summary-details">
                      {m.polish}, {m.color}, {formatDimensions(m.dimensions)}
                    </div>
                  </li>
                ))}

                {/* 2. 底座 (Bases) */}
                {currentOrder.design.bases && currentOrder.design.bases.map(b => (
                  <li key={b.id}>
                    <strong>{t('orderHistory.summaryBase')}</strong>
                    <div className="summary-details">
                      {b.polish}, {b.color}, {formatDimensions(b.dimensions)}
                    </div>
                  </li>
                ))}

                {/* 3. 副底座 (SubBases) */}
                {currentOrder.design.subBases && currentOrder.design.subBases.map(sb => (
                  <li key={sb.id}>
                    <strong>{t('orderHistory.summarySubBase')}</strong>
                    <div className="summary-details">
                      {sb.polish}, {sb.color}, {formatDimensions(sb.dimensions)}
                    </div>
                  </li>
                ))}

                {/* 4. 花瓶 (Vases) */}
                {currentOrder.design.vases && currentOrder.design.vases.map(v => (
                  <li key={v.id}>
                    <strong>{t('orderHistory.summaryVase')} {v.class}</strong>
                    <div className="summary-details">
                      {v.color}, {formatDimensions(v.dimensions)}
                    </div>
                  </li>
                ))}

                {/* 5. 艺术图案 (Art Elements) */}
                {currentOrder.design.artElements && currentOrder.design.artElements.map(art => (
                  <li key={art.id}>
                    <strong>{t('orderHistory.summaryArt')} {art.name || art.subclass || 'Custom'}</strong>
                    <div className="summary-details">
                      Position: {art.position ? `[${art.position.map(p=>p.toFixed(2)).join(', ')}]` : 'N/A'}
                    </div>
                  </li>
                ))}

                {/* 6. 文字 (Text Elements) */}
                {currentOrder.design.textElements && currentOrder.design.textElements.map(text => (
                  <li key={text.id}>
                    <strong>{t('orderHistory.summaryText')} "{text.content}"</strong>
                    <div className="summary-details">
                      Font: {text.font}, Size: {text.size}, Type: {text.engraveType}
                    </div>
                  </li>
                ))}
              </ul>
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

export default OrderHistoryPage;