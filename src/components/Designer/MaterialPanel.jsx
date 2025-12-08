import React, { useState } from 'react'
import { CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import './MaterialPanel.css'

const MaterialPanel = ({ currentMaterial, onMaterialChange }) => {
  const [hoveredMaterial, setHoveredMaterial] = useState(null);
  const { t } = useTranslation()

  // 根据你的文件夹截图更新的数据列表
  const materials = [
    { id: 'Bahama Blue', name: 'Bahama Blue', thumbnail: '/textures/Material & Color/Bahama Blue.jpg' },
    { id: 'Black', name: 'Black', thumbnail: '/textures/Material & Color/Black.jpg' },
    { id: 'Blue Pearl', name: 'Blue Pearl', thumbnail: '/textures/Material & Color/Blue Pearl.jpg' },
    { id: 'Charcoal', name: 'Charcoal', thumbnail: '/textures/Material & Color/Charcoal.jpg' },
    { id: 'Grey', name: 'Grey', thumbnail: '/textures/Material & Color/Grey.jpg' },
    { id: 'Ocean Green', name: 'Ocean Green', thumbnail: '/textures/Material & Color/Ocean Green.jpg' },
    { id: 'Paradiso', name: 'Paradiso', thumbnail: '/textures/Material & Color/Paradiso.jpg' },
    { id: 'PG red', name: 'PG Red', thumbnail: '/textures/Material & Color/PG red.jpg' },
    { id: 'Pink', name: 'Pink', thumbnail: '/textures/Material & Color/Pink.jpg' },
    { id: 'Rustic Mahgoany', name: 'Rustic Mahogany', thumbnail: '/textures/Material & Color/Rustic Mahgoany.jpg' }
  ];

  return (
    <div className="material-panel">
      <div className="materials-grid">
        {materials.map(material => (
          <div
            key={material.id}
            className={`material-item ${currentMaterial === material.id ? 'selected' : ''}`}
            onClick={() => onMaterialChange(material.id)}
            onMouseEnter={() => setHoveredMaterial(material.id)}
            onMouseLeave={() => setHoveredMaterial(null)}
          >
            <div className="material-thumbnail-container">
              <div className="material-thumbnail">
                <img
                  alt={t(`materials.${material.id}`)}
                  src={material.thumbnail}
                  onError={(e) => { e.target.src = '/images/placeholder.png' }} // 简单的错误处理
                />
              </div>

              {/* 选中对勾 (右上角) */}
              {currentMaterial === material.id && (
                <div className="selection-indicator">
                  <CheckOutlined style={{ fontSize: '12px' }} />
                </div>
              )}

              {/* 悬停放大预览 */}
              {hoveredMaterial === material.id && (
                <div className="material-hover-preview">
                  <div className="preview-image">
                    <img
                      src={material.thumbnail}
                      alt={t(`materials.${material.id}`)}
                      onError={(e) => { e.target.src = '/images/placeholder.png' }}
                    />
                  </div>
                  <div className="preview-name">{t(`materials.${material.id}`)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MaterialPanel