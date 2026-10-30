const express = require('express');
const { requireAuth } = require('../middleware/auth');
const obraSocialRepository = require('../repositories/ObraSocialRepository');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await obraSocialRepository.listarActivasComoAdmin());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
