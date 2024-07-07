import { DetailLog, LoggerType, SummaryLog } from "../server/logger"
import { IRoute, t } from "../server/my-router"

export class TodoHandler {
    constructor(
        private readonly myRoute: IRoute,
        private readonly logger: LoggerType,
    ) { }

    getTodo = this.myRoute.get('/').handler(async ({ req, res, query }) => {
        const detailLog = new DetailLog(req, res, this.logger)
        const summaryLog = new SummaryLog(req, res, this.logger)
        try {
            detailLog.addDetail('Get Todo')

            const response = {}

            return response
        } catch (error: unknown) {
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