// routes/amazonRoutes.js
const express = require("express")
const router = express.Router()
const { searchProducts, getProduct, getPopular, getRecommended } = require("../controllers/amazonController")
const { verifyUser, verifyParent, verifyChild } = require("../middleware/authMiddleware")
const { amazonApiLimiter } = require("../middleware/rateLimitMiddleware")

/**
 * @swagger
 * tags:
 *   name: Amazon
 *   description: Amazon product search and recommendations
 */

/**
 * @swagger
 * /api/amazon/search:
 *   get:
 *     summary: Search for Amazon products
 *     tags: [Amazon]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keywords
 *         schema:
 *           type: string
 *         description: Search keywords
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Product category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: List of products
 *       400:
 *         description: Invalid parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get("/search", verifyUser, amazonApiLimiter, searchProducts)

/**
 * @swagger
 * /api/amazon/product/{asin}:
 *   get:
 *     summary: Get product details by ASIN
 *     tags: [Amazon]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asin
 *         required: true
 *         schema:
 *           type: string
 *         description: Amazon Standard Identification Number
 *     responses:
 *       200:
 *         description: Product details
 *       400:
 *         description: ASIN is required
 *       404:
 *         description: Product not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get("/product/:asin", verifyUser, amazonApiLimiter, getProduct)

/**
 * @swagger
 * /api/amazon/popular:
 *   get:
 *     summary: Get popular products by category
 *     tags: [Amazon]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Product category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of popular products
 *       400:
 *         description: Category is required
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get("/popular", verifyUser, amazonApiLimiter, getPopular)

/**
 * @swagger
 * /api/amazon/recommended/{childId}:
 *   get:
 *     summary: Get recommended products for a child
 *     tags: [Amazon]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of recommended products
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Child not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get("/recommended/:childId", verifyUser, amazonApiLimiter, getRecommended)

module.exports = router

