// js/auth.js

// Importa as instâncias de auth do seu firebase-config.js
import { auth } from './firebase-config.js';

// Importa as funções específicas de autenticação do Firebase
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider, // Para login com Google
    signInWithPopup,    // Para login com Google
    onAuthStateChanged,  // Para monitorar o estado de autenticação
    signOut             // Para logout
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Selecionar elementos do DOM
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('authMessage');
const loginRegisterBtn = document.getElementById('loginRegisterBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const toggleText = document.getElementById('toggleText');

let isRegisterMode = false; // Começa em modo de login

// Função para exibir mensagens ao usuário
// Ajustada para usar as classes CSS e exibir/ocultar
function showMessage(message, isError = true) {
    authMessage.textContent = message;
    authMessage.className = `message ${isError ? 'error' : 'success'}`;
    authMessage.style.display = 'block'; // Garante que a mensagem seja visível
    // Se a mensagem for um "loading", adiciona o spinner
    if (message.includes('Processando') || message.includes('Entrando')) {
        authMessage.innerHTML += ' <span class="spinner"></span>';
    }
}

// Função para ocultar a mensagem
function hideMessage() {
    authMessage.textContent = '';
    authMessage.style.display = 'none';
}


// Alternar entre modo de login e registro
toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode; // Inverte o modo

    if (isRegisterMode) {
        loginRegisterBtn.textContent = 'Registrar';
        toggleText.textContent = 'Já tem uma conta?';
        toggleAuthMode.textContent = 'Entrar';
    } else {
        loginRegisterBtn.textContent = 'Entrar / Registrar';
        toggleText.textContent = 'Novo por aqui?';
        toggleAuthMode.textContent = 'Registrar-se';
    }
    hideMessage(); // Oculta qualquer mensagem ao alternar o modo
});

// Lidar com o envio do formulário (login ou registro)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Por favor, preencha todos os campos.', true);
        return;
    }

    // Exibir mensagem de processamento com spinner
    showMessage('Processando...', false);

    try {
        if (isRegisterMode) {
            // Usar createUserWithEmailAndPassword importado
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Registro bem-sucedido! Redirecionando...', false);
        } else {
            // Usar signInWithEmailAndPassword importado
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('Login bem-sucedido! Redirecionando...', false);
        }
        // Redireciona após um pequeno atraso para a mensagem ser lida
        setTimeout(() => {
            window.location.href = 'examples.html'; // Redireciona para a página de exemplos
        }, 1500);

    } catch (error) {
        console.error("Erro de autenticação:", error);
        let errorMessage = "Ocorreu um erro de autenticação.";
        // Mensagens de erro mais amigáveis
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'O formato do email é inválido.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta conta foi desativada.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Nenhum usuário encontrado com este email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Senha incorreta.';
                break;
            case 'auth/email-already-in-use':
                errorMessage = 'Este email já está em uso.';
                break;
            case 'auth/weak-password':
                errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
                break;
            default:
                errorMessage = `Erro: ${error.message}`;
        }
        showMessage(errorMessage, true);
    }
});

// Lidar com o login social (Google)
googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    // Exibir mensagem de processamento com spinner antes do popup
    showMessage('Entrando com Google...', false);


    try {
        // Usar signInWithPopup importado
        await signInWithPopup(auth, provider);
        showMessage('Login com Google bem-sucedido! Redirecionando...', false);
        setTimeout(() => {
            window.location.href = 'examples.html'; // Ou 'editor.html'
        }, 1500);
    } catch (error) {
        console.error("Erro ao fazer login com Google:", error);
        let errorMessage = "Ocorreu um erro ao tentar login com Google.";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "A janela de login do Google foi fechada.";
        } else {
            errorMessage = `Erro: ${error.message}`;
        }
        showMessage(errorMessage);
    }
});

// Monitorar o estado de autenticação para redirecionar se já logado
// Usar onAuthStateChanged importado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado
        console.log("Usuário logado:", user.email);
        // Opcional: redirecionar automaticamente se o usuário tentar acessar login.html já logado
        if (window.location.pathname.endsWith('login.html')) {
             window.location.href = 'examples.html'; // Redireciona para exemplos.html
        }
    } else {
        // Usuário não está logado
        console.log("Usuário não logado.");
        // Se o usuário não está logado e não está na página de login, redireciona
        if (!window.location.pathname.endsWith('login.html') &&
            !window.location.pathname.endsWith('index.html')) { // Não redireciona se já estiver no index
            window.location.href = 'index.html'; // Redireciona para a página inicial
        }
    }
});

// Adicionar um ouvinte de evento para o botão de logout (se houver um no login.html, o que não é comum)
// No seu setup, o logoutBtn está no editor.html e examples.html.
// Mas se por acaso existir um na página de login para algum fluxo específico:
if (document.getElementById('logoutBtn')) { // Verifica se o elemento existe
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Usuário deslogado.");
            window.location.href = 'index.html'; // Redireciona para a página inicial
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            // Poderia mostrar uma mensagem de erro na UI se houver um elemento para isso
        }
    });
}