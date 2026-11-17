import { formatMoney } from "./locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEnumString(str: string) {
  const labels: Record<string, string> = {"Rooms":"Quarto","Tinyhouse":"Casa pequena","Apartment":"Apartamento","Villa":"Moradia","Townhouse":"Moradia geminada","Cottage":"Casa de campo","WasherDryer":"Máquina de lavar e secar","AirConditioning":"Ar condicionado","Dishwasher":"Máquina de lavar loiça","HighSpeedInternet":"Internet rápida","HighSpeedInternetAccess":"Internet rápida","HardwoodFloors":"Pavimento de madeira","WalkInClosets":"Roupeiros","Microwave":"Micro-ondas","Refrigerator":"Frigorífico","Pool":"Piscina","Gym":"Ginásio","Parking":"Estacionamento","PetsAllowed":"Aceita animais","WiFi":"Wi-Fi","Heating":"Aquecimento","SmokeFree":"Sem fumo","CableReady":"TV por cabo","SatelliteTV":"TV por satélite","DoubleVanities":"Lavatório duplo","TubShower":"Banheira e duche","Intercom":"Intercomunicador","SprinklerSystem":"Sistema de rega","RecentlyRenovated":"Remodelado","CloseToTransit":"Perto de transportes","GreatView":"Boa vista","QuietNeighborhood":"Bairro tranquilo"};
  return labels[str] || str.replace(/([A-Z])/g, " $1").trim();
}

export function formatPriceValue(value: number | null, isMin: boolean) {
  if (value === null) return isMin ? "Renda mínima" : "Renda máxima";
  return (isMin ? "Desde " : "Até ") + formatMoney(value);
}

export function cleanParams(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (
        [_, value]
      ) =>
        value !== undefined &&
        value !== "any" &&
        value !== "" &&
        (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
    )
  );
}

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
) => {
  const { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
    return undefined;
  }
};

export const createNewUserInDatabase = async (
  user: any,
  idToken: any,
  userRole: string,
  fetchWithBQ: any
) => {
  const createEndpoint =
    userRole?.toLowerCase() === "manager" ? "/managers" : "/tenants";

  const createUserResponse = await fetchWithBQ({
    url: createEndpoint,
    method: "POST",
    body: {
      cognitoId: user.userId,
      name: user.username,
      email: idToken?.payload?.email || "",
      phoneNumber: "",
    },
  });

  if (createUserResponse.error) {
    throw new Error("Failed to create user record");
  }

  return createUserResponse;
};
