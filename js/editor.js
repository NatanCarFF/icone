// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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
    yOffset: 0,
    backgroundColor: '#ffffff' // Cor de fundo padrão (branco)
};
const CANVAS_SIZE = 512; // Tamanho base do canvas para edição

// ===========================================
// Funções de Utilitário para Debounce
// ===========================================
/**
 * Retorna uma função debounced que só será executada após 'delay' milissegundos
 * desde a última vez que foi invocada.
 * @param {Function} func A função a ser debounced.
 * @param {number} delay O atraso em milissegundos.
 * @returns {Function} A função debounced.
 */
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Cria uma versão debounced da função drawImage
const debouncedDrawImage = debounce(drawImage, 100); // Executa no máximo a cada 100ms ao arrastar


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
let backgroundColorPicker;
let resetEditorBtn;
let generateIconsBtn;
let editorMessage;
let downloadSection;
let generatedIconsContainer;
let downloadAllZip;
let loadingIndicator;
let resetSliderButtons; // NOVO: Variável para os botões de reset individuais

// Elementos para exibir os valores dos sliders
let scaleValueSpan;
let rotationValueSpan;
let xOffsetValueSpan;
let yOffsetValueSpan;


document.addEventListener('DOMContentLoaded', () => {
    // Seleção de Elementos do DOM
    logoutBtn = document.getElementById('logoutBtn');
    imageUpload = document.getElementById('imageUpload');
    iconCanvas = document.getElementById('iconCanvas');
    ctx = iconCanvas.getContext('2d');

    // Garante a resolução interna do canvas
    iconCanvas.width = CANVAS_SIZE;
    iconCanvas.height = CANVAS_SIZE;

    scaleSlider = document.getElementById('scaleSlider');
    rotationSlider = document.getElementById('rotationSlider');
    xOffsetSlider = document.getElementById('xOffsetSlider');
    yOffsetSlider = document.getElementById('yOffsetSlider');
    backgroundColorPicker = document.getElementById('backgroundColorPicker');
    resetEditorBtn = document.getElementById('resetEditorBtn');
    generateIconsBtn = document.getElementById('generateIconsBtn');
    editorMessage = document.getElementById('editorMessage');
    downloadSection = document.getElementById('downloadSection');
    generatedIconsContainer = document.getElementById('generatedIconsContainer');
    downloadAllZip = document.getElementById('downloadAllZip');
    loadingIndicator = document.getElementById('loadingIndicator');
    // NOVO: Seleciona todos os botões de reset individuais
    resetSliderButtons = document.querySelectorAll('.reset-slider-btn');


    // Seleciona os spans de valor
    scaleValueSpan = document.getElementById('scaleValue');
    rotationValueSpan = document.getElementById('rotationValue');
    xOffsetValueSpan = document.getElementById('xOffsetValue');
    yOffsetValueSpan = document.getElementById('yOffsetValue');

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
                    resetImageProperties(); // Reseta todas as propriedades
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

    // Sliders de edição - AGORA USAM debouncedDrawImage
    scaleSlider.addEventListener('input', (e) => {
        imageProps.scale = parseFloat(e.target.value);
        scaleValueSpan.textContent = imageProps.scale.toFixed(2);
        debouncedDrawImage();
    });

    rotationSlider.addEventListener('input', (e) => {
        imageProps.rotation = parseInt(e.target.value);
        rotationValueSpan.textContent = `${imageProps.rotation}°`;
        debouncedDrawImage();
    });

    xOffsetSlider.addEventListener('input', (e) => {
        imageProps.xOffset = parseInt(e.target.value);
        xOffsetValueSpan.textContent = `${imageProps.xOffset}px`;
        debouncedDrawImage();
    });

    yOffsetSlider.addEventListener('input', (e) => {
        imageProps.yOffset = parseInt(e.target.value);
        yOffsetValueSpan.textContent = `${imageProps.yOffset}px`;
        debouncedDrawImage();
    });

    // Evento para o seletor de cor - Chama drawImage diretamente, pois não é um evento de arrastar
    backgroundColorPicker.addEventListener('input', (e) => {
        imageProps.backgroundColor = e.target.value;
        drawImage();
    });

    // Botão de resetar TUDO
    resetEditorBtn.addEventListener('click', () => {
        if (imageLoaded) {
            resetImageProperties(); // Reseta todas as propriedades para o padrão
            drawImage();
            showMessage("Edição resetada para o padrão.", false);
        } else {
            showMessage("Nenhuma imagem carregada para resetar.", true);
        }
    });

    // NOVO: Adiciona manipuladores de evento para os botões de reset individuais
    resetSliderButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!imageLoaded) {
                showMessage("Carregue uma imagem antes de resetar propriedades individuais.", true);
                return;
            }
            const targetProperty = e.currentTarget.dataset.target; // Obtém o nome da propriedade do atributo data-target
            resetIndividualProperty(targetProperty);
            drawImage();
            showMessage(`Propriedade '${targetProperty}' resetada.`, false);
        });
    });


    // Botão de Gerar Ícones
    generateIconsBtn.addEventListener('click', async () => {
        if (!imageLoaded) {
            showMessage("Por favor, carregue ou escolha uma imagem primeiro.", true);
            return;
        }

        hideMessage();
        showLoadingIndicator("Gerando ícones...");
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

                tempCtx.clearRect(0, 0, size, size); // Limpa o canvas temporário

                // Preenche o fundo do ícone gerado com a cor selecionada
                if (imageProps.backgroundColor) {
                    tempCtx.fillStyle = imageProps.backgroundColor;
                    tempCtx.fillRect(0, 0, size, size);
                }

                tempCtx.save();
                const scaleFactor = size / CANVAS_SIZE;

                tempCtx.translate(size / 2 + imageProps.xOffset * scaleFactor, size / 2 + imageProps.yOffset * scaleFactor);
                tempCtx.rotate(imageProps.rotation * Math.PI / 180);

                const scaledWidth = originalImage.width * imageProps.scale * scaleFactor;
                const scaledHeight = originalImage.height * imageProps.scale * scaleFactor;
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
            hideLoadingIndicator();
            showMessage("Ícones gerados com sucesso! Role para baixo para baixar.", false);

        } catch (error) {
            console.error("Erro ao gerar ícones:", error);
            hideLoadingIndicator();
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

        hideMessage();
        showLoadingIndicator("Gerando ZIP...");
        const zip = new JSZip();

        try {
            for (const density in ANDROID_DENSITIES) {
                const size = ANDROID_DENSITIES[density];
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = size;
                tempCanvas.height = size;
                const tempCtx = tempCanvas.getContext('2d');

                tempCtx.clearRect(0, 0, size, size); // Limpa o canvas temporário

                // Preenche o fundo do ícone do ZIP com a cor selecionada
                if (imageProps.backgroundColor) {
                    tempCtx.fillStyle = imageProps.backgroundColor;
                    tempCtx.fillRect(0, 0, size, size);
                }

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
                    hideLoadingIndicator();
                    showMessage("ZIP gerado com sucesso! Baixe o arquivo.", false);
                })
                .catch(error => {
                    console.error("Erro ao gerar ZIP:", error);
                    hideLoadingIndicator();
                    showMessage("Erro ao gerar ZIP: " + error.message, true);
                });

        } catch (error) {
            console.error("Erro inesperado ao preparar ZIP:", error);
            hideLoadingIndicator();
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

    // Chama updateSliderValuesDisplay inicialmente para exibir os valores padrão
    updateSliderValuesDisplay();
    // Chama drawImage inicialmente para desenhar o placeholder ou imagem de exemplo
    drawImage();
}); // Fim de DOMContentLoaded


// ===========================================
// Funções de Utilitário (fora de DOMContentLoaded, pois são chamadas)
// ===========================================

// Função principal para desenhar a imagem no canvas
function drawImage() {
    if (!ctx) {
        console.error("Contexto do canvas não disponível.");
        return;
    }
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Sempre limpa o canvas primeiro

    // Preenche o fundo do canvas com a cor selecionada, se houver
    if (imageProps.backgroundColor) {
        ctx.fillStyle = imageProps.backgroundColor;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    if (imageLoaded) {
        ctx.save();
        const centerX = CANVAS_SIZE / 2 + imageProps.xOffset;
        const centerY = CANVAS_SIZE / 2 + imageProps.yOffset;
        ctx.translate(centerX, centerY);
        ctx.rotate(imageProps.rotation * Math.PI / 180);

        const scaledWidth = originalImage.width * imageProps.scale;
        const scaledHeight = originalImage.height * imageProps.scale;

        ctx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        ctx.restore();
    } else {
        // Desenha texto placeholder (o fundo já foi preenchido acima, se aplicável)
        ctx.fillStyle = '#ccc'; // Cor do texto
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Carregue ou escolha uma imagem', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
}

// Exibe mensagens para o usuário
function showMessage(message, isError = false) {
    if (editorMessage) {
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

// Exibe o indicador de carregamento
function showLoadingIndicator(message = "Carregando...") {
    if (loadingIndicator) {
        loadingIndicator.textContent = message;
        loadingIndicator.style.display = 'block';
        loadingIndicator.classList.add('loading');
    }
}

// Oculta o indicador de carregamento
function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        loadingIndicator.classList.remove('loading');
    }
}

// Função para resetar as propriedades de edição da imagem para o estado inicial
function resetImageProperties() {
    let initialScale = 1;
    // Calcule a escala inicial para fazer a imagem caber se ela for maior que o canvas
    if (originalImage.width > CANVAS_SIZE || originalImage.height > CANVAS_SIZE) {
        initialScale = Math.min(CANVAS_SIZE / originalImage.width, CANVAS_SIZE / originalImage.height);
    }

    imageProps = {
        scale: initialScale,
        rotation: 0,
        xOffset: 0,
        yOffset: 0,
        backgroundColor: '#ffffff' // Reseta a cor de fundo para branco
    };
    // Atualiza os sliders e seus valores exibidos
    if (scaleSlider) scaleSlider.value = imageProps.scale;
    if (rotationSlider) rotationSlider.value = imageProps.rotation;
    if (xOffsetSlider) xOffsetSlider.value = imageProps.xOffset;
    if (yOffsetSlider) yOffsetSlider.value = imageProps.yOffset;
    if (backgroundColorPicker) backgroundColorPicker.value = imageProps.backgroundColor;
    
    updateSliderValuesDisplay();
}

// NOVO: Função para resetar uma propriedade individualmente
function resetIndividualProperty(property) {
    let initialScale = 1;
    if (originalImage.width > CANVAS_SIZE || originalImage.height > CANVAS_SIZE) {
        initialScale = Math.min(CANVAS_SIZE / originalImage.width, CANVAS_SIZE / originalImage.height);
    }

    switch (property) {
        case 'scale':
            imageProps.scale = initialScale;
            if (scaleSlider) scaleSlider.value = imageProps.scale;
            break;
        case 'rotation':
            imageProps.rotation = 0;
            if (rotationSlider) rotationSlider.value = imageProps.rotation;
            break;
        case 'xOffset':
            imageProps.xOffset = 0;
            if (xOffsetSlider) xOffsetSlider.value = imageProps.xOffset;
            break;
        case 'yOffset':
            imageProps.yOffset = 0;
            if (yOffsetSlider) yOffsetSlider.value = imageProps.yOffset;
            break;
        case 'backgroundColor':
            imageProps.backgroundColor = '#ffffff';
            if (backgroundColorPicker) backgroundColorPicker.value = imageProps.backgroundColor;
            break;
        default:
            console.warn(`Propriedade desconhecida para reset: ${property}`);
            return;
    }
    updateSliderValuesDisplay(); // Garante que o valor exibido seja atualizado
}


// Função para atualizar a exibição dos valores dos sliders
function updateSliderValuesDisplay() {
    if (scaleValueSpan) scaleValueSpan.textContent = imageProps.scale.toFixed(2);
    if (rotationValueSpan) rotationValueSpan.textContent = `${imageProps.rotation}°`;
    if (xOffsetValueSpan) xOffsetValueSpan.textContent = `${imageProps.xOffset}px`;
    if (yOffsetValueSpan) yOffsetValueSpan.textContent = `${imageProps.yOffset}px`;
}

// Carrega imagem via URL (usado para exemplos do Firebase Storage)
function loadImageFromUrl(url) {
    console.log("loadImageFromUrl chamado com URL:", url.substring(0, 100) + "...");
    originalImage = new Image();
    originalImage.crossOrigin = "anonymous"; // *** ESSENCIAL para CORS em canvas ***

    originalImage.onload = () => {
        imageLoaded = true;
        console.log("Imagem carregada com SUCESSO. Dimensões:", originalImage.width, "x", originalImage.height);
        resetImageProperties(); // Reseta todas as propriedades para a imagem nova
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
    }
}