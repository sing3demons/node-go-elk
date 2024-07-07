import type { Request, Response, NextFunction } from 'express'
import { createLogger, format, transports, Logger as WinstonLog } from 'winston'

export type ContextType = Record<string, string>



interface ISensitive {
    maskNumber(mobileNo: string, mask?: string): string
    maskEmail(email: string): string
    maskPassword(password: string): string
    masking(item: any): void
}

interface IgnoreCase {
    equal(a: string, b: string): boolean
    notEqual(a: string, b: string): boolean
    contain(a: string, b: string): boolean
    notContain(a: string, b: string): boolean
    startWith(a: string, b: string): boolean
}

function makeStructuredClone<T>(obj: T): T {
    if (typeof obj === 'undefined') {
        return obj
    }
    const payload = JSON.parse(JSON.stringify(obj))
    if (typeof payload === 'object') {
        if (Array.isArray(payload)) {
            for (const item of payload) {
                if (typeof item === 'object') {
                    Sensitive.masking(item)
                }
            }
        } else {
            Sensitive.masking(payload)
        }
    }
    return payload
}

const Sensitive: ISensitive = {
    maskNumber: (mobileNo: string, mask?: string): string => {
        let maskData = 'XXX-XXX-XX'
        if (mask) {
            maskData = maskData.replace(/X/g, mask)
        }
        if (ignoreCase.startWith(mobileNo, '+')) {
            if (mobileNo.length >= 10) {
                return `${maskData}${mobileNo.substring(mobileNo.length - 2, mobileNo.length)}`
            }
        } else if (ignoreCase.startWith(mobileNo, '0') && mobileNo.length >= 10) {
            return `${maskData}${mobileNo.substring(mobileNo.length - 2, mobileNo.length)}`
        }

        return mobileNo
    },
    maskEmail: (email: string): string => {
        const rex = new RegExp(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)
        if (!rex.test(email)) {
            return email
        } else {
            let [first, second] = email.split('@')
            if (!first) {
                return ''
            }
            if (first.length > 2) {
                const mask = first.substring(3, first.length)
                const notMask = first.substring(0, 3)
                first = notMask + 'X'.repeat(mask.length)
            } else {
                first = first.replace(first.substring(1, first.length), 'X'.repeat(first.length - 1))
            }
            return `${first}@${second}`
        }
    },
    maskPassword: (password: string): string => password.replace(password, '********'),
    masking: (item: any) => {
        for (const key in item) {
            if (ignoreCase.equal(key, 'password')) {
                item[key] = Sensitive.maskPassword(item[key])
            } else if (ignoreCase.equal(key, 'email')) {
                item[key] = Sensitive.maskEmail(item[key])
            } else if (ignoreCase.equal(key, 'mobileNo')) {
                item[key] = Sensitive.maskNumber(item[key])
            } else if (ignoreCase.equal(key, 'phone')) {
                item[key] = Sensitive.maskNumber(item[key])
            } else if (typeof item[key] === 'object') {
                Sensitive.masking(item[key])
            }
        }
    },
}

export const logMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const session = req.header('x-transaction-id') as string ?? 'unknown'

    const originalSend = res.json
    res.json = (data) => {
        const duration = Date.now() - start;
        let logInfo = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: res.statusCode === 200 ? 'Request Success' : 'Request Failed',
            session: {
                id: session,
                ip: req.ip,
                device: req.headers['user-agent'],
                location: req.headers['x-location'],
            },
            service: {
                name: 'Service-HTTP',
                version: '1.0.0',
                host: req.hostname
            },
            request: {
                path: req.originalUrl,
                status: res.statusCode,
                duration_ms: duration,
                headers: req.headers,
                host: req.headers.host,
                baseUrl: req.baseUrl,
                url: req.url,
                method: req.method,
                body: req.body,
                params: req?.params,
                query: req?.query,
                clientIp: req.headers['x-forwarded-for'] ?? req?.socket.remoteAddress,
            },
            response: {
                headers: res.getHeaders(),
                statusCode: res.statusCode,
                data: null,
            },
        }
        res.json = originalSend
        logInfo.response.data = data

        res.on('finish', () => {
            console.log(JSON.stringify(logInfo))
        });
        return res.json(data)
    }

    next();
}

export const ignoreCase: IgnoreCase = {
    equal: (a?: string, b?: string) => {
        if (a === undefined || b === undefined) {
            return false
        }
        return a.toLowerCase() === b.toLowerCase()
    },
    notEqual: (a: string, b: string) => a.toLowerCase() !== b.toLowerCase(),
    contain: (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase()),
    notContain: (a: string, b: string) => !a.toLowerCase().includes(b.toLowerCase()),
    startWith: (a: string, b: string) => a.toLowerCase().startsWith(b.toLowerCase()),
}

const level = process.env.LOG_LEVEL ?? 'debug'

export type ILogger = {
    info: (message: string, data?: any) => void
    warn: (message: string, data?: any) => void
    error: (message: string, data?: any) => void
    debug: (message: string, data?: any) => void
    addDefaultMeta(meta: ContextType): void
    setLevel(level: string): void
    detail(cmd: string, data: any): ILogger
    addRequestBody<T>(body: T, cmd?: string): ILogger
    addRequestQuery(query: any, cmd?: string): ILogger
    addRequestParams(params: any, cmd?: string): ILogger
    addRequestHeaders(headers: any, cmd?: string): ILogger
    addResponseBody(body: any, cmd?: string): ILogger
    addResponseHeaders(headers: any, cmd?: string): ILogger
    addResponseStatusCode(statusCode: number, cmd?: string): ILogger
    addResponseData(data: any, cmd?: string): ILogger
    addResponseError(error: any, cmd?: string): ILogger
    addResponseMessage(message: string, cmd?: string): ILogger
    addResponseSuccess(success: boolean, data?: any): ILogger
    setSensitiveMasking({ key, value }: { key: string, value?: string }): ILogger
    end(): void
    flush(): void
}


class Logger implements ILogger {
    constructor() {
        this.log = createLogger({
            level: level,
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss', alias: '@timestamp' }),
                format.json({
                    replacer(key, value) {
                        if (ignoreCase.equal(key, 'password')) {
                            return Sensitive.maskPassword(value)
                        } else if (ignoreCase.equal(key, 'email')) {
                            return Sensitive.maskEmail(value)
                        } else if (ignoreCase.equal(key, 'mobileNo')) {
                            return Sensitive.maskNumber(value)
                        } else if (ignoreCase.equal(key, 'phone')) {
                            return Sensitive.maskPassword(value)
                        } else if (key === 'timestamp') {
                            return undefined
                        }
                        return value
                    },
                    // space: 2
                })
            ),
            exceptionHandlers: [],
            exitOnError: false,
            transports: [
                new transports.Console({
                    level: level,
                    handleExceptions: true,
                }),
            ],
            defaultMeta: { service: process.env.SERVICE_NAME ?? 'Service-HTTP' },
        })
    }
    private readonly log: WinstonLog

    private req: Request = {} as Request
    private res: Response = {} as Response

    private context: Record<string, any> = {}
    private start: number = 0

    private masking = new Map<string, string>()

    Logger(ctx: Request, res: Response): ILogger {
        const session = ctx.headers['x-transaction-id'] as string
        this.start = performance.now()
        this.context = {}
        this.req = ctx
        this.res = res
        this.log.child({ session })
        return this
    }

    public setSensitiveMasking({ key, value = '***' }: { key: string, value?: string }) {
        this.masking.set(key, value)
        return this
    }

    public addDefaultMeta(meta: ContextType) {
        this.log.defaultMeta = { ...this.log.defaultMeta, ...meta }
    }

    public setLevel(level: string) {
        this.log.level = level
    }

    public detail<T>(cmd: string, data: T) {
        this.context = { ...this.context, [cmd]: data, type: 'detail' }
        return this
    }

    public addRequestBody<T>(body: T, cmd?: string) {
        this.context = {
            ...this.context,
            request: {
                ...this.context.request,
                body
            }
        }
        return this
    }

    public addRequestQuery<T>(query: T, cmd?: string) {
        this.context = {
            ...this.context,
            request: {
                ...this.context.request,
                query
            }
        }
        return this
    }

    public addRequestParams(params: any, cmd?: string) {
        this.context = {
            ...this.context, request: {
                ...this.context.request,
                params
            }
        }
        return this
    }

    public addRequestHeaders(headers: any, cmd?: string) {
        this.context = {
            ...this.context, request: {
                ...this.context.request,
                headers
            }
        }
        return this
    }

    public addResponseBody(body: any, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                body
            }
        }
        return this
    }

    public addResponseHeaders(headers: any, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                headers
            }
        }
        return this
    }

    public addResponseStatusCode(statusCode: number, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                statusCode
            }
        }
        return this
    }

    public addResponseData(data: any, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                data
            }
        }
        return this
    }

    public addResponseError(error: any, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                error
            }
        }
        this.log.error('', this.context)
        return this
    }

    public addResponseMessage(message: string, cmd?: string) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                message
            }
        }
        return this
    }

    public addResponseSuccess(success: boolean, data?: any) {
        this.context = {
            ...this.context, response: {
                ...this.context.response,
                success,
                data
            }
        }
        return this
    }

    public flush() {
        const req = this.req
        const end = (performance.now() - this.start).toFixed(2)
        const body = this.context.request?.body ?? req.body ?? {}
        const data = this.context.response?.data ?? {}
        const context = {
            type: this.context.type ?? 'info',
            request: {
                ...this.context.request,
                path: req.originalUrl,
                duration_ms: end,
                headers: req.headers,
                host: req.headers.host,
                baseUrl: req.baseUrl,
                url: req.url,
                method: req.method,
                body: makeStructuredClone(body),
                params: this.context.request?.params ?? req?.params ?? {},
                query: this.context.request?.query ?? req?.query ?? {},
                clientIp: req.headers['x-forwarded-for'] ?? req?.socket.remoteAddress,
            },
            response: {
                headers: this.res.getHeaders(),
                statusCode: this.res.statusCode,
                data: makeStructuredClone(data),
            },
        }

        if (this.masking.size > 0) {
            for (const [key, value] of this.masking) {
                if (context.request.body[key]) {
                    context.request.body[key] = value
                }
                if (context.request.query[key]) {
                    context.request.query[key] = value
                }

                if (context.request.params[key]) {
                    context.request.params[key] = value
                }

                if (context.request.headers[key]) {
                    context.request.headers[key] = value
                }

                if (context.response.data[key]) {
                    context.response.data[key] = value
                }
            }
        }
        this.log.info('', context)
        this.context = {}
        this.start = 0
        this.req = {} as Request
    }

    public end() {
        this.log.info('', this.context)
        this.context = {}
    }

    info(message: string, data?: any) {
        const action = { ...makeStructuredClone(data) }
        this.log.info(message, action)
        return this
    }

    warn(message: string, data?: any) {
        const action = { ...makeStructuredClone(data) }
        this.log.warn(message, action)
        return this
    }

    error(message: string, data?: any) {
        const action = { ...makeStructuredClone(data) }
        this.log.error(message, action)
        return this
    }

    debug(message: string, data?: any) {
        const action = { ...makeStructuredClone(data) }
        this.log.debug(message, action)
        return this
    }
    child(options: Object) {
        return this.log.child(options)
    }
}

type IMarking = { key: string, value?: string }

const masking = new Map<string, string>()
const response = new WeakMap()

export interface IDetailLog {
    addRequestBody<T>(node: string, msg: string, body: T): IDetailLog
    addRequestQuery(node: string, msg: string, query: any, cmd?: string): IDetailLog
    addRequestParams(node: string, msg: string, params: any, cmd?: string): IDetailLog
    addRequestHeaders(node: string, msg: string, headers: any, cmd?: string): IDetailLog
    addResponseBody(node: string, msg: string, body: any, cmd?: string): IDetailLog
    addResponseSuccess<T>(node: string, cmd: string, resultCode: string, data?: T): IDetailLog
    addResponseError(node: string, error: any, cmd?: string): void
    setSensitiveMasking(data: IMarking[]): IDetailLog
    addDetail<T>(node: string, cmd: string, data: T): IDetailLog
    end(): void
}

export class DetailLog implements IDetailLog {
    private log: WinstonLog
    private req: Request = {} as Request
    private res: Response = {} as Response
    private context: Record<string, any> = {}



    constructor(req: Request, res: Response, logger: Logger) {
        const session = req.headers['x-transaction-id'] as string
        this.context = {}
        this.req = req
        this.res = res
        this.log = logger.child({ session })
    }
    addDetail<T>(node: string, cmd: string, data?: T) {
        let msg = data ? { [cmd]: data } : { message: cmd }
        this.context = { node, ...this.context, ...msg }
        return this
    }

    addRequestBody<T>(node: string, msg: string, body: T) {
        this.context = {
            ...this.context,
            request: {
                node,
                ...this.context.request,
                [`body.${msg}`]: body
            }
        }
        return this
    }

    setSensitiveMasking(data: IMarking[]) {
        for (const { key, value = '****' } of data) {
            masking.set(key, value)
        }
        return this
    }

    addRequestQuery<T>(node: string, msg: string, query: T) {
        this.context = {
            ...this.context,
            request: {
                node,
                ...this.context.request,
                [`query.${msg}`]: query
            }
        }
        return this
    }



    addRequestParams<T>(node: string, msg: string, params: T) {
        this.context = {
            ...this.context,
            request: {
                node,
                ...this.context.request,
                [`params.${msg}`]: params
            }
        }
        return this
    }

    addRequestHeaders<T>(node: string, msg: string, headers: T) {
        this.context = {
            ...this.context,
            request: {
                node,
                ...this.context.request,
                [`headers.${msg}`]: headers
            }
        }
        return this
    }

    addResponseBody<T>(node: string, msg: string, body: T) {
        this.context = {
            node,
            ...this.context,
            response: {
                ...this.context.response,
                [`body.${msg}`]: body
            }
        }
        return this
    }
    addResponseSuccess<T>(node: string, cmd: string, resultCode: string, data?: T) {
        this.context = {
            ...this.context,
            response: {
                ...this.context.response,
                node,
                cmd,
                resultCode,
                success: true,
                data
            }
        }
        response.set(this, data)
        this.end()
        return this
    }

    addResponseError<T extends unknown>(node: string, cmd: string, error: T) {
        let message = '', name = '', stack = ''
        if (error instanceof Error) {
            message = error.message
            name = error.name
            stack = error.stack ?? ''
        }
        this.context = {
            ...this.context,
            response: {
                node,
                ...this.context.response,
                success: false,
                error: {
                    message,
                    name,
                    stack
                }
            },
            type: 'detail',
            error: true,
            cmd,

        }
        this.log.error('error', this.context)
        this.context = {}
        this.req = {} as Request
        this.res = {} as Response
    }
    private masking = <T>(obj: T, { key, value }: IMarking): T => {
        if (typeof obj === 'undefined') {
            return obj
        }
        const payload = JSON.parse(JSON.stringify(obj))
        if (typeof payload === 'object') {
            if (Array.isArray(payload)) {
                for (const item of payload) {
                    if (typeof item === 'object') {
                        for (let i = 0; i < key.length; i++) {
                            if (item[key]) {
                                item[key] = value
                            }
                        }
                    }
                }
            } else {
                for (let i = 0; i < key.length; i++) {
                    if (payload[key]) {
                        payload[key] = value
                    }
                }
            }
        }
        return payload
    }

    end() {
        if (masking.size > 0) {
            for (const [key, value] of masking) {

                if (this.context?.request) {
                    this.context.request = this.masking(this.context.request, { key, value })
                }
                if (this.context?.request?.query) {
                    this.context.request.query = this.masking(this.context.request.query, { key, value })
                }

                if (this.context?.request?.params) {
                    this.context.request.params = this.masking(this.context.request.params, { key, value })
                }

                if (this.context?.request?.headers) {
                    this.context.request.headers = this.masking(this.context.request.headers, { key, value })
                }

                if (this.context?.response?.data) {
                    this.context.response.data = this.masking(this.context.response.data, { key, value })
                }
            }
        }
        this.log.info('', this.context)
        this.context = {}
    }
}


export interface ISummaryLog {
    addSuccessBlock<T>(node: string, cmd: string, resultCode: string, resultDesc: string): ISummaryLog
    flush(): void
}


export class SummaryLog implements ISummaryLog {
    private log: WinstonLog
    private req: Request = {} as Request
    private res: Response = {} as Response
    private context: Record<string, any> = {}
    private start: number = 0

    constructor(req: Request, res: Response, logger: Logger) {
        const session = req.headers['x-transaction-id'] as string
        this.start = performance.now()
        this.context = {}
        this.req = req
        this.res = res
        this.log = logger.child({ session })
    }

    public addSuccessBlock<T>(node: string, cmd: string, resultCode: string, resultDesc: string) {
        this.context = {
            ...this.context,
            node,
            cmd,
            resultCode,
            resultDesc,
        }
        this.log.info('', this.context)
        this.context = {}
        return this
    }

    private masking = <T>(obj: T, { key, value }: IMarking): T => {
        if (typeof obj === 'undefined') {
            return obj
        }
        const payload = JSON.parse(JSON.stringify(obj))
        if (typeof payload === 'object') {
            if (Array.isArray(payload)) {
                for (const item of payload) {
                    if (typeof item === 'object') {
                        for (let i = 0; i < key.length; i++) {
                            if (item[key]) {
                                item[key] = value
                            }
                        }
                    }
                }
            } else {
                for (let i = 0; i < key.length; i++) {
                    if (payload[key]) {
                        payload[key] = value
                    }
                }
            }
        }
        return payload
    }

    public flush() {
        const req = this.req
        const end = (performance.now() - this.start).toFixed(2)
        const body = this.context.request?.body ?? req.body ?? {}
        const data = response.get(this) ?? {}
        const context = {
            type: 'summary',
            session: {
                id: req.headers['x-transaction-id'],
                ip: req.ip,
                device: req.headers['user-agent'],
                location: req.headers['x-location'],
            },
            request: {
                ...this.context.request,
                path: req.originalUrl,
                duration_ms: end,
                headers: req.headers,
                host: req.headers.host,
                baseUrl: req.baseUrl,
                url: req.url,
                method: req.method,
                body: body,
                params: this.context.request?.params ?? req?.params ?? {},
                query: this.context.request?.query ?? req?.query ?? {},
                clientIp: req.headers['x-forwarded-for'] ?? req?.socket.remoteAddress,
            },
            response: {
                headers: this.res.getHeaders(),
                statusCode: this.res.statusCode,
                data,
            },
        }

        if (masking.size > 0) {
            for (const [key, value] of masking) {
                if (context.request.body) {
                    context.request.body = this.masking(context.request.body, { key, value })
                }
                if (context.request.query) {
                    context.request.query = this.masking(context.request.query, { key, value })
                }

                if (context.request.params) {
                    context.request.params = this.masking(context.request.params, { key, value })
                }

                if (context.request.headers) {
                    context.request.headers = this.masking(context.request.headers, { key, value })
                }

                if (context.response.data) {
                    context.response.data = this.masking(context.response.data, { key, value })
                }
            }
        }

        this.log.info('', context)
        this.context = {}
        this.start = 0
        this.req = {} as Request
        masking.clear()
        response.delete(this)
    }
}
export type LoggerType = Logger



export default Logger