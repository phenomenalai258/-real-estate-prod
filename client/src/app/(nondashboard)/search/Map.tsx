"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import { formatMoney } from "@/lib/locale";

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
export default function Map() {
  const container = useRef<HTMLDivElement>(null);
  const filters = useAppSelector(state => state.global.filters);
  const { data: properties, isLoading, isError } = useGetPropertiesQuery(filters);
  useEffect(() => {
    if (!token || !container.current || !properties) return;
    const map = new mapboxgl.Map({ container: container.current, accessToken: token, style: "mapbox://styles/mapbox/streets-v12", center: filters.coordinates, zoom: 11 });
    properties.forEach(property => {
      const node = document.createElement("div");
      const link = document.createElement("a");
      link.href = "/search/" + property.id;
      // User content must never enter setHTML: prevents stored XSS.
      link.textContent = property.name;
      const price = document.createElement("p");
      price.textContent = formatMoney(property.pricePerMonth) + " / mês";
      node.append(link, price);
      new mapboxgl.Marker().setLngLat([property.location.coordinates.longitude, property.location.coordinates.latitude])
        .setPopup(new mapboxgl.Popup().setDOMContent(node)).addTo(map);
    });
    return () => map.remove();
  }, [properties, filters.coordinates]);
  if (!token) return <aside className="p-6 text-sm">O mapa estará disponível em breve. Consulte a localização nos anúncios.</aside>;
  if (isLoading) return <p>A carregar mapa…</p>;
  if (isError) return <p>Não foi possível carregar o mapa.</p>;
  return <div ref={container} className="basis-5/12 grow min-h-80 rounded-xl" />;
}
