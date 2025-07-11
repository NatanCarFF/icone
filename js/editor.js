// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
// CORREÇÃO: Importar JSZip e JSZipUtils como namespace (*)
import * as JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

// ===========================================
// Seleção de Elementos e Variáveis Globais
// ===========================================
const logoutBtn = document.getElementById('logoutBtn');
const imageUpload = document.getElementById('imageUpload');
const iconCanvas = document.getElementById('iconCanvas');
const ctx = iconCanvas.getContext('2d');
const scaleSlider = document.getElementById('scaleSlider');
const rotationSlider = document.getElementById('rotationSlider');
const xOffsetSlider = document.getElementById('xOffsetSlider');
const yOffsetSlider = document.getElementById('yOffsetSlider');
const resetEditorBtn = document.getElementById('resetEditorBtn');
const generateIconsBtn = document.getElementById('generateIconsBtn');
const editorMessage = document.getElementById('editorMessage');
const downloadSection = document.getElementById('downloadSection'); // Usar ID, não a classe
const generatedIconsContainer = document.getElementById('generatedIconsContainer');
const downloadAllZip = document.getElementById('downloadAllZip'); // Botão Baixar Todos (ZIP)

let originalImage = new Image();
let imageLoaded = false;
let imageProps = {
    scale: 1,
    rotation: 0,
    xOffset: 0,
    yOffset: 0
};

// ===========================================
// Configurações do Canvas e Desenho
// ===========================================
const CANVAS_SIZE = 512; // Tamanho base do canvas para edição
iconCanvas.width = CANVAS_SIZE;
iconCanvas.height = CANVAS_SIZE;

// Função principal para desenhar a imagem no canvas
function drawImage() {
    console.log("drawImage chamado. imageLoaded:", imageLoaded);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Limpa o canvas

    if (imageLoaded) {
        console.log("originalImage dimensões:", originalImage.width, "x", originalImage.height);

        // Salva o estado atual do contexto
        ctx.save();

        // Move a origem para o centro do canvas mais o offset da imagem
        const centerX = CANVAS_SIZE / 2 + imageProps.xOffset;
        const centerY = CANVAS_SIZE / 2 + imageProps.yOffset;
        ctx.translate(centerX, centerY);

        // Aplica rotação
        ctx.rotate(imageProps.rotation * Math.PI / 180);

        // Calcula as dimensões escaladas da imagem
        const scaledWidth = originalImage.width * imageProps.scale;
        const scaledHeight = originalImage.height * imageProps.scale;

        console.log(`Desenho: escala=${imageProps.scale}, rot=${imageProps.rotation}, xOff=${imageProps.xOffset}, yOff=${imageProps.yOffset}`);
        console.log(`Dimensões desenhadas: ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}`);

        // Desenha a imagem centralizada na nova origem
        ctx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

        // Restaura o estado anterior do contexto
        ctx.restore();
    } else {
        // Desenha um placeholder se nenhuma imagem estiver carregada
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = '#ccc';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Carregue ou escolha uma imagem', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
}

// ===========================================
// Funções de Utilitário
// ===========================================

// Exibe mensagens para o usuário
function showMessage(message, isError = false) {
    editorMessage.textContent = message;
    editorMessage.className = `message ${isError ? 'error' : 'success'}`;
    editorMessage.style.display = 'block';
}

// Oculta mensagens
function hideMessage() {
    editorMessage.style.display = 'none';
}

// Reseta as propriedades de edição da imagem para o estado inicial
function resetImageProperties() {
    imageProps = {
        scale: 1,
        rotation: 0,
        xOffset: 0,
        yOffset: 0
    };
    scaleSlider.value = imageProps.scale;
    rotationSlider.value = imageProps.rotation;
    xOffsetSlider.value = imageProps.xOffset;
    yOffsetSlider.value = imageProps.yOffset;
    drawImage();
}

// ===========================================
// Manipuladores de Eventos
// ===========================================

// Carrega imagem do input de arquivo
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            // NÂO É NECESSÁRIO AQUI: originalImage.crossOrigin = "anonymous";
            // Porque é um Data URL, que já é considerado da mesma origem
            originalImage.onload = () => {
                imageLoaded = true;
                resetImageProperties();
                drawImage();
                showMessage("Imagem carregada com sucesso!", false);
            };
            originalImage.onerror = () => {
                showMessage("Não foi possível carregar a imagem do arquivo.", true);
                imageLoaded = false;
                drawImage();
            };
            originalImage.src = e.target.result;
        };
        reader.onerror = () => {
            showMessage("Erro ao ler o arquivo de imagem.", true);
        };
        reader.readAsDataURL(file);
    }
});

// Carrega imagem via URL (usado para exemplos do Firebase Storage)
function loadImageFromUrl(url) {
    console.log("loadImageFromUrl chamado com URL:", url.substring(0, 100) + "...");
    originalImage = new Image(); // Recria a imagem para garantir que crossOrigin seja aplicado
    originalImage.crossOrigin = "anonymous"; // *** ESSENCIAL: Permite que a imagem de outra origem seja usada no canvas ***

    originalImage.onload = () => {
        imageLoaded = true;
        console.log("Imagem carregada com SUCESSO. Dimensões:", originalImage.width, "x", originalImage.height);
        resetImageProperties(); // Reinicia as propriedades ao carregar nova imagem
        drawImage();
        showMessage("Imagem carregada com sucesso!", false);
    };
    originalImage.onerror = (e) => {
        imageLoaded = false;
        console.error("Erro ao carregar imagem do URL:", e);
        showMessage("Erro ao carregar imagem do URL. Verifique a URL ou suas permissões CORS no Firebase Storage.", true);
        drawImage(); // Desenha o texto de placeholder
    };
    originalImage.src = url;
}

// Sliders de edição
scaleSlider.addEventListener('input', (e) => {
    imageProps.scale = parseFloat(e.target.value);
    drawImage();
});

rotationSlider.addEventListener('input', (e) => {
    imageProps.rotation = parseInt(e.target.value);
    drawImage();
});

xOffsetSlider.addEventListener('input', (e) => {
    imageProps.xOffset = parseInt(e.target.value);
    drawImage();
});

yOffsetSlider.addEventListener('input', (e) => {
    imageProps.yOffset = parseInt(e.target.value);
    drawImage();
});

// Botão de reset
resetEditorBtn.addEventListener('click', () => {
    if (imageLoaded) {
        resetImageProperties();
        showMessage("Edição resetada.", false);
    } else {
        showMessage("Nenhuma imagem para resetar.", true);
    }
});

// ===========================================
// Geração e Download de Ícones
// ===========================================

// Definições de densidade para ícones Android
const ANDROID_DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// Gera os ícones e os exibe para download
generateIconsBtn.addEventListener('click', async () => {
    if (!imageLoaded) {
        showMessage("Por favor, carregue ou escolha uma imagem primeiro.", true);
        return;
    }

    hideMessage();
    generatedIconsContainer.innerHTML = ''; // Limpa ícones anteriores
    downloadSection.style.display = 'block'; // Mostra a seção de download

    try {
        const generatedIcons = [];

        // Para cada densidade, gera o ícone
        for (const density in ANDROID_DENSITIES) {
            const size = ANDROID_DENSITIES[density];
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');

            // Desenha a imagem no canvas temporário com as propriedades atuais
            tempCtx.clearRect(0, 0, size, size);
            tempCtx.save();
            // As propriedades de escala e offset devem ser ajustadas para o novo tamanho do canvas
            // Calculamos o fator de escala relativo ao canvas principal de 512px
            const scaleFactor = size / CANVAS_SIZE;

            tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
            tempCtx.rotate(imageProps.rotation * Math.PI / 180);

            const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
            const scaledHeight = originalImage.height * imageProps.scale * scaleFactor;
            tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            tempCtx.restore();

            const imageUrl = tempCanvas.toDataURL('image/png'); // AQUI OCORRE O ERRO SE CORS NÃO ESTIVER OK

            generatedIcons.push({ density, imageUrl, size });

            // Cria o elemento para exibir e baixar
            const iconItem = document.createElement('div');
            iconItem.classList.add('generated-icon-item');
            iconItem.innerHTML = `
                <img src="${imageUrl}" alt="Icon ${density}">
                <p>mdpi</p> <a href="${imageUrl}" download="ic_launcher_${density}.png">Baixar (.png)</a>
            `;
            iconItem.querySelector('p').textContent = density; // Define o texto da densidade corretamente
            generatedIconsContainer.appendChild(iconItem);
        }
        showMessage("Ícones gerados com sucesso! Role para baixo para baixar.", false);

    } catch (error) {
        console.error("Erro ao gerar ícones:", error);
        if (error.name === "SecurityError") {
            showMessage("Erro de segurança: Imagem de outra origem não pode ser usada no canvas. Verifique as configurações CORS do Firebase Storage e se 'originalImage.crossOrigin = \"anonymous\"' está no código.", true);
        } else {
            showMessage("Erro ao gerar ícones: " + error.message, true);
        }
    }
});


// Função para gerar e baixar todos os ícones em um ZIP
downloadAllZip.addEventListener('click', async () => {
    if (!imageLoaded) {
        showMessage("Nenhuma imagem carregada para gerar o ZIP.", true);
        return;
    }

    showMessage("Gerando ZIP... Aguarde.", false);
    const zip = new JSZip();

    try {
        // Para cada densidade, adicione a imagem ao ZIP
        for (const density in ANDROID_DENSITIES) {
            const size = ANDROID_DENSITIES[density];
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');

            // Desenha a imagem no canvas temporário
            tempCtx.clearRect(0, 0, size, size);
            tempCtx.save();
            const scaleFactor = size / CANVAS_SIZE;
            tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
            tempCtx.rotate(imageProps.rotation * Math.PI / 180);

            const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
            const scaledHeight = originalImage.height * imageProps.scale * scaleFactor;
            tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            tempCtx.restore();

            // Obtém o blob da imagem
            // .toBlob é assíncrono, então usamos Promise para aguardar
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));

            // Adiciona a imagem ao ZIP dentro da estrutura de pastas Android
            zip.file(`res/drawable-${density}/ic_launcher.png`, blob);
        }

        // Gera o ZIP e força o download
        zip.generateAsync({ type: "blob" })
            .then(function(content) {
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(content);
                downloadLink.download = "android_icons.zip";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                showMessage("ZIP gerado com sucesso! Baixe o arquivo.", false);
            })
            .catch(error => {
                console.error("Erro ao gerar ZIP:", error);
                showMessage("Erro ao gerar ZIP: " + error.message, true);
            });

    } catch (error) {
        console.error("Erro inesperado ao preparar ZIP:", error);
        if (error.name === "SecurityError") {
            showMessage("Erro de segurança ao gerar ZIP: Imagem de outra origem não pode ser usada. Verifique CORS e crossOrigin.", true);
        } else {
            showMessage("Erro inesperado ao gerar ZIP: " + error.message, true);
        }
    }
});


// ===========================================
// Inicialização e Autenticação
// ===========================================

// Verifica se há uma imagem de exemplo selecionada no localStorage e a carrega
function checkSelectedExampleImage() {
    const selectedImageUrl = localStorage.getItem('selectedExampleImageUrl');
    if (selectedImageUrl) {
        console.log("URL de imagem de exemplo encontrada no localStorage:", selectedImageUrl);
        loadImageFromUrl(selectedImageUrl);
        localStorage.removeItem('selectedExampleImageUrl'); // Limpa após o uso
    } else {
        drawImage(); // Desenha o placeholder se não houver imagem pré-selecionada
    }
}


// Gerencia o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        console.log("Usuário logado no editor:", user.email);
        checkSelectedExampleImage(); // Tenta carregar imagem de exemplo
    } else {
        // Usuário não logado, redireciona para a página de login
        console.log("Nenhum usuário logado. Redirecionando para login.");
        window.location.href = 'login.html';
    }
});

// Evento de clique para o botão de logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Redireciona para a página de login após o logout bem-sucedido
        console.log("Usuário deslogado.");
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
        showMessage("Erro ao fazer logout. Tente novamente.", true);
    });
});

// Inicializa o desenho do canvas ao carregar a página (com placeholder, se não houver imagem)
// drawImage(); // Removido, pois checkSelectedExampleImage ou o onload da imagem já chamam