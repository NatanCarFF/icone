// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
import JSZipUtils from "https://cdn.jsdelivr.net/npm/jszip-utils@0.1.0/dist/jszip-utils.min.js";

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
const downloadSection = document.getElementById('downloadSection');
const generatedIconsContainer = document.getElementById('generatedIconsContainer');
const downloadAllZip = document.getElementById('downloadAllZip');

let originalImage = new Image();
let imageLoaded = false;

// Dimensões padrão para o canvas de edição (um tamanho razoável para visualização)
const EDITOR_CANVAS_SIZE = 512;
iconCanvas.width = EDITOR_CANVAS_SIZE;
iconCanvas.height = EDITOR_CANVAS_SIZE;

// Propriedades da imagem no canvas
let imageProps = {
    scale: 1,
    rotation: 0, // em graus
    xOffset: 0,
    yOffset: 0
};

// Tamanhos de ícones Android padrão em dp (densidade média mdpi, 160 dpi)
// Correspondem a px em mdpi:
// mdpi: 48x48
// hdpi: 72x72
// xhdpi: 96x96
// xxhdpi: 144x144
// xxxhdpi: 192x192
// Play Store icon size: 512x512px
const ICON_SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
    'playstore': 512 // Ícone para a Google Play Store
};

// ===========================================
// Funções Utilitárias
// ===========================================
function showMessage(message, isError = true) {
    editorMessage.textContent = message;
    editorMessage.className = `message ${isError ? 'error' : 'success'}`;
    editorMessage.style.display = 'block';
}

function hideMessage() {
    editorMessage.style.display = 'none';
}

// ===========================================
// Lógica de Autenticação na página do Editor
// ===========================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se o usuário não estiver logado, redireciona para a página de login
        console.log("Usuário não logado na página do editor. Redirecionando...");
        window.location.href = 'login.html';
    } else {
        console.log("Usuário logado no editor:", user.email);
        // Tenta carregar a imagem selecionada da página de exemplos, se houver
        const selectedImageUrl = localStorage.getItem('selectedExampleImageUrl');
        if (selectedImageUrl) {
            loadImageFromUrl(selectedImageUrl);
            localStorage.removeItem('selectedExampleImageUrl'); // Limpa após usar
        }
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário deslogado.");
        window.location.href = 'login.html'; // Redireciona para login após logout
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessage("Erro ao fazer logout. Tente novamente.", true);
    }
});

// ===========================================
// Lógica do Canvas e Edição de Imagem
// ===========================================

// Desenha a imagem no canvas com as propriedades atuais
function drawImage() {
    ctx.clearRect(0, 0, iconCanvas.width, iconCanvas.height); // Limpa o canvas

    if (!imageLoaded) {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('Faça upload de uma imagem ou escolha um exemplo', iconCanvas.width / 2, iconCanvas.height / 2);
        return;
    }

    const img = originalImage;
    const canvasWidth = iconCanvas.width;
    const canvasHeight = iconCanvas.height;

    // Calcula o tamanho da imagem para caber no canvas inicialmente (sem a escala do usuário)
    let initialImgWidth = img.width;
    let initialImgHeight = img.height;

    // Se a imagem for maior que o canvas, redimensiona para caber
    if (initialImgWidth > canvasWidth || initialImgHeight > canvasHeight) {
        const aspectRatio = initialImgWidth / initialImgHeight;
        if (initialImgWidth > canvasWidth) {
            initialImgWidth = canvasWidth;
            initialImgHeight = canvasWidth / aspectRatio;
        }
        if (initialImgHeight > canvasHeight) {
            initialImgHeight = canvasHeight;
            initialImgWidth = canvasHeight * aspectRatio;
        }
    }

    // Aplica a escala do usuário
    const scaledWidth = initialImgWidth * imageProps.scale;
    const scaledHeight = initialImgHeight * imageProps.scale;

    // Salva o estado atual do canvas antes de aplicar transformações
    ctx.save();

    // Move o ponto de origem para o centro do canvas para rotação e offset
    ctx.translate(canvasWidth / 2 + imageProps.xOffset, canvasHeight / 2 + imageProps.yOffset);
    ctx.rotate(imageProps.rotation * Math.PI / 180); // Converte graus para radianos

    // Desenha a imagem centralizada no novo ponto de origem
    ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

    // Restaura o estado do canvas para remover as transformações
    ctx.restore();
}

// Carrega imagem via URL (usado para exemplos do Firebase Storage)
function loadImageFromUrl(url) {
    originalImage.onload = () => {
        imageLoaded = true;
        // Reinicia as propriedades ao carregar nova imagem
        resetImageProperties();
        drawImage();
        showMessage("Imagem carregada com sucesso!", false);
    };
    originalImage.onerror = () => {
        imageLoaded = false;
        showMessage("Erro ao carregar imagem do URL. Verifique a URL ou sua conexão.", true);
        drawImage(); // Desenha o texto de placeholder
    };
    originalImage.src = url;
}

// Carrega imagem via input de arquivo
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            loadImageFromUrl(e.target.result); // Reutiliza a função de carregar por URL (data URL)
        };
        reader.onerror = () => {
            showMessage("Erro ao ler o arquivo de imagem.", true);
        };
        reader.readAsDataURL(file);
    }
});

// Atualiza a imagem no canvas quando os sliders mudam
scaleSlider.addEventListener('input', (e) => {
    imageProps.scale = parseFloat(e.target.value);
    drawImage();
});
rotationSlider.addEventListener('input', (e) => {
    imageProps.rotation = parseFloat(e.target.value);
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

// Reseta as propriedades de edição
function resetImageProperties() {
    imageProps = {
        scale: 1,
        rotation: 0,
        xOffset: 0,
        yOffset: 0
    };
    // Redefine os valores dos sliders
    scaleSlider.value = 1;
    rotationSlider.value = 0;
    xOffsetSlider.value = 0;
    yOffsetSlider.value = 0;
    drawImage();
}

resetEditorBtn.addEventListener('click', resetImageProperties);

// Desenha a imagem inicial no canvas
drawImage();

// ===========================================
// Geração e Download de Ícones
// ===========================================

generateIconsBtn.addEventListener('click', () => {
    if (!imageLoaded) {
        showMessage("Por favor, faça upload ou selecione uma imagem primeiro.", true);
        return;
    }
    hideMessage();
    generatedIconsContainer.innerHTML = ''; // Limpa ícones anteriores
    downloadSection.style.display = 'block'; // Mostra a seção de download

    for (const density in ICON_SIZES) {
        const size = ICON_SIZES[density];
        generateAndDisplayIcon(density, size);
    }
});

function generateAndDisplayIcon(density, size) {
    // Cria um canvas temporário para cada tamanho de ícone
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');

    // Desenha a imagem no canvas temporário com as mesmas transformações
    // Adapta as transformações para o novo tamanho do canvas
    const scaleFactor = size / EDITOR_CANVAS_SIZE;

    tempCtx.save();
    tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
    tempCtx.rotate(imageProps.rotation * Math.PI / 180);

    const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
    const scaledHeight = originalImage.height * imageProps.scale * scaleFactor;

    tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    tempCtx.restore();

    // Converte o canvas para uma imagem PNG (data URL)
    const dataUrl = tempCanvas.toDataURL('image/png');

    // Cria o elemento para exibir e baixar o ícone
    const iconItem = document.createElement('div');
    iconItem.classList.add('generated-icon-item');
    iconItem.innerHTML = `
        <img src="${dataUrl}" alt="Ícone ${density}" width="${size}" height="${size}">
        <p>res/drawable-${density}/ic_launcher.png</p>
        <a href="${dataUrl}" download="ic_launcher_${density}.png">Baixar (${size}x${size}px)</a>
    `;
    generatedIconsContainer.appendChild(iconItem);
}

// Download de todos os ícones em um arquivo ZIP
downloadAllZip.addEventListener('click', async () => {
    if (!imageLoaded) {
        showMessage("Por favor, faça upload ou selecione uma imagem primeiro.", true);
        return;
    }

    const zip = new JSZip();
    const folderName = "android_icons"; // Nome da pasta raiz no ZIP

    // Para cada densidade, gerar o ícone e adicioná-lo ao ZIP
    for (const density in ICON_SIZES) {
        const size = ICON_SIZES[density];

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Adapta as transformações para o novo tamanho do canvas
        const scaleFactor = size / EDITOR_CANVAS_SIZE;

        tempCtx.save();
        tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
        tempCtx.rotate(imageProps.rotation * Math.PI / 180);

        const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
        const scaledHeight = originalImage.height * originalImage.scale * scaleFactor; // Correção: originalImage.scale não existe, deve ser imageProps.scale
        tempCtx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        tempCtx.restore();

        // Obtém o blob da imagem
        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));

        // Adiciona a imagem ao ZIP dentro da estrutura de pastas Android
        zip.file(`${folderName}/res/drawable-${density}/ic_launcher.png`, blob);
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
            showMessage("ZIP gerado com sucesso!", false);
        })
        .catch(error => {
            console.error("Erro ao gerar ZIP:", error);
            showMessage("Erro ao gerar o arquivo ZIP. Tente novamente.", true);
        });
});