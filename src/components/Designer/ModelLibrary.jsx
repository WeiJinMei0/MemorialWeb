import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Empty, Button, Space, Spin } from 'antd';
import { SearchOutlined, HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './ModelLibrary.css';

// 模拟数据 - 在实际应用中应从API获取
const SHAPE_FAMILIES = ['Tablet', 'Bench', 'Rock', 'Pedestal', 'Columbarium'];
const VASE_CLASSES = ['Vase for Cremation', 'Planter Vase'];
const ART_CLASSES = ['Asian Themed', 'Shape Carved of Material Object'];

// 艺术图案子类（第二级）
const ART_SUBCLASSES = {
  'Asian Themed': ['Bamboo', 'Banners', 'Dragon', 'Lotus', 'Panels', 'Phoenix'],
  'Shape Carved of Material Object': ['Bird', 'Floralcross', 'Flower', 'Plant'],
};

// 具体的图案列表（第三级）- 模拟数据，包含 imagePath 和默认 dimensions
const ART_PATTERNS = {
  'Bamboo': ['Bamboo-1', 'Bamboo-2', 'Bamboo-3', 'Bamboo-4', 'Bamboo-5'],
  'Banners': ['Banners-1', 'Banners-2', 'Banners-3'],
  'Dragon': ['Dragon-1', 'Dragon-2', 'Dragon-3'],
  'Lotus': ['Lotus-1', 'Lotus-2', 'Lotus-3'],
  'Panels': ['Lvy-1', 'Maple-5'],
  'Phoenix': ['Phoenix-1', 'Phoenix-2', 'Phoenix-3'],
  'Bird': ['Bird-19', 'Bird-44', 'Bird-47'],
  'Flower': ['Lily-1', 'Rose-50', 'Lily-3']
};

// 辅助函数：生成图案的图片路径
const getArtImagePath = (family, subclass, pattern) =>
  `./images/Art/${family.replace(/\s+/g, '%20')}/${subclass}/${pattern.replace(/\s+/g, '%20')}.png`;


const ModelLibrary = ({ type, onSelect, productFamilies = {} }) => {
  const [currentPage, setCurrentPage] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  // 新增：跟踪选定的子类
  const [selectedSubclass, setSelectedSubclass] = useState(null);
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
          // 显示选定家族下的具体款式 (shapes, vases) 或 子类 (art)
          if (type === 'shapes') {
            // 模拟具体款式数据 (Shapes: Family -> Class)
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
              type: 'class', // 最终的可选择项
              thumbnail: `./images/Shapes/${selectedFamily}/${cls.replace(/\s+/g, '%20')}.png`,
              description: `${cls} Style`,
              family: selectedFamily,
              polish: productFamilies[selectedFamily]?.defaultPolish || 'P5'
            }));
          } else if (type === 'vases') {
            // 模拟花瓶具体款式 (Vases: Family -> Vase)
            const vaseItems = {
              'Vase for Cremation': ['Classic Cremation Vase', 'Modern Cremation Vase'],
              'Planter Vase': ['Small Planter', 'Large Planter']
            };

            const vaseNames = vaseItems[selectedFamily] || [];
            data = vaseNames.map(name => ({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name: name,
              type: 'vase', // 最终的可选择项
              thumbnail: `./images/Vases/${selectedFamily}/${name.replace(/\s+/g, '%20')}.png`,
              description: name,
              class: selectedFamily
            }));
          } else if (type === 'art') {
            // 艺术图案：Family -> Subclass (中间页)
            const subclasses = ART_SUBCLASSES[selectedFamily] || [];
            data = subclasses.map(subclass => ({
              id: subclass.toLowerCase().replace(/\s+/g, '-'),
              name: subclass,
              // 关键修改：类型改为 'subclass'
              type: 'subclass',
              thumbnail: `./images/Art/${selectedFamily}/${subclass}/default.png`,
              description: `${subclass} Designs`
            }));
          }
        } else if (currentPage === 'subclass' && selectedSubclass) {
          // 新增：显示选定子类下的具体图案 (Art: Subclass -> Pattern)
          if (type === 'art') {
            const patterns = ART_PATTERNS[selectedSubclass] || [];
            data = patterns.map(pattern => ({
              id: pattern.toLowerCase().replace(/\s+/g, '-'),
              name: pattern,
              type: 'art', // 最终的可选择项
              // 关键修改：使用 imagePath 指向 PNG 文件
              imagePath: getArtImagePath(selectedFamily, selectedSubclass, pattern),
              thumbnail: getArtImagePath(selectedFamily, selectedSubclass, pattern),
              description: `${pattern} Pattern`,
              class: selectedFamily,
              subclass: selectedSubclass,
              // 添加默认尺寸
              dimensions: { length: 0.2, width: 0.2, height: 0.01 }
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
  }, [currentPage, selectedFamily, selectedSubclass, type, productFamilies]); // 依赖中加入 selectedSubclass

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (item) => {
    if (item.type === 'family') {
      setSelectedFamily(item.name);
      setSelectedSubclass(null);
      setCurrentPage('family');
      setSearchTerm('');
    } else if (item.type === 'subclass') {
      // 进入第三级：图案列表页
      setSelectedSubclass(item.name);
      setCurrentPage('subclass');
      setSearchTerm('');
    } else {
      // 最终选择：type 为 'class', 'vase', 或 'art'
      onSelect(item);
    }
  };

  const handleHomeClick = () => {
    setCurrentPage('home');
    setSelectedFamily(null);
    setSelectedSubclass(null);
    setSearchTerm('');
  };

  // 修改 handleBackClick 以支持三级返回
  const handleBackClick = () => {
    if (currentPage === 'subclass') {
      // 从 图案列表页 (subclass) 返回 子类列表页 (family)
      setCurrentPage('family');
      setSelectedSubclass(null);
    } else if (currentPage === 'family') {
      // 从 子类列表页/款式列表页 (family) 返回 系列主页 (home)
      setCurrentPage('home');
      setSelectedFamily(null);
    }
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

  // 渲染导航路径
  const renderNavigationPath = () => {
    if (currentPage === 'home') return null;

    return (
      <>
        <span>/</span>
        <Button
          type="text"
          onClick={handleBackClick} // 通用返回按钮
          icon={<ArrowLeftOutlined />}
          size="small"
        >
          {currentPage === 'family' ? 'Back' : (selectedSubclass ? selectedSubclass : selectedFamily)}
        </Button>

        {currentPage === 'subclass' && (
          <>
            <span>/</span>
            <Button
              type="text"
              onClick={() => {
                setCurrentPage('family');
                setSelectedSubclass(null);
                setSearchTerm('');
              }}
              size="small"
            >
              {selectedFamily}
            </Button>
            <span>/ {selectedSubclass}</span>
          </>
        )}

        {/* 如果在 family 页面，只显示当前 family 名称 (通过上面的 Back 按钮) */}
        {currentPage === 'family' && <span>/ {selectedFamily}</span>}
      </>
    );
  };

  // 调整导航路径的显示，以更好地适应 Ant Design 按钮布局
  const renderNavigation = () => (
    <div className="navigation">
      <Space>
        <Button
          type="text"
          icon={<HomeOutlined />}
          onClick={handleHomeClick}
          size="small"
        />
        {currentPage !== 'home' && (
          <>
            <span>/</span>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBackClick}
              size="small"
            >
              {currentPage === 'family' ? 'Back' : (selectedSubclass ? selectedSubclass : selectedFamily)}
            </Button>
          </>
        )}

        {currentPage === 'family' && <span>/ {selectedFamily}</span>}

        {currentPage === 'subclass' && (
          <>
            <span>/</span>
            <Button
              type="text"
              onClick={() => {
                setCurrentPage('family');
                setSelectedSubclass(null);
                setSearchTerm('');
              }}
              size="small"
            >
              {selectedFamily}
            </Button>
            <span>/ {selectedSubclass}</span>
          </>
        )}
      </Space>
    </div>
  );


  return (
    <div className="model-library">
      <div className="library-header">
        {renderNavigation()}

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
                  {item.type === 'subclass' && (
                    <div className="subclass-indicator">Select Patterns</div>
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