package main

import (
	"github.com/sing3demons/go-elk/router"
	"github.com/sing3demons/go-elk/todo"
	log "github.com/sirupsen/logrus"
)

func main() {

	log.SetFormatter(&log.JSONFormatter{
		FieldMap: log.FieldMap{
			log.FieldKeyTime: "@timestamp",
			log.FieldKeyMsg:  "message",
		},
	})
	log.SetLevel(log.TraceLevel)

	//   file, err := os.OpenFile("out.log", os.O_RDWR | os.O_CREATE | os.O_APPEND, 0666)
	//   if err == nil {
	//     log.SetOutput(file)
	//   }
	//   defer file.Close()

	todoHandler := todo.New("http://localhost:3000")

	router := router.NewRouter()
	router.GET("/todos/{id}", todoHandler.GetTodoByID)
	router.GET("/todos", todoHandler.GetTodos)

	// http.HandleFunc("GET /todos/{id}", todoHandler.GetTodoByID)
	// http.HandleFunc("GET /todos", todoHandler.GetTodos)

	router.StartHttp("8080")
}
