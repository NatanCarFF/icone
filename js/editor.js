// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
// JSZip agora será acessível globalmente, carregado via <script> no HTML


// ===========================================
// Variáveis Globais
// ===========================================
let originalImage = new Image();
let imageLoaded = false;
const CANVAS_SIZE = 512; // Tamanho base do canvas para edição

// Propriedades da imagem e do texto
let imageProps = {
    scale: 1,
    rotation: 0,
    xOffset: 0,
    yOffset: 0,
    backgroundColor: '#FFFFFF',
    filter: 'none' // Novo: para filtros
};

let textProps = { // Novo: propriedades do texto
    content: '',
    fontSize: 40,
    fontColor: '#000000',
    xOffset: 0,
    yOffset: 0
};

// Histórico de estados para Undo/Redo
let history = [];
let historyIndex = -1;
const MAX_HISTORY_SIZE = 20; // Limite para o histórico

// ===========================================
// Seleção de Elementos (Inicialização Vazia, atribuída em DOMContentLoaded)
// ===========================================
let logoutBtn;
let imageUpload;
let iconCanvas;
let ctx;
let scaleSlider;
let rotationSlider;
let xOffsetSlider;
let yOffsetSlider;
let backgroundColorPicker;
let filterSelect;
let textInput;
let fontSizeSlider;
let fontColorPicker;
let textXOffsetSlider;
let textYOffsetSlider;
let resetEditorBtn;
let generateIconsBtn;
let editorMessage;
let downloadSection;
let generatedIconsContainer;
let downloadAllZip;
let undoBtn;
let redoBtn;


// ===========================================
// Funções Globais (Movidas para fora do DOMContentLoaded)
// ===========================================

// Função principal de desenho no canvas
function drawImage() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Limpa o canvas

    // Preenche o fundo com a cor selecionada
    ctx.fillStyle = imageProps.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (imageLoaded) {
        ctx.save(); // Salva o estado atual do contexto

        // Move a origem para o centro do canvas
        ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        // Aplica rotação
        ctx.rotate(imageProps.rotation * Math.PI / 180);

        // Aplica escala
        ctx.scale(imageProps.scale, imageProps.scale);

        // Desenha a imagem centralizada no novo sistema de coordenadas com offsets
        const imgCenterX = originalImage.width / 2;
        const imgCenterY = originalImage.height / 2;
        ctx.drawImage(
            originalImage,
            -imgCenterX + imageProps.xOffset,
            -imgCenterY + imageProps.yOffset,
            originalImage.width,
            originalImage.height
        );

        ctx.restore(); // Restaura o estado anterior do contexto (removendo transformações)

        // Aplica filtro ao canvas principal (APÓS desenhar a imagem)
        if (imageProps.filter !== 'none') {
            applyFilterToCanvas(ctx, CANVAS_SIZE, CANVAS_SIZE, imageProps.filter);
        }
    }

    // Desenha o texto (SEMPRE depois da imagem e dos filtros para estar no topo)
    if (textProps.content) {
        ctx.save();
        ctx.font = `${textProps.fontSize}px 'Inter', sans-serif`; // Usar 'Inter' ou outra fonte segura
        ctx.fillStyle = textProps.fontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Calcular posição central no canvas + offset
        const textX = CANVAS_SIZE / 2 + textProps.xOffset;
        const textY = CANVAS_SIZE / 2 + textProps.yOffset;
        ctx.fillText(textProps.content, textX, textY);
        ctx.restore();
    }
}

// Aplica um filtro ao contexto do canvas
function applyFilterToCanvas(context, width, height, filter) {
    // Para filtros que alteram pixels diretamente (grayscale, sepia, invert)
    if (filter !== 'none' && filter !== 'blur') {
        const imageData = context.getImageData(0, 0, width, height);
        const pixels = imageData.data; // Array de pixels [R, G, B, A, R, G, B, A, ...]

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            switch (filter) {
                case 'grayscale':
                    const gray = (r + g + b) / 3;
                    pixels[i] = gray;
                    pixels[i + 1] = gray;
                    pixels[i + 2] = gray;
                    break;
                case 'sepia':
                    pixels[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
                    pixels[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
                    pixels[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
                    break;
                case 'invert':
                    pixels[i] = 255 - r;
                    pixels[i + 1] = 255 - g;
                    pixels[i + 2] = 255 - b;
                    break;
            }
        }
        context.putImageData(imageData, 0, 0);
    }

    // Para o filtro 'blur', usamos a propriedade de estilo do canvas (mais performático)
    if (filter === 'blur') {
        // Verifica se a propriedade filter é suportada e aplica
        if (typeof context.filter !== 'undefined') {
            context.filter = 'blur(5px)'; // Aplica blur diretamente via CSS filter no canvas
            context.drawImage(context.canvas, 0, 0); // Redesenha para aplicar o filtro
            context.filter = 'none'; // Reseta para não afetar futuros desenhos
        } else {
            console.warn("Filtro 'blur' não suportado nativamente no canvas. A aplicação via pixel seria muito custosa.");
        }
    }
}


function showMessage(message, isError) {
    if (editorMessage) { // Verifica se o elemento já foi carregado
        editorMessage.textContent = message;
        editorMessage.className = `message ${isError ? 'error' : 'success'}`;
        editorMessage.style.display = 'block';
        setTimeout(() => {
            editorMessage.style.display = 'none';
        }, 5000);
    }
}

// Reseta propriedades da imagem e do texto para os valores padrão
function resetImageProperties(resetHistoryFlag = true) {
    // Resetar propriedades da imagem
    imageProps = {
        scale: 1,
        rotation: 0,
        xOffset: 0,
        yOffset: 0,
        backgroundColor: '#FFFFFF',
        filter: 'none'
    };
    // Resetar propriedades do texto
    textProps = {
        content: '',
        fontSize: 40,
        fontColor: '#000000',
        xOffset: 0,
        yOffset: 0
    };

    // Resetar sliders e pickers para seus valores padrão, se já estiverem disponíveis
    if (scaleSlider) scaleSlider.value = imageProps.scale;
    if (rotationSlider) rotationSlider.value = imageProps.rotation;
    if (xOffsetSlider) xOffsetSlider.value = imageProps.xOffset;
    if (yOffsetSlider) yOffsetSlider.value = imageProps.yOffset;
    if (backgroundColorPicker) backgroundColorPicker.value = imageProps.backgroundColor;
    if (filterSelect) filterSelect.value = imageProps.filter;

    if (textInput) textInput.value = textProps.content;
    if (fontSizeSlider) fontSizeSlider.value = textProps.fontSize;
    if (fontColorPicker) fontColorPicker.value = textProps.fontColor;
    if (textXOffsetSlider) textXOffsetSlider.value = textProps.xOffset;
    if (textYOffsetSlider) textYOffsetSlider.value = textProps.yOffset;


    // Atualizar os valores exibidos nos spans, se os elementos estiverem disponíveis
    if (scaleSlider) updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    if (rotationSlider) updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    if (xOffsetSlider) updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    if (yOffsetSlider) updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    if (fontSizeSlider) updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
    if (textXOffsetSlider) updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
    if (textYOffsetSlider) updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');


    // Limpar a imagem se for um reset completo
    if (resetHistoryFlag) { // Renomeado para evitar conflito com variável history
        imageLoaded = false;
        originalImage.src = ''; // Limpa a fonte da imagem
        history = [];
        historyIndex = -1;
        updateUndoRedoButtons();
    }
    saveState(); // Salva o estado inicial após o reset
}

// Funções de atualização dos valores dos sliders
function updateSliderValue(sliderId, valueSpanId, type, unit, multiplier = 1) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueSpanId);
    if (slider && valueSpan) { // Garante que os elementos existem
        let value = parseFloat(slider.value) * multiplier;
        if (type === 'int') {
            value = parseInt(value);
        }
        valueSpan.textContent = `${value}${unit}`;
    }
}

// Salva o estado atual das propriedades no histórico
function saveState() {
    // Se o historyIndex não estiver no final, descarta os "redos"
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    const currentState = {
        image: { ...imageProps }, // Cópia profunda das propriedades da imagem
        text: { ...textProps },   // Cópia profunda das propriedades do texto
        imageDataUrl: imageLoaded ? originalImage.src : null // Salva a imagem base64/URL
    };
    history.push(currentState);

    // Limita o tamanho do histórico
    if (history.length > MAX_HISTORY_SIZE) {
        history.shift(); // Remove o item mais antigo
    } else {
        historyIndex++;
    }
    updateUndoRedoButtons();
    console.log("Estado salvo. Histórico:", history.length, "Index:", historyIndex);
}

// Desfaz a última ação
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        applyState(history[historyIndex]);
        console.log("Undo. Histórico:", history.length, "Index:", historyIndex);
    }
    updateUndoRedoButtons();
}

// Refaz a última ação desfeita
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        applyState(history[historyIndex]);
        console.log("Redo. Histórico:", history.length, "Index:", historyIndex);
    }
    updateUndoRedoButtons();
}

// Aplica um estado salvo
function applyState(state) {
    // Aplica propriedades da imagem
    imageProps = { ...state.image };
    if (scaleSlider) scaleSlider.value = imageProps.scale;
    if (rotationSlider) rotationSlider.value = imageProps.rotation;
    if (xOffsetSlider) xOffsetSlider.value = imageProps.xOffset;
    if (yOffsetSlider) yOffsetSlider.value = imageProps.yOffset;
    if (backgroundColorPicker) backgroundColorPicker.value = imageProps.backgroundColor;
    if (filterSelect) filterSelect.value = imageProps.filter;

    // Aplica propriedades do texto
    textProps = { ...state.text };
    if (textInput) textInput.value = textProps.content;
    if (fontSizeSlider) fontSizeSlider.value = textProps.fontSize;
    if (fontColorPicker) fontColorPicker.value = textProps.fontColor;
    if (textXOffsetSlider) textXOffsetSlider.value = textProps.xOffset;
    if (textYOffsetSlider) textYOffsetSlider.value = textProps.yOffset;

    // Se houver uma imagem no estado, carrega-a
    if (state.imageDataUrl && state.imageDataUrl !== originalImage.src) {
        originalImage.src = state.imageDataUrl;
        originalImage.onload = () => {
            imageLoaded = true;
            drawImage();
        };
    } else if (!state.imageDataUrl) { // Se não houver imagem, reseta
        imageLoaded = false;
        originalImage.src = '';
        drawImage();
    } else { // Se a imagem for a mesma, apenas redesenha
        drawImage();
    }

    // Atualiza os valores exibidos nos sliders
    if (scaleSlider) updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    if (rotationSlider) updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    if (xOffsetSlider) updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    if (yOffsetSlider) updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    if (fontSizeSlider) updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
    if (textXOffsetSlider) updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
    if (textYOffsetSlider) updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');

    updateUndoRedoButtons(); // Garante que o estado dos botões esteja correto
}

// Atualiza o estado dos botões Undo/Redo
function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
}

// Carrega imagem de URL (para exemplos)
function loadImageFromUrl(url) {
    originalImage.crossOrigin = 'Anonymous'; // Importante para CORS em canvas

    originalImage.onload = () => {
        imageLoaded = true;
        console.log("Imagem carregada com SUCESSO do URL. Dimensões:", originalImage.width, "x", originalImage.height);
        resetImageProperties(false); // Não reseta o histórico ao carregar nova imagem (vindo de exemplo)
        saveState(); // Salva o estado inicial da nova imagem
        drawImage();
        showMessage("Imagem de exemplo carregada com sucesso!", false);
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
        // Se não houver imagem pré-selecionada, apenas salva o estado inicial para undo/redo
        saveState();
    }
}

// Função para centralizar a imagem no canvas após o carregamento
// Não é mais chamada automaticamente no onload, pois resetImageProperties e drawImage cuidam disso.
// Permanece aqui apenas para referência, se necessário para outra lógica.
function centerImage() {
    // Calculos de offset para centralizar
    imageProps.xOffset = (CANVAS_SIZE - originalImage.width * imageProps.scale) / 2;
    imageProps.yOffset = (CANVAS_SIZE - originalImage.height * imageProps.scale) / 2;
    drawImage();
}


// ===========================================
// Configuração Inicial do DOM (Dentro de DOMContentLoaded)
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    // Seleção de Elementos do DOM
    logoutBtn = document.getElementById('logoutBtn');
    imageUpload = document.getElementById('imageUpload');
    iconCanvas = document.getElementById('iconCanvas');
    ctx = iconCanvas.getContext('2d');
    scaleSlider = document.getElementById('scaleSlider');
    rotationSlider = document.getElementById('rotationSlider');
    xOffsetSlider = document.getElementById('xOffsetSlider');
    yOffsetSlider = document.getElementById('yOffsetSlider');
    backgroundColorPicker = document.getElementById('backgroundColorPicker');
    filterSelect = document.getElementById('filterSelect');
    textInput = document.getElementById('textInput');
    fontSizeSlider = document.getElementById('fontSizeSlider');
    fontColorPicker = document.getElementById('fontColorPicker');
    textXOffsetSlider = document.getElementById('textXOffsetSlider');
    textYOffsetSlider = document.getElementById('textYOffsetSlider');
    resetEditorBtn = document.getElementById('resetEditorBtn');
    generateIconsBtn = document.getElementById('generateIconsBtn');
    editorMessage = document.getElementById('editorMessage');
    downloadSection = document.getElementById('downloadSection');
    generatedIconsContainer = document.getElementById('generatedIconsContainer');
    downloadAllZip = document.getElementById('downloadAllZip');
    undoBtn = document.getElementById('undoBtn');
    redoBtn = document.getElementById('redoBtn');

    // Configurações Iniciais do Canvas
    iconCanvas.width = CANVAS_SIZE;
    iconCanvas.height = CANVAS_SIZE;
    drawImage(); // Desenha o canvas inicial (vazio)

    // ===========================================
    // Autenticação Firebase
    // ===========================================
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Se o usuário não estiver logado, redireciona para a página de login
            window.location.href = 'login.html';
        } else {
            // Usuário logado, pode carregar dados ou exibir interface
            console.log("Usuário logado:", user.email);
            checkSelectedExampleImage(); // Verifica se veio de uma imagem de exemplo
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            showMessage("Erro ao fazer logout. Tente novamente.", true);
        }
    });

    // ===========================================
    // Event Listeners
    // ===========================================

    // Upload de Imagem
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage.src = e.target.result;
                originalImage.onload = () => {
                    imageLoaded = true;
                    console.log("Imagem carregada. Dimensões:", originalImage.width, "x", originalImage.height);
                    resetImageProperties(false); // Não reseta o histórico ao carregar nova imagem
                    saveState(); // Salva o estado inicial da nova imagem
                    drawImage();
                    showMessage("Imagem carregada com sucesso!", false);
                };
                originalImage.onerror = () => {
                    imageLoaded = false;
                    console.error("Erro ao carregar imagem.");
                    showMessage("Erro ao carregar imagem. Verifique o formato.", true);
                    drawImage();
                };
            };
            reader.readAsDataURL(file);
        }
    });

    // Eventos dos Sliders da Imagem
    scaleSlider.addEventListener('input', (event) => {
        imageProps.scale = parseFloat(event.target.value);
        updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
        drawImage();
    });
    scaleSlider.addEventListener('change', saveState);

    rotationSlider.addEventListener('input', (event) => {
        imageProps.rotation = parseFloat(event.target.value);
        updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
        drawImage();
    });
    rotationSlider.addEventListener('change', saveState);

    xOffsetSlider.addEventListener('input', (event) => {
        imageProps.xOffset = parseInt(event.target.value);
        updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
        drawImage();
    });
    xOffsetSlider.addEventListener('change', saveState);

    yOffsetSlider.addEventListener('input', (event) => {
        imageProps.yOffset = parseInt(event.target.value);
        updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
        drawImage();
    });
    yOffsetSlider.addEventListener('change', saveState);

    // Evento do Color Picker de Fundo
    backgroundColorPicker.addEventListener('input', (event) => {
        imageProps.backgroundColor = event.target.value;
        drawImage();
    });
    backgroundColorPicker.addEventListener('change', saveState);

    // Evento do Filtro
    filterSelect.addEventListener('change', (event) => {
        imageProps.filter = event.target.value;
        saveState();
        drawImage();
    });

    // Eventos dos Controles de Texto
    textInput.addEventListener('input', (event) => {
        textProps.content = event.target.value;
        saveState(); // Salva o estado ao digitar
        drawImage();
    });

    fontSizeSlider.addEventListener('input', (event) => {
        textProps.fontSize = parseInt(event.target.value);
        updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
        drawImage();
    });
    fontSizeSlider.addEventListener('change', saveState);

    fontColorPicker.addEventListener('input', (event) => {
        textProps.fontColor = event.target.value;
        drawImage();
    });
    fontColorPicker.addEventListener('change', saveState);

    textXOffsetSlider.addEventListener('input', (event) => {
        textProps.xOffset = parseInt(event.target.value);
        updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
        drawImage();
    });
    textXOffsetSlider.addEventListener('change', saveState);

    textYOffsetSlider.addEventListener('input', (event) => {
        textProps.yOffset = parseInt(event.target.value);
        updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');
        drawImage();
    });
    textYOffsetSlider.addEventListener('change', saveState);


    // Botões de Reset
    document.querySelectorAll('.reset-slider-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const targetId = event.target.dataset.target;
            const targetElement = document.getElementById(targetId);

            let valueToSet;
            let propToReset;
            let valueSpanId;

            switch (targetId) {
                case 'scaleSlider':
                    valueToSet = 1;
                    propToReset = 'scale';
                    valueSpanId = 'scaleValue';
                    break;
                case 'rotationSlider':
                    valueToSet = 0;
                    propToReset = 'rotation';
                    valueSpanId = 'rotationValue';
                    break;
                case 'xOffsetSlider':
                    valueToSet = 0;
                    propToReset = 'xOffset';
                    valueSpanId = 'xOffsetValue';
                    break;
                case 'yOffsetSlider':
                    valueToSet = 0;
                    propToReset = 'yOffset';
                    valueSpanId = 'yOffsetValue';
                    break;
                case 'backgroundColorPicker':
                    valueToSet = '#FFFFFF';
                    propToReset = 'backgroundColor';
                    break;
                case 'fontSizeSlider':
                    valueToSet = 40;
                    propToReset = 'fontSize';
                    valueSpanId = 'fontSizeValue';
                    break;
                case 'fontColorPicker':
                    valueToSet = '#000000';
                    propToReset = 'fontColor';
                    break;
                case 'textXOffsetSlider':
                    valueToSet = 0;
                    propToReset = 'xOffset';
                    valueSpanId = 'textXOffsetValue';
                    break;
                case 'textYOffsetSlider':
                    valueToSet = 0;
                    propToReset = 'yOffset';
                    valueSpanId = 'textYOffsetValue';
                    break;
                default:
                    return;
            }

            if (targetElement) { // Verifica se o elemento existe antes de tentar definir o valor
                targetElement.value = valueToSet;
            }
            if (imageProps.hasOwnProperty(propToReset)) {
                imageProps[propToReset] = valueToSet;
            } else if (textProps.hasOwnProperty(propToReset)) {
                textProps[propToReset] = valueToSet;
            }

            if (valueSpanId) {
                if (targetId.includes('scale')) updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
                else if (targetId.includes('rotation')) updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
                else updateSliderValue(targetId, valueSpanId, 'int', 'px');
            }
            saveState(); // Salva o estado após o reset
            drawImage();
        });
    });

    // Resetar Editor Completo
    resetEditorBtn.addEventListener('click', () => {
        resetImageProperties(true); // Reseta todo o histórico também
        drawImage();
        showMessage("Edição resetada para o estado inicial.", false);
        if (downloadSection) downloadSection.style.display = 'none'; // Esconde a seção de download
    });

    // Desfazer/Refazer
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);


    // Gerar Ícones
    generateIconsBtn.addEventListener('click', () => {
        if (!imageLoaded) {
            showMessage("Por favor, carregue uma imagem primeiro!", true);
            return;
        }
        showMessage("Gerando ícones...", false);
        if (generatedIconsContainer) generatedIconsContainer.innerHTML = ''; // Limpa ícones anteriores
        if (downloadSection) downloadSection.style.display = 'block';

        const zip = new JSZip(); // Cria uma nova instância de JSZip

        // Função para desenhar e adicionar ao zip
        const drawAndAddIcon = (densityName, size) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');

            // 1. Preenche o fundo com a cor selecionada (no contexto padrão)
            tempCtx.fillStyle = imageProps.backgroundColor;
            tempCtx.fillRect(0, 0, size, size);

            // 2. Desenha a imagem com suas transformações (isoladas por save/restore)
            // Certifique-se de que a imagem esteja carregada antes de tentar desenhá-la
            if (imageLoaded) {
                tempCtx.save(); // Salva o estado atual do contexto (não transformado)

                // Move a origem para o centro do canvas temporário
                tempCtx.translate(size / 2, size / 2);

                // Aplica rotação
                tempCtx.rotate(imageProps.rotation * Math.PI / 180);

                // Aplica escala
                tempCtx.scale(imageProps.scale, imageProps.scale);

                // Desenha a imagem centralizada no novo sistema de coordenadas com offsets escalados
                const imgCenterX = originalImage.width / 2;
                const imgCenterY = originalImage.height / 2;
                tempCtx.drawImage(
                    originalImage,
                    -imgCenterX + (imageProps.xOffset / CANVAS_SIZE * size), // Offsets escalados
                    -imgCenterY + (imageProps.yOffset / CANVAS_SIZE * size), // Offsets escalados
                    originalImage.width,
                    originalImage.height
                );

                tempCtx.restore(); // Restaura o estado anterior do contexto (removendo transformações da imagem)
            }

            // 3. Aplica filtro ao canvas principal (APÓS desenhar a imagem e restaurar as transformações)
            if (imageProps.filter !== 'none') {
                applyFilterToCanvas(tempCtx, tempCanvas.width, tempCanvas.height, imageProps.filter);
            }

            // 4. Desenha o texto (SEMPRE depois da imagem e dos filtros para estar no topo)
            if (textProps.content) {
                tempCtx.save(); // Salva o estado para o texto (se houver transformações específicas para texto no futuro)
                tempCtx.font = `${textProps.fontSize / CANVAS_SIZE * size}px 'Inter', sans-serif`; // Escala a fonte
                tempCtx.fillStyle = textProps.fontColor;
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'middle';
                // Calcular posição central no canvas + offset escalado
                const textX = size / 2 + (textProps.xOffset / CANVAS_SIZE * size);
                const textY = size / 2 + (textProps.yOffset / CANVAS_SIZE * size);
                tempCtx.fillText(textProps.content, textX, textY);
                tempCtx.restore();
            }

            // Converte para Base64 e cria o elemento de imagem
            const imageDataUrl = tempCanvas.toDataURL('image/png');
            const iconItem = document.createElement('div');
            iconItem.classList.add('generated-icon-item');
            iconItem.innerHTML = `
                <img src="${imageDataUrl}" alt="${densityName} icon">
                <p>${densityName} (${size}x${size}px)</p>
                <a href="${imageDataUrl}" download="icon_${densityName}.png">Download</a>
            `;
            if (generatedIconsContainer) generatedIconsContainer.appendChild(iconItem);

            // Adiciona ao ZIP
            const base64Data = imageDataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
            zip.file(`android/mipmap-${densityName}/ic_launcher.png`, base64Data, { base64: true });
        };

        // Gerar ícones para cada densidade
        for (const density in ANDROID_DENSITIES) {
            drawAndAddIcon(density, ANDROID_DENSITIES[density]);
        }

        // Gera o arquivo ZIP
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                const url = URL.createObjectURL(content);
                if (downloadAllZip) {
                    downloadAllZip.href = url;
                    downloadAllZip.download = 'android_icons.zip';
                }
                showMessage("Ícones gerados e prontos para download!", false);
            })
            .catch(error => {
                console.error("Erro ao gerar ZIP:", error);
                showMessage("Erro ao gerar ZIP dos ícones.", true);
            });
    });

    // Inicializa valores exibidos
    updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
    updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
    updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');

}); // Fim DOMContentLoaded