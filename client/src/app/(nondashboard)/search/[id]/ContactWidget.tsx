import { Button } from "@/components/ui/button";
import { useGetAuthUserQuery } from "@/state/api";
import { useRouter } from "next/navigation";
import React from "react";

const ContactWidget = ({ onOpenModal }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const router = useRouter();

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
    }
  };

  return (
    <div className="bg-white border border-primary-200 rounded-2xl p-7 h-fit min-w-[300px]">
      <h2 className="text-lg font-semibold mb-3">Tem interesse neste imóvel?</h2>
      <p className="text-sm text-primary-600 mb-4">Envie uma candidatura com os seus contactos e uma mensagem para o proprietário.</p>
      <Button
        className="w-full bg-primary-700 text-white hover:bg-primary-600"
        onClick={handleButtonClick}
        disabled={authUser?.userRole === "manager"}
      >
        {authUser?.userRole === "manager" ? "Conta de proprietário" : authUser ? "Enviar candidatura" : "Entrar para candidatar-se"}
      </Button>

      <hr className="my-4" />
      <div className="text-sm">
        <p className="text-primary-600">A candidatura não cria um contrato. Combine visitas, datas e condições directamente com o proprietário.</p>
      </div>
    </div>
  );
};

export default ContactWidget;
