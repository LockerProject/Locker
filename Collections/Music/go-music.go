package main

import (
	"os"
	"json"
	"http"
	"time"
	"log"
	"strconv"
)

type mongoInfo struct {
	host string
	port int
	collections []string
}

type processInfo struct {
	port int64
	sourceDirectory string
	workingDirectory string
	lockerUrl string
	externalBase string
	mongo mongoInfo
}

type CollectionState struct {
	Readiness int `json:"ready"`
	Count int `json:"count"`
	Updated int64 `json:"updated"`
	LastId string `json:"lastId"`
}

func stateHandler(w http.ResponseWriter, req *http.Request) {
	state := CollectionState{1, 0, time.Seconds(), "CHUNDERthunder"}

	encoder := json.NewEncoder(w);
	encoder.Encode(state)
}

func main() {
	config := new(processInfo)
	decoder := json.NewDecoder(os.Stdin)
	decoder.Decode(&config)

	http.HandleFunc("/state", stateHandler)
	err := http.ListenAndServe(":" + strconv.Itoa64(config.port), nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err.String())
	}
}