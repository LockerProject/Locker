package main

import (
	"os"
	"json"
	"http"
	"time"
	"log"
	"strconv"
	"launchpad.net/gobson/bson"
	"launchpad.net/mgo"
	"fmt"
)

type MongoInfo struct {
	Host        string   `json:"host"`
	Port        int      `json:"port"`
	Collections []string `json:"collections"`
}

type ProcessInfo struct {
	Port             int64     `json:"port"`
	SourceDirectory  string    `json:"sourceDirectory"`
	WorkingDirectory string    `json:"workingDirectory"`
	LockerUrl        string    `json:"lockerUrl"`
	ExternalBase     string    `json:"externalBase"`
	Mongo            MongoInfo `json:"mongoInfo"`
}

type CollectionState struct {
	Readiness int    `json:"ready"`
	Count     int    `json:"count"`
	Updated   int64  `json:"updated"`
	LastId    string `json:"lastId"`
}

func stateHandler(w http.ResponseWriter, req *http.Request) {
	session, err := mgo.Mongo("127.0.0.1:27018")
	if err != nil {
		panic(err)
	}
	defer session.Close()

	scrobbles := session.DB("locker").C("asynclets_lastfm_scrobble")

	count, err := scrobbles.Count()
	if err != nil {
		panic(err)
	}

	last := struct {
		Id bson.ObjectId `bson:"_id"`
	}{}
	querr := scrobbles.Find(nil).Select(bson.M{"_id": 1}).Sort(bson.M{"_id": -1}).One(&last)
	if querr != nil {
		panic(querr)
	}

	state := CollectionState{1, count, time.Seconds(), last.Id.Hex()}
	encoder := json.NewEncoder(w)
	encoder.Encode(state)
}

func main() {
	config := new(ProcessInfo)
	decoder := json.NewDecoder(os.Stdin)
	decoder.Decode(&config)
	fmt.Print("Port is ", config.Port)

	http.HandleFunc("/state", stateHandler)
	err := http.ListenAndServe("127.0.0.1:"+strconv.Itoa64(config.Port), nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err.String())
	}
}
