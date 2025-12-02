import React, { useEffect } from 'react';
import { Form, Input, Checkbox, Row, Col, DatePicker } from 'antd';
import dayjs from 'dayjs';
import './EditableOrderForm.css';

/**
 * EditableOrderForm 用于在导出 PDF 前快速填写/修正合同字段。
 * 组件会读取 designState 自动带入碑体、底座、花瓶的尺寸/颜色。
 */
const EditableOrderForm = ({ form, initialData, designState }) => {
  // 初始化数据：把日期字段转成 dayjs，并尽量从 designState 补齐尺寸
  useEffect(() => {
    if (initialData) {
      const dateFields = ['date', 'installationDate'];
      const formattedData = { ...initialData };
      dateFields.forEach(field => {
        if (formattedData[field]) formattedData[field] = dayjs(formattedData[field]);
      });

      if (designState) {
        const monument = designState.monuments?.[0] || {};
        const base = designState.bases?.[0] || {};
        const vases = designState.vases || [];

        formattedData.tabletLength = formattedData.tabletLength || monument.dimensions?.length;
        formattedData.tabletWidth = formattedData.tabletWidth || monument.dimensions?.width;
        formattedData.tabletHeight = formattedData.tabletHeight || monument.dimensions?.height;
        formattedData.tabletColor = formattedData.tabletColor || monument.color;

        formattedData.baseLength = formattedData.baseLength || base.dimensions?.length;
        formattedData.baseWidth = formattedData.baseWidth || base.dimensions?.width;
        formattedData.baseHeight = formattedData.baseHeight || base.dimensions?.height;
        formattedData.baseColor = formattedData.baseColor || base.color;

        if (vases.length > 0) {
          formattedData.vaseQty = vases.length;
          formattedData.vaseColor = vases[0].color;
        }
      }
      form.setFieldsValue(formattedData);
    }
  }, [initialData, designState, form]);

  // --- 辅助组件：保持视觉与 PDF 模板一致 ---
  const RenderRow = ({ label, name, labelWidth = '110px' }) => (
    <div className="pdf-form-row">
      <span className="pdf-label" style={{ width: labelWidth }}>{label}</span>
      <Form.Item name={name} className="pdf-input-item"><Input className="pdf-input-box" /></Form.Item>
    </div>
  );

  const InlineField = ({ label, name, width = 'auto', flex = 1 }) => (
    <div className="pdf-inline-field" style={{ width, flex }}>
      <span className="pdf-label-small">{label}</span>
      <Form.Item name={name} className="pdf-input-item"><Input className="pdf-input-box" /></Form.Item>
    </div>
  );

  const CheckItem = ({ label, name }) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
      <div className="pdf-check-item">
        <div className="fake-checkbox"></div> {label}
      </div>
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

            {/* --- [红框1] Product Type / Supplier / Profile --- */}
            <div className="pdf-flex-row border-bottom" style={{ paddingBottom: '8px', alignItems: 'flex-end' }}>
              {/* PRODUCT TYPE */}
              <div style={{ width: '25%' }}>
                <span className="pdf-label-bold">PRODUCT TYPE:</span>
                <div className="pdf-checkbox-row" style={{ marginTop: '4px' }}>
                  <CheckItem label="CORE" name="typeCore" />
                  <CheckItem label="CUSTOM" name="typeCustom" />
                </div>
              </div>

              {/* SUPPLIER (中间) */}
              <div style={{ width: '35%', display: 'flex', alignItems: 'center', paddingRight: '20px' }}>
                <span className="pdf-label-bold" style={{ marginRight: '5px' }}>SUPPLIER:</span>
                <Form.Item name="supplier" className="pdf-input-item" style={{ marginBottom: 0, flex: 1 }}>
                  <Input className="pdf-input-box" />
                </Form.Item>
              </div>

              {/* PROFILE (右侧) */}
              <div style={{ flex: 1 }}>
                <span className="pdf-label-bold">PROFILE:</span>
                <div className="pdf-checkbox-row" style={{ marginTop: '4px' }}>
                  <CheckItem label="SERP" name="profileSerp" />
                  <CheckItem label="FLAT" name="profileFlat" />
                  <CheckItem label="BYZANTINE" name="profileByzantine" />
                </div>
              </div>
            </div>

            {/* Row 2: Colour & Other */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px' }}>
              <InlineField label="COLOUR:" name="tabletColor" flex={1} />
              <div style={{ width: '10px' }}></div>
              <InlineField label="OTHER:" name="otherInfo" flex={1} />
            </div>

            {/* Row 3: Tablet Size */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px' }}>
              <span className="pdf-label-bold" style={{width: '100px'}}>TABLET SIZE(FT)</span>
              <InlineField label="LENGTH:" name="tabletLength" />
              <InlineField label="THICKNESS:" name="tabletWidth" />
              <InlineField label="HEIGHT:" name="tabletHeight" />
              <InlineField label="PRODUCT CODE:" name="tabletCode" />
            </div>

            {/* Row 4: Base Size */}
            <div className="pdf-flex-row border-bottom" style={{ paddingTop: '8px' }}>
              <span className="pdf-label-bold" style={{width: '100px'}}>BASE SIZE(FT)</span>
              <InlineField label="LENGTH:" name="baseLength" />
              <InlineField label="THICKNESS:" name="baseWidth" />
              <InlineField label="HEIGHT:" name="baseHeight" />
              <InlineField label="PRODUCT CODE:" name="baseCode" />
            </div>

            {/* --- [红框2] Polish Block (组合在一起) --- */}
            <div className="pdf-polish-block border-bottom">
              <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
                {/* 左：Tablet Polish */}
                <div style={{ width: '50%', borderRight: '1px solid #ccc', padding: '8px 8px 8px 0' }}>
                  <div className="pdf-label-bold" style={{ marginBottom: '4px' }}>TABLET POLISH</div>
                  <div className="pdf-checkbox-grid">
                    <CheckItem label="P5 POLISH FRONT, TOP, BACK & SIDES" name="polishP5" />
                    <CheckItem label="P3 POLISH FRONT, TOP & BACK" name="polishP3" />
                    <CheckItem label="P2 POLISH FRONT & BACK" name="polishP2" />
                    <CheckItem label="OTHER" name="polishOther" />
                  </div>
                </div>
                {/* 右：Base Polish */}
                <div style={{ width: '50%', padding: '8px 0 8px 15px' }}>
                  <div className="pdf-label-bold" style={{ marginBottom: '4px' }}>BASE POLISH</div>
                  <div className="pdf-checkbox-grid">
                    <CheckItem label="P1 POLISHED TOP" name="baseP1" />
                    <CheckItem label="POLISHED MARGIN" name="basePolished" />
                    <CheckItem label="MARGIN ALL AROUND" name="baseMargin" />
                  </div>
                </div>
              </div>
              {/* 下：Other Description */}
              <div style={{ padding: '8px 0' }}>
                <InlineField label="OTHER (SEPARATE PAGODA TOPS, MONUMENT WINGS, COLUMN BALLS, ETC) DESCRIPTION:" name="otherDesc" />
              </div>
            </div>

            {/* --- [红框3] Bench Section --- */}
            <div className="pdf-bench-section border-bottom" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <div className="pdf-flex-row" style={{ alignItems: 'center', marginBottom: '6px' }}>
                <span className="pdf-label-bold" style={{ fontSize: '11px', marginRight: '10px' }}>BENCH</span>

                {/* Bench Type 占宽一些 */}
                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                  <span className="pdf-label-small" style={{ marginRight: '5px' }}>BENCH TYPE:</span>
                  <Form.Item name="benchType" className="pdf-input-item" style={{ flex: 1, marginBottom: 0 }}>
                    <Input className="pdf-input-box" />
                  </Form.Item>
                </div>

                {/* Product Code 占窄一些 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span className="pdf-label-small" style={{ marginRight: '5px' }}>PRODUCT CODE:</span>
                  <Form.Item name="benchCode" className="pdf-input-item" style={{ flex: 1, marginBottom: 0 }}>
                    <Input className="pdf-input-box" />
                  </Form.Item>
                </div>
              </div>

              <div className="pdf-flex-row" style={{ alignItems: 'center' }}>
                <span className="pdf-label-small" style={{ marginRight: '5px' }}>MEMORIALIZATION:</span>
                <div style={{ display: 'flex', gap: '10px', marginRight: '20px' }}>
                  <CheckItem label="BRONZE" name="benchBronze" />
                  <CheckItem label="CARVING" name="benchCarving" />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span className="pdf-label-small" style={{ marginRight: '5px' }}>SPECIAL INSTRUCTIONS:</span>
                  <Form.Item name="benchInstructions" className="pdf-input-item" style={{ flex: 1, marginBottom: 0 }}>
                    <Input className="pdf-input-box" />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Rock/Pedestal */}
            <div style={{ paddingTop: '8px' }}>
              <div className="pdf-flex-row" style={{ marginBottom: '6px' }}>
                <span className="pdf-label-bold" style={{width: '150px'}}>ROCK/PEDESTAL/OTHER</span>
                <InlineField label="LENGTH (FT):" name="rockLength" />
                <InlineField label="WIDTH (FT):" name="rockWidth" />
                <InlineField label="HEIGHT (FT):" name="rockHeight" />
              </div>
              <div className="pdf-flex-row" style={{ marginBottom: '6px' }}>
                <InlineField label="PRODUCT CODE:" name="rockCode" />
                <InlineField label="PROFILE:" name="rockProfile" />
                <InlineField label="TYPE:" name="rockType" />
              </div>
              <div className="pdf-flex-row" style={{ marginBottom: '6px' }}>
                <span className="pdf-label-small">MEMORIALIZATION:</span>
                <div className="pdf-checkbox-row" style={{marginLeft:'10px', marginRight:'20px'}}>
                  <CheckItem label="BRONZE" name="rockBronze" />
                  <CheckItem label="CARVING" name="rockCarving" />
                </div>
                <span className="pdf-label-small">POLISH OPTION:</span>
                <div className="pdf-checkbox-row" style={{marginLeft:'10px'}}>
                  <CheckItem label="FF" name="rockFF" />
                  <CheckItem label="PP" name="rockPP" />
                  <span style={{fontSize:'9px', marginLeft:'5px'}}>(FULL FACE OR POLISHED PANEL)</span>
                </div>
              </div>
              <div className="pdf-flex-row">
                <InlineField label="SPECIAL INSTRUCTIONS:" name="rockInstructions" />
              </div>
            </div>

          </div>
        </div>

        {/* === 3. ENHANCEMENTS：可选配件/艺术件 === */}
        <div className="pdf-section-box">
          <div className="pdf-section-title">ENHANCEMENTS</div>
          <div className="pdf-content-padding">

            {/* Row 1: VASES [对齐：SIZE长, COLOUR长, QTY短, PC长] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'80px'}}>VASES:</span>
              {/* 调整 flex 比例: 2:2:0.5:2 */}
              <InlineField label="SIZE:" name="vaseSize" flex={2} />
              <InlineField label="COLOUR:" name="vaseColor" flex={2} />
              <InlineField label="QTY:" name="vaseQty" width="50px" flex="none" />
              <InlineField label="PC:" name="vasePC" flex={2} />
            </div>

            {/* Row 2: LUCKY CUBE | INCENSE BURNER [保持左右分栏] */}
            <div className="pdf-flex-row border-bottom">
              {/* 左侧：Lucky Cube */}
              <div style={{flex: 1, display:'flex', gap:'5px', borderRight:'1px solid #ccc', paddingRight:'5px'}}>
                <span className="pdf-label-bold" style={{width:'80px'}}>LUCKY CUBE:</span>
                <InlineField label="SIZE:" name="cubeSize" flex={1} />
                <InlineField label="COLOUR:" name="cubeColor" flex={1} />
              </div>
              {/* 右侧：Incense Burner - 标签稍微缩短间距 */}
              <div style={{flex: 1, display:'flex', gap:'5px', paddingLeft:'5px'}}>
                <span className="pdf-label-bold" style={{ whiteSpace: 'nowrap', marginRight: '5px' }}>INCENSE BURNER:</span>
                <InlineField label="SIZE:" name="incenseSize" flex={1} />
                <InlineField label="COLOUR:" name="incenseColor" flex={1} />
              </div>
            </div>

            {/* Row 3: BRONZE LAMPS [对齐 Row 1] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'95px'}}>BRONZE LAMPS:</span>
              <InlineField label="SIZE:" name="lampSize" flex={2} />
              <InlineField label="SUPPLIER:" name="lampSupplier" flex={2} />
              <InlineField label="QTY:" name="lampQty" width="50px" flex="none" />
              <InlineField label="PC:" name="lampPC" flex={2} />
            </div>

            {/* Row 4: STATUES [关键修正：4个输入框均匀分布] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'60px'}}>STATUES:</span>
              <InlineField label="MATERIAL:" name="statueMaterial" flex={1.5} />
              <InlineField label="SIZE:" name="statueSize" flex={1} />
              <InlineField label="COLOUR:" name="statueColor" flex={1} />
              <InlineField label="SUPPLIER:" name="statueSupplier" flex={1.5} />
              <InlineField label="QTY:" name="statueQty" width="50px" flex="none" />
            </div>

            {/* Row 5: CAMEO PICTURES [3个长输入框] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'105px'}}>CAMEO PICTURES:</span>
              <InlineField label="SIZE:" name="cameoSize" flex={1.5} />
              <InlineField label="COLOUR:" name="cameoColor" flex={1.5} />
              <InlineField label="SUPPLIER:" name="cameoSupplier" flex={1.5} />
              <InlineField label="QTY:" name="cameoQty" width="50px" flex="none" />
            </div>

            {/* Row 6: ETCHINGS [Description 占大头] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'60px'}}>ETCHINGS:</span>
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

            {/* Row 7: OTHER [Description 占大头] */}
            <div className="pdf-flex-row border-bottom">
              <span className="pdf-label-bold" style={{width:'50px'}}>OTHER:</span>
              <InlineField label="DESCRIPTION:" name="otherDesc2" flex={3} />
              <InlineField label="SIZE:" name="otherSize" width="80px" flex="none" />
              <InlineField label="QTY:" name="otherQty" width="50px" flex="none" />
              <InlineField label="PC:" name="otherPC" width="100px" flex="none" />
              <InlineField label="SUPPLIER:" name="otherSupplier" width="120px" flex="none" />
            </div>

            {/* Row 8: SPECIAL INSTRUCTIONS */}
            <div className="pdf-flex-row">
              <span className="pdf-label-bold" style={{width:'135px'}}>SPECIAL INSTRUCTIONS:</span>
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