import React from 'react';
import { Row, Col, Typography, Image, Input, Divider } from 'antd';

const { Text, Title } = Typography;
const { TextArea } = Input;

const DesignPreviewTemplate = ({
                                 designState,
                                 proofImage,
                                 orderInfo = {},
                                 onInfoChange = null // 如果传入此函数，则字段可编辑(Print模式)；否则只读(Email模式)
                               }) => {
  // 1. 定义单位转换函数 (米 -> 英寸)
  const formatDim = (val) => {
    if (!val) return 0;
    return (val * 39.37).toFixed(0);
  };

  // 2. 提取设计信息
  const monument = designState.monuments?.[0] || {};
  const base = designState.bases?.[0];
  const subBase = designState.subBases?.[0];
  const textElements = designState.textElements || [];
  const artElements = designState.artElements || [];
  const vases = designState.vases || [];

  const usedFonts = [...new Set(textElements.map(t => {
    const fontName = t.font || 'Default';
    return fontName.split('/').pop().replace('.typeface.json', '').replace('.json', '').replace(/_/g, ' ');
  }))].join(', ');

  const usedArts = artElements.map(a => a.name || a.subclass || 'Custom Art').join(', ');

  // 辅助渲染：输入框 或 文本
  const renderField = (field, label, width = '100%') => {
    const value = orderInfo[field] || '';
    if (onInfoChange) {
      return field === 'message' ? (
        <TextArea
          size="small"
          value={value}
          onChange={e => onInfoChange(field, e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1, border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, resize: 'none' }}
        />
      ) : (
        <Input
          size="small"
          value={value}
          onChange={e => onInfoChange(field, e.target.value)}
          style={{ flex: 1, border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, width }}
        />
      );
    }
    // 只读模式 (Email Design 左侧预览)
    return (
      <div style={{ flex: 1, borderBottom: '1px solid #eee', minHeight: '22px', fontSize: '12px', lineHeight: '22px' }}>
        {value}
      </div>
    );
  };

  return (
    <div className="design-preview-template" style={{ padding: '20px', background: 'white', minHeight: '800px', width: '100%', boxSizing: 'border-box' }}>
      {/* --- 头部区域 --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* 左上：基本信息 */}
        <div style={{ border: '2px solid #ff4d4f', padding: '10px', width: '55%' }}>
          <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
            <Text strong style={{ width: '90px', fontSize: '12px' }}>Contract #:</Text>
            {renderField('contract', 'Contract', '150px')}
          </div>
          <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
            <Text strong style={{ width: '180px', fontSize: '12px' }}>Cemetery Name & Loc:</Text>
            {renderField('cemetery', 'Cemetery')}
          </div>
          <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
            <Text strong style={{ width: '100px', fontSize: '12px' }}>Director Name:</Text>
            {renderField('director', 'Director')}
          </div>
          <div style={{ display: 'flex', alignItems: 'start' }}>
            <Text strong style={{ width: '100px', fontSize: '12px' }}>Message:</Text>
            {renderField('message', 'Message')}
          </div>
        </div>

        {/* 右上：Logo 和 花瓶 */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '40%' }}>
          <img src="/Arbor%20White%20Logo.png" alt="Arbor Memorial" style={{ height: '50px', filter: 'invert(1)', marginBottom: '10px' }} />

          <div style={{ border: '2px solid #ff4d4f', padding: '5px 10px', minWidth: '120px', textAlign: 'center' }}>
            <Text strong style={{fontSize: '12px'}}>Vases:</Text>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              {vases.length > 0 ? vases.map((v, i) => (
                <div key={i}>{v.name || v.class} ({v.color})</div>
              )) : <span style={{ color: '#999' }}>None</span>}
            </div>
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* --- 左侧：设计规格 --- */}
        <Col span={8}>
          <div style={{ border: '2px solid #ff4d4f', padding: '10px', height: '100%', background: '#fff' }}>
            <Title level={5} style={{ margin: '0 0 10px 0', fontSize: '14px', textDecoration: 'underline' }}>Design Specifications</Title>

            <div style={{ marginBottom: '15px' }}>
              <Text strong style={{ fontSize: '12px' }}>Artworks / Etchings:</Text><br/>
              <Text style={{ fontSize: '11px' }}>{usedArts || <span style={{ color: '#999' }}>None</span>}</Text>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <Text strong style={{ fontSize: '12px' }}>Fonts:</Text><br/>
              <Text style={{ fontSize: '11px' }}>{usedFonts || <span style={{ color: '#999' }}>Default</span>}</Text>
            </div>

            <div>
              <Text strong style={{ fontSize: '12px' }}>Inscriptions:</Text>
              {textElements.length > 0 ? (
                <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '11px' }}>
                  {textElements.map((t, i) => <li key={i}>{t.content}</li>)}
                </ul>
              ) : <div style={{ fontSize: '11px', color: '#999' }}>None</div>}
            </div>
          </div>
        </Col>

        {/* --- 右侧：预览图和尺寸 --- */}
        <Col span={16}>
          <div style={{ textAlign: 'center', height: '100%' }}>
            <div style={{ border: '1px solid #eee', padding: '5px', marginBottom: '5px', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {proofImage ? (
                <Image src={proofImage} alt="Design Proof" preview={false} style={{ maxHeight: '350px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : <div style={{ color: '#ccc', fontSize: '12px' }}>Preview</div>}
            </div>

            <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '12px', padding: '5px', border: '2px solid #ff4d4f' }}>
              <div>Tablet: {formatDim(monument.dimensions?.length)}" x {formatDim(monument.dimensions?.width)}" x {formatDim(monument.dimensions?.height)}" {monument.polish}</div>
              {base && <div style={{ borderTop: '1px dashed #eee' }}>Base: {formatDim(base.dimensions?.length)}" x {formatDim(base.dimensions?.width)}" x {formatDim(base.dimensions?.height)}" {base.polish}</div>}
              {subBase && <div style={{ borderTop: '1px dashed #eee' }}>SubBase: {formatDim(subBase.dimensions?.length)}" x {formatDim(subBase.dimensions?.width)}" x {formatDim(subBase.dimensions?.height)}" {subBase.polish}</div>}
            </div>
          </div>
        </Col>
      </Row>

      {/* --- 底部：条款 --- */}
      <div style={{ marginTop: '20px', border: '2px solid #ff4d4f', padding: '10px', fontSize: '9px', lineHeight: '1.3' }}>
        <p style={{ marginBottom: '5px' }}>
          <strong>Note au client :</strong> Le fournisseur du monument peut apporter des modifications mineures à ce modèle afin de veiller à ce que la conception soit adaptée à la sculpture et à une production de la meilleure qualité. Avant la fabrication, le fournisseur produira un croquis, qui sera soumis à votre approbation.
        </p>
        <p style={{ marginBottom: '8px' }}>Ma signature ci-après indique que je reconnais avoir étudié l'inscription ci-dessus...</p>
        <Divider style={{ margin: '8px 0' }} />
        <p style={{ marginBottom: '5px' }}>
          <strong>Note to Customer:</strong> Minor necessary adjustments in this conceptual design may be made by the Monument Vendor to ensure that the design is suitable for carving and the best quality production.
        </p>
        <p>By signing below, I acknowledge that I have examined the above inscription...</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', marginBottom: '10px' }}>
          <div style={{ width: '45%', borderBottom: '1px solid black' }}>Signed</div>
          <div style={{ width: '45%', borderBottom: '1px solid black' }}>Date</div>
        </div>
        <div style={{ fontSize: '8px', color: '#888' }}>
          Copyright notice: The design, layout, look, appearance and graphics are property of MonumentPro Inc...
        </div>
      </div>
    </div>
  );
};

export default DesignPreviewTemplate;