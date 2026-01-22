import React, { useState, useEffect } from 'react';
import { List, Card, Button, Empty, App, Image, Tag, Input } from 'antd';
import { EyeOutlined, DeleteOutlined, ExclamationCircleOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import designCache from '../../services/designCache';
import designService from '../../services/designService';
import './SavedDesignsPage.css';

const { Meta } = Card;

const SavedDesignsPage = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { modal, message } = App.useApp();

  // Load designs from cache, sync from server if needed
  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        await designCache.init();
        
        // First show cached data immediately
        const cachedDesigns = designCache.getDesigns();
        if (cachedDesigns.length > 0) {
          setDesigns(cachedDesigns);
          setLoading(false);
        }
        
        // Then sync from server in background
        const serverDesigns = await designCache.syncFromServer();
        setDesigns(serverDesigns);
      } catch (error) {
        console.error('Failed to load designs:', error);
        // Show cached data on error
        const cachedDesigns = designCache.getDesigns();
        if (cachedDesigns.length > 0) {
          setDesigns(cachedDesigns);
        } else {
          message.error(t('savedDesigns.loadError'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchDesigns();
    } else {
      setLoading(false);
    }
  }, [user, t]);

  // Manual sync to server
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await designCache.forceSync();
      const designs = await designCache.syncFromServer(true);
      setDesigns(designs);
      message.success('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
      message.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Load design from cache
  const handleLoadDesign = async (design) => {
    try {
      message.loading({ content: 'Loading design...', key: 'loading' });
      
      // Load from cache (will fetch from server if not cached)
      const fullDesignData = await designCache.getDetail(design.id);
      
      // Validate design data has required fields
      if (fullDesignData && (fullDesignData.monuments || fullDesignData.bases || fullDesignData.artElements)) {
        message.success({ content: 'Design loaded successfully', key: 'loading' });
        navigate('/designer', { state: { loadedDesign: fullDesignData } });
      } else {
        console.error('Invalid design data:', fullDesignData);
        message.error({ content: 'Invalid design data format', key: 'loading' });
      }
    } catch (error) {
      console.error('Failed to load design:', error);
      message.error({ content: 'Failed to load design, please try again', key: 'loading' });
    }
  };

  // Delete design from cache and server
  const handleDeleteDesign = (designId) => {
    modal.confirm({
      title: t('savedDesigns.deleteConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('savedDesigns.deleteConfirmContent'),
      okText: t('savedDesigns.deleteButton'),
      okType: 'danger',
      cancelText: t('savedDesigns.cancelButton'),
      async onOk() {
        try {
          // Delete from cache (will async delete from server)
          await designCache.deleteDesign(designId);
          // Update UI immediately
          setDesigns(prevDesigns => prevDesigns.filter(d => d.id !== designId));
          message.success(t('savedDesigns.deleteSuccess'));
        } catch (error) {
          console.error('Failed to delete design:', error);
          message.error(t('savedDesigns.deleteError'));
        }
      },
    });
  };

  // Rename design
  const handleRenameDesign = (design) => {
    let newName = design.name;
    modal.confirm({
      title: 'Rename Design',
      icon: <EditOutlined />,
      content: (
        <Input
          defaultValue={design.name}
          placeholder="Enter new name"
          onChange={(e) => { newName = e.target.value; }}
          style={{ marginTop: 16 }}
        />
      ),
      okText: 'Save',
      cancelText: 'Cancel',
      async onOk() {
        if (!newName || newName.trim() === '') {
          message.error('Name cannot be empty');
          return Promise.reject();
        }
        if (newName === design.name) {
          return; // No change
        }
        try {
          // Update on server
          await designService.update(design.id, {
            name: newName,
            type: design.type || 'memorial'
          });
          
          // Update local state
          setDesigns(prevDesigns => prevDesigns.map(d => 
            d.id === design.id ? { ...d, name: newName } : d
          ));
          
          // Update cache
          if (designCache.cache.detailMap[design.id]) {
            designCache.cache.detailMap[design.id].name = newName;
          }
          const listIndex = designCache.cache.designs.findIndex(d => d.id === design.id);
          if (listIndex >= 0) {
            designCache.cache.designs[listIndex].name = newName;
          }
          designCache.persistCache();
          
          message.success('Name updated successfully');
        } catch (error) {
          console.error('Failed to rename design:', error);
          message.error('Failed to rename design');
        }
      },
    });
  };

  // Check for pending sync
  const syncStatus = designCache.getSyncStatus();
  const hasPending = designCache.hasPendingChanges();

  return (
    <div className="saved-designs-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{t('savedDesigns.pageTitle')}</h1>
            <p>{t('savedDesigns.pageDescription')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasPending && (
              <Tag color="orange">
                {syncStatus.pendingSyncCount} pending sync
              </Tag>
            )}
            <Button 
              icon={<SyncOutlined spin={syncing} />} 
              onClick={handleManualSync}
              loading={syncing}
            >
              Sync
            </Button>
          </div>
        </div>
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
                  <Button type="text" icon={<EyeOutlined />} key="load" size="small" onClick={() => handleLoadDesign(item)}>
                    {t('savedDesigns.loadAction')}
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} key="rename" size="small" onClick={() => handleRenameDesign(item)}>
                    Rename
                  </Button>,
                  <Button type="text" danger icon={<DeleteOutlined />} key="delete" size="small" onClick={() => handleDeleteDesign(item.id)}>
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