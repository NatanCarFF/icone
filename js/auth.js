// firebase-config.js deve ser importado primeiro para inicializar o app
import { app } from './firebase-config.js'; // Certifique-se de que o app Firebase foi inicializado aqui

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Elementos HTML
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginRegisterBtn = document.getElementById('loginRegisterBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const toggleText = document.getElementById('toggleText');
const authMessage = document.getElementById('authMessage');

let isLoginMode = true; // Estado inicial: modo de login

// Função para exibir mensagem
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`; // Adiciona a classe para estilização (success/error)
    authMessage.style.display = 'block';
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000); // Esconde a mensagem após 5 segundos
}

// Alternar entre login e registro
if (toggleAuthMode) { // Verifica se o elemento existe (apenas em login.html)
    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            toggleText.textContent = 'Novo por aqui?';
            toggleAuthMode.textContent = 'Registrar-se';
            loginRegisterBtn.textContent = 'Entrar';
        } else {
            toggleText.textContent = 'Já tem uma conta?';
            toggleAuthMode.textContent = 'Fazer Login';
            loginRegisterBtn.textContent = 'Registrar';
        }
        authMessage.style.display = 'none'; // Limpa a mensagem ao trocar o modo
    });
}

// Lidar com login/registro por email e senha
if (authForm) { // Verifica se o formulário existe (apenas em login.html)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        loginRegisterBtn.disabled = true; // Desabilita o botão para evitar múltiplos cliques
        loginRegisterBtn.textContent = 'Aguarde...';

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                showMessage('Login bem-sucedido!', 'success');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                showMessage('Registro bem-sucedido! Você foi logado.', 'success');
            }
            // Redireciona após sucesso. onAuthStateChanged já cuida disso.
        } catch (error) {
            let errorMessage = 'Ocorreu um erro. Tente novamente.';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Usuário desabilitado.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado.';
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
                case 'auth/network-request-failed':
                    errorMessage = 'Erro de conexão. Verifique sua internet.';
                    break;
                default:
                    errorMessage = `Erro: ${error.message}`;
            }
            showMessage(errorMessage, 'error');
            console.error(error);
        } finally {
            loginRegisterBtn.disabled = false; // Reabilita o botão
            loginRegisterBtn.textContent = isLoginMode ? 'Entrar' : 'Registrar';
        }
    });
}

// Lidar com login com Google
if (googleSignInBtn) { // Verifica se o botão existe (apenas em login.html)
    googleSignInBtn.addEventListener('click', async () => {
        googleSignInBtn.disabled = true;
        googleSignInBtn.textContent = 'Aguarde...';
        try {
            await signInWithPopup(auth, googleProvider);
            showMessage('Login com Google bem-sucedido!', 'success');
            // Redireciona após sucesso. onAuthStateChanged já cuida disso.
        } catch (error) {
            let errorMessage = 'Erro ao fazer login com Google.';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login com Google cancelado.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = 'Pop-up de login com Google já em andamento.';
            } else {
                errorMessage = `Erro: ${error.message}`;
            }
            showMessage(errorMessage, 'error');
            console.error(error);
        } finally {
            googleSignInBtn.disabled = false;
            googleSignInBtn.innerHTML = '<i class="fab fa-google"></i> Entrar com Google';
        }
    });
}

// Lidar com logout
if (logoutBtn) { // Verifica se o botão existe (em header de outras páginas)
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessage('Desconectado com sucesso!', 'success');
            // Redireciona para a página de login. onAuthStateChanged já cuida disso.
        } catch (error) {
            showMessage(`Erro ao desconectar: ${error.message}`, 'error');
            console.error(error);
        }
    });
}

// Observar o estado de autenticação (para todas as páginas que importam este script)
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split('/').pop();

    if (user) {
        // Usuário logado
        if (currentPage === 'login.html' || currentPage === '') {
            // Se estiver na página de login, redireciona para o editor
            window.location.href = 'editor.html';
        }
        // Em outras páginas (editor.html, examples.html), garante que o botão de logout esteja visível
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
    } else {
        // Usuário não logado
        if (currentPage !== 'login.html' && currentPage !== '') {
            // Se não estiver na página de login, redireciona para login
            window.location.href = 'login.html';
        }
        // Em todas as páginas, garante que o botão de logout esteja oculto
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
    }
});