"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function HeroSection() {
  const [location, setLocation] = useState("Maputo");
  const router = useRouter();
  return <section className="relative min-h-[650px] flex items-center justify-center px-6">
    <Image src="/landing-splash.jpg" alt="" fill priority className="object-cover" />
    <div className="absolute inset-0 bg-black/65" />
    <div className="relative max-w-3xl text-center text-white">
      <p className="mb-5 uppercase tracking-widest">socasas · Moçambique</p>
      <h1 className="text-4xl md:text-6xl font-bold">O seu próximo lar começa aqui.</h1>
      <p className="text-xl mt-6">Encontre imóveis para arrendamento mensal em Maputo. Compare rendas em meticais e contacte o proprietário através de uma candidatura.</p>
      <form className="mt-10 flex gap-2" onSubmit={e => { e.preventDefault(); router.push("/search?location=" + encodeURIComponent(location.trim() || "Maputo")); }}>
        <input aria-label="Cidade ou bairro" value={location} onChange={e => setLocation(e.target.value)} className="min-w-0 grow rounded-lg p-4 text-black" placeholder="Cidade ou bairro" />
        <button className="rounded-lg bg-secondary-600 px-6 font-semibold">Pesquisar</button>
      </form>
    </div>
  </section>;
}
