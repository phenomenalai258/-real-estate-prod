"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from "@/state/api";
import React from "react";
import Link from "next/link";

const Properties = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId,
  });

  if (isLoading) return <Loading />;
  if (error) return <div className="dashboard-container" role="alert">Não foi possível carregar os seus imóveis. Actualize a página para tentar novamente.</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="Os meus imóveis"
        subtitle="Consulte, edite e retire os seus anúncios de arrendamento mensal"
      />
      <Link href="/managers/newproperty" className="inline-block mb-6 underline">Publicar um imóvel</Link>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {managerProperties?.map((property) => (
          <div key={property.id} className="space-y-2">
          <p className="text-sm font-medium">{property.isPublished ? "Publicado" : "Retirado da pesquisa"}</p>
          <Card
            property={property}
            isFavorite={false}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/managers/properties/${property.id}`}
          />
          <Link className="inline-block underline" href={`/managers/properties/${property.id}`}>Gerir anúncio</Link>
          </div>
        ))}
      </div>
      {(!managerProperties || managerProperties.length === 0) && (
        <p>Ainda não publicou imóveis. Comece por adicionar o seu primeiro anúncio.</p>
      )}
    </div>
  );
};

export default Properties;
