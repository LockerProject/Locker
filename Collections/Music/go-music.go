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

func loadConfig() *ProcessInfo {
	config := new(ProcessInfo)
	json.NewDecoder(os.Stdin).Decode(&config)

	return config
}

func mongoSession() *mgo.Session {
	session, err := mgo.Mongo("127.0.0.1:27018")
	if err != nil {
		panic(err)
	}

	return session
}

func state(session *mgo.Session) func(http.ResponseWriter, *http.Request) {
	scrobbles := session.DB("locker").C("asynclets_lastfm_scrobble")

	return func(w http.ResponseWriter, r *http.Request) {
		count, err := scrobbles.Count()
		if err != nil {
			panic(err)
		}

		last := struct {
			Id bson.ObjectId `bson:"_id"`
		}{}
		err = scrobbles.Find(nil).Select(bson.M{"_id": 1}).Sort(bson.M{"_id": -1}).One(&last)
		if err != nil {
			panic(err)
		}

		json.NewEncoder(w).Encode(CollectionState{1, count, time.Seconds(), last.Id.Hex()})
	}
}

func main() {
	config := loadConfig()
	if config.Port == 0 {
		panic("Must have port to start collection.")
	}
	fmt.Println("Port is", config.Port)

	session := mongoSession()
	defer session.Close()

	http.HandleFunc("/state", state(session))
	err := http.ListenAndServe("127.0.0.1:"+strconv.Itoa64(config.Port), nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err.String())
	}
}
