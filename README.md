# Digital Plan Management System

## Overview

The Digital Plan Management System is a comprehensive web application designed for the digitization, interactive editing, and management of architectural or land plans. The system enables users to upload plan images or PDFs, automatically extract vector data, define and edit lots (subplots), and manage their statuses and properties. It is tailored for real estate, urban planning, and engineering teams requiring precise, digital handling of plan documents.

## Features

- **Plan Upload and Processing:** Upload images or PDFs of plans. The system processes and extracts vector data for further editing.
- **Interactive Vector Editing:** Draw, edit, and manage plan boundaries and lots directly on a digital canvas.
- **3D Visualization:** View digitized plans with interactive 3D effects for enhanced clarity and usability.
- **Lot Management:** Assign properties such as name, description, area, price, and status (available, reserved, sold) to each lot.
- **Statistics and Reporting:** View statistics on lots per plan, including total area and value.
- **Export Options:** Export digitized plans in various formats (PNG, PDF, SVG).
- **User-Friendly Interface:** Modern, responsive UI built with React and Tailwind CSS.

## Technologies Used

- **Frontend:** React, Tailwind CSS, Lucide Icons
- **Backend:** Node.js (Express) or compatible REST API (see API section)
- **State Management:** React Context API, custom hooks
- **Other:** HTML5 Canvas for vector drawing, SVG for plan rendering

## Screenshots

The system includes several key interfaces documented through screenshots in the `images` directory:

### Main Application Views

- **`PlanosListPage.png`**: Main dashboard showing all digitized plans in both grid and list view formats (component: `PlanosListPage`)
  - Features plan thumbnails, creation dates, lot statistics
  - Toggle between grid and list views
  - Quick access buttons for viewing and editing plans
  
- **`PlanosPage-delimitados.png`**: Interactive vector drawing interface showing the digitization process (component: `PlanosPage`)
  - Displays the uploaded plan image with vector boundaries drawn over it
  - Shows the drawing tools panel for creating borders and sublots
  - Demonstrates the vector editing capabilities with precise vertex manipulation

- **`PlanoDigitalPageNew1.png`**: 3D visualization of digitized plans with interactive lot management (component: `PlanoDigitalPageNew`)
  - Shows elevated lot rendering with 3D effects and pastel colors
  - Interactive hover effects revealing lot information
  - Side panel for editing lot properties (price, status, area, description)
  - Demonstrates the final digitized product without background images

- **`PlanoFinalizadoPage.png`**: Comprehensive plan overview with detailed statistics and management (component: `PlanoFinalizadoPage`)
  - Statistical dashboard with lot counts by status
  - Detailed lot information table with editing capabilities
  - Export and management options
  - Complete lot lifecycle management interface

### Key Interface Features Demonstrated

The screenshots showcase the complete workflow:

1. **Plan Upload & Processing**: 
   - Drag-and-drop interface for image/PDF upload
   - Progress indicators during processing
   - Automatic vector extraction preview

2. **Interactive Vector Editing**:
   - Real-time drawing tools (line, polygon, vertex editing)
   - Precise vertex manipulation with snap-to functionality
   - Grid overlay for accurate positioning
   - Multiple tool modes (select, draw, delete, connect)

3. **3D Plan Visualization**:
   - Elevated lot rendering with smooth shadows
   - Color-coded lot status (available: green, reserved: yellow, sold: red)
   - Interactive hover effects with information tooltips
   - Zoom and pan controls for detailed viewing

4. **Lot Management Dashboard**:
   - Comprehensive statistics (total lots, area, value)
   - Individual lot property editing
   - Status management workflow
   - Export capabilities for various formats

### Technical Implementation Screenshots

The images demonstrate several advanced features:

- **Responsive Design**: Mobile-friendly layouts across all components
- **Modern UI Components**: Tailwind CSS styling with gradient backgrounds
- **Interactive Elements**: Hover states, transitions, and smooth animations
- **Data Visualization**: Color-coded status indicators and statistical displays
- **Canvas Integration**: HTML5 Canvas for vector manipulation and rendering

### User Workflow Documentation

Each screenshot represents a stage in the complete digitization workflow:

1. **Upload** (`PlanosPage.png` - initial state)
2. **Process & Edit** (`PlanosPage-delimitados.png` - vector editing)
3. **Visualize** (`PlanoDigitalPageNew1.png` - 3D view)
4. **Manage** (`PlanoFinalizadoPage.png` - final management)

The screenshots serve as both documentation and user guide, showing the system's capabilities from initial upload through final lot management and sales tracking.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- A compatible backend API (see API section)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/junda05/Digitalizacion_Planos.git
   cd Digitalizacion_Planos/FrontEnd
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables:**
   - Create a `.env` file in the `FrontEnd` directory.
   - Set the API base URL:
     ```
     REACT_APP_API_URL=http://localhost:8001
     ```
   - Adjust the URL as needed for your backend deployment.

4. **Start the development server:**
   ```bash
   npm start
   # or
   yarn start
   ```
   - The app will be available at `http://localhost:3000`.

### Running in Production

1. **Build the frontend:**
   ```bash
   npm run build
   # or
   yarn build
   ```
2. **Serve the build directory using your preferred web server.**

### Backend Setup

- Ensure your backend API is running and accessible at the URL specified in `REACT_APP_API_URL`.
- The backend should implement the endpoints described below.

## API Documentation

The frontend communicates with a Django REST API. Below are the main endpoints:

### Plans (Planos)

- **GET `/api/v1/planos/listar/`**
  - List all digitized plans.
  - Response: Array of plan objects with metadata and statistics.
- **GET `/api/v1/planos/:id/`**
  - Retrieve a specific plan by ID including vector data.
  - Response: Plan object with `bordes_externos` and `sublotes` arrays.
- **POST `/api/v1/planos/procesar/`**
  - Upload and process a new plan image/PDF to extract vector data.
  - Body: `multipart/form-data` with `imagen` field.
  - Response: Processed plan with extracted vectors: `{ bordes_externos: [], sublotes: [], mensaje: "..." }`
- **POST `/api/v1/planos/guardar/`**
  - Save a processed plan with metadata and vector data.
  - Body: `{ nombre, descripcion, bordes_externos, sublotes, imagen_url }`
  - Response: Saved plan object with ID.

### Lots (Lotes)

- **GET `/api/v1/lotes/`**
  - List all lots across all plans.
  - Response: Array of lot objects.
- **POST `/api/v1/lotes/`**
  - Create a new lot.
  - Body: `{ numero, area, precio, estado, descripcion, plano, vertices }`
  - Response: Created lot object with ID.
- **GET `/api/v1/lotes/:id/`**
  - Retrieve a specific lot by ID.
  - Response: Lot object with all properties.
- **PUT `/api/v1/lotes/:id/`**
  - Update lot properties.
  - Body: `{ numero, area, precio, estado, descripcion }`
  - Response: Updated lot object.
- **DELETE `/api/v1/lotes/:id/`**
  - Delete a lot.
  - Response: 204 No Content.

### API Base URL Structure

All API endpoints are prefixed with `/api/v1/` as defined in the Django URL configuration:

```python
# Main URLs
path('api/v1/planos/', include('Planos.urls'))
path('api/v1/lotes/', include('Lotes.urls'))
```

### Example Plan Object

```json
{
  "id": 1,
  "nombre": "Plan Residencial Norte",
  "descripcion": "Subdivision plan for residential area",
  "imagen_url": "/media/planos/plan_001.jpg",
  "creado": "2024-01-15T10:30:00Z",
  "bordes_externos": [
    [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
  ],
  "sublotes": [
    [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
    [[x5, y5], [x6, y6], [x7, y7], [x8, y8]]
  ]
}
```

### Example Lot Object

```json
{
  "id": 1,
  "numero": "L001",
  "area": 120.5,
  "precio": 250000,
  "estado": "disponible",
  "descripcion": "Corner lot with garden space",
  "plano": 2,
  "vertices": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
  "area_calculada": 118.7
}
```

### Status Values

Lot status (`estado`) can be one of:
- `"disponible"` - Available for sale
- `"reservado"` - Reserved by client  
- `"vendido"` - Sold

### Authentication

- If your backend requires authentication, configure the frontend to send the appropriate headers (e.g., JWT tokens).

## Configuration

- **API URL:** Set `REACT_APP_API_URL` in your `.env` file to point to your backend (e.g., `http://localhost:8001`).
- **Port:** By default, the frontend runs on port 3000. Change with the `PORT` environment variable if needed.
- **CORS:** Ensure your Django backend allows CORS requests from the frontend origin.
- **Media Files:** Configure your Django backend to serve uploaded plan images from the `/media/` directory.

### Backend Configuration

The Django backend runs on port 8001 by default. Ensure your Django settings include:

```python
# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React frontend
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

## Usage

1. **Upload a Plan:** Go to `/plano`, upload an image or PDF, and wait for processing.
2. **Edit Vectors:** Draw or adjust plan boundaries and lots as needed.
3. **Manage Lots:** Click on lots to edit their properties, assign status, area, and price.
4. **View Statistics:** Access the list of plans and see statistics for each.
5. **Export:** Use the export feature to download the digitized plan.

## Troubleshooting

- **API Connection Issues:** Verify the backend URL in `.env` and ensure the backend server is running.
- **File Upload Errors:** Check that uploaded files are within size limits and supported formats (PNG, JPG, PDF).
- **Vector Processing Issues:** Ensure the backend image processing services are properly configured.
- **CORS Errors:** Configure your backend to allow requests from the frontend domain.

## Customization

- **Styling:** Tailwind CSS is used for styling. Adjust `tailwind.config.js` as needed.
- **Localization:** The UI is in Spanish by default. Update text in React components for other languages.

## Contact

For support or inquiries, please contact the project maintainer.

