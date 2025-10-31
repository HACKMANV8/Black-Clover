import { useState, useEffect } from 'react';
import { api } from '../api';
import { CartOptimizationResponse, PlatformResult } from '../types';
import { CartIcon } from './CartIcon';

interface CartOptimizerProps {
  productIds: string[];
}

interface PlatformInfo {
  name: string;
  website: string;
  logo: string;
}

const PLATFORM_INFO: Record<string, PlatformInfo> = {
  'BigBasket': {
    name: 'BigBasket',
    website: 'https://www.bigbasket.com',
    logo: 'https://www.bigbasket.com/static/v2489/common/img/bb_logo.png'
  },
  'Zepto': {
    name: 'Zepto',
    website: 'https://www.zeptonow.com',
    logo: 'https://cdn.zeptonow.com/web-static-assets-prod/artifacts/6.18.0/images/logo.svg'
  },
  'Blinkit': {
    name: 'Blinkit',
    website: 'https://blinkit.com',
    logo: 'https://blinkit.com/9df3b8f793bd1aa17f766579dd8d4086.svg'
  },
  'Flipkart': {
    name: 'Flipkart Quick',
    website: 'https://www.flipkart.com/flipkart-quick/grocery',
    logo: 'https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/flipkart-plus_8d85f4.png'
  }
};

function CartOptimizer({ productIds }: CartOptimizerProps) {
  const [optimization, setOptimization] = useState<CartOptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const optimizeCart = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await api.optimizeCart(productIds);
        setOptimization(result);
      } catch (err) {
        setError('Failed to optimize cart. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    optimizeCart();
  }, [productIds]);

  const renderPlatformCard = (platform: PlatformResult) => {
    const platformInfo = PLATFORM_INFO[platform.platform] || {
      name: platform.platform,
      website: '#',
      logo: ''
    };

    return (
      <div className="platform-card">
        <div className="platform-header">
          <img src={platformInfo.logo} alt={platformInfo.name} className="platform-logo" />
          <div className="platform-score">
            <div className="score-circle">
              {Math.round((1 - platform.totalCarbonFootprint / 3) * 100)}
            </div>
            <span>Eco Score</span>
          </div>
        </div>
        <div className="platform-details">
          <p className="price">₹{platform.totalPrice.toFixed(2)}</p>
          <p className="carbon">Carbon Footprint: {platform.totalCarbonFootprint.toFixed(2)}kg CO2</p>
          <div className="products-list">
            {platform.productDetails.map(product => (
              <div key={product.productId} className="cart-product">
                <span>{product.name}</span>
                <span>₹{product.price}</span>
              </div>
            ))}
          </div>
        </div>
        <a
          href={platformInfo.website}
          target="_blank"
          rel="noopener noreferrer"
          className="shop-button"
        >
          Shop on {platformInfo.name}
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="cart-button">
        <CartIcon />
        <span className="cart-count">{productIds.length}</span>
        <div className="loading-overlay">Optimizing your cart...</div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="nav-buttons">
        <button 
          className="home-button" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          🏠
        </button>
        <button 
          className="cart-button" 
          onClick={() => setIsCartOpen(!isCartOpen)}
        >
          <CartIcon />
          <span className="cart-count">{productIds.length}</span>
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {isCartOpen && optimization && (
        <div className="cart-modal">
          <div className="cart-modal-content">
            <div className="cart-header">
              <h2>Your Eco-Friendly Shopping Options</h2>
              <div className="header-actions">
                <button 
                  className="clear-cart-button" 
                  onClick={() => {
                    localStorage.removeItem('cart-items');
                    window.location.reload();
                  }}
                >
                  Clear Cart
                </button>
                <button className="close-button" onClick={() => setIsCartOpen(false)}>×</button>
              </div>
            </div>

            <div className="cart-summary">
              <p>{optimization.cartSummary.totalProducts} items in cart</p>
            </div>

            <div className="platform-options">
              <div className="option-section">
                <h3>🌟 Best Overall Option</h3>
                {renderPlatformCard(optimization.platformComparison.bestOverall)}
              </div>

              <div className="option-section">
                <h3>🌱 Most Eco-Friendly Option</h3>
                {renderPlatformCard(optimization.platformComparison.lowestCarbonFootprint)}
              </div>

              <div className="option-section">
                <h3>💰 Best Price Option</h3>
                {renderPlatformCard(optimization.platformComparison.lowestPrice)}
              </div>
            </div>

            <div className="all-platforms">
              <h3>Compare All Platforms</h3>
              <div className="platforms-grid">
                {optimization.platformComparison.allPlatforms.map(platform => (
                  <div key={platform.platform} className="platform-summary">
                    {renderPlatformCard(platform)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartOptimizer;
