require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

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

    // Vérification et upload de la photo sur Cloudinary
    if (req.file) {
        try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'recueil_photos',
            });
            photoUrl = result.secure_url;
            fs.unlinkSync(req.file.path); // Supprimer le fichier local après upload
        } catch (error) {
            console.error('Erreur Cloudinary:', error);
            return res.status(500).json({ error: 'Erreur lors du téléchargement de la photo.' });
        }
    }

    // Ajout du commentaire à la base de données
    const newComment = new Comment({ firstName, lastName, text, photo: photoUrl });
    try {
        await newComment.save();
        return res.status(201).json({ message: 'Commentaire ajouté avec succès' });
    } catch (error) {
        console.error('Erreur MongoDB:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }
});

// GET - Récupérer tous les commentaires
app.get('/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: -1 });
        if (comments.length === 0) {
            return res.status(200).json({ message: 'Aucun commentaire pour le moment', comments: [] });
        }
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
