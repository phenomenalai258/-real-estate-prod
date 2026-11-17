"use client";

import { CustomFormField } from "@/components/FormField";
import Header from "@/components/Header";
import { Form } from "@/components/ui/form";
import { PropertyFormData, propertySchema } from "@/lib/schemas";
import { useCreatePropertyMutation, useGetAuthUserQuery } from "@/state/api";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { formatEnumString } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NewProperty = () => {
  const [createProperty, { isLoading: isSaving }] = useCreatePropertyMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      description: "",
      pricePerMonth: 15000,
      securityDeposit: 0,
      applicationFee: 0,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: "",
      highlights: "",
      beds: 1,
      baths: 1,
      squareFeet: 100,
      address: "",
      city: "Maputo",
      state: "Maputo",
      country: "Moçambique",
      postalCode: "",
      latitude: -25.9692,
      longitude: 32.5732,
    },
  });

  const onSubmit = async (data: PropertyFormData) => {
    if (!authUser?.cognitoInfo?.userId) {
      throw new Error("No manager ID found");
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "photoUrls") {
        const files = value as File[];
        files.forEach((file: File) => {
          formData.append("photos", file);
        });
      } else if (key === "squareFeet") {
        formData.append(key, String(Math.round(Number(value) / 0.09290304)));
      } else if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    formData.append("managerCognitoId", authUser.cognitoInfo.userId);

    try {
      await createProperty(formData).unwrap();
      form.reset();
    } catch {
      form.setError("root", { message: "Não foi possível publicar. Verifique os dados e tente novamente." });
    }
  };

  return (
    <div className="dashboard-container">
      <Header
        title="Publicar imóvel"
        subtitle="Adicione as fotografias, localização e condições do arrendamento mensal"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Informação básica</h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Nome do imóvel" />
                <CustomFormField
                  name="description"
                  label="Descrição"
                  type="textarea"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Valores indicados pelo proprietário</h2>
              <CustomFormField
                name="pricePerMonth"
                label="Renda mensal (MT)"
                type="number"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  name="securityDeposit"
                  label="Caução (MT)"
                  type="number"
                />
                <CustomFormField
                  name="applicationFee"
                  label="Taxa de candidatura (MT)"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Detalhes do imóvel</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField
                  name="beds"
                  label="Quartos"
                  type="number"
                />
                <CustomFormField
                  name="baths"
                  label="Casas de banho"
                  type="number"
                />
                <CustomFormField
                  name="squareFeet"
                  label="Área (m²)"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField
                  name="isPetsAllowed"
                  label="Aceita animais"
                  type="switch"
                />
                <CustomFormField
                  name="isParkingIncluded"
                  label="Estacionamento incluído"
                  type="switch"
                />
              </div>
              <div className="mt-4">
                <CustomFormField
                  name="propertyType"
                  label="Tipo de imóvel"
                  type="select"
                  options={Object.keys(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: formatEnumString(type),
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Comodidades e destaques */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Comodidades e destaques
              </h2>
              <div className="space-y-6">
                <CustomFormField
                  name="amenities"
                  label="Amenities"
                  type="select"
                  options={Object.keys(AmenityEnum).map((amenity) => ({
                    value: amenity,
                    label: formatEnumString(amenity),
                  }))}
                />
                <CustomFormField
                  name="highlights"
                  label="Highlights"
                  type="select"
                  options={Object.keys(HighlightEnum).map((highlight) => ({
                    value: highlight,
                    label: formatEnumString(highlight),
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Fotografias</h2>
              <CustomFormField
                name="photoUrls"
                label="Fotografias do imóvel"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Localização */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Localização
              </h2>
              <CustomFormField name="address" label="Endereço" />
              <div className="flex justify-between gap-4">
                <CustomFormField name="city" label="Cidade" className="w-full" />
                <CustomFormField
                  name="state"
                  label="Província"
                  className="w-full"
                />
                <CustomFormField
                  name="postalCode"
                  label="Código postal (opcional)"
                  className="w-full"
                />
              </div>
              <CustomFormField name="country" label="País" />
              <p>Confirme a localização exacta do imóvel: as coordenadas iniciais indicam o centro de Maputo.</p>
              <CustomFormField name="latitude" label="Latitude" type="number" />
              <CustomFormField name="longitude" label="Longitude" type="number" />
            </div>

            {form.formState.errors.root && <p role="alert">{form.formState.errors.root.message}</p>}
            <Button
              disabled={isSaving}
              type="submit"
              className="bg-primary-700 text-white w-full mt-8"
            >
              Publicar imóvel
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewProperty;
