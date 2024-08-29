const fs = require("fs");
const handlePenerimaan = require("../handlerPenerimaan");

async function handlePenerimaanMessage(socket, chat) {
  try {
    const imagePath = await handlePenerimaan();

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      await socket.sendMessage(
        chat.key.remoteJid,
        {
          image: imageBuffer,
          caption: "Data selengkapnya ada di xxxxx",
        },
        { quoted: chat }
      );
    } else {
      await socket.sendMessage(
        chat.key.remoteJid,
        { text: "Gambar tidak ditemukan." },
        { quoted: chat }
      );
    }
  } catch (error) {
    console.error(
      "Error dalam proses pembuatan atau pengiriman gambar:",
      error
    );
    await socket.sendMessage(
      chat.key.remoteJid,
      { text: "Terjadi kesalahan dalam proses pembuatan gambar." },
      { quoted: chat }
    );
  }
}

module.exports = handlePenerimaanMessage;
