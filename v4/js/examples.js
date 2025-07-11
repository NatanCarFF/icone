// js/examples.js

import { auth, storage } from './firebase-config.js'; // Importa auth e storage
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Selecionar elementos do DOM
const imageExamplesContainer = document.getElementById('imageExamplesContainer');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Função para exibir mensagens de erro/sucesso
function showMessage(element, message, isError = true) {
    element.textContent = message;
    element.className = `message ${isError ? 'error' : 'success'}`;
    element.style.display = 'block';
}

function hideMessage(element) {
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
        // Usuário não está logado, redireciona para a página de login
        console.log("Usuário não logado na página de exemplos. Redirecionando...");
        window.location.href = 'login.html';
    }
});

// Lógica para o botão de logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário deslogado.");
        window.location.href = 'login.html'; // Redireciona para login após logout
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessage(errorMessage, "Erro ao fazer logout. Tente novamente.", true);
    }
});


// ===========================================
// Lógica de Carregamento e Exibição de Imagens
// ===========================================

async function loadExampleImages() {
    loadingMessage.style.display = 'block'; // Mostra a mensagem de carregamento
    hideMessage(errorMessage); // Esconde qualquer erro anterior
    imageExamplesContainer.innerHTML = ''; // Limpa o container

    try {
        // Cria uma referência para a pasta 'examples' no Firebase Storage
        const examplesListRef = ref(storage, 'examples/'); // Certifique-se que o nome da pasta corresponde ao seu Storage

        // Lista todos os itens (arquivos) dentro da pasta
        const res = await listAll(examplesListRef);

        if (res.items.length === 0) {
            loadingMessage.textContent = 'Nenhum exemplo de imagem encontrado no Storage.';
            return;
        }

        // Para cada item, obtenha a URL de download e exiba
        for (const itemRef of res.items) {
            const imageUrl = await getDownloadURL(itemRef);
            const imageName = itemRef.name; // Nome do arquivo

            const exampleItem = document.createElement('div');
            exampleItem.classList.add('example-item');
            exampleItem.innerHTML = `
                <img src="${imageUrl}" alt="${imageName}">
                <p>${imageName.split('.')[0]}</p>
            `;
            // Adiciona evento de clique para selecionar a imagem
            exampleItem.addEventListener('click', () => selectExampleImage(imageUrl));
            imageExamplesContainer.appendChild(exampleItem);
        }

        loadingMessage.style.display = 'none'; // Esconde a mensagem de carregamento
    } catch (error) {
        console.error("Erro ao carregar imagens de exemplo:", error);
        loadingMessage.style.display = 'none'; // Esconde o carregamento
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

// loadExampleImages(); // Não chame aqui, pois onAuthStateChanged já faz isso