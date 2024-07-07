import { z } from 'zod'

export const Todo = z.object({
    id: z.string(),
    href: z.string().optional(),
    name: z.string(),
    description: z.string(),
})


export type ITodo = z.infer<typeof Todo>

export const IQueryTodoSchema = z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    sort: z.string().optional(),
    order: z.string().optional(),
    name: z.string().optional(),
})

export const IResponseTodoSchema = z.object({
    data: z.array(Todo),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
})

export const ParamTodoSchema = z.object({
    id: z.string()
})

export type IParamTodo = z.infer<typeof ParamTodoSchema>

export const ICreateTodoSchema = z.object({
    name: z.string(),
    description: z.string()
})

export type IResponseTodo = z.infer<typeof IResponseTodoSchema>

export type IQueryTodo = z.infer<typeof IQueryTodoSchema>