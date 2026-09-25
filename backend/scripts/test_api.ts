import { translateToEnglish } from '../src/utils/translator';

async function testApi() {
    try {
        console.log('Testing API...');
        const res = await translateToEnglish('Prueba de API');
        console.log('Result:', res);
    } catch (e) {
        console.error('API Error:', e);
    }
}
testApi();
