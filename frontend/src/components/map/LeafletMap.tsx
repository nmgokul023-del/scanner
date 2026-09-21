import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Parcel, Conflict, Building, Road } from '../../types';
import { 
  Layers, 
  Ruler, 
  Maximize2, 
  Minimize2, 
  MapPin, 
  Eye, 
  EyeOff, 
  Compass, 
  Crosshair,
  AlertTriangle,
  Info
} from 'lucide-react';

interface LeafletMapProps {
  parcels: Parcel[];
  conflicts?: Conflict[];
  buildings?: Building[];
  roads?: Road[];
  selectedParcelId?: string;
  onSelectParcel: (parcel: Parcel) => void;
  heightClass?: string;
  showSatellite?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  parcels,
  conflicts = [],
  buildings = [],
  roads = [],
  selectedParcelId,
  onSelectParcel,
  heightClass = 'h-[calc(100vh-8rem)]',
  showSatellite = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const [activeLayers, setActiveLayers] = useState({
    droneImagery: showSatellite,
    aiParcels: true,
    existingParcels: true,
    buildings: true,
    roads: true,
    conflicts: true,
    groundTruth: true
  });

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);
  const measureLineRef = useRef<L.Polyline | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9785, lng: 77.6405 });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Tech District Center [12.9785, 77.6405]
    const map = L.map(mapContainerRef.current, {
      center: [12.9790, 77.6410],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Basemaps
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20
    });

    // Default base layer
    if (showSatellite) {
      satelliteLayer.addTo(map);
    } else {
      osmLayer.addTo(map);
    }

    // Layer groups for GIS features
    geojsonLayersRef.current = {
      baseOsm: L.layerGroup([osmLayer]),
      baseSat: L.layerGroup([satelliteLayer]),
      aiParcels: L.layerGroup().addTo(map),
      existingParcels: L.layerGroup().addTo(map),
      buildings: L.layerGroup().addTo(map),
      roads: L.layerGroup().addTo(map),
      conflicts: L.layerGroup().addTo(map),
      groundTruth: L.layerGroup().addTo(map),
      measureLayer: L.layerGroup().addTo(map)
    };

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setMouseCoords({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base layer based on activeLayers.droneImagery
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonLayersRef.current.baseOsm || !geojsonLayersRef.current.baseSat) return;

    if (activeLayers.droneImagery) {
      if (map.hasLayer(geojsonLayersRef.current.baseOsm)) {
        map.removeLayer(geojsonLayersRef.current.baseOsm);
      }
      if (!map.hasLayer(geojsonLayersRef.current.baseSat)) {
        geojsonLayersRef.current.baseSat.addTo(map);
      }
    } else {
      if (map.hasLayer(geojsonLayersRef.current.baseSat)) {
        map.removeLayer(geojsonLayersRef.current.baseSat);
      }
      if (!map.hasLayer(geojsonLayersRef.current.baseOsm)) {
        geojsonLayersRef.current.baseOsm.addTo(map);
      }
    }
  }, [activeLayers.droneImagery]);

  // Render Features on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layers = geojsonLayersRef.current;

    // 1. AI Parcels
    layers.aiParcels.clearLayers();
    if (activeLayers.aiParcels) {
      parcels.forEach((p) => {
        const isSelected = p.id === selectedParcelId || p.parcel_id === selectedParcelId;
        const color = isSelected ? '#2563eb' : p.status === 'Verified' ? '#10b981' : p.status === 'Conflict Detected' ? '#ef4444' : '#0284c7';
        
        try {
          const poly = L.geoJSON(p.geometry as any, {
            style: {
              color: color,
              weight: isSelected ? 3.5 : 2,
              fillColor: color,
              fillOpacity: isSelected ? 0.45 : 0.22,
              dashArray: isSelected ? undefined : undefined
            }
          });

          poly.on('click', () => {
            onSelectParcel(p);
          });

          poly.bindTooltip(`
            <div class="px-2 py-1 font-sans text-xs">
              <div class="font-bold text-slate-900">${p.parcel_id}</div>
              <div class="text-slate-600">${p.address}</div>
              <div class="text-blue-600 font-semibold mt-0.5">Area: ${p.ai_area_sqm} m² (${Math.round(p.confidence_score * 100)}% Conf)</div>
            </div>
          `, { sticky: true, className: 'rounded-md shadow-md border border-slate-200' });

          layers.aiParcels.addLayer(poly);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // 2. Existing Parcels (Registry boundaries - Dashed Orange/Amber)
    layers.existingParcels.clearLayers();
    if (activeLayers.existingParcels) {
      parcels.forEach((p) => {
        if (p.existing_geometry) {
          try {
            const exPoly = L.geoJSON(p.existing_geometry as any, {
              style: {
                color: '#f59e0b',
                weight: 2,
                dashArray: '5, 5',
                fillColor: '#f59e0b',
                fillOpacity: 0.05
              }
            });
            exPoly.bindTooltip(`Existing Registry Boundary: ${p.parcel_id} (${p.existing_area_sqm} m²)`, { sticky: true });
            layers.existingParcels.addLayer(exPoly);
          } catch (e) {
            console.error(e);
          }
        }
      });
    }

    // 3. Buildings
    layers.buildings.clearLayers();
    if (activeLayers.buildings) {
      buildings.forEach((b) => {
        try {
          const bPoly = L.geoJSON(b.geometry as any, {
            style: {
              color: '#6366f1',
              weight: 1.5,
              fillColor: '#818cf8',
              fillOpacity: 0.5
            }
          });
          bPoly.bindTooltip(`Building Footprint: ${b.footprint_area_sqm} m² (Height: ${b.height_meters}m)`, { sticky: true });
          layers.buildings.addLayer(bPoly);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // 4. Roads
    layers.roads.clearLayers();
    if (activeLayers.roads) {
      roads.forEach((r) => {
        try {
          const rLine = L.geoJSON(r.geometry as any, {
            style: {
              color: '#475569',
              weight: Math.max(3, r.width_meters / 3),
              opacity: 0.8
            }
          });
          rLine.bindTooltip(`Road: ${r.name} (${r.road_type} - ${r.width_meters}m)`, { sticky: true });
          layers.roads.addLayer(rLine);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // 5. Conflicts
    layers.conflicts.clearLayers();
    if (activeLayers.conflicts) {
      conflicts.forEach((c) => {
        try {
          const cPoly = L.geoJSON(c.geometry as any, {
            style: {
              color: '#dc2626',
              weight: 2.5,
              dashArray: '4, 4',
              fillColor: '#ef4444',
              fillOpacity: 0.55
            }
          });
          cPoly.bindTooltip(`
            <div class="px-2 py-1">
              <div class="font-bold text-rose-600">Possible Boundary Discrepancy</div>
              <div class="text-xs text-slate-700">${c.parcel_id} : ${c.difference_sqm > 0 ? '+' : ''}${c.difference_sqm} m²</div>
              <div class="text-[10px] text-slate-500 font-medium">Requires Survey Verification</div>
            </div>
          `, { sticky: true });
          layers.conflicts.addLayer(cPoly);
        } catch (e) {
          console.error(e);
        }
      });
    }

    // 6. Ground Truth Points
    layers.groundTruth.clearLayers();
    if (activeLayers.groundTruth) {
      const gtPoints = [
        { lat: 12.9785, lng: 77.6412, name: 'CORS Control Point #TN-04', accuracy: '1.8 cm' },
        { lat: 12.9815, lng: 77.6434, name: 'DGPS Boundary Benchmark', accuracy: '2.2 cm' }
      ];

      gtPoints.forEach((pt) => {
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: 7,
          fillColor: '#059669',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });
        marker.bindPopup(`
          <div class="p-2 font-sans text-xs">
            <div class="font-bold text-emerald-700">${pt.name}</div>
            <div class="text-slate-600">RTK Precision: ${pt.accuracy}</div>
            <div class="text-[10px] text-slate-400 font-mono mt-1">${pt.lat}, ${pt.lng}</div>
          </div>
        `);
        layers.groundTruth.addLayer(marker);
      });
    }

  }, [parcels, conflicts, buildings, roads, selectedParcelId, activeLayers]);

  // Measurement Tool Interaction
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isMeasuring) return;

      const newPoints = [...measurePoints, e.latlng];
      setMeasurePoints(newPoints);

      if (newPoints.length > 1) {
        let total = 0;
        for (let i = 0; i < newPoints.length - 1; i++) {
          total += newPoints[i].distanceTo(newPoints[i + 1]);
        }
        setMeasureDistance(Math.round(total * 10) / 10);
      }

      if (measureLineRef.current) {
        geojsonLayersRef.current.measureLayer.removeLayer(measureLineRef.current);
      }

      const poly = L.polyline(newPoints, { color: '#dc2626', weight: 3, dashArray: '6,6' });
      measureLineRef.current = poly;
      geojsonLayersRef.current.measureLayer.addLayer(poly);
    };

    if (isMeasuring) {
      map.on('click', handleClick);
    } else {
      map.off('click', handleClick);
      geojsonLayersRef.current.measureLayer.clearLayers();
      setMeasurePoints([]);
      setMeasureDistance(null);
    }

    return () => {
      map.off('click', handleClick);
    };
  }, [isMeasuring, measurePoints]);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const centerOnTechDistrict = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([12.9790, 77.6410], 16.5, { duration: 1.2 });
    }
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden shadow-inner border border-slate-200`}>
      {/* The Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left: Quick GIS Tools & Status Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 p-1.5 flex items-center space-x-1">
          <button
            onClick={centerOnTechDistrict}
            title="Reset to Tech District Center"
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={() => setIsMeasuring(!isMeasuring)}
            title={isMeasuring ? 'Exit Measure Tool' : 'Measure Distance & Boundary'}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 text-xs font-medium ${
              isMeasuring ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ruler className="w-4 h-4" />
            {isMeasuring && <span>Measuring</span>}
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle Legend"
            className={`p-1.5 rounded transition-colors ${
              showLegend ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Measure Readout Toast */}
        {isMeasuring && (
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs shadow-lg max-w-xs animate-in fade-in">
            <div className="font-semibold text-blue-400 mb-0.5">Measurement Active</div>
            <p className="text-[11px] text-slate-300">Click on map vertices to measure distance.</p>
            {measureDistance !== null && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between font-mono font-bold text-white">
                <span>Total Distance:</span>
                <span className="text-emerald-400">{measureDistance} m</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Right: Layer Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-3 w-56 text-xs select-none">
          <div className="flex items-center justify-between font-bold text-slate-800 pb-2 mb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> GIS Layers
            </span>
            <span className="text-[10px] text-slate-400 font-normal">WGS 84</span>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-sky-600"></span> Drone Ortho 5cm
              </span>
              <input
                type="checkbox"
                checked={activeLayers.droneImagery}
                onChange={() => toggleLayer('droneImagery')}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> AI Parcels
              </span>
              <input
                type="checkbox"
                checked={activeLayers.aiParcels}
                onChange={() => toggleLayer('aiParcels')}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded border-2 border-dashed border-amber-500 bg-amber-100"></span> Existing Registry
              </span>
              <input
                type="checkbox"
                checked={activeLayers.existingParcels}
                onChange={() => toggleLayer('existingParcels')}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Buildings (18.7k)
              </span>
              <input
                type="checkbox"
                checked={activeLayers.buildings}
                onChange={() => toggleLayer('buildings')}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-slate-700"></span> Roads & Access
              </span>
              <input
                type="checkbox"
                checked={activeLayers.roads}
                onChange={() => toggleLayer('roads')}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded border border-rose-600 bg-rose-200 animate-pulse"></span> Conflicts (126)
              </span>
              <input
                type="checkbox"
                checked={activeLayers.conflicts}
                onChange={() => toggleLayer('conflicts')}
                className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Ground Truth CORS
              </span>
              <input
                type="checkbox"
                checked={activeLayers.groundTruth}
                onChange={() => toggleLayer('groundTruth')}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Left: Coordinates & Scale Readout */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-2">
        <div className="bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-mono px-2.5 py-1 rounded shadow-md border border-slate-700 flex items-center space-x-2">
          <span>Lat: {mouseCoords.lat}</span>
          <span className="text-slate-500">|</span>
          <span>Lng: {mouseCoords.lng}</span>
        </div>
        <div className="hidden sm:block bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-medium px-2 py-1 rounded shadow-md border border-slate-200">
          Scale 1:2500 • 5cm GSD
        </div>
      </div>

      {/* Collapsible Map Legend (Bottom Right, above zoom) */}
      {showLegend && (
        <div className="absolute bottom-16 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-2.5 text-[11px] w-52">
          <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
            <span>Map Legend</span>
            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-600"></span>
              <span>AI Cadastral Boundary</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded border border-dashed border-amber-500 bg-amber-50"></span>
              <span>Existing Revenue Boundary</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded bg-indigo-500/50 border border-indigo-600"></span>
              <span>Extracted Building Footprint</span>
            </div>
            <div className="flex items-center gap-2 text-rose-600 font-medium">
              <span className="w-3 h-3 rounded border border-dashed border-rose-500 bg-rose-200"></span>
              <span>Discrepancy (Possible Conflict)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white"></span>
              <span>RTK GNSS / CORS Landmark</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
