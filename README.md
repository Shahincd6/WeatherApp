# WeatherApp - AI Engineer Technical Assessment

A comprehensive weather application built for the PM Accelerator Technical Assessment, featuring real-time weather data, CRUD operations, and advanced API integrations.

##  Features

### Core Functionality (Tech Assessment 1)
- Real-time Weather Data: Get current weather conditions for any location
- Multiple Location Formats: Support for cities, coordinates, zip codes, and landmarks
- 5-Day Forecast: Extended weather predictions with detailed information
- Current Location Detection: GPS-based location detection for instant weather
- Beautiful UI: Modern, responsive design with weather icons and gradients

### Advanced Features (Tech Assessment 2)
- CRUD Operations: Full database management with Create, Read, Update, Delete functionality
- Data Persistence: SQLite database for storing weather search history
- Date Range Filtering: Search weather data within specific date ranges
- Data Export: Export weather data in JSON, CSV, and XML formats
- YouTube Integration: Discover travel videos related to searched locations
- Google Maps Integration: Open locations directly in Google Maps
- Input Validation: Comprehensive validation for locations, dates, and weather data

##  Quick Start
### Installation

1. Clone the repository
   git clone https://github.com/yourusername/weather-app.git
   cd weather-app

2. Install dependencies
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install

3. Environment Setup
   Create a `.env` file in the backend directory:
   WEATHER_API_KEY=your_openweathermap_api_key_here
   YOUTUBE_API_KEY=your_youtube_api_key_here
   PORT=3001
   NODE_ENV=development

4. Get API Keys
   - **OpenWeatherMap**: Sign up at [openweathermap.org](https://openweathermap.org/api) (Required)
   - **YouTube Data API**: Get key from [Google Cloud Console](https://console.cloud.google.com/) (Optional)

### Running the Application

1. Start the Backend Server
   cd backend
   npm start
   The server will run on `http://localhost:3001`

2. Start the Frontend Application
   cd frontend
   npm start

   The app will open at `http://localhost:3000`

##  Technology Stack

### Frontend
- React - Component-based UI framework
- Tailwind CSS - Utility-first CSS framework
- Lucide React - Beautiful icons
- Axios - HTTP client for API calls

### Backend
- Node.js - Server runtime
- Express.js - Web framework
- SQLite3 - Lightweight database
- CORS - Cross-origin resource sharing
- dotenv - Environment variable management

### APIs
- OpenWeatherMap API - Weather data and forecasts
- YouTube Data API - Location-based video content
- Google Maps - Map integration

##  Key Features Demonstration

### 1. Location Input Flexibility
- City Names: "New York", "London", "Tokyo"
- Coordinates: "40.7128,-74.0060"
- Zip Codes: "10001", "SW1A 1AA"
- Landmarks: "Statue of Liberty", "Eiffel Tower"

### 2. CRUD Operations
- Create: Search weather data and automatically save to database
- Read: View all previous weather searches in history tab
- Update: Edit any weather record with validation
- Delete: Remove records from the database

### 3. Data Export
- JSON: Structured data export
- CSV: Spreadsheet-compatible format
- XML: Markup format for data interchange

### 4. Advanced Integrations
- YouTube: Discover travel videos for searched locations
- Google Maps: Open locations directly in maps
- Real-time GPS: Get weather for current location


##  Demo Video
https://drive.google.com/drive/folders/1_wvQ1U4Ny65a_TuifsXPaliHnBjOZw8_?usp=sharing

Vercel link: https://weather-app-rho-seven-47.vercel.app
Render link: https://weatherapp-yzok.onrender.com
