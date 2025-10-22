import React from 'react'
import { Card } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import './MaterialPanel.css'

const MaterialPanel = ({ currentMaterial, onMaterialChange, compact = false }) => {
  const materials = [
    { 
      id: 'Black', 
      name: 'Black Granite', 
      thumbnail: '/textures/Material & Color/Black.jpg'
    },
    { 
      id: 'Grey', 
      name: 'Grey Granite', 
      thumbnail: '/textures/Material & Color/Grey.jpg'
    },
    { 
      id: 'Red', 
      name: 'Red Granite', 
      thumbnail: '/textures/Material & Color/Red.jpg'
    },
    { 
      id: 'Blue', 
      name: 'Blue Granite', 
      thumbnail: '/textures/Material & Color/Blue.jpg'
    },
    { 
      id: 'Green', 
      name: 'Green Granite', 
      thumbnail: '/textures/Material & Color/Green.jpg'
    },
    { 
      id: 'White', 
      name: 'White Granite', 
      thumbnail: '/textures/Material & Color/White.jpg'
    }
  ]

  const handleMaterialClick = (materialId) => {
    onMaterialChange(materialId)
  }

  return (
    <div className="material-panel">
      <div className="materials-grid">
        {materials.map(material => (
          <div
            key={material.id}
            className={`material-item ${currentMaterial === material.id ? 'selected' : ''}`}
            onClick={() => handleMaterialClick(material.id)}
          >
            <div className="material-thumbnail-container">
              <div className="material-thumbnail">
                <img 
                  alt={material.name} 
                  src={material.thumbnail}
                  onError={(e) => {
                    e.target.src = '/images/placeholder.png'
                  }}
                />
              </div>
              {currentMaterial === material.id && (
                <div className="selection-indicator">
                  <CheckOutlined />
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