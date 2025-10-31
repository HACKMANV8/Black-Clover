import axios from 'axios';
import { Product, CartOptimizationResponse } from './types';

const API_BASE_URL = 'https://carbon-app-8hwl.onrender.com/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for CORS with credentials
});

export const api = {
  async getProducts(page = 1, limit = 10, sort?: string, order?: 'asc' | 'desc') {
    const response = await axiosInstance.get('/products', {
      params: { page, limit, sort, order }
    });
    return response.data;
  },

  async searchProducts(query: string) {
    const response = await axiosInstance.get('/products/search', {
      params: { q: query }
    });
    return response.data as Product[];
  },

  async optimizeCart(productIds: string[]) {
    const response = await axiosInstance.post('/cart/optimize', {
      productIds
    });
    return response.data as CartOptimizationResponse;
  }
};
