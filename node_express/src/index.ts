import Logger, { LoggerType } from './server/logger'
import { IRoute, TypeRoute, t } from './server/my-router'
import Server from './server/server'
import { TodoHandler } from './todo/handler'
import { TodoService } from './todo/service'


const app = new Server()

const PORT = process.env.PORT ?? 3000
const myRoute: IRoute = new TypeRoute()
const logger = new Logger()

const todoService = new TodoService()

app.route('/todo', new TodoHandler(myRoute, logger, todoService))

app.listen(PORT)