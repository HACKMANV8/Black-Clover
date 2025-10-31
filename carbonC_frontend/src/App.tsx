import { useState, useEffect } from 'react';
import { Product } from './types';
import { api } from './api';
import ProductList from './components/ProductList';
import CartOptimizer from './components/CartOptimizer';
import SearchBar from './components/SearchBar';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useLocalStorage<string[]>('cart-items', []);
  const [lastSearchQuery, setLastSearchQuery] = useLocalStorage<string>('last-search', '');

  // Load initial products
  useEffect(() => {
    const loadInitialProducts = async () => {
      if (lastSearchQuery) {
        const results = await api.searchProducts(lastSearchQuery);
        setProducts(results);
      } else {
        const response = await api.getProducts();
        setProducts(response.products);
      }
    };
    loadInitialProducts();
  }, []);

  const handleSearch = async (query: string) => {
    setLastSearchQuery(query);
    if (query.trim()) {
      const searchResults = await api.searchProducts(query);
      setProducts(searchResults);
    } else {
      const response = await api.getProducts();
      setProducts(response.products);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className="app">
      <header>
        <h1>Eco-Friendly Shopping</h1>
        <SearchBar onSearch={handleSearch} />
      </header>
      <main>
        <ProductList
          products={products}
          selectedProducts={selectedProducts}
          onProductSelect={toggleProductSelection}
        />
        {selectedProducts.length > 0 && (
          <CartOptimizer productIds={selectedProducts} />
        )}
      </main>
    </div>
  );
}

export default App;
