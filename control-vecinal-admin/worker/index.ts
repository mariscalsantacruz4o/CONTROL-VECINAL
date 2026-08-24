import { POST as createActivity, PATCH as updateActivity } from "../app/api/admin/activities/route";
import { PUT as saveAttendance } from "../app/api/admin/attendance/route";
import { DELETE as deleteNeighbor, PATCH as updateNeighbor, POST as createNeighbor } from "../app/api/admin/neighbors/route";
import { PUT as saveNotice } from "../app/api/admin/notice/route";
import { POST as createPayment } from "../app/api/admin/payments/route";
import { PUT as saveSettings } from "../app/api/admin/settings/route";
import { GET as getAdminState } from "../app/api/admin/state/route";
import { setWorkerEnv } from "../db";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface WorkerContext {
  access?: {
    getIdentity(): Promise<{ email?: string } | null>;
  };
}

type Handler = (request: Request) => Promise<Response>;

const handlers: Record<string, Handler | undefined> = {
  "GET /api/admin/state": getAdminState,
  "POST /api/admin/neighbors": createNeighbor,
  "PATCH /api/admin/neighbors": updateNeighbor,
  "DELETE /api/admin/neighbors": deleteNeighbor,
  "POST /api/admin/activities": createActivity,
  "PATCH /api/admin/activities": updateActivity,
  "PUT /api/admin/attendance": saveAttendance,
  "POST /api/admin/payments": createPayment,
  "PUT /api/admin/notice": saveNotice,
  "PUT /api/admin/settings": saveSettings,
};

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    setWorkerEnv(env);
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, database: "D1", application: "administracion" });
    }

    if (url.pathname.startsWith("/api/")) {
      const handler = handlers[`${request.method} ${url.pathname}`];
      let authenticatedRequest = request;
      if (handler && ctx.access) {
        const identity = await ctx.access.getIdentity();
        if (identity?.email) {
          const headers = new Headers(request.headers);
          headers.set("cf-access-authenticated-user-email", identity.email);
          authenticatedRequest = new Request(request, { headers });
        }
      }
      return handler
        ? handler(authenticatedRequest)
        : Response.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
