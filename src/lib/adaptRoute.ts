import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/db';
import { errorHandler } from '@/middlewares/error.middleware';

export function adaptRoute(handler: Function, options: {
  middlewares?: Function[];
} = {}) {
  return async (request: NextRequest, context: any) => {
    // 1. Build dynamic parameters from Next.js context
    // In Next 15 context.params can be a Promise
    const resolvedParams = context?.params instanceof Promise ? await context.params : context?.params;
    const requestParams: Record<string, string> = {};
    if (resolvedParams) {
      Object.keys(resolvedParams).forEach((key) => {
        requestParams[key] = resolvedParams[key];
      });
    }

    // Parse search parameters
    const url = new URL(request.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Parse headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse cookies
    const cookies: Record<string, string> = {};
    const cookieHeader = request.headers.get('cookie') || '';
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = parts[1].trim();
      }
    });

    // Build mock Request
    const req: any = {
      method: request.method,
      url: request.url,
      query,
      params: requestParams,
      headers,
      cookies,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      app: {
        get: () => null
      }
    };

    // Parse body if present and appropriate
    req.body = {};
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const rawText = await request.text();
          console.log('[DEBUG] Raw body text in adaptRoute:', rawText);
          let parsed = rawText ? JSON.parse(rawText) : {};
          while (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          req.body = parsed || {};
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          const body: any = {};
          formData.forEach((value, key) => {
            body[key] = value;
          });
          req.body = body;
        }
      } catch (e) {
        console.error('Error parsing request body in adaptRoute:', e);
      }
    }
    console.log('[DEBUG] req.body in adaptRoute after parsing:', req.body);

    let statusCode = 200;
    let jsonPayload: any = null;
    let sendPayload: any = null;
    const responseHeaders = new Headers();
    const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
    const cookiesToClear: Array<{ name: string; options: any }> = [];

    // Build mock Response
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
      send(data: any) {
        sendPayload = data;
        return this;
      },
      setHeader(name: string, value: string) {
        responseHeaders.set(name, value);
        return this;
      },
      cookie(name: string, value: string, options: any = {}) {
        cookiesToSet.push({ name, value, options });
        return this;
      },
      clearCookie(name: string, options: any = {}) {
        cookiesToClear.push({ name, options });
        return this;
      }
    };

    try {
      // Ensure database is connected
      await connectDB();

      // Run Express middleware pipeline
      const pipeline = [...(options.middlewares || []), handler];
      let currentIdx = 0;

      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise<any>((resolve) => {
        resolveResponse = resolve;
      });

      const runNext = async (err?: any): Promise<void> => {
        try {
          if (err) {
            resolveResponse(err);
            return;
          }
          if (currentIdx < pipeline.length) {
            const nextFn = pipeline[currentIdx++];
            await nextFn(req, res, runNext);
          } else {
            resolveResponse(null);
          }
        } catch (error) {
          resolveResponse(error);
        }
      };

      // Wrap res.json and res.send to resolve the promise when called
      const originalJson = res.json;
      res.json = function(data: any) {
        const ret = originalJson.call(this, data);
        resolveResponse(null);
        return ret;
      };

      const originalSend = res.send;
      res.send = function(data: any) {
        const ret = originalSend.call(this, data);
        resolveResponse(null);
        return ret;
      };

      // Trigger the pipeline
      runNext().catch((err) => {
        resolveResponse(err);
      });

      const errorResult = await responsePromise;
      if (errorResult) {
        throw errorResult;
      }

      const responseInit: ResponseInit = {
        status: statusCode,
        headers: responseHeaders,
      };

      const finalResponse = jsonPayload !== null
        ? NextResponse.json(jsonPayload, responseInit)
        : new NextResponse(sendPayload, responseInit);

      // Set cookies in response
      cookiesToSet.forEach(({ name, value, options }) => {
        finalResponse.cookies.set(name, value, {
          httpOnly: options.httpOnly ?? true,
          secure: options.secure ?? process.env.NODE_ENV === 'production',
          sameSite: options.sameSite ?? 'strict',
          maxAge: options.maxAge ? options.maxAge / 1000 : undefined,
          path: options.path ?? '/',
        });
      });

      // Clear cookies in response
      cookiesToClear.forEach(({ name, options }) => {
        finalResponse.cookies.set(name, '', {
          httpOnly: options.httpOnly ?? true,
          secure: options.secure ?? process.env.NODE_ENV === 'production',
          sameSite: options.sameSite ?? 'strict',
          maxAge: 0,
          path: options.path ?? '/',
        });
      });

      return finalResponse;

    } catch (error: any) {
      console.error('API Handler Error:', error);
      let responseSent = false;
      const errorRes: any = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonPayload = data;
          responseSent = true;
          return this;
        },
        send(data: any) {
          sendPayload = data;
          responseSent = true;
          return this;
        }
      };

      await errorHandler(error, req, errorRes, () => {});

      if (responseSent) {
        return NextResponse.json(jsonPayload || sendPayload, { status: statusCode });
      }

      const errStatus = error.statusCode || 500;
      const errMsg = error.message || 'Internal Server Error';
      return NextResponse.json({
        status: 'error',
        message: errMsg
      }, { status: errStatus });
    }
  };
}
