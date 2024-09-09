require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'http://127.0.0.1:5500',  // Autorise uniquement les requêtes venant de cette origine
    methods: ['GET', 'POST'],          // Autorise uniquement les méthodes GET et POST
    allowedHeaders: ['Content-Type']   // Autorise uniquement les en-têtes spécifiques
}));

app.options('*', cors());


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
        console.log('Chemin de destination du fichier : ', path.resolve('uploads/'));
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const filePath = Date.now() + path.extname(file.originalname);
        console.log('Nom du fichier généré : ', filePath);
        cb(null, filePath); // Garde le format du fichier
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
    console.log("Requête reçue"); // Log pour voir si la requête est reçue
    const { firstName, lastName, text } = req.body;
    let photoUrl = null;

    // Vérifie si une photo est présente, et si oui, la télécharge sur Cloudinary
    if (req.file) {
        console.log("Fichier reçu: ", req.file.path); // Log le chemin du fichier
        try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'recueil_photos',
            });
            photoUrl = result.secure_url;
            console.log('Photo uploadée sur Cloudinary, URL: ', photoUrl);

            // Vérification de l'existence du fichier avant suppression
            fs.access(req.file.path, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('Le fichier n\'existe pas, impossible de le supprimer:', err);
                } else {
                    console.log('Le fichier existe, suppression en cours:', req.file.path);

                    // Supprimer le fichier local
                    fs.unlink(req.file.path, (err) => {
                        if (err) {
                            console.error('Erreur lors de la suppression du fichier local:', err);
                        } else {
                            console.log('Fichier local supprimé avec succès');
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'upload Cloudinary:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
        }
    }

    // Création du nouveau commentaire
    const newComment = new Comment({ firstName, lastName, text, photo: photoUrl });
    try {
        await newComment.save();
        console.log("Commentaire ajouté à MongoDB");
        res.status(201).json({ message: 'Commentaire ajouté avec succès', comment: newComment });
    } catch (error) {
        console.error('Erreur MongoDB:', error);
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
