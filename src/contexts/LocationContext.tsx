import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { CITIES } from "@/data/mock";

type PermissionState = "granted" | "denied" | "prompt" | "unknown";

interface LocationContextType {
  coords: { lat: number; lng: number } | null;
  /** Precisão da última leitura de GPS, em metros. */
  accuracy: number | null;
  loading: boolean;
  hasLocation: boolean;
  city: string;
  permissionState: PermissionState;
  getDistance: (lat: number, lng: number) => string | null;
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const watchIdRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  const stopLoading = useCallback(() => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setLoading(false);
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) return;
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy && pos.coords.accuracy > 200) return;
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
          setPermissionState("granted");
          stopLoading();
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState("denied");
            stopLoading();
          }
          // outros erros (timeout/unavailable) — segue tentando
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
      );
      watchIdRef.current = id;
    } catch {
      /* ignore */
    }
  }, [stopLoading]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      stopLoading();
      return;
    }
    setLoading(true);
    // Failsafe: nunca deixar loading travado mais que 12s
    if (loadingTimeoutRef.current !== null) window.clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      loadingTimeoutRef.current = null;
    }, 12000);

    // 1. Tentativa rápida (cache permitido, baixa precisão)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
        setPermissionState("granted");
        stopLoading();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          stopLoading();
        }
        // se for timeout/unavailable, o watchPosition abaixo cuida
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 },
    );

    // 2. Watch contínuo de alta precisão em paralelo
    startWatch();
  }, [stopLoading, startWatch]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    // Verifica permissão (quando suportado) antes de pedir
    const permApi = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (permApi?.query) {
      permApi
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          const map: Record<string, PermissionState> = {
            granted: "granted",
            denied: "denied",
            prompt: "prompt",
          };
          setPermissionState(map[status.state] ?? "unknown");
          status.onchange = () => {
            setPermissionState(map[status.state] ?? "unknown");
            if (status.state === "granted") requestLocation();
            if (status.state === "denied") stopLoading();
          };
          if (status.state !== "denied") {
            requestLocation();
          } else {
            stopLoading();
          }
        })
        .catch(() => requestLocation());
    } else {
      requestLocation();
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDistance = useCallback(
    (lat: number, lng: number): string | null => {
      if (!coords) return null;
      const d = haversine(coords.lat, coords.lng, lat, lng);
      return `${d.toFixed(1)} km`;
    },
    [coords],
  );

  const city = coords
    ? haversine(coords.lat, coords.lng, CITIES.gramado.latitude, CITIES.gramado.longitude) <=
      haversine(coords.lat, coords.lng, CITIES.canela.latitude, CITIES.canela.longitude)
      ? "Gramado"
      : "Canela"
    : "Gramado";

  return (
    <LocationContext.Provider
      value={{
        coords,
        accuracy,
        loading,
        hasLocation: !!coords,
        city,
        permissionState,
        getDistance,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
