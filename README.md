# Costo Repostero 🧁

**Costo Repostero** es una aplicación web diseñada específicamente para emprendedores gastronómicos y pasteleros. Su objetivo principal es ayudar a calcular de manera precisa y sencilla los costos de producción y márgenes de ganancia de cada receta, asegurando la rentabilidad del negocio.

## ✨ Características Principales

### 1. 📦 Gestión de Inventario (Ingredientes)
- Registro de ingredientes con su cantidad de compra, unidad de medida (kg, g, l, ml, unidades) y precio total pagado.
- Sistema de "bloqueo" de inventario para asegurar que los costos base no se modifiquen accidentalmente mientras se arman las recetas.

### 2. 📖 Armador de Recetas
- Creación de recetas dinámicas seleccionando ingredientes del inventario previamente cargado.
- Cálculo automático del costo proporcional según la cantidad utilizada de cada ingrediente.
- Ingreso del **Rendimiento** (cantidad de porciones o unidades que rinde la receta).

### 3. 💰 Cálculo de Costos Adicionales y Rentabilidad
- Inclusión de gastos extra por receta: **Packaging / Cajas**, **Bolsas / Stickers** y **Envío / Logística**.
- Aplicación de un **Margen de Ganancia (%)** personalizado o mediante botones de selección rápida (10%, 20%, 30%, 40%).
- Resumen completo que detalla: Subtotal de ingredientes, costos adicionales, costo neto, Precio Total de Venta sugerido y el **Costo por Unidad/Porción**.

### 4. 💾 Almacenamiento Local
- Los datos del inventario y de las recetas guardadas se mantienen en el almacenamiento local del navegador (`localStorage`), por lo que no pierdes tu información al recargar la página.
- Al guardar una receta, la aplicación descuenta automáticamente el stock utilizado del inventario general.

## 🛠️ Tecnologías Utilizadas

- **[Next.js](https://nextjs.org/)**: Framework de React para la interfaz y enrutamiento.
- **[React](https://reactjs.org/)**: Construcción de interfaces de usuario interactivas (Hooks: `useState`, `useEffect`, `useCallback`).
- **[Tailwind CSS](https://tailwindcss.com/)**: Estilos rápidos, modernos y responsivos, con soporte para modo claro/oscuro.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático para asegurar código más robusto y sin errores tipográficos.
- **Google Fonts & Material Symbols**: Tipografía principal `Manrope` e iconografía limpia de Google.

## 🚀 Cómo correr el proyecto localmente

1. **Clonar el repositorio** (si aplica) o descargar el código fuente.
2. **Abrir la terminal** en la carpeta raíz del proyecto (`costorespostero`).
3. **Instalar las dependencias** usando Node.js y npm:
   ```bash
   npm install
   ```
4. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
5. **Abrir en el navegador**: Dirígete a [http://localhost:3000](http://localhost:3000) para ver la aplicación en funcionamiento.

## 📱 Diseño Responsivo
El proyecto está pensado para usarse cómodamente desde cualquier dispositivo. Cuenta con una navegación adaptable y un menú hamburguesa animado para la visualización en teléfonos móviles, garantizando que el usuario pueda cargar el costo de sus recetas desde el celular mientras cocina.

---
*Hecho para emprendedores pasteleros.*
