const express = require('express');
const router = express.Router();
const {
  registerChild,
  loginChild,
  getChildProfile,
  updateSpendingLimit,
  addBalance,
  makePurchase,
} = require('../controllers/childController');
const { verifyParent, verifyChild, verifyUser } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Children
 *   description: Child account management
 */

/**
 * @swagger
 * /api/children/{id}:
 *   get:
 *     summary: Get child profile
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns child profile
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.get('/:id', verifyChild, getChildProfile);

/**
 * @swagger
 * /api/children/{id}/spending-limit:
 *   put:
 *     summary: Update child's spending limit (by parent)
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spending_limit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Spending limit updated
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.put('/:id/spending-limit', verifyParent, updateSpendingLimit);

/**
 * @swagger
 * /api/children/{id}/add-balance:
 *   put:
 *     summary: Add balance to child's account (by parent)
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Balance updated
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.put('/:id/add-balance', verifyParent, addBalance);

/**
 * @swagger
 * /api/children/purchase:
 *   post:
 *     summary: Child makes a purchase
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [childId, amount, description]
 *             properties:
 *               childId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Insufficient balance or exceeds spending limit
 *       500:
 *         description: Server error
 */
router.post('/purchase', verifyChild, makePurchase);

module.exports = router;
