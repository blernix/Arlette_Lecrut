require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();

// Liste des origines autorisées
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'https://arlette-lecrut.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Si l'origine est dans la liste des origines autorisées ou si elle est absente (comme dans les requêtes locales avec Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Non autorisé par la politique CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.options('*', cors()); // Activer les options pré-vol CORS pour toutes les routes

// Middleware pour parser le JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Utilisation de multer-storage-cloudinary pour stocker directement sur Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'recueil_photos', // Dossier dans Cloudinary
        format: async (req, file) => 'png', // ou autre format selon vos besoins
        public_id: (req, file) => Date.now() + '-' + file.originalname
    },
});

const upload = multer({ storage });

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connexion à MongoDB réussie'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Modèle pour les commentaires
const commentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    text: String,
    photo: String,
    createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// POST - Ajouter un commentaire avec photo
app.post('/comment', upload.single('photo'), async (req, res) => {
    console.log("Requête reçue");
    const { firstName, lastName, text } = req.body;
    let photoUrl = null;

    // Si une photo est présente, multer la télécharge directement sur Cloudinary
    if (req.file) {
        photoUrl = req.file.path;  // multer-storage-cloudinary renvoie le chemin sécurisé
        console.log('Photo uploadée sur Cloudinary, URL: ', photoUrl);
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
