import { faker } from '@faker-js/faker';
import { IQueryTodo, IResponseTodo, ITodo } from './model';


export class TodoService {
    data: ITodo[] = []
    constructor() {

        this.data = this.generateTodo()
    }

    getTodos = async (q: IQueryTodo) => {
        const { limit = 10, order = 'desc', page = 1, sort, name } = q
        const { fetch, offset } = this.pagination(page, limit)
        const response: IResponseTodo = {
            data: [],
            total: this.data.length,
            page,
            pageSize: limit
        }
        if (name) {
            const data = this.data.filter((todo) => todo.name.includes(name))
            response.data = data.slice(offset, offset + fetch).sort((a, b) => {
                if (order === 'asc') {
                    return a.name.localeCompare(b.name)
                } else {
                    return b.name.localeCompare(a.name)
                }
            })
        }
        if (sort) {
            response.data = this.data.slice(offset, offset + fetch).sort((a, b) => {
                if (order === 'asc') {
                    return a.name.localeCompare(b.name)
                } else {
                    return b.name.localeCompare(a.name)
                }
            })
        }
        response.data = this.data.slice(offset, offset + fetch).sort((a, b) => {
            if (order === 'asc') {
                return a.name.localeCompare(b.name)
            } else {
                return b.name.localeCompare(a.name)
            }
        })

        return response
    }

    getTodo = async (id: number) => {
        return this.data.find((todo) => todo.id === id)
    }

    private generateTodo = () => {
        const todos = []

        for (let i = 0; i < 100; i++) {
            todos.push({
                id: i + 1,
                name: faker.lorem.words({ max: 20, min: 5 }),
                description: faker.lorem.words({ max: 100, min: 10 })
            })
        }
        return todos
    }

    private pagination = (pageNumber: number, pageSize: number) => {
        const page: number = pageNumber ? pageNumber : 1
        const size: number = pageSize ? pageSize : 10
        const offset = pageNumber ? (page - 1) * size : 0
        const fetch = pageSize ? size : 10

        return { offset, fetch }
    }
}