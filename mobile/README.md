# 📱 EPICGROUP LAB - Versión Móvil

Esta es la versión móvil de la aplicación EPICGROUP LAB, construida con React Native.

## 🚀 Características

- **Cross-platform**: Funciona en iOS y Android
- **Diseño Nativo**: Componentes nativos para mejor rendimiento
- **Autenticación**: Mismo sistema de autenticación que la versión web
- **Offline**: Funcionalidad offline con sincronización automática

## 🛠️ Stack Tecnológico

- **Framework**: React Native
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase
- **Navegación**: React Navigation
- **Estado**: Redux Toolkit (opcional)

## 📱 Instalación

### Prerrequisitos
- Node.js 18+
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS, solo macOS)

### Instalación de React Native CLI
```bash
npm install -g @react-native-community/cli
```

### Configuración del Proyecto
```bash
# Desde la raíz del proyecto
cd mobile

# Inicializar proyecto React Native
npx react-native init EpicGroupLabMobile --template react-native-template-typescript

# O usar Expo (más fácil para principiantes)
npx create-expo-app EpicGroupLabMobile --template typescript
```

## 🔧 Configuración

### 1. Instalar dependencias
```bash
cd EpicGroupLabMobile
npm install
```

### 2. Configurar Supabase
```bash
npm install @supabase/supabase-js
```

### 3. Configurar navegación
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

## 🚀 Ejecución

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## 📱 Componentes Móviles

### Screens
- **SplashScreen**: Pantalla de carga
- **LoginScreen**: Autenticación
- **ProfileScreen**: Perfil del usuario
- **HomeScreen**: Pantalla principal (futuro)

### Navegación
- Stack Navigator para transiciones entre pantallas
- Tab Navigator para navegación principal (futuro)

## 🎨 Diseño Móvil

### Principios
- **Touch-friendly**: Botones y elementos táctiles de tamaño adecuado
- **Gestos**: Navegación por gestos intuitiva
- **Responsive**: Adaptación a diferentes tamaños de pantalla
- **Performance**: Optimización para dispositivos móviles

### Componentes Nativos
- **TouchableOpacity**: Para botones táctiles
- **ScrollView**: Para contenido desplazable
- **SafeAreaView**: Para áreas seguras de la pantalla
- **StatusBar**: Para la barra de estado

## 🔄 Sincronización con Web

### Código Compartido
- Lógica de autenticación
- Tipos de TypeScript
- Configuración de Supabase
- Constantes y utilidades

### Diferencias
- **UI**: Componentes nativos vs HTML/CSS
- **Navegación**: React Navigation vs React Router
- **Estado**: Context API vs Redux (opcional)
- **Storage**: AsyncStorage vs localStorage

## 🚨 Solución de Problemas

### Error: "Metro bundler not found"
```bash
npx react-native start --reset-cache
```

### Error: "Android build failed"
- Verifica que Android Studio esté configurado
- Asegúrate de que las variables de entorno estén configuradas

### Error: "iOS build failed"
- Verifica que Xcode esté instalado (solo macOS)
- Ejecuta `cd ios && pod install`

## 📱 Próximos Pasos

1. **Configurar navegación**: Implementar React Navigation
2. **Adaptar componentes**: Convertir componentes web a nativos
3. **Testing**: Implementar pruebas unitarias y de integración
4. **CI/CD**: Configurar pipeline de build automático
5. **Store**: Publicar en App Store y Google Play

## 🆘 Soporte

Para problemas específicos de React Native:
- [Documentación oficial](https://reactnative.dev/)
- [React Native Community](https://github.com/react-native-community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

---

**¡Innovación móvil en camino! 🚀📱**
