import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, marginBottom: 10, textAlign: 'center' },
  contentContainer: { flexDirection: 'row', marginBottom: 20 },
  leftColumn: { width: '35%', paddingRight: 10 },
  rightColumn: { width: '65%' },
  label: { fontSize: 8, color: '#666', marginTop: 5 },
  value: { fontSize: 10, marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', borderBottom: 1, marginBottom: 5, marginTop: 10 },
  proofImage: { width: '100%', height: 300, objectFit: 'contain', border: 1, borderColor: '#eee' },
  footer: { marginTop: 'auto', fontSize: 8, color: '#444', borderTop: 1, paddingTop: 10 },
  signatureLine: { borderBottom: 1, width: 200, marginTop: 20, marginBottom: 5 }
});

const DesignProofPDF = ({ designState, orderMeta, proofImage }) => {
  // 【关键修复】：安全地从数组获取数据
  const monument = designState.monuments && designState.monuments.length > 0
    ? designState.monuments[0]
    : { class: 'N/A', dimensions: { length: 0, width: 0, height: 0 }, color: 'N/A', polish: 'N/A' };

  const base = designState.bases && designState.bases.length > 0
    ? designState.bases[0]
    : null;

  const textElements = designState.textElements || [];
  const artElements = designState.artElements || [];

  // 提取使用的字体列表
  const usedFonts = [...new Set(textElements.map(t => t.font))].join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 头部 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.value}>Contract #: {orderMeta?.orderNumber || ''}</Text>
            <Text style={styles.value}>Cemetery: {orderMeta?.cemetery || ''}</Text>
            <Text style={styles.value}>Director: {orderMeta?.director || ''}</Text>
          </View>
          <Text>Arbor Memorial</Text>
        </View>

        <Text style={styles.title}>Monument Design Proof</Text>

        <View style={styles.contentContainer}>
          {/* 左侧：详细规格 */}
          <View style={styles.leftColumn}>
            <Text style={styles.sectionTitle}>Specifications</Text>

            <Text style={styles.label}>Message:</Text>
            <Text style={styles.value}>{orderMeta?.message || ''}</Text>

            <Text style={styles.label}>Artworks Used:</Text>
            {artElements.map((art, i) => (
              <Text key={i} style={styles.value}>• {art.name || art.subclass} ({art.id})</Text>
            ))}

            <Text style={styles.label}>Fonts Used:</Text>
            <Text style={styles.value}>{usedFonts || 'None'}</Text>

            <Text style={styles.label}>Inscriptions:</Text>
            {textElements.map((text, i) => (
              <Text key={i} style={styles.value}>"{text.content}"</Text>
            ))}

            <Text style={styles.sectionTitle}>Dimensions & Material</Text>
            <Text style={styles.value}>
              Tablet: {monument.dimensions.length}" x {monument.dimensions.width}" x {monument.dimensions.height}"
            </Text>
            <Text style={styles.value}>Color: {monument.color}</Text>
            <Text style={styles.value}>Polish: {monument.polish}</Text>

            {base && (
              <Text style={styles.value}>
                Base: {base.dimensions.length}" x {base.dimensions.width}" x {base.dimensions.height}" ({base.polish})
              </Text>
            )}
          </View>

          {/* 右侧：3D 渲染图 */}
          <View style={styles.rightColumn}>
            {proofImage ? (
              <Image style={styles.proofImage} src={proofImage} />
            ) : (
              <Text>No Preview Available</Text>
            )}
          </View>
        </View>

        {/* 底部：免责声明与签名 */}
        <View style={styles.footer}>
          <Text>
            Note to Customer: Minor necessary adjustments in this conceptual design may be made by the Monument Vendor to ensure that the design is suitable for carving and the best quality production.
          </Text>
          <Text style={{marginTop: 5}}>
            By signing below, I acknowledge that I have examined the above inscription and certify that the provided details are correct.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <View>
              <View style={styles.signatureLine} />
              <Text>Signed (Purchaser)</Text>
            </View>
            <View>
              <View style={styles.signatureLine} />
              <Text>Date</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default DesignProofPDF;