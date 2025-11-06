// API Configuration - FIXED
const API_KEY = '87a2b8fb99cd68aa173116725129322c'; // Use 'demo' for testing, then get real key from OpenWeather
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const searchSuggestions = document.getElementById('searchSuggestions');

// Weather Display Elements
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const visibility = document.getElementById('visibility');
const visibilityFill = document.getElementById('visibilityFill');
const cloudiness = document.getElementById('cloudiness');
const cloudFill = document.getElementById('cloudFill');

// Containers
const forecastContainer = document.getElementById('forecastContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Recent searches
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Weather app initialized');
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // Load last searched city or use demo
    const lastCity = localStorage.getItem('lastSearchedCity');
    if (lastCity && lastCity !== 'London') {
        getWeatherByCity(lastCity);
    } else {
        // Show welcome message instead of auto-loading London
        showWelcomeMessage();
    }
    
    setupEventListeners();
});

function showWelcomeMessage() {
    cityName.textContent = 'WeatherFlow';
    currentTemp.textContent = '--';
    weatherDescription.textContent = 'Enter a city name to get started';
    currentDate.textContent = 'Search for weather anywhere in the world';
}

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    locationBtn.addEventListener('click', getWeatherByLocation);
    cityInput.addEventListener('input', handleSearchInput);
}

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        console.log('🔍 Searching for:', city);
        getWeatherByCity(city);
        cityInput.value = '';
        hideSuggestions();
    } else {
        showError('Please enter a city name');
    }
}

function handleSearchInput() {
    const query = cityInput.value.trim();
    if (query.length > 2) {
        showSearchSuggestions(query);
    } else {
        hideSuggestions();
    }
}

// FIXED: Simplified suggestions without API dependency
function showSearchSuggestions(query) {
    const popularCities = [
        'London, UK', 'Paris, France', 'New York, US', 
        'Tokyo, Japan', 'Sydney, Australia', 'Berlin, Germany',
        'Mumbai, India', 'Beijing, China', 'Toronto, Canada'
    ];
    
    const filtered = popularCities.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
    );
    
    displaySuggestions(filtered.slice(0, 5));
}

function displaySuggestions(cities) {
    searchSuggestions.innerHTML = '';
    cities.forEach(city => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = city;
        suggestionItem.addEventListener('click', () => {
            const cityNameOnly = city.split(',')[0].trim();
            getWeatherByCity(cityNameOnly);
            cityInput.value = '';
            hideSuggestions();
        });
        searchSuggestions.appendChild(suggestionItem);
    });
    searchSuggestions.style.display = 'block';
}

function hideSuggestions() {
    searchSuggestions.style.display = 'none';
}

// FIXED: Main weather function with proper error handling
async function getWeatherByCity(city) {
    showLoading();
    hideError();
    
    console.log('🌤️ Fetching weather for:', city);
    
    if (!city || city.trim() === '') {
        showError('Please enter a city name');
        hideLoading();
        return;
    }

    try {
        const encodedCity = encodeURIComponent(city.trim());
        
        // FIXED: Better API call with error handling
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${API_KEY}&units=metric`
        );
        
        console.log('📡 Response status:', currentResponse.status);
        
        // FIXED: Handle different error types
        if (currentResponse.status === 401) {
            // API key issue - use demo data
            console.log('🔄 Using demo data due to API key issue');
            loadDemoData(city);
            return;
        } else if (currentResponse.status === 404) {
            throw new Error(`City "${city}" not found. Try: "London", "Paris", "New York"`);
        } else if (currentResponse.status === 429) {
            throw new Error('API limit exceeded - Try again later');
        } else if (!currentResponse.ok) {
            throw new Error(`Weather service unavailable (Error: ${currentResponse.status})`);
        }
        
        const currentData = await currentResponse.json();
        console.log('✅ Current weather data received');
        
        // FIXED: Try to get forecast, but don't fail if it doesn't work
        let forecastData = null;
        try {
            const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${API_KEY}&units=metric`
            );
            if (forecastResponse.ok) {
                forecastData = await forecastResponse.json();
                console.log('✅ Forecast data received');
            }
        } catch (forecastError) {
            console.log('⚠️ Forecast data unavailable, continuing without it');
        }
        
        // Update UI
        updateCurrentWeather(currentData);
        if (forecastData) {
            updateForecast(forecastData);
        } else {
            createDemoForecast(); // Show demo forecast if real one fails
        }
        updateAdditionalInfo(currentData);
        
        // Save to recent searches
        addToRecentSearches(city);
        localStorage.setItem('lastSearchedCity', city);
        
    } catch (error) {
        console.error('❌ Error fetching weather:', error);
        
        // FIXED: If city not found and we're in demo mode, use demo data
        if (error.message.includes('not found') && API_KEY === 'demo') {
            loadDemoData(city);
        } else {
            showError(error.message);
        }
    } finally {
        hideLoading();
    }
}

async function getWeatherByLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 Location found:', latitude, longitude);
            
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
                );
                
                if (!response.ok) {
                    throw new Error('Location weather data unavailable');
                }
                
                const data = await response.json();
                getWeatherByCity(data.name); // Use city name for consistency
                
            } catch (error) {
                console.error('❌ Location weather error:', error);
                showError('Unable to get weather for your location');
                hideLoading();
            }
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            hideLoading();
            showError('Unable to retrieve your location. Please allow location access.');
        }
    );
}

function updateCurrentWeather(data) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    currentTemp.textContent = Math.round(data.main.temp);
    weatherDescription.textContent = data.weather[0].description;
    
    // Weather icon
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;
    
    // Weather details
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} m/s`;
    pressure.textContent = `${data.main.pressure} hPa`;
}

function updateForecast(data) {
    if (!data || !data.list) {
        console.log('⚠️ No forecast data available');
        createDemoForecast();
        return;
    }
    
    forecastContainer.innerHTML = '';
    
    // FIXED: Better forecast grouping - get one forecast per day
    const dailyForecasts = [];
    for (let i = 0; i < data.list.length; i += 8) { // 8 intervals = 24 hours
        if (dailyForecasts.length < 5) { // Only need 5 days
            dailyForecasts.push(data.list[i]);
        }
    }
    
    dailyForecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        
        forecastCard.innerHTML = `
            <div class="forecast-date">${formatDay(date)}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <div class="forecast-temp">
                <span class="temp-high">${Math.round(day.main.temp_max)}°</span>
                <span class="temp-low">${Math.round(day.main.temp_min)}°</span>
            </div>
            <div class="forecast-description">${day.weather[0].description}</div>
        `;
        
        forecastContainer.appendChild(forecastCard);
    });
}

function updateAdditionalInfo(data) {
    // Sunrise and sunset
    if (data.sys && data.sys.sunrise) {
        const sunriseTime = new Date(data.sys.sunrise * 1000);
        const sunsetTime = new Date(data.sys.sunset * 1000);
        sunrise.textContent = formatTime(sunriseTime);
        sunset.textContent = formatTime(sunsetTime);
    }
    
    // Visibility
    if (data.visibility) {
        const visibilityKm = (data.visibility / 1000).toFixed(1);
        visibility.textContent = `${visibilityKm} km`;
        const visibilityPercent = Math.min((visibilityKm / 20) * 100, 100);
        visibilityFill.style.width = `${visibilityPercent}%`;
    }
    
    // Cloudiness
    if (data.clouds && data.clouds.all) {
        cloudiness.textContent = `${data.clouds.all}%`;
        cloudFill.style.width = `${data.clouds.all}%`;
    }
}

function updateDateTime() {
    const now = new Date();
    currentDate.textContent = formatFullDate(now);
}

// FIXED: Demo data function - for testing without API key
function loadDemoData(cityName) {
    console.log('🎭 Loading demo data for:', cityName);
    
    const demoData = {
        name: cityName,
        sys: { country: "Demo" },
        main: {
            temp: 18 + Math.floor(Math.random() * 15), // Random temp between 18-32°C
            feels_like: 16 + Math.floor(Math.random() * 15),
            humidity: 40 + Math.floor(Math.random() * 40),
            pressure: 1000 + Math.floor(Math.random() * 50)
        },
        weather: [{ 
            description: ["sunny", "cloudy", "partly cloudy", "clear"][Math.floor(Math.random() * 4)],
            icon: ["01d", "02d", "03d", "04d"][Math.floor(Math.random() * 4)]
        }],
        wind: { speed: (1 + Math.random() * 10).toFixed(1) },
        visibility: 8000 + Math.floor(Math.random() * 12000),
        clouds: { all: Math.floor(Math.random() * 100) },
        sys: { 
            sunrise: Math.floor(Date.now() / 1000) - 21600, // 6 hours ago
            sunset: Math.floor(Date.now() / 1000) + 21600   // 6 hours from now
        }
    };
    
    updateCurrentWeather(demoData);
    updateAdditionalInfo(demoData);
    createDemoForecast();
    
    // Show demo notification
    showDemoNotification();
}

function createDemoForecast() {
    forecastContainer.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        
        forecastCard.innerHTML = `
            <div class="forecast-date">${formatDay(date)}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/02d.png" alt="Partly cloudy">
            <div class="forecast-temp">
                <span class="temp-high">${18 + i}°</span>
                <span class="temp-low">${12 + i}°</span>
            </div>
            <div class="forecast-description">partly cloudy</div>
        `;
        
        forecastContainer.appendChild(forecastCard);
    }
}

function showDemoNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        padding: 1rem;
        border-radius: 8px;
        color: #92400e;
        z-index: 1000;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <strong>Demo Mode</strong><br>
        Using sample data. <a href="https://openweathermap.org/api" target="_blank" style="color: #92400e; text-decoration: underline;">Get API key</a> for real weather data.
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

// Utility Functions
function formatFullDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDay(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function addToRecentSearches(city) {
    recentSearches = recentSearches.filter(item => item !== city);
    recentSearches.unshift(city);
    recentSearches = recentSearches.slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
}

// UI Control Functions
function showLoading() {
    loadingSpinner.style.display = 'block';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showError(message) {
    errorText.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p><strong>Weather Data Unavailable</strong></p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">${message}</p>
        </div>
    `;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Global function for error retry button
window.hideError = hideError;

// FIXED: Auto-enable demo mode if no valid API key
if (!API_KEY || API_KEY === '87a2b8fb99cd68aa173116725129322c') {
    console.log('🔧 Demo mode enabled - no valid API key found');
    // Don't auto-load demo data - wait for user search
}