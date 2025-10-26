import React, { useState, useEffect } from 'react';
import { Card, Input, Empty, Button, Space, Spin } from 'antd';
import { SearchOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './ModelLibrary.css';

// 模拟数据 - 在实际应用中应从API获取
const SHAPE_FAMILIES = ['Tablet', 'Bench', 'Rock', 'Pedestal', 'Columbarium'];
const VASE_CLASSES = ['Vase for Cremation', 'Planter Vase'];
const ART_CLASSES = ['Animals', 'Hearts', 'Hands', 'Chinese Temple', 'Dragon', 'Floral'];

const ModelLibrary = ({ type, onSelect, productFamilies = {} }) => {
  const [currentPage, setCurrentPage] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // 加载数据
  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      
      try {
        let data = [];
        
        if (currentPage === 'home') {
          // 首页显示所有分类
          if (type === 'shapes') {
            data = SHAPE_FAMILIES.map(family => ({
              id: family.toLowerCase(),
              name: family,
              type: 'family',
              thumbnail: `./images/Shapes/${family}/default.png`,
              description: `${family} Family`,
              needsBase: productFamilies[family]?.needsBase || false
            }));
          } else if (type === 'vases') {
            data = VASE_CLASSES.map(cls => ({
              id: cls.toLowerCase().replace(/\s+/g, '-'),
              name: cls,
              type: 'family',
              thumbnail: `./images/Vases/${cls}/default.png`,
              description: `${cls} Collection`
            }));
          } else if (type === 'art') {
            data = ART_CLASSES.map(cls => ({
              id: cls.toLowerCase().replace(/\s+/g, '-'),
              name: cls,
              type: 'family',
              thumbnail: `./images/Art/${cls}/default.png`,
              description: `${cls} Designs`
            }));
          }
        } else if (currentPage === 'family' && selectedFamily) {
          // 显示选定家族下的具体款式
          if (type === 'shapes') {
            // 模拟具体款式数据
            const familyClasses = {
              'Tablet': ['Serp Top', 'Flat Top', 'Half Serp Top', 'Oval'],
              'Bench': ['Smith Cremation Bench', 'Oversize Smith Cremation Bench', 'Curved Bench'],
              'Rock': ['Triangle Rock', 'Round Rock', 'Square Rock'],
              'Pedestal': ['Cremation Pedestal', 'Oversize Cremation Pedestal'],
              'Columbarium': ['Hampton - 2 unit', 'Hampton - 3 unit']
            };
            
            const classes = familyClasses[selectedFamily] || [];
            data = classes.map(cls => ({
              id: cls.toLowerCase().replace(/\s+/g, '-'),
              name: cls,
              type: 'class',
              thumbnail: `./images/Shapes/${selectedFamily}/${cls.replace(/\s+/g, '%20')}.png`,
              description: `${cls} Style`,
              family: selectedFamily,
              polish: productFamilies[selectedFamily]?.defaultPolish || 'P5'
            }));
          } else if (type === 'vases') {
            // 模拟花瓶具体款式
            const vaseItems = {
              'Vase for Cremation': ['Classic Cremation Vase', 'Modern Cremation Vase'],
              'Planter Vase': ['Small Planter', 'Large Planter']
            };
            
            const vaseNames = vaseItems[selectedFamily] || [];
            data = vaseNames.map(name => ({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name: name,
              type: 'vase',
              thumbnail: `./images/Vases/${selectedFamily}/${name.replace(/\s+/g, '%20')}.png`,
              description: name,
              class: selectedFamily
            }));
          } else if (type === 'art') {
            // 模拟艺术图案子类
            const artItems = {
              'Animals': ['Bird', 'Dog', 'Butterfly'],
              'Hearts': ['Heart Simple', 'Heart Ornate'],
              'Hands': ['Hands Praying', 'Hands Holding']
            };
            
            const subclasses = artItems[selectedFamily] || [];
            data = subclasses.map(subclass => ({
              id: subclass.toLowerCase().replace(/\s+/g, '-'),
              name: subclass,
              type: 'art',
              thumbnail: `./images/Art/${selectedFamily}/${subclass}/default.png`,
              description: `${subclass} Design`,
              class: selectedFamily,
              subclass: subclass
            }));
          }
        }
        
        setItems(data);
      } catch (error) {
        console.error('Failed to load items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadItems();
  }, [currentPage, selectedFamily, type, productFamilies]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (item) => {
    if (item.type === 'family') {
      setSelectedFamily(item.name);
      setCurrentPage('family');
      setSearchTerm('');
    } else {
      onSelect(item);
    }
  };

  const handleBackClick = () => {
    setCurrentPage('home');
    setSelectedFamily(null);
    setSearchTerm('');
  };

  const handleHomeClick = () => {
    setCurrentPage('home');
    setSelectedFamily(null);
    setSearchTerm('');
  };

  const getTitle = () => {
    switch (type) {
      case 'shapes': return 'Monument Shapes';
      case 'vases': return 'Vases Collection';
      case 'art': return 'Art & Panels';
      default: return 'Model Library';
    }
  };

  return (
    <div className="model-library">
      <div className="library-header">
        <div className="navigation">
          <Space>
            <Button 
              type="text" 
              icon={<HomeOutlined />} 
              onClick={handleHomeClick}
              size="small"
            />
            {currentPage === 'family' && (
              <>
                <span>/</span>
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handleBackClick}
                  size="small"
                >
                  Back
                </Button>
                <span>/ {selectedFamily}</span>
              </>
            )}
          </Space>
        </div>
        
        <h4>{getTitle()}</h4>
        
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="models-content">
        {loading ? (
          <div className="loading">
            <Spin size="large" />
            <p>Loading...</p>
          </div>
        ) : (
          <div className="models-grid">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <Card
                  key={item.id}
                  hoverable
                  className="model-card"
                  cover={
                    <div className="model-thumbnail">
                      <img 
                        alt={item.name} 
                        src={item.thumbnail}
                        onError={(e) => {
                          e.target.src = './images/placeholder.png';
                        }}
                      />
                    </div>
                  }
                  onClick={() => handleItemClick(item)}
                >
                  <Card.Meta 
                    title={item.name} 
                    description={item.description}
                  />
                  {item.needsBase && (
                    <div className="needs-base">Includes Base</div>
                  )}
                </Card>
              ))
            ) : (
              <Empty description="No items found" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelLibrary;