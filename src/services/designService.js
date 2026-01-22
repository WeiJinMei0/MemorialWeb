import axios from 'axios';
import { API_BASE } from '../config';

/**
 * 设计服务 - 封装所有设计相关的 API 调用
 */
const designService = {
  /**
   * 获取认证头
   */
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  },

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
    const response = await axios.post(
      `${API_BASE}/v1/designs`,
      designData,
      { headers: this.getAuthHeaders() }
    );
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
    const response = await axios.get(
      `${API_BASE}/v1/designs`,
      {
        headers: this.getAuthHeaders(),
        params: {
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          ...(params.keyword && { keyword: params.keyword })
        }
      }
    );
    return response.data;
  },

  /**
   * 获取设计详情
   * @param {number|string} designId - 设计ID
   */
  async getDetail(designId) {
    const response = await axios.get(
      `${API_BASE}/v1/designs/${designId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * 更新设计
   * @param {number|string} designId - 设计ID
   * @param {Object} designData - 设计数据
   */
  async update(designId, designData) {
    const response = await axios.put(
      `${API_BASE}/v1/designs/${designId}`,
      designData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * 删除设计
   * @param {number|string} designId - 设计ID
   */
  async delete(designId) {
    const response = await axios.delete(
      `${API_BASE}/v1/designs/${designId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
};

export default designService;
