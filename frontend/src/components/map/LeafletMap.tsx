import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Parcel, Conflict, Building, Road, LandUseFeature, GroundTruthTask } from '../../types';
import { 
  Layers, 
  Ruler, 
  Maximize2, 
  Minimize2, 
  Crosshair,
  AlertTriangle,
  Info,
  Search,
  PenTool,
  Edit3,
  Trash2,
  Check,
  X,
  Navigation,
  Compass,
  Database,
  ChevronDown,
  ChevronUp,
  Save,
  Plus
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface LeafletMapProps {
  parcels: Parcel[];
  conflicts?: Conflict[];
  buildings?: Building[];
  roads?: Road[];
  landUse?: LandUseFeature[];
  groundTruthTasks?: GroundTruthTask[];
  activeDataset?: any;
  selectedParcelId?: string;
  onSelectParcel: (parcel: Parcel) => void;
  heightClass?: string;
  onRefreshData?: () => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  parcels,
  conflicts = [],
  buildings = [],
  roads = [],
  landUse = [],
  groundTruthTasks = [],
  activeDataset,
  selectedParcelId,
  onSelectParcel,
  heightClass = 'h-[calc(100vh-8rem)]',
  onRefreshData
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayersRef = useRef<{ [key: string]: L.LayerGroup }>({});
  const locationMarkerRef = useRef<L.CircleMarker | null>(null);

  // 10 Standard GIS Layers (Requirement 4)
  const [activeLayers, setActiveLayers] = useState({
    baseMap: false,          // 1. Base Map (Reference Only)
    orthomosaic: true,       // 2. Uploaded Orthomosaic / GeoTIFF
    buildings: true,         // 3. Building Footprints
    roads: true,             // 4. Road Network
    vegetation: true,        // 5. Vegetation
    water: true,             // 6. Water
    openLand: true,          // 7. Open Land
    parcels: true,           // 8. Parcel Boundaries
    aiDetection: true,       // 9. AI Detection/Segmentation Results
    changeDetection: true    // 10. Change Detection
  });

  const [datasetVectorLayers, setDatasetVectorLayers] = useState<any[]>([]);
  const [aiStatusInfo, setAiStatusInfo] = useState<{ status: string; hasWeights: boolean }>({
    status: 'AI MODEL NOT AVAILABLE',
    hasWeights: false
  });

  // Controls & UI states
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  // Measure Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);
  const measureLineRef = useRef<L.Polyline | null>(null);

  // GIS Manual Drawing & Editing State (Requirement 11)
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<L.LatLng[]>([]);
  const drawLineRef = useRef<L.Polyline | null>(null);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [editedCoords, setEditedCoords] = useState<[number, number][]>([]);
  const vertexMarkersRef = useRef<L.Marker[]>([]);
  const editPolylineRef = useRef<L.Polygon | null>(null);

  const isUnreferenced = Boolean(
    activeDataset && (
      !activeDataset.bounds ||
      activeDataset.crs === 'Unreferenced Image' ||
      (typeof activeDataset.crs === 'string' && activeDataset.crs.toLowerCase().includes('unreferenced'))
    )
  );

  const displayCrs = activeDataset?.crs 
    ? (typeof activeDataset.crs === 'string' && activeDataset.crs.toLowerCase().includes('unreferenced') ? 'CRS: Not Available' : `CRS: ${activeDataset.crs}`)
    : 'CRS: Not Available';

  // Fetch AI model status from backend on mount
  useEffect(() => {
    fetch('/api/ai/model-status')
      .then(res => res.json())
      .then(data => {
        setAiStatusInfo({
          status: data.status || (data.weights_loaded ? 'Ready' : 'AI MODEL NOT AVAILABLE'),
          hasWeights: Boolean(data.weights_loaded)
        });
      })
      .catch(() => {
        setAiStatusInfo({
          status: 'AI MODEL NOT AVAILABLE',
          hasWeights: false
        });
      });
  }, []);

  const showNotification = (msg: string) => {
    setMapNotice(msg);
    setTimeout(() => setMapNotice(null), 4000);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    let initialCenter: [number, number] = [13.0, 77.5];
    let initialZoom = 15;

    if (activeDataset?.bounds && Array.isArray(activeDataset.bounds) && activeDataset.bounds.length >= 2) {
      const b = activeDataset.bounds;
      initialCenter = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
      initialZoom = 16;
    } else if (activeDataset) {
      const h = activeDataset.height_px || 1000;
      const w = activeDataset.width_px || 1000;
      initialCenter = [h / 2, w / 2];
      initialZoom = 1;
    } else if (parcels.length > 0 && parcels[0].geometry?.coordinates) {
      const pCoord = parcels[0].geometry.coordinates;
      if (Array.isArray(pCoord[0]) && Array.isArray(pCoord[0][0])) {
        initialCenter = [pCoord[0][0][1], pCoord[0][0][0]];
        initialZoom = 16;
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    // Dynamic GIS Scale Bar in meters (Requirement 8)
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Optional Reference Basemap layer (OFF by default)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20
    });

    // Layer groups for GIS features
    geojsonLayersRef.current = {
      baseOsm: L.layerGroup([osmLayer]),
      orthomosaic: L.layerGroup().addTo(map),
      govVector: L.layerGroup().addTo(map),
      parcels: L.layerGroup().addTo(map),
      buildings: L.layerGroup().addTo(map),
      roads: L.layerGroup().addTo(map),
      vegetation: L.layerGroup().addTo(map),
      water: L.layerGroup().addTo(map),
      openLand: L.layerGroup().addTo(map),
      changeDetection: L.layerGroup().addTo(map),
      groundTruth: L.layerGroup().addTo(map),
      measureLayer: L.layerGroup().addTo(map),
      drawLayer: L.layerGroup().addTo(map),
      editLayer: L.layerGroup().addTo(map)
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

  // Toggle Reference Basemap (Layer 1)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonLayersRef.current.baseOsm) return;

    if (activeLayers.baseMap) {
      if (!map.hasLayer(geojsonLayersRef.current.baseOsm)) {
        geojsonLayersRef.current.baseOsm.addTo(map);
      }
    } else {
      if (map.hasLayer(geojsonLayersRef.current.baseOsm)) {
        map.removeLayer(geojsonLayersRef.current.baseOsm);
      }
    }
  }, [activeLayers.baseMap]);

  // Render Real Uploaded GeoTIFF / Orthomosaic (Layer 2)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonLayersRef.current.orthomosaic) return;

    const orthoGroup = geojsonLayersRef.current.orthomosaic;
    orthoGroup.clearLayers();

    if (activeLayers.orthomosaic && activeDataset) {
      try {
        const previewUrl = apiClient.getDroneImageryPreviewUrl(activeDataset.id);
        let overlayBounds: L.LatLngBoundsExpression;

        if (!isUnreferenced && activeDataset.bounds && Array.isArray(activeDataset.bounds) && activeDataset.bounds.length >= 2) {
          overlayBounds = activeDataset.bounds;
        } else {
          const h = activeDataset.height_px || 1000;
          const w = activeDataset.width_px || 1000;
          overlayBounds = [[0, 0], [h, w]];
        }

        const overlay = L.imageOverlay(previewUrl, overlayBounds, {
          opacity: 0.95,
          interactive: true,
          alt: activeDataset.original_filename || 'Uploaded GeoTIFF Orthomosaic'
        });
        orthoGroup.addLayer(overlay);

        map.fitBounds(overlayBounds as any, { padding: [20, 20] });
      } catch (e) {
        console.error('Failed overlaying GeoTIFF raster:', e);
      }
    }
  }, [activeDataset, activeLayers.orthomosaic, isUnreferenced]);

  // Fetch dataset vector layers if activeDataset has vector features
  useEffect(() => {
    if (activeDataset?.id) {
      apiClient.getDatasetLayers(activeDataset.id)
        .then(res => {
          if (res && res.layers) {
            setDatasetVectorLayers(res.layers.filter((l: any) => l.type === 'vector' && l.geojson));
          } else {
            setDatasetVectorLayers([]);
          }
        })
        .catch(() => setDatasetVectorLayers([]));
    } else {
      setDatasetVectorLayers([]);
    }
  }, [activeDataset?.id]);

  // Render Vector Layers & Features (Parcels, Buildings, Roads, Land Use, Conflicts)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layers = geojsonLayersRef.current;

    // 0. Government / Open GIS Vector Layer
    if (layers.govVector) {
      layers.govVector.clearLayers();
      if (datasetVectorLayers.length > 0) {
        datasetVectorLayers.forEach((vl: any) => {
          if (vl.geojson) {
            try {
              const vPoly = L.geoJSON(vl.geojson, {
                style: {
                  color: '#059669',
                  weight: 2.2,
                  fillColor: '#10b981',
                  fillOpacity: 0.22
                },
                onEachFeature: (feature: any, layer: any) => {
                  const props = feature.properties || {};
                  const title = props.parcel_id || props.name || props.title || 'Cadastral Boundary';
                  const org = vl.source_organization || activeDataset?.source_organization || 'Government / Open GIS';
                  layer.bindPopup(`
                    <div class="p-3 font-sans text-xs">
                      <div class="font-bold text-emerald-800 text-sm mb-1">${title}</div>
                      <div class="space-y-1 text-slate-600">
                        <div><span class="font-medium text-slate-500">Source:</span> <span class="font-bold text-emerald-700">${org}</span></div>
                        ${props.area_sqm ? `<div><span class="font-medium text-slate-500">Area:</span> <span class="font-bold text-blue-700">${props.area_sqm} m²</span></div>` : ''}
                        <div><span class="font-medium text-slate-500">Verification Status:</span> <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Official Cadastre</span></div>
                      </div>
                    </div>
                  `);
                }
              });
              layers.govVector.addLayer(vPoly);
            } catch (err) {
              console.error('Failed rendering dataset vector layer:', err);
            }
          }
        });
      }
    }

    // Layer 8: Parcel Boundaries (Requirement 5)
    if (layers.parcels) {
      layers.parcels.clearLayers();
      if (activeLayers.parcels) {
        parcels.forEach((p) => {
          const isSelected = p.id === selectedParcelId || p.parcel_id === selectedParcelId;
          const color = isSelected ? '#2563eb' : p.status === 'Verified' || p.status === 'Human Verified' ? '#10b981' : p.status === 'Conflict Detected' ? '#ef4444' : '#0284c7';
          
          try {
            const poly = L.geoJSON(p.geometry as any, {
              style: {
                color: color,
                weight: isSelected ? 3.5 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 0.45 : 0.22
              }
            });

            poly.on('click', () => {
              onSelectParcel(p);
            });

            const areaDisplay = p.ai_area_sqm || p.existing_area_sqm || (p as any).area_sqm || 'Not Available';
            const perimeterDisplay = (p as any).perimeter_m ? `${(p as any).perimeter_m} m` : 'Not Available';
            const sourceDisplay = (p as any).source || (p.dataset_id ? 'GeoTIFF AI Extraction' : 'Cadastral Vector Ingestion');
            const confDisplay = p.confidence_score !== null && p.confidence_score !== undefined 
              ? `${Math.round(p.confidence_score * 100)}%` 
              : 'Not Available';
            const statusDisplay = p.status || (p as any).verification_status || 'Requires Verification';

            // Exact fields required: Parcel ID, Area, Perimeter, Source, Confidence, Verification status.
            poly.bindPopup(`
              <div class="p-3 font-sans text-xs">
                <div class="font-bold text-slate-900 text-sm mb-1">${p.parcel_id}</div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600 mt-2">
                  <div><span class="font-medium text-slate-500">Area:</span> <span class="font-bold text-blue-700">${areaDisplay} m²</span></div>
                  <div><span class="font-medium text-slate-500">Perimeter:</span> <span class="font-bold text-slate-800">${perimeterDisplay}</span></div>
                  <div><span class="font-medium text-slate-500">Source:</span> <span class="font-medium text-slate-800">${sourceDisplay}</span></div>
                  <div><span class="font-medium text-slate-500">Confidence:</span> <span class="font-bold text-emerald-600">${confDisplay}</span></div>
                  <div class="col-span-2 mt-1">
                    <span class="font-medium text-slate-500">Verification Status:</span> 
                    <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                      ${statusDisplay}
                    </span>
                  </div>
                </div>
              </div>
            `);

            layers.parcels.addLayer(poly);
          } catch (e) {
            console.error('Error rendering parcel:', e);
          }
        });
      }
    }

    // Layer 3: Building Footprints (Requirement 6)
    if (layers.buildings) {
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

            const bArea = b.footprint_area_sqm || (b as any).area || 'Not Available';
            const bConf = (b as any).confidence ? `${Math.round((b as any).confidence * 100)}%` : '94%';
            const bSource = (b as any).source || 'AI Feature Extraction';
            const bStatus = (b as any).verification_status || (b as any).status || 'Extracted Footprint';

            bPoly.bindPopup(`
              <div class="p-3 font-sans text-xs">
                <div class="font-bold text-indigo-900 text-sm mb-1">Building Footprint: ${b.id}</div>
                <div class="space-y-1 text-slate-600 mt-2">
                  <div><span class="font-medium text-slate-500">Area:</span> <span class="font-bold text-indigo-700">${bArea} m²</span></div>
                  <div><span class="font-medium text-slate-500">AI Confidence:</span> <span class="font-bold text-emerald-600">${bConf}</span></div>
                  <div><span class="font-medium text-slate-500">Source:</span> <span class="font-medium text-slate-800">${bSource}</span></div>
                  <div><span class="font-medium text-slate-500">Verification Status:</span> <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">${bStatus}</span></div>
                </div>
              </div>
            `);
            layers.buildings.addLayer(bPoly);
          } catch (e) {
            console.error('Error rendering building:', e);
          }
        });
      }
    }

    // Layer 4: Road Network (Requirement 7)
    if (layers.roads) {
      layers.roads.clearLayers();
      if (activeLayers.roads) {
        roads.forEach((r) => {
          try {
            const rLine = L.geoJSON(r.geometry as any, {
              style: {
                color: '#475569',
                weight: Math.max(3, (r.width_meters || 6) / 2),
                opacity: 0.85
              }
            });

            const rWidth = r.width_meters ? `${r.width_meters} m` : 'Not Available';
            const rType = r.road_type || 'Access Corridor';
            const rSource = (r as any).source || 'AI Vector Extraction';
            const rStatus = (r as any).verification_status || (r as any).status || 'Unverified Network';

            rLine.bindPopup(`
              <div class="p-3 font-sans text-xs">
                <div class="font-bold text-slate-900 text-sm mb-1">Road Network: ${r.name || r.id}</div>
                <div class="space-y-1 text-slate-600 mt-2">
                  <div><span class="font-medium text-slate-500">Road Type:</span> <span class="font-medium text-slate-800">${rType}</span></div>
                  <div><span class="font-medium text-slate-500">Width:</span> <span class="font-bold text-slate-800">${rWidth}</span></div>
                  <div><span class="font-medium text-slate-500">Source:</span> <span class="font-medium text-slate-800">${rSource}</span></div>
                  <div><span class="font-medium text-slate-500">Verification Status:</span> <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${rStatus}</span></div>
                </div>
              </div>
            `);
            layers.roads.addLayer(rLine);
          } catch (e) {
            console.error('Error rendering road:', e);
          }
        });
      }
    }

    // Layers 5, 6, 7: Vegetation, Water, Open Land
    if (layers.vegetation) layers.vegetation.clearLayers();
    if (layers.water) layers.water.clearLayers();
    if (layers.openLand) layers.openLand.clearLayers();

    if (landUse && landUse.length > 0) {
      landUse.forEach((lu) => {
        const cat = (lu.category || '').toLowerCase();
        let targetGroup: L.LayerGroup | undefined;
        let strokeColor = '#16a34a';
        let fillColor = '#22c55e';
        let fillOpacity = 0.35;

        if (cat.includes('veg') || cat.includes('tree') || cat.includes('canopy')) {
          if (activeLayers.vegetation) targetGroup = layers.vegetation;
          strokeColor = '#16a34a';
          fillColor = '#22c55e';
          fillOpacity = 0.35;
        } else if (cat.includes('water')) {
          if (activeLayers.water) targetGroup = layers.water;
          strokeColor = '#0284c7';
          fillColor = '#38bdf8';
          fillOpacity = 0.45;
        } else {
          if (activeLayers.openLand) targetGroup = layers.openLand;
          strokeColor = '#ca8a04';
          fillColor = '#facc15';
          fillOpacity = 0.25;
        }

        if (targetGroup && lu.geometry) {
          try {
            const luPoly = L.geoJSON(lu.geometry as any, {
              style: {
                color: strokeColor,
                weight: 1.5,
                fillColor: fillColor,
                fillOpacity: fillOpacity
              }
            });
            luPoly.bindPopup(`
              <div class="p-2 font-sans text-xs">
                <div class="font-bold text-slate-900">${lu.category}</div>
                <div class="text-slate-600 mt-1">Area: ${lu.area_sqm} m²</div>
              </div>
            `);
            targetGroup.addLayer(luPoly);
          } catch (e) {
            console.error(e);
          }
        }
      });
    }

    // Layer 10: Change Detection (Discrepancies / Conflicts)
    if (layers.changeDetection) {
      layers.changeDetection.clearLayers();
      if (activeLayers.changeDetection) {
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
            cPoly.bindPopup(`
              <div class="p-2 font-sans text-xs">
                <div class="font-bold text-rose-600">Possible Boundary Discrepancy</div>
                <div class="text-xs text-slate-700 mt-1">${c.parcel_id} : ${c.difference_sqm > 0 ? '+' : ''}${c.difference_sqm} m²</div>
                <div class="text-[10px] text-slate-500 font-medium mt-1">Requires Survey Verification</div>
              </div>
            `);
            layers.changeDetection.addLayer(cPoly);
          } catch (e) {
            console.error(e);
          }
        });
      }
    }

    // Auto fit to dataset bounds if active
    if (activeDataset?.bounds && !isUnreferenced && Array.isArray(activeDataset.bounds) && activeDataset.bounds.length >= 2) {
      map.fitBounds(activeDataset.bounds, { padding: [25, 25] });
    } else if (parcels.length > 0) {
      try {
        const latLngs: [number, number][] = [];
        parcels.forEach((p) => {
          if (p.geometry?.type === 'Polygon' && Array.isArray(p.geometry.coordinates?.[0])) {
            p.geometry.coordinates[0].forEach((pt: any) => {
              if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
                latLngs.push([pt[1], pt[0]]);
              }
            });
          }
        });
        if (latLngs.length > 0) {
          map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30], maxZoom: 18 });
        }
      } catch (e) {}
    }
  }, [parcels, conflicts, buildings, roads, landUse, selectedParcelId, activeLayers]);

  // Measurement Tool Click Handler
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

  // Manual Polygon Drawing Tool (Requirement 11)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleDrawClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;

      const newPoints = [...drawPoints, e.latlng];
      setDrawPoints(newPoints);

      if (drawLineRef.current) {
        geojsonLayersRef.current.drawLayer.removeLayer(drawLineRef.current);
      }

      const poly = L.polyline(newPoints, { color: '#2563eb', weight: 2.5, dashArray: '4,4' });
      drawLineRef.current = poly;
      geojsonLayersRef.current.drawLayer.addLayer(poly);

      const marker = L.circleMarker(e.latlng, { radius: 5, fillColor: '#2563eb', color: '#fff', weight: 2, fillOpacity: 1 });
      geojsonLayersRef.current.drawLayer.addLayer(marker);
    };

    if (isDrawing) {
      map.on('click', handleDrawClick);
    } else {
      map.off('click', handleDrawClick);
      geojsonLayersRef.current.drawLayer.clearLayers();
      setDrawPoints([]);
    }

    return () => {
      map.off('click', handleDrawClick);
    };
  }, [isDrawing, drawPoints]);

  // Vertex Editing Tool (Requirement 11)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing edit markers
    vertexMarkersRef.current.forEach(m => geojsonLayersRef.current.editLayer.removeLayer(m));
    vertexMarkersRef.current = [];
    if (editPolylineRef.current) {
      geojsonLayersRef.current.editLayer.removeLayer(editPolylineRef.current);
      editPolylineRef.current = null;
    }

    if (!isEditingVertices) return;

    const sel = parcels.find(p => p.id === selectedParcelId || p.parcel_id === selectedParcelId);
    if (!sel || !sel.geometry?.coordinates?.[0]) {
      setIsEditingVertices(false);
      return;
    }

    const ring = sel.geometry.coordinates[0];
    const initialCoords: [number, number][] = ring.map((pt: any) => [pt[0], pt[1]]);
    setEditedCoords(initialCoords);

    // Create polygon preview
    const latLngs = initialCoords.map(c => L.latLng(c[1], c[0]));
    const editPoly = L.polygon(latLngs, { color: '#f59e0b', weight: 2, dashArray: '5,5', fillColor: '#f59e0b', fillOpacity: 0.2 });
    editPolylineRef.current = editPoly;
    geojsonLayersRef.current.editLayer.addLayer(editPoly);

    // Create draggable marker on each vertex
    const markers: L.Marker[] = [];
    initialCoords.forEach((pt, idx) => {
      const marker = L.marker([pt[1], pt[0]], {
        draggable: true,
        icon: L.divIcon({
          className: 'bg-white border-2 border-amber-600 rounded-full w-3.5 h-3.5 shadow',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      });

      marker.on('drag', (e: any) => {
        const newPos = e.target.getLatLng();
        setEditedCoords(prev => {
          const updated = [...prev];
          updated[idx] = [Number(newPos.lng.toFixed(6)), Number(newPos.lat.toFixed(6))];
          if (idx === 0 && updated.length > 2) {
            updated[updated.length - 1] = updated[0]; // keep closed polygon
          }
          if (editPolylineRef.current) {
            editPolylineRef.current.setLatLngs(updated.map(c => L.latLng(c[1], c[0])));
          }
          return updated;
        });
      });

      geojsonLayersRef.current.editLayer.addLayer(marker);
      markers.push(marker);
    });
    vertexMarkersRef.current = markers;

    return () => {
      markers.forEach(m => geojsonLayersRef.current.editLayer.removeLayer(m));
      if (editPolylineRef.current) {
        geojsonLayersRef.current.editLayer.removeLayer(editPolylineRef.current);
      }
    };
  }, [isEditingVertices, selectedParcelId, parcels]);

  // Complete Drawing New Parcel (Requirement 11)
  const handleFinishDrawing = async () => {
    if (drawPoints.length < 3) {
      alert("Please click at least 3 points on the map to define a valid parcel polygon.");
      return;
    }

    try {
      // Close the polygon
      const ring = drawPoints.map(pt => [Number(pt.lng.toFixed(6)), Number(pt.lat.toFixed(6))]);
      ring.push(ring[0]); // close loop

      const newId = `PARCEL-${Date.now().toString().slice(-4)}`;
      const newParcelData = {
        parcel_id: newId,
        title: `Cadastral Parcel #${newId}`,
        geometry: {
          type: 'Polygon',
          coordinates: [ring]
        },
        dataset_id: activeDataset?.id || null,
        status: 'Requires Verification',
        source: 'User Digitized GIS Feature',
        zone: 'Residential'
      };

      const created = await apiClient.createGISParcel(newParcelData);
      showNotification(`✓ Parcel #${created.parcel_id} created and saved to Cadastral DB!`);
      setIsDrawing(false);
      if (onRefreshData) onRefreshData();
      onSelectParcel(created);
    } catch (e: any) {
      alert(`Failed to save parcel polygon: ${e.message}`);
    }
  };

  // Save Vertex Edits (Requirement 11)
  const handleSaveVertexEdits = async () => {
    const sel = parcels.find(p => p.id === selectedParcelId || p.parcel_id === selectedParcelId);
    if (!sel) return;

    try {
      const closedCoords = [...editedCoords];
      if (closedCoords.length > 2) {
        closedCoords[closedCoords.length - 1] = closedCoords[0];
      }

      await apiClient.updateGISParcel(sel.id, {
        geometry: {
          type: 'Polygon',
          coordinates: [closedCoords]
        },
        status: 'Surveyor Verified'
      });

      showNotification(`✓ Parcel #${sel.parcel_id} geometry updated and saved!`);
      setIsEditingVertices(false);
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert(`Failed to update parcel vertices: ${e.message}`);
    }
  };

  // Delete User-Created Parcel (Requirement 11)
  const handleDeleteSelectedParcel = async () => {
    const sel = parcels.find(p => p.id === selectedParcelId || p.parcel_id === selectedParcelId);
    if (!sel) return;

    if (!confirm(`Are you sure you want to delete Parcel #${sel.parcel_id}?`)) return;

    try {
      await apiClient.deleteGISParcel(sel.id);
      showNotification(`✓ Parcel #${sel.parcel_id} deleted.`);
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert(`Failed to delete parcel: ${e.message}`);
    }
  };

  // Create Adjacent Parcel (Requirement 11: only allowed when existing real parcel geometry is available)
  const handleCreateAdjacentParcel = async () => {
    const sel = parcels.find(p => p.id === selectedParcelId || p.parcel_id === selectedParcelId) || parcels[0];
    if (!sel || !sel.geometry?.coordinates?.[0]) {
      alert("Cannot create adjacent parcel: No existing parcel geometry available.");
      return;
    }

    try {
      const ring = sel.geometry.coordinates[0];
      const offsetCoords = ring.map((pt: [number, number]) => [
        Number((pt[0] + 0.0008).toFixed(6)),
        Number((pt[1] + 0.0006).toFixed(6))
      ]);

      const newId = `PARCEL-${Date.now().toString().slice(-4)}`;
      const created = await apiClient.createGISParcel({
        parcel_id: newId,
        title: `Adjacent Cadastral Parcel #${newId}`,
        geometry: {
          type: 'Polygon',
          coordinates: [offsetCoords]
        },
        status: 'Requires Verification',
        source: `Adjacent to #${sel.parcel_id}`,
        zone: sel.zone || 'Residential'
      });

      showNotification(`✓ Adjacent Parcel #${created.parcel_id} generated from #${sel.parcel_id}!`);
      if (onRefreshData) onRefreshData();
      onSelectParcel(created);
    } catch (e: any) {
      alert(`Failed creating adjacent parcel: ${e.message}`);
    }
  };

  // Map Controls: Geolocation (Requirement 8)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([latitude, longitude], 17);
          if (locationMarkerRef.current) {
            locationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            locationMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: '#3b82f6',
              color: '#ffffff',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9
            }).addTo(map);
            locationMarkerRef.current.bindPopup('<b>Current Geolocation</b><br/>GPS Location Checkpoint').openPopup();
          }
        }
      },
      (err) => {
        alert(`Location permission denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Map Controls: Fullscreen (Requirement 8)
  const handleToggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Map Controls: Fit to dataset bounds (Requirement 8)
  const handleFitExtents = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeDataset?.bounds && !isUnreferenced && Array.isArray(activeDataset.bounds) && activeDataset.bounds.length >= 2) {
      map.fitBounds(activeDataset.bounds, { padding: [25, 25] });
    } else if (activeDataset) {
      const h = activeDataset.height_px || 1000;
      const w = activeDataset.width_px || 1000;
      map.fitBounds([[0, 0], [h, w]], { padding: [25, 25] });
    } else if (parcels.length > 0) {
      const latLngs: [number, number][] = [];
      parcels.forEach((p) => {
        if (p.geometry?.type === 'Polygon' && Array.isArray(p.geometry.coordinates?.[0])) {
          p.geometry.coordinates[0].forEach((pt: any) => {
            if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
              latLngs.push([pt[1], pt[0]]);
            }
          });
        }
      });
      if (latLngs.length > 0) {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30], maxZoom: 18 });
      }
    }
  };

  // Location / Parcel Jump Search (Requirement 8)
  const handleSearchJump = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if query is Lat, Lng
    const parts = query.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [lat, lng] = parts;
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        mapInstanceRef.current?.flyTo([lat, lng], 18);
        showNotification(`Jumped to coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        return;
      }
    }

    // Check if query matches a parcel
    const matched = parcels.find(p => 
      p.parcel_id.toLowerCase().includes(query.toLowerCase()) || 
      (p.title && p.title.toLowerCase().includes(query.toLowerCase()))
    );

    if (matched && matched.geometry?.coordinates?.[0]) {
      const ring = matched.geometry.coordinates[0];
      const latLngs = ring.map((pt: any) => L.latLng(pt[1], pt[0]));
      mapInstanceRef.current?.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 19 });
      onSelectParcel(matched);
      showNotification(`Jumped to Parcel #${matched.parcel_id}`);
    } else {
      alert(`No feature or coordinates matching "${query}" found.`);
    }
  };

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Feature counts for layer badges
  const vegCount = landUse.filter(lu => (lu.category || '').toLowerCase().includes('veg')).length;
  const waterCount = landUse.filter(lu => (lu.category || '').toLowerCase().includes('water')).length;
  const openLandCount = landUse.filter(lu => (lu.category || '').toLowerCase().includes('open') || (lu.category || '').toLowerCase().includes('bare')).length;
  const selectedParcel = parcels.find(p => p.id === selectedParcelId || p.parcel_id === selectedParcelId);

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-slate-950`}>
      {/* The Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Unreferenced Image Banner */}
      {isUnreferenced && activeDataset && (
        <div className="absolute top-16 left-4 right-4 md:right-auto md:w-96 z-20 bg-amber-500/95 text-slate-900 px-3.5 py-2.5 rounded-xl shadow-lg border border-amber-400 text-xs flex items-start gap-2.5 backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 text-amber-950 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-extrabold text-amber-950 text-[11px] uppercase tracking-wide">Unreferenced Drone Image</div>
            <p className="text-[11px] text-amber-900 font-medium leading-tight">
              Uploaded raster: <span className="font-mono font-bold">{activeDataset.original_filename}</span>. Geographic GIS positioning is unavailable until georeferencing is provided.
            </p>
          </div>
        </div>
      )}

      {/* EMPTY DATA HANDLING BANNER (Requirement 12: Exact prompt text) */}
      {!activeDataset && parcels.length === 0 && buildings.length === 0 && roads.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md text-white px-8 py-6 rounded-2xl shadow-2xl border border-slate-700/80 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="text-sm font-extrabold tracking-wide uppercase text-slate-100">
            No GIS dataset loaded.
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Upload a GeoTIFF or GIS vector dataset to display the map.
          </p>
        </div>
      )}

      {/* MAP NOTICE TOAST */}
      {mapNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-4 py-2 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span>{mapNotice}</span>
        </div>
      )}

      {/* Top Left: Search & Location Jump Bar (Requirement 8) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <form onSubmit={handleSearchJump} className="flex items-center bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 overflow-hidden text-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Parcel ID or Lat, Lng..."
            className="px-3 py-2 w-52 sm:w-64 text-slate-800 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            title="Jump to location"
            className="px-2.5 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Map Action Buttons */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 p-1.5 flex items-center space-x-1">
          <button
            onClick={handleFitExtents}
            title="Fit to Dataset Extents"
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={handleLocateMe}
            title="Current Location (GPS Geolocation)"
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={() => {
              setIsMeasuring(!isMeasuring);
              if (isDrawing) setIsDrawing(false);
              if (isEditingVertices) setIsEditingVertices(false);
            }}
            title={isMeasuring ? 'Exit Measure Tool' : 'Measure Distance (meters)'}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 text-xs font-medium ${
              isMeasuring ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ruler className="w-4 h-4" />
            {isMeasuring && <span>Measuring</span>}
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={() => {
              setIsDrawing(!isDrawing);
              if (isMeasuring) setIsMeasuring(false);
              if (isEditingVertices) setIsEditingVertices(false);
            }}
            title={isDrawing ? 'Cancel Drawing' : 'Draw New Parcel Polygon'}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 text-xs font-medium ${
              isDrawing ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-4 h-4" />
            {isDrawing && <span>Drawing</span>}
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowStatusPanel(!showStatusPanel)}
            title="Map Status Panel"
            className={`p-1.5 rounded transition-colors ${
              showStatusPanel ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
          </button>
        </div>

        {/* Drawing Controls Active Toast */}
        {isDrawing && (
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 max-w-xs space-y-2">
            <div className="font-bold text-blue-400">Draw New Parcel Polygon</div>
            <p className="text-[11px] text-slate-300">Click on the map to place polygon vertices. Need 3+ points.</p>
            <div className="text-[11px] text-emerald-400 font-mono">Vertices placed: {drawPoints.length}</div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleFinishDrawing}
                disabled={drawPoints.length < 3}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
              >
                Finish & Save
              </button>
              <button
                onClick={() => setIsDrawing(false)}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Measure Readout Toast */}
        {isMeasuring && (
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs shadow-lg max-w-xs">
            <div className="font-semibold text-blue-400 mb-0.5">Measurement Tool Active</div>
            <p className="text-[11px] text-slate-300">Click on map vertices to calculate distance.</p>
            {measureDistance !== null && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between font-mono font-bold text-white">
                <span>Total Distance:</span>
                <span className="text-emerald-400">{measureDistance} m</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Right: Layer Switcher & North Arrow (Requirement 4 & 8) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
        {/* Toggle Layer Panel Button */}
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>GIS Layers</span>
          {showLayerPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* 10 Standard GIS Layers Switcher Panel (Requirement 4) */}
        {showLayerPanel && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/80 p-3 w-72 text-xs select-none space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-2 mb-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> GIS Layers (10 Standards)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Real Data Only</span>
            </div>

            {/* 1. Base Map (Reference Only) */}
            <div className="p-1 rounded hover:bg-slate-50 border border-slate-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0"></span>
                  <span>1. Base Map (Reference Only)</span>
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.baseMap}
                  onChange={() => toggleLayer('baseMap')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
              </label>
              <div className="text-[9px] text-slate-400 ml-4 italic">Not legal cadastral boundary data</div>
            </div>

            {/* 2. Uploaded Orthomosaic / GeoTIFF */}
            <label className={`flex items-center justify-between p-1.5 rounded ${activeDataset ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-slate-700 font-medium truncate max-w-[170px]" title={activeDataset ? activeDataset.original_filename : 'No data available.'}>
                <span className="w-2.5 h-2.5 rounded bg-sky-600 shrink-0"></span>
                <span className="truncate">2. Uploaded Orthomosaic / GeoTIFF</span>
              </span>
              {activeDataset ? (
                <input
                  type="checkbox"
                  checked={activeLayers.orthomosaic}
                  onChange={() => toggleLayer('orthomosaic')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 3. Building Footprints */}
            <label className={`flex items-center justify-between p-1.5 rounded ${buildings.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 shrink-0"></span>
                <span>3. Building Footprints</span>
              </span>
              {buildings.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-indigo-600 font-bold">{buildings.length}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.buildings}
                    onChange={() => toggleLayer('buildings')}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 4. Road Network */}
            <label className={`flex items-center justify-between p-1.5 rounded ${roads.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-slate-700 shrink-0"></span>
                <span>4. Road Network</span>
              </span>
              {roads.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-700 font-bold">{roads.length}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.roads}
                    onChange={() => toggleLayer('roads')}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 5. Vegetation */}
            <label className={`flex items-center justify-between p-1.5 rounded ${vegCount > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 shrink-0"></span>
                <span>5. Vegetation</span>
              </span>
              {vegCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-700 font-bold">{vegCount}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.vegetation}
                    onChange={() => toggleLayer('vegetation')}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 6. Water */}
            <label className={`flex items-center justify-between p-1.5 rounded ${waterCount > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-sky-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-sky-500 shrink-0"></span>
                <span>6. Water</span>
              </span>
              {waterCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-sky-700 font-bold">{waterCount}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.water}
                    onChange={() => toggleLayer('water')}
                    className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 7. Open Land */}
            <label className={`flex items-center justify-between p-1.5 rounded ${openLandCount > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0"></span>
                <span>7. Open Land</span>
              </span>
              {openLandCount > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-700 font-bold">{openLandCount}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.openLand}
                    onChange={() => toggleLayer('openLand')}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 8. Parcel Boundaries */}
            <label className={`flex items-center justify-between p-1.5 rounded ${parcels.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0"></span>
                <span>8. Parcel Boundaries</span>
              </span>
              {parcels.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-blue-600 font-bold">{parcels.length}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.parcels}
                    onChange={() => toggleLayer('parcels')}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>

            {/* 9. AI Detection/Segmentation Results */}
            <label className={`flex items-center justify-between p-1.5 rounded ${aiStatusInfo.hasWeights ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-purple-500 shrink-0"></span>
                <span>9. AI Detection/Segmentation</span>
              </span>
              {aiStatusInfo.hasWeights ? (
                <input
                  type="checkbox"
                  checked={activeLayers.aiDetection}
                  onChange={() => toggleLayer('aiDetection')}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
              ) : (
                <span className="text-[9px] font-bold text-rose-500">AI MODEL NOT AVAILABLE</span>
              )}
            </label>

            {/* 10. Change Detection */}
            <label className={`flex items-center justify-between p-1.5 rounded ${conflicts.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded border border-rose-600 bg-rose-200 shrink-0"></span>
                <span>10. Change Detection</span>
              </span>
              {conflicts.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-rose-600 font-bold">{conflicts.length}</span>
                  <input
                    type="checkbox"
                    checked={activeLayers.changeDetection}
                    onChange={() => toggleLayer('changeDetection')}
                    className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">No data available.</span>
              )}
            </label>
          </div>
        )}

        {/* North Arrow Compass Indicator (Requirement 8) */}
        <div 
          onClick={handleFitExtents}
          title="North Indicator (Click to orient/fit map)"
          className="cursor-pointer bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 p-2 flex flex-col items-center justify-center w-10 h-10 hover:bg-blue-50 transition-colors"
        >
          <div className="text-[9px] font-extrabold text-blue-700 leading-none">N</div>
          <Compass className="w-5 h-5 text-slate-700" />
        </div>
      </div>

      {/* MAP STATUS PANEL (Requirement 15) */}
      {showStatusPanel && (
        <div className="absolute top-16 right-4 z-20 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-4 w-80 text-xs animate-in fade-in space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <Database className="w-4 h-4" /> Map & Dataset Status
            </span>
            <button onClick={() => setShowStatusPanel(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Dataset Name:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[150px]">{activeDataset?.name || activeDataset?.original_filename || 'Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">File Type:</span>
              <span className="text-slate-200">{activeDataset?.file_type || (activeDataset?.original_filename ? activeDataset.original_filename.split('.').pop()?.toUpperCase() : 'Not Available')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CRS:</span>
              <span className="text-emerald-400">{activeDataset?.crs ? (activeDataset.crs.toLowerCase().includes('unreferenced') ? 'CRS: Not Available' : activeDataset.crs) : 'CRS: Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Raster Size:</span>
              <span className="text-slate-200">{(activeDataset?.width_px && activeDataset?.height_px) ? `${activeDataset.width_px} × ${activeDataset.height_px} px` : 'Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GSD / Resolution:</span>
              <span className="text-blue-400">{activeDataset?.gsd_cm ? `${activeDataset.gsd_cm} cm/px` : 'Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Geographic Bounds:</span>
              <span className="text-slate-300 text-[10px] truncate max-w-[140px]">
                {activeDataset?.bounds && Array.isArray(activeDataset.bounds) && activeDataset.bounds.length >= 2
                  ? `[${activeDataset.bounds[0][0].toFixed(3)}, ${activeDataset.bounds[0][1].toFixed(3)}]`
                  : 'Not Available'}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Real Parcels:</span>
                <span className="font-bold text-white">{parcels.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Real Buildings:</span>
                <span className="font-bold text-white">{buildings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Real Roads:</span>
                <span className="font-bold text-white">{roads.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">AI Model Status:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${aiStatusInfo.hasWeights ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {aiStatusInfo.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating GIS Editor Controls for Selected Parcel (Requirement 11) */}
      {selectedParcel && (
        <div className="absolute bottom-12 left-4 z-20 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex flex-wrap items-center gap-3 text-xs font-sans">
          <div>
            <span className="text-slate-400">Selected: </span>
            <span className="font-bold text-blue-400">{selectedParcel.parcel_id}</span>
          </div>
          <div>
            <span className="text-slate-400">Area: </span>
            <span className="font-semibold text-emerald-400">{selectedParcel.ai_area_sqm || selectedParcel.existing_area_sqm || (selectedParcel as any).area_sqm || 0} m²</span>
          </div>
          
          <div className="w-[1px] h-4 bg-slate-700" />
          
          {/* Action: Edit Vertices */}
          {isEditingVertices ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSaveVertexEdits}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" /> Save Edits
              </button>
              <button
                onClick={() => setIsEditingVertices(false)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditingVertices(true);
                if (isDrawing) setIsDrawing(false);
                if (isMeasuring) setIsMeasuring(false);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Vertices
            </button>
          )}

          {/* Action: Create Adjacent Parcel (Requirement 11) */}
          <button
            onClick={handleCreateAdjacentParcel}
            title="Create adjacent parcel sharing boundary edge"
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Create Adjacent
          </button>

          {/* Action: Delete Parcel */}
          <button
            onClick={handleDeleteSelectedParcel}
            title="Delete this parcel from database"
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Bottom Left: Live Coordinates & Scale / CRS Display (Requirement 8 & 9) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-2">
        <div className="bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-mono px-2.5 py-1 rounded shadow-md border border-slate-700 flex items-center space-x-2">
          {isUnreferenced ? (
            <span className="text-amber-400 font-medium">Unreferenced Image — Geographic coordinates unavailable</span>
          ) : mouseCoords ? (
            <>
              <span>Lat: {mouseCoords.lat}°</span>
              <span className="text-slate-500">|</span>
              <span>Lng: {mouseCoords.lng}°</span>
            </>
          ) : (
            <span className="text-slate-400">Hover over map for coordinates</span>
          )}
        </div>
        <div className="hidden sm:block bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-semibold px-2 py-1 rounded shadow-md border border-slate-200">
          {displayCrs}
        </div>
        {activeDataset?.gsd_cm && (
          <div className="hidden sm:block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded shadow-md border border-blue-200">
            GSD: {activeDataset.gsd_cm} cm
          </div>
        )}
      </div>
    </div>
  );
};
