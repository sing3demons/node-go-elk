import { ASCommon } from "../abstract/basecomponent"
import { DetailLog, LoggerType, SummaryLog } from "../server/logger"
import { IRoute, t } from "../server/my-router"
import path from "path"

export class TodoHandler extends ASCommon {
    constructor(
        private readonly myRoute: IRoute,
        private readonly logger: LoggerType,
    ) {
        super(path.basename(__filename))
    }

    getTodo = this.myRoute.get('/').handler(async ({ req, res, query }) => {
        const detailLog = new DetailLog(req, res, this.logger)
        const summaryLog = new SummaryLog(req, res, this.logger)
        try {
            detailLog.addDetail(this.scriptName, 'Get Todo')

            const response = {}

            return response
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
}