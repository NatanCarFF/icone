// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
// REMOVIDO: import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
// JSZip agora será acessível globalmente, carregado via <script> no HTML


// ===========================================
// Variáveis Globais (não dependem do DOM)
// ===========================================
let originalImage = new Image();
let imageLoaded = false;
let imageProps = {
    scale: 1,
    rotation: 0,
    xOffset: 0,
    yOffset: 0
};
const CANVAS_SIZE = 512; // Tamanho base do canvas para edição

// ===========================================
// Seleção de Elementos e Configuração (dentro de DOMContentLoaded)
// ===========================================
let logoutBtn;
let imageUpload;
let iconCanvas;
let ctx; // Contexto do canvas inicializado após o canvas estar disponível
let scaleSlider;
let rotationSlider;
let xOffsetSlider;
let yOffsetSlider;
let resetEditorBtn;
let generateIconsBtn;
let editorMessage;
let downloadSection;
let generatedIconsContainer;
let downloadAllZip;

document.addEventListener('DOMContentLoaded', () => {
    // Seleção de Elementos do DOM
    logoutBtn = document.getElementById('logoutBtn');
    imageUpload = document.getElementById('imageUpload');
    iconCanvas = document.getElementById('iconCanvas');
    ctx = iconCanvas.getContext('2d'); // Agora iconCanvas está garantido de existir
    scaleSlider = document.getElementById('scaleSlider');
    rotationSlider = document.getElementById('rotationSlider');
    xOffsetSlider = document.getElementById('xOffsetSlider');
    yOffsetSlider = document.getElementById('yOffsetSlider');
    resetEditorBtn = document.getElementById('resetEditorBtn');
    generateIconsBtn = document.getElementById('generateIconsBtn');
    editorMessage = document.getElementById('editorMessage');
    downloadSection = document.getElementById('downloadSection');
    generatedIconsContainer = document.getElementById('generatedIconsContainer');
    downloadAllZip = document.getElementById('downloadAllZip');

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

    // Botão de Gerar Ícones
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

                tempCtx.clearRect(0, 0, size, size);
                tempCtx.save();
                const scaleFactor = size / CANVAS_SIZE;

                tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
                tempCtx.rotate(imageProps.rotation * Math.PI / 180);

                const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
                const scaledHeight = originalImage.height * originalImage.height * imageProps.scale * scaleFactor; // Corrigido: deve ser originalImage.height
                tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                tempCtx.restore();

                const imageUrl = tempCanvas.toDataURL('image/png');

                generatedIcons.push({ density, imageUrl, size });

                const iconItem = document.createElement('div');
                iconItem.classList.add('generated-icon-item');
                iconItem.innerHTML = `
                    <img src="${imageUrl}" alt="Icon ${density}">
                    <p>${density}</p>
                    <a href="${imageUrl}" download="ic_launcher_${density}.png">Baixar (.png)</a>
                `;
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

    // Botão Baixar Todos (ZIP)
    downloadAllZip.addEventListener('click', async () => {
        if (!imageLoaded) {
            showMessage("Nenhuma imagem carregada para gerar o ZIP.", true);
            return;
        }

        showMessage("Gerando ZIP... Aguarde.", false);
        const zip = new JSZip(); // JSZip agora deve ser acessível aqui

        try {
            for (const density in ANDROID_DENSITIES) {
                const size = ANDROID_DENSITIES[density];
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = size;
                tempCanvas.height = size;
                const tempCtx = tempCanvas.getContext('2d');

                tempCtx.clearRect(0, 0, size, size);
                tempCtx.save();
                const scaleFactor = size / CANVAS_SIZE;
                tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
                tempCtx.rotate(imageProps.rotation * Math.PI / 180);

                const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
                const scaledHeight = originalImage.height * imageProps.scale * scaleFactor;
                tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                tempCtx.restore();

                const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));

                zip.file(`res/drawable-${density}/ic_launcher.png`, blob);
            }

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

    // Gerencia o estado de autenticação do usuário
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuário logado no editor:", user.email);
            checkSelectedExampleImage(); // Tenta carregar imagem de exemplo
        } else {
            console.log("Nenhum usuário logado. Redirecionando para login.");
            window.location.href = 'login.html';
        }
    });

    // Evento de clique para o botão de logout
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Usuário deslogado.");
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Erro ao fazer logout:", error);
            showMessage("Erro ao fazer logout. Tente novamente.", true);
        });
    });

    // Chama drawImage inicialmente para desenhar o placeholder
    drawImage();
}); // Fim de DOMContentLoaded


// ===========================================
// Funções de Utilitário (fora de DOMContentLoaded, pois são chamadas)
// ===========================================

// Função principal para desenhar a imagem no canvas
function drawImage() {
    console.log("drawImage chamado. imageLoaded:", imageLoaded);
    if (!ctx) { // Garante que o contexto foi inicializado
        console.error("Contexto do canvas não disponível.");
        return;
    }
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Limpa o canvas

    if (imageLoaded) {
        console.log("originalImage dimensões:", originalImage.width, "x", originalImage.height);

        ctx.save();
        const centerX = CANVAS_SIZE / 2 + imageProps.xOffset;
        const centerY = CANVAS_SIZE / 2 + imageProps.yOffset;
        ctx.translate(centerX, centerY);
        ctx.rotate(imageProps.rotation * Math.PI / 180);

        const scaledWidth = originalImage.width * imageProps.scale;
        const scaledHeight = originalImage.height * imageProps.scale;

        console.log(`Desenho: escala=${imageProps.scale}, rot=${imageProps.rotation}, xOff=${imageProps.xOffset}, yOff=${imageProps.yOffset}`);
        console.log(`Dimensões desenhadas: ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}`);

        ctx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        ctx.restore();
    } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = '#ccc';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Carregue ou escolha uma imagem', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
}

// Exibe mensagens para o usuário
function showMessage(message, isError = false) {
    if (editorMessage) { // Garante que o elemento existe
        editorMessage.textContent = message;
        editorMessage.className = `message ${isError ? 'error' : 'success'}`;
        editorMessage.style.display = 'block';
    } else {
        console.warn("Elemento editorMessage não encontrado para exibir mensagem:", message);
    }
}

// Oculta mensagens
function hideMessage() {
    if (editorMessage) {
        editorMessage.style.display = 'none';
    }
}

// Reseta as propriedades de edição da imagem para o estado inicial
function resetImageProperties() {
    imageProps = {
        scale: 1,
        rotation: 0,
        xOffset: 0,
        yOffset: 0
    };
    if (scaleSlider) scaleSlider.value = imageProps.scale;
    if (rotationSlider) rotationSlider.value = imageProps.rotation;
    if (xOffsetSlider) xOffsetSlider.value = imageProps.xOffset;
    if (yOffsetSlider) yOffsetSlider.value = imageProps.yOffset;
    drawImage();
}

// Carrega imagem via URL (usado para exemplos do Firebase Storage)
function loadImageFromUrl(url) {
    console.log("loadImageFromUrl chamado com URL:", url.substring(0, 100) + "...");
    originalImage = new Image();
    originalImage.crossOrigin = "anonymous"; // *** ESSENCIAL para CORS em canvas ***

    originalImage.onload = () => {
        imageLoaded = true;
        console.log("Imagem carregada com SUCESSO. Dimensões:", originalImage.width, "x", originalImage.height);
        resetImageProperties();
        drawImage();
        showMessage("Imagem carregada com sucesso!", false);
    };
    originalImage.onerror = (e) => {
        imageLoaded = false;
        console.error("Erro ao carregar imagem do URL:", e);
        showMessage("Erro ao carregar imagem do URL. Verifique a URL ou suas permissões CORS no Firebase Storage.", true);
        drawImage();
    };
    originalImage.src = url;
}

// Definições de densidade para ícones Android
const ANDROID_DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// Verifica se há uma imagem de exemplo selecionada no localStorage e a carrega
function checkSelectedExampleImage() {
    const selectedImageUrl = localStorage.getItem('selectedExampleImageUrl');
    if (selectedImageUrl) {
        console.log("URL de imagem de exemplo encontrada no localStorage:", selectedImageUrl.substring(0,100) + "...");
        loadImageFromUrl(selectedImageUrl);
        localStorage.removeItem('selectedExampleImageUrl'); // Limpa após o uso
    } else {
        // Se drawImage for chamado no DOMContentLoaded, não precisamos chamar aqui.
        // drawImage(); // Desenha o placeholder se não houver imagem pré-selecionada
    }
}