import React from 'react'
import { Menu } from 'antd'
import { useTranslation } from 'react-i18next'
import './Toolbar.css'

const Toolbar = ({ tools, activeTool, onToolSelect }) => {
  const { t } = useTranslation()

  const menuItems = tools.map(tool => ({
    key: tool.key,
    icon: <span className="tool-icon">{tool.icon}</span>,
    label: tool.label,
    className: activeTool === tool.key ? 'ant-menu-item-selected' : ''
  }))

  return (
    <div className="toolbar">
      <Menu
        mode="inline"
        selectedKeys={[activeTool]}
        onClick={({ key }) => onToolSelect(key)}
        items={menuItems}
        className="toolbar-menu"
      />
    </div>
  )
}

export default Toolbar