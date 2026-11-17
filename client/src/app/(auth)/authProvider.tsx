"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
I18n.putVocabularies(translations);
I18n.setLanguage("pt");
import {
  Authenticator,
  Heading,
  Radio,
  RadioGroupField,
  useAuthenticator,
  View,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useRouter, usePathname } from "next/navigation";

// https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/
const authConfigured = Boolean(process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID && process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID);
if (authConfigured) Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
      userPoolClientId:
        process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID!,
    },
  },
});

const components = {
  Header() {
    return (
      <View className="mt-4 mb-7">
        <Image src="/socasas-logo.jpg" alt="SÓ CASAS" width={72} height={72} className="mx-auto rounded-full" />
        <Heading level={3} className="!text-2xl !font-bold">
          socasas
          <span className="text-secondary-500 font-light hover:!text-primary-300">

          </span>
        </Heading>
        <p className="text-muted-foreground mt-2">
          <span className="font-bold">Bem-vindo!</span> Inicie sessão para continuar
        </p>
      </View>
    );
  },
  SignIn: {
    Footer() {
      const { toSignUp } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Ainda não tem conta?{" "}
            <button
              onClick={toSignUp}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Criar conta
            </button>
          </p>
        </View>
      );
    },
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();

      return (
        <>
          <Authenticator.SignUp.FormFields />
          <RadioGroupField
            legend="Como pretende usar a socasas?"
            name="custom:role"
            errorMessage={validationErrors?.["custom:role"]}
            hasError={!!validationErrors?.["custom:role"]}
            isRequired
          >
            <Radio value="tenant">Procuro um imóvel</Radio>
            <Radio value="manager">Sou proprietário ou gestor</Radio>
          </RadioGroupField>
        </>
      );
    },

    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Já tem conta?{" "}
            <button
              onClick={toSignIn}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Entrar
            </button>
          </p>
        </View>
      );
    },
  },
};

const formFields = {
  signIn: {
    username: {
      placeholder: "O seu email",
      label: "Email",
      isRequired: true,
    },
    password: {
      placeholder: "A sua palavra-passe",
      label: "Palavra-passe",
      isRequired: true,
    },
  },
  signUp: {
    username: {
      order: 1,
      placeholder: "Escolha um nome de utilizador",
      label: "Nome de utilizador",
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: "O seu email",
      label: "Email",
      isRequired: true,
    },
    password: {
      order: 3,
      placeholder: "Crie uma palavra-passe",
      label: "Palavra-passe",
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      placeholder: "Repita a palavra-passe",
      label: "Confirmar palavra-passe",
      isRequired: true,
    },
  },
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.match(/^\/(signin|signup)$/);
  const isDashboardPage =
    pathname.startsWith("/manager") || pathname.startsWith("/tenants");

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (user && isAuthPage) {
      router.push("/");
    }
  }, [user, isAuthPage, router]);

  // Allow access to public pages without authentication
  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  if (!authConfigured) return <div className="mx-auto max-w-xl p-10"><h1 className="text-2xl font-bold">Contas ainda indisponíveis</h1><p className="mt-4">O registo e o início de sessão estarão disponíveis quando o serviço de contas estiver configurado.</p><Link className="inline-block mt-6 underline" href="/">Voltar à página inicial</Link></div>;

  return (
    <div className="h-full">
      <Authenticator
        initialState={pathname.includes("signup") ? "signUp" : "signIn"}
        components={components}
        formFields={formFields}
      >
        {() => <>{children}</>}
      </Authenticator>
    </div>
  );
};

export default Auth;
