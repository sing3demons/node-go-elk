import { faker } from '@faker-js/faker';
import { IQueryTodo, IResponseTodo, ITodo } from './model';
import { Database } from './database';


export class TodoService {
    constructor(private readonly db: Database<ITodo>) {
    }

    getTodos = async (q: IQueryTodo) => {
        const { limit = 10, order = 'desc', page = 1, sort, name } = q
        const { fetch, offset } = this.pagination(page, limit)
        const response: IResponseTodo = {
            data: [],
            total: 0,
            page,
            pageSize: limit
        }
        const data: ITodo[] = await this.db.readAll() as unknown as ITodo[]
        response.total = data.length
        if (name) {
            data.filter((todo) => todo.name.includes(name))
            response.data = data.slice(offset, offset + fetch).sort((a, b) => {
                if (order === 'asc') {
                    return a.name.localeCompare(b.name)
                } else {
                    return b.name.localeCompare(a.name)
                }
            })
        }
        if (sort) {
            response.data = data.slice(offset, offset + fetch).sort((a, b) => {
                if (order === 'asc') {
                    return a.name.localeCompare(b.name)
                } else {
                    return b.name.localeCompare(a.name)
                }
            })
        }

        response.data = data
            .slice(offset, offset + fetch).sort((a, b) => {
                if (order === 'asc') {
                    return a.name.localeCompare(b.name)
                } else {
                    return b.name.localeCompare(a.name)
                }
            })

        return response
    }

    getTodo = async (id: string) => {
        const data = await this.db.readAll() as unknown as ITodo[]
        return data.find((todo) => todo.id === id)
    }


    private pagination = (pageNumber: number, pageSize: number) => {
        const page: number = pageNumber ? pageNumber : 1
        const size: number = pageSize ? pageSize : 10
        const offset = pageNumber ? (page - 1) * size : 0
        const fetch = pageSize ? size : 10

        return { offset, fetch }
    }
}