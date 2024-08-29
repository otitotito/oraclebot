require("dotenv").config();
const { getConnection } = require("./config/dbConfig");
const {
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const registeredNumbers = JSON.parse(process.env.REGISTERED_NUMBERS);

// respon
const handlePenerimaanMessage = require("./handlers/messages/handlePenerimaanMessage");

async function connectWhatsapp() {
  const auth = await useMultiFileAuthState("session");
  const socket = makeWASocket({
    printQRInTerminal: false,
    browser: ["oraclebot", "", ""],
    auth: auth.state,
    logger: pino({ level: "silent" }),
  });

  socket.ev.on("creds.update", auth.saveCreds);

  socket.ev.on("connection.update", async ({ connection, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true }); // Cetak QR code ke terminal
    }

    if (connection === "open") {
      console.log("BOT WHATSAPP SUDAH SIAP✅ -- BY RNA!");
    } else if (connection === "close") {
      console.log("Koneksi terputus, mencoba untuk menyambung kembali...");
      await connectWhatsapp();
    }
  });

  socket.ev.on("messages.upsert", async ({ messages }) => {
    const chat = messages[0];
    const number = chat.key.remoteJid.split("@")[0];
    const sender = chat.pushName || "Tidak Diketahui";
    const pesan =
      (
        chat.message?.extendedTextMessage?.text ??
        chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ??
        chat.message?.conversation
      )?.toLowerCase() || "";

    if (chat.key.fromMe) return;

    // Check if the number is registered
    if (!registeredNumbers.includes(number)) {
      console.log(
        `Nomor ${number} tidak diizinkan. Pesan tidak akan diproses.`
      );
      return;
    }

    console.log("Nomor pengguna:", number);
    console.log("Nama pengirim:", sender);
    console.log("Pesan:", pesan);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let response; // Initialize response to undefined

    if (pesan.includes("penerimaan")) {
      await handlePenerimaanMessage(socket, chat);
    } else if (pesan.includes("penerimaan per wilayah")) {
      const wilayah = pesan.split("per wilayah")[1].trim();
      response = await handlePenerimaanPerWilayah(wilayah);
    } else {
      response =
        "Halo, selamat datang di XXX!\n\n" +
        "Masukkan kata kunci di bawah ini:\n" +
        "1. penerimaan\n" +
        "2. xxxx\n" +
        "3. xxx";
    }

    // Only send the response if it's defined and not null
    if (response) {
      if (typeof response !== "string") {
        response = JSON.stringify(response);
      }

      try {
        // Send the main response
        await socket.sendMessage(
          chat.key.remoteJid,
          { text: response },
          { quoted: chat }
        );
      } catch (error) {
        console.error("Error dalam proses pesan:", error);
      }
    }
  });
}

// Start WhatsApp connection
connectWhatsapp().catch(console.error);
