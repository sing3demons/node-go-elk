package router

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type myRouter struct {
	*http.ServeMux
}

const XId = "x-transaction-id"

type ContextKey string

type Router interface {
	GET(path string, handler http.HandlerFunc)
	POST(path string, handler http.HandlerFunc)
	PUT(path string, handler http.HandlerFunc)
	StartHttp(port string)
}

func NewRouter() Router {
	mux := http.NewServeMux()
	return &myRouter{mux}
}

func (r *myRouter) GET(path string, handler http.HandlerFunc) {
	r.addRoute("GET ", path, handler)
}

func (r *myRouter) POST(path string, handler http.HandlerFunc) {
	r.addRoute("POST ", path, handler)
}

func (r *myRouter) PUT(path string, handler http.HandlerFunc) {
	r.addRoute("PUT ", path, handler)
}

func (r *myRouter) PATCH(path string, handler http.HandlerFunc) {
	r.addRoute("PATCH ", path, handler)
}

func (r *myRouter) DELETE(path string, handler http.HandlerFunc) {
	r.addRoute("DELETE ", path, handler)
}

func (r *myRouter) addRoute(method string, path string, handler http.HandlerFunc) {
	r.HandleFunc(method+path, handler)
}

func (r *myRouter) Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Request URI: %s", r.RequestURI)
		start := time.Now()
		reqId := w.Header().Get(XId)
		if reqId == "" {
			reqId = uuid.NewString()
			w.Header().Set(XId, reqId)
		}
		query := r.URL.Query()
		path := r.URL.Path

		body, _ := io.ReadAll(r.Body)
		r.Body = io.NopCloser(bytes.NewBuffer(body))

		// Set the logger in the context
		ctx := context.WithValue(r.Context(), ContextKey(XId), reqId)
		r = r.WithContext(ctx)
		// Call the next handler
		next.ServeHTTP(w, r)

		end := time.Now()
		latency := start.Sub(end)
		log.WithFields(log.Fields{
			"request_id": reqId,
			"method":     r.Method,
			"path":       path,
			"query":      query,
			"latency":    latency,
			"body":       string(body),
			"ip":         r.RemoteAddr,
			"user_agent": r.UserAgent(),
		}).Info("Request")

	})
}

func (r *myRouter) StartHttp(port string) {
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r.Logger(r),
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
