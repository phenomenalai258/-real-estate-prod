import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

declare global {
  namespace Express {
    interface Request { user?: { id: string; role: "tenant" | "manager" }; }
  }
}
export function createTokenVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) throw new Error("Cognito não configurado");
  // Amplify sends ID tokens: verify signature, issuer, audience, expiry and use.
  return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
}
let verifier: ReturnType<typeof createTokenVerifier> | undefined;
export const authMiddleware = (allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
    if (!match) { res.status(401).json({ message: "É necessário iniciar sessão." }); return; }
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
      res.status(503).json({ message: "Autenticação ainda não configurada." }); return;
    }
    try {
      verifier ??= createTokenVerifier();
      const payload = await verifier.verify(match[1]);
      const role = payload["custom:role"];
      if (!payload.sub || (role !== "tenant" && role !== "manager") || !allowedRoles.includes(role)) {
        res.status(403).json({ message: "Não tem permissão para esta operação." }); return;
      }
      req.user = { id: payload.sub, role };
      next();
    } catch {
      res.status(401).json({ message: "Sessão inválida ou expirada." });
    }
  };
export function requireOwnProfile(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.params.cognitoId !== req.user.id) {
    res.status(403).json({ message: "Só pode aceder ao seu próprio perfil." }); return;
  }
  next();
}
