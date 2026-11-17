import Link from "next/link";
export default function FeaturesSection() {
  return <section className="max-w-6xl mx-auto py-20 px-6">
    <h2 className="text-3xl font-bold mb-10">Arrendar, passo a passo</h2>
    <div className="grid md:grid-cols-3 gap-10">
      <div><p className="text-secondary-600 font-bold">01</p><h3 className="text-xl font-semibold my-3">Encontre um imóvel</h3><p>Pesquise por localização, renda mensal, quartos e área em metros quadrados.</p></div>
      <div><p className="text-secondary-600 font-bold">02</p><h3 className="text-xl font-semibold my-3">Envie a sua candidatura</h3><p>Apresente-se ao proprietário e deixe os seus contactos para combinar uma visita.</p></div>
      <div><p className="text-secondary-600 font-bold">03</p><h3 className="text-xl font-semibold my-3">Combine as condições</h3><p>A aprovação permite avançar na conversa. O contrato e o pagamento são combinados entre as partes.</p></div>
    </div><Link href="/search" className="inline-block mt-10 font-semibold underline">Pesquisar imóveis</Link>
  </section>;
}
