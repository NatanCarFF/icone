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
    backgroundColor: '#ffffff', // Cor de fundo padrão (branco)
    padding: 0, // Padding padrão
    borderWidth: 0, // Largura da borda padrão
    borderColor: '#000000', // Cor da borda padrão (preto)
    iconShape: 'none' // NOVO: Formato do ícone padrão ('none', 'circle', 'rounded-square')
};
const CANVAS_SIZE = 512; // Tamanho base do canvas para edição

// ===========================================
// Funções de Utilitário para Debounce
// ===========================================
/**
 * Retorna uma função debounced que só será executada após 'delay' milissegundos
 * desde a última vez que foi invocada.
 * @param {Function} func A função a ser debounced.
 * @param {number} delay O tempo de atraso em milissegundos.
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

// ===========================================
// Seleção de Elementos do DOM
// ===========================================
const logoutBtn = document.getElementById('logoutBtn');
const imageUploadInput = document.getElementById('imageUpload');
const iconCanvas = document.getElementById('iconCanvas');
const ctx = iconCanvas.getContext('2d');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValueSpan = document.getElementById('scaleValue');
const rotationSlider = document.getElementById('rotationSlider');
const rotationValueSpan = document.getElementById('rotationValue');
const xOffsetSlider = document.getElementById('xOffsetSlider');
const xOffsetValueSpan = document.getElementById('xOffsetValue');
const yOffsetSlider = document.getElementById('yOffsetSlider');
const yOffsetValueSpan = document.getElementById('yOffsetValue');
const backgroundColorPicker = document.getElementById('backgroundColorPicker');
const paddingSlider = document.getElementById('paddingSlider');
const paddingValueSpan = document.getElementById('paddingValue');
const borderWidthSlider = document.getElementById('borderWidthSlider');
const borderWidthValueSpan = document.getElementById('borderWidthValue');
const borderColorPicker = document.getElementById('borderColorPicker');
const iconShapeSelect = document.getElementById('iconShapeSelect');
const generateIconsBtn = document.getElementById('generateIconsBtn');
const downloadAllZipBtn = document.getElementById('downloadAllZip');
const generatedIconsContainer = document.getElementById('generatedIconsContainer');
const editorMessage = document.getElementById('editorMessage');
const downloadSection = document.getElementById('downloadSection');
const resetEditorBtn = document.getElementById('resetEditorBtn'); // Novo botão reset
const loadingIndicator = document.getElementById('loadingIndicator'); // Elemento para spinner

// Coleção de botões de reset de slider
const resetSliderBtns = document.querySelectorAll('.reset-slider-btn');


// ===========================================
// Funções de Mensagem e Carregamento
// ===========================================

/**
 * Exibe uma mensagem na interface do editor.
 * @param {string} message O texto da mensagem.
 * @param {boolean} isError Se a mensagem é de erro (true) ou sucesso (false).
 */
function showMessage(message, isError = true) {
    editorMessage.textContent = message;
    editorMessage.className = `message ${isError ? 'error' : 'success'}`;
    editorMessage.style.display = 'block';
}

function hideMessage() {
    editorMessage.textContent = '';
    editorMessage.style.display = 'none';
}

/**
 * Exibe ou oculta o indicador de carregamento (spinner).
 * @param {boolean} show True para mostrar, false para ocultar.
 */
function toggleLoading(show) {
    if (show) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}


// ===========================================
// Funções de Desenho do Canvas
// ===========================================

// Define o tamanho fixo do canvas
iconCanvas.width = CANVAS_SIZE;
iconCanvas.height = CANVAS_SIZE;

function drawImage() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Limpa o canvas

    // Desenha o fundo (sempre presente, mesmo se transparente)
    ctx.fillStyle = imageProps.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!imageLoaded) {
        // Exibe uma mensagem no canvas se nenhuma imagem for carregada
        ctx.fillStyle = '#999';
        ctx.font = '20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma imagem carregada', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 10);
        ctx.fillText('Clique em "Carregar Imagem"', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
        return;
    }

    // Calcula as dimensões da imagem ajustadas pela escala
    const scaledWidth = originalImage.width * imageProps.scale;
    const scaledHeight = originalImage.height * imageProps.scale;

    // Calcula a posição para centralizar a imagem antes das transformações e offset
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;

    // Aplica as transformações ao contexto do canvas
    ctx.save(); // Salva o estado atual do contexto

    ctx.translate(centerX + imageProps.xOffset, centerY + imageProps.yOffset); // Transladar para o centro + offset
    ctx.rotate(imageProps.rotation * Math.PI / 180); // Rotacionar (graus para radianos)

    // Ajusta o padding, que diminui o tamanho efetivo da área de desenho da imagem
    const effectiveCanvasSize = CANVAS_SIZE - (imageProps.padding * 2);
    const effectivePaddingOffset = imageProps.padding;

    // Define o caminho de recorte (para formas do ícone)
    if (imageProps.iconShape === 'circle') {
        const radius = effectiveCanvasSize / 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip(); // Recorta tudo fora do círculo
    } else if (imageProps.iconShape === 'rounded-square') {
        const borderRadius = 24; // Valor de arredondamento para o quadrado
        const rectSize = effectiveCanvasSize;
        ctx.beginPath();
        ctx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, borderRadius);
        ctx.clip(); // Recorta tudo fora do quadrado arredondado
    }

    // Desenha a imagem (agora centralizada em 0,0 do contexto transformado)
    ctx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

    // Desenha a borda se houver
    if (imageProps.borderWidth > 0) {
        ctx.strokeStyle = imageProps.borderColor;
        ctx.lineWidth = imageProps.borderWidth;
        // Desenha a borda conforme a forma
        if (imageProps.iconShape === 'circle') {
            const radius = (effectiveCanvasSize / 2) - (imageProps.borderWidth / 2);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (imageProps.iconShape === 'rounded-square') {
            const borderRadius = 24;
            const rectSize = effectiveCanvasSize - imageProps.borderWidth;
            ctx.beginPath();
            ctx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, borderRadius);
            ctx.stroke();
        } else {
            // Se não houver forma específica, desenha a borda ao redor do canvas inteiro
            // Considerando o padding
            ctx.strokeRect(-effectiveCanvasSize / 2, -effectiveCanvasSize / 2, effectiveCanvasSize, effectiveCanvasSize);
        }
    }

    ctx.restore(); // Restaura o estado original do contexto (remove transformações)
}


// ===========================================
// Manipuladores de Evento
// ===========================================

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário deslogado.");
        localStorage.removeItem('selectedExampleImageUrl'); // Limpa a imagem de exemplo
        window.location.href = 'index.html'; // Redireciona para a página inicial
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessage("Erro ao fazer logout.", true);
    }
});

// Carregar imagem via input de arquivo
imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage.src = event.target.result;
            originalImage.onload = () => {
                imageLoaded = true;
                resetImageProperties(); // Reseta as propriedades para a nova imagem
                drawImage();
                hideMessage(); // Oculta qualquer mensagem anterior
            };
            originalImage.onerror = () => {
                imageLoaded = false;
                showMessage("Erro ao carregar a imagem. Certifique-se de que é um formato válido.", true);
                drawImage(); // Desenha o canvas vazio ou com mensagem
            };
        };
        reader.readAsDataURL(file);
    }
});

// Resetar todas as propriedades da imagem para o padrão
function resetImageProperties() {
    imageProps = {
        scale: 1,
        rotation: 0,
        xOffset: 0,
        yOffset: 0,
        backgroundColor: '#ffffff',
        padding: 0,
        borderWidth: 0,
        borderColor: '#000000',
        iconShape: 'none'
    };
    // Atualizar os controles da UI para refletir os valores resetados
    scaleSlider.value = imageProps.scale;
    scaleValueSpan.textContent = imageProps.scale.toFixed(2) + 'x';
    rotationSlider.value = imageProps.rotation;
    rotationValueSpan.textContent = imageProps.rotation + '°';
    xOffsetSlider.value = imageProps.xOffset;
    xOffsetValueSpan.textContent = imageProps.xOffset + 'px';
    yOffsetSlider.value = imageProps.yOffset;
    yOffsetValueSpan.textContent = imageProps.yOffset + 'px';
    backgroundColorPicker.value = imageProps.backgroundColor;
    paddingSlider.value = imageProps.padding;
    paddingValueSpan.textContent = imageProps.padding + 'px';
    borderWidthSlider.value = imageProps.borderWidth;
    borderWidthValueSpan.textContent = imageProps.borderWidth + 'px';
    borderColorPicker.value = imageProps.borderColor;
    iconShapeSelect.value = imageProps.iconShape;

    // Ocultar a seção de download de ícones
    downloadSection.style.display = 'none';
}

// Botão Resetar Tudo
resetEditorBtn.addEventListener('click', () => {
    resetImageProperties();
    drawImage();
    hideMessage();
});

// Resetar sliders individuais
resetSliderBtns.forEach(button => {
    button.addEventListener('click', (e) => {
        const target = e.target.dataset.target;
        let defaultValue;
        let sliderElement;
        let valueSpanElement;

        switch (target) {
            case 'scale':
                defaultValue = 1;
                sliderElement = scaleSlider;
                valueSpanElement = scaleValueSpan;
                break;
            case 'rotation':
                defaultValue = 0;
                sliderElement = rotationSlider;
                valueSpanElement = rotationValueSpan;
                break;
            case 'xOffset':
                defaultValue = 0;
                sliderElement = xOffsetSlider;
                valueSpanElement = xOffsetValueSpan;
                break;
            case 'yOffset':
                defaultValue = 0;
                sliderElement = yOffsetSlider;
                valueSpanElement = yOffsetValueSpan;
                break;
            case 'padding':
                defaultValue = 0;
                sliderElement = paddingSlider;
                valueSpanElement = paddingValueSpan;
                break;
            case 'borderWidth':
                defaultValue = 0;
                sliderElement = borderWidthSlider;
                valueSpanElement = borderWidthValueSpan;
                break;
            default:
                return;
        }

        imageProps[target] = defaultValue;
        sliderElement.value = defaultValue;
        
        // Atualiza o texto do span de valor
        if (target === 'scale') {
            valueSpanElement.textContent = defaultValue.toFixed(2) + 'x';
        } else if (target === 'rotation') {
            valueSpanElement.textContent = defaultValue + '°';
        } else {
            valueSpanElement.textContent = defaultValue + 'px';
        }
        
        drawImage(); // Redesenha o canvas após resetar
    });
});


// Eventos para atualização dos sliders e seletores
const updateDebouncedDraw = debounce(drawImage, 10); // debounce para não redesenhar demais

scaleSlider.addEventListener('input', (e) => {
    imageProps.scale = parseFloat(e.target.value);
    scaleValueSpan.textContent = imageProps.scale.toFixed(2) + 'x';
    updateDebouncedDraw();
});

rotationSlider.addEventListener('input', (e) => {
    imageProps.rotation = parseInt(e.target.value);
    rotationValueSpan.textContent = imageProps.rotation + '°';
    updateDebouncedDraw();
});

xOffsetSlider.addEventListener('input', (e) => {
    imageProps.xOffset = parseInt(e.target.value);
    xOffsetValueSpan.textContent = imageProps.xOffset + 'px';
    updateDebouncedDraw();
});

yOffsetSlider.addEventListener('input', (e) => {
    imageProps.yOffset = parseInt(e.target.value);
    yOffsetValueSpan.textContent = imageProps.yOffset + 'px';
    updateDebouncedDraw();
});

backgroundColorPicker.addEventListener('input', (e) => {
    imageProps.backgroundColor = e.target.value;
    updateDebouncedDraw();
});

paddingSlider.addEventListener('input', (e) => {
    imageProps.padding = parseInt(e.target.value);
    paddingValueSpan.textContent = imageProps.padding + 'px';
    updateDebouncedDraw();
});

borderWidthSlider.addEventListener('input', (e) => {
    imageProps.borderWidth = parseInt(e.target.value);
    borderWidthValueSpan.textContent = imageProps.borderWidth + 'px';
    updateDebouncedDraw();
});

borderColorPicker.addEventListener('input', (e) => {
    imageProps.borderColor = e.target.value;
    updateDebouncedDraw();
});

iconShapeSelect.addEventListener('change', (e) => {
    imageProps.iconShape = e.target.value;
    updateDebouncedDraw();
});


// ===========================================
// Geração e Download de Ícones
// ===========================================

// Definições de densidade para ícones Android
const ANDROID_DENSITIES = {
    'mdpi': 96,
    'hdpi': 144,
    'xhdpi': 192,
    'xxhdpi': 512,
    'xxxhdpi': 1024
};

generateIconsBtn.addEventListener('click', async () => {
    if (!imageLoaded) {
        showMessage("Por favor, carregue uma imagem primeiro!", true);
        return;
    }

    toggleLoading(true); // Mostra o spinner
    hideMessage();
    downloadSection.style.display = 'none'; // Esconde a seção de download anterior
    generatedIconsContainer.innerHTML = ''; // Limpa ícones gerados anteriormente

    try {
        const originalImageBlob = await new Promise(resolve => iconCanvas.toBlob(resolve, 'image/png', 1));
        const originalImageUrl = URL.createObjectURL(originalImageBlob);

        for (const density in ANDROID_DENSITIES) {
            const size = ANDROID_DENSITIES[density];
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;

            // Desenha o fundo da cor selecionada no tempCanvas
            tempCtx.fillStyle = imageProps.backgroundColor;
            tempCtx.fillRect(0, 0, size, size);

            // Calcula a escala da imagem para o novo tamanho, mantendo a proporção
            // As transformações e offsets devem ser aplicados proporcionalmente ao novo tamanho
            const scaleFactor = size / CANVAS_SIZE; // Fator de escala do canvas original para o novo tamanho
            const scaledOriginalWidth = originalImage.width * imageProps.scale * scaleFactor;
            const scaledOriginalHeight = originalImage.height * imageProps.scale * scaleFactor;

            // Calcula a posição da imagem centralizada no novo canvas, ajustada pelo offset
            const newCenterX = size / 2 + (imageProps.xOffset * scaleFactor);
            const newCenterY = size / 2 + (imageProps.yOffset * scaleFactor);

            tempCtx.save();
            tempCtx.translate(newCenterX, newCenterY);
            tempCtx.rotate(imageProps.rotation * Math.PI / 180);

            // Aplica o recorte de forma
            const effectiveTempCanvasSize = size - (imageProps.padding * 2 * scaleFactor);
            if (imageProps.iconShape === 'circle') {
                const radius = effectiveTempCanvasSize / 2;
                tempCtx.beginPath();
                tempCtx.arc(0, 0, radius, 0, Math.PI * 2);
                tempCtx.clip();
            } else if (imageProps.iconShape === 'rounded-square') {
                const borderRadius = 24 * scaleFactor; // Arredondamento proporcional
                const rectSize = effectiveTempCanvasSize;
                tempCtx.beginPath();
                tempCtx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, borderRadius);
                tempCtx.clip();
            }

            tempCtx.drawImage(originalImage, -scaledOriginalWidth / 2, -scaledOriginalHeight / 2, scaledOriginalWidth, scaledOriginalHeight);

            // Desenha a borda se houver
            if (imageProps.borderWidth > 0) {
                tempCtx.strokeStyle = imageProps.borderColor;
                tempCtx.lineWidth = imageProps.borderWidth * scaleFactor; // Borda proporcional
                if (imageProps.iconShape === 'circle') {
                    const radius = (effectiveTempCanvasSize / 2) - (tempCtx.lineWidth / 2);
                    tempCtx.beginPath();
                    tempCtx.arc(0, 0, radius, 0, Math.PI * 2);
                    tempCtx.stroke();
                } else if (imageProps.iconShape === 'rounded-square') {
                    const borderRadius = 24 * scaleFactor;
                    const rectSize = effectiveTempCanvasSize - tempCtx.lineWidth;
                    tempCtx.beginPath();
                    tempCtx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, borderRadius);
                    tempCtx.stroke();
                } else {
                    tempCtx.strokeRect(-effectiveTempCanvasSize / 2, -effectiveTempCanvasSize / 2, effectiveTempCanvasSize, effectiveTempCanvasSize);
                }
            }

            tempCtx.restore(); // Restaura o estado do contexto

            // Cria o elemento da imagem e o botão de download
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png', 1));
            const url = URL.createObjectURL(blob);

            const iconItem = document.createElement('div');
            iconItem.classList.add('generated-icon-item');
            iconItem.innerHTML = `
                <img src="${url}" alt="Icone ${density}" width="${size}" height="${size}">
                <p>${density.toUpperCase()} (${size}x${size}px)</p>
                <button data-url="${url}" data-filename="icon_${density}.png"><i class="fas fa-download"></i> Baixar</button>
            `;
            generatedIconsContainer.appendChild(iconItem);
        }

        downloadSection.style.display = 'block'; // Mostra a seção de download
        showMessage("Ícones gerados com sucesso!", false);

    } catch (error) {
        console.error("Erro ao gerar ícones:", error);
        showMessage("Erro ao gerar ícones. Tente novamente.", true);
    } finally {
        toggleLoading(false); // Oculta o spinner
    }
});

// Evento para baixar ícones individuais
generatedIconsContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.url) {
        const url = e.target.dataset.url;
        const filename = e.target.dataset.filename;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Libera o URL do objeto
    }
});

// Evento para baixar todos os ícones em um ZIP
downloadAllZipBtn.addEventListener('click', async () => {
    if (generatedIconsContainer.children.length === 0) {
        showMessage("Nenhum ícone gerado para baixar.", true);
        return;
    }

    toggleLoading(true);
    showMessage("Preparando ZIP para download...", false);

    try {
        const zip = new JSZip(); // JSZip é global aqui

        const iconItems = generatedIconsContainer.querySelectorAll('.generated-icon-item');
        for (const item of iconItems) {
            const img = item.querySelector('img');
            const filename = img.alt.replace('Icone ', '') + '.png'; // e.g., "mdpi.png"
            const response = await fetch(img.src);
            const blob = await response.blob();
            zip.file(filename, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(content);

        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'android_icons.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl); // Libera o URL do objeto

        showMessage("Todos os ícones baixados com sucesso!", false);

    } catch (error) {
        console.error("Erro ao gerar ou baixar ZIP:", error);
        showMessage("Erro ao baixar o ZIP dos ícones.", true);
    } finally {
        toggleLoading(false);
    }
});


// ===========================================
// Inicialização
// ===========================================

// Monitorar o estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se o usuário não está logado, redireciona para a página inicial
        console.log("Usuário não logado, redirecionando para index.html");
        localStorage.removeItem('selectedExampleImageUrl'); // Limpa a imagem de exemplo
        window.location.href = 'index.html';
    } else {
        console.log("Usuário logado no editor:", user.email);
        // Tenta carregar uma imagem de exemplo se houver uma no localStorage
        checkSelectedExampleImage();
        drawImage(); // Desenha o canvas inicial (pode ser vazio ou com a imagem de exemplo)
    }
});


// Verifica se há uma imagem de exemplo selecionada no localStorage e a carrega
function checkSelectedExampleImage() {
    const selectedImageUrl = localStorage.getItem('selectedExampleImageUrl');
    if (selectedImageUrl) {
        console.log("URL de imagem de exemplo encontrada no localStorage:", selectedImageUrl);
        loadImageFromUrl(selectedImageUrl);
        localStorage.removeItem('selectedExampleImageUrl'); // Limpa após o uso
    } else {
        console.log("Nenhuma imagem de exemplo no localStorage.");
        imageLoaded = false; // Garante que o estado seja 'sem imagem'
        drawImage(); // Desenha o canvas vazio
    }
}

// Carrega uma imagem a partir de uma URL (usado para exemplos do Firebase Storage)
function loadImageFromUrl(url) {
    // Esconder mensagens anteriores e mostrar que está carregando
    hideMessage();
    toggleLoading(true);
    showMessage("Carregando imagem de exemplo...", false);
    
    console.log("Tentando carregar imagem de URL:", url.substring(0, 100) + "...");
    originalImage = new Image();
    originalImage.crossOrigin = "anonymous"; // *** ESSENCIAL para CORS em canvas ***

    originalImage.onload = () => {
        imageLoaded = true;
        console.log("Imagem carregada com SUCESSO. Dimensões:", originalImage.width, "x", originalImage.height);
        resetImageProperties(); // Reseta todas as propriedades para a imagem nova
        drawImage();
        showMessage("Imagem carregada com sucesso!", false);
        toggleLoading(false); // Oculta o spinner
    };
    originalImage.onerror = (e) => {
        imageLoaded = false;
        console.error("Erro ao carregar imagem do URL:", e);
        showMessage("Erro ao carregar imagem do URL. Verifique a URL ou suas permissões CORS no Firebase Storage.", true);
        drawImage();
        toggleLoading(false); // Oculta o spinner
    };
    originalImage.src = url;
}


// Chamada inicial para desenhar o canvas (vazio ou com a imagem de exemplo se houver)
// Será feito dentro do onAuthStateChanged
// drawImage();