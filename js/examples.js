// js/examples.js

import { auth, storage } from './firebase-config.js'; // Importa auth e storage
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Selecionar elementos do DOM
const imageExamplesContainer = document.getElementById('imageExamplesContainer');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Função para exibir mensagens de erro/sucesso com spinner opcional
// Adicionado parâmetro 'showSpinner' para controlar o spinner no 'loadingMessage'
function showMessage(element, message, isError = true, showSpinner = false) {
    element.textContent = message;
    element.className = `message ${isError ? 'error' : 'success'}`;
    element.style.display = 'block';
    if (showSpinner) {
        element.innerHTML += ' <span class="spinner"></span>'; // Adiciona o spinner
    } else {
        // Garante que o spinner seja removido se a mensagem não for de carregamento
        element.innerHTML = message;
    }
}

function hideMessage(element) {
    element.textContent = '';
    element.style.display = 'none';
}

// ===========================================
// Lógica de Autenticação na página de Exemplos
// ===========================================

// Verifica o estado de autenticação ao carregar a página
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado, pode carregar as imagens
        console.log("Usuário logado na página de exemplos:", user.email);
        loadExampleImages();
    } else {
        // Usuário não está logado, redireciona para a página inicial
        console.log("Usuário não logado, redirecionando para index.html");
        window.location.href = 'index.html';
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário deslogado.");
        window.location.href = 'index.html'; // Redireciona para a página inicial
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        // Poderia mostrar uma mensagem de erro na UI
    }
});


// ===========================================
// Carregamento de Imagens de Exemplo do Firebase Storage
// ===========================================

async function loadExampleImages() {
    hideMessage(errorMessage); // Esconde qualquer erro anterior
    showMessage(loadingMessage, "Carregando exemplos...", false, true); // Mostra carregando com spinner

    try {
        const listRef = ref(storage, 'examples/'); // Pasta onde suas imagens de exemplo estão no Storage
        const res = await listAll(listRef);

        if (res.items.length === 0) {
            showMessage(errorMessage, "Nenhum exemplo de imagem encontrado no Firebase Storage.", true);
            hideMessage(loadingMessage); // Esconde o carregamento
            return;
        }

        // Limpa o container antes de adicionar novas imagens
        imageExamplesContainer.innerHTML = '';

        for (const itemRef of res.items) {
            const imageUrl = await getDownloadURL(itemRef);
            const imageName = itemRef.name; // Nome do arquivo

            const exampleItem = document.createElement('div');
            exampleItem.classList.add('example-item');
            exampleItem.innerHTML = `
                <img src="${imageUrl}" alt="${imageName}">
                <p>${imageName.split('.')[0]}</p>
                <button class="action-btn" data-image-url="${imageUrl}"><i class="fas fa-edit"></i> Usar este</button>
            `;
            // Adiciona evento de clique no botão para selecionar a imagem
            exampleItem.querySelector('button').addEventListener('click', (e) => {
                selectExampleImage(e.currentTarget.dataset.imageUrl);
            });

            imageExamplesContainer.appendChild(exampleItem);
        }

        hideMessage(loadingMessage); // Esconde a mensagem de carregamento

    } catch (error) {
        console.error("Erro ao carregar imagens de exemplo:", error);
        hideMessage(loadingMessage); // Esconde o carregamento
        showMessage(errorMessage, "Não foi possível carregar as imagens de exemplo. Verifique sua conexão ou as permissões do Firebase Storage.", true);
    }
}

// ===========================================
// Lógica de Seleção de Imagem para o Editor
// ===========================================

function selectExampleImage(imageUrl) {
    console.log("Imagem selecionada:", imageUrl);
    // Salva a URL da imagem selecionada no LocalStorage para que o editor.html possa acessá-la
    localStorage.setItem('selectedExampleImageUrl', imageUrl);
    // Redireciona para a página do editor
    window.location.href = 'editor.html';
}

// A chamada inicial para loadExampleImages() é feita dentro do onAuthStateChanged.