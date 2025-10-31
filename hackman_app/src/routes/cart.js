const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Calculate optimized cart details across platforms
router.post('/optimize', async (req, res) => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of product IDs' });
        }

        // Fetch all products in the cart
        const products = await Product.find({ _id: { $in: productIds } });

        if (products.length === 0) {
            return res.status(404).json({ message: 'No products found' });
        }

        // Get all unique platforms
        const platformsSet = new Set();
        products.forEach(product => {
            product.platformData.forEach(pd => platformsSet.add(pd.platform));
        });
        const platforms = Array.from(platformsSet);

        // Calculate metrics for each platform
        const platformMetrics = platforms.map(platform => {
            let totalPrice = 0;
            let totalCarbonFootprint = 0;
            let productsFound = 0;
            const productDetails = [];

            products.forEach(product => {
                const platformData = product.platformData.find(pd => pd.platform === platform);
                if (platformData) {
                    productsFound++;
                    totalPrice += platformData.price;
                    totalCarbonFootprint += platformData.carbonFootprint.total;
                    productDetails.push({
                        productId: product._id,
                        name: product.name,
                        price: platformData.price,
                        carbonFootprint: platformData.carbonFootprint.total,
                        link: platformData.link
                    });
                }
            });

            // Only include platform if it has all products
            if (productsFound === products.length) {
                return {
                    platform,
                    totalPrice,
                    totalCarbonFootprint,
                    averageCarbonFootprint: totalCarbonFootprint / products.length,
                    productDetails,
                    availability: 'all_products'
                };
            } else if (productsFound > 0) {
                return {
                    platform,
                    totalPrice,
                    totalCarbonFootprint,
                    averageCarbonFootprint: totalCarbonFootprint / productsFound,
                    productDetails,
                    availability: 'partial',
                    productsFound,
                    totalProducts: products.length
                };
            }
            return null;
        }).filter(metric => metric !== null);

        // Sort platforms by carbon footprint and price
        const sortedByCarbon = [...platformMetrics].sort((a, b) => 
            a.totalCarbonFootprint - b.totalCarbonFootprint
        );

        const sortedByPrice = [...platformMetrics].sort((a, b) => 
            a.totalPrice - b.totalPrice
        );

        // Calculate best overall platform based on both metrics
        const normalizedScores = platformMetrics.map(platform => {
            const priceScore = (platform.totalPrice - sortedByPrice[0].totalPrice) / 
                (sortedByPrice[sortedByPrice.length - 1].totalPrice - sortedByPrice[0].totalPrice);
            const carbonScore = (platform.totalCarbonFootprint - sortedByCarbon[0].totalCarbonFootprint) / 
                (sortedByCarbon[sortedByCarbon.length - 1].totalCarbonFootprint - sortedByCarbon[0].totalCarbonFootprint);
            return {
                ...platform,
                overallScore: (priceScore + carbonScore) / 2
            };
        }).sort((a, b) => a.overallScore - b.overallScore);

        res.json({
            cartSummary: {
                totalProducts: products.length,
                products: products.map(p => ({
                    id: p._id,
                    name: p.name,
                    category: p.category
                }))
            },
            platformComparison: {
                bestOverall: normalizedScores[0],
                lowestCarbonFootprint: sortedByCarbon[0],
                lowestPrice: sortedByPrice[0],
                allPlatforms: normalizedScores
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
