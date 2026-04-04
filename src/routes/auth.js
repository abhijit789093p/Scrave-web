const { Router } = require('express');
const { z } = require('zod');
const authService = require('../services/authService');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email(),
  password: strongPassword,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const result = await authService.register(name, email, password);

    res.status(201).json({
      message: 'Account created. Check your email to verify your account.',
      email: result.email,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);

    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    next(err);
  }
});

// Email verification
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: { message: 'Missing token', code: 'VALIDATION_ERROR' } });
    }
    const result = await authService.verifyEmail(token);
    // Redirect to landing page with success message
    res.redirect('/?verified=true');
  } catch (err) {
    next(err);
  }
});

// Forgot password — request reset link
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    next(err);
  }
});

// Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = z.object({
      token: z.string().min(1),
      password: strongPassword,
    }).parse(req.body);
    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    next(err);
  }
});

module.exports = router;
