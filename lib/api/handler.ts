import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/server-auth';
import { logAudit } from './audit';
import { canPerform, type Resource, type Action } from '@/lib/permissions';

type ApiHandler<TBody = any, TQuery = any> = (
  req: NextRequest,
  context: { 
    user: any; 
    body: TBody; 
    query: TQuery; 
    params: Record<string, string>;
  }
) => Promise<NextResponse> | NextResponse;

interface WithApiOptions<TBody extends z.ZodTypeAny, TQuery extends z.ZodTypeAny> {
  schema?: {
    body?: TBody;
    query?: TQuery;
  };
  allowedRoles?: string[];
  requiredPermission?: { resource: Resource; action: Action };
  requireAuth?: boolean;
  auditLog?: boolean;
}

export function withApi<TBody extends z.ZodTypeAny = any, TQuery extends z.ZodTypeAny = any>(
  options: WithApiOptions<TBody, TQuery>,
  handler: ApiHandler<z.infer<TBody>, z.infer<TQuery>>
) {
  return async (req: NextRequest, { params }: { params: any }) => {
    try {
      const { 
        schema, 
        allowedRoles,
        requiredPermission,
        requireAuth = true,
        auditLog = false 
      } = options;

      // 1. Authentication
      const user = await getServerUser();
      
      if (requireAuth && !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Authorization
      if (requireAuth && allowedRoles && allowedRoles.length > 0) {
        if (!user || !allowedRoles.includes(user.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // 2b. Permission (doc 14 §4.3) — same matrix the edge preamble consults.
      if (requireAuth && requiredPermission) {
        if (!user || !canPerform(user.role, requiredPermission.resource, requiredPermission.action)) {
          return NextResponse.json({ error: 'forbidden', code: 'permission_denied' }, { status: 403 });
        }
      }

      // 3. Validation - Query Params
      let queryData: any = {};
      if (schema?.query) {
        const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
        const result = schema.query.safeParse(urlParams);
        if (!result.success) {
          return NextResponse.json({ 
            error: 'Invalid query parameters', 
            details: result.error.flatten().fieldErrors 
          }, { status: 400 });
        }
        queryData = result.data;
      }

      // 4. Validation - Body
      let bodyData: any = {};
      if (schema?.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          const json = await req.json();
          const result = schema.body.safeParse(json);
          if (!result.success) {
            return NextResponse.json({ 
              error: 'Invalid request body', 
              details: result.error.flatten().fieldErrors 
            }, { status: 400 });
          }
          bodyData = result.data;
        } catch (e) {
          return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
      }

      // 5. Execute Handler
      const response = await handler(req, { 
        user, 
        body: bodyData, 
        query: queryData,
        // Next 15+ delivers route params as a Promise; awaiting a plain object is a no-op,
        // so this stays correct on both. Without the await every dynamic-segment route
        // reads `params.x === undefined` and 404s.
        params: (await params) || {}
      });

      // 6. Audit Logging
      if (auditLog && user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        await logAudit(
          user.id,
          req.method,
          req.nextUrl.pathname,
          { 
            status: response.status,
            ...(req.method !== 'DELETE' ? { body_preview: bodyData } : {})
          }
        );
      }

      return response;

    } catch (error: any) {
      console.error('[API ERROR]', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation error', 
          details: error.flatten().fieldErrors 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error' 
      }, { status: 500 });
    }
  };
}
