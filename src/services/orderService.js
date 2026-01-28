import api from './api';

/**
 * 订单服务 - 封装所有订单相关的 API 调用
 * 使用统一的 api 实例，自动处理 token 和 401 错误
 */
const orderService = {
  /**
   * 创建订单
   * @param {Object} orderData - 订单数据
   * @param {number} orderData.designId - 关联的设计ID
   * @param {Object} orderData.data - 设计快照数据
   * @param {Object} orderData.meta - 订单元数据（表单字段等）
   * @param {string} orderData.status - 订单状态
   * @param {string} orderData.address - 地址
   * @param {number} orderData.totalPrice - 总价
   */
  async create(orderData) {
    const response = await api.post('/v1/orders', orderData);
    return response.data;
  },

  /**
   * 获取订单列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.keyword - 搜索关键词
   * @param {string} params.status - 订单状态筛选
   */
  async list(params = {}) {
    const response = await api.get('/v1/orders', {
      params: {
        page: params.page || 1,
        pageSize: params.pageSize || 100,
        ...(params.keyword && { keyword: params.keyword }),
        ...(params.status && { status: params.status })
      }
    });
    return response.data;
  },

  /**
   * 获取订单详情
   * @param {number|string} orderId - 订单ID
   */
  async getDetail(orderId) {
    const response = await api.get(`/v1/orders/${orderId}`);
    return response.data;
  },

  /**
   * 更新订单
   * @param {number|string} orderId - 订单ID
   * @param {Object} orderData - 要更新的订单数据
   */
  async update(orderId, orderData) {
    const response = await api.patch(`/v1/orders/${orderId}`, orderData);
    return response.data;
  },

  /**
   * 删除订单
   * @param {number|string} orderId - 订单ID
   */
  async delete(orderId) {
    const response = await api.delete(`/v1/orders/${orderId}`);
    return response.data;
  }
};

export default orderService;
