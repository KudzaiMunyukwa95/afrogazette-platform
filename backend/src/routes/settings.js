const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Get all settings
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM settings ORDER BY setting_key'
    );

    // Convert to key-value object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

// Get specific setting
router.get('/:key', authMiddleware, async (req, res, next) => {
  try {
    const { key } = req.params;

    const result = await query(
      'SELECT * FROM settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update setting (Admin only)
router.put('/:key', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if setting exists
    const existingSetting = await query(
      'SELECT * FROM settings WHERE setting_key = $1',
      [key]
    );

    let result;
    if (existingSetting.rows.length > 0) {
      // Update existing setting
      result = await query(
        `UPDATE settings 
         SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = $2 
         RETURNING *`,
        [value, key]
      );
    } else {
      // Create new setting
      result = await query(
        `INSERT INTO settings (setting_key, setting_value) 
         VALUES ($1, $2) 
         RETURNING *`,
        [key, value]
      );
    }

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update multiple settings at once (Admin only)
router.post('/bulk-update', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      const updatePromise = query(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [key, value]
      );
      updates.push(updatePromise);
    }

    await Promise.all(updates);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete setting (Admin only)
router.delete('/:key', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;

    // Prevent deletion of critical settings
    const protectedSettings = ['company_name', 'default_commission_rate', 'invoice_prefix'];
    if (protectedSettings.includes(key)) {
      return res.status(400).json({ 
        error: 'Cannot delete protected setting',
        details: 'This setting is required for system operation'
      });
    }

    const result = await query(
      'DELETE FROM settings WHERE setting_key = $1 RETURNING *',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Reset settings to defaults (Admin only)
router.post('/reset-defaults', authMiddleware, roleCheck('admin'), async (req, res, next) => {
  try {
    const defaults = {
      company_name: 'AfroGazette Media & Advertising',
      company_address: 'Office 4, Second Floor, Karimapondo Building, 78 Leopold Takawira, Harare, Zimbabwe',
      default_commission_rate: '10.00',
      invoice_prefix: 'INV'
    };

    const updates = [];
    for (const [key, value] of Object.entries(defaults)) {
      const updatePromise = query(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
      updates.push(updatePromise);
    }

    await Promise.all(updates);

    res.json({ 
      message: 'Settings reset to defaults successfully',
      defaults
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
