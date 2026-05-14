import { useEffect, useRef } from "react";
import L, { type Layer } from "leaflet";
import type { Feature } from "geojson";
import "leaflet/dist/leaflet.css";
import { SINNOH_OVERWORLD_GEOJSON } from "../../data/sinnoh-map-regions";
import { useDexStore } from "../../store/useDexStore";
import type { RouteData } from "../../hooks/useRouteIndex";

interface Props {
  routeIndex: Map<string, RouteData>;
  activeRoute: string | null;
  onRouteClick: (slug: string) => void;
  searchQuery: string;
  activeGeneration: number;
}

const TILE_URL = "https://pkmnmap4.web.app/tilesets/overworld/{z}/{y}/{x}.png";
const MAP_BOUNDS = L.latLngBounds(L.latLng(-128, 0), L.latLng(0, 256));
const INITIAL_CENTER: L.LatLngExpression = [-64, 128];
const INITIAL_ZOOM = 2;

function regionStyle(slug: string | null, routeIndex: Map<string, RouteData>, caughtSet: Set<number>, activeRoute: string | null, searchQuery: string): L.PathOptions {
  const isActive = slug !== null && slug === activeRoute;
  const q = searchQuery.trim().toLowerCase();
  const routeData = slug ? routeIndex.get(slug) : null;

  // Count unique Pokémon on this route
  let total = 0;
  let caught = 0;
  if (routeData) {
    const uniqueIds = new Set<number>();
    for (const methodMap of routeData.games.values()) {
      for (const entries of methodMap.values()) {
        for (const e of entries) uniqueIds.add(e.pokemonId);
      }
    }
    total = uniqueIds.size;
    caught = [...uniqueIds].filter((id) => caughtSet.has(id)).length;
  }

  // Search dimming
  const matchesSearch = !q || (routeData?.displayName.toLowerCase().includes(q) ?? false);
  const dim = q.length > 0 && !matchesSearch;

  let fillColor: string;
  let fillOpacity: number;
  let weight: number;
  let color: string;

  if (isActive) {
    fillColor = "#6366f1"; // indigo-500
    fillOpacity = 0.55;
    weight = 2;
    color = "#ffffff";
  } else if (total > 0 && caught === total) {
    fillColor = "#22c55e"; // green-500
    fillOpacity = 0.45;
    weight = 1;
    color = "#22c55e";
  } else if (total > 0 && caught > 0) {
    fillColor = "#6366f1"; // indigo-500
    fillOpacity = 0.3;
    weight = 1;
    color = "#6366f1";
  } else {
    fillColor = "#6b7280"; // gray-500
    fillOpacity = 0.18;
    weight = 1;
    color = "#6b7280";
  }

  return {
    fillColor,
    fillOpacity: dim ? fillOpacity * 0.25 : fillOpacity,
    color: dim ? "#374151" : color,
    weight: isActive ? weight + 1 : weight,
    opacity: dim ? 0.3 : 0.8,
  };
}

export default function SinnohMap({ routeIndex, activeRoute, onRouteClick, searchQuery, activeGeneration }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  const caughtByGen = useDexStore((s) => s.caughtByGen);
  const caughtSet = new Set<number>(caughtByGen[activeGeneration] ?? []);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: INITIAL_ZOOM,
      maxZoom: 7,
      maxBounds: L.latLngBounds(
        L.latLng(MAP_BOUNDS.getSouth() - 20, MAP_BOUNDS.getWest() - 20),
        L.latLng(MAP_BOUNDS.getNorth() + 20, MAP_BOUNDS.getEast() + 20)
      ),
      maxBoundsViscosity: 1.0,
      doubleClickZoom: false,
      zoomControl: true,
      attributionControl: false,
    });

    map.setView(INITIAL_CENTER, INITIAL_ZOOM);

    L.tileLayer(TILE_URL, {
      tms: false,
      tileSize: 256,
      bounds: MAP_BOUNDS,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON layer when deps change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
    }

    const layer = L.geoJSON(SINNOH_OVERWORLD_GEOJSON, {
      style: (feature: Feature | undefined) => {
        const slug = (feature?.properties?.slug as string | null) ?? null;
        return regionStyle(slug, routeIndex, caughtSet, activeRoute, searchQuery);
      },
      onEachFeature: (feature: Feature, featureLayer: Layer) => {
        const slug = feature.properties?.slug as string | null;
        const name = feature.properties?.name as string;
        const routeData = slug ? routeIndex.get(slug) : null;

        // Tooltip
        const uniqueIds = new Set<number>();
        if (routeData) {
          for (const methodMap of routeData.games.values()) {
            for (const entries of methodMap.values()) {
              for (const e of entries) uniqueIds.add(e.pokemonId);
            }
          }
        }
        const total = uniqueIds.size;
        const caught = [...uniqueIds].filter((id) => caughtSet.has(id)).length;
        const tooltip = total > 0 ? `${name} — ${caught}/${total} caught` : name;

        featureLayer.bindTooltip(tooltip, {
          sticky: true,
          className: "sinnoh-map-tooltip",
        });

        if (slug) {
          featureLayer.on("click", () => onRouteClick(slug));
        }

        featureLayer.on("mouseover", function () {
          if (slug !== activeRoute) {
            (featureLayer as L.Path).setStyle({ fillOpacity: Math.min(0.7, (featureLayer as L.Path).options.fillOpacity! + 0.15) });
          }
        });
        featureLayer.on("mouseout", function () {
          layer.resetStyle(featureLayer as L.Path);
        });
      },
    });

    layer.addTo(map);
    geoLayerRef.current = layer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeIndex, activeRoute, searchQuery, caughtByGen, activeGeneration]);

  return (
    <>
      <style>{`
        .leaflet-container { background: #030712; }
        .leaflet-control-zoom { border: 1px solid #374151 !important; box-shadow: none !important; }
        .leaflet-control-zoom a { background: #111827 !important; color: #d1d5db !important; border-color: #374151 !important; }
        .leaflet-control-zoom a:hover { background: #1f2937 !important; color: #ffffff !important; }
        .sinnoh-map-tooltip { background: #111827; border: 1px solid #374151; color: #f3f4f6; font-size: 12px; padding: 4px 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.6); }
        .sinnoh-map-tooltip::before { display: none; }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ minHeight: 400 }}
      />
    </>
  );
}
