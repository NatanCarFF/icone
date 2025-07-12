document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const iconCanvas = document.getElementById('iconCanvas');
    const ctx = iconCanvas.getContext('2d');

    const backgroundColorPicker = document.getElementById('backgroundColorPicker');
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    const borderWidthSlider = document.getElementById('borderWidthSlider');
    const borderWidthValue = document.getElementById('borderWidthValue');
    const borderColorPicker = document.getElementById('borderColorPicker');
    const borderRadiusSlider = document.getElementById('borderRadiusSlider');
    const borderRadiusValue = document.getElementById('borderRadiusValue');

    const generateIconsBtn = document.getElementById('generateIconsBtn');
    const generatedIconsDiv = document.getElementById('generatedIcons');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Novos elementos de controle de qualidade
    const imageSmoothingQualitySelect = document.getElementById('imageSmoothingQualitySelect');
    const applySharpeningCheckbox = document.getElementById('applySharpeningCheckbox');

    let originalImage = new Image();
    let imageLoaded = false;

    const CANVAS_SIZE = 512; // Tamanho fixo do canvas de visualização

    let imageProps = {
        backgroundColor: '#ffffff',
        padding: 10,
        scale: 100,
        borderWidth: 0,
        borderColor: '#000000',
        borderRadius: 0,
        imageSmoothingQuality: 'high', // Padrão para alta qualidade
        applySharpening: false // Padrão para não aplicar sharpening
    };

    const ANDROID_DENSITIES = {
        'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192,
        // Adicionando resoluções maiores para teste de qualidade
        'android-icon-512x512': 512,
        'android-icon-1024x1024': 1024,
        'android-icon-2048x2048': 2048,
        'android-icon-4096x4096': 4096,
        'android-icon-8192x8192': 8192
    };

    const IOS_SIZES = {
        'AppIcon20x20@1x': 20, 'AppIcon20x20@2x': 40, 'AppIcon20x20@3x': 60,
        'AppIcon29x29@1x': 29, 'AppIcon29x29@2x': 58, 'AppIcon29x29@3x': 87,
        'AppIcon40x40@1x': 40, 'AppIcon40x40@2x': 80, 'AppIcon40x40@3x': 120,
        'AppIcon57x57@1x': 57, 'AppIcon57x57@2x': 114,
        'AppIcon60x60@2x': 120, 'AppIcon60x60@3x': 180,
        'AppIcon76x76@1x': 76, 'AppIcon76x76@2x': 152,
        'AppIcon83.5x83.5@2x': 167,
        'iTunesArtwork@1x': 512, 'iTunesArtwork@2x': 1024
    };

    // Função de debounce para evitar redesenhos excessivos
    let debounceTimer;
    function updateDebouncedDraw() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(drawImage, 50);
    }

    // Função para aplicar filtro de sharpening
    // Baseado em: https://www.html5rocks.com/en/tutorials/canvas/imagefilters/
    function applySharpening(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const outputPixels = new Uint8ClampedArray(pixels.length);

        // Kernel de sharpening (matriz de convolução)
        // Este é um kernel básico de sharpening. Valores maiores aumentam a nitidez.
        const kernel = [
            0, -1,  0,
            -1,  5, -1,
            0, -1,  0
        ];
        const kernelSize = 3;
        const kernelHalf = Math.floor(kernelSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;

                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const pixelX = x + kx - kernelHalf;
                        const pixelY = y + ky - kernelHalf;

                        if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
                            const kernelValue = kernel[ky * kernelSize + kx];
                            const index = (pixelY * width + pixelX) * 4;

                            r += pixels[index] * kernelValue;
                            g += pixels[index + 1] * kernelValue;
                            b += pixels[index + 2] * kernelValue;
                            a += pixels[index + 3] * kernelValue; // Manter o canal alfa
                        }
                    }
                }

                const outputIndex = (y * width + x) * 4;
                outputPixels[outputIndex] = Math.min(255, Math.max(0, r));
                outputPixels[outputIndex + 1] = Math.min(255, Math.max(0, g));
                outputPixels[outputIndex + 2] = Math.min(255, Math.max(0, b));
                outputPixels[outputIndex + 3] = pixels[outputIndex + 3]; // Manter o alfa original
            }
        }
        return new ImageData(outputPixels, width, height);
    }


    function drawImage() {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.fillStyle = imageProps.backgroundColor;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Configura a suavização de imagem para o canvas principal de visualização
        // Sempre ativo para a visualização para melhor experiência
        ctx.imageSmoothingEnabled = true; 
        ctx.imageSmoothingQuality = imageProps.imageSmoothingQuality;

        if (!imageLoaded) {
            ctx.font = '20px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Carregue uma imagem', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
            return;
        }

        ctx.save();
        ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        const aspectRatio = originalImage.width / originalImage.height;
        let scaledWidth, scaledHeight;

        // Calcula o tamanho da imagem com base no padding e escala
        const maxDimension = CANVAS_SIZE * (1 - (imageProps.padding * 2 / 100));

        if (originalImage.width > originalImage.height) {
            scaledWidth = maxDimension;
            scaledHeight = maxDimension / aspectRatio;
        } else {
            scaledHeight = maxDimension;
            scaledWidth = maxDimension * aspectRatio;
        }

        scaledWidth *= (imageProps.scale / 100);
        scaledHeight *= (imageProps.scale / 100);

        ctx.drawImage(originalImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

        // Desenhar borda se houver
        if (imageProps.borderWidth > 0) {
            ctx.strokeStyle = imageProps.borderColor;
            ctx.lineWidth = imageProps.borderWidth;

            // Para bordas arredondadas, desenha um path arredondado
            if (imageProps.borderRadius > 0) {
                const rectX = -CANVAS_SIZE / 2 + imageProps.borderWidth / 2;
                const rectY = -CANVAS_SIZE / 2 + imageProps.borderWidth / 2;
                const rectWidth = CANVAS_SIZE - imageProps.borderWidth;
                const rectHeight = CANVAS_SIZE - imageProps.borderWidth;
                const radius = (CANVAS_SIZE / 2) * (imageProps.borderRadius / 100);

                ctx.beginPath();
                ctx.moveTo(rectX + radius, rectY);
                ctx.lineTo(rectX + rectWidth - radius, rectY);
                ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius, radius);
                ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
                ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight, radius);
                ctx.lineTo(rectX + radius, rectY + rectHeight);
                ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius, radius);
                ctx.lineTo(rectX, rectY + radius);
                ctx.arcTo(rectX, rectY, rectX + radius, rectY, radius);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Borda retangular
                ctx.strokeRect(-CANVAS_SIZE / 2 + imageProps.borderWidth / 2, -CANVAS_SIZE / 2 + imageProps.borderWidth / 2,
                               CANVAS_SIZE - imageProps.borderWidth, CANVAS_SIZE - imageProps.borderWidth);
            }
        }

        ctx.restore();
    }

    // Event Listeners
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage.onload = () => {
                    imageLoaded = true;
                    drawImage();
                };
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    backgroundColorPicker.addEventListener('input', (e) => {
        imageProps.backgroundColor = e.target.value;
        updateDebouncedDraw();
    });

    paddingSlider.addEventListener('input', (e) => {
        imageProps.padding = parseInt(e.target.value);
        paddingValue.textContent = `${imageProps.padding}%`;
        updateDebouncedDraw();
    });

    scaleSlider.addEventListener('input', (e) => {
        imageProps.scale = parseInt(e.target.value);
        scaleValue.textContent = `${imageProps.scale}%`;
        updateDebouncedDraw();
    });

    borderWidthSlider.addEventListener('input', (e) => {
        imageProps.borderWidth = parseInt(e.target.value);
        borderWidthValue.textContent = `${imageProps.borderWidth}px`;
        updateDebouncedDraw();
    });

    borderColorPicker.addEventListener('input', (e) => {
        imageProps.borderColor = e.target.value;
        updateDebouncedDraw();
    });

    borderRadiusSlider.addEventListener('input', (e) => {
        imageProps.borderRadius = parseInt(e.target.value);
        borderRadiusValue.textContent = `${imageProps.borderRadius}%`;
        updateDebouncedDraw();
    });

    // Novos manipuladores de evento para qualidade
    imageSmoothingQualitySelect.addEventListener('change', (e) => {
        imageProps.imageSmoothingQuality = e.target.value;
        updateDebouncedDraw(); // Redesenha o canvas de visualização com a nova qualidade
    });

    applySharpeningCheckbox.addEventListener('change', (e) => {
        imageProps.applySharpening = e.target.checked;
        // Não precisa redesenhar o canvas de visualização aqui,
        // pois o sharpening será aplicado apenas na geração final.
    });


    generateIconsBtn.addEventListener('click', async () => {
        if (!imageLoaded) {
            alert('Por favor, carregue uma imagem primeiro.');
            return;
        }

        toggleLoading(true);
        generatedIconsDiv.innerHTML = '';
        const zip = new JSZip();
        let filesToDownload = [];

        try {
            // Gerar ícones Android
            for (const density in ANDROID_DENSITIES) {
                const size = ANDROID_DENSITIES[density];
                const fileName = `android/mipmap-${density}/ic_launcher.png`;
                const blob = await generateIconBlob(size, 'android');
                zip.file(fileName, blob);
                filesToDownload.push({ name: fileName, blob: blob });
                addIconToGrid(blob, `Android (${density})`, size);
            }

            // Gerar ícones iOS
            for (const name in IOS_SIZES) {
                const size = IOS_SIZES[name];
                const fileName = `ios/${name}.png`;
                const blob = await generateIconBlob(size, 'ios');
                zip.file(fileName, blob);
                filesToDownload.push({ name: fileName, blob: blob });
                addIconToGrid(blob, `iOS (${name})`, size);
            }

            if (filesToDownload.length > 0) {
                downloadAllBtn.style.display = 'block';
                downloadAllBtn.onclick = async () => {
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, 'icons.zip');
                };
            }

        } catch (error) {
            console.error('Erro ao gerar ícones:', error);
            alert('Ocorreu um erro ao gerar os ícones. Verifique o console para mais detalhes.');
        } finally {
            toggleLoading(false);
        }
    });

    async function generateIconBlob(size, platform) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Configurações de suavização para o tempCanvas (ícones finais)
        tempCtx.imageSmoothingEnabled = true; // Sempre ativo para a geração final
        tempCtx.imageSmoothingQuality = imageProps.imageSmoothingQuality;

        // Preencher fundo
        tempCtx.fillStyle = imageProps.backgroundColor;
        tempCtx.fillRect(0, 0, size, size);

        tempCtx.save();
        tempCtx.translate(size / 2, size / 2);

        const aspectRatio = originalImage.width / originalImage.height;
        let scaledOriginalWidth, scaledOriginalHeight;

        const maxDimension = size * (1 - (imageProps.padding * 2 / 100));

        if (originalImage.width > originalImage.height) {
            scaledOriginalWidth = maxDimension;
            scaledOriginalHeight = maxDimension / aspectRatio;
        } else {
            scaledOriginalHeight = maxDimension;
            scaledOriginalWidth = maxDimension * aspectRatio;
        }

        scaledOriginalWidth *= (imageProps.scale / 100);
        scaledOriginalHeight *= (imageProps.scale / 100);

        // Desenhar imagem original no tempCanvas
        tempCtx.drawImage(originalImage, -scaledOriginalWidth / 2, -scaledOriginalHeight / 2, scaledOriginalWidth, scaledOriginalHeight);

        // Aplicar Sharpening se a opção estiver marcada
        if (imageProps.applySharpening) {
            // Pega os dados de pixel do que foi desenhado até agora
            let imageData = tempCtx.getImageData(0, 0, size, size);
            // Aplica o filtro de sharpening
            imageData = applySharpening(imageData);
            // Coloca os pixels de volta no canvas
            tempCtx.putImageData(imageData, 0, 0);
        }

        // Desenhar borda se houver
        if (imageProps.borderWidth > 0) {
            tempCtx.strokeStyle = imageProps.borderColor;
            tempCtx.lineWidth = imageProps.borderWidth * (size / CANVAS_SIZE); // Escala a largura da borda

            if (imageProps.borderRadius > 0) {
                const rectX = -size / 2 + tempCtx.lineWidth / 2;
                const rectY = -size / 2 + tempCtx.lineWidth / 2;
                const rectWidth = size - tempCtx.lineWidth;
                const rectHeight = size - tempCtx.lineWidth;
                const radius = (size / 2) * (imageProps.borderRadius / 100);

                tempCtx.beginPath();
                tempCtx.moveTo(rectX + radius, rectY);
                tempCtx.lineTo(rectX + rectWidth - radius, rectY);
                tempCtx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius, radius);
                tempCtx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
                tempCtx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight, radius);
                tempCtx.lineTo(rectX + radius, rectY + rectHeight);
                tempCtx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius, radius);
                tempCtx.lineTo(rectX, rectY + radius);
                tempCtx.arcTo(rectX, rectY, rectX + radius, rectY, radius);
                tempCtx.closePath();
                tempCtx.stroke();
            } else {
                tempCtx.strokeRect(-size / 2 + tempCtx.lineWidth / 2, -size / 2 + tempCtx.lineWidth / 2,
                                   size - tempCtx.lineWidth, size - tempCtx.lineWidth);
            }
        }

        tempCtx.restore();

        return new Promise(resolve => {
            tempCanvas.toBlob(blob => {
                resolve(blob);
            }, 'image/png');
        });
    }

    function addIconToGrid(blob, label, size) {
        const url = URL.createObjectURL(blob);
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('icon-item');
        iconContainer.innerHTML = `
            <img src="${url}" alt="${label}" width="64" height="64">
            <p>${label} (${size}x${size}px)</p>
            <a href="${url}" download="${label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png" class="btn btn-small">Baixar</a>
        `;
        generatedIconsDiv.appendChild(iconContainer);

        // Revogar URL do objeto quando a imagem for carregada para liberar memória
        const img = iconContainer.querySelector('img');
        img.onload = () => URL.revokeObjectURL(url);
    }

    function toggleLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
        generateIconsBtn.disabled = show;
        downloadAllBtn.disabled = show;
    }

    // Inicialização
    drawImage(); // Desenha o canvas vazio ao carregar a página
});

// Inclua a biblioteca JSZip e FileSaver.js no seu projeto.
// Você pode adicioná-las via CDN no seu editor.html ou baixá-las.
// Ex: <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js"></script>
// Ex: <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>