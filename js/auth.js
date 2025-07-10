// js/auth.js

import { auth } from './firebase-config.js';

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
function showMessage(message, isError = true) {
    authMessage.textContent = message;
    authMessage.className = `message ${isError ? 'error' : 'success'}`;
}

// Alternar entre modo de login e registro
toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
        toggleText.textContent = 'Já tem uma conta?';
        toggleAuthMode.textContent = 'Entrar';
        loginRegisterBtn.textContent = 'Registrar';
    } else {
        toggleText.textContent = 'Novo por aqui?';
        toggleAuthMode.textContent = 'Registrar-se';
        loginRegisterBtn.textContent = 'Entrar / Registrar'; // Ou apenas "Entrar"
    }
    authMessage.textContent = ''; // Limpa a mensagem ao trocar o modo
});

// Manipular o formulário de login/registro
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    authMessage.textContent = 'Processando...';
    authMessage.className = 'message'; // Limpa classes de sucesso/erro anteriores

    try {
        if (isRegisterMode) {
            // Modo de Registro
            await auth.createUserWithEmailAndPassword(email, password);
            showMessage('Usuário registrado com sucesso! Redirecionando...', false);
        } else {
            // Modo de Login
            await auth.signInWithEmailAndPassword(email, password);
            showMessage('Login bem-sucedido! Redirecionando...', false);
        }
        // Redireciona após sucesso (ex: para a página de exemplos ou editor)
        setTimeout(() => {
            window.location.href = 'examples.html'; // Ou 'editor.html'
        }, 1500);

    } catch (error) {
        console.error("Erro de autenticação:", error);
        let errorMessage = "Ocorreu um erro desconhecido.";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "Este e-mail já está em uso.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Formato de e-mail inválido.";
                break;
            case 'auth/weak-password':
                errorMessage = "A senha deve ter pelo menos 6 caracteres.";
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = "E-mail ou senha incorretos.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
                break;
            default:
                errorMessage = `Erro: ${error.message}`;
        }
        showMessage(errorMessage);
    }
});

// Login com Google
googleSignInBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    authMessage.textContent = 'Entrando com Google...';
    authMessage.className = 'message';

    try {
        await auth.signInWithPopup(provider);
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
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuário está logado
        console.log("Usuário logado:", user.email);
        // Opcional: redirecionar automaticamente se o usuário tentar acessar login.html já logado
        // mas vamos permitir que ele veja a página de login por enquanto.
        // Se você quiser redirecionar, adicione: window.location.href = 'examples.html';
    } else {
        // Usuário não está logado
        console.log("Usuário não logado.");
    }
});