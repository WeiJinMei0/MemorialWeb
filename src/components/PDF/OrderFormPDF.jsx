import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// 样式定义：尽可能还原“订单表格.pdf”的紧凑布局
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 9, fontFamily: 'Helvetica' },
  headerTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  headerSubTitle: { fontSize: 10, textAlign: 'center', marginBottom: 10 },

  // 通用边框容器
  sectionContainer: { border: '1px solid #000', marginBottom: -1 },

  // 标题栏背景
  sectionTitle: { backgroundColor: '#e0e0e0', padding: 2, fontSize: 9, fontWeight: 'bold', borderBottom: '1px solid #000' },

  // 行布局
  row: { flexDirection: 'row', borderBottom: '1px solid #ccc', minHeight: 14, alignItems: 'center' },
  lastRow: { flexDirection: 'row', minHeight: 14, alignItems: 'center' },

  // 单元格样式
  label: { fontSize: 7, color: '#000', padding: 2, fontWeight: 'bold' },
  value: { fontSize: 8, color: '#333', padding: 2, flex: 1 },

  // 复选框模拟
  checkbox: { width: 8, height: 8, border: '1px solid #000', marginRight: 2, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 6, fontWeight: 'bold' },

  // 辅助布局
  halfWidth: { width: '50%', borderRight: '1px solid #ccc' },
  col3: { width: '33.33%', borderRight: '1px solid #ccc' },
});

// 辅助组件：带标签的复选框
const CheckboxItem = ({ label, checked }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
    <View style={styles.checkbox}>
      {checked && <Text style={styles.checkMark}>X</Text>}
    </View>
    <Text style={{ fontSize: 7 }}>{label}</Text>
  </View>
);

/**
 * OrderFormPDF 负责把 3D 设计状态与订单元数据转换成 PDF（@react-pdf）。
 * 该组件与 EditableOrderForm 保持布局一致，导出时由 OrderInfoModal 调用。
 */
const OrderFormPDF = ({ designState, orderMeta }) => {
  // 1. 提取设计数据：以第一个碑体/底座/花瓶为主
  const monument = designState.monuments?.[0] || { dimensions: {}, color: '', polish: '', class: '' };
  const base = designState.bases?.[0];
  const vases = designState.vases || [];

  // 2. 提取基本信息 (从右侧表单输入)
  // orderMeta.cemetery 可能包含 "Name & Location"，这里简单处理
  const cemeteryName = orderMeta?.cemetery || '';

  // 格式化尺寸 (Inch -> Ft-In 转换逻辑可在此优化，目前直接显示Inch)
  const formatDim = (val) => val ? `${(val * 39.37).toFixed(0)}"` : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ width: '20%' }}>
            {/* Logo 占位 */}
            <Text style={{fontSize: 14, fontWeight: 'bold'}}>Arbor</Text>
            <Text style={{fontSize: 10}}>Memorial</Text>
          </View>
          <View style={{ width: '80%', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>MONUMENT SPECIFICATION & AUTHORIZATION</Text>
            <Text style={styles.headerSubTitle}>TO MANUFACTURE FORM</Text>
          </View>
        </View>

        {/* 1. CONTRACT INFORMATION (自动填充) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONTRACT INFORMATION</Text>

          <View style={styles.row}>
            <View style={{...styles.halfWidth, flexDirection: 'row'}}>
              <Text style={styles.label}>CONTRACT NO.:</Text>
              <Text style={styles.value}>{orderMeta?.orderNumber}</Text>
            </View>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <Text style={styles.label}>GARDEN:</Text>
              <Text style={styles.value}>{/* 留空或解析cemetery */}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{...styles.halfWidth, flexDirection: 'row'}}>
              <Text style={styles.label}>CEMETERY:</Text>
              <Text style={styles.value}>{cemeteryName}</Text>
            </View>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <Text style={styles.label}>LOT:</Text>
              <Text style={styles.value}>{orderMeta?.lot}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{...styles.halfWidth, flexDirection: 'row'}}>
              <Text style={styles.label}>FAMILY NAME:</Text>
              <Text style={styles.value}>{/* 需从某处获取或留空 */}</Text>
            </View>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <Text style={styles.label}>SPACE:</Text>
              <Text style={styles.value}>{orderMeta?.space}</Text>
            </View>
          </View>

          <View style={styles.lastRow}>
            <View style={{...styles.halfWidth, flexDirection: 'row'}}>
              <Text style={styles.label}>COUNSELLOR:</Text>
              <Text style={styles.value}>{orderMeta?.director}</Text>
            </View>
            <View style={{flex: 1, flexDirection: 'row'}}>
              <Text style={styles.label}>DATE:</Text>
              <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* 2. MEMORIAL INFORMATION (自动从 designState 读取) */}
        <View style={{ ...styles.sectionContainer, marginTop: 10 }}>
          <Text style={styles.sectionTitle}>MEMORIAL INFORMATION</Text>

          <View style={styles.row}>
            <Text style={styles.label}>PRODUCT TYPE:</Text>
            <CheckboxItem label="CORE" checked={false} />
            <CheckboxItem label="CUSTOM" checked={true} />
            <Text style={{...styles.label, marginLeft: 20}}>PROFILE:</Text>
            <CheckboxItem label="SERP" checked={monument.class?.includes('Serp')} />
            <CheckboxItem label="FLAT" checked={monument.class?.includes('Flat')} />
            <CheckboxItem label="OTHER" checked={!monument.class?.includes('Serp') && !monument.class?.includes('Flat')} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>COLOUR:</Text>
            <Text style={styles.value}>{monument.color}</Text>
          </View>

          {/* Tablet Size */}
          <View style={styles.row}>
            <Text style={styles.label}>TABLET SIZE:</Text>
            <View style={{flexDirection: 'row', flex: 1}}>
              <Text style={styles.label}>L:</Text>
              <Text style={styles.value}>{formatDim(monument.dimensions?.length)}</Text>
              <Text style={styles.label}>W (Thick):</Text>
              <Text style={styles.value}>{formatDim(monument.dimensions?.width)}</Text>
              <Text style={styles.label}>H:</Text>
              <Text style={styles.value}>{formatDim(monument.dimensions?.height)}</Text>
            </View>
          </View>

          {/* Base Size (如果有) */}
          {base && (
            <View style={styles.row}>
              <Text style={styles.label}>BASE SIZE:</Text>
              <View style={{flexDirection: 'row', flex: 1}}>
                <Text style={styles.label}>L:</Text>
                <Text style={styles.value}>{formatDim(base.dimensions?.length)}</Text>
                <Text style={styles.label}>W:</Text>
                <Text style={styles.value}>{formatDim(base.dimensions?.width)}</Text>
                <Text style={styles.label}>H:</Text>
                <Text style={styles.value}>{formatDim(base.dimensions?.height)}</Text>
              </View>
            </View>
          )}

          {/* Polish Options */}
          <View style={styles.row}>
            <Text style={styles.label}>TABLET POLISH:</Text>
            <View style={{flex: 1}}>
              <CheckboxItem label="P5 (All Polished)" checked={monument.polish === 'P5'} />
              <CheckboxItem label="P3 (Front/Back/Top)" checked={monument.polish === 'P3'} />
              <CheckboxItem label="P2 (Front/Back)" checked={monument.polish === 'P2'} />
            </View>
          </View>

          {base && (
            <View style={styles.row}>
              <Text style={styles.label}>BASE POLISH:</Text>
              <View style={{flexDirection: 'row', flex: 1}}>
                <CheckboxItem label="P1/PT (Polished Top)" checked={base.polish?.includes('P1') || base.polish?.includes('PT')} />
                <CheckboxItem label="Polished Margin" checked={base.polish?.includes('PM')} />
              </View>
            </View>
          )}
        </View>

        {/* 3. ENHANCEMENTS (Vases 等) */}
        <View style={{ ...styles.sectionContainer, marginTop: 10 }}>
          <Text style={styles.sectionTitle}>ENHANCEMENTS</Text>

          <View style={styles.row}>
            <CheckboxItem label="VASES" checked={vases.length > 0} />
            <Text style={styles.label}>SIZE:</Text>
            <Text style={styles.value}>{vases[0] ? formatDim(vases[0].dimensions?.height) : ''}</Text>
            <Text style={styles.label}>COLOUR:</Text>
            <Text style={styles.value}>{vases[0]?.color || ''}</Text>
            <Text style={styles.label}>QTY:</Text>
            <Text style={styles.value}>{vases.length || ''}</Text>
          </View>

          {/* 预留其他 Enhancements 行 */}
          <View style={styles.row}><CheckboxItem label="BRONZE LAMPS" checked={false} /></View>
          <View style={styles.row}><CheckboxItem label="CAMEO PICTURES" checked={false} /></View>
        </View>

        {/* Special Instructions */}
        <View style={{ ...styles.sectionContainer, marginTop: 10, minHeight: 50 }}>
          <Text style={styles.sectionTitle}>SPECIAL INSTRUCTIONS / NOTES</Text>
          <Text style={{ padding: 4, fontSize: 8 }}>{orderMeta?.message}</Text>
        </View>

        {/* Footer Signatures */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 7, fontStyle: 'italic', marginBottom: 10 }}>
            * Delivery on standard monuments is approx 8-12 weeks from approval.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '45%', borderTop: '1px solid #000', paddingTop: 2 }}>
              <Text style={{ fontSize: 8 }}>PURCHASER SIGNATURE</Text>
            </View>
            <View style={{ width: '45%', borderTop: '1px solid #000', paddingTop: 2 }}>
              <Text style={{ fontSize: 8 }}>FAMILY COUNSELLOR SIGNATURE</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 8 }}>DATE: _______________________</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default OrderFormPDF;