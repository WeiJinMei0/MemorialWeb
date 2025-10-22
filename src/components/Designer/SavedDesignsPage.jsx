import React, { useState, useEffect } from 'react';
import { List, Card, Button, Empty, message, App, Image } from 'antd';
import { EyeOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './SavedDesignsPage.css';

const { Meta } = Card;

const SavedDesignsPage = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { modal } = App.useApp();

  useEffect(() => {
    setTimeout(() => {
      try {
        const allDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
        const userDesigns = allDesigns.filter(design => design.userId === user?.id);
        setDesigns(userDesigns);
      } catch (error) {
        message.error(t('savedDesigns.loadError'));
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [user, t]);

  const handleLoadDesign = (design) => {
    navigate('/designer', { state: { loadedDesign: design } });
  };

  // 1. 修改函数，使其接收 uniqueTimestamp 而不是 designName
  const handleDeleteDesign = (uniqueTimestamp) => {
    modal.confirm({
      title: t('savedDesigns.deleteConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('savedDesigns.deleteConfirmContent'),
      okText: t('savedDesigns.deleteButton'),
      okType: 'danger',
      cancelText: t('savedDesigns.cancelButton'),
      onOk() {
        try {
          const allDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');

          // 2. 使用时间戳进行精确过滤，确保只删除一个
          const updatedAllDesigns = allDesigns.filter(design => {
            // 保留所有不匹配该时间戳的设计
            return design.timestamp !== uniqueTimestamp;
          });

          localStorage.setItem('savedDesigns', JSON.stringify(updatedAllDesigns));
          setDesigns(updatedAllDesigns.filter(d => d.userId === user?.id));
          message.success(t('savedDesigns.deleteSuccess'));
        } catch (error) {
          message.error(t('savedDesigns.deleteError'));
        }
      },
    });
  };

  return (
    <div className="saved-designs-page">
      <div className="page-header">
        <h1>{t('savedDesigns.pageTitle')}</h1>
        <p>{t('savedDesigns.pageDescription')}</p>
      </div>

      <Image.PreviewGroup>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
          dataSource={designs}
          loading={loading}
          locale={{ emptyText: <Empty description={t('savedDesigns.noDesigns')} /> }}
          renderItem={item => (
            <List.Item>
              <Card
                className="design-card"
                hoverable
                cover={ <Image alt={item.name} src={item.thumbnail || '/images/placeholder.png'} className="design-thumbnail" /> }
                actions={[
                  <Button type="text" icon={<EyeOutlined />} key="load" onClick={() => handleLoadDesign(item)}>
                    {t('savedDesigns.loadAction')}
                  </Button>,
                  // 3. 在点击时，传递 item.timestamp 而不是 item.name
                  <Button type="text" danger icon={<DeleteOutlined />} key="delete" onClick={() => handleDeleteDesign(item.timestamp)}>
                    {t('savedDesigns.deleteButton')}
                  </Button>,
                ]}
              >
                <Meta
                  title={item.name}
                  description={`${t('savedDesigns.savedAt')} ${new Date(item.timestamp).toLocaleString()}`}
                />
              </Card>
            </List.Item>
          )}
        />
      </Image.PreviewGroup>
    </div>
  );
};

export default SavedDesignsPage;