#!/usr/bin/env node

/**
 * Script para verificar que las URLs de Cloudinary son accesibles
 */

const testUrls = [
    'https://res.cloudinary.com/dcutgnihl/image/upload/destinations/amazonas/1.jpg',
    'https://res.cloudinary.com/dcutgnihl/image/upload/destinations/capurgana/1.jpg',
    'https://res.cloudinary.com/dcutgnihl/image/upload/destinations/puebliando-santander/1.jpg',
    'https://res.cloudinary.com/dcutgnihl/image/upload/destinations/turquia-esencial/1.jpg',
];

console.log('🔍 Verificando URLs de Cloudinary (sin versión)...\n');

async function testUrl(url: string) {
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log(`✅ ${url}`);
            return true;
        } else {
            console.log(`❌ ${url} - Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${url} - Error: ${error}`);
        return false;
    }
}

async function main() {
    const results = await Promise.all(testUrls.map(testUrl));
    const allPassed = results.every(r => r);

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('✅ Todas las URLs de Cloudinary son accesibles!');
        console.log('🎉 Cloudinary sirve las imágenes sin necesidad de versión!');
    } else {
        console.log('⚠️  Las URLs sin versión no funcionan.');
        console.log('Necesitaremos incluir el timestamp en las URLs.');
    }
    console.log('='.repeat(50));
}

main();
