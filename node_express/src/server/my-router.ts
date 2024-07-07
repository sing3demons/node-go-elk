import { Router, type NextFunction, type Request, type Response } from 'express'
import { fromZodError } from 'zod-validation-error'
import { z } from 'zod'

export { z as t }

export class TypeRoute {
    get = (path: string) => new TypedRouteHandler(path, HttpMethod.GET)
    post = (path: string) => new TypedRouteHandler(path, HttpMethod.POST)
    put = (path: string) => new TypedRouteHandler(path, HttpMethod.PUT)
    delete = (path: string) => new TypedRouteHandler(path, HttpMethod.DELETE)
    patch = (path: string) => new TypedRouteHandler(path, HttpMethod.PATCH)
}

export type IRoute = TypeRoute

export class MyRouter {
    constructor(public readonly instance: Router = Router()) { }

    private preRequest(handler: RequestHandler) {
        const invokeHandler = async (req: Request, res: Response, next: NextFunction) => {
            const result = await handler(req, res, next)
            return res.send({
                success: true,
                message: 'Request successful',
                ...result,
            } satisfies BaseResponse)
        }
        return catchAsync(invokeHandler)
    }

    Register(classInstance: object) {
        const fields = Object.values(classInstance)
        fields.forEach((field) => {
            const route = field as HandlerMetadata
            if (route.__handlerMetadata) {
                const { path, handler } = route
                const method = route.method.toLowerCase()
                    ; (this.instance.route(path) as any)[method](this.preRequest(handler))
            }
        })
        return this
    }
}

function catchAsync(fn: (...args: any[]) => any) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch((err) => next(err))
    }
}

interface BaseResponse<T = unknown> {
    statusCode?: number
    message?: string
    /**
     * @default true
     */
    success?: boolean
    data?: T
    traceStack?: string
    page?: number
    pageSize?: number
    total?: number
}

type MaybePromise<T> = T | Promise<T>

type RequestHandler = (req: Request, res: Response<BaseResponse>, next: NextFunction) => MaybePromise<BaseResponse>

interface HandlerMetadata {
    __handlerMetadata: true
    method: string
    path: string
    handler: RequestHandler
}

enum HttpMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
}

type TypedHandler<
    TQuery extends z.ZodTypeAny,
    TParams extends z.ZodTypeAny,
    TBody extends z.ZodTypeAny,
    TResponse extends BaseResponse = BaseResponse
> = (context: {
    query: z.infer<TQuery>
    params: z.infer<TParams>
    body: z.infer<TBody>
    req: Request<z.infer<TParams>, any, z.infer<TBody>, z.infer<TQuery>>
    res: Response<TResponse>
}) => MaybePromise<TResponse>

class TypedRouteHandler<
    RouteQuery extends z.ZodTypeAny,
    RouteParams extends z.ZodTypeAny,
    RouteBody extends z.ZodTypeAny
> {
    private schema: {
        query?: z.ZodTypeAny
        params?: z.ZodTypeAny
        body?: z.ZodTypeAny
    } = {}
    constructor(private readonly path: string, private readonly method: string) { }

    query<Query extends z.ZodTypeAny>(schema: Query) {
        this.schema.query = schema
        return this as unknown as TypedRouteHandler<Query, RouteParams, RouteBody>
    }

    body<Body extends z.ZodTypeAny>(schema: Body) {
        this.schema.body = schema
        return this as unknown as TypedRouteHandler<RouteQuery, RouteParams, Body>
    }

    params<Params extends z.ZodTypeAny>(schema: Params) {
        this.schema.params = schema
        return this as unknown as TypedRouteHandler<RouteQuery, Params, RouteBody>
    }

    handler(handler: TypedHandler<RouteQuery, RouteParams, RouteBody>): HandlerMetadata {
        const invokeHandler = async (req: Request, res: Response) => {
            let message = ''
            let query, params, body
            try {
                message = 'Query'
                query = this.schema.query ? this.schema.query.parse(req.query) : undefined
                message = 'Params'
                params = this.schema.params ? this.schema.params.parse(req.params) : undefined
                message = 'Body'
                body = this.schema.body ? this.schema.body.parse(req.body) : undefined
            } catch (error: unknown) {
                if (error instanceof z.ZodError) {
                    const validationError = fromZodError(error)
                    throw new ValidationError(`${message} ${validationError.toString()}`)
                }
            }
            return handler({ query, params, body, req, res })
        }


        // console.log(TypedRouteHandler.name, this.method.toUpperCase(), this.path)
        return {
            method: this.method,
            path: this.path,
            handler: invokeHandler,
            __handlerMetadata: true,
        }
    }
}

class HttpError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message)
        this.name = 'HttpError'
    }
}

class ValidationError extends HttpError {
    constructor(public message: string) {
        super(400, message)
        this.name = 'ValidationError'
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(404, message)
        this.name = 'NotFoundError'
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message: string) {
        super(401, message)
        this.name = 'UnauthorizedError'
    }
}

export function globalErrorHandler(
    error: unknown,
    _request: Request,
    response: Response<BaseResponse>,
    _next: NextFunction
) {
    let statusCode = 500
    let message = ''

    if (error instanceof HttpError) {
        statusCode = error.statusCode
    }

    if (error instanceof Error) {
        console.log(`${error.name}: ${error.message}`)
        message = error.message

        if (message.includes('not found')) {
            statusCode = 404
        }
    } else {
        console.log('Unknown error')
        message = `An unknown error occurred, ${String(error)}`
    }

    const data = {
        statusCode: statusCode,
        message,
        success: false,
        data: null,
        traceStack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    }

    response.status(statusCode).send(data)
}