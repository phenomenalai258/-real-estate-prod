import { CustomFormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ApplicationFormData, applicationSchema } from "@/lib/schemas";
import { useCreateApplicationMutation, useGetAuthUserQuery } from "@/state/api";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";

const ApplicationModal = ({
  isOpen,
  onClose,
  propertyId,
}: ApplicationModalProps) => {
  const [createApplication, { isLoading: isSaving }] = useCreateApplicationMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      message: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!authUser || authUser.userRole !== "tenant") {
      console.error(
        "You must be logged in as a tenant to submit an application"
      );
      return;
    }

    try {
    await createApplication({
      ...data,
      applicationDate: new Date().toISOString(),
      status: "Pending",
      propertyId: propertyId,
      tenantCognitoId: authUser.cognitoInfo.userId,
    }).unwrap();
    onClose();
    } catch { form.setError("root", { message: "Candidatura não enviada. Verifique se já se candidatou e tente novamente." }); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle>Candidatar-me a este imóvel</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <CustomFormField
              name="name"
              label="Nome"
              type="text"
              placeholder="O seu nome completo"
            />
            <CustomFormField
              name="email"
              label="Email"
              type="email"
              placeholder="O seu email"
            />
            <CustomFormField
              name="phoneNumber"
              label="Telemóvel"
              type="text"
              placeholder="Ex.: 841234567"
            />
            <CustomFormField
              name="message"
              label="Mensagem (opcional)"
              type="textarea"
              placeholder="Apresente-se e indique quando pretende visitar"
            />
            <p className="text-sm">A candidatura e a sua aprovação não criam um contrato nem efectuam cobranças.</p>
            {form.formState.errors.root && <p role="alert">{form.formState.errors.root.message}</p>}
            <Button disabled={isSaving} type="submit" className="bg-primary-700 text-white w-full">
              Enviar candidatura
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
