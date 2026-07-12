// Script para transferir usuarios desde users_temp usando Supabase Admin API
// Ejecutar este script en la consola del navegador en tu AdminPanel

async function transferUsersFromTemp() {
    console.log('🚀 Iniciando transferencia de usuarios desde users_temp...');
    
    // Obtener datos de users_temp
    const { data: tempUsers, error: fetchError } = await supabase
        .from('users_temp')
        .select('*')
        .not('email', 'is', null)
        .neq('email', '');
    
    if (fetchError) {
        console.error('❌ Error obteniendo usuarios temporales:', fetchError);
        return;
    }
    
    console.log(`📊 Encontrados ${tempUsers.length} usuarios para transferir`);
    
    const results = {
        success: 0,
        errors: 0,
        errorDetails: [],
        processed: []
    };
    
    // Procesar usuarios en lotes de 10 para evitar rate limiting
    const batchSize = 10;
    for (let i = 0; i < tempUsers.length; i += batchSize) {
        const batch = tempUsers.slice(i, i + batchSize);
        console.log(`📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(tempUsers.length/batchSize)}`);
        
        // Procesar lote en paralelo
        const batchPromises = batch.map(async (user) => {
            try {
                const { error } = await supabase.auth.signUp({
                    email: user.email,
                    password: user.password,
                    options: {
                        data: {
                            full_name: `${user.firstname} ${user.lastname}`,
                            cohort: user.cohort1,
                            username: user.username,
                            password: user.password,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            cohort1: user.cohort1
                        }
                    }
                });
                
                if (error) {
                    console.error(`❌ Error con ${user.email}:`, error.message);
                    results.errors++;
                    results.errorDetails.push({
                        email: user.email,
                        error: error.message
                    });
                    results.processed.push({
                        email: user.email,
                        status: 'error',
                        message: error.message
                    });
                } else {
                    console.log(`✅ ${user.email} - ${user.firstname} ${user.lastname}`);
                    results.success++;
                    results.processed.push({
                        email: user.email,
                        status: 'success',
                        message: 'Usuario creado exitosamente'
                    });
                }
            } catch (error) {
                console.error(`❌ Error inesperado con ${user.email}:`, error);
                results.errors++;
                results.errorDetails.push({
                    email: user.email,
                    error: error.message
                });
                results.processed.push({
                    email: user.email,
                    status: 'error',
                    message: error.message
                });
            }
        });
        
        // Esperar a que termine el lote
        await Promise.all(batchPromises);
        
        // Pausa entre lotes para evitar rate limiting
        if (i + batchSize < tempUsers.length) {
            console.log('⏳ Esperando 3 segundos antes del siguiente lote...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // Limpiar tabla temporal
    console.log('🧹 Limpiando tabla temporal...');
    const { error: cleanupError } = await supabase
        .from('users_temp')
        .delete()
        .neq('email', '');
    
    if (cleanupError) {
        console.error('❌ Error limpiando tabla temporal:', cleanupError);
    } else {
        console.log('✅ Tabla temporal limpiada');
    }
    
    // Mostrar resultados finales
    console.log('\n📈 RESULTADOS FINALES:');
    console.log(`✅ Usuarios creados: ${results.success}`);
    console.log(`❌ Errores: ${results.errors}`);
    console.log(`📊 Total procesados: ${results.processed.length}`);
    
    if (results.errorDetails.length > 0) {
        console.log('\n❌ ERRORES DETALLADOS:');
        results.errorDetails.forEach((error, index) => {
            console.log(`${index + 1}. ${error.email}: ${error.error}`);
        });
    }
    
    return results;
}

// Función para transferir usuarios con pausas más largas
async function transferUsersWithLongerPauses() {
    console.log('🐌 Iniciando transferencia con pausas largas...');
    
    const { data: tempUsers, error: fetchError } = await supabase
        .from('users_temp')
        .select('*')
        .not('email', 'is', null)
        .neq('email', '');
    
    if (fetchError) {
        console.error('❌ Error obteniendo usuarios temporales:', fetchError);
        return;
    }
    
    console.log(`📊 Encontrados ${tempUsers.length} usuarios para transferir`);
    
    const results = {
        success: 0,
        errors: 0,
        errorDetails: [],
        processed: [],
        failedUsers: []
    };
    
    for (const user of tempUsers) {
        try {
            const { error } = await supabase.auth.signUp({
                email: user.email,
                password: user.password,
                options: {
                    data: {
                        full_name: `${user.firstname} ${user.lastname}`,
                        cohort: user.cohort1,
                        username: user.username,
                        password: user.password,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        cohort1: user.cohort1
                    }
                }
            });
            
            if (error) {
                console.error(`❌ Error con ${user.email}:`, error.message);
                results.errors++;
                results.errorDetails.push({
                    email: user.email,
                    error: error.message
                });
                results.processed.push({
                    email: user.email,
                    status: 'error',
                    message: error.message
                });
                results.failedUsers.push(user);
            } else {
                console.log(`✅ ${user.email} - ${user.firstname} ${user.lastname}`);
                results.success++;
                results.processed.push({
                    email: user.email,
                    status: 'success',
                    message: 'Usuario creado exitosamente'
                });
            }
            
            // Pausa de 2 segundos entre usuarios
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Error inesperado con ${user.email}:`, error);
            results.errors++;
            results.errorDetails.push({
                email: user.email,
                error: error.message
            });
            results.processed.push({
                email: user.email,
                status: 'error',
                message: error.message
            });
            results.failedUsers.push(user);
        }
    }
    
    // Limpiar tabla temporal
    console.log('🧹 Limpiando tabla temporal...');
    const { error: cleanupError } = await supabase
        .from('users_temp')
        .delete()
        .neq('email', '');
    
    if (cleanupError) {
        console.error('❌ Error limpiando tabla temporal:', cleanupError);
    } else {
        console.log('✅ Tabla temporal limpiada');
    }
    
    // Mostrar resultados finales
    console.log('\n📈 RESULTADOS FINALES:');
    console.log(`✅ Usuarios creados: ${results.success}`);
    console.log(`❌ Errores: ${results.errors}`);
    console.log(`📊 Total procesados: ${results.processed.length}`);
    
    return results;
}

// Instrucciones de uso
console.log(`
🎯 INSTRUCCIONES DE USO:

1. Para transferencia rápida (lotes de 10):
   transferUsersFromTemp()

2. Para transferencia lenta (pausas de 2 segundos):
   transferUsersWithLongerPauses()

3. Para ver cuántos usuarios tienes en temp:
   supabase.from('users_temp').select('count').then(console.log)

4. Para ver algunos ejemplos:
   supabase.from('users_temp').select('*').limit(5).then(console.log)

🚀 ¡Ejecuta una de las funciones para comenzar!
`);
