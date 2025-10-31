export interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  platformData: PlatformData[];
  createdAt: string;
  updatedAt: string;
  averagePrice: number;
  totalCarbonFootprint: number;
}

export interface PlatformData {
  carbonFootprint: CarbonFootprint;
  platform: string;
  price: number;
  date: string;
  link: string;
  _id: string;
}

export interface CarbonFootprint {
  growing: number;
  transportation: number;
  packaging: number;
  storage: number;
  total: number;
}

export interface CartOptimizationResponse {
  cartSummary: CartSummary;
  platformComparison: PlatformComparison;
}

export interface CartSummary {
  totalProducts: number;
  products: CartProduct[];
}

export interface CartProduct {
  id: string;
  name: string;
  category: string;
}

export interface PlatformComparison {
  bestOverall: PlatformResult;
  lowestCarbonFootprint: PlatformResult;
  lowestPrice: PlatformResult;
  allPlatforms: PlatformResult[];
}

export interface PlatformResult {
  platform: string;
  totalPrice: number;
  totalCarbonFootprint: number;
  averageCarbonFootprint: number;
  productDetails: ProductDetail[];
  availability: string;
  overallScore?: number;
}

export interface ProductDetail {
  productId: string;
  name: string;
  price: number;
  carbonFootprint: number;
  link: string;
}
