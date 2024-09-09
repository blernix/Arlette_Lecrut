document.addEventListener('DOMContentLoaded', function () {
    const commentForm = document.getElementById('commentForm');
    const commentsSection = document.getElementById('commentsSection');

    // Fonction pour charger les commentaires
    function loadComments() {
        fetch('http://127.0.0.1:3000/comments') // Backend sur le port 3000
            .then(response => response.json())
            .then(data => {
                commentsSection.innerHTML = ''; // Vider la section avant de la remplir
                if (data.length > 0) {
                    data.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.classList.add('comment');
                        commentDiv.innerHTML = `
                            <h3>${comment.firstName} ${comment.lastName}</h3>
                            <p>${comment.text}</p>
                            ${comment.photo ? `<img src="${comment.photo}" alt="Photo de ${comment.firstName}">` : ''}
                            <small>Posté le ${new Date(comment.createdAt).toLocaleDateString()}</small>
                        `;
                        commentsSection.appendChild(commentDiv);
                    });
                } else {
                    commentsSection.innerHTML = '<p>Aucun commentaire pour le moment.</p>';
                }
            })
            .catch(error => {
                commentsSection.innerHTML = '<p>Erreur lors du chargement des commentaires.</p>';
                console.error('Erreur lors de la récupération des commentaires:', error);
            });
    }

    // Charger les commentaires à l'initialisation
    loadComments();

    // Gérer l'envoi du formulaire
    commentForm.addEventListener('submit', function (e) {
        e.preventDefault();
    
        const formData = new FormData(commentForm);
        fetch('http://127.0.0.1:3000/comment', {  // Backend sur le port 3000
            method: 'POST',
            body: formData
        })
        .then(async response => {
            console.log('Statut de la réponse:', response.status); // Affiche le statut HTTP pour le débogage
    
            // Si la réponse n'est pas OK, essaye de récupérer l'erreur exacte
            if (!response.ok) {
                const errorText = await response.text(); // Tente de lire la réponse texte brute
                throw new Error(`Erreur lors de l'ajout du commentaire. Statut: ${response.status}, Détails: ${errorText}`);
            }
    
            return response.json(); // Assure-toi que le serveur renvoie bien un JSON
        })
        .then(data => {
            console.log('Réponse du serveur:', data); // Log de la réponse pour déboguer
            if (data.message) {
                alert(data.message);
                loadComments(); // Recharger les commentaires après soumission
                commentForm.reset(); // Réinitialiser le formulaire
            }
        })
        .catch(error => {
            console.error('Erreur attrapée dans le catch:', error.message); // Affiche l'erreur
            alert('Erreur lors de l\'ajout du commentaire.');
        });
    });
    
});
