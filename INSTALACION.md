# 🚀 Instalación de EPICGROUP LAB App

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

### 1. Node.js (versión 18 o superior)
- Descarga desde: https://nodejs.org/
- O instala usando Chocolatey: `choco install nodejs`
- Verifica la instalación: `node --version` y `npm --version`

### 2. Git (opcional pero recomendado)
- Descarga desde: https://git-scm.com/
- O instala usando Chocolatey: `choco install git`

## 🔧 Instalación del Proyecto

### Paso 1: Instalar Node.js
```bash
# Verifica si Node.js está instalado
node --version
npm --version

# Si no está instalado, descárgalo desde nodejs.org
# o usa Chocolatey en Windows:
choco install nodejs
```

### Paso 2: Instalar dependencias
```bash
# Navega al directorio del proyecto
cd epicgroup-lab-app

# Instala las dependencias
npm install
```

### Paso 3: Configurar variables de entorno
```bash
# Copia el archivo de ejemplo
copy env.example .env

# Edita el archivo .env con tus credenciales de Supabase
notepad .env
```

Contenido del archivo `.env`:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### Paso 4: Ejecutar el proyecto
```bash
# Inicia el servidor de desarrollo
npm run dev

# Abre tu navegador en: http://localhost:3000
```

## 🗄️ Configuración de Supabase

### 1. Crear cuenta en Supabase
- Ve a https://supabase.com
- Crea una cuenta gratuita

### 2. Crear nuevo proyecto
- Haz clic en "New Project"
- Elige tu organización
- Dale un nombre al proyecto
- Elige una contraseña para la base de datos
- Selecciona tu región

### 3. Obtener credenciales
- Ve a Settings > API
- Copia la "Project URL"
- Copia la "anon public" key

### 4. Configurar autenticación
- Ve a Authentication > Settings
- Habilita "Enable email confirmations" si lo deseas
- Configura las URLs de redirección si es necesario

## 🚨 Solución de Problemas

### Error: "npm no se reconoce"
- **Solución**: Instala Node.js desde https://nodejs.org/
- **Alternativa**: Reinicia PowerShell después de instalar Node.js

### Error: "Cannot find module"
- **Solución**: Ejecuta `npm install` en el directorio del proyecto

### Error: "Supabase credentials missing"
- **Solución**: Verifica que el archivo `.env` existe y tiene las credenciales correctas

### Puerto 3000 ocupado
- **Solución**: Cambia el puerto en `vite.config.js` o cierra otras aplicaciones

## 📱 Próximos Pasos

Una vez que el proyecto esté funcionando:

1. **Personaliza el diseño**: Edita los colores en `src/index.css`
2. **Modifica el logo**: Edita `src/components/Logo.tsx`
3. **Añade funcionalidades**: Crea nuevos componentes
4. **Prepara para producción**: Ejecuta `npm run build`

## 🆘 Soporte

Si tienes problemas:
1. Verifica que Node.js esté instalado correctamente
2. Asegúrate de estar en el directorio correcto
3. Revisa que todas las dependencias estén instaladas
4. Verifica la configuración de Supabase

---

**¡Listo para innovar! 🚀**
