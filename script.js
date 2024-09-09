document.addEventListener('DOMContentLoaded', function () {
    const commentForm = document.getElementById('commentForm');
    const commentsSection = document.getElementById('commentsSection');

    // Fonction pour charger les commentaires
    function loadComments() {
        fetch('http://127.0.0.1:3000/comments') // Assure-toi que le backend est sur la même URL
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
            });
    }

    // Charger les commentaires à l'initialisation
    loadComments();

    // Gérer l'envoi du formulaire
    commentForm.addEventListener('submit', function (e) {
        e.preventDefault();
    
        const formData = new FormData(commentForm);
        fetch('http://127.0.0.1:3000/comment', {  // Backend sur port 3000
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Si la réponse n'est pas "OK", on gère l'erreur
                throw new Error('Erreur lors de l\'ajout du commentaire.');
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadComments(); // Recharger les commentaires après soumission
                commentForm.reset(); // Réinitialiser le formulaire
            }
        })
        .catch(error => {
            // Gestion d'erreur uniquement si une vraie erreur survient
            alert(error.message);
        });
    });
});
