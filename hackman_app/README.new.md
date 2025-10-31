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
        "name": "Product Name",
        "category": "vegetables",
        "description": "Product description",
        "imageUrl": "image_url",
        "platformData": [...],
        "averagePrice": 40,
        "totalCarbonFootprint": 1.8
      }
    ],
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 50
  }
  ```

#### Search Products
- **URL**: `/products/search`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `q`: Search term (required)
- **Success Response**:
  ```json
  [
    {
      "name": "Product Name",
      "category": "vegetables",
      "description": "Product description",
      "imageUrl": "image_url",
      "platformData": [...],
      "averagePrice": 40,
      "totalCarbonFootprint": 1.8
    }
  ]
  ```

#### Add New Product (Admin Only)
- **URL**: `/products`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "name": "Product Name",
    "category": "vegetables",
    "description": "Product description",
    "imageUrl": "image_url",
    "platformData": [
      {
        "platform": "Platform Name",
        "price": 40,
        "date": "2025-10-31",
        "link": "product_url",
        "carbonFootprint": {
          "growing": 0.3,
          "transportation": 0.2,
          "packaging": 0.1,
          "storage": 0.1,
          "total": 0.7
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
          "id": "product_id1",
          "name": "Product Name",
          "category": "vegetables"
        }
      ]
    },
    "platformComparison": {
      "bestOverall": {
        "platform": "Platform1",
        "totalPrice": 120,
        "totalCarbonFootprint": 2.5,
        "averageCarbonFootprint": 0.83,
        "overallScore": 0.4,
        "productDetails": [...],
        "availability": "all_products"
      },
      "lowestCarbonFootprint": {...},
      "lowestPrice": {...},
      "allPlatforms": [...]
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
4. Choose appropriate instance type
5. Deploy!
