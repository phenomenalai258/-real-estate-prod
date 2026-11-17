import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authMiddleware } from "./middleware/authMiddleware";
/* ROUTE IMPORT */
import tenantRoutes from "./routes/tenantRoutes";
import managerRoutes from "./routes/managerRoutes";
import propertyRoutes from "./routes/propertyRoutes";
import leaseRoutes from "./routes/leaseRoutes";
import applicationRoutes from "./routes/applicationRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));

app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || ["http://localhost:3000", "http://127.0.0.1:3000"] }));

/* ROUTES */
app.get("/", (req, res) => {
  res.json({ service: "socasas", status: "ok" });
});

app.use("/applications", applicationRoutes);
app.use("/properties", propertyRoutes);
app.use("/leases", leaseRoutes);
app.use("/tenants", authMiddleware(["tenant"]), tenantRoutes);
app.use("/managers", authMiddleware(["manager"]), managerRoutes);

app.use((_error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ message: "Pedido inválido. Fotografias: máximo de 10 ficheiros JPEG, PNG ou WebP, até 5 MB cada." });
});

/* SERVER */
const port = Number(process.env.PORT) || 3002;
app.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`Server running on port ${port}`);
});
