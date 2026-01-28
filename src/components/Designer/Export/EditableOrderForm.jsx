import React, { useEffect, useMemo } from 'react';
import { Form, Input, Checkbox, Row, Col, DatePicker } from 'antd';
import dayjs from 'dayjs';
import './EditableOrderForm.css';

/**
 * EditableOrderForm 用于在导出 PDF 前快速填写/修正合同字段。
 * 根据 designState 动态显示碑体、底座、花瓶、艺术件的实际数据
 * 支持多个碑体、底座、花瓶的展示
 */
const EditableOrderForm = ({ form, initialData, designState, savedArtOptions = [] }) => {
  // =========== 数据提取和转换 ===========
  
  /**
   * 标准尺寸转换函数：
   * 模型内部尺寸单位为米（m）
   * 转换规则：米 → 英寸 → 英尺-英寸 (分数格式，带 12 寸进位处理)
   * 例：0.06096m = 2.4 inches = 2'-0"
   * 按照标准：分数部分四舍五入到最近的 1/4, 1/2, 3/4
   * 重要：满 12 寸则向前进 1 英尺，如 1'-12" 应显示为 2'-0"
   */
  const convertMetersToFeetInchFraction = (meters) => {
    if (!meters) return '';
    
    // 第一步：米 → 英寸 (1 米 = 39.37 英寸)
    const totalInches = meters * 39.37;
    
    // 第二步：英寸 → 英尺和剩余英寸
    let feet = Math.floor(totalInches / 12);
    let remainingInches = totalInches - (feet * 12);
    
    // 第三步：剩余英寸四舍五入到最近的 1/4
    const roundedInches = Math.round(remainingInches * 4) / 4;
    
    // 第四步：处理 12 寸进位情况
    if (roundedInches >= 12) {
      feet += Math.floor(roundedInches / 12);
      remainingInches = roundedInches % 12;
    } else {
      remainingInches = roundedInches;
    }
    
    // 第五步：格式化输出
    if (remainingInches === 0) {
      // 整数英尺
      return `${feet}'-0"`;
    } else if (remainingInches % 1 === 0) {
      // 整数英寸（无分数）
      return `${feet}'-${Math.round(remainingInches)}"`;
    } else {
      // 分数英寸（1/4, 1/2, 3/4 等）
      const decimalPart = remainingInches % 1;
      const wholeInches = Math.floor(remainingInches);
      let fractionStr = '';
      
      // 四舍五入到最近的分数
      if (Math.abs(decimalPart - 0.25) < 0.01) fractionStr = '1/4';
      else if (Math.abs(decimalPart - 0.5) < 0.01) fractionStr = '1/2';
      else if (Math.abs(decimalPart - 0.75) < 0.01) fractionStr = '3/4';
      else if (decimalPart > 0) fractionStr = decimalPart.toFixed(2);
      
      // 组合显示：如 "1 1/4" 或仅 "1/4"
      if (wholeInches > 0) {
        return `${feet}'-${wholeInches} ${fractionStr}"`;
      } else {
        return `${feet}'-${fractionStr}"`;
      }
    }
  };

  // 提取设计中的碑体、底座、花瓶、艺术件
  const designModels = useMemo(() => {
    const monuments = designState?.monuments || [];
    const bases = designState?.bases || [];
    const vases = designState?.vases || [];
    const arts = savedArtOptions || [];

    // ✅ 优化：只有数量 > 1 时才添加序号
    return {
      monuments: monuments.map((m, idx) => ({
        ...m,
        sequenceNumber: idx + 1,
        // 只在多个碑体时显示序号
        productCode: monuments.length > 1 ? `${m.family || 'Tablet'}_${idx + 1}` : m.family || 'Tablet'
      })),
      bases: bases.map((b, idx) => ({
        ...b,
        sequenceNumber: idx + 1,
        // 只在多个底座时显示序号
        productCode: bases.length > 1 ? `${b.type || 'Base'}_${idx + 1}` : b.type || 'Base'
      })),
      vases: vases.map((v, idx) => ({
        ...v,
        sequenceNumber: idx + 1,
        // 只在多个花瓶时显示序号
        vaseCode: vases.length > 1 ? `${v.class || 'Vase'}_${idx + 1}` : v.class || 'Vase',
        // 提取 SIZE：从 name 中获取尺寸部分 (例：'Round Vase 4.5 x7.25' → '4.5 x 7.25')
        sizeFromName: v.name ? v.name.replace(/^.*\s(\d+\.?\d*\s*[x×]\s*\d+\.?\d*).*$/, '$1').trim() : ''
      })),
      arts: arts.map((a, idx) => ({
        ...a,
        sequenceNumber: idx + 1,
        // 艺术件的 PATTERN CODE 从 name 或 imagePath 提取
        patternCode: a.name || a.imagePath?.split('/').pop()?.replace('.png', '') || `Art_${idx + 1}`
      }))
    };
  }, [designState, savedArtOptions]);

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      const dateFields = ['date', 'installationDate'];
      const formattedData = { ...initialData };
      
      dateFields.forEach(field => {
        if (formattedData[field]) formattedData[field] = dayjs(formattedData[field]);
      });

      // 初始化碑体数据
      designModels.monuments.forEach((monument, idx) => {
        const prefix = `tablet_${idx}`;
        formattedData[`${prefix}_length`] = formattedData[`${prefix}_length`] || convertMetersToFeetInchFraction(monument.dimensions?.length);
        formattedData[`${prefix}_width`] = formattedData[`${prefix}_width`] || convertMetersToFeetInchFraction(monument.dimensions?.width);
        formattedData[`${prefix}_height`] = formattedData[`${prefix}_height`] || convertMetersToFeetInchFraction(monument.dimensions?.height);
        formattedData[`${prefix}_polish`] = formattedData[`${prefix}_polish`] || monument.polish || '';
        formattedData[`${prefix}_color`] = formattedData[`${prefix}_color`] || monument.color || '';
        formattedData[`${prefix}_productCode`] = formattedData[`${prefix}_productCode`] || monument.productCode;
      });

      // 初始化底座数据
      designModels.bases.forEach((base, idx) => {
        const prefix = `base_${idx}`;
        formattedData[`${prefix}_length`] = formattedData[`${prefix}_length`] || convertMetersToFeetInchFraction(base.dimensions?.length);
        formattedData[`${prefix}_width`] = formattedData[`${prefix}_width`] || convertMetersToFeetInchFraction(base.dimensions?.width);
        formattedData[`${prefix}_height`] = formattedData[`${prefix}_height`] || convertMetersToFeetInchFraction(base.dimensions?.height);
        formattedData[`${prefix}_polish`] = formattedData[`${prefix}_polish`] || base.polish || '';
        formattedData[`${prefix}_color`] = formattedData[`${prefix}_color`] || base.color || '';
        // ✅ 处理 PRODUCT CODE：如果以 base 开头（不区分大小写），将 b 改为大写 B
        let productCode = formattedData[`${prefix}_productCode`] || base.productCode || '';
        if (productCode && productCode.toLowerCase().startsWith('base')) {
          productCode = 'Base' + productCode.substring(4);
        }
        formattedData[`${prefix}_productCode`] = productCode;
      });

      // ✅ 新增：初始化花瓶数据
      designModels.vases.forEach((vase, idx) => {
        const prefix = `vase_${idx}`;
        formattedData[`${prefix}_size`] = formattedData[`${prefix}_size`] || vase.sizeFromName;
        formattedData[`${prefix}_color`] = formattedData[`${prefix}_color`] || vase.color || '';
        formattedData[`${prefix}_qty`] = formattedData[`${prefix}_qty`] || '';
        formattedData[`${prefix}_vaseCode`] = formattedData[`${prefix}_vaseCode`] || vase.vaseCode;
      });

      // ✅ 新增：初始化艺术件数据
      designModels.arts.forEach((art, idx) => {
        const prefix = `art_${idx}`;
        formattedData[`${prefix}_patternCode`] = formattedData[`${prefix}_patternCode`] || art.patternCode;
        formattedData[`${prefix}_qty`] = formattedData[`${prefix}_qty`] || '';
      });

      form.setFieldsValue(formattedData);
    }
  }, [initialData, designState, designModels, form]);

  // --- 辅助组件 ---
  const RenderRow = ({ label, name, labelWidth = '110px' }) => (
    <div className="pdf-form-row">
      <span className="pdf-label" style={{ width: labelWidth }}>{label}</span>
      <Form.Item name={name} className="pdf-input-item">
        <Input className="pdf-input-box" />
      </Form.Item>
    </div>
  );

  const InlineField = ({ label, name, width = 'auto', flex = 1 }) => (
    <div className="pdf-inline-field" style={{ width, flex }}>
      <span className="pdf-label-small">{label}</span>
      <Form.Item name={name} className="pdf-input-item">
        <Input className="pdf-input-box" />
      </Form.Item>
    </div>
  );

  // ✅ 复选框组件（用于所有地方）
  const CheckItem = ({ label, name }) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
      <Checkbox className="pdf-check-item">
        <span className="pdf-check-label">{label}</span>
      </Checkbox>
    </Form.Item>
  );

  return (
    <div className="editable-order-form-container">
      <div className="pdf-header">
        <div className="pdf-logo"><img src="/Arbor White Logo.png" alt="Arbor Memorial" style={{ height: '50px', filter: 'invert(1)' }} /></div>
        <div className="pdf-title">MONUMENT SPECIFICATION & AUTHORIZATION<br />TO MANUFACTURE FORM</div>
      </div>
      <div className="pdf-header-line"></div>

      <Form form={form} component={false}>

        {/* 1. CONTRACT INFORMATION：对应纸质表单第一页左上角 */}
        <div className="pdf-section-box">
          <div className="pdf-section-title">CONTRACT INFORMATION</div>
          <div className="pdf-split-layout">
            <div className="pdf-col-left">
              <RenderRow label="CONTRACT NO.:" name="contractNo" />
              <RenderRow label="CEMETERY:" name="cemetery" />
              <RenderRow label="FAMILY NAME:" name="familyName" />
              <RenderRow label="COUNSELLOR:" name="counsellor" />
              {/* ✅ 改为多选框样式 */}
              <div className="pdf-checkbox-group-vertical">
                <CheckItem label="AT-NEED" name="atNeed" />
                <CheckItem label="PRE-NEED NOW (TO BE CARVED)" name="preNeedCarved" />
                <CheckItem label="PRE-NEED ORDER NOW (INSTALL W/O CARVING)" name="preNeedNoCarved" />
              </div>
            </div>
            <div className="pdf-col-right">
              <div className="pdf-right-top">
                <div className="pdf-right-header">MONUMENT TO BE INSTALLED ON THE FOLLOWING LOCATION:</div>
                <RenderRow label="GARDEN:" name="garden" labelWidth="60px" />
                <RenderRow label="LOT:" name="lot" labelWidth="60px" />
                <RenderRow label="SPACE:" name="space" labelWidth="60px" />
                <RenderRow label="ROW:" name="row" labelWidth="60px" />
              </div>
              <div className="pdf-right-bottom">
                <div className="pdf-right-header">INSTALLATION VERIFIED BY PROPERTY MANAGER:</div>
                <RenderRow label="NAME:" name="managerName" labelWidth="50px" />
                <RenderRow label="DATE:" name="date" labelWidth="50px" />
              </div>
            </div>
          </div>
          <div className="pdf-section-footer-row">
            <span>REQUEST FOR ARTWORK FORM OR MONUMENT DESIGNER (AMD) SKETCH ATTACHED</span>
            <div style={{marginLeft: '20px', display:'flex', gap:'10px'}}>
              <CheckItem label="YES" name="sketchYes" />
              <CheckItem label="NO" name="sketchNo" />
            </div>
          </div>
        </div>

        {/* === 2. MEMORIAL INFORMATION === */}
        <div className="pdf-section-box">
          <div className="pdf-section-title">MEMORIAL INFORMATION</div>
          <div className="pdf-content-padding">

            {/* --- PRODUCT TYPE / SUPPLIER / PROFILE --- */}
            <div className="pdf-flex-row border-bottom" style={{ paddingBottom: '8px', alignItems: 'center' }}>
              {/* SUPPLIER - 在同一行 */}
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                <span className="pdf-label-bold" style={{ marginRight: '8px' }}>SUPPLIER:</span>
                <Form.Item name="supplier" className="pdf-input-item" style={{ marginBottom: 0, flex: 1, minWidth: '175px' }}>
                  <Input className="pdf-input-box" />
                </Form.Item>
              </div>

              {/* PROFILE - 在同一行 */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="pdf-label-bold" style={{ marginRight: '8px' }}>PROFILE:</span>
                <div className="pdf-checkbox-row" style={{ flexDirection: 'row', gap: 'px' }}>
                  <CheckItem label="SERP" name="profileSerp" />
                  <CheckItem label="FLAT" name="profileFlat" />
                  <CheckItem label="BYZANTINE" name="profileByzantine" />
                </div>
              </div>
                {/* PRODUCT TYPE */}
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                <span className="pdf-label-bold" style={{ marginRight: '8px' }}>PRODUCT TYPE:</span>
                <div className="pdf-checkbox-row" style={{ flexDirection: 'row', gap: '8px' }}>
                  <CheckItem label="CORE" name="typeCore" />
                  <CheckItem label="CUSTOM" name="typeCustom" />
                </div>
              </div>
              {/* Other */}
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                <span className="pdf-label-bold" style={{ marginRight: '8px' }}>OTHER:</span>
                <Form.Item name="supplier" className="pdf-input-item" style={{ marginBottom: 0, flex: 1, minWidth: '175px' }}>
                  <Input className="pdf-input-box" />
                </Form.Item>
              </div>
            </div>

            {/* --- 碑体 (TABLETS) --- */}
            {designModels.monuments.length > 0 && (
              <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <span className="pdf-label-bold" style={{ width: '80px' }}>TABLETS:</span>
                <div style={{ flex: 1 }}>
                  {designModels.monuments.map((tablet, idx) => (
                    <div key={`tablet-${idx}`} style={{ marginBottom: idx < designModels.monuments.length - 1 ? '6px' : 0 }}>
                      <div className="pdf-flex-row" style={{ gap: '15px', alignItems: 'center' }}>
                        <InlineField label="LENGTH:" name={`tablet_${idx}_length`} width="95px" flex="none" />
                        <InlineField label="THICKNESS:" name={`tablet_${idx}_width`} width="110px" flex="none" />
                        <InlineField label="HEIGHT:" name={`tablet_${idx}_height`} width="95px" flex="none" />
                        <InlineField label="POLISH:" name={`tablet_${idx}_polish`} width="80px" flex="none" />
                        <InlineField label="COLOR:" name={`tablet_${idx}_color`} width="100px" flex="none" />
                        {/* ✅ 优化：PRODUCT CODE 改为输入框可编辑 */}
                        <InlineField label="PRODUCT CODE:" name={`tablet_${idx}_productCode`} width="140px" flex="none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- 底座 (BASES) --- */}
            {designModels.bases.length > 0 && (
              <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <span className="pdf-label-bold" style={{ width: '80px' }}>BASES:</span>
                <div style={{ flex: 1 }}>
                  {designModels.bases.map((base, idx) => (
                    <div key={`base-${idx}`} style={{ marginBottom: idx < designModels.bases.length - 1 ? '6px' : 0 }}>
                      <div className="pdf-flex-row" style={{ gap: '15px', alignItems: 'center' }}>
                        <InlineField label="LENGTH:" name={`base_${idx}_length`} width="95px" flex="none" />
                        <InlineField label="THICKNESS:" name={`base_${idx}_width`} width="110px" flex="none" />
                        <InlineField label="HEIGHT:" name={`base_${idx}_height`} width="95px" flex="none" />
                        <InlineField label="POLISH:" name={`base_${idx}_polish`} width="80px" flex="none" />
                        <InlineField label="COLOR:" name={`base_${idx}_color`} width="100px" flex="none" />
                        {/* ✅ 优化：PRODUCT CODE 改为输入框可编辑 */}
                        <InlineField label="PRODUCT CODE:" name={`base_${idx}_productCode`} width="140px" flex="none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* === 3. ENHANCEMENTS：可选配件/艺术件 === */}
        <div className="pdf-section-box">
          <div className="pdf-section-title">ENHANCEMENTS</div>
          <div className="pdf-content-padding">

            {/* 花瓶 (VASES) - 动态根据设计中的花瓶数量生成 */}
            {designModels.vases.length > 0 && (
              <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <span className="pdf-label-bold" style={{ width: '80px' }}>VASES:</span>
                <div style={{ flex: 1 }}>
                  {designModels.vases.map((vase, idx) => (
                    <div key={`vase-${idx}`} style={{ marginBottom: idx < designModels.vases.length - 1 ? '6px' : 0 }}>
                      <div className="pdf-flex-row" style={{ gap: '15px', alignItems: 'center' }}>
                        {/* ✅ 优化：SIZE 改为输入框可编辑 */}
                        <InlineField label="SIZE:" name={`vase_${idx}_size`} width="130px" flex="none" />
                        <InlineField label="COLOR:" name={`vase_${idx}_color`} width="100px" flex="none" />
                        <InlineField label="QTY:" name={`vase_${idx}_qty`} width="80px" flex="none" />
                        {/* ✅ 优化：VASE CODE 改为输入框可编辑 */}
                        <InlineField label="VASE CODE:" name={`vase_${idx}_vaseCode`} width="130px" flex="none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 艺术件 (PICTURES) - 动态根据设计中的艺术件数量生成 */}
            {designModels.arts.length > 0 && (
              <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                <span className="pdf-label-bold" style={{ width: '80px' }}>PICTURES:</span>
                <div style={{ flex: 1 }}>
                  {designModels.arts.map((art, idx) => (
                    <div key={`art-${idx}`} style={{ marginBottom: idx < designModels.arts.length - 1 ? '6px' : 0 }}>
                      <div className="pdf-flex-row" style={{ gap: '15px', alignItems: 'center' }}>
                        {/* ✅ 优化：PATTERN CODE 改为输入框可编辑 */}
                        <InlineField label="PATTERN CODE:" name={`art_${idx}_patternCode`} width="150px" flex="none" />
                        <InlineField label="QTY:" name={`art_${idx}_qty`} width="80px" flex="none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lucky Cube */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '95px' }}>Lucky Cube:</span>
              <InlineField label="SIZE:" name="lampSize" flex={2} />
              <InlineField label="SUPPLIER:" name="lampSupplier" flex={2} />
              <InlineField label="QTY:" name="lampQty" width="50px" flex="none" />
              <InlineField label="PC:" name="lampPC" flex={2} />
            </div>

            {/* Incense Burner */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '95px' }}>Incense Burner:</span>
              <InlineField label="SIZE:" name="lampSize" flex={2} />
              <InlineField label="SUPPLIER:" name="lampSupplier" flex={2} />
              <InlineField label="QTY:" name="lampQty" width="50px" flex="none" />
              <InlineField label="PC:" name="lampPC" flex={2} />
            </div>

            {/* Bronze Lamps */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '95px' }}>BRONZE LAMPS:</span>
              <InlineField label="SIZE:" name="lampSize" flex={2} />
              <InlineField label="SUPPLIER:" name="lampSupplier" flex={2} />
              <InlineField label="QTY:" name="lampQty" width="50px" flex="none" />
              <InlineField label="PC:" name="lampPC" flex={2} />
            </div>

            {/* Statues */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '60px' }}>STATUES:</span>
              <InlineField label="MATERIAL:" name="statueMaterial" flex={1.5} />
              <InlineField label="SIZE:" name="statueSize" flex={1} />
              <InlineField label="COLOUR:" name="statueColor" flex={1} />
              <InlineField label="SUPPLIER:" name="statueSupplier" flex={1.5} />
              <InlineField label="QTY:" name="statueQty" width="50px" flex="none" />
            </div>

            {/* Cameo Pictures */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '105px' }}>CAMEO PICTURES:</span>
              <InlineField label="SIZE:" name="cameoSize" flex={1.5} />
              <InlineField label="COLOUR:" name="cameoColor" flex={1.5} />
              <InlineField label="SUPPLIER:" name="cameoSupplier" flex={1.5} />
              <InlineField label="QTY:" name="cameoQty" width="50px" flex="none" />
            </div>

            {/* Etchings */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '60px' }}>ETCHINGS:</span>
              <InlineField label="DESCRIPTION:" name="etchingDesc" flex={3} />
              <InlineField label="SIZE:" name="etchingSize" width="100px" flex="none" />
              <InlineField label="QTY:" name="etchingQty" width="50px" flex="none" />

              <div className="pdf-inline-field" style={{ flex: 'none', width: 'auto', marginLeft: '10px' }}>
                <span className="pdf-label-small" style={{ marginRight: '5px' }}>PHOTO MEETS QUALITY REQUIREMENTS:</span>
                <div className="pdf-checkbox-row" style={{ gap: '10px' }}>
                  <CheckItem label="YES" name="etchingYes" />
                  <CheckItem label="NO" name="etchingNo" />
                </div>
              </div>
            </div>

            {/* Other */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '50px' }}>OTHER:</span>
              <InlineField label="DESCRIPTION:" name="otherDesc2" flex={3} />
              <InlineField label="SIZE:" name="otherSize" width="80px" flex="none" />
              <InlineField label="QTY:" name="otherQty" width="50px" flex="none" />
              <InlineField label="PC:" name="otherPC" width="100px" flex="none" />
            </div>

            {/* Special Instructions */}
            <div className="pdf-flex-row" style={{ paddingTop: '8px' }}>
              <span className="pdf-label-bold" style={{ width: '50px' }}>SUPPLIER:</span>
              <Form.Item name="finalInstructions" className="pdf-input-item" style={{ flex: 1 }}>
                <Input className="pdf-input-box" />
              </Form.Item>
              <span className="pdf-label-bold" style={{ width: '135px' }}>SPECIAL INSTRUCTIONS:</span>
              <Form.Item name="finalInstructions" className="pdf-input-item" style={{ flex: 1 }}>
                <Input className="pdf-input-box" />
              </Form.Item>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="pdf-footer-text">
          <p>* Delivery on core line monuments is approximately 12 weeks from the date approved artwork is received by supplier.</p>
          <p>** Delivery on custom monuments is approximately 20 weeks from date approved artwork is received by supplier.</p>
          <p>Monument installation is weather dependent...</p>
          <p>I hereby authorize Arbor Memorial...</p>
        </div>
        <div className="pdf-signatures">
          <RenderRow label="PURCHASER:" name="sigPurchaser" />
          <RenderRow label="FAMILY COUNSELLOR:" name="sigCounsellor" />
          <RenderRow label="DATE:" name="sigDate" />
        </div>

      </Form>
    </div>
  );
};

export default EditableOrderForm;