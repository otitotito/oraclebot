const express = require("express");
const router = express.Router();
const handlePenerimaan = require("../handlers/handlerPenerimaan");

// Route untuk menampilkan halaman EJS
router.get("/penerimaan-kpp", async (req, res) => {
  try {
    const data = await handlePenerimaan();

    // Check if data is a string indicating an error
    if (typeof data === "string") {
      res.status(500).send(data);
    } else {
      res.render("penerimaanKPP", data);
    }
  } catch (error) {
    console.error("Error menampilkan halaman:", error);
    res.status(500).send("Terjadi kesalahan");
  }
});

module.exports = router;
