import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, 
  MapPin, Calendar, Search, Plus, Edit3, Trash2, 
  Download, Play, Map, Info, User, Wind, Droplets, 
  Eye, Thermometer, Sunrise, Sunset, Navigation,
  Database, FileText, Save, X, Check, AlertCircle
} from 'lucide-react';

const WeatherApp = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [editingRecord, setEditingRecord] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [youtubeVideos, setYoutubeVideos] = useState([]);

  const API_BASE_URL = 'http://localhost:3001/api';

  useEffect(() => {
    loadWeatherHistory();
  }, []);

  const loadWeatherHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/weather/history`);
      setWeatherHistory(response.data);
    } catch (error) {
      console.error('Failed to load weather history:', error);
    }
  };

  const fetchWeatherData = async (location) => {
    try {
      const [currentResponse, forecastResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/weather/current/${encodeURIComponent(location)}`),
        axios.get(`${API_BASE_URL}/weather/forecast/${encodeURIComponent(location)}`)
      ]);

      return {
        current: currentResponse.data,
        forecast: forecastResponse.data
      };
    } catch (error) {
      throw new Error('Failed to fetch weather data. Please check if location exists.');
    }
  };

  const getWeatherIcon = (condition) => {
    const iconMap = {
      clear: <Sun className="w-8 h-8 text-yellow-400" />,
      sunny: <Sun className="w-8 h-8 text-yellow-400" />,
      clouds: <Cloud className="w-8 h-8 text-gray-400" />,
      cloudy: <Cloud className="w-8 h-8 text-gray-400" />,
      rain: <CloudRain className="w-8 h-8 text-blue-400" />,
      rainy: <CloudRain className="w-8 h-8 text-blue-400" />,
      snow: <CloudSnow className="w-8 h-8 text-blue-200" />,
      snowy: <CloudSnow className="w-8 h-8 text-blue-200" />,
      thunderstorm: <CloudLightning className="w-8 h-8 text-purple-400" />,
      stormy: <CloudLightning className="w-8 h-8 text-purple-400" />
    };
    return iconMap[condition?.toLowerCase()] || <Cloud className="w-8 h-8 text-gray-400" />;
  };

  const handleSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchWeatherData(location);
      setCurrentWeather(data.current);
      setForecast(data.forecast);
   
      await saveWeatherSearch(data.current);
      
      await loadYouTubeVideos(location);

      await loadWeatherHistory();
      
    } catch (err) {
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const saveWeatherSearch = async (weatherData) => {
    try {
      await axios.post(`${API_BASE_URL}/weather/history`, {
        location: location,
        dateRangeStart: dateRange.start || null,
        dateRangeEnd: dateRange.end || null,
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        visibility: weatherData.visibility,
        uvIndex: weatherData.uvIndex,
        sunrise: weatherData.sunrise,
        sunset: weatherData.sunset,
        coordinates: weatherData.coordinates
      });
    } catch (error) {
      console.error('Failed to save weather search:', error);
    }
  };

  const loadYouTubeVideos = async (location) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/youtube/${encodeURIComponent(location)}`);
      setYoutubeVideos(response.data);
    } catch (error) {
      console.error('Failed to load YouTube videos:', error);
      setYoutubeVideos([]);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
          setLocation(coords);
          
          try {
            const data = await fetchWeatherData(coords);
            setCurrentWeather(data.current);
            setForecast(data.forecast);
            await saveWeatherSearch(data.current);
            await loadWeatherHistory();
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        () => {
          setError('Unable to retrieve your location');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  const deleteRecord = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/weather/history/${id}`);
      await loadWeatherHistory(); 
    } catch (error) {
      setError('Failed to delete record');
    }
  };

  const startEdit = (record) => {
    setEditingRecord({ ...record });
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API_BASE_URL}/weather/history/${editingRecord.id}`, {
        location: editingRecord.location,
        temperature: editingRecord.weatherData.temperature,
        condition: editingRecord.weatherData.condition,
        humidity: editingRecord.weatherData.humidity,
        windSpeed: editingRecord.weatherData.windSpeed,
        visibility: editingRecord.weatherData.visibility,
        uvIndex: editingRecord.weatherData.uvIndex
      });
      
      setEditingRecord(null);
      await loadWeatherHistory(); 
    } catch (error) {
      setError('Failed to update record');
    }
  };

  const exportData = async (format) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/export/${format}`, {
        responseType: format === 'json' ? 'json' : 'blob'
      });
      
      let content, filename, mimeType;
      
      if (format === 'json') {
        content = JSON.stringify(response.data, null, 2);
        filename = 'weather-data.json';
        mimeType = 'application/json';
      } else {
        content = response.data;
        filename = `weather-data.${format}`;
        mimeType = format === 'csv' ? 'text/csv' : 'application/xml';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export data');
    }
  };

  const openMapsForLocation = (locationName) => {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(locationName)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Cloud className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WeatherApp
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="w-4 h-4" />
              <span>SHAHIN K P</span>
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search Weather
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1 ">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter city, zip code, or coordinates..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Search</span>
                    </>
                  )}
                </button>
                <button
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-2 text-red-200">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-xl p-1">
            {[
              { id: 'current', label: 'Current Weather', icon: Sun },
              { id: 'forecast', label: '5-Day Forecast', icon: Calendar },
              { id: 'history', label: 'Weather History', icon: Database },
              { id: 'export', label: 'Export Data', icon: Download }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === id 
                    ? 'bg-white text-gray-900' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'current' && currentWeather && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-bold mb-2">{currentWeather.location}</h3>
                    <p className="text-6xl font-light mb-2">{currentWeather.temperature}°C</p>
                    <p className="text-xl text-white/80 capitalize">{currentWeather.condition}</p>
                  </div>
                  <div className="text-right">
                    {getWeatherIcon(currentWeather.condition)}
                    <div className="mt-4 text-sm text-white/60">
                      <p>Real-time data</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Wind, label: 'Wind Speed', value: `${currentWeather.windSpeed} km/h` },
                    { icon: Droplets, label: 'Humidity', value: `${currentWeather.humidity}%` },
                    { icon: Eye, label: 'Visibility', value: `${currentWeather.visibility} km` },
                    { icon: Thermometer, label: 'UV Index', value: currentWeather.uvIndex || 'N/A' }
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-4 text-center">
                      <Icon className="w-6 h-6 mx-auto mb-2 text-blue-300" />
                      <p className="text-sm text-white/70">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h4 className="font-semibold mb-4 flex items-center">
                  <Sunrise className="w-5 h-5 mr-2 text-orange-400" />
                  Sun Times
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Sunrise</span>
                    <span>{currentWeather.sunrise}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Sunset</span>
                    <span>{currentWeather.sunset}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h4 className="font-semibold mb-4">Explore Location</h4>
                <div className="space-y-3">
                  {youtubeVideos.length > 0 && (
                    <button 
                      onClick={() => window.open(youtubeVideos[0].url, '_blank')}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Play className="w-5 h-5 text-red-400" />
                      <span>View YouTube Videos</span>
                    </button>
                  )}
                  <button 
                    onClick={() => openMapsForLocation(currentWeather.location)}
                    className="w-full flex items-center space-x-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Map className="w-5 h-5 text-green-400" />
                    <span>Open in Maps</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forecast' && forecast.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              5-Day Forecast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {forecast.map((day, index) => (
                <div key={index} className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/20 transition-colors">
                  <p className="font-medium mb-2">{day.date}</p>
                  <div className="flex justify-center mb-3">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <p className="text-sm text-white/70 capitalize mb-2">{day.condition}</p>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{day.high}°</span>
                    <span className="text-white/60">{day.low}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <Database className="w-6 h-6 mr-2" />
              Weather History (CRUD Operations)
            </h3>
            
            {weatherHistory.length === 0 ? (
              <div className="text-center py-12 text-white/60">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No weather searches yet. Search for a location to start building your history!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {weatherHistory.map((record) => (
                  <div key={record.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    {editingRecord?.id === record.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                          type="text"
                          value={editingRecord.location}
                          onChange={(e) => setEditingRecord(prev => ({ ...prev, location: e.target.value }))}
                          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                          placeholder="Location"
                        />
                        <input
                          type="number"
                          value={editingRecord.weatherData.temperature}
                          onChange={(e) => setEditingRecord(prev => ({ 
                            ...prev, 
                            weatherData: { ...prev.weatherData, temperature: parseInt(e.target.value) }
                          }))}
                          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                          placeholder="Temperature"
                        />
                        <select
                          value={editingRecord.weatherData.condition}
                          onChange={(e) => setEditingRecord(prev => ({ 
                            ...prev, 
                            weatherData: { ...prev.weatherData, condition: e.target.value }
                          }))}
                          className="px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
                        >
                          <option value="clear">Clear</option>
                          <option value="clouds">Clouds</option>
                          <option value="rain">Rain</option>
                          <option value="snow">Snow</option>
                          <option value="thunderstorm">Thunderstorm</option>
                        </select>
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingRecord(null)}
                            className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="font-medium">{record.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getWeatherIcon(record.weatherData.condition)}
                            <span>{record.weatherData.temperature}°C</span>
                          </div>
                          <div className="text-sm text-white/60">
                            {new Date(record.dateSearched).toLocaleDateString()}
                          </div>
                          {record.dateRange && (
                            <div className="text-xs text-blue-300">
                              {record.dateRange.start} to {record.dateRange.end}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEdit(record)}
                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <Download className="w-6 h-6 mr-2" />
              Export Data
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { format: 'json', label: 'JSON', icon: FileText, desc: 'Export as JSON file' },
                { format: 'csv', label: 'CSV', icon: FileText, desc: 'Export as CSV spreadsheet' },
                { format: 'xml', label: 'XML', icon: FileText, desc: 'Export as XML document' }
              ].map(({ format, label, icon: Icon, desc }) => (
                <button
                  key={format}
                  onClick={() => exportData(format)}
                  disabled={weatherHistory.length === 0}
                  className="p-6 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <Icon className="w-8 h-8 mb-3 text-blue-400" />
                  <h4 className="font-semibold mb-2">{label}</h4>
                  <p className="text-sm text-white/70">{desc}</p>
                </button>
              ))}
            </div>
            
            {weatherHistory.length === 0 && (
              <div className="text-center mt-8 text-white/60">
                <p>No data to export. Search for weather information first!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">PM Accelerator</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/80 mb-4">
              PM Accelerator is a leading program that accelerates careers in product management and AI engineering. 
              We provide comprehensive training, mentorship, and hands-on experience to help professionals excel in 
              the rapidly evolving tech industry.
            </p>
            <div className="flex items-center space-x-2 text-sm text-blue-300">
              <span>LinkedIn:</span>
              <span>Product Manager Accelerator</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherApp;