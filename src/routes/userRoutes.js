const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyUser, verifyParent } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Parent Users
 *   description: User management routes
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns user profile
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/profile', verifyUser, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/profile', verifyUser, userController.updateProfile);

/**
 * @swagger
 * /api/users/children:
 *   get:
 *     summary: Get all children under the parent
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of children
 *       500:
 *         description: Server error
 */
router.get('/children', verifyUser, verifyParent, userController.getChildren);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete a user account (Only parent can delete a child)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Unauthorized (Only parent can delete a child)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/:userId', verifyUser, verifyParent, userController.deleteUser);

/**
 * @swagger
 * /api/users/children/{childId}:
 *   put:
 *     summary: Update child profile (Only parent can update)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the child to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: number
 *               balance:
 *                 type: number
 *               spendingLimit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Child profile updated successfully
 *       403:
 *         description: Unauthorized (Only parent can update)
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.put('/children/:childId', verifyUser, verifyParent, userController.updateChild);

/**
 * @swagger
 * /api/users/child/{childId}:
 *   put:
 *     summary: Update child profile (Only parent can update)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the child to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: number
 *     responses:
 *       200:
 *         description: Child updated successfully
 *       403:
 *         description: Unauthorized (Only parent can update child)
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.put('/child/:childId', verifyUser, verifyParent, userController.updateChild);

/**
 * @swagger
 * /api/users/child/{childId}:
 *   delete:
 *     summary: Delete a child (Only parent can delete)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the child to delete
 *     responses:
 *       200:
 *         description: Child deleted successfully
 *       403:
 *         description: Unauthorized (Only parent can delete child)
 *       404:
 *         description: Child not found
 *       500:
 *         description: Server error
 */
router.delete('/child/:childId', verifyUser, verifyParent, userController.deleteChild);

module.exports = router;
