import { ASCommon } from "../abstract/basecomponent"
import { DetailLog, LoggerType, SummaryLog } from "../server/logger"
import { IRoute, t } from "../server/my-router"
import path from "path"
import { TodoService } from "./service"
import { IQueryTodoSchema, ParamTodoSchema, ITodo } from "./model"
import type { Request } from "express"

export class TodoHandler extends ASCommon {
    private readonly host = 'http://localhost:3000'
    constructor(
        private readonly myRoute: IRoute,
        private readonly logger: LoggerType,
        private readonly todoService: TodoService
    ) {
        super(path.basename(__filename))
    }

    getTodo = this.myRoute.get('/').query(IQueryTodoSchema).handler(async ({ req, res, query }) => {
        const detailLog = new DetailLog(req as Request, res, this.logger)
        const summaryLog = new SummaryLog(req as Request, res, this.logger)
        try {
            detailLog.addDetail(this.scriptName, 'Get Todo')
            detailLog.addRequestQuery(this.scriptName, 'query', query)

            const result = await this.todoService.getTodos(query)
            detailLog.addResponseSuccess(this.scriptName, 'success', '200', result)
            const { data, page, pageSize, total } = result
            if (data.length === 0) {
                return {
                    success: false,
                    message: 'Data not found',
                    data: [],
                    page,
                    pageSize,
                    total
                }
            }
            return {
                success: true,
                data: data.map((todo) => ({
                    id: todo.id,
                    href: `${this.host}/todo/${todo.id}`,
                    name: todo.name,
                    description: todo.description
                })),
                page,
                pageSize,
                total
            }
        } catch (error: unknown) {
            detailLog.addResponseError(this.scriptName, 'error', error)
            if (error instanceof Error) {
                this.logger.error(error.message)
                return {
                    success: false,
                    message: error?.message,
                    data: {}
                }
            }

            return {
                success: false,
                message: 'Unknown Error'
            }
        } finally {
            detailLog.end()
            summaryLog.flush()
        }
    })

    getTodoById = this.myRoute.get('/:id').params(ParamTodoSchema).handler(async ({ params, req, res }) => {
        const detailLog = new DetailLog(req as Request, res, this.logger)
        const summaryLog = new SummaryLog(req as Request, res, this.logger)
        try {
            detailLog.addDetail(this.scriptName, 'Get Todo By Id')

            const result = await this.todoService.getTodo(Number(params.id))
            detailLog.addResponseSuccess(this.scriptName, 'success', '200', result)

            return {
                success: true,
                data: {
                    id: result?.id,
                    href: `${this.host}/todo/${result?.id}`,
                    name: result?.name,
                    description: result?.description
                } as ITodo
            }

        } catch (error) {
            detailLog.addResponseError(this.scriptName, 'error', error)
            if (error instanceof Error) {
                this.logger.error(error.message)
                return {
                    success: false,
                    message: error?.message,
                    data: {}

                }
            }

            return {
                success: false,
                message: 'Unknown Error'
            }
        } finally {
            detailLog.end()
            summaryLog.flush()
        }
    })
}