  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  const axios = require('axios');
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  const db = new sqlite3.Database('./weather_data.db');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS weather_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      date_searched DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_range_start DATE,
      date_range_end DATE,
      temperature REAL,
      condition TEXT,
      humidity INTEGER,
      wind_speed REAL,
      visibility REAL,
      uv_index INTEGER,
      sunrise TEXT,
      sunset TEXT,
      coordinates_lat REAL,
      coordinates_lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });

  const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; 
  const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
  const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      message: 'WeatherPro AI Backend is running' 
    });
  });

  app.get('/api/weather/current/:location', async (req, res) => {
    try {
      const { location } = req.params;
      
      const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);
      let weatherUrl;
      
      if (isCoordinates) {
        const [lat, lon] = location.split(',');
        weatherUrl = `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
      } else {
        weatherUrl = `${WEATHER_BASE_URL}/weather?q=${location}&appid=${WEATHER_API_KEY}&units=metric`;
      }
      
      const weatherResponse = await axios.get(weatherUrl);
      const data = weatherResponse.data;
      
      let uvIndex = 0;
      try {
        const uvResponse = await axios.get(
          `${WEATHER_BASE_URL}/uvi?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${WEATHER_API_KEY}`
        );
        uvIndex = Math.round(uvResponse.data.value);
      } catch (uvError) {
        console.log('UV data not available');
      }
      
      const weatherData = {
        location: `${data.name}, ${data.sys.country}`,
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main.toLowerCase(),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), 
        visibility: Math.round((data.visibility || 10000) / 1000), 
        uvIndex: uvIndex,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        coordinates: {
          lat: data.coord.lat,
          lng: data.coord.lon
        }
      };
      
      res.json(weatherData);
    } catch (error) {
      console.error('Weather API error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        res.status(404).json({ error: 'Location not found. Please check the location name and try again.' });
      } else if (error.response?.status === 401) {
        res.status(401).json({ error: 'Invalid API key. Please check your OpenWeatherMap API configuration.' });
      } else {
        res.status(500).json({ error: 'Failed to fetch weather data. Please try again later.' });
      }
    }
  });

  app.get('/api/weather/forecast/:location', async (req, res) => {
    try {
      const { location } = req.params;
      
      const isCoordinates = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location);
      let forecastUrl;
      
      if (isCoordinates) {
        const [lat, lon] = location.split(',');
        forecastUrl = `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
      } else {
        forecastUrl = `${WEATHER_BASE_URL}/forecast?q=${location}&appid=${WEATHER_API_KEY}&units=metric`;
      }
      
      const forecastResponse = await axios.get(forecastUrl);
      const data = forecastResponse.data;
 
      const dailyForecasts = {};
      data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        if (!dailyForecasts[dateKey]) {
          dailyForecasts[dateKey] = {
            date: dateKey,
            temps: [],
            conditions: [],
            originalDate: date
          };
        }
        dailyForecasts[dateKey].temps.push(item.main.temp);
        dailyForecasts[dateKey].conditions.push(item.weather[0].main.toLowerCase());
      });
    
      const forecast = Object.values(dailyForecasts)
        .sort((a, b) => a.originalDate - b.originalDate)
        .slice(0, 5)
        .map(day => ({
          date: day.date,
          high: Math.round(Math.max(...day.temps)),
          low: Math.round(Math.min(...day.temps)),
          condition: day.conditions[Math.floor(day.conditions.length / 2)] 
        }));
      
      res.json(forecast);
    } catch (error) {
      console.error('Forecast API error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        res.status(404).json({ error: 'Location not found for forecast data.' });
      } else {
        res.status(500).json({ error: 'Failed to fetch forecast data.' });
      }
    }
  });

  app.post('/api/weather/history', (req, res) => {
    const {
      location,
      dateRangeStart,
      dateRangeEnd,
      temperature,
      condition,
      humidity,
      windSpeed,
      visibility,
      uvIndex,
      sunrise,
      sunset,
      coordinates
    } = req.body;
    
    if (!location || temperature === undefined) {
      return res.status(400).json({ error: 'Location and temperature are required' });
    }

    if (temperature < -100 || temperature > 60) {
      return res.status(400).json({ error: 'Temperature must be between -100°C and 60°C' });
    }
    
    if (dateRangeStart && dateRangeEnd) {
      const startDate = new Date(dateRangeStart);
      const endDate = new Date(dateRangeEnd);
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
    }
    
    const query = `
      INSERT INTO weather_searches (
        location, date_range_start, date_range_end, temperature, 
        condition, humidity, wind_speed, visibility, uv_index, 
        sunrise, sunset, coordinates_lat, coordinates_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
      location,
      dateRangeStart || null,
      dateRangeEnd || null,
      temperature,
      condition || 'unknown',
      humidity || 0,
      windSpeed || 0,
      visibility || 0,
      uvIndex || 0,
      sunrise || '',
      sunset || '',
      coordinates?.lat || null,
      coordinates?.lng || null
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to save weather data' });
      }
      
      res.json({ 
        id: this.lastID, 
        message: 'Weather data saved successfully' 
      });
    });
  });

  app.get('/api/weather/history', (req, res) => {
    const query = `
      SELECT * FROM weather_searches 
      ORDER BY date_searched DESC
      LIMIT 100
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch weather history' });
      }
      
      const formattedRows = rows.map(row => ({
        id: row.id,
        location: row.location,
        dateSearched: row.date_searched,
        dateRange: row.date_range_start && row.date_range_end ? {
          start: row.date_range_start,
          end: row.date_range_end
        } : null,
        weatherData: {
          temperature: row.temperature,
          condition: row.condition,
          humidity: row.humidity,
          windSpeed: row.wind_speed,
          visibility: row.visibility,
          uvIndex: row.uv_index,
          sunrise: row.sunrise,
          sunset: row.sunset,
          coordinates: row.coordinates_lat && row.coordinates_lng ? {
            lat: row.coordinates_lat,
            lng: row.coordinates_lng
          } : null
        }
      }));
      
      res.json(formattedRows);
    });
  });

  app.put('/api/weather/history/:id', (req, res) => {
    const { id } = req.params;
    const {
      location,
      temperature,
      condition,
      humidity,
      windSpeed,
      visibility,
      uvIndex
    } = req.body;
    
    if (!location || temperature === undefined) {
      return res.status(400).json({ error: 'Location and temperature are required' });
    }
    
    if (temperature < -100 || temperature > 60) {
      return res.status(400).json({ error: 'Temperature must be between -100°C and 60°C' });
    }
    
    const query = `
      UPDATE weather_searches 
      SET location = ?, temperature = ?, condition = ?, humidity = ?, 
          wind_speed = ?, visibility = ?, uv_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(query, [
      location,
      temperature,
      condition || 'unknown',
      humidity || 0,
      windSpeed || 0,
      visibility || 0,
      uvIndex || 0,
      id
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update weather data' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Weather record not found' });
      }
      
      res.json({ message: 'Weather data updated successfully' });
    });
  });

  app.delete('/api/weather/history/:id', (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }
    
    const query = 'DELETE FROM weather_searches WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete weather data' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Weather record not found' });
      }
      
      res.json({ message: 'Weather data deleted successfully' });
    });
  });

  app.get('/api/youtube/:location', async (req, res) => {
    try {
      const { location } = req.params;
      
      if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'your_youtube_api_key') {
        const mockVideos = [
          {
            id: 'mock1',
            title: `${location} Travel Guide - Weather & Climate`,
            description: `Explore the weather patterns and climate of ${location}`,
            thumbnail: 'https://via.placeholder.com/320x180?text=Video+Thumbnail',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(location + ' weather travel')}`
          }
        ];
        return res.json(mockVideos);
      }
      
      const searchQuery = `${location} weather travel guide`;
      
      const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          part: 'snippet',
          q: searchQuery,
          key: YOUTUBE_API_KEY,
          maxResults: 3,
          type: 'video',
          order: 'relevance'
        }
      });
      
      const videos = response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
      
      res.json(videos);
    } catch (error) {
      console.error('YouTube API error:', error.response?.data || error.message);
      
      const mockVideos = [
        {
          id: 'mock1',
          title: `${req.params.location} Travel Guide`,
          description: 'Explore this amazing location',
          thumbnail: 'https://via.placeholder.com/320x180?text=Video+Thumbnail',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(req.params.location + ' weather')}`
        }
      ];
      res.json(mockVideos);
    }
  });

  app.get('/api/export/:format', (req, res) => {
    const { format } = req.params;
    
    if (!['json', 'csv', 'xml'].includes(format.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported export format. Use json, csv, or xml.' });
    }
    
    const query = 'SELECT * FROM weather_searches ORDER BY date_searched DESC';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch data for export' });
      }
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No data available for export' });
      }
      
      try {
        switch (format.toLowerCase()) {
          case 'json':
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=weather-data.json');
            res.json({
              exportDate: new Date().toISOString(),
              totalRecords: rows.length,
              data: rows
            });
            break;
            
          case 'csv':
            const csvHeaders = 'ID,Location,Date Searched,Temperature,Condition,Humidity,Wind Speed,Visibility,UV Index\n';
            const csvRows = rows.map(row => 
              `${row.id},"${row.location}","${row.date_searched}",${row.temperature},"${row.condition}",${row.humidity},${row.wind_speed},${row.visibility},${row.uv_index}`
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=weather-data.csv');
            res.send(csvHeaders + csvRows);
            break;
            
          case 'xml':
            const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
  <weatherData exportDate="${new Date().toISOString()}" totalRecords="${rows.length}">
  ${rows.map(row => `  <record>
      <id>${row.id}</id>
      <location><![CDATA[${row.location}]]></location>
      <dateSearched>${row.date_searched}</dateSearched>
      <temperature>${row.temperature}</temperature>
      <condition>${row.condition}</condition>
      <humidity>${row.humidity}</humidity>
      <windSpeed>${row.wind_speed}</windSpeed>
      <visibility>${row.visibility}</visibility>
      <uvIndex>${row.uv_index}</uvIndex>
    </record>`).join('\n')}
  </weatherData>`;
            
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', 'attachment; filename=weather-data.xml');
            res.send(xmlData);
            break;
        }
      } catch (exportError) {
        console.error('Export error:', exportError);
        res.status(500).json({ error: 'Failed to export data' });
      }
    });
  });

  app.get('/api/search/locations/:query', async (req, res) => {
    try {
      const { query } = req.params;
      const response = await axios.get(
        `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${WEATHER_API_KEY}`
      );
      
      const suggestions = response.data.map(location => ({
        name: location.name,
        country: location.country,
        state: location.state,
        displayName: `${location.name}${location.state ? ', ' + location.state : ''}, ${location.country}`,
        coordinates: { lat: location.lat, lng: location.lon }
      }));
      
      res.json(suggestions);
    } catch (error) {
      console.error('Location search error:', error);
      res.status(500).json({ error: 'Failed to search locations' });
    }
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.listen(PORT, () => {
    console.log(` WeatherApp Backend server running on port ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Database: SQLite (weather_data.db)`);
    
    // Warn about API keys
    if (WEATHER_API_KEY === 'your_openweathermap_api_key') {
      console.log(' WARNING: Please set your OpenWeatherMap API key in server.js');
    }
    if (YOUTUBE_API_KEY === 'your_youtube_api_key') {
      console.log('ℹ INFO: YouTube API key not set - using mock data');
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n Shutting down server...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log(' Database connection closed.');
      }
      process.exit(0);
    });
  });

  module.exports = app;