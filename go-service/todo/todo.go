package todo

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

type TodoHandler struct {
	host string
	api  string
}

func New(api string) *TodoHandler {
	return &TodoHandler{
		api:  api,
		host: "http://localhost:8080",
	}
}

func (t *TodoHandler) GetTodos(w http.ResponseWriter, r *http.Request) {
	log.WithFields(log.Fields{"method": r.Method, "path": r.URL.Path}).Info("Request received")

	req, err := http.NewRequest(http.MethodGet, t.api+"/todo", nil)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error sending request")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	client := http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error sending request")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()
	var result Response[[]Todo]
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error reading response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.WithFields(log.Fields{"status": http.StatusOK, "data": string(body)}).Info("Response received")

	json.Unmarshal(body, &result)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	log.WithFields(log.Fields{
		"status":  http.StatusOK,
		"message": "response sent",
		"method":  r.Method,
		"path":    r.URL.Path,
		"data":    result,
		"ip":      r.RemoteAddr,
		"host":    r.Host,
		"agent":   r.UserAgent(),
	}).Info("response sent")

	for i := 0; i < len(result.Data); i++ {
		result.Data[i].Href = strings.Replace(result.Data[i].Href, t.api+"/todo", t.host+"/todos", 1)
	}

	t.ResponseData(w, http.StatusOK, "Success", &result)
}

func (t *TodoHandler) GetTodoByID(w http.ResponseWriter, r *http.Request) {
	log.WithFields(log.Fields{"method": r.Method, "path": r.URL.Path}).Info("Request received")

	path := r.URL.Path
	parts := strings.Split(path, "/")

	if len(parts) != 3 || parts[1] != "todos" {
		http.NotFound(w, r)
		return
	}

	id := parts[2]

	req, err := http.NewRequest(http.MethodGet, t.api+"/todo/"+id, nil)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error sending request")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	client := http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error sending request")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()
	var result Response[Todo]
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.WithFields(log.Fields{"status": http.StatusInternalServerError, "message": err.Error()}).Error("Error reading response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.WithFields(log.Fields{"status": http.StatusOK, "data": string(body)}).Info("Response received")

	json.Unmarshal(body, &result)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	log.WithFields(log.Fields{
		"status":  http.StatusOK,
		"message": "Response sent",
		"method":  r.Method,
		"path":    r.URL.Path,
		"data":    result,
		"ip":      r.RemoteAddr,
		"host":    r.Host,
		"agent":   r.UserAgent(),
	}).Info("Response sent")

	if result.Data.ID == "" {
		t.ResponseData(w, http.StatusNotFound, "Not found", &result)
		return
	}

	result.Data.Href = strings.Replace(result.Data.Href, t.api+"/todo", t.host+"/todos", 1)

	t.ResponseData(w, http.StatusOK, "Success", &result)

}

func (*TodoHandler) ResponseData(w http.ResponseWriter, status int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if status != http.StatusOK {
		res := Response[any]{Success: false, Message: message}
		json.NewEncoder(w).Encode(&res)
		return

	}
	json.NewEncoder(w).Encode(data)
}

type Todo struct {
	ID          string `json:"id"`
	Href        string `json:"href"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type Response[T any] struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	Data     T      `json:"data,omitempty"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"pageSize,omitempty"`
	Total    int    `json:"total,omitempty"`
}
