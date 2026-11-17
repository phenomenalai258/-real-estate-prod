"use client";

import { useGetAuthUserQuery, useGetPropertyQuery } from "@/state/api";
import Link from "next/link";
import Loading from "@/components/Loading";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import ImagePreviews from "./ImagePreviews";
import PropertyOverview from "./PropertyOverview";
import PropertyDetails from "./PropertyDetails";
import PropertyLocation from "./PropertyLocation";
import ContactWidget from "./ContactWidget";
import ApplicationModal from "./ApplicationModal";

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: authUser } = useGetAuthUserQuery();
  const validId = Number.isSafeInteger(propertyId) && propertyId > 0;
  const { data: property, isLoading, error } = useGetPropertyQuery(propertyId, { skip: !validId });

  if (isLoading) return <Loading />;
  if (!validId || error || !property) return <div className="mx-auto max-w-xl p-8 space-y-4"><h1 className="text-2xl font-semibold">Anúncio indisponível</h1><p>Não foi possível abrir este anúncio. Pode ter sido retirado ou existir uma falha temporária.</p><Link className="underline" href="/search">Pesquisar outros imóveis</Link></div>;

  return (
    <div>
      <ImagePreviews
        key={property.photoUrls.join("|")}
        images={property.photoUrls}
      />
      <div className="flex flex-col md:flex-row justify-center gap-10 mx-10 md:w-2/3 md:mx-auto mt-16 mb-8">
        <div className="order-2 md:order-1">
          <PropertyOverview propertyId={propertyId} />
          <PropertyDetails propertyId={propertyId} />
          <PropertyLocation propertyId={propertyId} />
        </div>

        <div className="order-1 md:order-2">
          <ContactWidget onOpenModal={() => setIsModalOpen(true)} />
        </div>
      </div>

      {authUser && (
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyId}
        />
      )}
    </div>
  );
};

export default SingleListing;
