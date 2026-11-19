# SimplyGest

**SimplyGest** es un sistema de gestión de recursos empresariales (ERP) completo y moderno, diseñado para ser flexible y adaptarse a diversas necesidades de negocio. Construido con Next.js, React y Tailwind CSS, ofrece una experiencia de usuario rápida, intuitiva y totalmente integrada.

**Progreso General del Desarrollo: 100%**

La aplicación está completa. Todas las funcionalidades principales han sido implementadas y probadas.

---

### Módulos y Funcionalidades

A continuación, se detalla el conjunto de características implementadas en la aplicación:

#### **1. Dashboard (100%)**
El centro de mando para una visión instantánea del negocio.
- **Métricas Clave:** Tarjetas con indicadores vitales: Ingresos, Costos, Ganancia, Margen, Clientes Activos, Ventas y más.
- **Filtro por Período:** Filtra todas las métricas y gráficos por "Hoy", "Semana", "Mes" y "Año".
- **Visión General Gráfica:** Gráfico de barras interactivo que muestra la evolución de los ingresos.
- **Asistente de IA (100%):** Responde preguntas en lenguaje natural sobre los datos de ventas, clientes y productos del negocio.

---

#### **2. Punto de Venta (TPV) (100%)**
El módulo de **Punto de Venta (TPV)** es el corazón de la interacción diaria en la tienda. Está diseñado para ser rápido, intuitivo y potente, permitiendo a los vendedores procesar transacciones de manera eficiente mientras gestionan diversas operaciones especiales sin salir de la misma pantalla.

**Características Principales:**

*   **Interfaz Visual de Venta Rápida:** Los productos se muestran en una cuadrícula (o lista) visual que permite añadirlos al carrito con un solo clic, agilizando drásticamente el proceso de venta.
*   **Gestión de Clientes Integrada:**
    *   **Selección Rápida:** Busca y selecciona clientes existentes al instante.
    *   **Cliente General:** Permite ventas rápidas sin necesidad de registrar a un cliente.
    *   **Creación al Vuelo:** Incluye un acceso directo para crear nuevos clientes desde el TPV.
*   **Carrito de Compras Interactivo:**
    *   **Edición Directa:** Modifica cantidades y precios directamente en el carrito.
    *   **Calculadora Avanzada:** Cada línea de producto tiene acceso a una calculadora avanzada que no solo realiza operaciones matemáticas, sino que también incluye un convertidor de unidades (metros, pies, etc.) y un calculador de fechas.
    *   **Líneas Genéricas:** Permite añadir productos o servicios no catalogados (ej: "Ajuste de pieza") a la venta, especificando descripción, cantidad y precio.
*   **Opciones de Finalización Flexibles:**
    *   **Guardar Venta:** Finaliza la transacción, con opciones para cobrar en terminal, enviar a caja, o registrar como venta a crédito (afectando el saldo del cliente).
    *   **Guardar como Pedido/Presupuesto:** Convierte el carrito en un pedido para logística o en un presupuesto para el cliente.
*   **Gestión de Operaciones Especiales:**
    *   **Apartados y Encargos:** Desde la ficha de cada producto, se puede iniciar un "apartado" (si hay stock) o un "encargo" (si no hay), registrando un anticipo del cliente en el acto.
    *   **Ventas Aparcadas:** Guarda una venta en curso para retomarla más tarde. El sistema soporta un modo "Individual" (solo el vendedor ve sus ventas) o "Compartido" (todos los vendedores ven todas las ventas aparcadas).


---

#### **3. Módulo de Clientes (100%)**
Gestión completa de la cartera de clientes, con creación, edición y visualización detallada de su información, historial de compras, saldos y condiciones comerciales.

---

#### **4. Módulo de Ventas (100%)**
Organiza el ciclo de vida completo de la venta.
- **Pedidos (100%):** Crea y gestiona pedidos. Conviértelos en facturas o envíos.
- **Presupuestos (100%):** Genera cotizaciones y conviértelas en pedidos o facturas con un clic.
- **Entregas (Rutas) (100%):** Agrupa pedidos en rutas, asigna conductores e imprime manifiestos de entrega.
- **Apartados y Encargos (100%):** Módulo dedicado para gestionar las reservaciones y pedidos especiales de clientes, con seguimiento de su estado.
- **Caja (100%):** Controla los movimientos de efectivo (ingresos, egresos, ventas) por sucursal y terminal, con flujos de trabajo flexibles o estrictos (apertura/cierre).

---

#### **5. Módulo de Compras (100%)**
Control total sobre el proceso de abastecimiento, desde la gestión de proveedores hasta la creación y seguimiento de órdenes de compra.

---

#### **6. Módulo de Inventario (100%)**
El núcleo para la gestión de productos.
- **Ficha de Producto Detallada:** Información completa, stock por almacén, precios, costos y trazabilidad.
- **Traslados entre Almacenes (100%):** Funcionalidad para mover stock de un almacén a otro de forma transparente.

---

#### **7. Módulo de Configuración (100%)**
Personaliza la aplicación para que se adapte a tu negocio.
- **Datos de la Empresa:** Define la información general, logo, sucursales y almacenes.
- **Parámetros Financieros y Logísticos:** Configura tarifas, métodos de pago, impuestos, series de documentos, familias de productos y conductores.
- **Flujos de Trabajo:** Personaliza la lógica de negocio para la caja y el TPV.
- **Mantenimiento (100%):** Herramientas para verificar la integridad de los datos, recalcular saldos, auditar stock e importar/exportar información masivamente. Incluye un asistente de IA para formatear datos JSON.
- **Gestión de Usuarios (100%):** Creación, visualización, edición y eliminación de usuarios y roles, con un gestor de permisos detallado para cada rol.

---

#### **8. Sistema de Notificaciones (100%)**
Un centro de notificaciones integrado para mejorar la comunicación y coordinación entre equipos.
- **Notificaciones por Rol:** Alertas automáticas dirigidas a Vendedores, Bodegueros, Compradores, etc., según los eventos del sistema (nuevos encargos, falta de stock, recepción de mercancía).
- **Panel de Notificaciones:** Interfaz en la cabecera de la aplicación para visualizar y gestionar las notificaciones no leídas.
