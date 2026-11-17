"use client";

import { formatMoney } from "@/lib/locale";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import PropertyEditor from "@/components/PropertyEditor";
import { useGetManagedPropertyQuery, useGetPropertyLeasesQuery } from "@/state/api";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ManageProperty() {
  const { id } = useParams();
  const propertyId = Number(id);
  const validId = Number.isSafeInteger(propertyId) && propertyId > 0;
  const { data: property, isLoading, error, refetch } = useGetManagedPropertyQuery(propertyId, { skip: !validId });
  const { data: leases, isLoading: leasesLoading, error: leasesError } = useGetPropertyLeasesQuery(propertyId, { skip: !property });

  if (isLoading) return <Loading />;
  if (!validId || error || !property) return <div className="dashboard-container space-y-4"><p role="alert">Não foi possível abrir este anúncio. Verifique se pertence à sua conta.</p>{validId && <button className="underline" onClick={refetch}>Tentar novamente</button>}<p><Link href="/managers/properties" className="underline">Voltar aos meus imóveis</Link></p></div>;

  return <div className="dashboard-container space-y-6">
    <Link href="/managers/properties" className="inline-block underline">Voltar aos meus imóveis</Link>
    <Header title={property.name} subtitle="Gerir o seu anúncio de arrendamento mensal" />
    <PropertyEditor key={property.id} property={property} />
    <section className="bg-white rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold">Candidaturas e contratos</h2>
      <p>A aprovação de uma candidatura indica interesse. Não cria um contrato nem cobra qualquer pagamento.</p>
      <Link href="/managers/applications" className="underline">Consultar candidaturas</Link>
      <h3 className="font-semibold pt-4">Contratos já registados</h3>
      {leasesLoading ? <p>A carregar contratos…</p> : leasesError ? <p role="alert">Não foi possível carregar os contratos.</p> : leases?.length ? <ul className="space-y-4">{leases.map(lease => <li key={lease.id} className="border rounded-lg p-4">
        <p className="font-medium">{lease.tenant.name}</p>
        <p>{new Date(lease.startDate).toLocaleDateString("pt-MZ")} a {new Date(lease.endDate).toLocaleDateString("pt-MZ")} · {formatMoney(lease.rent)}/mês</p>
        <p>{lease.tenant.email} · {lease.tenant.phoneNumber}</p>
      </li>)}</ul> : <p className="text-gray-600">Ainda não há contratos registados para este imóvel.</p>}
    </section>
  </div>;
}
