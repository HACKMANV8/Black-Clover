# Eco-Friendly Product Comparison API

A RESTful API for comparing product prices and carbon footprints across different e-commerce platforms.

## Base URL
```
https://your-render-url.com/api
```

## Authentication
Protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Admin Authentication
#### Login
- **URL**: `/admin/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Success Response**:
  ```json
  {
    "token": "jwt_token_here",
    "message": "Login successful"
  }
  ```

### 2. Products

#### Get All Products
- **URL**: `/products`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sort` (optional): Field to sort by ('name', 'price', 'carbonFootprint')
  - `order` (optional): Sort order ('asc' or 'desc')
- **Success Response**: 
  ```json
  {
    "products": [
        {
            "_id": "690502f83d24a2acc16eb5bd",
            "name": "Fresh Tomatoes",
            "category": "vegetables",
            "description": "Premium quality fresh tomatoes - locally sourced for maximum freshness",
            "imageUrl": "https://magarticles.magzter.com/articles/7489/365810/5d5a47ec0d4e0/Tomato.jpg",
            "platformData": [
                {
                    "carbonFootprint": {
                        "growing": 0.3,
                        "transportation": 0.3,
                        "packaging": 0.2,
                        "storage": 0.2,
                        "total": 1
                    },
                    "platform": "BigBasket",
                    "price": 36,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10",
                    "_id": "690502f83d24a2acc16eb5be"
                },
                {
                    "carbonFootprint": {
                        "growing": 0.3,
                        "transportation": 0.2,
                        "packaging": 0.1,
                        "storage": 0.1,
                        "total": 0.7
                    },
                    "platform": "Zepto",
                    "price": 40,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.zeptonow.com/pn/tomato-local/pvid/7e261768-88d6-4cbb-8b9b-8718625577bd?marketplaceType=ZEPTO_NOW",
                    "_id": "690502f83d24a2acc16eb5bf"
                }
            ],
            "createdAt": "2025-10-31T18:42:00.570Z",
            "updatedAt": "2025-10-31T18:42:00.570Z",
            "__v": 0,
            "averagePrice": 38,
            "totalCarbonFootprint": 1.7
        },
        {
            "_id": "690501f40b13829346c21f2f",
            "name": "Fresh Tomatoes",
            "category": "vegetables",
            "description": "Premium quality fresh tomatoes - locally sourced for maximum freshness",
            "imageUrl": "https://magarticles.magzter.com/articles/7489/365810/5d5a47ec0d4e0/Tomato.jpg",
            "platformData": [
                {
                    "carbonFootprint": {
                        "growing": 0.3,
                        "transportation": 0.3,
                        "packaging": 0.2,
                        "storage": 0.2,
                        "total": 1
                    },
                    "platform": "BigBasket",
                    "price": 36,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10",
                    "_id": "690501f40b13829346c21f30"
                },
                {
                    "carbonFootprint": {
                        "growing": 0.3,
                        "transportation": 0.2,
                        "packaging": 0.1,
                        "storage": 0.1,
                        "total": 0.7
                    },
                    "platform": "Zepto",
                    "price": 40,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.zeptonow.com/pn/tomato-local/pvid/7e261768-88d6-4cbb-8b9b-8718625577bd?marketplaceType=ZEPTO_NOW",
                    "_id": "690501f40b13829346c21f31"
                }
            ],
            "createdAt": "2025-10-31T18:37:40.220Z",
            "updatedAt": "2025-10-31T18:37:40.220Z",
            "__v": 0,
            "averagePrice": 38,
            "totalCarbonFootprint": 1.7
        },
        {
            "_id": "6905079b7dca6650aad9a88a",
            "name": "red Onion",
            "category": "vegetables",
            "description": "Premium quality fresh onion - locally sourced for maximum freshness",
            "imageUrl": "https://t4.ftcdn.net/jpg/15/69/79/39/240_F_1569793902_8rCNNYQI9g1uIFp7aLceeTnVIOTJ3bpa.jpg",
            "platformData": [
                {
                    "carbonFootprint": {
                        "growing": 0.6,
                        "transportation": 0.35,
                        "packaging": 0.25,
                        "storage": 0.2,
                        "total": 1.4
                    },
                    "platform": "BigBasket",
                    "price": 36,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.bigbasket.com/pd/40023472/fresho-onion-organically-grown-1-kg/?nc=cl-prod-list&t_pos_sec=1&t_pos_item=1&t_s=Onion+-+Organically+Grown",
                    "_id": "6905079b7dca6650aad9a88b"
                },
                {
                    "carbonFootprint": {
                        "growing": 0.5,
                        "transportation": 0.25,
                        "packaging": 0.12,
                        "storage": 0.1,
                        "total": 0.85
                    },
                    "platform": "Zepto",
                    "price": 40,
                    "date": "2025-10-31T00:00:00.000Z",
                    "link": "https://www.zeptonow.com/pn/fresh-onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071",
                    "_id": "6905079b7dca6650aad9a88c"
                }
            ],
            "createdAt": "2025-10-31T19:01:47.182Z",
            "updatedAt": "2025-10-31T19:01:47.182Z",
            "__v": 0,
            "averagePrice": 38,
            "totalCarbonFootprint": 2.25
        }
    ],
    "currentPage": 1,
    "totalPages": 1,
    "totalProducts": 3
}
  ```

#### Search Products
- **URL**: `/products/search/?q=product_name`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `q`: Search term (required)
- **Success Response**:
  ```json
  [
    {
        "_id": "690501f40b13829346c21f2f",
        "name": "Fresh Tomatoes",
        "category": "vegetables",
        "description": "Premium quality fresh tomatoes - locally sourced for maximum freshness",
        "imageUrl": "https://magarticles.magzter.com/articles/7489/365810/5d5a47ec0d4e0/Tomato.jpg",
        "platformData": [
            {
                "carbonFootprint": {
                    "growing": 0.3,
                    "transportation": 0.3,
                    "packaging": 0.2,
                    "storage": 0.2,
                    "total": 1
                },
                "platform": "BigBasket",
                "price": 36,
                "date": "2025-10-31T00:00:00.000Z",
                "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10",
                "_id": "690501f40b13829346c21f30"
            },
            {
                "carbonFootprint": {
                    "growing": 0.3,
                    "transportation": 0.2,
                    "packaging": 0.1,
                    "storage": 0.1,
                    "total": 0.7
                },
                "platform": "Zepto",
                "price": 40,
                "date": "2025-10-31T00:00:00.000Z",
                "link": "https://www.zeptonow.com/pn/tomato-local/pvid/7e261768-88d6-4cbb-8b9b-8718625577bd?marketplaceType=ZEPTO_NOW",
                "_id": "690501f40b13829346c21f31"
            }
        ],
        "createdAt": "2025-10-31T18:37:40.220Z",
        "updatedAt": "2025-10-31T18:37:40.220Z",
        "__v": 0,
        "averagePrice": 38,
        "totalCarbonFootprint": 1.7
    }
  ```

#### Add New Product (Admin Only)
- **URL**: `/products`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
  "name": "red Onion",
  "category": "vegetables",
  "description": "Premium quality fresh onion - locally sourced for maximum freshness",
  "imageUrl": "https://t4.ftcdn.net/jpg/15/69/79/39/240_F_1569793902_8rCNNYQI9g1uIFp7aLceeTnVIOTJ3bpa.jpg",
  "platformData": [
    {
      "platform": "BigBasket",
      "price": 36,
      "date": "2025-10-31",
      "link": "https://www.bigbasket.com/pd/40023472/fresho-onion-organically-grown-1-kg/?nc=cl-prod-list&t_pos_sec=1&t_pos_item=1&t_s=Onion+-+Organically+Grown",
      "carbonFootprint": {
        "growing": 0.6,
        "transportation": 0.35,
        "packaging": 0.25,
        "storage": 0.2,
        "total": 1.4
      }
    },
    {
      "platform": "Zepto",
      "price": 40,
      "date": "2025-10-31",
      "link": "https://www.zeptonow.com/pn/fresh-onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071",
      "carbonFootprint": {
        "growing": 0.5,
        "transportation": 0.25,
        "packaging": 0.12,
        "storage": 0.1,
        "total": 0.85
      }
    }
  ]
}
  ```

#### Update Product (Admin Only)
- **URL**: `/products/:id`
- **Method**: `PATCH`
- **Auth Required**: Yes
- **URL Parameters**: 
  - `id`: Product ID
- **Body**: Any product fields that need to be updated

#### Delete Product (Admin Only)
- **URL**: `/products/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **URL Parameters**:
  - `id`: Product ID

### 3. Cart Optimization

#### Optimize Cart
- **URL**: `/cart/optimize`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "productIds": ["product_id1", "product_id2"]
  }
  ```
- **Success Response**:
  ```json
  {
    "cartSummary": {
        "totalProducts": 2,
        "products": [
            {
                "id": "690502f83d24a2acc16eb5bd",
                "name": "Fresh Tomatoes",
                "category": "vegetables"
            },
            {
                "id": "6905079b7dca6650aad9a88a",
                "name": "red Onion",
                "category": "vegetables"
            }
        ]
    },
    "platformComparison": {
        "bestOverall": {
            "platform": "BigBasket",
            "totalPrice": 72,
            "totalCarbonFootprint": 2.4,
            "averageCarbonFootprint": 1.2,
            "productDetails": [
                {
                    "productId": "690502f83d24a2acc16eb5bd",
                    "name": "Fresh Tomatoes",
                    "price": 36,
                    "carbonFootprint": 1,
                    "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10"
                },
                {
                    "productId": "6905079b7dca6650aad9a88a",
                    "name": "red Onion",
                    "price": 36,
                    "carbonFootprint": 1.4,
                    "link": "https://www.bigbasket.com/pd/40023472/fresho-onion-organically-grown-1-kg/?nc=cl-prod-list&t_pos_sec=1&t_pos_item=1&t_s=Onion+-+Organically+Grown"
                }
            ],
            "availability": "all_products",
            "overallScore": 0.5
        },
        "lowestCarbonFootprint": {
            "platform": "Zepto",
            "totalPrice": 80,
            "totalCarbonFootprint": 1.5499999999999998,
            "averageCarbonFootprint": 0.7749999999999999,
            "productDetails": [
                {
                    "productId": "690502f83d24a2acc16eb5bd",
                    "name": "Fresh Tomatoes",
                    "price": 40,
                    "carbonFootprint": 0.7,
                    "link": "https://www.zeptonow.com/pn/tomato-local/pvid/7e261768-88d6-4cbb-8b9b-8718625577bd?marketplaceType=ZEPTO_NOW"
                },
                {
                    "productId": "6905079b7dca6650aad9a88a",
                    "name": "red Onion",
                    "price": 40,
                    "carbonFootprint": 0.85,
                    "link": "https://www.zeptonow.com/pn/fresh-onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071"
                }
            ],
            "availability": "all_products"
        },
        "lowestPrice": {
            "platform": "BigBasket",
            "totalPrice": 72,
            "totalCarbonFootprint": 2.4,
            "averageCarbonFootprint": 1.2,
            "productDetails": [
                {
                    "productId": "690502f83d24a2acc16eb5bd",
                    "name": "Fresh Tomatoes",
                    "price": 36,
                    "carbonFootprint": 1,
                    "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10"
                },
                {
                    "productId": "6905079b7dca6650aad9a88a",
                    "name": "red Onion",
                    "price": 36,
                    "carbonFootprint": 1.4,
                    "link": "https://www.bigbasket.com/pd/40023472/fresho-onion-organically-grown-1-kg/?nc=cl-prod-list&t_pos_sec=1&t_pos_item=1&t_s=Onion+-+Organically+Grown"
                }
            ],
            "availability": "all_products"
        },
        "allPlatforms": [
            {
                "platform": "BigBasket",
                "totalPrice": 72,
                "totalCarbonFootprint": 2.4,
                "averageCarbonFootprint": 1.2,
                "productDetails": [
                    {
                        "productId": "690502f83d24a2acc16eb5bd",
                        "name": "Fresh Tomatoes",
                        "price": 36,
                        "carbonFootprint": 1,
                        "link": "https://www.bigbasket.com/pd/10000200/fresho-tomato-hybrid-1-kg/?utm_source=bigbasket&utm_medium=share_product&utm_campaign=share_product&ec_id=10"
                    },
                    {
                        "productId": "6905079b7dca6650aad9a88a",
                        "name": "red Onion",
                        "price": 36,
                        "carbonFootprint": 1.4,
                        "link": "https://www.bigbasket.com/pd/40023472/fresho-onion-organically-grown-1-kg/?nc=cl-prod-list&t_pos_sec=1&t_pos_item=1&t_s=Onion+-+Organically+Grown"
                    }
                ],
                "availability": "all_products",
                "overallScore": 0.5
            },
            {
                "platform": "Zepto",
                "totalPrice": 80,
                "totalCarbonFootprint": 1.5499999999999998,
                "averageCarbonFootprint": 0.7749999999999999,
                "productDetails": [
                    {
                        "productId": "690502f83d24a2acc16eb5bd",
                        "name": "Fresh Tomatoes",
                        "price": 40,
                        "carbonFootprint": 0.7,
                        "link": "https://www.zeptonow.com/pn/tomato-local/pvid/7e261768-88d6-4cbb-8b9b-8718625577bd?marketplaceType=ZEPTO_NOW"
                    },
                    {
                        "productId": "6905079b7dca6650aad9a88a",
                        "name": "red Onion",
                        "price": 40,
                        "carbonFootprint": 0.85,
                        "link": "https://www.zeptonow.com/pn/fresh-onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071"
                    }
                ],
                "availability": "all_products",
                "overallScore": 0.5
            }
        ]
    }
}
  ```

## Error Responses
All endpoints may return the following errors:
```json
{
  "message": "Error message here"
}
```
- 400: Bad Request - Invalid input
- 401: Unauthorized - Invalid or missing token
- 404: Not Found - Resource not found
- 500: Server Error - Internal server error

## Platform-Specific Carbon Footprint
Each product's carbon footprint is tracked per platform and includes:
- Growing: Emissions from cultivation
- Transportation: Emissions from logistics
- Packaging: Emissions from packaging materials
- Storage: Emissions from warehousing
- Total: Combined carbon footprint

## Deployment Notes
To deploy on Render:
1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables:
   - PORT
   - MONGODB_URI
   - JWT_SECRET
4. Configure build settings:
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
5. Choose appropriate instance type
6. Deploy!
