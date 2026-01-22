import api from './api';

/**
 * 设计服务 - 封装所有设计相关的 API 调用
 * 使用统一的 api 实例，自动处理 token 和 401 错误
 */
const designService = {
  /**
   * 创建设计
   * @param {Object} designData - 设计数据
   * @param {string} designData.name - 设计名称
   * @param {string} designData.description - 设计描述
   * @param {string} designData.type - 设计类型
   * @param {Object} designData.data - 设计状态数据
   * @param {string} designData.previewUrl - 预览图片（base64）
   */
  async create(designData) {
    const response = await api.post('/v1/designs', designData);
    return response.data;
  },

  /**
   * 获取设计列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.keyword - 搜索关键词
   */
  async list(params = {}) {
    const response = await api.get('/v1/designs', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        ...(params.keyword && { keyword: params.keyword })
      }
    });
    return response.data;
  },

  /**
   * 获取设计详情
   * @param {number|string} designId - 设计ID
   */
  async getDetail(designId) {
    const response = await api.get(`/v1/designs/${designId}`);
    return response.data;
  },

  /**
   * 更新设计
   * @param {number|string} designId - 设计ID
   * @param {Object} designData - 设计数据
   */
  async update(designId, designData) {
    const response = await api.put(`/v1/designs/${designId}`, designData);
    return response.data;
  },

  /**
   * 删除设计
   * @param {number|string} designId - 设计ID
   */
  async delete(designId) {
    const response = await api.delete(`/v1/designs/${designId}`);
    return response.data;
  }
};

export default designService;
