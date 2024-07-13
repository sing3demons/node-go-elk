package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	http.HandleFunc("GET /todos/{id}", todoHandler.GetTodoByID)
	http.HandleFunc("GET /todos", todoHandler.GetTodos)

	port := "8080"

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      http.DefaultServeMux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Running on port %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && errors.Is(err, http.ErrServerClosed) {
			log.Printf("Server is not running : %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
		os.Exit(1)
	}

	log.Println("Server exiting")
}
