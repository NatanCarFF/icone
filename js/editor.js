// js/editor.js

import { auth } from './firebase-config.js'; // Importa a instância de auth
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
// JSZip agora será acessível globalmente, carregado via <script> no HTML


// ===========================================
// Variáveis Globais (não dependem do DOM)
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
let backgroundColorPicker; // Novo: Color Picker
let filterSelect; // Novo: Filtro
let textInput; // Novo: Texto
let fontSizeSlider; // Novo: Tamanho da Fonte
let fontColorPicker; // Novo: Cor da Fonte
let textXOffsetSlider; // Novo: Posição X do Texto
let textYOffsetSlider; // Novo: Posição Y do Texto
let resetEditorBtn;
let generateIconsBtn;
let editorMessage;
let downloadSection;
let generatedIconsContainer;
let downloadAllZip;
let undoBtn; // Novo: Undo
let redoBtn; // Novo: Redo


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
    backgroundColorPicker = document.getElementById('backgroundColorPicker'); // Novo
    filterSelect = document.getElementById('filterSelect'); // Novo
    textInput = document.getElementById('textInput'); // Novo
    fontSizeSlider = document.getElementById('fontSizeSlider'); // Novo
    fontColorPicker = document.getElementById('fontColorPicker'); // Novo
    textXOffsetSlider = document.getElementById('textXOffsetSlider'); // Novo
    textYOffsetSlider = document.getElementById('textYOffsetSlider'); // Novo
    resetEditorBtn = document.getElementById('resetEditorBtn');
    generateIconsBtn = document.getElementById('generateIconsBtn');
    editorMessage = document.getElementById('editorMessage');
    downloadSection = document.getElementById('downloadSection');
    generatedIconsContainer = document.getElementById('generatedIconsContainer');
    downloadAllZip = document.getElementById('downloadAllZip');
    undoBtn = document.getElementById('undoBtn'); // Novo
    redoBtn = document.getElementById('redoBtn'); // Novo

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
    scaleSlider.addEventListener('change', saveState); // Salva estado após mudança completa

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

    // Evento do Filtro (NOVO)
    filterSelect.addEventListener('change', (event) => {
        imageProps.filter = event.target.value;
        saveState();
        drawImage();
    });

    // Eventos dos Controles de Texto (NOVOS)
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
                case 'backgroundColorPicker': // Novo
                    valueToSet = '#FFFFFF';
                    propToReset = 'backgroundColor';
                    break;
                case 'fontSizeSlider': // Novo
                    valueToSet = 40;
                    propToReset = 'fontSize';
                    valueSpanId = 'fontSizeValue';
                    break;
                case 'fontColorPicker': // Novo
                    valueToSet = '#000000';
                    propToReset = 'fontColor';
                    break;
                case 'textXOffsetSlider': // Novo
                    valueToSet = 0;
                    propToReset = 'xOffset';
                    valueSpanId = 'textXOffsetValue';
                    break;
                case 'textYOffsetSlider': // Novo
                    valueToSet = 0;
                    propToReset = 'yOffset';
                    valueSpanId = 'textYOffsetValue';
                    break;
                default:
                    return;
            }

            targetElement.value = valueToSet;
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
        downloadSection.style.display = 'none'; // Esconde a seção de download
    });

    // Desfazer/Refazer (NOVOS)
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);


    // Gerar Ícones
    generateIconsBtn.addEventListener('click', () => {
        if (!imageLoaded) {
            showMessage("Por favor, carregue uma imagem primeiro!", true);
            return;
        }
        showMessage("Gerando ícones...", false);
        generatedIconsContainer.innerHTML = ''; // Limpa ícones anteriores
        downloadSection.style.display = 'block';

        const zip = new JSZip(); // Cria uma nova instância de JSZip

        // Função para desenhar e adicionar ao zip
        const drawAndAddIcon = (densityName, size) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');

            // Preenche o fundo
            tempCtx.fillStyle = imageProps.backgroundColor;
            tempCtx.fillRect(0, 0, size, size);

            // Desenha a imagem centralizada e com as transformações
            // Calcula o centro da imagem original
            const imgCenterX = originalImage.width / 2;
            const imgCenterY = originalImage.height / 2;

            // Calcula o ponto de origem para o desenho considerando rotação e escala
            // Transfere o contexto para o centro do canvas temporário
            tempCtx.translate(size / 2, size / 2);
            tempCtx.rotate(imageProps.rotation * Math.PI / 180); // Aplica rotação
            tempCtx.scale(imageProps.scale, imageProps.scale); // Aplica escala

            // Desenha a imagem com offset, considerando o centro do canvas temporário
            tempCtx.drawImage(
                originalImage,
                -imgCenterX + (imageProps.xOffset / CANVAS_SIZE * size),
                -imgCenterY + (imageProps.yOffset / CANVAS_SIZE * size),
                originalImage.width,
                originalImage.height
            );

            // Reseta as transformações para desenhar o texto
            tempCtx.setTransform(1, 0, 0, 1, 0, 0);

            // Aplica filtro à imagem no canvas temporário ANTES de desenhar o texto
            if (imageProps.filter !== 'none') {
                applyFilterToCanvas(tempCtx, tempCanvas.width, tempCanvas.height, imageProps.filter);
            }

            // Desenha o texto (após a imagem e o filtro)
            if (textProps.content) {
                tempCtx.font = `${textProps.fontSize / CANVAS_SIZE * size}px Inter, sans-serif`; // Escala a fonte
                tempCtx.fillStyle = textProps.fontColor;
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'middle';
                const textX = size / 2 + (textProps.xOffset / CANVAS_SIZE * size);
                const textY = size / 2 + (textProps.yOffset / CANVAS_SIZE * size);
                tempCtx.fillText(textProps.content, textX, textY);
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
            generatedIconsContainer.appendChild(iconItem);

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
                downloadAllZip.href = url;
                downloadAllZip.download = 'android_icons.zip';
                showMessage("Ícones gerados e prontos para download!", false);
            })
            .catch(error => {
                console.error("Erro ao gerar ZIP:", error);
                showMessage("Erro ao gerar ZIP dos ícones.", true);
            });
    });

    // Funções de atualização dos valores dos sliders
    function updateSliderValue(sliderId, valueSpanId, type, unit, multiplier = 1) {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(valueSpanId);
        let value = parseFloat(slider.value) * multiplier;
        if (type === 'int') {
            value = parseInt(value);
        }
        valueSpan.textContent = `${value}${unit}`;
    }

    // Inicializa valores exibidos
    updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px'); // Novo
    updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px'); // Novo
    updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px'); // Novo

}); // Fim DOMContentLoaded


// ===========================================
// Funções de Desenho e Edição
// ===========================================

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

// NOVO: Aplica um filtro ao contexto do canvas
function applyFilterToCanvas(context, width, height, filter) {
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
            case 'blur':
                // Implementar um blur simples (box blur)
                // Isso é complexo para fazer pixel a pixel eficientemente aqui.
                // Para um blur real, ctx.filter = 'blur(5px)'; é preferível,
                // mas isso requer que o navegador suporte a propriedade filter em canvas.
                // Como alternativa, vou deixar um placeholder e recomendar uma lib se necessário.
                // Por simplicidade, vou usar a propriedade CSS filter no canvas se suportado,
                // ou apenas passar por isso se não for a abordagem principal.
                // Para este exemplo, o blur é mais conceitual no pixel a pixel.
                // É melhor usar ctx.filter = 'blur(Xpx)' ou uma biblioteca externa para blur real.
                // Para uma implementação de filtro de verdade, o ideal é usar `ctx.filter` ou uma biblioteca de manipulação de imagem.
                // Para um exemplo simples de pixel, o blur é muito custoso.
                // Vou deixar um 'no-op' para blur em manipulação de pixel
                break;
        }
    }

    // Se o filtro for 'blur', usamos a propriedade de estilo do canvas (mais fácil)
    if (filter === 'blur') {
        // Verifica se a propriedade filter é suportada e aplica
        if (typeof context.filter !== 'undefined') {
            context.filter = 'blur(5px)'; // Aplica blur diretamente via CSS filter no canvas
            context.drawImage(context.canvas, 0, 0); // Redesenha para aplicar o filtro
            context.filter = 'none'; // Reseta para não afetar futuros desenhos
        } else {
            console.warn("Filtro 'blur' não suportado nativamente no canvas ou implementado via pixel. Usando fallback.");
            // Você pode adicionar um algoritmo de blur pixel a pixel aqui, mas é computacionalmente caro.
            // Para este exemplo, a implementação de blur pixel a pixel não será detalhada.
        }
    } else {
        context.putImageData(imageData, 0, 0);
    }
}


function showMessage(message, isError) {
    editorMessage.textContent = message;
    editorMessage.className = `message ${isError ? 'error' : 'success'}`;
    editorMessage.style.display = 'block';
    setTimeout(() => {
        editorMessage.style.display = 'none';
    }, 5000);
}

function resetImageProperties(resetHistory = true) {
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

    // Resetar sliders e pickers para seus valores padrão
    scaleSlider.value = imageProps.scale;
    rotationSlider.value = imageProps.rotation;
    xOffsetSlider.value = imageProps.xOffset;
    yOffsetSlider.value = imageProps.yOffset;
    backgroundColorPicker.value = imageProps.backgroundColor;
    filterSelect.value = imageProps.filter;

    textInput.value = textProps.content;
    fontSizeSlider.value = textProps.fontSize;
    fontColorPicker.value = textProps.fontColor;
    textXOffsetSlider.value = textProps.xOffset;
    textYOffsetSlider.value = textProps.yOffset;


    // Atualizar os valores exibidos nos spans
    updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
    updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
    updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');


    // Limpar a imagem se for um reset completo
    if (resetHistory) {
        imageLoaded = false;
        originalImage.src = ''; // Limpa a fonte da imagem
        history = [];
        historyIndex = -1;
        updateUndoRedoButtons();
    }
    saveState(); // Salva o estado inicial após o reset
}

// NOVO: Salva o estado atual das propriedades no histórico
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

// NOVO: Desfaz a última ação
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        applyState(history[historyIndex]);
        console.log("Undo. Histórico:", history.length, "Index:", historyIndex);
    }
    updateUndoRedoButtons();
}

// NOVO: Refaz a última ação desfeita
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        applyState(history[historyIndex]);
        console.log("Redo. Histórico:", history.length, "Index:", historyIndex);
    }
    updateUndoRedoButtons();
}

// NOVO: Aplica um estado salvo
function applyState(state) {
    // Aplica propriedades da imagem
    imageProps = { ...state.image };
    scaleSlider.value = imageProps.scale;
    rotationSlider.value = imageProps.rotation;
    xOffsetSlider.value = imageProps.xOffset;
    yOffsetSlider.value = imageProps.yOffset;
    backgroundColorPicker.value = imageProps.backgroundColor;
    filterSelect.value = imageProps.filter;

    // Aplica propriedades do texto
    textProps = { ...state.text };
    textInput.value = textProps.content;
    fontSizeSlider.value = textProps.fontSize;
    fontColorPicker.value = textProps.fontColor;
    textXOffsetSlider.value = textProps.xOffset;
    textYOffsetSlider.value = textProps.yOffset;

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
    updateSliderValue('scaleSlider', 'scaleValue', 'float', '%', 100);
    updateSliderValue('rotationSlider', 'rotationValue', 'int', '°');
    updateSliderValue('xOffsetSlider', 'xOffsetValue', 'int', 'px');
    updateSliderValue('yOffsetSlider', 'yOffsetValue', 'int', 'px');
    updateSliderValue('fontSizeSlider', 'fontSizeValue', 'int', 'px');
    updateSliderValue('textXOffsetSlider', 'textXOffsetValue', 'int', 'px');
    updateSliderValue('textYOffsetSlider', 'textYOffsetValue', 'int', 'px');

    updateUndoRedoButtons(); // Garante que o estado dos botões esteja correto
}

// NOVO: Atualiza o estado dos botões Undo/Redo
function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}


// Carrega imagem de URL (para exemplos)
function loadImageFromUrl(url) {
    originalImage.crossOrigin = 'Anonymous'; // Importante para CORS em canvas ***

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