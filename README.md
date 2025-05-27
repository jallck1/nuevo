# Plataforma de Créditos

Plataforma web para la gestión de créditos entre compradores y administradores, desarrollada con HTML, Tailwind CSS, JavaScript y Supabase.

## Características Principales

- **Autenticación de usuarios** (Inicio de sesión y registro)
- **Panel de administrador** con estadísticas y gestión de usuarios
- **Panel de comprador** con seguimiento de créditos y pagos
- **Diseño responsive** que funciona en móviles y escritorios
- **Integración con Supabase** para base de datos y autenticación

## Estructura del Proyecto

```
horizont/
├── index.html          # Página principal (login/registro)
├── admin/              # Panel de administración
│   └── dashboard.html   # Dashboard del administrador
├── buyer/               # Panel del comprador
│   └── dashboard.html   # Dashboard del comprador
├── css/                 # Estilos personalizados (si los hay)
└── js/                  # Scripts JavaScript
    └── config.js        # Configuración de Supabase
```

## Configuración

1. Clona este repositorio
2. Abre `index.html` en tu navegador
3. Para desarrollo, puedes usar Live Server de VS Code o cualquier servidor web estático

## Tecnologías Utilizadas

- HTML5
- CSS3 (con Tailwind CSS)
- JavaScript (ES6+)
- [Supabase](https://supabase.com/) (Backend como Servicio)
- [Chart.js](https://www.chartjs.org/) (Gráficos)
- [Font Awesome](https://fontawesome.com/) (Iconos)

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
