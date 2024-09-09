require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware pour parser le JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Configuration de multer pour stocker temporairement les fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Garde le format du fichier
    }
});
const upload = multer({ storage });

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

// Modèle pour les commentaires
const commentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    text: String,
    photo: String,
    createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// POST - Ajouter un commentaire
app.post('/comment', upload.single('photo'), async (req, res) => {
    const { firstName, lastName, text } = req.body;
    let photoUrl = null;

    // Vérifie si une photo est présente, et si oui, la télécharge sur Cloudinary
    if (req.file) {
        try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'recueil_photos', // Crée un dossier spécifique dans Cloudinary
            });
            photoUrl = result.secure_url; // Récupère l'URL sécurisée de l'image
            // Supprime le fichier local après l'upload
            fs.unlinkSync(req.file.path);
        } catch (error) {
            return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
        }
    }

    // Création du nouveau commentaire
    const newComment = new Comment({ firstName, lastName, text, photo: photoUrl });
    try {
        await newComment.save();
        res.status(201).json({ message: 'Commentaire ajouté avec succès', comment: newComment });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
    }
});

// GET - Récupérer tous les commentaires
app.get('/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
