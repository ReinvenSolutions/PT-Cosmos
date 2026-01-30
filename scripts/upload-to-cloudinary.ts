import "dotenv/config";
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DESTINATIONS_DIR = path.join(process.cwd(), 'public', 'images', 'destinations');

interface UploadResult {
    folder: string;
    file: string;
    url: string;
    publicId: string;
}

async function uploadImage(filePath: string, folder: string, filename: string): Promise<UploadResult | null> {
    try {
        // El public_id debe ser: destinations/[folder]/[filename-sin-extension]
        const publicId = `destinations/${folder}/${path.parse(filename).name}`;

        const result = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
        });

        console.log(`✅ Subido: ${publicId}`);

        return {
            folder,
            file: filename,
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error(`❌ Error subiendo ${filePath}:`, error);
        return null;
    }
}

async function uploadAllImages() {
    console.log('🚀 Iniciando subida de imágenes a Cloudinary...\n');
    console.log(`📁 Directorio: ${DESTINATIONS_DIR}\n`);

    if (!fs.existsSync(DESTINATIONS_DIR)) {
        console.error('❌ El directorio de destinos no existe:', DESTINATIONS_DIR);
        process.exit(1);
    }

    const folders = fs.readdirSync(DESTINATIONS_DIR).filter(item => {
        const itemPath = path.join(DESTINATIONS_DIR, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
    });

    console.log(`📂 Carpetas encontradas: ${folders.length}\n`);

    const results: UploadResult[] = [];
    let totalImages = 0;
    let successCount = 0;

    for (const folder of folders) {
        const folderPath = path.join(DESTINATIONS_DIR, folder);
        const files = fs.readdirSync(folderPath).filter(file => {
            return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
        });

        console.log(`\n📁 Procesando carpeta: ${folder} (${files.length} imágenes)`);
        totalImages += files.length;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const result = await uploadImage(filePath, folder, file);

            if (result) {
                results.push(result);
                successCount++;
            }

            // Pequeña pausa para no saturar la API
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUBIDA COMPLETADA');
    console.log('='.repeat(70));
    console.log(`Total de imágenes procesadas: ${totalImages}`);
    console.log(`Subidas exitosas: ${successCount}`);
    console.log(`Errores: ${totalImages - successCount}`);
    console.log('='.repeat(70));

    // Guardar mapeo de URLs
    const mappingPath = path.join(process.cwd(), 'cloudinary-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Mapeo guardado en: ${mappingPath}`);

    // Mostrar ejemplo de URL
    if (results.length > 0) {
        console.log('\n📋 Ejemplo de URL generada:');
        console.log(results[0].url);
        console.log('\n💡 Las URLs seguirán el formato:');
        console.log('https://res.cloudinary.com/dcutgnihl/image/upload/destinations/[carpeta]/[archivo]');
    }
}

uploadAllImages().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
