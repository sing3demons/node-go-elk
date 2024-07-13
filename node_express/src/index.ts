import { faker } from '@faker-js/faker'
import Logger from './server/logger'
import { IRoute, TypeRoute } from './server/my-router'
import Server from './server/server'
import { Database } from './todo/database'
import { TodoHandler } from './todo/handler'
import { ITodo } from './todo/model'
import { TodoService } from './todo/service'


const app = new Server()

const PORT = process.env.PORT ?? 3000
const myRoute: IRoute = new TypeRoute()
const logger = new Logger()

const db = new Database<ITodo>('todo', {
    defaultData: (() => {
        const todos = []
        for (let i = 0; i < 100; i++) {
            todos.push({
                id: faker.string.uuid(),
                name: faker.lorem.words({ max: 20, min: 5 }),
                description: faker.lorem.words({ max: 100, min: 10 })
            })
        }
        return todos
    })()
})

app.use(async (req, res, next) => {
    await db.init()
    next()
})
const todoService = new TodoService(db)

app.route('/todo', new TodoHandler(myRoute, logger, todoService))

app.listen(PORT, () => db.close())
