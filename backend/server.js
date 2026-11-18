
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const FormData = require("form-data");
const axios = require("axios");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Recevoir le PDF en mémoire
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        if (
            file.mimetype === "application/pdf" ||
            file.originalname.toLowerCase().endsWith(".pdf")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers PDF sont autorisés."));
        }
    }
});

// Vérifier que le serveur fonctionne
app.get("/", (req, res) => {
    res.send("DiplomaChain Backend fonctionne !");
});

// Envoyer le PDF vers Pinata
app.post("/upload", upload.single("pdf"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Aucun fichier PDF reçu."
            });
        }

        if (!process.env.PINATA_JWT) {
            return res.status(500).json({
                success: false,
                message: "Configuration Pinata manquante."
            });
        }

        const formData = new FormData();

        formData.append(
            "file",
            req.file.buffer,
            {
                filename: req.file.originalname,
                contentType: "application/pdf"
            }
        );

        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PINATA_JWT}`,
                    ...formData.getHeaders()
                },
                maxBodyLength: Infinity
            }
        );

        res.json({
            success: true,
            message: "PDF envoyé sur IPFS avec succès.",
            cid: response.data.IpfsHash
        });

    } catch (error) {

        console.error("Erreur Pinata :", error.response?.data || error.message);

        res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi du PDF vers Pinata."
        });
    }
});

// Gestion des erreurs de fichiers
app.use((error, req, res, next) => {
    res.status(400).json({
        success: false,
        message: error.message
    });
});

module.exports = app;
