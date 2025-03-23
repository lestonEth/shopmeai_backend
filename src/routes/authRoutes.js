const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController"); // Ensure this path is correct

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication routes
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.
 *               role:
 *                type: string
 *                example: parent
 *               password:
 *                 type: string
 *                 format: password
 *                 example: mysecurepassword
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: mysecurepassword
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized (wrong credentials)
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", authController.logout);

module.exports = router;
