import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// 定义边框和表格样式
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 9, fontFamily: 'Helvetica' },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase' },

  // 区域块
  // 【修复】border: 1 -> borderWidth: 1, borderStyle: 'solid'
  section: { borderWidth: 1, borderStyle: 'solid', borderColor: '#000', marginBottom: -1 },

  // 【修复】borderBottom: 1 -> borderBottomWidth: 1, borderBottomStyle: 'solid'
  sectionHeader: { backgroundColor: '#f0f0f0', padding: 4, borderBottomWidth: 1, borderBottomStyle: 'solid', borderColor: '#000', fontWeight: 'bold' },

  // 【修复】borderBottom: 1 -> borderBottomWidth: 1, borderBottomStyle: 'solid'
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomStyle: 'solid', borderColor: '#ccc', minHeight: 20, alignItems: 'center' },

  lastRow: { flexDirection: 'row', minHeight: 20, alignItems: 'center' },

  // 单元格
  label: { width: '20%', padding: 4, fontSize: 8, color: '#444' },
  field: { flex: 1, padding: 4, fontSize: 10 },

  // 【修复】borderRight: 1 -> borderRightWidth: 1, borderRightStyle: 'solid'
  halfField: { width: '50%', padding: 4, borderRightWidth: 1, borderRightStyle: 'solid', borderColor: '#ccc' },

  // 复选框模拟
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },

  // 【修复】border: 1 -> borderWidth: 1, borderStyle: 'solid'
  box: { width: 10, height: 10, borderWidth: 1, borderStyle: 'solid', borderColor: '#000', marginRight: 4, justifyContent: 'center', alignItems: 'center' },

  checked: { fontSize: 8 },
});

// 辅助组件：复选框
const Checkbox = ({ label, checked }) => (
  <View style={styles.checkboxRow}>
    <View style={styles.box}>
      {checked && <Text style={styles.checked}>X</Text>}
    </View>
    <Text>{label}</Text>
  </View>
);

const OrderFormPDF = ({ designState, orderMeta }) => {
  // 安全获取数据，防止 undefined 报错
  const monument = designState.monuments && designState.monuments.length > 0
    ? designState.monuments[0]
    : { class: '', dimensions: { length: 0, width: 0, height: 0 }, color: '', polish: '' };

  const base = designState.bases && designState.bases.length > 0
    ? designState.bases[0]
    : null;

  const textElements = designState.textElements || [];
  const vases = designState.vases || [];

  const safeStr = (str) => str || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Monument Specifications & Authorization</Text>

        {/* 1. CONTRACT INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. CONTRACT INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.halfField}>{new Date().toLocaleDateString()}</Text>
            <Text style={styles.label}>Contract No.:</Text>
            <Text style={styles.field}>{orderMeta?.orderNumber || ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cemetery:</Text>
            <Text style={styles.halfField}>{orderMeta?.cemetery || ''}</Text>
            <Text style={styles.label}>Salesperson:</Text>
            <Text style={styles.field}>{orderMeta?.director || ''}</Text>
          </View>
          <View style={styles.lastRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.field}>Lot: {orderMeta?.lot || 'N/A'}   Space: {orderMeta?.space || 'N/A'}</Text>
          </View>
        </View>

        {/* 2. MEMORIAL INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. MEMORIAL INFORMATION</Text>

          {/* TABLET */}
          <View style={styles.row}>
            <Text style={{...styles.label, fontWeight: 'bold'}}>MONUMENT (Tablet):</Text>
            <View style={{flexDirection: 'row', padding: 4, flex: 1}}>
              <Checkbox label="Serp" checked={safeStr(monument.class).includes('Serp')} />
              <Checkbox label="Flat" checked={safeStr(monument.class).includes('Flat')} />
              <Checkbox label="Other" checked={!safeStr(monument.class).includes('Serp') && !safeStr(monument.class).includes('Flat')} />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Dimensions:</Text>
            <Text style={styles.field}>
              L: {monument.dimensions?.length || 0}" x W: {monument.dimensions?.width || 0}" x H: {monument.dimensions?.height || 0}"
            </Text>
            <Text style={styles.label}>Color:</Text>
            <Text style={styles.field}>{monument.color}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tablet Polish:</Text>
            <View style={{padding: 4}}>
              <Checkbox label="P5 (All Polished)" checked={monument.polish === 'P5'} />
              <Checkbox label="P3 (Front/Back/Top)" checked={monument.polish === 'P3'} />
              <Checkbox label="P2 (Front/Back)" checked={monument.polish === 'P2'} />
            </View>
          </View>

          {/* BASE */}
          {base && (
            <>
              {/* 【修复】borderTop: 1 -> borderTopWidth: 1, borderTopStyle: 'solid' */}
              <View style={{...styles.row, borderTopWidth: 1, borderTopStyle: 'solid', borderColor: '#000'}}>
                <Text style={{...styles.label, fontWeight: 'bold'}}>BASE:</Text>
                <Text style={styles.field}>
                  L: {base.dimensions?.length || 0}" x W: {base.dimensions?.width || 0}" x H: {base.dimensions?.height || 0}"
                </Text>
                <Text style={styles.label}>Base Color:</Text>
                <Text style={styles.field}>{base.color}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Base Polish:</Text>
                <View style={{padding: 4}}>
                  <Checkbox label="Polished Top (PT)" checked={safeStr(base.polish).includes('PT') || safeStr(base.polish).includes('P1')} />
                  <Checkbox label="Polished Margin" checked={safeStr(base.polish).includes('PM')} />
                </View>
              </View>
            </>
          )}
        </View>

        {/* 3. ENHANCEMENTS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. ENHANCEMENTS / INSCRIPTIONS</Text>

          {/* Vases */}
          <View style={styles.row}>
            <Checkbox label="Vases" checked={vases.length > 0} />
            <Text style={styles.field}>
              Qty: {vases.length} | Type: {vases[0]?.class || 'N/A'}
            </Text>
          </View>

          {/* Text Summary */}
          <View style={{padding: 5}}>
            <Text style={{fontWeight: 'bold', marginBottom: 2}}>Full Inscription:</Text>
            {textElements.map((t, i) => (
              <Text key={i} style={{marginLeft: 10, fontSize: 8}}>
                • {t.content} ({t.engraveType}) - {t.font}
              </Text>
            ))}
          </View>

          {/* 【修复】borderTop: 1 -> borderTopWidth: 1, borderTopStyle: 'solid' */}
          <View style={{...styles.row, borderTopWidth: 1, borderTopStyle: 'solid', borderColor: '#ccc'}}>
            <Text style={styles.label}>Special Instructions:</Text>
            <Text style={styles.field}>{orderMeta?.message || 'None'}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{marginTop: 20}}>
          <Text>Delivery: Approx 8 weeks from approved artwork.</Text>
          <View style={{flexDirection: 'row', marginTop: 30, justifyContent: 'space-between'}}>
            {/* 【修复】borderTop: 1 -> borderTopWidth: 1, borderTopStyle: 'solid' */}
            <View style={{borderTopWidth: 1, borderTopStyle: 'solid', borderColor: '#000', width: '40%'}}><Text>Purchaser Signature</Text></View>
            <View style={{borderTopWidth: 1, borderTopStyle: 'solid', borderColor: '#000', width: '40%'}}><Text>Family Counsellor</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default OrderFormPDF;