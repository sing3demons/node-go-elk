package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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
	http.HandleFunc("/todos", func(w http.ResponseWriter, r *http.Request) {
		log.WithFields(log.Fields{"method": r.Method, "path": r.URL.Path}).Info("Request received")
		data := []Todo{
			{ID: 1, Name: "todo1"},
			{ID: 2, Name: "todo2"},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		log.WithFields(log.Fields{
			"status":  http.StatusOK,
			"message": "Response sent",
			"method":  r.Method,
			"path":    r.URL.Path,
			"data":    data,
			"ip":      r.RemoteAddr,
			"host":    r.Host,
			"agent":   r.UserAgent(),
		}).Info("Response sent")
		json.NewEncoder(w).Encode(&data)
	})

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

type Todo struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}
