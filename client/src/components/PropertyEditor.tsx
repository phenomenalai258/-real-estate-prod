"use client";

import { useState } from "react";
import { Property } from "@/types/prismaTypes";
import { PropertyChanges, useUpdatePropertyMutation } from "@/state/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export default function PropertyEditor({ property }: { property: Property }) {
  const [update, { isLoading }] = useUpdatePropertyMutation();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);

  async function save(changes: PropertyChanges) {
    setNotice(""); setError("");
    try {
      await update({ id: property.id, changes }).unwrap();
      setConfirmWithdrawal(false);
      setNotice(changes.isPublished === false ? "Anúncio retirado da pesquisa. As candidaturas existentes foram mantidas." : changes.isPublished === true ? "Anúncio novamente publicado." : "Alterações guardadas.");
    } catch (failure) {
      const detail = failure as { data?: { message?: string } };
      setError(detail.data?.message || "Não foi possível guardar. Tente novamente; os dados do formulário foram mantidos.");
    }
  }

  return <section className="rounded-xl bg-white p-6 shadow-sm space-y-6" aria-labelledby="edit-property-title">
    <div>
      <h2 id="edit-property-title" className="text-xl font-semibold">Editar anúncio</h2>
      <p className="text-sm text-gray-600 mt-2">Actualize os dados do anúncio. Estas alterações não modificam contratos já registados.</p>
    </div>
    <form onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void save({ name: String(data.get("name")), description: String(data.get("description")),
        pricePerMonth: Number(data.get("pricePerMonth")), securityDeposit: Number(data.get("securityDeposit")), applicationFee: Number(data.get("applicationFee")),
        isPetsAllowed: data.get("isPetsAllowed") === "on", isParkingIncluded: data.get("isParkingIncluded") === "on" });
    }}>
      <fieldset disabled={isLoading} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="property-name">Título do anúncio</Label><Input id="property-name" name="name" required maxLength={200} defaultValue={property.name} /></div>
        <div className="space-y-2"><Label htmlFor="property-description">Descrição e condições</Label><Textarea id="property-description" name="description" required maxLength={10000} rows={6} defaultValue={property.description} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ["pricePerMonth", "Renda mensal (MT)", 1], ["securityDeposit", "Caução (MT)", 0], ["applicationFee", "Taxa de candidatura indicada (MT)", 0],
          ] as const).map(([name, label, min]) => <div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" required min={min} max={100000000} step="0.01" defaultValue={property[name]} /></div>)}
        </div>
        <p className="text-sm text-gray-600">A socasas ainda não cobra estes valores. As condições são combinadas directamente entre as partes.</p>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2"><input type="checkbox" name="isPetsAllowed" defaultChecked={property.isPetsAllowed} /> Aceita animais</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isParkingIncluded" defaultChecked={property.isParkingIncluded} /> Estacionamento incluído</label>
        </div>
        <Button type="submit">{isLoading ? "A guardar…" : "Guardar alterações"}</Button>
      </fieldset>
    </form>
    <div className="border-t pt-5 space-y-3">
      <h3 className="font-semibold">{property.isPublished ? "Anúncio publicado" : "Anúncio retirado"}</h3>
      <p className="text-sm text-gray-600">Retirar esconde o anúncio da pesquisa e impede novas candidaturas. Pode voltar a publicá-lo; o histórico é mantido.</p>
      {confirmWithdrawal ? <div className="space-y-3">
        <p>Retirar este anúncio da pesquisa?</p>
        <div className="flex flex-wrap gap-3"><Button disabled={isLoading} variant="destructive" onClick={() => void save({ isPublished: false })}>Confirmar retirada</Button><Button disabled={isLoading} variant="outline" onClick={() => setConfirmWithdrawal(false)}>Cancelar</Button></div>
      </div> : <Button disabled={isLoading} variant="outline" onClick={() => property.isPublished ? setConfirmWithdrawal(true) : void save({ isPublished: true })}>{property.isPublished ? "Retirar da pesquisa" : "Voltar a publicar"}</Button>}
    </div>
    {notice && <p role="status" className="text-green-800">{notice}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
