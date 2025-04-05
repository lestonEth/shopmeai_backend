// controllers/amazonController.js
const {
    searchAmazonProducts,
    getProductDetails,
    getPopularProducts,
    getRecommendedProducts,
} = require("../services/amazonService")
const Child = require("../models/Child")

/**
 * Search for Amazon products
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchProducts = async (req, res) => {
    try {
        const { keywords, category, minPrice, maxPrice, limit = 10, page = 1 } = req.query

        // Validate input parameters
        if (!keywords && !category) {
            return res.status(400).json({
                success: false,
                message: "At least one of keywords or category is required",
            })
        }

        // Convert string parameters to appropriate types
        const searchParams = {
            keywords,
            category,
            minPrice: minPrice ? Number.parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? Number.parseFloat(maxPrice) : undefined,
            limit: limit ? Number.parseInt(limit, 10) : 10,
            page: page ? Number.parseInt(page, 10) : 1,
        }

        const products = await searchAmazonProducts(searchParams)

        res.json({
            success: true,
            count: products.length,
            products,
        })
    } catch (error) {
        console.error("Error in searchProducts controller:", error)

        // Handle rate limiting errors specifically
        if (error.message.includes("Rate limit exceeded")) {
            return res.status(429).json({
                success: false,
                message: error.message,
            })
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to search Amazon products",
        })
    }
}

/**
 * Get product details by ASIN
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProduct = async (req, res) => {
    try {
        const { asin } = req.params

        if (!asin) {
            return res.status(400).json({
                success: false,
                message: "ASIN is required",
            })
        }

        const product = await getProductDetails(asin)

        res.json({
            success: true,
            product,
        })
    } catch (error) {
        console.error("Error in getProduct controller:", error)

        // Handle specific errors
        if (error.message === "Product not found") {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            })
        } else if (error.message.includes("Rate limit exceeded")) {
            return res.status(429).json({
                success: false,
                message: error.message,
            })
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to get product details",
        })
    }
}

/**
 * Get popular products by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPopular = async (req, res) => {
    try {
        const { category, limit = 10 } = req.query

        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            })
        }

        const products = await getPopularProducts(category, Number.parseInt(limit, 10))

        res.json({
            success: true,
            count: products.length,
            products,
        })
    } catch (error) {
        console.error("Error in getPopular controller:", error)

        if (error.message.includes("Rate limit exceeded")) {
            return res.status(429).json({
                success: false,
                message: error.message,
            })
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to get popular products",
        })
    }
}

/**
 * Get recommended products for a child
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecommended = async (req, res) => {
    try {
        const { childId } = req.params
        const { limit = 10 } = req.query

        // Verify the child exists and belongs to the parent
        const child = await Child.findById(childId)

        if (!child) {
            return res.status(404).json({
                success: false,
                message: "Child not found",
            })
        }

        // Verify the parent has access to this child
        if (req.role === "parent" && child.parent_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this child's recommendations",
            })
        }

        // If child is accessing, verify it's their own account
        if (req.role === "child" && child._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only access your own recommendations",
            })
        }

        const products = await getRecommendedProducts(child, Number.parseInt(limit, 10))

        res.json({
            success: true,
            count: products.length,
            products,
        })
    } catch (error) {
        console.error("Error in getRecommended controller:", error)

        if (error.message.includes("Rate limit exceeded")) {
            return res.status(429).json({
                success: false,
                message: error.message,
            })
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to get recommended products",
        })
    }
}

module.exports = {
    searchProducts,
    getProduct,
    getPopular,
    getRecommended,
}

