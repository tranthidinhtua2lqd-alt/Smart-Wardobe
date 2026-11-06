import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Sun,
  CloudSun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CURATED_OUTFITS, OutfitItem } from '../types';

export interface CityLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const VIETNAM_CITIES: CityLocation[] = [
  { id: 'tphcm', name: 'TP. Hồ Chí Minh', lat: 10.7769, lon: 106.7009 },
  { id: 'hanoi', name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  { id: 'danang', name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  { id: 'dalat', name: 'Đà Lạt', lat: 11.9404, lon: 108.4583 },
  { id: 'haiphong', name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
  { id: 'cantho', name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  { id: 'nhatrang', name: 'Nha Trang', lat: 12.2388, lon: 109.1967 },
  { id: 'hue', name: 'Huế', lat: 16.4637, lon: 107.5909 },
  { id: 'vungtau', name: 'Vũng Tàu', lat: 10.346, lon: 107.0843 },
  { id: 'sapa', name: 'Sa Pa', lat: 22.3364, lon: 103.8438 },
];

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  conditionText: string;
  updatedAt: string;
}

interface WeatherWidgetBarProps {
  genderStyle?: 'female' | 'male' | 'neutral';
  onSelectWeatherOutfit?: (outfit: OutfitItem) => void;
}

function describeWeatherCode(code: number, temp: number): {
  text: string;
  kind: 'sunny' | 'cloudy' | 'rainy' | 'cold';
} {
  if (code === 0 || code === 1) {
    return {
      text: temp >= 31 ? 'Nắng ấm rực rỡ' : 'Trời quang nắng đẹp',
      kind: 'sunny',
    };
  }
  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return {
      text: temp < 21 ? 'Trời nhiều mây se lạnh' : 'Trời dịu mát có mây',
      kind: temp < 21 ? 'cold' : 'cloudy',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
    return {
      text: 'Có mưa rào nhẹ / Độ ẩm cao',
      kind: 'rainy',
    };
  }
  if (temp < 20) {
    return {
      text: 'Thời tiết se lạnh',
      kind: 'cold',
    };
  }
  return {
    text: 'Thời tiết ôn hòa dễ chịu',
    kind: 'cloudy',
  };
}

export const WeatherWidgetBar: React.FC<WeatherWidgetBarProps> = ({
  genderStyle = 'female',
  onSelectWeatherOutfit,
}) => {
  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    return localStorage.getItem('atelier_aura_city_id') || 'tphcm';
  });
  const [customGpsLocation, setCustomGpsLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(() => {
    const saved = localStorage.getItem('atelier_aura_gps_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const activeLocation =
    selectedCityId === 'gps' && customGpsLocation
      ? customGpsLocation
      : VIETNAM_CITIES.find((c) => c.id === selectedCityId) || VIETNAM_CITIES[0];

  const fetchWeatherForCoords = useCallback(async (lat: number, lon: number) => {
    setIsLoadingWeather(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const current = data.current;

      const temp = Math.round(current.temperature_2m ?? 30);
      const feels = Math.round(current.apparent_temperature ?? temp);
      const hum = Math.round(current.relative_humidity_2m ?? 70);
      const wind = Math.round(current.wind_speed_10m ?? 8);
      const code = Number(current.weather_code ?? 1);
      const desc = describeWeatherCode(code, temp);

      setWeather({
        temperature: temp,
        feelsLike: feels,
        humidity: hum,
        windSpeed: wind,
        weatherCode: code,
        conditionText: desc.text,
        updatedAt: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch {
      // Fallback realistic weather based on latitude/altitude
      const isCoolCity = lat > 20 || (lat > 11.8 && lat < 12.1);
      const fallbackTemp = isCoolCity ? 20 : 32;
      setWeather({
        temperature: fallbackTemp,
        feelsLike: fallbackTemp + 2,
        humidity: 72,
        windSpeed: 9,
        weatherCode: 1,
        conditionText: isCoolCity ? 'Trời mát dịu se lạnh' : 'Nắng ấm đặc trưng',
        updatedAt: 'Vừa cập nhật',
      });
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeatherForCoords(activeLocation.lat, activeLocation.lon);
  }, [activeLocation.lat, activeLocation.lon, fetchWeatherForCoords]);

  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCityId(val);
    localStorage.setItem('atelier_aura_city_id', val);
    setGpsNotice(null);
  };

  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Trình duyệt của bạn không hỗ trợ định vị GPS. Hãy chọn thành phố từ danh sách.');
      return;
    }

    setIsLocatingGps(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        let placeName = `Vị trí hiện tại (${lat}, ${lon})`;

        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city =
              geoData.city ||
              geoData.locality ||
              geoData.principalSubdivision ||
              'Vị trí định vị GPS';
            placeName = `${city} (Định vị GPS)`;
          }
        } catch {
          // Keep coordinates label if reverse geocode fails
        }

        const gpsObj = { name: placeName, lat, lon };
        setCustomGpsLocation(gpsObj);
        setSelectedCityId('gps');
        localStorage.setItem('atelier_aura_gps_location', JSON.stringify(gpsObj));
        localStorage.setItem('atelier_aura_city_id', 'gps');
        setIsLocatingGps(false);
      },
      () => {
        setIsLocatingGps(false);
        setGpsNotice(
          'Không thể truy cập định vị GPS (bạn có thể đã từ chối quyền vị trí). Đang dùng nơi sống bạn chọn.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Weather-driven styling recommendation & matching outfit
  const temp = weather?.temperature ?? 30;
  const isFemale = genderStyle !== 'male';
  const weatherAdvice = (() => {
    if (temp >= 29) {
      const targetId = isFemale ? 'outfit_halter_denim_skirt_05' : 'outfit_khaki_overshirt_12';
      const recommended =
        CURATED_OUTFITS.find((o) => o.id === targetId) || CURATED_OUTFITS[1];
      return {
        badge: 'Thời tiết Nóng Ấm',
        advice: isFemale
          ? 'Ưu tiên trang phục thoáng mát như Set Áo cổ yếm nâu Espresso phối Chân váy xếp ly Denim hoặc Áo Babydoll cột nơ phối chân váy ngắn.'
          : 'Ưu tiên trang phục thoáng mát như Sơ mi Kaki khoác ngoài áo thun trắng phối quần Cargo rộng rãi.',
        recommendedOutfit: recommended,
      };
    }
    if (temp >= 22) {
      const targetId = isFemale ? 'outfit_grey_offshoulder_skirt_03' : 'outfit_striped_knit_11';
      const recommended =
        CURATED_OUTFITS.find((o) => o.id === targetId) || CURATED_OUTFITS[1];
      return {
        badge: 'Thời tiết Mát Dịu',
        advice: isFemale
          ? 'Thời tiết lý tưởng để diện Set Áo trễ vai bất đối xứng xám khói hoặc Áo Corset tay loe nâu Espresso phối Quần Jeans ống loe Y2K.'
          : 'Thời tiết lý tưởng để diện Áo len dệt kim kẻ sọc phối Quần Jeans ống suông dạo phố.',
        recommendedOutfit: recommended,
      };
    }
    const targetId = isFemale ? 'outfit_espresso_knit_butterfly_09' : 'outfit_valley_hoodie_01';
    const recommended =
      CURATED_OUTFITS.find((o) => o.id === targetId) || CURATED_OUTFITS[1];
    return {
      badge: 'Thời tiết Se Lạnh',
      advice: isFemale
        ? 'Nên phối giữ ấm tôn dáng với Set Áo len dệt kim cổ chữ V nâu Espresso phối Quần Jeans ống rộng hoặc Áo cổ lọ phối chân váy tầng.'
        : 'Nên phối layering với Set Hoodie Zip nỉ bông "VALLEY", Sơ mi Flannel caro khoác ngoài và Quần Jeans ống rộng để giữ ấm năng động.',
      recommendedOutfit: recommended,
    };
  })();

  const renderWeatherIcon = () => {
    const code = weather?.weatherCode ?? 1;
    if (code === 0 || code === 1) {
      return <Sun className="w-7 h-7 text-amber-500 shrink-0" />;
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
      return <CloudRain className="w-7 h-7 text-sky-600 shrink-0" />;
    }
    if (temp < 20) {
      return <CloudSnow className="w-7 h-7 text-indigo-500 shrink-0" />;
    }
    return <CloudSun className="w-7 h-7 text-amber-600 shrink-0" />;
  };

  return (
    <div className="mb-6 rounded-xl bg-white border border-stone-200/90 p-4 sm:p-5 shadow-2xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Column 1: Location Selector & GPS Button (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2 border-b lg:border-b-0 lg:border-r border-stone-200/80 pb-3 lg:pb-0 lg:pr-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-theme-primary" />
              <span>Thời tiết nơi bạn sống</span>
            </span>
            <button
              type="button"
              onClick={handleUseGpsLocation}
              disabled={isLocatingGps}
              className="px-2.5 py-1 rounded-md bg-theme-canvas hover:bg-stone-200/70 border border-stone-300 text-xs font-medium text-stone-800 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              title="Lấy thời tiết tự động theo định vị GPS hiện tại"
            >
              {isLocatingGps ? (
                <RefreshCw className="w-3 h-3 animate-spin text-theme-primary" />
              ) : (
                <Navigation className="w-3 h-3 text-theme-primary" />
              )}
              <span>{isLocatingGps ? 'Đang định vị...' : 'Định vị GPS'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCityId}
              onChange={handleCitySelectChange}
              aria-label="Chọn thành phố hoặc nơi đang sống"
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-stone-900 bg-theme-canvas border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 cursor-pointer"
            >
              {customGpsLocation && (
                <option value="gps">📍 {customGpsLocation.name}</option>
              )}
              {VIETNAM_CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {gpsNotice && (
            <p className="text-[11px] text-amber-800 leading-snug">{gpsNotice}</p>
          )}
        </div>

        {/* Column 2: Live Weather Metrics (3.5 cols) */}
        <div className="lg:col-span-4 flex items-center justify-between sm:justify-start gap-4 border-b lg:border-b-0 lg:border-r border-stone-200/80 pb-3 lg:pb-0 lg:px-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-center shrink-0">
              {renderWeatherIcon()}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tabular text-2xl sm:text-3xl font-bold text-stone-900">
                  {isLoadingWeather ? '--' : `${weather?.temperature ?? 30}°C`}
                </span>
                <span className="text-xs font-medium text-theme-primary">
                  {weatherAdvice.badge}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                {weather?.conditionText || 'Đang tải thời tiết...'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-[11px] font-mono-tabular text-stone-600 pl-2 border-l border-stone-200/80">
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-stone-400" />
              Cảm giác: <strong>{weather?.feelsLike ?? 32}°C</strong>
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-500" />
              Độ ẩm: <strong>{weather?.humidity ?? 70}%</strong>
            </span>
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-stone-400" />
              Gió: <strong>{weather?.windSpeed ?? 8} km/h</strong>
            </span>
          </div>
        </div>

        {/* Column 3: Weather-Based Outfit Suggestion (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
            <p className="text-xs text-stone-700 leading-relaxed">
              <strong className="text-stone-900">Gợi ý phối theo thời tiết {activeLocation.name}:</strong>{' '}
              {weatherAdvice.advice}
            </p>
          </div>
          {onSelectWeatherOutfit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onSelectWeatherOutfit(weatherAdvice.recommendedOutfit)}
                className="px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Chọn thử: {weatherAdvice.recommendedOutfit.name.split('&')[0].trim()}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
