import React, { useState, useEffect } from 'react';
import { Table, Button, Image, Tag, Empty, Input, Modal, Descriptions } from 'antd';
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

  useEffect(() => {
    setTimeout(() => {
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const userOrders = allOrders.filter(order => order.userId === user?.id);
      const ordersWithKeys = userOrders.map(o => ({ ...o, key: o.orderNumber }));
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

  // 辅助函数，用于格式化尺寸
  const formatDimensions = (dims) => {
    if (!dims || dims.length === 0) return "N/A";
    const L = (dims.length * 39.370).toFixed(1);
    const W = (dims.width * 39.370).toFixed(1);
    const H = (dims.height * 39.370).toFixed(1);
    return `${L}" L x ${W}" W x ${H}" H`;
  };


  // 列表达
  const columns = [
    {
      title: t('orderHistory.columnOrderNumber'),
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: text => <strong>{text}</strong>,
    },
    {
      title: t('orderHistory.columnProof'),
      dataIndex: 'proofImage',
      key: 'proofImage',
      render: url => <Image width={100} src={url || '/images/placeholder.png'} />,
    },
    {
      title: t('orderHistory.columnOrderTime'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: ts => new Date(ts).toLocaleString(),
      sorter: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      defaultSortOrder: 'descend',
    },
    {
      title: t('orderHistory.columnStatus'),
      key: 'status',
      render: () => <Tag color="blue">{t('orderHistory.statusProcessing')}</Tag>,
    },
    {
      title: t('orderHistory.columnAction'),
      key: 'action',
      render: (text, record) => (
        <Button type="primary" onClick={() => showDetailModal(record)}>
          {t('orderHistory.actionViewDetails')}
        </Button>
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
      />
      <Table
        columns={columns}
        dataSource={filteredOrders}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description={t('orderHistory.noOrders')} />
        }}
        className="orders-table"
      />
      {currentOrder && (
        <Modal
          title={t('orderHistory.modalTitle')}
          visible={isDetailModalVisible}
          onCancel={() => setIsDetailModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setIsDetailModalVisible(false)}>
              {t('orderHistory.modalClose')}
            </Button>,
          ]}
          width={800}
        >
          <Descriptions bordered>
            <Descriptions.Item label={t('orderHistory.labelOrderNumber')} span={3}>{currentOrder.orderNumber}</Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelOrderTime')} span={3}>{new Date(currentOrder.timestamp).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelStatus')} span={3}><Tag color="blue">{t('orderHistory.statusProcessing')}</Tag></Descriptions.Item>
            <Descriptions.Item label={t('orderHistory.labelPreview')} span={3}>
              <Image width={200} src={currentOrder.proofImage || '/images/placeholder.png'} />
            </Descriptions.Item>

            {/* 【已修改】：更新设计摘要以显示所有元素 */}
            <Descriptions.Item label={t('orderHistory.labelSummary')} span={3}>
              <ul className="order-summary-list">
                {/* 1. 碑 (Monuments) */}
                {currentOrder.design.monuments.map(m => (
                  <li key={m.id}>
                    <strong>{t('orderHistory.summaryTablet')} {m.class}</strong>
                    <div className="summary-details">
                      {m.polish}, {m.color}, {formatDimensions(m.dimensions)}
                    </div>
                  </li>
                ))}
                {/* 2. 底座 (Bases) */}
                {currentOrder.design.bases.map(b => (
                  <li key={b.id}>
                    <strong>{t('orderHistory.summaryBase')}</strong>
                    <div className="summary-details">
                      {b.polish}, {b.color}, {formatDimensions(b.dimensions)}
                    </div>
                  </li>
                ))}
                {/* 3. 副底座 (SubBases) */}
                {currentOrder.design.subBases.map(sb => (
                  <li key={sb.id}>
                    <strong>{t('orderHistory.summarySubBase')}</strong>
                    <div className="summary-details">
                      {sb.polish}, {sb.color}, {formatDimensions(sb.dimensions)}
                    </div>
                  </li>
                ))}
                {/* 4. 花瓶 (Vases) */}
                {currentOrder.design.vases.map(v => (
                  <li key={v.id}>
                    <strong>{t('orderHistory.summaryVase')} {v.name}</strong>
                    <div className="summary-details">
                      {v.color}, {formatDimensions(v.dimensions)}
                    </div>
                  </li>
                ))}
                {/* 5. 【新增】艺术图案 (Art Elements) */}
                {currentOrder.design.artElements.map(art => (
                  <li key={art.id}>
                    <strong>{t('orderHistory.summaryArt')} {art.subclass || 'Custom'}</strong>
                    <div className="summary-details">
                      {art.name || `ID: ${art.id.substring(0, 5)}`}
                      {art.properties?.lineColor && `, Color: ${art.properties.lineColor}`}
                    </div>
                  </li>
                ))}
                {/* 6. 【新增】文字 (Text Elements) */}
                {currentOrder.design.textElements.map(text => (
                  <li key={text.id}>
                    <strong>{t('orderHistory.summaryText')} "{text.content}"</strong>
                    <div className="summary-details">
                      {text.font}, {text.size}pt, {text.engraveType}
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