const fs = require("fs");
const path = require("path");
const { getConnection } = require("../config/dbConfig");
const puppeteer = require("puppeteer-core");
const { query } = require("./queries/queryPenerimaan");

const CHROME_EXECUTABLE_PATH = process.env.CHROME_EXECUTABLE_PATH;

// Fungsi untuk membaca file HTML
function readHtmlTemplate(fileName) {
  const filePath = path.join(__dirname, "./html", fileName);
  return fs.readFileSync(filePath, "utf-8");
}

// Fungsi untuk menghasilkan gambar dari HTML
async function generateTableImage(htmlContent) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_EXECUTABLE_PATH,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent);

  // Tunggu sampai elemen body sepenuhnya dimuat
  await page.waitForSelector("body");

  // Ambil ukuran konten halaman
  const bodyHandle = await page.$("body");
  const boundingBox = await bodyHandle.boundingBox();
  await bodyHandle.dispose();

  if (!boundingBox) {
    console.error("Unable to get bounding box of the body element.");
    await browser.close();
    return;
  }

  // Set viewport ukuran sesuai dengan konten
  await page.setViewport({
    width: Math.round(boundingBox.width),
    height: Math.round(boundingBox.height),
  });

  // Definisikan path untuk menyimpan gambar
  const imagePath = path.join(__dirname, "../media/penerimaan.png");

  // Pastikan direktori media ada
  const mediaDir = path.dirname(imagePath);
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  // Ambil screenshot dan simpan ke file
  await page.screenshot({ path: imagePath, type: "png", fullPage: true });
  await browser.close();
  return imagePath;
}

function formatNumber(value) {
  // Membagi nilai dengan 1.000.000.000 (untuk miliar) dan membulatkan ke ribuan terdekat
  const formattedValue = Math.round(value / 1_000_000_000);
  return formattedValue.toLocaleString("en-US");
}

// Fungsi untuk menangani penerimaan dan membuat gambar
async function handlePenerimaan() {
  const connection = await getConnection();

  try {
    const result = await connection.execute(query);
    const rows = result.rows;

    const today = new Date();
    today.setDate(today.getDate() - 1);
    const formattedDate = `${today.getDate()} ${today.toLocaleString("id-ID", {
      month: "long",
    })} ${today.getFullYear()}`;

    let totalTarget = 0;
    let totalNetto = 0;

    if (rows.length > 0) {
      const tableRows = rows
        .map((row) => {
          const target = parseInt(row[2]);
          const netto = parseInt(row[3]);
          totalTarget += target;
          totalNetto += netto;
          return `
          <tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${formatNumber(target)}</td>
            <td>${formatNumber(netto)}</td>
            <td>${parseFloat(row[4]).toFixed(2)}</td>
          </tr>
        `;
        })
        .join("");

      // Read and prepare HTML template
      let htmlContent = readHtmlTemplate("htmlPenerimaan.html");
      htmlContent = htmlContent.replace("{{date}}", formattedDate);
      htmlContent = htmlContent.replace("{{tableRows}}", tableRows);
      htmlContent = htmlContent.replace(
        "{{totalTarget}}",
        formatNumber(totalTarget)
      );
      htmlContent = htmlContent.replace(
        "{{totalNetto}}",
        formatNumber(totalNetto)
      );

      // Generate and return image path
      const imagePath = await generateTableImage(htmlContent);
      console.log("Hasil query berhasil disimpan sebagai gambar");
      return imagePath;
    } else {
      return "Tidak ada data yang ditemukan.";
    }
  } catch (error) {
    console.error("Error menjalankan query penerimaan:", error);
    return "Terjadi kesalahan saat mengambil data.";
  } finally {
    await connection.close();
  }
}

module.exports = handlePenerimaan;
