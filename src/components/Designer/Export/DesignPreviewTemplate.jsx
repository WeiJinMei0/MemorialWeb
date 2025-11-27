import React from 'react';
import { Typography, Image, Input, Divider } from 'antd';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * DesignPreviewTemplate 负责把 designState 映射成纸质 proof 版式。
 * 被 PrintPreviewModal 与 OrderInfoModal 共用，支持只读或可编辑模式。
 */
const DesignPreviewTemplate = ({
                                 designState,
                                 proofImage,
                                 orderInfo = {},
                                 onInfoChange = null
                               }) => {
  // 1. 单位转换：内部仍然是米/英尺，预览需要英寸并四舍五入
  const formatDim = (val) => {
    if (!val) return 0;
    return (val * 39.37).toFixed(0);
  };

  // 2. 提取数据
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

  // 3. 渲染辅助函数：根据是否传入 onInfoChange 决定 Input 或纯文本
  const renderField = (field, placeholder) => {
    const value = orderInfo[field];
    if (onInfoChange) {
      return (
        <Input
          value={value}
          onChange={e => onInfoChange(field, e.target.value)}
          placeholder={placeholder}
          bordered={false}
          size="small"
          style={{ borderBottom: '1px solid #ccc', borderRadius: 0, padding: '0 2px', width: '100%', fontSize: '12px' }}
        />
      );
    }
    return (
      <span style={{
        fontSize: '12px', // 【修改】字体变大
        color: '#000',
        marginLeft: '8px',
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {value || ''}
      </span>
    );
  };

  const renderTextArea = () => {
    if (onInfoChange) {
      return (
        <TextArea
          value={orderInfo.message}
          onChange={e => onInfoChange('message', e.target.value)}
          placeholder="Message..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          bordered={false}
          style={{ borderBottom: '1px solid #ccc', borderRadius: 0, padding: '0', fontSize: '12px', resize: 'none' }}
        />
      );
    }
    return (
      <div style={{
        minHeight: '36px',
        fontSize: '12px', // 【修改】字体变大
        color: '#000',
        marginTop: '4px',
        whiteSpace: 'pre-wrap'
      }}>
        {orderInfo.message || ''}
      </div>
    );
  };

  // 【修改】字体变大
  const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#333', flexShrink: 0 };
  const boxStyle = { padding: '5px', marginBottom: '15px' };

  return (
    <div className="design-preview-template" style={{ padding: '30px', background: 'white', width: '100%', height: '100%', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* === 上半部分：三列布局 === */}
      <div style={{ display: 'flex', flex: 1, gap: '10px', alignItems: 'stretch' }}>

        {/* --- 第一列 (左侧)：基本信息 + 设计规格 --- */}
        {/* 【修改】宽度增加到 32%，以便容纳更大的文字，同时将中间内容向右挤 */}
        <div style={{ width: '32%', display: 'flex', flexDirection: 'column' }}>

          {/* 1. Basic Info */}
          <div style={boxStyle}>
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline' }}>
              <Text style={labelStyle}>Contract #:</Text>
              {renderField('contract', '')}
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline' }}>
              <Text style={labelStyle}>Cemetery Name & Loc:</Text>
              {renderField('cemetery', '')}
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline' }}>
              <Text style={labelStyle}>Director Name:</Text>
              {renderField('director', '')}
            </div>

            <div>
              <Text style={labelStyle}>Message:</Text>
              {renderTextArea()}
            </div>
          </div>

          {/* 2. Design Specs */}
          <div style={{ ...boxStyle, flex: 1, marginBottom: 0 }}>
            {/* 【修改】标题字号微调 */}
            <Title level={5} style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px', textDecoration: 'underline' }}>Design Specifications</Title>

            <div style={{ marginBottom: '12px' }}>
              <Text style={labelStyle}>Artworks / Etchings:</Text>
              {/* 【修改】内容字号变大 */}
              <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.4' }}>{usedArts || 'None'}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <Text style={labelStyle}>Fonts:</Text>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>{usedFonts || 'Default'}</div>
            </div>

            <div>
              <Text style={labelStyle}>Inscriptions:</Text>
              <ul style={{ paddingLeft: '18px', margin: '4px 0', fontSize: '12px' }}>
                {textElements.length > 0 ? textElements.map((t, i) => <li key={i}>{t.content}</li>) : <li>None</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* --- 第二列 (中间)：预览图 + 尺寸 --- */}
        {/* 【修改】宽度减小到 43%，为左侧腾出空间，视觉上图片会右移 */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 预览图容器 */}
          <div style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px',
            marginBottom: '10px'
          }}>
            {proofImage ? (
              <Image
                src={proofImage}
                alt="Design Proof"
                preview={false}
                style={{ maxHeight: '500px', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#ccc', fontSize: '12px' }}>Generating Preview...</div>
            )}
          </div>

          {/* 尺寸信息 */}
          <div style={{ width: '100%', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            <div>Tablet: {formatDim(monument.dimensions?.length)}" x {formatDim(monument.dimensions?.width)}" x {formatDim(monument.dimensions?.height)}" {monument.polish}</div>
            {base && (
              <div style={{ marginTop: '2px' }}>Base: {formatDim(base.dimensions?.length)}" x {formatDim(base.dimensions?.width)}" x {formatDim(base.dimensions?.height)}" {base.polish}</div>
            )}
            {subBase && (
              <div style={{ marginTop: '2px' }}>SubBase: {formatDim(subBase.dimensions?.length)}" x {formatDim(subBase.dimensions?.width)}" x {formatDim(subBase.dimensions?.height)}" {subBase.polish}</div>
            )}
          </div>
        </div>

        {/* --- 第三列 (右侧)：Logo + 花瓶 --- */}
        <div style={{ width: '15%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {/* Logo */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <img src="/Arbor White Logo.png" alt="Arbor Memorial" style={{ height: '60px', filter: 'invert(1)', objectFit: 'contain' }} />
          </div>

          {/* 花瓶信息 */}
          <div style={{
            padding: '10px',
            width: '100%',
            minHeight: '80px',
            textAlign: 'right'
          }}>
            <Text style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>Vases:</Text>
            <div style={{ fontSize: '12px' }}>
              {vases.length > 0 ? vases.map((v, i) => (
                <div key={i} style={{ marginBottom: '2px' }}>{v.name || v.class}</div>
              )) : <span style={{ color: '#999' }}>None</span>}
            </div>
          </div>
        </div>

      </div>

      {/* === 下半部分：固定法律条款 === */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', fontSize: '12px', lineHeight: '1.4', color: '#333' }}>

        {/* 法语条款 */}
        <p style={{ marginBottom: '4px' }}>
          <strong>Note au client :</strong> Le fournisseur du monument peut apporter des modifications mineures à ce modèle afin de veiller à ce que la conception soit adaptée à la sculpture et à une production de la meilleure qualité. Avant la fabrication, le fournisseur produira un croquis, qui sera soumis à votre approbation.
        </p>
        <p style={{ marginBottom: '10px' }}>
          Ma signature ci-après indique que je reconnais avoir étudié l'inscription ci-dessus, certifie que les détails fournis sont corrects, et que j'autorise le fournisseur à effectuer les ajustements nécessaires.
        </p>

        {/* 英语条款 */}
        <p style={{ marginBottom: '4px' }}>
          <strong>Note to Customer:</strong> Minor necessary adjustments in this conceptual design may be made by the Monument Vendor to ensure that the design is suitable for carving and the best quality production. A Vendor provided sketch will be issued for your approval prior to manufacturing.
        </p>
        <p style={{ marginBottom: '20px' }}>
          By signing below, I acknowledge that I have examined the above inscription and certify that the provided details are correct and that I allow the vendor to make any necessary adjustments.
        </p>

        {/* 签名行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', marginBottom: '20px' }}>
          <div style={{ width: '45%', display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', marginRight: '8px', marginBottom: '2px' }}>Signed</span>
            <div style={{ flex: 1, borderBottom: '1px solid black' }}></div>
          </div>
          <div style={{ width: '45%', display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', marginRight: '8px', marginBottom: '2px' }}>Date</span>
            <div style={{ flex: 1, borderBottom: '1px solid black' }}></div>
          </div>
        </div>

        {/* 版权声明 */}
        <div style={{ fontSize: '9px', color: '#666' }}>
          <p style={{ marginBottom: '2px' }}>
            Avis relatif aux droits d'auteur: Le modèle, la mise en page, l'aspect, l'apparence et les graphismes sont la propriété de MonumentPro Inc. et de l'entreprise de monuments commémoratifs susmentionnée. Ils sont protégés par les lois applicables en matière de droits d'auteur. Toute utilisation ou reproduction non autorisée est interdite.
          </p>
          <p>
            Copyright notice: The design, layout, look, appearance and graphics are property of MonumentPro Inc., and the memorial company listed above, and is protected by applicable copyright laws. Unauthorized use or duplication is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignPreviewTemplate;