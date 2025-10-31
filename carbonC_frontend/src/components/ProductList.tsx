import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  selectedProducts: string[];
  onProductSelect: (id: string) => void;
}

function ProductList({ products, selectedProducts, onProductSelect }: ProductListProps) {
  return (
    <div className="product-list">
      {products.map((product) => (
        <div key={product._id} className="product-card">
          <img src={product.imageUrl} alt={product.name} />
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="platform-data">
            {product.platformData.map((platform) => (
              <div key={platform._id} className="platform-info">
                <h4>{platform.platform}</h4>
                <p>Price: ₹{platform.price}</p>
                <p>Carbon Footprint: {platform.carbonFootprint.total}kg CO2</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => onProductSelect(product._id)}
            className={selectedProducts.includes(product._id) ? 'selected' : ''}
          >
            {selectedProducts.includes(product._id) ? 'Remove from Cart' : 'Add to Cart'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default ProductList;
